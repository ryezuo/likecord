import { PERMISSIONS } from "../server/guards/permission.service";
import { VoiceService, type VoiceStateEntry } from "./voice.service";

describe("VoiceService F6.C1 occupancy snapshot", () => {
  const visibleEntry: VoiceStateEntry = {
    userId: "visible-user",
    channelId: "voice-visible",
    serverId: "server-1",
    isMuted: true,
    isDeafened: false,
    joinedAt: 1,
  };
  const removedEntry: VoiceStateEntry = {
    userId: "removed-user",
    channelId: "voice-visible",
    serverId: "server-1",
    isMuted: false,
    isDeafened: false,
    joinedAt: 2,
  };
  const hiddenEntry: VoiceStateEntry = {
    userId: "hidden-user",
    channelId: "voice-hidden",
    serverId: "server-1",
    isMuted: false,
    isDeafened: true,
    joinedAt: 3,
  };

  const makeService = () => {
    const values = new Map<string, string>([
      ["voice:voice-visible:visible-user", JSON.stringify(visibleEntry)],
      ["voice:voice-visible:removed-user", JSON.stringify(removedEntry)],
      ["voice:voice-hidden:hidden-user", JSON.stringify(hiddenEntry)],
    ]);
    const redisClient = {
      smembers: jest.fn(async (key: string) => key.includes("voice-visible")
        ? ["visible-user", "removed-user"]
        : ["hidden-user"]),
      get: jest.fn(async (key: string) => values.get(key) ?? null),
    };
    const prisma = {
      client: {
        channel: {
          findMany: jest.fn().mockResolvedValue([
            { id: "voice-visible", position: 0 },
            { id: "voice-hidden", position: 1 },
          ]),
        },
        member: {
          findMany: jest.fn().mockResolvedValue([
            { userId: "visible-user", user: { username: "visible", displayName: "Visible User" } },
          ]),
        },
      },
    };
    const permissions = {
      canAccessServer: jest.fn().mockResolvedValue(true),
      hasChannelPermission: jest.fn(async (channelId: string, _userId: string, permission: bigint) =>
        channelId === "voice-visible" && permission === PERMISSIONS.VIEW_CHANNEL
      ),
    };
    const service = new VoiceService(
      prisma as never,
      permissions as never,
      { getClient: () => redisClient } as never,
    );
    return { service, prisma, permissions, redisClient };
  };

  it("returns only current active members from permitted Voice Channels", async () => {
    const { service, prisma, redisClient } = makeService();

    await expect(service.getOccupancySnapshot("server-1", "observer")).resolves.toEqual({
      serverId: "server-1",
      channels: [{
        channelId: "voice-visible",
        members: [{
          userId: "visible-user",
          username: "visible",
          displayName: "Visible User",
          isMuted: true,
          isDeafened: false,
        }],
      }],
    });
    expect(prisma.client.channel.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { serverId: "server-1", type: "VOICE" },
    }));
    expect(prisma.client.member.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { serverId: "server-1", isBanned: false, userId: { in: ["visible-user", "removed-user"] } },
    }));
    expect(redisClient.smembers).not.toHaveBeenCalledWith("voice:channel:voice-hidden:members");
  });

  it("does not enumerate channels or occupants for an unauthorized server", async () => {
    const { service, prisma, permissions, redisClient } = makeService();
    permissions.canAccessServer.mockResolvedValue(false);

    await expect(service.getOccupancySnapshot("foreign-server", "observer")).resolves.toBeNull();
    expect(prisma.client.channel.findMany).not.toHaveBeenCalled();
    expect(prisma.client.member.findMany).not.toHaveBeenCalled();
    expect(redisClient.smembers).not.toHaveBeenCalled();
  });

  it("returns an empty filtered snapshot without querying user metadata when no visible channel is occupied", async () => {
    const { service, prisma, redisClient } = makeService();
    redisClient.smembers.mockResolvedValue([]);

    await expect(service.getOccupancySnapshot("server-1", "observer")).resolves.toEqual({
      serverId: "server-1",
      channels: [],
    });
    expect(prisma.client.member.findMany).not.toHaveBeenCalled();
  });
});
