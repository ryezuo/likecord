import { createHmac } from "node:crypto";
import { LinkPreviewCache, LP_ADMIT_SCRIPT, LP_UNLOCK_SCRIPT, PreviewRedis } from "./link-preview.cache";
import { LinkPreviewExecutor } from "./link-preview.executor";
import { LinkPreviewService } from "./link-preview.service";
import { LinkPreviewTransport } from "./link-preview.transport";

const secret = "fixture-only-dedicated-secret-32-bytes-long";
const url = "https://example.com/page";
const metadata = { title: "Title", description: "Description", siteName: "Site", displayHost: "example.com" };

/** Exact command-contract double; does not claim to execute Redis Lua or E2E. */
class RedisFixture {
  status = "ready";
  values = new Map<string, { value: string; expires: number }>();
  now = 0;
  calls: Array<{ op: string; args: unknown[] }> = [];
  fail = false;
  peek(key: string): string | null {
    const found = this.values.get(key);
    if (!found || found.expires <= this.now) { this.values.delete(key); return null; }
    return found.value;
  }
  call(op: string, args: unknown[]) {
    this.calls.push({ op, args });
    if (this.fail) throw new Error("fixture redis unavailable");
  }
  async get(key: string) { this.call("get", [key]); return this.peek(key); }
  async set(key: string, value: string, ex: string, seconds: number, nx?: string): Promise<string | null> {
    this.call("set", [key, value, ex, seconds, ...(nx ? [nx] : [])]);
    expect(ex).toBe("EX");
    if (nx) { expect(nx).toBe("NX"); if (this.peek(key)) return null; }
    this.values.set(key, { value, expires: this.now + seconds * 1000 });
    return "OK";
  }
  async eval(script: string, numberOfKeys: number, ...args: Array<string | number>): Promise<number> {
    this.call("eval", [script, numberOfKeys, ...args]);
    if (script === LP_UNLOCK_SCRIPT) {
      expect(numberOfKeys).toBe(1);
      if (this.peek(String(args[0])) !== args[1]) return 0;
      this.values.delete(String(args[0])); return 1;
    }
    expect(script).toBe(LP_ADMIT_SCRIPT);
    expect(numberOfKeys).toBe(2);
    const [account, server, accountMax, serverMax, seconds] = args;
    expect([accountMax, serverMax, seconds]).toEqual([5, 30, 60]);
    if (Number(this.peek(String(account))) >= Number(accountMax) || Number(this.peek(String(server))) >= Number(serverMax)) return 0;
    for (const key of [String(account), String(server)]) {
      const before = Number(this.peek(key));
      this.values.set(key, { value: String(before + 1), expires: before ? this.values.get(key)!.expires : this.now + Number(seconds) * 1000 });
    }
    return 1;
  }
  client() { return this as unknown as PreviewRedis; }
}

function setup() {
  const redis = new RedisFixture();
  const cache = new LinkPreviewCache(redis.client(), secret);
  const executor = new LinkPreviewExecutor();
  const transport = new LinkPreviewTransport();
  const fetch = jest.spyOn(transport, "fetch").mockResolvedValue(metadata);
  return { redis, cache, executor, fetch, service: new LinkPreviewService(cache, executor, transport) };
}

