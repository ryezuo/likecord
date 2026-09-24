import { AvatarService } from "./avatar.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { WsGateway } from "../../ws/ws.gateway";
import { createAvatarObject, avatarPosterKey } from "../../storage/avatar-object";
import * as animations from "./avatar-animation";
import { gifFixture, animatedWebp } from "./avatar-animation.fixtures";
import * as images from "./avatar-image";
import sharp from "sharp";

const id = "11111111-1111-4111-8111-111111111111";
describe("avatar committed lifecycle", () => {
  let service: AvatarService;
  let state: string | null;
  let exists: boolean;
  let mode: "ok" | "rollback" | "ambiguous-committed" | "ambiguous-before" | "unavailable";
  let now: Date;
  let normalized: Buffer;
  const storage = { putAvatar: jest.fn(), readAvatar: jest.fn(), deleteAvatar: jest.fn() };
  const ws = { emitAvatarUpdated: jest.fn() };
  const update = jest.fn();
  const prisma = { client: { $queryRaw: jest.fn(), $transaction: jest.fn(), user: { findUnique: jest.fn() } } };
  beforeAll(async () => { normalized = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).webp().toBuffer(); });
  beforeEach(() => {
    jest.resetAllMocks(); state = null; exists = true; mode = "ok"; now = new Date();
    jest.spyOn(images, "normalizeAvatar").mockResolvedValue(normalized);
    prisma.client.$queryRaw.mockImplementation(async () => [{ now }]);
    prisma.client.user.findUnique.mockImplementation(async () => {
      if (mode === "unavailable") throw new Error("DB offline");
      return exists ? { avatarUrl: state } : null;
    });
    update.mockImplementation(async ({ data }) => { if (mode === "rollback") throw new Error("update failed"); state = data.avatarUrl; });
    prisma.client.$transaction.mockImplementation(async (callback) => {
      if (mode === "ambiguous-before" || mode === "unavailable") throw new Error("connection lost");
      await callback({ $queryRaw: async (strings: TemplateStringsArray) => strings.join("").includes("FOR UPDATE")
        ? (exists ? [{ avatarUrl: state }] : []) : [{ now }], user: { update } });
      if (mode === "ambiguous-committed") throw new Error("commit response lost");
    });
    service = new AvatarService(prisma as unknown as PrismaService, storage as unknown as StorageService, ws as unknown as WsGateway);
  });
  afterEach(() => jest.restoreAllMocks());
  const replace = () => service.replace(id, Buffer.from("input"), "image/png");
  const animatedReplace = () => service.replace(id, gifFixture(), "image/gif");
  it("requires both candidate puts before promotion and cleans old renditions independently", async () => {
    jest.spyOn(animations, "normalizeAnimatedAvatar").mockResolvedValue({ main: await animatedWebp(), poster: normalized });
    const old = createAvatarObject(id, now); state = old.url;
    const mutation = await animatedReplace();
    const candidate = storage.putAvatar.mock.calls[0][0];
    expect(storage.putAvatar.mock.calls[1][0]).toBe(candidate.replace("avatar.webp", "poster.webp"));
    expect(storage.putAvatar.mock.invocationCallOrder[1]).toBeLessThan(update.mock.invocationCallOrder[0]);
    storage.deleteAvatar.mockRejectedValueOnce(new Error("main unavailable"));
    await service.afterCommit(mutation); expect(storage.deleteAvatar).toHaveBeenCalledWith(avatarPosterKey(old));
    expect(ws.emitAvatarUpdated).toHaveBeenCalledTimes(1);
  });
  it.each(["put", "rollback", "ambiguous-before", "ambiguous-committed"])("pair preserves ownership after %s", async (failure) => {
    jest.spyOn(animations, "normalizeAnimatedAvatar").mockResolvedValue({ main: await animatedWebp(), poster: normalized });
    const old = createAvatarObject(id, now); state = old.url;
    if (failure === "put") storage.putAvatar.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("poster put failed"));
    else mode = failure as typeof mode;
    if (failure === "ambiguous-committed") {
      await expect(animatedReplace()).resolves.toHaveProperty("projection.avatarUrl", state === old.url ? expect.any(String) : state);
      expect(storage.deleteAvatar).not.toHaveBeenCalled();
    } else {
      await expect(animatedReplace()).rejects.toMatchObject({ status: 503 }); expect(state).toBe(old.url);
      if (failure === "rollback") expect(storage.deleteAvatar).toHaveBeenCalledTimes(2);
      else expect(storage.deleteAvatar).not.toHaveBeenCalled();
    }
  });
  it("aliases only validated static legacy main bytes and never mistakes an outage for missing poster", async () => {
    const object = createAvatarObject(id, now);
    storage.readAvatar.mockResolvedValueOnce(null).mockResolvedValueOnce(normalized);
    await expect(service.readPoster(object)).resolves.toEqual(normalized);
    storage.readAvatar.mockResolvedValueOnce(null).mockResolvedValueOnce(await animatedWebp(8, 8));
    await expect(service.readPoster(object)).rejects.toMatchObject({ status: 404 });
    storage.readAvatar.mockRejectedValueOnce(new Error("outage"));
    await expect(service.readPoster(object)).rejects.toMatchObject({ status: 503 });
    expect(storage.readAvatar).toHaveBeenCalledTimes(5);
  });
  it("stores before row serialization and changes only avatarUrl; side effects follow response", async () => {
    const result = await replace();
    expect(result.projection).toEqual({ userId: id, avatarUrl: state });
    expect(state).toMatch(/^\/api\/v1\/users\//);
    expect(update.mock.calls[0][0]).toEqual({ where: { id }, data: { avatarUrl: state } });
    expect(storage.putAvatar.mock.invocationCallOrder[0]).toBeLessThan(prisma.client.$transaction.mock.invocationCallOrder[0]);
    expect(ws.emitAvatarUpdated).not.toHaveBeenCalled();
    await service.afterCommit(result); expect(ws.emitAvatarUpdated).toHaveBeenCalledWith(id);
  });
  it("passes the immutable crop snapshot only to static normalization", async () => {
    const crop = { v: 1 as const, panX: 0.25, panY: -0.5, zoom: 2 };
    await service.replace(id, Buffer.from("input"), "image/png", crop);
    expect(images.normalizeAvatar).toHaveBeenCalledWith(Buffer.from("input"), "image/png", crop);
  });
  it("reads latest old reference and deletes it only after confirmed commit", async () => {
    const old = createAvatarObject(id, now); state = old.url;
    const result = await replace();
    expect(storage.deleteAvatar).not.toHaveBeenCalled();
    await service.afterCommit(result); expect(storage.deleteAvatar).toHaveBeenCalledWith(old.key);
    expect(storage.deleteAvatar.mock.invocationCallOrder[0]).toBeGreaterThan(update.mock.invocationCallOrder[0]);
  });
  it("remove is idempotent, field scoped, and never deletes an unrecognized legacy value", async () => {
    await service.afterCommit(await service.remove(id)); expect(update).not.toHaveBeenCalled(); expect(ws.emitAvatarUpdated).not.toHaveBeenCalled();
    state = "https://example.test/legacy.jpg";
    await service.afterCommit(await service.remove(id)); expect(state).toBeNull();
    expect(ws.emitAvatarUpdated).toHaveBeenCalledTimes(1); expect(storage.deleteAvatar).not.toHaveBeenCalled();
  });
  it("put failure never promotes or deletes the previous object", async () => {
    state = createAvatarObject(id, now).url; const previous = state;
    storage.putAvatar.mockRejectedValueOnce(new Error("storage offline"));
    await expect(replace()).rejects.toMatchObject({ status: 503 });
    expect(state).toBe(previous); expect(prisma.client.$transaction).not.toHaveBeenCalled(); expect(storage.deleteAvatar).not.toHaveBeenCalled();
  });
  it("confirmed callback rollback cleans candidate and emits nothing", async () => {
    const old = createAvatarObject(id, now); state = old.url; mode = "rollback";
    await expect(replace()).rejects.toMatchObject({ status: 503 });
    expect(state).toBe(old.url); expect(storage.deleteAvatar).toHaveBeenCalledWith(storage.putAvatar.mock.calls[0][0]);
    expect(ws.emitAvatarUpdated).not.toHaveBeenCalled();
  });
  it("reconciles lost commit response to success without deleting the current candidate", async () => {
    mode = "ambiguous-committed";
    const result = await replace(); expect(result.projection.avatarUrl).toBe(state);
    expect(storage.deleteAvatar).not.toHaveBeenCalled(); await service.afterCommit(result); expect(ws.emitAvatarUpdated).toHaveBeenCalledTimes(1);
  });
  it.each(["ambiguous-before", "unavailable"] as const)("retains candidate on %s and returns uncertainty", async (failure) => {
    mode = failure; await expect(replace()).rejects.toMatchObject({ status: 503, response: { error: { code: "AVATAR_COMMIT_UNCONFIRMED" } } });
    expect(storage.deleteAvatar).not.toHaveBeenCalled(); expect(ws.emitAvatarUpdated).not.toHaveBeenCalled();
  });
  it("postcommit event and deletion failures cannot turn a committed success into failure", async () => {
    state = createAvatarObject(id, now).url;
    ws.emitAvatarUpdated.mockRejectedValueOnce(new Error("ws offline")); storage.deleteAvatar.mockRejectedValueOnce(new Error("delete offline"));
    const result = await replace(); await expect(service.afterCommit(result)).resolves.toBeUndefined(); expect(result.projection.avatarUrl).toBe(state);
  });
  it("expired candidate cannot promote and account is rechecked under lock", async () => {
    storage.putAvatar.mockImplementationOnce(async () => { now = new Date(now.getTime() + 300_000); });
    await expect(replace()).rejects.toMatchObject({ status: 409 }); expect(update).not.toHaveBeenCalled();
    storage.putAvatar.mockImplementationOnce(async () => { exists = false; });
    await expect(replace()).rejects.toMatchObject({ status: 401 }); expect(update).not.toHaveBeenCalled();
  });
  it("metadata is bounded and legacy/candidate/old URLs are never served", async () => {
    state = "legacy"; expect(await service.metadata(id)).toEqual({ userId: id, avatarUrl: null });
    const old = createAvatarObject(id, now); const current = createAvatarObject(id, now); state = current.url;
    await expect(service.image(id, old.version)).rejects.toMatchObject({ status: 404 });
    expect(await service.image(id, current.version)).toEqual(current);
    storage.readAvatar.mockRejectedValueOnce(new Error("offline")); await expect(service.readImage(current)).rejects.toMatchObject({ status: 503 });
    storage.readAvatar.mockResolvedValueOnce(null); await expect(service.readImage(current)).rejects.toMatchObject({ status: 404 });
    exists = false; await expect(service.metadata(id)).rejects.toMatchObject({ status: 404 });
  });
  it("bounds admission without a queue and holds it until actual processing ends", async () => {
    const release = service.acquire(id); expect(() => service.acquire(id)).toThrow(expect.objectContaining({ status: 409 }));
    const other = service.acquire("other"); expect(() => service.acquire("third")).toThrow(expect.objectContaining({ status: 503 }));
    let finish!: (buffer: Buffer) => void;
    jest.spyOn(images, "normalizeAvatar").mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = replace().finally(release);
    expect(() => service.acquire(id)).toThrow();
    finish(normalized); await pending;
    expect(() => service.acquire(id)).not.toThrow(); other();
  });
});
