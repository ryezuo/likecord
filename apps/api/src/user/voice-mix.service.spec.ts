import { VoiceMixService } from "./voice-mix.service";
import { PrismaService } from "../prisma/prisma.service";

describe("VoiceMixService", () => {
  const client = {
    member: { findFirst: jest.fn() },
    userVoiceMixPreference: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  };
  const service = new VoiceMixService({ client } as unknown as PrismaService);
  const listener = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const target = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => { jest.resetAllMocks(); });

  it("reads only this listener's non-default rows without membership or Redis", async () => {
    client.userVoiceMixPreference.findMany.mockResolvedValue([]);
    await expect(service.getPreferences(listener)).resolves.toEqual([]);
    expect(client.userVoiceMixPreference.findMany).toHaveBeenCalledWith({
      where: { listenerUserId: listener, OR: [{ volumePercent: { not: 100 } }, { muted: true }] },
      select: { targetUserId: true, volumePercent: true, muted: true }, orderBy: { targetUserId: "asc" },
    });
    expect(client.member.findFirst).not.toHaveBeenCalled();
  });

  it("checks active co-membership server-side and upserts only the listener pair", async () => {
    client.member.findFirst.mockResolvedValue({ id: "membership" });
    await service.setPreference(listener, target, { volumePercent: 23, muted: true });
    expect(client.member.findFirst).toHaveBeenCalledWith({
      where: { userId: target, isBanned: false, server: { members: { some: { userId: listener, isBanned: false } } } },
      select: { id: true },
    });
    expect(client.userVoiceMixPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { listenerUserId_targetUserId: { listenerUserId: listener, targetUserId: target } },
      create: { listenerUserId: listener, targetUserId: target, volumePercent: 23, muted: true },
      update: { volumePercent: 23, muted: true },
    }));
  });

  it("uses sparse defaults after checking write eligibility", async () => {
    client.member.findFirst.mockResolvedValue({ id: "membership" });
    await expect(service.setPreference(listener, target, { volumePercent: 100, muted: false }))
      .resolves.toEqual({ targetUserId: target, volumePercent: 100, muted: false });
    expect(client.userVoiceMixPreference.upsert).not.toHaveBeenCalled();
    expect(client.userVoiceMixPreference.deleteMany).toHaveBeenCalledWith({ where: { listenerUserId: listener, targetUserId: target } });
  });

  it("does not leak nonexistent or unrelated accounts and never writes", async () => {
    client.member.findFirst.mockResolvedValue(null);
    await expect(service.setPreference(listener, target, { volumePercent: 20, muted: false }))
      .rejects.toMatchObject({ response: { error: { code: "USER_NOT_FOUND", message: "User not found" } } });
    expect(client.userVoiceMixPreference.upsert).not.toHaveBeenCalled();
  });

  it("rejects self including alternate UUID case before any database access", async () => {
    await expect(service.setPreference(listener, listener.toUpperCase(), { volumePercent: 20, muted: false }))
      .rejects.toMatchObject({ status: 400 });
    expect(client.member.findFirst).not.toHaveBeenCalled();
  });

  it("reset uses only ownership, including a repeated reset after membership loss", async () => {
    await service.resetPreference(listener, target);
    await service.resetPreference(listener, target);
    expect(client.member.findFirst).not.toHaveBeenCalled();
    expect(client.userVoiceMixPreference.deleteMany.mock.calls).toEqual([
      [{ where: { listenerUserId: listener, targetUserId: target } }],
      [{ where: { listenerUserId: listener, targetUserId: target } }],
    ]);
  });
});
