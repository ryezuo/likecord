import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { LinkPreviewTransport, PreviewRequest, PreviewRequestOptions } from "./link-preview.transport";
import { LinkPreviewParser } from "./link-preview.parser";
import { LP_LIMITS } from "./link-preview.policy";

interface Script {
  status?: number; headers?: string[]; chunks?: Buffer[]; peer?: string;
  stall?: "connect" | "tls" | "headers" | "body"; authorized?: boolean;
  responsePeer?: string;
}
const A = { address: "8.8.8.8", family: 4 };
const html = Buffer.from("<head><title>Fixture</title></head>");

function harness(scripts: Script[] = [{}]) {
  const sockets: Array<EventEmitter & { destroy: jest.Mock; remoteAddress: string; authorized: boolean }> = [];
  const requests: Array<EventEmitter & { destroy: jest.Mock; end: jest.Mock }> = [];
  const responses: Array<EventEmitter & { destroy: jest.Mock; complete: boolean }> = [];
  const options: PreviewRequestOptions[] = [];
  const pins: unknown[][] = [];
  const request: PreviewRequest = jest.fn((opts, cb) => {
    const script = scripts[options.length] || {};
    options.push(opts);
    const socket = Object.assign(new EventEmitter(), { remoteAddress: script.peer || A.address,
      authorized: script.authorized !== false, destroy: jest.fn() });
    sockets.push(socket);
    const req = Object.assign(new EventEmitter(), { destroy: jest.fn(), end: jest.fn() });
    requests.push(req);
    req.end.mockImplementation(() => {
      void Promise.resolve().then(() => {
        opts.lookup!(String(opts.hostname), {}, (...args: unknown[]) => pins.push(args));
        req.emit("socket", socket as unknown as Socket);
        if (script.stall === "connect") return;
        socket.emit("connect");
        if (script.stall === "tls") return;
        socket.emit("secureConnect");
        if (req.destroy.mock.calls.length || script.stall === "headers") return;
        const res = Object.assign(new EventEmitter(), {
          socket: script.responsePeer ? { ...socket, remoteAddress: script.responsePeer } : socket,
          rawHeaders: script.headers || ["Content-Type", "text/html"],
          statusCode: script.status ?? 200, complete: false, destroy: jest.fn(),
        });
        responses.push(res);
        cb(res as unknown as IncomingMessage);
        if (res.destroy.mock.calls.length) return;
        for (const chunk of script.chunks || (script.stall === "body" ? [Buffer.from("<title>slow")] : [html])) {
          if (!res.destroy.mock.calls.length) res.emit("data", chunk);
        }
        if (script.stall !== "body" && !res.destroy.mock.calls.length) {
          res.complete = true;
          res.emit("end");
        }
      });
    });
    return req as unknown as ClientRequest;
  });
  const resolver = jest.fn().mockResolvedValue([A]);
  return { transport: new LinkPreviewTransport(resolver, request), request, resolver, sockets, requests, responses, options, pins };
}

describe("LP-HTTP / LP-DNS-REBIND / pinned peer", () => {
  afterEach(() => jest.restoreAllMocks());
  it("uses only selected A after all-answer validation; never re-resolves to hypothetical private B", async () => {
    const h = harness();
    h.resolver.mockResolvedValueOnce([A, { address: "1.1.1.1", family: 4 }]).mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    expect((await h.transport.fetch("https://EXAMPLE.com.:443/a?q=1#ignored"))?.title).toBe("Fixture");
    expect(h.resolver).toHaveBeenCalledTimes(1);
    expect(h.resolver).toHaveBeenCalledWith("example.com");
    expect(h.pins).toEqual([[null, A.address, A.family]]);
    expect(h.options[0]).toMatchObject({ hostname: "example.com", servername: "example.com", rejectUnauthorized: true,
      agent: false, family: 4, autoSelectFamily: false, maxHeaderSize: 16384, insecureHTTPParser: false,
      method: "GET", path: "/a?q=1", port: 443 });
    expect(h.options[0].headers).toEqual({ Host: "example.com", "User-Agent": "Likecord-LinkPreview/1.0",
      Accept: "text/html, application/xhtml+xml;q=0.9", "Accept-Encoding": "identity", Connection: "close" });
    expect(h.options[0].checkServerIdentity).toBeUndefined();
    expect(h.options[0].createConnection).toBeUndefined();
    expect(h.requests[0].destroy).toHaveBeenCalled();
    expect(h.sockets[0].destroy).toHaveBeenCalled();
  });
  it.each([
    [A, { address: "10.1.1.1", family: 4 }], [{ address: "127.0.0.1", family: 4 }], [],
  ])("creates no socket for a rejected DNS answer set", async (...answers) => {
    const h = harness();
    h.resolver.mockResolvedValue(answers);
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(h.request).not.toHaveBeenCalled();
  });
  it("handles DNS rejection and rejects literal/port before DNS", async () => {
    const h = harness();
    h.resolver.mockRejectedValue(new Error("private diagnostic"));
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(h.request).not.toHaveBeenCalled();
    h.resolver.mockClear();
    for (const url of ["http://127.0.0.1", "https://example.com:444", "ftp://example.com"]) expect(await h.transport.fetch(url)).toBeNull();
    expect(h.resolver).not.toHaveBeenCalled();
  });
  it.each([{ peer: "127.0.0.1" }, { responsePeer: "1.1.1.1" }, { authorized: false }])("aborts mismatched/unverified peer before parser input", async (script) => {
    const write = jest.spyOn(LinkPreviewParser.prototype, "write");
    const h = harness([script]);
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(write).not.toHaveBeenCalled();
    expect(h.sockets[0].destroy).toHaveBeenCalled();
  });
  it("accepts equivalent mapped socket representation without admitting mapped DNS", async () => {
    expect((await harness([{ peer: "::ffff:8.8.8.8" }]).transport.fetch("https://example.com"))?.title).toBe("Fixture");
  });
});

