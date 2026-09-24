import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { TLSSocket } from "node:tls";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LinkPreviewTransport, PreviewRequest } from "./link-preview.transport";
import { PinnedAddress } from "./link-preview.policy";
import { LinkPreviewMetadata } from "./link-preview.parser";

const key = readFileSync(join(__dirname, "fixtures/localhost-test.key"));
const cert = readFileSync(join(__dirname, "fixtures/localhost-test.crt"));
const loopback: PinnedAddress = { address: "127.0.0.1", family: 4 };

/** Test ONLY the lower transport owner with real sockets. Public policy is
 * exercised separately through fetch(); no runtime flag/policy override exists.
 * The dial port is an ephemeral loopback fixture port. Lookup, peer verification,
 * HTTP parsing, TLS SNI and certificate/hostname verification stay production. */
function fixtureHop(transport: LinkPreviewTransport, url: string, signal = new AbortController().signal) {
  return (transport as unknown as {
    hop(url: URL, pin: PinnedAddress, signal: AbortSignal): Promise<{ metadata: LinkPreviewMetadata | null }>;
  }).hop(new URL(url), loopback, signal).catch(() => null);
}

describe("LP-HTTP real Node HTTP/TLS fixtures", () => {
  const servers: Array<net.Server> = [];
  const sockets = new Set<net.Socket>();
  async function listen(server: net.Server): Promise<number> {
    servers.push(server);
    server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    return (server.address() as net.AddressInfo).port;
  }
  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    sockets.clear();
  });

  it("dials through production pinned lookup with canonical Host and no environment proxy/cookie forwarding", async () => {
    let observed: http.IncomingHttpHeaders | undefined;
    const port = await listen(http.createServer((req, res) => {
      observed = req.headers;
      res.writeHead(200, { "Content-Type": "text/html", "Set-Cookie": "ignored=1" });
      res.end("<head><title>HTTP fixture</title></head>");
    }));
    const oldHttp = process.env.HTTP_PROXY, oldHttps = process.env.HTTPS_PROXY, oldUseProxy = process.env.NODE_USE_ENV_PROXY;
    process.env.HTTP_PROXY = process.env.HTTPS_PROXY = "http://127.0.0.1:1";
    process.env.NODE_USE_ENV_PROXY = "1";
    try {
      const transport = new LinkPreviewTransport(undefined, (options, cb) => http.request({ ...options, port }, cb));
      expect((await fixtureHop(transport, "http://preview.fixture.net/path"))?.metadata?.title).toBe("HTTP fixture");
      expect(observed).toEqual({ host: "preview.fixture.net", "user-agent": "Likecord-LinkPreview/1.0",
        accept: "text/html, application/xhtml+xml;q=0.9", "accept-encoding": "identity", connection: "close" });
    } finally {
      for (const [name, value] of [["HTTP_PROXY", oldHttp], ["HTTPS_PROXY", oldHttps], ["NODE_USE_ENV_PROXY", oldUseProxy]]) {
        if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
      }
    }
  });
  it("preserves real TLS SNI, Host, CA verification and hostname verification", async () => {
    let sni: string | undefined;
    let host: string | undefined;
    const server = https.createServer({ key, cert }, (req, res) => {
      sni = (req.socket as TLSSocket & { servername: string }).servername;
      host = req.headers.host;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<title>TLS fixture</title>");
    });
    const port = await listen(server);
    const verified: PreviewRequest = (options, cb) => https.request({ ...options, port, ca: cert }, cb);
    const transport = new LinkPreviewTransport(undefined, verified);
    expect((await fixtureHop(transport, "https://preview.fixture.net/"))?.metadata?.title).toBe("TLS fixture");
    expect(sni).toBe("preview.fixture.net");
    expect(host).toBe("preview.fixture.net");
    // Same trusted CA, wrong hostname must fail at Node's ordinary TLS boundary.
    expect(await fixtureHop(transport, "https://wrong.fixture.net/")).toBeNull();
    // Correct hostname without the fixture trust anchor must fail too.
    const untrusted = new LinkPreviewTransport(undefined, (options, cb) => https.request({ ...options, port }, cb));
    expect(await fixtureHop(untrusted, "https://preview.fixture.net/")).toBeNull();
  });
  it.each([
    "Content-Type: text/html\r\nX-Large: " + "x".repeat(16384),
    "Content-Type: text/html\r\nContent-Type: image/png",
    "Content-Type: text/html\r\nContent-Length: 12\r\nContent-Length: 14",
    "Content-Type: text/html\r\nContent-Encoding: identity\r\nContent-Encoding: gzip",
    "Content-Type: text/html\r\nContent-Length: 262145",
    "Content-Type: text/html\r\nBad Header: invalid",
  ])("rejects real oversized/ambiguous/malformed headers", async (headers) => {
    const port = await listen(net.createServer((socket) => socket.once("data", () => {
      socket.end(`HTTP/1.1 200 OK\r\n${headers}\r\nConnection: close\r\n\r\n<title>bad</title>`);
    })));
    const transport = new LinkPreviewTransport(undefined, (options, cb) => http.request({ ...options, port }, cb));
    expect(await fixtureHop(transport, "http://preview.fixture.net")).toBeNull();
  });
  it("cuts off real chunked oversize without trusting Content-Length", async () => {
    const port = await listen(http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(Buffer.alloc(262144, 32));
      res.end("<title>Too late</title>");
    }));
    const transport = new LinkPreviewTransport(undefined, (options, cb) => http.request({ ...options, port }, cb));
    expect(await fixtureHop(transport, "http://preview.fixture.net")).toBeNull();
  });
  it("destroys a real socket stalled in TLS at the connect bound", async () => {
    const port = await listen(net.createServer(() => { /* Never answer TLS handshake. */ }));
    let client: net.Socket | undefined;
    const transport = new LinkPreviewTransport(undefined, (options, cb) => {
      const req = https.request({ ...options, port, ca: cert }, cb);
      req.on("socket", (socket) => { client = socket; });
      return req;
    });
    expect(await fixtureHop(transport, "https://preview.fixture.net")).toBeNull();
    expect(client?.destroyed).toBe(true);
  });
});
