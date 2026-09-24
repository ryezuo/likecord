import { ForbiddenException } from "@nestjs/common";
import { InviteService } from "./invite.service";
import { PERMISSIONS } from "../server/guards/permission.service";

describe("F.5.4 Invite administration service", () => {
  const inviteCreate = jest.fn();
  const inviteFindMany = jest.fn();
  const getServerPermissions = jest.fn();
  const assertHasPermission = jest.fn();
  const auditRecord = jest.fn();

  const service = new InviteService(
    { client: { invite: { create: inviteCreate, findMany: inviteFindMany } } } as never,
    { getServerPermissions, assertHasPermission } as never,
    { record: auditRecord } as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    inviteCreate.mockResolvedValue({ id: "invite-1", code: "abc123" });
    inviteFindMany.mockResolvedValue([]);
    auditRecord.mockResolvedValue(undefined);
  });

  it.each([
    ["CREATE_INVITE", PERMISSIONS.CREATE_INVITE],
    ["MANAGE_SERVER", PERMISSIONS.MANAGE_SERVER],
  ])("allows advanced creation with %s while preserving existing creation authority", async (_label, permissions) => {
    getServerPermissions.mockResolvedValue(permissions);
    await service.create("server-1", "user-1", { expiresInHours: 168, maxUses: 100 });
    expect(inviteCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      serverId: "server-1", creatorId: "user-1", maxUses: 100, expiresAt: expect.any(Date),
    }) });
  });

  it("rejects creation without CREATE_INVITE or MANAGE_SERVER", async () => {
    getServerPermissions.mockResolvedValue(0n);
    await expect(service.create("server-1", "user-1", {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it("lists the complete administrative history newest first with safe creator identity", async () => {
    await service.list("server-1", "user-1");
    expect(assertHasPermission).toHaveBeenCalledWith("server-1", "user-1", PERMISSIONS.MANAGE_SERVER);
    expect(inviteFindMany).toHaveBeenCalledWith({
      where: { serverId: "server-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    });
  });
});
