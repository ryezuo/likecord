import * as dns from "node:dns";
import * as http from "node:http";
import * as https from "node:https";
import { Socket, LookupFunction } from "node:net";
import { TLSSocket } from "node:tls";
import { normalizeLinkPreviewUrl } from "@likecord/shared/link-preview-url";
import { LinkPreviewMetadata, LinkPreviewParser } from "./link-preview.parser";
import { LP_LIMITS, matchesPinnedPeer, PinnedAddress, validateDnsAnswers } from "./link-preview.policy";

export type PreviewResolver = (hostname: string) => Promise<dns.LookupAddress[]>;
export type PreviewRequestOptions = https.RequestOptions & { autoSelectFamily: boolean };
export type PreviewRequest = (options: PreviewRequestOptions, response: (res: http.IncomingMessage) => void) => http.ClientRequest;

const resolveAll: PreviewResolver = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });
const coreRequest: PreviewRequest = (options, response) =>
  (options.protocol === "https:" ? https : http).request(options, response);

type Hop = { location: string } | { metadata: LinkPreviewMetadata | null };

function uniqueHeader(res: http.IncomingMessage, name: string): string | undefined {
  const values: string[] = [];
  for (let i = 0; i < res.rawHeaders.length; i += 2) {
    if (res.rawHeaders[i].toLowerCase() === name) values.push(res.rawHeaders[i + 1]);
  }
  if (values.length > 1) throw new Error("content_type");
  return values[0];
}

/** Cancel the continuation as well as the wait. OS getaddrinfo itself is not cancellable. */
function abortableDns(resolver: PreviewResolver, hostname: string, signal: AbortSignal): Promise<dns.LookupAddress[]> {
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(new Error("timeout")); };
    const cleanup = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw new Error("timeout");
      return resolver(hostname);
    }).then((answers) => {
      cleanup();
      if (!signal.aborted) resolve(answers);
    }, () => { cleanup(); reject(new Error("dns_rejected")); });
  });
}

/** No automatic redirects, shared agents, proxy support, or unpinned lookup. */
export class LinkPreviewTransport {
  constructor(private readonly resolver: PreviewResolver = resolveAll, private readonly request: PreviewRequest = coreRequest) {}