describe("LP-REDIRECT / LP-PORT", () => {
  it.each([301, 302, 303, 307, 308])("explicitly handles %i and revalidates the next hop", async (status) => {
    const h = harness([{ status, headers: ["Location", "/next", "Set-Cookie", "ignored=1"] }, {}]);
    expect((await h.transport.fetch("http://example.com"))?.title).toBe("Fixture");
    expect(h.resolver).toHaveBeenCalledTimes(2);
    expect(h.request).toHaveBeenCalledTimes(2);
    expect(h.options[1].path).toBe("/next");
    expect(h.options[1].headers).toEqual(h.options[0].headers);
    expect(h.responses[0].destroy).toHaveBeenCalled();
  });
  it.each(["http://127.0.0.1", "https://[::1]", "https://user:pass@example.com", "https://@example.com", "//@example.com", "https://example.com:444",
    "ftp://example.com", "http://example.com/next", "/", "#fragment"])("rejects unsafe/loop/downgrade %s before the next request", async (location) => {
    const h = harness([{ status: 302, headers: ["Location", location] }]);
    expect(await h.transport.fetch("https://example.com/")).toBeNull();
    expect(h.request).toHaveBeenCalledTimes(1);
  });
  it("rejects missing/ambiguous Location and public-to-private resolution", async () => {
    for (const headers of [[], ["Location", "/a", "location", "/b"]]) {
      const h = harness([{ status: 302, headers }]);
      expect(await h.transport.fetch("https://example.com")).toBeNull();
      expect(h.request).toHaveBeenCalledTimes(1);
    }
    const h = harness([{ status: 302, headers: ["Location", "https://private.com"] }]);
    h.resolver.mockResolvedValueOnce([A]).mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(h.resolver).toHaveBeenCalledTimes(2);
    expect(h.request).toHaveBeenCalledTimes(1);
  });
  it("accepts exactly three redirects and HTTP upgrade; rejects fourth", async () => {
    const chain = [1, 2, 3].map((n) => ({ status: 302, headers: ["Location", `https://example.com/${n}`] }));
    expect((await harness([...chain, {}]).transport.fetch("http://example.com"))?.title).toBe("Fixture");
    const h = harness([...chain, { status: 302, headers: ["Location", "/four"] }]);
    expect(await h.transport.fetch("http://example.com")).toBeNull();
    expect(h.request).toHaveBeenCalledTimes(4);
  });
});

