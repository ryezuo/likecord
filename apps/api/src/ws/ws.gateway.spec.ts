import { WsGateway } from "./ws.gateway";

describe("WsGateway joining-user convergence", () => {
  const makeGateway = (membership: { isBanned: boolean } | null) => {
    const prisma = {
      client: { member: { findUnique: jest.fn().mockResolvedValue(membership) } },
    };
    const gateway = new WsGateway(prisma as never, {} as never, {} as never, {} as never, {} as never,
      { remove: jest.fn(), associate: jest.fn() } as never);
    const joiningSocket = {
      userId: "joining-user",
      serverMemberships: ["existing-server"],
      join: jest.fn().mockResolvedValue(undefined),
    };
    const unrelatedSocket = {
      userId: "unrelated-user",
      serverMemberships: [],
      join: jest.fn().mockResolvedValue(undefined),
    };
    gateway.server = {
      sockets: { sockets: new Map([["joining", joiningSocket], ["unrelated", unrelatedSocket]]) },
    } as never;
    return { gateway, joiningSocket, unrelatedSocket };
  };

  it("joins all matching sockets and updates their membership snapshot after membership exists", async () => {
    const { gateway, joiningSocket, unrelatedSocket } = makeGateway({ isBanned: false });
    await gateway.joinUserToServer("joining-user", "new-server");
    expect(joiningSocket.join).toHaveBeenCalledWith("server:new-server");
    expect(joiningSocket.serverMemberships).toEqual(["existing-server", "new-server"]);
    expect(unrelatedSocket.join).not.toHaveBeenCalled();
  });

  it.each([null, { isBanned: true }])("never joins sockets without an active membership", async (membership) => {
    const { gateway, joiningSocket, unrelatedSocket } = makeGateway(membership);
    await gateway.joinUserToServer("joining-user", "new-server");
    expect(joiningSocket.join).not.toHaveBeenCalled();
    expect(unrelatedSocket.join).not.toHaveBeenCalled();
  });
});

