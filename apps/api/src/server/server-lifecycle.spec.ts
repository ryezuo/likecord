import { ForbiddenException } from "@nestjs/common";
import { ServerService } from "./server.service";

describe("ServerService F.5.3 membership lifecycle", () => {
  const makeService = () => {
    const prisma = {
      client: {
        $transaction: jest.fn(),
        server: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
        member: { create: jest.fn(), deleteMany: jest.fn() },
        role: { create: jest.fn() },
        channel: { createMany: jest.fn() },
      },
    };
    const gateway = {
      joinUserToServer: jest.fn(),
      convergeUserLeftServer: jest.fn(),
      convergeDeletedServer: jest.fn(),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ServerService(
      prisma as never,
      {} as never,
      audit as never,
      gateway as never,
      {} as never,
    );
    return { service, prisma, gateway, audit };
  };

  it("joins the connected owner to a newly created server room after persistence commits", async () => {
    const { service, prisma, gateway } = makeService();
    const createdAt = new Date("2026-09-01T00:00:00.000Z");
    prisma.client.$transaction.mockImplementation(async (operation: (tx: typeof prisma.client) => unknown) => operation(prisma.client));
    prisma.client.server.create.mockResolvedValue({
      id: "new-server", name: "Garden", description: null, ownerId: "owner", createdAt,
    });
    prisma.client.member.create.mockResolvedValue({ id: "owner-member" });
    prisma.client.role.create.mockResolvedValue({ id: "everyone" });
    prisma.client.channel.createMany.mockResolvedValue({ count: 2 });
    gateway.joinUserToServer.mockResolvedValue(undefined);

    await expect(service.create("owner", { name: "Garden" })).resolves.toMatchObject({ id: "new-server" });

    expect(gateway.joinUserToServer).toHaveBeenCalledWith("owner", "new-server");
    expect(prisma.client.member.create.mock.invocationCallOrder[0])
      .toBeLessThan(gateway.joinUserToServer.mock.invocationCallOrder[0]);
  });

  it("still converges the committed owner room when post-commit audit recording fails", async () => {
    const { service, prisma, gateway, audit } = makeService();
    prisma.client.$transaction.mockImplementation(async (operation: (tx: typeof prisma.client) => unknown) => operation(prisma.client));
    prisma.client.server.create.mockResolvedValue({
      id: "new-server", name: "Garden", description: null, ownerId: "owner", createdAt: new Date(),
    });
    prisma.client.member.create.mockResolvedValue({ id: "owner-member" });
    prisma.client.role.create.mockResolvedValue({ id: "everyone" });
    prisma.client.channel.createMany.mockResolvedValue({ count: 2 });
    audit.record.mockRejectedValue(new Error("audit unavailable"));
    gateway.joinUserToServer.mockResolvedValue(undefined);

    await expect(service.create("owner", { name: "Garden" })).rejects.toThrow("audit unavailable");
    expect(gateway.joinUserToServer).toHaveBeenCalledWith("owner", "new-server");
  });

  it("notifies and evicts self-leave only after durable membership removal", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({ ownerId: "owner", channels: [{ id: "text" }, { id: "voice" }] });
    prisma.client.member.deleteMany.mockResolvedValue({ count: 1 });
    gateway.convergeUserLeftServer.mockResolvedValue(undefined);

    await expect(service.leaveServer("server", "member")).resolves.toEqual({ result: "LEFT", serverId: "server" });
    expect(gateway.convergeUserLeftServer).toHaveBeenCalledWith("member", "server", ["text", "voice"]);
    expect(prisma.client.member.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(gateway.convergeUserLeftServer.mock.invocationCallOrder[0]);
  });

  it("returns ALREADY_LEFT without emitting when membership is already absent", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({ ownerId: "owner", channels: [] });
    prisma.client.member.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.leaveServer("server", "member")).resolves.toEqual({ result: "ALREADY_LEFT", serverId: "server" });
    expect(gateway.convergeUserLeftServer).not.toHaveBeenCalled();
  });

  it("rejects owner leave before mutation or realtime notification", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({ ownerId: "owner", channels: [] });
    await expect(service.leaveServer("server", "owner")).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.member.deleteMany).not.toHaveBeenCalled();
    expect(gateway.convergeUserLeftServer).not.toHaveBeenCalled();
  });

  it("emits no self-leave event when persistence fails", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({ ownerId: "owner", channels: [] });
    prisma.client.member.deleteMany.mockRejectedValue(new Error("database unavailable"));
    await expect(service.leaveServer("server", "member")).rejects.toThrow("database unavailable");
    expect(gateway.convergeUserLeftServer).not.toHaveBeenCalled();
  });

  it("notifies every affected identity only after Server deletion commits", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({
      id: "server", name: "Garden", ownerId: "owner",
      members: [{ userId: "owner" }, { userId: "member" }],
      channels: [{ id: "text" }, { id: "voice" }],
    });
    prisma.client.server.delete.mockResolvedValue({});
    gateway.convergeDeletedServer.mockResolvedValue(undefined);
    await service.delete("server", "owner");
    expect(gateway.convergeDeletedServer).toHaveBeenCalledWith("server", ["owner", "member"], ["text", "voice"]);
    expect(prisma.client.server.delete.mock.invocationCallOrder[0])
      .toBeLessThan(gateway.convergeDeletedServer.mock.invocationCallOrder[0]);
  });

  it("emits no Server-delete event when persistence fails", async () => {
    const { service, prisma, gateway } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({
      id: "server", name: "Garden", ownerId: "owner", members: [], channels: [],
    });
    prisma.client.server.delete.mockRejectedValue(new Error("delete rolled back"));
    await expect(service.delete("server", "owner")).rejects.toThrow("delete rolled back");
    expect(gateway.convergeDeletedServer).not.toHaveBeenCalled();
  });

  it("still converges connected clients when post-commit audit recording fails", async () => {
    const { service, prisma, gateway, audit } = makeService();
    prisma.client.server.findUnique.mockResolvedValue({
      id: "server", name: "Garden", ownerId: "owner", members: [{ userId: "member" }], channels: [],
    });
    prisma.client.server.delete.mockResolvedValue({});
    audit.record.mockRejectedValue(new Error("audit unavailable"));
    gateway.convergeDeletedServer.mockResolvedValue(undefined);
    await expect(service.delete("server", "owner")).rejects.toThrow("audit unavailable");
    expect(gateway.convergeDeletedServer).toHaveBeenCalledWith("server", ["owner", "member"], []);
  });
});
