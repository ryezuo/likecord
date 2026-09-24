import { NavigationService } from "./navigation.service";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";

describe("Continue navigation service", () => {
  const client = {
    userServerPreference: { findMany: jest.fn() },
    channel: { findFirst: jest.fn() },
    server: { findUnique: jest.fn() },
  };
  const permissions = { canAccessServer: jest.fn(), hasChannelPermission: jest.fn() };
  const service = new NavigationService({ client } as unknown as PrismaService, permissions as unknown as PermissionService);

  beforeEach(() => {
    jest.resetAllMocks();
    client.userServerPreference.findMany.mockResolvedValue([{ serverId: "s1", lastTextChannelId: "c1" }]);
    client.channel.findFirst.mockResolvedValue({ id: "c1", name: "general", serverId: "s1", type: "TEXT" });
    client.server.findUnique.mockResolvedValue({ id: "s1", name: "Server" });
    permissions.canAccessServer.mockResolvedValue(true);
    permissions.hasChannelPermission.mockResolvedValue(true);
  });

  it("continues after an entire invalid batch with deterministic account-scoped ordering", async () => {
    client.userServerPreference.findMany
      .mockResolvedValueOnce(Array.from({ length: 50 }, (_, index) => ({ serverId: `invalid-${index}`, lastTextChannelId: null })));
    await expect(service.resolveContinue("u1")).resolves.toEqual({ destination: { serverId: "s1", serverName: "Server", channelId: "c1", channelName: "general" } });
    for (const [index, call] of client.userServerPreference.findMany.mock.calls.entries()) {
      expect(call[0]).toEqual({ where: { userId: "u1" }, orderBy: [{ updatedAt: "desc" }, { serverId: "asc" }], select: { serverId: true, lastTextChannelId: true }, take: 50, skip: index * 50 });
    }
    expect(client.userServerPreference.findMany).toHaveBeenCalledTimes(2);
    expect(permissions.hasChannelPermission).toHaveBeenCalledWith("c1", "u1", PERMISSIONS.VIEW_CHANNEL);
  });

  it.each(["database", "membership", "channel permissions", "server metadata"])("propagates operational failure in %s instead of returning an empty success", async (kind) => {
    const operation = kind === "database" ? client.userServerPreference.findMany
      : kind === "membership" ? permissions.canAccessServer
      : kind === "channel permissions" ? permissions.hasChannelPermission : client.server.findUnique;
    operation.mockRejectedValueOnce(new Error("operational failure"));
    await expect(service.resolveContinue("u1")).rejects.toThrow("operational failure");
  });

  it("fails closed when the server disappears before metadata is read", async () => {
    client.server.findUnique.mockResolvedValue(null);
    await expect(service.resolveContinue("u1")).resolves.toEqual({ destination: null });
  });
});
