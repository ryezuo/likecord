import { Injectable, ForbiddenException, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_EVERYONE_PERMISSIONS, PermissionService, PERMISSIONS } from "./guards/permission.service";
import { AuditLogService } from "../audit/audit.service";
import { WsGateway } from "../ws/ws.gateway";
import { VoiceService } from "../voice/voice.service";
import { CreateServerDto, UpdateServerDto } from "./dto/server.dto";
import { UpdateMemberDto } from "./dto/member.dto";

@Injectable()
export class ServerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLog: AuditLogService,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
    @Inject(forwardRef(() => VoiceService))
    private readonly voiceService: VoiceService,
  ) {}

  async create(userId: string, dto: CreateServerDto) {
    const server = await this.prisma.client.$transaction(async (tx) => {
      const sv = await tx.server.create({
        data: { name: dto.name, description: dto.description || null, ownerId: userId },
      });

      await tx.member.create({
        data: { serverId: sv.id, userId },
      });

      await tx.role.create({
        data: {
          serverId: sv.id,
          name: "@everyone",
          permissions: DEFAULT_EVERYONE_PERMISSIONS,
          position: 0,
          isDefault: true,
          isMentionable: false,
        },
      });

      await tx.channel.createMany({
        data: [
          { serverId: sv.id, type: "TEXT", name: "general", position: 0 },
          { serverId: sv.id, type: "VOICE", name: "General", position: 1 },
        ],
      });

      return sv;
    });

    try {
      await this.auditLog.record({
        serverId: server.id,
        actorId: userId,
        action: "SERVER_CREATE",
        details: { name: server.name },
      });
    } finally {
      try {
        await this.wsGateway.joinUserToServer(userId, server.id);
      } catch { /* committed creation remains authoritative if realtime convergence is temporarily unavailable */ }
    }

    return server;
  }

  async getById(serverId: string, userId: string) {
    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
    });
    if (!server) throw new NotFoundException({ error: { code: "SERVER_NOT_FOUND", message: "Server not found" } });
    const effectivePermissions = await this.permissionService.getServerPermissions(serverId, userId);
    return { ...server, effectivePermissions: effectivePermissions.toString() };
  }

  async update(serverId: string, userId: string, dto: UpdateServerDto) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_SERVER);
    const updated = await this.prisma.client.server.update({
      where: { id: serverId },
      data: { ...(dto.name !== undefined && { name: dto.name }), ...(dto.description !== undefined && { description: dto.description }) },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "SERVER_UPDATE", details: { ...dto } });
    return updated;
  }

  async delete(serverId: string, userId: string) {
    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
      include: {
        members: { select: { userId: true } },
        channels: { select: { id: true } },
      },
    });
    if (!server) throw new NotFoundException();
    if (server.ownerId !== userId) throw new ForbiddenException({ error: { code: "OWNER_ONLY", message: "Only the owner can delete the server" } });
    await this.prisma.client.server.delete({ where: { id: serverId } });
    const affectedUserIds = Array.from(new Set([server.ownerId, ...server.members.map((member) => member.userId)]));
    try {
      await this.auditLog.record({ actorId: userId, action: "SERVER_DELETE", details: { serverId, name: server.name } });
    } finally {
      try {
        await this.wsGateway.convergeDeletedServer(serverId, affectedUserIds, server.channels.map((channel) => channel.id));
      } catch { /* committed deletion remains authoritative if realtime cleanup is temporarily unavailable */ }
    }
  }

  async leaveServer(serverId: string, userId: string): Promise<{ result: "LEFT" | "ALREADY_LEFT"; serverId: string }> {
    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true, channels: { select: { id: true } } },
    });
    if (!server) return { result: "ALREADY_LEFT", serverId };
    if (server.ownerId === userId) {
      throw new ForbiddenException({ error: { code: "OWNER_CANNOT_LEAVE", message: "The owner cannot leave the server" } });
    }

    const deletion = await this.prisma.client.member.deleteMany({ where: { serverId, userId } });
    if (deletion.count === 0) return { result: "ALREADY_LEFT", serverId };

    try {
      await this.wsGateway.convergeUserLeftServer(userId, serverId, server.channels.map((channel) => channel.id));
    } catch { /* committed membership removal remains authoritative */ }
    return { result: "LEFT", serverId };
  }

  async listForUser(userId: string) {
    const members = await this.prisma.client.member.findMany({
      where: { userId, isBanned: false },
      include: { server: true },
    });
    return Promise.all(members.map(async (member) => ({
      ...member.server,
      effectivePermissions: (await this.permissionService.getServerPermissions(member.serverId, userId)).toString(),
    })));
  }

  async getMembers(serverId: string) {
    return this.prisma.client.member.findMany({
      where: { serverId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        roles: {
          include: { role: true },
        },
      },
    });
  }

  async getMember(serverId: string, memberId: string) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        roles: { include: { role: true } },
      },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    return member;
  }

  async updateMember(serverId: string, memberId: string, userId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.client.member.findUnique({ where: { id: memberId } });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    if (member.userId !== userId) {
      await this.permissionService.assertCanManageMember(
        serverId,
        userId,
        member.userId,
        PERMISSIONS.MANAGE_ROLES,
      );
    }
    const updated = await this.prisma.client.member.update({
      where: { id: memberId },
      data: { nickname: dto.nickname ?? member.nickname },
    });
    return updated;
  }

  async removeMember(serverId: string, memberId: string, userId: string) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: { server: true },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    if (member.userId === userId) {
      await this.leaveServer(serverId, userId);
      return;
    }
    if (member.server.ownerId === member.userId) throw new ForbiddenException({ error: { code: "OWNER_CANNOT_LEAVE", message: "The owner cannot leave the server" } });

    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.KICK_MEMBERS,
    );
    await this.auditLog.record({ serverId, actorId: userId, action: "KICK", targetId: member.userId });
    // Remove socket-specific viewer subscriptions before membership is revoked.
    try {
      const removedViewers = await this.voiceService.removeScreenShareViewersForUser(member.userId);
      for (const subscription of removedViewers) this.wsGateway.emitScreenViewerLeft(subscription);
    } catch { /* */ }
    // Remove all screen shares owned by this user (admin cleanup by userId)
    try {
      const removedShares = await this.voiceService.removeScreenSharesForUser(member.userId);
      for (const s of removedShares) {
        this.wsGateway.emitToVoiceChannel(s.channelId, "screen:share-stopped", {
          shareId: s.shareId, channelId: s.channelId, presenterId: s.presenterUserId,
        });
      }
    } catch { /* */ }
    // Delete member FIRST so backend list queries immediately exclude this server
    await this.prisma.client.member.delete({ where: { id: memberId } });
    // Emit after deletion confirms user receives the notification via user room
    this.wsGateway.emitToUser(member.userId, "server:kicked", { serverId });
    // Evict user from all server/channel/voice WS rooms
    await this.wsGateway.evictUserFromServer(member.userId, serverId);
    // Disconnect from voice (best-effort cleanup on server side)
    try { await this.voiceService.handleDisconnect(member.userId); } catch { /* */ }
    this.wsGateway.emitToServer(serverId, "member:removed", { memberId, userId: member.userId });
  }

  async banMember(serverId: string, memberId: string, userId: string) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: { server: true },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.BAN_MEMBERS,
    );
    await this.prisma.client.member.update({
      where: { id: memberId },
      data: { isBanned: true },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "BAN", targetId: member.userId });
    // Remove socket-specific viewer subscriptions before membership is revoked.
    try {
      const removedViewers = await this.voiceService.removeScreenShareViewersForUser(member.userId);
      for (const subscription of removedViewers) this.wsGateway.emitScreenViewerLeft(subscription);
    } catch { /* */ }
    // Remove all screen shares owned by this user (admin cleanup by userId)
    try {
      const removedShares = await this.voiceService.removeScreenSharesForUser(member.userId);
      for (const s of removedShares) {
        this.wsGateway.emitToVoiceChannel(s.channelId, "screen:share-stopped", {
          shareId: s.shareId, channelId: s.channelId, presenterId: s.presenterUserId,
        });
      }
    } catch { /* */ }
    // Emit before eviction so the user receives the notification via user room
    this.wsGateway.emitToUser(member.userId, "server:banned", { serverId });
    // Evict user from all server/channel/voice WS rooms
    await this.wsGateway.evictUserFromServer(member.userId, serverId);
    // Disconnect from voice (best-effort cleanup on server side)
    try { await this.voiceService.handleDisconnect(member.userId); } catch { /* */ }
    this.wsGateway.emitToServer(serverId, "member:removed", { memberId, userId: member.userId });
  }

  async unbanMember(serverId: string, memberId: string, userId: string) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: { server: true },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    if (!member.isBanned) throw new NotFoundException({
      error: { code: "NOT_BANNED", message: "Member is not banned" },
    });
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.BAN_MEMBERS);
    await this.prisma.client.member.update({
      where: { id: memberId },
      data: { isBanned: false },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "UNBAN", targetId: member.userId });
  }

  async muteMember(serverId: string, memberId: string, userId: string, until?: Date) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: { server: true },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.MUTE_MEMBERS,
    );
    await this.prisma.client.member.update({
      where: { id: memberId },
      data: { isMuted: true, mutedUntil: until || null },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "MUTE", targetId: member.userId, details: { until: until?.toISOString() } });
    // Update voice state if user is in a voice channel — do NOT disconnect, only mute
    try {
      const voiceState = await this.voiceService.getVoiceStateByUserId(member.userId);
      if (voiceState?.channelId) {
        await this.voiceService.updateMute(voiceState.channelId, member.userId, true);
        this.wsGateway.emitToVoiceChannel(voiceState.channelId, "voice:state-updated", {
          userId: member.userId, channelId: voiceState.channelId, isDeafened: voiceState.isDeafened, serverMuted: true,
        });
      }
    } catch { /* */ }
  }

  async unmuteMember(serverId: string, memberId: string, userId: string) {
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: { server: true },
    });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.MUTE_MEMBERS,
    );
    await this.prisma.client.member.update({
      where: { id: memberId },
      data: { isMuted: false, mutedUntil: null },
    });
    await this.auditLog.record({ serverId, actorId: userId, action: "UNMUTE", targetId: member.userId });
    try {
      const voiceState = await this.voiceService.getVoiceStateByUserId(member.userId);
      if (voiceState) {
        this.wsGateway.emitToVoiceChannel(voiceState.channelId, "voice:state-updated", {
          userId: member.userId, channelId: voiceState.channelId, isDeafened: voiceState.isDeafened, serverMuted: false,
        });
      }
    } catch { /* */ }
  }

  async getAuditLogs(serverId: string, userId: string) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_SERVER);
    const logs = await this.prisma.client.auditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Resolve actor and target display names
    const userIds = new Set<string>();
    for (const log of logs) {
      if (log.actorId) userIds.add(log.actorId);
      if (log.targetId) userIds.add(log.targetId);
    }
    if (userIds.size > 0) {
      const users = await this.prisma.client.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, username: true, displayName: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      return logs.map((log) => ({
        ...log,
        actor: log.actorId ? userMap.get(log.actorId) ?? null : null,
        target: log.targetId ? userMap.get(log.targetId) ?? null : null,
      }));
    }
    return logs.map((log) => ({ ...log, actor: null, target: null }));
  }

}