describe("WsGateway F.5.3 server removal convergence", () => {
  const makeGateway = () => {
    const emitted: Array<{ room: string; event: string; data: unknown }> = [];
    const voice = {
      removeScreenShareViewersForSocket: jest.fn().mockResolvedValue([]),
      removeScreenSharesForUser: jest.fn().mockResolvedValue([]),
      leave: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = new WsGateway({} as never, {} as never, {} as never, voice as never, {} as never,
      { remove: jest.fn(), associate: jest.fn() } as never);
    const makeSocket = (id: string, userId: string, voiceChannel?: string) => ({
      id,
      userId,
      voiceChannel,
      serverMemberships: ["server", "other"],
      rooms: new Set([`user:${userId}`, "server:server", "channel:text", ...(voiceChannel ? [`voice:${voiceChannel}`] : [])]),
      leave: jest.fn().mockImplementation(function (this: { rooms: Set<string> }, room: string) { this.rooms.delete(room); }),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    });
    const first = makeSocket("first", "member", "voice");
    const second = makeSocket("second", "member");
    const unrelated = makeSocket("unrelated", "other-user", "voice");
    gateway.server = {
      sockets: { sockets: new Map([[first.id, first], [second.id, second], [unrelated.id, unrelated]]) },
      to: jest.fn((room: string) => ({ emit: (event: string, data: unknown) => emitted.push({ room, event, data }) })),
    } as never;
    return { gateway, voice, emitted, first, second, unrelated };
  };

  it("evicts every socket for a leaving user from server, channel, Voice and membership snapshots", async () => {
    const { gateway, voice, emitted, first, second, unrelated } = makeGateway();
    await gateway.convergeUserLeftServer("member", "server", ["text", "voice"]);

    expect(emitted[0]).toEqual({ room: "user:member", event: "server:membership-removed", data: { serverId: "server" } });
    expect(first.leave).toHaveBeenCalledWith("server:server");
    expect(first.leave).toHaveBeenCalledWith("channel:text");
    expect(first.leave).toHaveBeenCalledWith("voice:voice");
    expect(second.leave).toHaveBeenCalledWith("server:server");
    expect(voice.leave).toHaveBeenCalledWith("voice", "member");
    expect(first.serverMemberships).toEqual(["other"]);
    expect(second.serverMemberships).toEqual(["other"]);
    expect(unrelated.leave).not.toHaveBeenCalledWith("server:server");
    expect(emitted.at(-1)).toEqual({ room: "server:server", event: "server:member-left", data: { serverId: "server" } });
  });

  it("sends metadata-minimal delete invalidation through user rooms and evicts every affected user", async () => {
    const { gateway, emitted, first, unrelated } = makeGateway();
    await gateway.convergeDeletedServer("server", ["member", "other-user"], ["text", "voice"]);
    expect(emitted.filter((entry) => entry.event === "server:deleted")).toEqual([
      { room: "user:member", event: "server:deleted", data: { serverId: "server" } },
      { room: "user:other-user", event: "server:deleted", data: { serverId: "server" } },
    ]);
    expect(first.leave).toHaveBeenCalledWith("server:server");
    expect(unrelated.leave).toHaveBeenCalledWith("server:server");
  });
});

describe("WsGateway F6.C1 occupancy convergence", () => {
  const makeGateway = () => {
    const emitted: Array<{ room: string; event: string; data: unknown }> = [];
    const voiceState = {
      userId: "member",
      channelId: "voice",
      serverId: "server",
      isMuted: false,
      isDeafened: false,
      joinedAt: 1,
    };
    const voice = {
      getOccupancySnapshot: jest.fn().mockResolvedValue({ serverId: "server", channels: [] }),
      getVoiceState: jest.fn().mockResolvedValue(voiceState),
      join: jest.fn().mockResolvedValue(voiceState),
      leave: jest.fn().mockResolvedValue(undefined),
      getUsers: jest.fn().mockResolvedValue([voiceState]),
      listScreenShares: jest.fn().mockResolvedValue([]),
      removeScreenShareViewersForSocket: jest.fn().mockResolvedValue([]),
      removeScreenSharesForUser: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      client: {
        user: { findMany: jest.fn().mockResolvedValue([{ id: "member", username: "member", displayName: "Member" }]) },
        channel: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const presence = {
      decrementConnections: jest.fn().mockResolvedValue(1),
      remove: jest.fn(),
    };
    const gateway = new WsGateway(prisma as never, {} as never, presence as never, voice as never, {} as never,
      { remove: jest.fn(), associate: jest.fn() } as never);
    gateway.server = {
      sockets: { sockets: new Map() },
      to: jest.fn((room: string) => ({ emit: (event: string, data: unknown) => emitted.push({ room, event, data }) })),
    } as never;
    const client = {
      id: "socket-member",
      userId: "member",
      serverMemberships: ["server"],
      voiceChannel: undefined as string | undefined,
      rooms: new Set(["server:server"]),
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    return { gateway, voice, presence, emitted, client };
  };

  it("delegates the snapshot to the authenticated user and rejects missing identity/scope", async () => {
    const { gateway, voice, client } = makeGateway();

    await expect(gateway.handleVoiceOccupancyGet(client as never, { serverId: "server" }))
      .resolves.toEqual({ serverId: "server", channels: [] });
    expect(voice.getOccupancySnapshot).toHaveBeenCalledWith("server", "member");

    voice.getOccupancySnapshot.mockResolvedValueOnce(null);
    await expect(gateway.handleVoiceOccupancyGet(client as never, { serverId: "foreign-server" }))
      .resolves.toEqual({ serverId: "foreign-server", channels: [] });

    await expect(gateway.handleVoiceOccupancyGet({ ...client, userId: undefined } as never, { serverId: "server" }))
      .resolves.toBeNull();
    await expect(gateway.handleVoiceOccupancyGet(client as never, { serverId: "" }))
      .resolves.toBeNull();
    expect(voice.getOccupancySnapshot).toHaveBeenCalledTimes(2);
  });

  it("invalidates the server room after join, leave, and disconnect cleanup", async () => {
    const { gateway, voice, emitted, client } = makeGateway();

    await expect(gateway.handleVoiceJoin(client as never, { serverId: "server", channelId: "voice" }))
      .resolves.toMatchObject({ ok: true });
    expect(emitted).toContainEqual({
      room: "server:server",
      event: "voice:occupancy-changed",
      data: { serverId: "server" },
    });

    emitted.length = 0;
    await gateway.handleVoiceLeave(client as never, { channelId: "voice" });
    expect(emitted).toEqual([{
      room: "server:server",
      event: "voice:occupancy-changed",
      data: { serverId: "server" },
    }]);

    emitted.length = 0;
    client.voiceChannel = "voice";
    await gateway.handleDisconnect(client as never);
    expect(voice.leave).toHaveBeenLastCalledWith("voice", "member");
    expect(emitted).toEqual([{
      room: "server:server",
      event: "voice:occupancy-changed",
      data: { serverId: "server" },
    }]);
  });

  it("uses metadata-minimal invalidation for permission and Channel lifecycle changes", async () => {
    const { gateway, emitted } = makeGateway();

    await gateway.emitChannelPermissionsChanged("server", ["voice"]);
    gateway.emitChannelLifecycleChange("server");

    expect(emitted.filter((entry) => entry.event === "voice:occupancy-changed")).toEqual([
      { room: "server:server", event: "voice:occupancy-changed", data: { serverId: "server" } },
      { room: "server:server", event: "voice:occupancy-changed", data: { serverId: "server" } },
    ]);
    expect(emitted.filter((entry) => entry.event === "voice:occupancy-changed")
      .every((entry) => Object.keys(entry.data as object).length === 1)).toBe(true);
  });
});