describe("LP-CACHE / LP-RATE / Redis fail closed", () => {
  afterEach(() => jest.restoreAllMocks());
  it("uses exact server-scoped HMAC identity and never serializes sensitive URL components", async () => {
    const h = setup();
    const sensitiveUrl = "https://example.com/private-download?signature=fixture-sensitive-capability-9b5c#private-fragment";
    const fetchUrl = sensitiveUrl.split("#")[0];
    const key = h.cache.key("server", fetchUrl);
    expect(key).toBe(`lp:v1:{${createHmac("sha256", secret).update("server\0" + fetchUrl).digest("hex")}}`);
    expect(h.cache.key("other-server", fetchUrl)).not.toBe(key);
    expect(await h.service.preview("server", "account", sensitiveUrl)).toEqual(metadata);
    const serialized = JSON.stringify(h.redis.calls);
    // Boolean-only assertions deliberately avoid printing capability fixtures.
    for (const part of [sensitiveUrl, fetchUrl, "/private-download", "signature=", "fixture-sensitive-capability-9b5c", "private-fragment", secret]) {
      expect(serialized.includes(part)).toBe(false);
    }
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it("refuses to persist URL/path/query echoes in hostile metadata", async () => {
    const h = setup();
    const sensitiveUrl = "https://example.com/private-path?token=fixture-capability#fixture-fragment";
    const key = h.cache.key("s", sensitiveUrl.split("#")[0]);
    for (const title of [sensitiveUrl, "/private-path", "fixture-capability", "fixture-fragment", "https://other.com/"]) {
      await h.cache.write(key, sensitiveUrl, { ...metadata, title });
      expect(h.redis.peek(key)).toBe('{"outcome":"unavailable"}');
    }
  });
  it("uses six-hour positive and five-minute negative TTL, natural expiry and cache hits without fetch", async () => {
    const h = setup();
    expect(await h.service.preview("s", "a", url)).toEqual(metadata);
    const key = h.cache.key("s", url);
    expect(h.redis.values.get(key)?.expires).toBe(21600000);
    expect(await h.service.preview("s", "b", url)).toEqual(metadata);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    h.redis.now = 21600000;
    h.fetch.mockResolvedValue(null);
    expect(await h.service.preview("s", "a", url)).toBeNull();
    expect(h.redis.values.get(key)?.expires).toBe(h.redis.now + 300000);
    expect(await h.service.preview("s", "b", url)).toBeNull();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    h.redis.now += 300000;
    expect(await h.cache.read(key)).toBeNull();
  });
  it("never reuses entries across servers or extends a TTL on read", async () => {
    const h = setup();
    await h.service.preview("s1", "a", url);
    h.redis.now = 1000;
    await h.service.preview("s2", "a", url);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.redis.values.get(h.cache.key("s1", url))?.expires).toBe(21600000);
  });
  it("bounds/validates cached data and excludes unknown fields or markup", async () => {
    const h = setup();
    const key = h.cache.key("s", url);
    for (const raw of ["{broken", "x".repeat(4097), JSON.stringify({ outcome: "success", metadata: { ...metadata, image: "forbidden" } }),
      JSON.stringify({ outcome: "success", metadata: { ...metadata, title: "<script>bad</script>" } })]) {
      h.redis.values.set(key, { value: raw, expires: 999999 });
      expect(await h.cache.read(key)).toBeNull();
    }
    await h.cache.write(key, url, { ...metadata, title: "x".repeat(4097) });
    expect(h.redis.peek(key)).toBe('{"outcome":"unavailable"}');
  });
  it("admits exactly five per account across servers; blocked attempts do not fetch", async () => {
    const h = setup();
    for (let i = 0; i < 5; i++) expect(await h.service.preview(`s${i}`, "a", url)).toEqual(metadata);
    expect(await h.service.preview("s6", "a", url)).toBeNull();
    expect(h.fetch).toHaveBeenCalledTimes(5);
    h.redis.now = 59999;
    expect(await h.service.preview("s6", "a", url)).toBeNull();
    h.redis.now = 60000;
    expect(await h.service.preview("s6", "a", url)).toEqual(metadata);
  });
  it("admits exactly thirty per server and does not expose topology", async () => {
    const h = setup();
    for (let i = 0; i < 30; i++) expect(await h.service.preview("s", `a${i}`, `${url}/${i}`)).toEqual(metadata);
    expect(await h.service.preview("s", "next", `${url}/next`)).toBeNull();
    expect(h.fetch).toHaveBeenCalledTimes(30);
    expect(await h.service.preview("other", "next", url)).toEqual(metadata);
  });
  it("uses SET NX EX 15, collision fallback and compare-and-delete release", async () => {
    const h = setup();
    const key = h.cache.key("s", url);
    const token = await h.cache.lock(key);
    expect(token).not.toBeNull();
    expect(h.redis.values.get(`${key}:lock`)?.expires).toBe(15000);
    expect(await h.service.preview("s", "a", url)).toBeNull();
    expect(h.fetch).not.toHaveBeenCalled();
    await h.cache.unlock(key, "different-owner");
    expect(await h.cache.lock(key)).toBeNull();
    h.redis.now = 15000;
    const next = await h.cache.lock(key);
    expect(next).not.toBeNull();
    await h.cache.unlock(key, token!);
    expect(h.redis.peek(`${key}:lock`) === next).toBe(true);
    await h.cache.unlock(key, next!);
    expect(h.redis.peek(`${key}:lock`)).toBeNull();
  });
  it("deduplicates simultaneous service callers without retry/wait fanout", async () => {
    const h = setup();
    let finish!: (value: typeof metadata) => void;
    h.fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const first = h.service.preview("s", "a", url);
    // Allow the first job to acquire its lease; second caller falls back now.
    for (let i = 0; i < 30; i++) await Promise.resolve();
    expect(await h.service.preview("s", "b", url)).toBeNull();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    finish(metadata);
    expect(await first).toEqual(metadata);
  });
  it.each(["offline", "eval", "get", "set"])("suppresses outbound fetch on Redis %s failure", async (phase) => {
    const h = setup();
    if (phase === "offline") h.redis.status = "reconnecting";
    else jest.spyOn(h.redis, phase as "eval").mockRejectedValue(new Error("redis fixture"));
    expect(await h.service.preview("s", "a", url)).toBeNull();
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("does not return a preview when post-fetch Redis storage fails", async () => {
    const h = setup();
    h.fetch.mockImplementation(async () => { h.redis.fail = true; return metadata; });
    expect(await h.service.preview("s", "a", url)).toBeNull();
  });
  it("validates the dedicated secret only on explicit internal construction", () => {
    const redis = new RedisFixture();
    for (const invalid of ["", "short", "change-me".repeat(10), " " + secret]) {
      expect(() => new LinkPreviewCache(redis.client(), invalid)).toThrow("LINK_PREVIEW_CACHE_HMAC_SECRET");
    }
    expect(() => new LinkPreviewCache(redis.client(), secret)).not.toThrow();
  });
});

describe("LP-RATE executor concurrency / queue / shutdown", () => {
  it("runs four active, queues 32 FIFO, drops the 37th and releases success/failure/throw slots", async () => {
    const executor = new LinkPreviewExecutor();
    const started: number[] = [];
    const releases: Array<(value: number) => void> = [];
    const pending = Array.from({ length: 36 }, (_, i) => executor.submit(() => {
      started.push(i);
      return new Promise<number>((resolve) => { releases[i] = resolve; });
    }));
    expect(started).toEqual([0, 1, 2, 3]);
    const dropped = jest.fn(async () => 37);
    expect(await executor.submit(dropped)).toBeNull();
    expect(dropped).not.toHaveBeenCalled();
    for (let i = 0; i < 36; i++) {
      releases[i](i);
      await pending[i];
      expect(started.length).toBe(Math.min(36, i + 5));
    }
    expect(await Promise.all(pending)).toEqual(Array.from({ length: 36 }, (_, i) => i));
    expect(await executor.submit(() => { throw new Error("fixture"); })).toBeNull();
    expect(await executor.submit(async () => { throw new Error("fixture"); })).toBeNull();
    expect(await executor.submit(async () => 1)).toBe(1);
  });
  it("shutdown aborts active jobs, settles queued jobs and prevents future callbacks", async () => {
    const executor = new LinkPreviewExecutor();
    const signals: AbortSignal[] = [];
    const callback = jest.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<null>((resolve) => signal.addEventListener("abort", () => resolve(null), { once: true }));
    });
    const pending = Array.from({ length: 36 }, () => executor.submit(callback));
    executor.onModuleDestroy();
    expect(await Promise.all(pending)).toEqual(Array(36).fill(null));
    expect(callback).toHaveBeenCalledTimes(4);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(await executor.submit(callback)).toBeNull();
    expect(callback).toHaveBeenCalledTimes(4);
  });
  it("bounds hanging Redis, cancels shutdown waits and prevents late fetch", async () => {
    jest.useFakeTimers();
    try {
      const h = setup();
      let finish!: (value: number) => void;
      jest.spyOn(h.redis, "eval").mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
      const pending = h.service.preview("s", "a", url);
      await jest.advanceTimersByTimeAsync(6000);
      expect(await pending).toBeNull();
      finish(1);
      await jest.advanceTimersByTimeAsync(0);
      expect(h.fetch).not.toHaveBeenCalled();
      const cancelled = h.service.preview("s", "b", url);
      await jest.advanceTimersByTimeAsync(0);
      h.executor.onModuleDestroy();
      expect(await cancelled).toBeNull();
      await jest.advanceTimersByTimeAsync(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it("does not start remote work after a late SET acknowledgement exhausts its lease", async () => {
    jest.useFakeTimers();
    try {
      const h = setup();
      jest.spyOn(h.redis, "set").mockImplementation(async () => new Promise((resolve) => setTimeout(() => resolve("OK"), 6000)));
      const pending = h.service.preview("s", "a", url);
      await jest.advanceTimersByTimeAsync(6000);
      expect(await pending).toBeNull();
      expect(h.fetch).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
});
