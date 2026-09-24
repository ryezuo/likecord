import { AvatarGcService } from "./avatar-gc.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { createAvatarObject, avatarPosterKey } from "../../storage/avatar-object";

describe("avatar inventory GC", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const now = new Date("2026-09-06T12:00:00Z");
  const oldDate = new Date(now.getTime() - 86_400_001);
  const old = createAvatarObject(id, oldDate);
  const prisma = { client: { $queryRaw: jest.fn(), user: { findUnique: jest.fn() } } };
  const storage = { listAvatars: jest.fn(), deleteAvatar: jest.fn() };
  let gc: AvatarGcService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.client.$queryRaw.mockResolvedValue([{ now }]); prisma.client.user.findUnique.mockResolvedValue(null);
    storage.listAvatars.mockResolvedValue({ objects: [{ key: old.key, lastModified: oldDate }] });
    gc = new AvatarGcService(prisma as unknown as PrismaService, storage as unknown as StorageService);
  });
  afterEach(async () => { await gc.onModuleDestroy(); jest.useRealTimers(); });
  it("deletes missing-user orphan older than both grace clocks", async () => {
    await gc.run(); expect(storage.deleteAvatar).toHaveBeenCalledWith(old.key);
    expect(prisma.client.user.findUnique.mock.invocationCallOrder[0]).toBeLessThan(storage.deleteAvatar.mock.invocationCallOrder[0]);
  });
  it("preserves current references forever and retains either exact 24h boundary", async () => {
    const boundary = new Date(now.getTime() - 86_400_000);
    const youngKey = createAvatarObject(id, boundary);
    storage.listAvatars.mockResolvedValue({ objects: [
      { key: old.key, lastModified: oldDate }, { key: youngKey.key, lastModified: oldDate },
      { key: createAvatarObject(id, oldDate).key, lastModified: boundary },
    ] });
    prisma.client.user.findUnique.mockResolvedValue({ avatarUrl: old.url });
    await gc.run(); expect(storage.deleteAvatar).not.toHaveBeenCalled(); expect(prisma.client.user.findUnique).toHaveBeenCalledTimes(1);
  });
  it("reports malformed/missing-date inventory without deleting it", async () => {
    storage.listAvatars.mockResolvedValue({ objects: [{ key: "avatars/unknown", lastModified: oldDate }, { key: old.key }] });
    const warn = jest.spyOn(gc["logger"], "warn"); await gc.run();
    expect(warn).toHaveBeenCalledWith("AVATAR_GC_UNKNOWN_OBJECT"); expect(storage.deleteAvatar).not.toHaveBeenCalled();
  });
  it("derives poster liveness from the canonical main version, collecting stale pairs independently", async () => {
    storage.listAvatars.mockResolvedValue({ objects: [old.key, avatarPosterKey(old)].map((key) => ({ key, lastModified: oldDate })) });
    prisma.client.user.findUnique.mockResolvedValue({ avatarUrl: old.url });
    await gc.run(); expect(storage.deleteAvatar).not.toHaveBeenCalled();
    prisma.client.user.findUnique.mockResolvedValue({ avatarUrl: createAvatarObject(id, now).url });
    storage.deleteAvatar.mockRejectedValueOnce(new Error("main cleanup failed"));
    await gc.run(); expect(storage.deleteAvatar).toHaveBeenCalledWith(old.key); expect(storage.deleteAvatar).toHaveBeenCalledWith(avatarPosterKey(old));
  });
  it("retains on DB uncertainty and retries storage uncertainty", async () => {
    prisma.client.user.findUnique.mockRejectedValueOnce(new Error("DB offline")); await gc.run(); expect(storage.deleteAvatar).not.toHaveBeenCalled();
    storage.deleteAvatar.mockRejectedValueOnce(new Error("storage offline")); await expect(gc.run()).resolves.toBeUndefined();
    await gc.run(); expect(storage.deleteAvatar).toHaveBeenCalledTimes(2);
  });
  it("retains on listing failure and follows multiple pages", async () => {
    storage.listAvatars.mockRejectedValueOnce(new Error("offline")); await gc.run(); expect(storage.deleteAvatar).not.toHaveBeenCalled();
    storage.listAvatars.mockResolvedValueOnce({ objects: [], cursor: "page2" });
    await gc.run(); expect(storage.listAvatars).toHaveBeenLastCalledWith("page2"); expect(storage.deleteAvatar).toHaveBeenCalledWith(old.key);
  });
  it("does not overlap and schedules every six hours without a startup sweep", async () => {
    jest.useFakeTimers(); gc.onModuleInit(); expect(storage.listAvatars).not.toHaveBeenCalled();
    let finish!: (value: unknown) => void;
    storage.listAvatars.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    const pending = gc.run(); expect(storage.listAvatars).toHaveBeenCalledTimes(1);
    finish({ objects: [] }); await pending;
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000); expect(storage.listAvatars).toHaveBeenCalledTimes(2);
  });
});