  async fetch(value: string, cancellation?: AbortSignal): Promise<LinkPreviewMetadata | null> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, LP_LIMITS.totalMs);
    cancellation?.addEventListener("abort", abort, { once: true });
    if (cancellation?.aborted) abort();
    try {
      let current = normalizeLinkPreviewUrl(value);
      const visited = new Set<string>();
      for (let redirects = 0; current && !controller.signal.aborted; redirects++) {
        if (visited.has(current.fetchUrl)) return null;
        visited.add(current.fetchUrl);
        const answers = await abortableDns(this.resolver, current.hostname, controller.signal);
        if (controller.signal.aborted) return null;
        const pin = validateDnsAnswers(answers);
        if (!pin) return null;
        const hop = await this.hop(new URL(current.fetchUrl), pin, controller.signal);
        if ("metadata" in hop) return hop.metadata;
        if (redirects >= LP_LIMITS.redirects || controller.signal.aborted) return null;
        // Check authored redirect authority before WHATWG can erase empty userinfo.
        const authority = /^(?:[a-z][a-z\d+.-]*:)?\/\/([^/?#]*)/i.exec(hop.location)?.[1];
        if (authority?.includes("@") || hop.location.includes("\\")) return null;
        const target = normalizeLinkPreviewUrl(new URL(hop.location, current.fetchUrl).href);
        if (!target || (current.fetchUrl.startsWith("https:") && target.fetchUrl.startsWith("http:"))) return null;
        current = target;
      }
      return null;
    } catch {
      // Neither remote errors nor their URL/header/address payload cross this boundary.
      return null;
    } finally {
      clearTimeout(timer);
      cancellation?.removeEventListener("abort", abort);
      controller.abort();
    }
  }

  private hop(url: URL, pin: PinnedAddress, signal: AbortSignal): Promise<Hop> {
    return new Promise((resolve, reject) => {
      let req: http.ClientRequest | undefined;
      let socket: Socket | undefined;
      let response: http.IncomingMessage | undefined;
      let parser: LinkPreviewParser | undefined;
      let settled = false;
      let peerVerified = false;
      let bytes = 0;
      const secure = url.protocol === "https:";
      const connectTimer = setTimeout(() => finish(), LP_LIMITS.connectMs);
      const firstByteTimer = setTimeout(() => finish(), LP_LIMITS.firstByteMs);
      const abort = () => finish();
      const finish = (result?: Hop) => {
        if (settled) return;
        settled = true;
        clearTimeout(connectTimer);
        clearTimeout(firstByteTimer);
        signal.removeEventListener("abort", abort);
        parser?.stop();
        response?.destroy();
        req?.destroy();
        socket?.destroy();
        if (result) resolve(result); else reject(new Error("unavailable"));
      };
      if (signal.aborted) { finish(); return; }
      signal.addEventListener("abort", abort, { once: true });
      const verifyPeer = () => {
        if (settled || signal.aborted) { socket?.destroy(); return; }
        if (!matchesPinnedPeer(socket?.remoteAddress, pin) ||
          (secure && !(socket as TLSSocket).authorized)) { finish(); return; }
        peerVerified = true;
        clearTimeout(connectTimer);
      };
      const lookup: LookupFunction = (_hostname, options, callback) => {
        if (settled || signal.aborted) { callback(new Error("unavailable"), "", pin.family); return; }
        if (options.all) callback(null, [{ address: pin.address, family: pin.family }]);
        else callback(null, pin.address, pin.family);
      };
      try {
        req = this.request({
          protocol: url.protocol, hostname: url.hostname,
          port: secure ? 443 : 80, path: url.pathname + url.search,
          method: "GET", agent: false, lookup, family: pin.family, autoSelectFamily: false,
          ...(secure ? { servername: url.hostname, rejectUnauthorized: true } : {}),
          maxHeaderSize: LP_LIMITS.headersBytes, insecureHTTPParser: false,
          headers: {
            Host: url.host,
            "User-Agent": "Likecord-LinkPreview/1.0",
            Accept: "text/html, application/xhtml+xml;q=0.9",
            "Accept-Encoding": "identity", Connection: "close",
          },
        }, (res) => {
          response = res;
          res.on("error", () => finish());
          if (settled || signal.aborted) { res.destroy(); return; }
          // Verify again on the response socket before creating a parser/listening to data.
          if (!peerVerified || !matchesPinnedPeer(res.socket.remoteAddress, pin) ||
            (secure && !(res.socket as TLSSocket).authorized)) { finish(); return; }
          clearTimeout(firstByteTimer);
          try {
            const type = uniqueHeader(res, "content-type");
            const encoding = uniqueHeader(res, "content-encoding");
            const length = uniqueHeader(res, "content-length");
            const location = uniqueHeader(res, "location");
            if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
              if (!location?.trim()) { finish(); return; }
              finish({ location }); return;
            }
            if (res.statusCode !== 200 || !type ||
              !/^(text\/html|application\/xhtml\+xml)(?:\s*;|\s*$)/i.test(type) ||
              (encoding && encoding.trim().toLowerCase() !== "identity") ||
              (length !== undefined && (!/^\d+$/.test(length) || Number(length) > LP_LIMITS.htmlBytes))) {
              finish(); return;
            }
            const charsets = [...type.matchAll(/;\s*charset\s*=\s*(?:"([^"]*)"|([^;\s]*))/gi)];
            if (charsets.length > 1) { finish(); return; }
            parser = new LinkPreviewParser(charsets[0]?.[1] ?? charsets[0]?.[2] ?? "utf-8", url.hostname);
            res.on("data", (chunk: Buffer) => {
              if (settled || signal.aborted) return;
              bytes += chunk.length;
              if (bytes > LP_LIMITS.htmlBytes) { finish(); return; }
              try {
                parser!.write(chunk);
                if (parser!.stopped) finish({ metadata: parser!.finish() });
              } catch { finish(); }
            });
            res.on("end", () => {
              if (settled || signal.aborted) return;
              try { finish({ metadata: parser!.finish() }); } catch { finish(); }
            });
            res.on("aborted", () => finish());
            res.on("close", () => { if (!res.complete) finish(); });
          } catch { finish(); }
        });
        req.on("error", () => finish());
        req.on("upgrade", (_res, upgraded) => { upgraded.destroy(); finish(); });
        req.on("socket", (connected: Socket) => {
          socket = connected;
          if (settled || signal.aborted) { connected.destroy(); return; }
          connected.once(secure ? "secureConnect" : "connect", verifyPeer);
        });
        if (settled || signal.aborted) req.destroy(); else req.end();
      } catch { finish(); }
    });
  }
}
