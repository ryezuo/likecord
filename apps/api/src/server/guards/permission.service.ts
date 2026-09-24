import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export const PERMISSIONS = {
  ADMINISTRATOR: 1n << 0n,
  MANAGE_SERVER: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  KICK_MEMBERS: 1n << 4n,
  BAN_MEMBERS: 1n << 5n,
  CREATE_INVITE: 1n << 6n,
  SEND_MESSAGES: 1n << 7n,
  MANAGE_MESSAGES: 1n << 8n,
  ATTACH_FILES: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  CONNECT: 1n << 11n,
  SPEAK: 1n << 12n,
  MUTE_MEMBERS: 1n << 13n,
  DEAFEN_MEMBERS: 1n << 14n,
  MOVE_MEMBERS: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  STREAM: 1n << 17n,
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export const ALL_SERVER_PERMISSIONS = Object.values(PERMISSIONS).reduce(
  (combined, permission) => combined | permission,
  0n,
);

/**
 * Permissions whose behavior is enforced against a concrete Channel. Server
 * administration, membership moderation, and invite creation remain server
 * scoped and cannot be introduced through an overwrite.
 */
export const CHANNEL_OVERRIDE_PERMISSION_MASK =
  PERMISSIONS.MANAGE_CHANNELS |
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.MANAGE_MESSAGES |
  PERMISSIONS.ATTACH_FILES |
  PERMISSIONS.VIEW_CHANNEL |
  PERMISSIONS.CONNECT |
  PERMISSIONS.SPEAK |
  PERMISSIONS.READ_MESSAGE_HISTORY |
  PERMISSIONS.STREAM;

export const DEFAULT_EVERYONE_PERMISSIONS =
  PERMISSIONS.CREATE_INVITE |
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.ATTACH_FILES |
  PERMISSIONS.VIEW_CHANNEL |
  PERMISSIONS.READ_MESSAGE_HISTORY |
  PERMISSIONS.CONNECT |
  PERMISSIONS.SPEAK |
  PERMISSIONS.STREAM;

export interface ServerPermissionSnapshot {
  serverId: string;
  userId: string;
  isOwner: boolean;
  isMember: boolean;
  isActiveMember: boolean;
  isAdministrator: boolean;
  permissions: bigint;
}

export interface HierarchyRole {
  id: string;
  serverId: string;
  name: string;
  position: number;
  permissions: bigint;
  isDefault: boolean;
  createdAt: Date;
}

export interface ChannelPermissionSnapshot {
  channelId: string;
  serverId: string;
  userId: string;
  overwriteSource: "CHANNEL" | "CATEGORY";
  overwriteSourceId: string;
  permissionsSynced: boolean;
  permissions: bigint;
}

interface PermissionOverwriteRecord {
  roleId: string | null;
  memberId: string | null;
  allow: bigint;
  deny: bigint;
}

const permissionError = () => new ForbiddenException({
  error: { code: "MISSING_PERMISSION", message: "You do not have permission to perform this action" },
});

const hierarchyError = (message: string) => new ForbiddenException({
  error: { code: "ROLE_HIERARCHY", message },
});

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async isOwner(serverId: string, userId: string): Promise<boolean> {
    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });
    return server?.ownerId === userId;
  }

  async canAccessServer(serverId: string, userId: string): Promise<boolean> {
    const snapshot = await this.getServerPermissionSnapshot(serverId, userId);
    return snapshot.isOwner || snapshot.isActiveMember;
  }

  /** Canonical server-level permission calculation. Channel overwrites layer on this in F.3.5B. */
  async getServerPermissions(serverId: string, userId: string): Promise<bigint> {
    return (await this.getServerPermissionSnapshot(serverId, userId)).permissions;
  }

  /** Backward-compatible name retained for current callers. */
  async getEffectivePermissions(serverId: string, userId: string): Promise<bigint> {
    return this.getServerPermissions(serverId, userId);
  }

  async getServerPermissionSnapshot(serverId: string, userId: string): Promise<ServerPermissionSnapshot> {
    const [server, member] = await Promise.all([
      this.prisma.client.server.findUnique({
        where: { id: serverId },
        select: {
          ownerId: true,
          roles: {
            where: { isDefault: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 1,
            select: { permissions: true },
          },
        },
      }),
      this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId } },
        select: {
          isBanned: true,
          roles: {
            select: {
              role: { select: { serverId: true, permissions: true } },
            },
          },
        },
      }),
    ]);

    const isOwner = server?.ownerId === userId;
    const isMember = !!member;
    const isActiveMember = !!member && !member.isBanned;

    if (!server) {
      return { serverId, userId, isOwner: false, isMember, isActiveMember: false, isAdministrator: false, permissions: 0n };
    }

    // Ownership is authoritative and never depends on a MemberRole row.
    if (isOwner) {
      return { serverId, userId, isOwner: true, isMember, isActiveMember, isAdministrator: true, permissions: ALL_SERVER_PERMISSIONS };
    }

    if (!isActiveMember) {
      return { serverId, userId, isOwner: false, isMember, isActiveMember: false, isAdministrator: false, permissions: 0n };
    }

    let permissions = server.roles[0]?.permissions ?? 0n;
    for (const membership of member.roles) {
      // The join table cannot express same-server integrity, so enforce isolation here.
      if (membership.role.serverId === serverId) permissions |= membership.role.permissions;
    }
    permissions &= ALL_SERVER_PERMISSIONS;

    const isAdministrator = (permissions & PERMISSIONS.ADMINISTRATOR) !== 0n;
    if (isAdministrator) permissions = ALL_SERVER_PERMISSIONS;

    return { serverId, userId, isOwner: false, isMember, isActiveMember: true, isAdministrator, permissions };
  }

  async hasServerPermission(serverId: string, userId: string, permission: bigint): Promise<boolean> {
    if (permission <= 0n || (permission & ~ALL_SERVER_PERMISSIONS) !== 0n) return false;
    const permissions = await this.getServerPermissions(serverId, userId);
    return (permissions & permission) === permission;
  }

  /** Backward-compatible name retained for current guards/services. */
  async hasPermission(serverId: string, userId: string, permission: bigint): Promise<boolean> {
    return this.hasServerPermission(serverId, userId, permission);
  }

  /**
   * Canonical Channel/Category resolution order:
   * server base -> owner/Administrator bypass -> @everyone overwrite ->
   * aggregated explicitly-assigned Role overwrites -> Member overwrite.
   * A synced Channel reads only Category overwrites; an unsynced Channel reads
   * only Channel-local overwrites.
   */
  async getChannelPermissionSnapshot(channelId: string, userId: string): Promise<ChannelPermissionSnapshot | null> {
    const channel = await this.prisma.client.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        serverId: true,
        categoryId: true,
        permissionsSynced: true,
        permissionOverwrites: {
          select: { roleId: true, memberId: true, allow: true, deny: true },
        },
        category: {
          select: {
            id: true,
            permissionOverwrites: {
              select: { roleId: true, memberId: true, allow: true, deny: true },
            },
          },
        },
      },
    });
    if (!channel) return null;

    const serverSnapshot = await this.getServerPermissionSnapshot(channel.serverId, userId);
    const categoryIsSource = channel.permissionsSynced && !!channel.category;
    const sourceId = categoryIsSource ? channel.category!.id : channel.id;
    if (!serverSnapshot.isOwner && !serverSnapshot.isActiveMember) {
      return {
        channelId,
        serverId: channel.serverId,
        userId,
        overwriteSource: categoryIsSource ? "CATEGORY" : "CHANNEL",
        overwriteSourceId: sourceId,
        permissionsSynced: categoryIsSource,
        permissions: 0n,
      };
    }

    if (serverSnapshot.isOwner || serverSnapshot.isAdministrator) {
      return {
        channelId,
        serverId: channel.serverId,
        userId,
        overwriteSource: categoryIsSource ? "CATEGORY" : "CHANNEL",
        overwriteSourceId: sourceId,
        permissionsSynced: categoryIsSource,
        permissions: ALL_SERVER_PERMISSIONS,
      };
    }

    const [member, everyone] = await Promise.all([
      this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
        select: {
          id: true,
          roles: {
            select: {
              role: { select: { id: true, serverId: true, isDefault: true } },
            },
          },
        },
      }),
      this.prisma.client.role.findFirst({
        where: { serverId: channel.serverId, isDefault: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      }),
    ]);

    if (!member) return null;
    const overwrites: PermissionOverwriteRecord[] = categoryIsSource
      ? channel.category!.permissionOverwrites
      : channel.permissionOverwrites;

    let permissions = serverSnapshot.permissions & ALL_SERVER_PERMISSIONS;
    if (everyone) {
      const everyoneOverwrite = overwrites.find((overwrite) => overwrite.roleId === everyone.id);
      if (everyoneOverwrite) permissions = this.applyOverwrite(permissions, everyoneOverwrite);
    }

    const explicitRoleIds = new Set(member.roles
      .map((assignment) => assignment.role)
      .filter((role) => role.serverId === channel.serverId && !role.isDefault)
      .map((role) => role.id));
    let roleDeny = 0n;
    let roleAllow = 0n;
    for (const overwrite of overwrites) {
      if (!overwrite.roleId || !explicitRoleIds.has(overwrite.roleId)) continue;
      roleDeny |= overwrite.deny & CHANNEL_OVERRIDE_PERMISSION_MASK;
      roleAllow |= overwrite.allow & CHANNEL_OVERRIDE_PERMISSION_MASK;
    }
    permissions &= ~roleDeny;
    permissions |= roleAllow;

    const memberOverwrite = overwrites.find((overwrite) => overwrite.memberId === member.id);
    if (memberOverwrite) permissions = this.applyOverwrite(permissions, memberOverwrite);

    return {
      channelId,
      serverId: channel.serverId,
      userId,
      overwriteSource: categoryIsSource ? "CATEGORY" : "CHANNEL",
      overwriteSourceId: sourceId,
      permissionsSynced: categoryIsSource,
      permissions: permissions & ALL_SERVER_PERMISSIONS,
    };
  }

  async getChannelPermissions(channelId: string, userId: string): Promise<bigint> {
    return (await this.getChannelPermissionSnapshot(channelId, userId))?.permissions ?? 0n;
  }

  async hasChannelPermission(channelId: string, userId: string, permission: bigint): Promise<boolean> {
    if (permission <= 0n || (permission & ~ALL_SERVER_PERMISSIONS) !== 0n) return false;
    const permissions = await this.getChannelPermissions(channelId, userId);
    return (permissions & permission) === permission;
  }

  async assertHasChannelPermission(channelId: string, userId: string, permission: bigint): Promise<void> {
    if (!await this.hasChannelPermission(channelId, userId, permission)) throw permissionError();
  }

  async canManageChannel(channelId: string, userId: string): Promise<boolean> {
    return this.hasChannelPermission(
      channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS,
    );
  }

  async assertCanManageChannel(channelId: string, userId: string): Promise<void> {
    if (!await this.canManageChannel(channelId, userId)) throw permissionError();
  }

  async canAdministerChannelPermissions(channelId: string, userId: string): Promise<boolean> {
    const channel = await this.prisma.client.channel.findUnique({
      where: { id: channelId },
      select: { serverId: true },
    });
    if (!channel) return false;
    const [canManageRoles, canView] = await Promise.all([
      this.hasServerPermission(channel.serverId, userId, PERMISSIONS.MANAGE_ROLES),
      this.hasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL),
    ]);
    return canManageRoles && canView;
  }

  async assertCanAdministerChannelPermissions(channelId: string, userId: string): Promise<void> {
    if (!await this.canAdministerChannelPermissions(channelId, userId)) throw permissionError();
  }

  async getOverwriteSource(channelId: string): Promise<{
    type: "CHANNEL" | "CATEGORY";
    id: string;
    permissionsSynced: boolean;
  } | null> {
    const channel = await this.prisma.client.channel.findUnique({
      where: { id: channelId },
      select: { id: true, categoryId: true, permissionsSynced: true },
    });
    if (!channel) return null;
    if (channel.permissionsSynced && channel.categoryId) {
      return { type: "CATEGORY", id: channel.categoryId, permissionsSynced: true };
    }
    return { type: "CHANNEL", id: channel.id, permissionsSynced: false };
  }

  assertValidChannelOverwriteMasks(allow: bigint, deny: bigint): void {
    if (allow < 0n || deny < 0n || ((allow | deny) & ~CHANNEL_OVERRIDE_PERMISSION_MASK) !== 0n) {
      throw new BadRequestException({
        error: { code: "UNSUPPORTED_CHANNEL_PERMISSION_BITS", message: "Overwrite contains unsupported Channel permission bits" },
      });
    }
    if ((allow & deny) !== 0n) {
      throw new BadRequestException({
        error: { code: "OVERLAPPING_PERMISSION_BITS", message: "Overwrite allow and deny masks must not overlap" },
      });
    }
  }

  async getHighestRole(serverId: string, userId: string): Promise<HierarchyRole | null> {
    return this.getHighestRoleForUser(serverId, userId, false);
  }

  async getHighestRolePosition(serverId: string, userId: string): Promise<number> {
    return (await this.getHighestRole(serverId, userId))?.position ?? -1;
  }

  async canManageRole(serverId: string, actorId: string, targetRoleId: string): Promise<boolean> {
    if (!await this.hasServerPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES)) return false;
    if (await this.isOwner(serverId, actorId)) return true;

    const [actorRole, targetRole] = await Promise.all([
      this.getHighestRole(serverId, actorId),
      this.prisma.client.role.findUnique({ where: { id: targetRoleId }, select: { serverId: true, position: true } }),
    ]);
    if (!actorRole || !targetRole || targetRole.serverId !== serverId) return false;

    // Equal positions remain protected; deterministic tie-breaking is only for highest-role selection.
    return actorRole.position > targetRole.position;
  }

  async assertCanManageRole(serverId: string, actorId: string, targetRoleId: string): Promise<void> {
    await this.assertHasPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES);
    if (!await this.canManageRole(serverId, actorId, targetRoleId)) {
      throw hierarchyError("Cannot manage a role with an equal or higher position");
    }
  }

  async assertCanPlaceRole(serverId: string, actorId: string, position: number): Promise<void> {
    await this.assertHasPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES);
    if (await this.isOwner(serverId, actorId)) return;
    const highestRole = await this.getHighestRole(serverId, actorId);
    if (!highestRole || position >= highestRole.position) {
      throw hierarchyError("Cannot place a role at or above your highest role");
    }
  }

  async assertCanGrantPermissions(serverId: string, actorId: string, permissions: bigint): Promise<void> {
    this.assertKnownPermissionBits(permissions);
    await this.assertHasPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES);
    if (await this.isOwner(serverId, actorId)) return;

    const actorPermissions = await this.getServerPermissions(serverId, actorId);
    if ((permissions & ~actorPermissions) !== 0n) {
      throw new ForbiddenException({
        error: { code: "PERMISSION_ESCALATION", message: "Cannot grant permissions you do not have" },
      });
    }
  }

  async canManageMember(
    serverId: string,
    actorId: string,
    targetUserId: string,
    permission: bigint,
  ): Promise<boolean> {
    if (!await this.hasServerPermission(serverId, actorId, permission)) return false;

    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });
    if (!server) return false;
    // The real owner may manage their own ordinary role memberships. Intrinsic
    // ownership remains Server.ownerId and cannot be granted or removed here.
    if (targetUserId === server.ownerId) {
      return actorId === server.ownerId && permission === PERMISSIONS.MANAGE_ROLES;
    }
    if (actorId === server.ownerId) return true;
    if (actorId === targetUserId) return false;

    const [actorRole, targetRole] = await Promise.all([
      this.getHighestRoleForUser(serverId, actorId, false),
      this.getHighestRoleForUser(serverId, targetUserId, true),
    ]);
    if (!actorRole || !targetRole) return false;
    return actorRole.position > targetRole.position;
  }

  async assertCanManageMember(
    serverId: string,
    actorId: string,
    targetUserId: string,
    permission: bigint,
  ): Promise<void> {
    await this.assertHasPermission(serverId, actorId, permission);

    const server = await this.prisma.client.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });
    if (!server) throw new NotFoundException({ error: { code: "SERVER_NOT_FOUND", message: "Server not found" } });
    const ownerManagingOwnRoles =
      targetUserId === server.ownerId &&
      actorId === server.ownerId &&
      permission === PERMISSIONS.MANAGE_ROLES;
    if (targetUserId === server.ownerId && !ownerManagingOwnRoles) {
      throw new ForbiddenException({ error: { code: "OWNER_PROTECTED", message: "The server owner cannot be administratively affected" } });
    }
    if (!await this.canManageMember(serverId, actorId, targetUserId, permission)) {
      throw hierarchyError("Cannot manage yourself or a member with an equal or higher highest role");
    }
  }

  async assertHasPermission(serverId: string, userId: string, permission: bigint): Promise<void> {
    if (!await this.hasServerPermission(serverId, userId, permission)) throw permissionError();
  }

  async assertIsOwnerOrHasPermission(serverId: string, userId: string, permission: bigint): Promise<void> {
    await this.assertHasPermission(serverId, userId, permission);
  }

  private assertKnownPermissionBits(permissions: bigint): void {
    if (permissions < 0n || (permissions & ~ALL_SERVER_PERMISSIONS) !== 0n) {
      throw new BadRequestException({
        error: { code: "UNKNOWN_PERMISSION_BITS", message: "Permissions contain unsupported bits" },
      });
    }
  }

  private applyOverwrite(permissions: bigint, overwrite: PermissionOverwriteRecord): bigint {
    const deny = overwrite.deny & CHANNEL_OVERRIDE_PERMISSION_MASK;
    // Storage rejects overlaps. Clearing denied bits defensively here keeps a
    // corrupt record fail-closed instead of converting overlap into an ALLOW.
    const allow = (overwrite.allow & CHANNEL_OVERRIDE_PERMISSION_MASK) & ~deny;
    return (permissions & ~deny) | allow;
  }

  private async getHighestRoleForUser(
    serverId: string,
    userId: string,
    includeBanned: boolean,
  ): Promise<HierarchyRole | null> {
    const [member, everyone] = await Promise.all([
      this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId } },
        select: {
          isBanned: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  serverId: true,
                  name: true,
                  position: true,
                  permissions: true,
                  isDefault: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.client.role.findFirst({
        where: { serverId, isDefault: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          serverId: true,
          name: true,
          position: true,
          permissions: true,
          isDefault: true,
          createdAt: true,
        },
      }),
    ]);

    if (!member || (!includeBanned && member.isBanned)) return null;

    const roles = member.roles
      .map((membership) => membership.role)
      .filter((role) => role.serverId === serverId && !role.isDefault);
    if (everyone) roles.push(everyone);

    roles.sort((left, right) => {
      if (left.position !== right.position) return right.position - left.position;
      const created = left.createdAt.getTime() - right.createdAt.getTime();
      if (created !== 0) return created;
      return left.id.localeCompare(right.id);
    });
    return roles[0] ?? null;
  }
}