describe("LP-BYTES / LP-CONTENT-TYPE / LP-DECOMPRESSION", () => {
  it.each([
    [], ["Content-Type", "image/png"], ["Content-Type", "text/htmljunk"],
    ["Content-Type", "text/html", "content-type", "image/png"],
    ["Content-Type", "text/html", "Content-Encoding", "gzip"],
    ["Content-Type", "text/html", "Content-Encoding", "br"],
    ["Content-Type", "text/html", "Content-Encoding", "deflate"],
    ["Content-Type", "text/html", "Content-Encoding", "identity", "content-encoding", "gzip"],
    ["Content-Type", "text/html", "Content-Length", "262145"],
    ["Content-Type", "text/html", "Content-Length", "10", "content-length", "11"],
    ["Content-Type", "text/html; charset=not-supported"],
    ["Content-Type", "text/html; charset=utf-8; charset=ascii"],
  ])("rejects headers before parser input", async (...headers) => {
    const write = jest.spyOn(LinkPreviewParser.prototype, "write");
    const h = harness([{ headers }]);
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
  it.each([204, 300, 304, 400, 404, 500, 503])("accepts no metadata for status %i", async (status) => {
    expect(await harness([{ status }]).transport.fetch("https://example.com")).toBeNull();
  });
  it("accepts XHTML parameters and identity", async () => {
    expect((await harness([{ headers: ["Content-Type", 'application/xhtml+xml; charset="utf-8"', "Content-Encoding", "identity"] }])
      .transport.fetch("https://example.com"))?.title).toBe("Fixture");
  });
  it("counts actual chunks independently of a small declared length, and stops before oversized input", async () => {
    const write = jest.spyOn(LinkPreviewParser.prototype, "write");
    const chunk = Buffer.alloc(LP_LIMITS.htmlBytes, 32);
    const h = harness([{ headers: ["Content-Type", "text/html", "Content-Length", "1"], chunks: [chunk, Buffer.from("x"), html] }]);
    expect(await h.transport.fetch("https://example.com")).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
    expect(h.responses[0].destroy).toHaveBeenCalled();
    write.mockRestore();
  });
  it("permits exactly the byte cap and never makes image/subresource requests", async () => {
    const prefix = Buffer.from('<title>Safe</title><meta property="og:image" content="https://other.com/image">');
    const h = harness([{ chunks: [prefix, Buffer.alloc(LP_LIMITS.htmlBytes - prefix.length, 32)] }]);
    expect((await h.transport.fetch("https://example.com"))?.title).toBe("Safe");
    expect(h.request).toHaveBeenCalledTimes(1);
  });
});

describe("LP-TIMEOUT / abort ownership", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { expect(jest.getTimerCount()).toBe(0); jest.useRealTimers(); jest.restoreAllMocks(); });
  it("prevents a late DNS callback from starting any socket", async () => {
    const h = harness();
    let answer!: (value: typeof A[]) => void;
    h.resolver.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const pending = h.transport.fetch("https://example.com");
    await jest.advanceTimersByTimeAsync(6000);
    expect(await pending).toBeNull();
    answer([A]);
    await jest.advanceTimersByTimeAsync(0);
    expect(h.request).not.toHaveBeenCalled();
  });
  it.each([ ["connect", 1500], ["tls", 1500], ["headers", 2500], ["body", 6000] ] as const)("destroys %s stall at %i ms", async (stall, deadline) => {
    const h = harness([{ stall }]);
    const pending = h.transport.fetch("https://example.com");
    await jest.advanceTimersByTimeAsync(deadline - 1);
    expect(h.requests[0].destroy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(await pending).toBeNull();
    expect(h.requests[0].destroy).toHaveBeenCalledTimes(1);
    expect(h.sockets[0].destroy).toHaveBeenCalledTimes(1);
  });
  it("shares total deadline across DNS and redirects", async () => {
    const h = harness([{ status: 302, headers: ["Location", "/next"] }, { stall: "body" }]);
    h.resolver.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([A]), 2000)));
    const pending = h.transport.fetch("https://example.com");
    await jest.advanceTimersByTimeAsync(5999);
    expect(h.requests[1].destroy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(await pending).toBeNull();
    expect(h.requests[1].destroy).toHaveBeenCalled();
  });
  it("external abort stops parser and active resources, including later body events", async () => {
    const write = jest.spyOn(LinkPreviewParser.prototype, "write");
    const h = harness([{ stall: "body" }]);
    const controller = new AbortController();
    const pending = h.transport.fetch("https://example.com", controller.signal);
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    expect(await pending).toBeNull();
    const before = write.mock.calls.length;
    h.responses[0].emit("data", html);
    expect(write).toHaveBeenCalledTimes(before);
    expect(h.sockets[0].destroy).toHaveBeenCalled();
  });
  it("clears timers on success and thrown transport", async () => {
    expect((await harness().transport.fetch("https://example.com"))?.title).toBe("Fixture");
    const transport = new LinkPreviewTransport(async () => [A], () => { throw new Error("fixture"); });
    expect(await transport.fetch("https://example.com")).toBeNull();
  });
});
