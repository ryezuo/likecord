import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { AuditLogService } from "../audit/audit.service";
import { WsGateway } from "../ws/ws.gateway";
import { CreateInviteDto } from "./dto/invite.dto";
import * as crypto from "crypto";
import { Prisma } from "@prisma/client";

type InvitePreview =
  | { inviteStatus: "UNAVAILABLE" }
  | { inviteStatus: "VALID"; membershipStatus: "UNAUTHENTICATED" | "NOT_MEMBER"; serverName: string }
  | { inviteStatus: "VALID" | "UNAVAILABLE"; membershipStatus: "ALREADY_MEMBER"; serverName: string; serverId: string };

type InviteAcceptance = {
  result: "JOINED" | "ALREADY_MEMBER";
  memberId: string;
  serverId: string;
  serverName: string;
};

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLog: AuditLogService,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
  ) {}

  async create(serverId: string, userId: string, dto: CreateInviteDto) {
    const permissions = await this.permissionService.getServerPermissions(serverId, userId);
    if ((permissions & (PERMISSIONS.CREATE_INVITE | PERMISSIONS.MANAGE_SERVER)) === 0n) {
      throw new ForbiddenException({ error: { code: "MISSING_PERMISSION", message: "You do not have permission to perform this action" } });
    }
    const code = crypto.randomBytes(4).toString("hex");
    const invite = await this.prisma.client.invite.create({
      data: {
        code,
        serverId,
        creatorId: userId,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresInHours ? new Date(Date.now() + dto.expiresInHours * 3600000) : null,
      },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "INVITE_CREATE", details: { code } });
    return invite;
  }

  async ensureDefault(serverId: string, userId: string) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.CREATE_INVITE);
    const result = await this.prisma.client.$transaction(async (tx) => {
      // The Server row is the existing stable serialization point for this
      // server-context find-or-create. No Invite uniqueness migration is needed.
      await tx.$queryRaw(Prisma.sql`
        SELECT "id" FROM "servers"
        WHERE "id" = CAST(${serverId} AS uuid)
        FOR UPDATE
      `);
      const now = new Date();
      const candidates = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "invites"
        WHERE "serverId" = CAST(${serverId} AS uuid)
          AND "creatorId" = CAST(${userId} AS uuid)
          AND "isRevoked" = false
          AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
          AND ("maxUses" IS NULL OR "useCount" < "maxUses")
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT 1
      `);
      if (candidates[0]) {
        const invite = await tx.invite.findUnique({ where: { id: candidates[0].id } });
        if (invite) return { invite, created: false };
      }

      const code = crypto.randomBytes(4).toString("hex");
      const invite = await tx.invite.create({
        data: { code, serverId, creatorId: userId, maxUses: null, expiresAt: null },
      });
      return { invite, created: true };
    });
    if (result.created) {
      await this.auditLog.record({ serverId, actorId: userId, action: "INVITE_CREATE", details: { code: result.invite.code } });
    }
    return result.invite;
  }

  async list(serverId: string, userId: string) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_SERVER);
    return this.prisma.client.invite.findMany({
      where: { serverId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    });
  }

  async revoke(serverId: string, inviteId: string, userId: string) {
    const invite = await this.prisma.client.invite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.serverId !== serverId) throw new NotFoundException();
    const [canAccess, canManage] = await Promise.all([
      this.permissionService.canAccessServer(serverId, userId),
      this.permissionService.hasServerPermission(serverId, userId, PERMISSIONS.MANAGE_SERVER),
    ]);
    if (!canAccess || (!canManage && invite.creatorId !== userId)) {
      throw new ForbiddenException({ error: { code: "NO_PERMISSION", message: "Cannot revoke this invite" } });
    }
    await this.prisma.client.invite.update({ where: { id: inviteId }, data: { isRevoked: true } });
    await this.auditLog.record({ serverId, actorId: userId, action: "INVITE_REVOKE", details: { code: invite.code } });
  }

  async validate(code: string, userId?: string): Promise<InvitePreview> {
    const invite = await this.prisma.client.invite.findUnique({
      where: { code },
      include: { server: { select: { id: true, name: true } } },
    });
    if (!invite) return { inviteStatus: "UNAVAILABLE" };

    const member = userId
      ? await this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId: invite.serverId, userId } },
        select: { isBanned: true },
      })
      : null;
    const isAvailable = !invite.isRevoked
      && (!invite.expiresAt || invite.expiresAt >= new Date())
      && (invite.maxUses === null || invite.useCount < invite.maxUses);

    if (member?.isBanned) return { inviteStatus: "UNAVAILABLE" };
    if (member) {
      return {
        inviteStatus: isAvailable ? "VALID" : "UNAVAILABLE",
        membershipStatus: "ALREADY_MEMBER",
        serverName: invite.server.name,
        serverId: invite.server.id,
      };
    }
    if (!isAvailable) return { inviteStatus: "UNAVAILABLE" };
    return {
      inviteStatus: "VALID",
      membershipStatus: userId ? "NOT_MEMBER" : "UNAUTHENTICATED",
      serverName: invite.server.name,
    };
  }

  async accept(code: string, userId: string): Promise<InviteAcceptance> {
    const result = await this.acceptWithRetry(code, userId);

    if (result.result === "JOINED") {
      const newUser = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true },
      }).catch(() => null);

      try {
        await this.wsGateway.joinUserToServer(userId, result.serverId);
      } catch { /* socket convergence is best-effort after committed persistence */ }
      try {
        this.wsGateway.emitToServer(result.serverId, "server:member-joined", {
          serverId: result.serverId,
          member: {
            id: result.memberId,
            userId,
            nickname: null,
            user: newUser || { id: userId, username: userId, displayName: userId },
            roles: [],
          },
        });
      } catch { /* WS emit is best-effort */ }
    }

    return result;
  }

  private async acceptWithRetry(code: string, userId: string): Promise<InviteAcceptance> {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.client.$transaction(async (tx) => {
          const invite = await tx.invite.findUnique({
            where: { code },
            include: { server: { select: { id: true, name: true } } },
          });
          if (!invite) {
            throw new BadRequestException({ error: { code: "INVALID_INVITE", message: "Invalid invite" } });
          }

          const existingMember = await tx.member.findUnique({
            where: { serverId_userId: { serverId: invite.serverId, userId } },
          });
          if (existingMember?.isBanned) {
            throw new ForbiddenException({ error: { code: "BANNED", message: "You are banned from this server" } });
          }
          if (existingMember) {
            return {
              result: "ALREADY_MEMBER" as const,
              memberId: existingMember.id,
              serverId: invite.serverId,
              serverName: invite.server.name,
            };
          }

          if (invite.isRevoked) {
            throw new BadRequestException({ error: { code: "INVALID_INVITE", message: "Invalid invite" } });
          }
          if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new BadRequestException({ error: { code: "INVITE_EXPIRED", message: "Invite expired" } });
          }
          if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
            throw new BadRequestException({ error: { code: "INVITE_EXHAUSTED", message: "Invite exhausted" } });
          }

          await tx.invite.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } });
          const member = await tx.member.create({ data: { serverId: invite.serverId, userId } });
          return {
            result: "JOINED" as const,
            memberId: member.id,
            serverId: invite.serverId,
            serverName: invite.server.name,
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError
          && (error.code === "P2034" || error.code === "P2002");
        if (!retryable || attempt === maxAttempts) throw error;
      }
    }
    throw new Error("Invite acceptance retry loop exhausted");
  }
}
