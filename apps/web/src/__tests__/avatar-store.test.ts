import { AvatarStore, canonicalAvatar } from "../lib/avatar-store";
import { ApiError } from "../lib/api";

const self = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const url = (id = self, n = 1) => `/api/v1/users/${id}/avatar/178871000000${n}-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
describe("session-scoped avatar reconciliation", () => {
  let store: AvatarStore;
  const fetcher = jest.fn(), merge = jest.fn();
  beforeEach(() => { jest.useFakeTimers(); fetcher.mockReset(); merge.mockReset(); fetcher.mockImplementation(async (id) => ({ userId: id, avatarUrl: null })); store = new AvatarStore(self, null, merge, fetcher); });
  afterEach(() => { store.dispose(); jest.useRealTimers(); });
  const tick = () => jest.advanceTimersByTimeAsync(55);
  it("accepts only owned canonical URLs", () => {
    expect(canonicalAvatar(self, url())).toBe(url());
    for (const invalid of ["https://example.test/avatar", "blob:preview", url(other), url() + "?retry=1"]) expect(canonicalAvatar(self, invalid)).toBeNull();
  });
  it("dedupes concurrent consumers and deletes unused entries", async () => {
    const a = store.subscribe(other, jest.fn()), b = store.subscribe(other, jest.fn()); await tick();
    expect(fetcher).toHaveBeenCalledTimes(1); a(); expect(store.read(other)).toBeNull(); b(); expect(store.read(other)).toBeUndefined();
  });
  it("self mutation is immediate and stale full metadata cannot overwrite it", async () => {
    const old = deferred<{ userId: string; avatarUrl: string | null }>(); fetcher.mockReturnValueOnce(old.promise);
    void store.refresh(self); await tick(); store.accept({ userId: self, avatarUrl: url() });
    expect(store.read(self)).toBe(url()); expect(merge).toHaveBeenLastCalledWith(url());
    fetcher.mockResolvedValueOnce({ userId: self, avatarUrl: url() });
    old.resolve({ userId: self, avatarUrl: null }); await Promise.resolve(); expect(store.read(self)).toBe(url());
    await tick(); expect(store.read(self)).toBe(url());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("event during fetch rejects that generation and follows with a fresh canonical read", async () => {
    const old = deferred<{ userId: string; avatarUrl: string | null }>();
    fetcher.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ userId: self, avatarUrl: url(self, 2) });
    void store.refresh(self); await tick(); store.invalidate(self); store.invalidate(self);
    old.resolve({ userId: self, avatarUrl: url() }); await Promise.resolve(); expect(store.read(self)).toBeNull();
    await tick(); expect(store.read(self)).toBe(url(self, 2)); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("bursts coalesce and unknown IDs never fetch", async () => {
    for (let n = 0; n < 20; n++) { store.invalidate(self); store.invalidate(other); }
    await tick(); expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][0]).toBe(self);
  });
  it("recovery reads only self and consumed identities", async () => {
    const stop = store.subscribe(other, jest.fn()); await tick(); fetcher.mockClear();
    store.recover(); await tick(); expect(fetcher.mock.calls.map(([id]) => id).sort()).toEqual([self, other]);
    stop(); fetcher.mockClear(); store.recover(); await tick(); expect(fetcher.mock.calls.map(([id]) => id)).toEqual([self]);
  });
  it("ignores unmounted/session-disposed responses and aborts their request", async () => {
    const old = deferred<{ userId: string; avatarUrl: string }>(); fetcher.mockReturnValueOnce(old.promise);
    const stop = store.subscribe(other, jest.fn()); await tick(); stop();
    expect(fetcher.mock.calls[0][1].aborted).toBe(true); old.resolve({ userId: other, avatarUrl: url(other) }); await tick(); expect(store.read(other)).toBeUndefined();
    store.dispose(); store.accept({ userId: self, avatarUrl: url() }); expect(merge).not.toHaveBeenCalled();
  });
  it("coalesces image recovery once per URL across duplicate images", async () => {
    const a = store.recoverImage(self, url()), b = store.recoverImage(self, url()); expect(a).toBe(b);
    await tick(); expect(await a).toBe(true); expect(fetcher).toHaveBeenCalledTimes(1);
    await store.recoverImage(self, url()); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("429 backs off the account bucket and never retry-loops", async () => {
    fetcher.mockRejectedValueOnce(new ApiError("slow down", 429, "RATE_LIMIT_EXCEEDED", 60));
    void store.refresh(self); await tick(); await jest.advanceTimersByTimeAsync(120_000); expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockRejectedValueOnce(new ApiError("slow down", 429, "RATE_LIMIT_EXCEEDED", 60));
    void store.refresh(self); await tick(); store.invalidate(self); await tick(); expect(fetcher).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(60_000); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("bounds metadata concurrency and active entries", async () => {
    fetcher.mockImplementation(() => new Promise(() => {}));
    for (let n = 0; n < 600; n++) store.subscribe(`${n.toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, jest.fn());
    await tick(); expect(fetcher).toHaveBeenCalledTimes(4); expect(store["entries"].size).toBe(512);
  });
  it("a timed-out metadata request releases its waiter and preserves the current avatar", async () => {
    store.accept({ userId: self, avatarUrl: url() });
    fetcher.mockImplementationOnce((_id, signal: AbortSignal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const pending = store.refresh(self); await tick(); await jest.advanceTimersByTimeAsync(15_000);
    expect(await pending).toBe(false); expect(store.read(self)).toBe(url()); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("a dirty event during a rate-limited request gets one fresh follow-up after backoff", async () => {
    let fail!: (error: Error) => void;
    fetcher.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    void store.refresh(self); await tick(); store.invalidate(self); fail(new ApiError("wait", 429, "RATE_LIMIT_EXCEEDED", 60));
    await tick(); expect(fetcher).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000); expect(fetcher).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(60_000); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
