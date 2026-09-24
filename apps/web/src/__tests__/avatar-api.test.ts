import { api, avatarApi } from "../lib/api";
const response = (status: number, body: unknown, retry = "") => ({ ok: status < 400, status, json: async () => body, headers: new Headers({ "Retry-After": retry }) }) as Response;
describe("avatar API uses canonical auth/CSRF", () => {
  beforeEach(() => { global.fetch = jest.fn(); document.cookie = "csrf_token=csrf"; });
  it("sends binary bytes with exact MIME and cookies, and no DELETE body", async () => {
    (fetch as jest.Mock).mockResolvedValue(response(200, { userId: "me", avatarUrl: null }));
    const file = new File(["pixels"], "avatar.png", { type: "image/png" });
    const crop = '{"v":1,"panX":0.123456,"panY":-1,"zoom":2}';
    await avatarApi.upload(file, crop);
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/users/@me/avatar"), expect.objectContaining({ body: file, credentials: "include", headers: { "Content-Type": "image/png", "X-Avatar-Crop": crop, "X-CSRF-Token": "csrf" } }));
    await avatarApi.remove(); expect((fetch as jest.Mock).mock.calls[1][1].body).toBeUndefined();
  });
  it("retains the same original File and exact crop header across auth refresh", async () => {
    const file = new File(["original"], "avatar.webp", { type: "image/webp" });
    const crop = '{"v":1,"panX":1,"panY":0,"zoom":1.25}';
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(response(200, { userId: "me", avatarUrl: null }));
    await avatarApi.upload(file, crop);
    const uploads = (fetch as jest.Mock).mock.calls.filter(([path]) => path.endsWith("/users/@me/avatar"));
    expect(uploads).toHaveLength(2);
    for (const [, options] of uploads) expect(options).toEqual(expect.objectContaining({
      body: file, headers: { "Content-Type": "image/webp", "X-Avatar-Crop": crop, "X-CSRF-Token": "csrf" },
    }));
  });
  it("shares a single refresh with other API calls and preserves structured retry errors", async () => {
    let finish!: (value: Response) => void;
    const refresh = new Promise<Response>((resolve) => { finish = resolve; });
    let calls = 0;
    (fetch as jest.Mock).mockImplementation((path) => {
      if (path.endsWith("/auth/refresh")) return refresh;
      return Promise.resolve(calls++ < 2 ? response(401, {}) : response(200, { userId: "me", avatarUrl: null }));
    });
    const a = avatarApi.metadata("me"), b = api("/users/@me");
    await Promise.resolve(); await Promise.resolve(); finish(response(200, {})); await Promise.all([a, b]);
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => path.endsWith("/auth/refresh"))).toHaveLength(1);
    (fetch as jest.Mock).mockResolvedValueOnce(response(429, { error: { code: "RATE_LIMIT_EXCEEDED", message: "wait" } }, "30"));
    await expect(avatarApi.metadata("me")).rejects.toMatchObject({ status: 429, code: "RATE_LIMIT_EXCEEDED", retryAfter: 30 });
  });
  it("aborts an avatar caller waiting on refresh without cancelling another caller", async () => {
    let finish!: (value: Response) => void;
    const refresh = new Promise<Response>((resolve) => { finish = resolve; });
    let authorized = false;
    (fetch as jest.Mock).mockImplementation((path) => path.endsWith("/auth/refresh") ? refresh : Promise.resolve(response(authorized ? 200 : 401, {})));
    const controller = new AbortController();
    const a = avatarApi.metadata("me", controller.signal), b = api("/users/@me");
    await Promise.resolve(); await Promise.resolve();
    controller.abort(); await expect(a).rejects.toMatchObject({ name: "AbortError" });
    authorized = true; finish(response(200, {})); await b;
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => path.endsWith("/auth/refresh"))).toHaveLength(1);
  });
});
