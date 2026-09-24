import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { AuditLogService } from "../audit/audit.service";
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpsertPermissionOverwriteDto,
} from "./dto/channel.dto";
import { WsGateway } from "../ws/ws.gateway";

type StoredOverwrite = {
  roleId: string | null;
  memberId: string | null;
  allow: bigint;
  deny: bigint;
};

type ValidatedOverwriteTarget =
  | { type: "ROLE"; id: string }
  | { type: "MEMBER"; id: string; userId: string };

const channelNotFound = () => new NotFoundException({
  error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" },
});

const categoryNotFound = () => new NotFoundException({
  error: { code: "CATEGORY_NOT_FOUND", message: "Category not found" },
});

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLog: AuditLogService,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
  ) {}

  async listChannels(serverId: string, userId: string) {
    if (!await this.permissionService.canAccessServer(serverId, userId)) throw channelNotFound();
    const candidates = await this.prisma.client.channel.findMany({
      where: { serverId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const resolved = await Promise.all(candidates.map(async (channel) => ({
      channel,
      permissions: await this.permissionService.getChannelPermissions(channel.id, userId),
    })));
    return resolved
      .filter(({ permissions }) => (permissions & PERMISSIONS.VIEW_CHANNEL) !== 0n)
      .map(({ channel, permissions }) => ({ ...channel, effectivePermissions: permissions }));
  }

  async getChannel(channelId: string, userId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    const permissions = await this.permissionService.getChannelPermissions(channelId, userId);
    if ((permissions & PERMISSIONS.VIEW_CHANNEL) === 0n) throw channelNotFound();
    return { ...channel, effectivePermissions: permissions };
  }

  async createChannel(serverId: string, userId: string, dto: CreateChannelDto) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_CHANNELS);
    const name = dto.name.toLowerCase().replace(/\s+/g, "-");
    const existing = await this.prisma.client.channel.findUnique({
      where: { serverId_name: { serverId, name } },
    });
    if (existing) throw new BadRequestException({ error: { code: "CHANNEL_EXISTS", message: "Channel name already exists in this server" } });
    if (dto.categoryId) await this.getServerCategory(serverId, dto.categoryId);
    const privateTargets = dto.isPrivate
      ? await this.validatePrivateChannelTargets(
          serverId,
          userId,
          dto.allowedRoleIds ?? [],
          dto.allowedMemberIds ?? [],
        )
      : null;
    const maxPos = await this.prisma.client.channel.aggregate({ where: { serverId }, _max: { position: true } });
    const channelData = {
      serverId,
      name,
      type: dto.type || "TEXT",
      categoryId: dto.categoryId || null,
      // A private categorized Channel owns a local overwrite source, so it is
      // deliberately UNSYNCED from its Category from the first committed row.
      permissionsSynced: dto.isPrivate ? false : !!dto.categoryId,
      position: dto.position ?? (maxPos._max.position ?? -1) + 1,
    };
    const channel = privateTargets
      ? await this.prisma.client.$transaction(async (tx) => {
          const created = await tx.channel.create({ data: channelData });
          await tx.channelPermissionOverwrite.createMany({
            data: [
              {
                channelId: created.id,
                roleId: privateTargets.everyoneRoleId,
                memberId: null,
                allow: 0n,
                deny: PERMISSIONS.VIEW_CHANNEL,
              },
              ...privateTargets.roleIds.map((roleId) => ({
                channelId: created.id,
                roleId,
                memberId: null,
                allow: PERMISSIONS.VIEW_CHANNEL,
                deny: 0n,
              })),
              ...privateTargets.memberIds.map((memberId) => ({
                channelId: created.id,
                roleId: null,
                memberId,
                allow: PERMISSIONS.VIEW_CHANNEL,
                deny: 0n,
              })),
            ],
          });
          await tx.auditLog.create({
            data: {
              serverId,
              actorId: userId,
              action: "CHANNEL_CREATE",
              targetId: created.id,
              details: {
                name,
                type: created.type,
                categoryId: created.categoryId,
                permissionsSynced: created.permissionsSynced,
                private: true,
              },
            },
          });
          return created;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      : await this.prisma.client.channel.create({ data: channelData });
    this.wsGateway.emitChannelLifecycleChange(serverId);
    if (!privateTargets) {
      await this.auditLog.record({ serverId, actorId: userId, action: "CHANNEL_CREATE", targetId: channel.id, details: { name, type: channel.type, categoryId: channel.categoryId, permissionsSynced: channel.permissionsSynced, private: false } });
    }
    return channel;
  }

  async updateChannel(channelId: string, userId: string, dto: UpdateChannelDto) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanManageChannel(channelId, userId);
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.getServerCategory(channel.serverId, dto.categoryId);
    }

    const movingFromSyncedCategory =
      dto.categoryId !== undefined &&
      dto.categoryId !== channel.categoryId &&
      channel.permissionsSynced &&
      !!channel.categoryId;
    const changingSyncedPermissionSource = movingFromSyncedCategory && dto.categoryId !== null;
    if (changingSyncedPermissionSource) {
      await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    }
    const updated = await this.prisma.client.$transaction(async (tx) => {
      if (movingFromSyncedCategory && dto.categoryId === null) {
        const inherited = await tx.categoryPermissionOverwrite.findMany({ where: { categoryId: channel.categoryId! } });
        await tx.channelPermissionOverwrite.deleteMany({ where: { channelId } });
        if (inherited.length > 0) {
          await tx.channelPermissionOverwrite.createMany({
            data: inherited.map((overwrite) => ({
              channelId,
              roleId: overwrite.roleId,
              memberId: overwrite.memberId,
              allow: overwrite.allow,
              deny: overwrite.deny,
            })),
          });
        }
      }
      if (changingSyncedPermissionSource) {
        const [currentSource, nextSource] = await Promise.all([
          tx.categoryPermissionOverwrite.findMany({ where: { categoryId: channel.categoryId! } }),
          tx.categoryPermissionOverwrite.findMany({ where: { categoryId: dto.categoryId! } }),
        ]);
        await this.assertCanApplyOverwriteSourceTransition(channel.serverId, userId, currentSource, nextSource);
      }
      return tx.channel.update({
        where: { id: channelId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.toLowerCase().replace(/\s+/g, "-") }),
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId,
            // Moving between Categories retains the prior sync mode. Removing
            // a Category necessarily creates an independent overwrite source.
            permissionsSynced: dto.categoryId === null ? false : channel.permissionsSynced,
          }),
          ...(dto.position !== undefined && { position: dto.position }),
          ...(dto.topic !== undefined && { topic: dto.topic }),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.wsGateway.emitChannelLifecycleChange(channel.serverId);
    if (changingSyncedPermissionSource) {
      await this.wsGateway.reconcileChannelPermissions(channel.serverId, [channelId]);
    }
    await this.auditLog.record({ serverId: channel.serverId, actorId: userId, action: "CHANNEL_UPDATE", targetId: channelId, details: { ...dto } });
    return updated;
  }

  async deleteChannel(channelId: string, userId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanManageChannel(channelId, userId);
    await this.wsGateway.evictChannelParticipants(channel.serverId, channelId);
    await this.prisma.client.channel.delete({ where: { id: channelId } });
    this.wsGateway.emitChannelLifecycleChange(channel.serverId);
    await this.auditLog.record({ serverId: channel.serverId, actorId: userId, action: "CHANNEL_DELETE", targetId: channelId, details: { name: channel.name } });
  }

  async listCategories(serverId: string, userId: string) {
    if (!await this.permissionService.canAccessServer(serverId, userId)) throw categoryNotFound();
    const serverSnapshot = await this.permissionService.getServerPermissionSnapshot(serverId, userId);
    const isStructureOrPermissionAdministrator =
      serverSnapshot.isOwner ||
      serverSnapshot.isAdministrator ||
      (serverSnapshot.permissions & PERMISSIONS.MANAGE_CHANNELS) !== 0n ||
      (serverSnapshot.permissions & PERMISSIONS.MANAGE_ROLES) !== 0n;
    if (isStructureOrPermissionAdministrator) {
      return this.prisma.client.channelCategory.findMany({
        where: { serverId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });
    }
    const visibleChannels = await this.listChannels(serverId, userId);
    const visibleCategoryIds = [...new Set(visibleChannels
      .map((channel) => channel.categoryId)
      .filter((id): id is string => !!id))];
    if (visibleCategoryIds.length === 0) return [];
    return this.prisma.client.channelCategory.findMany({
      where: { serverId, id: { in: visibleCategoryIds } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  }

  async createCategory(serverId: string, userId: string, dto: CreateCategoryDto) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_CHANNELS);
    const maxPos = await this.prisma.client.channelCategory.aggregate({ where: { serverId }, _max: { position: true } });
    const category = await this.prisma.client.channelCategory.create({
      data: { serverId, name: dto.name, position: dto.position ?? (maxPos._max.position ?? -1) + 1 },
    });
    this.wsGateway.emitChannelLifecycleChange(serverId);
    await this.auditLog.record({ serverId, actorId: userId, action: "CATEGORY_CREATE", targetId: category.id, details: { name: category.name } });
    return category;
  }

  async updateCategory(categoryId: string, userId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw categoryNotFound();
    await this.permissionService.assertHasPermission(category.serverId, userId, PERMISSIONS.MANAGE_CHANNELS);
    const updated = await this.prisma.client.channelCategory.update({
      where: { id: categoryId },
      data: { ...(dto.name !== undefined && { name: dto.name }), ...(dto.position !== undefined && { position: dto.position }) },
    });
    this.wsGateway.emitChannelLifecycleChange(category.serverId);
    await this.auditLog.record({ serverId: category.serverId, actorId: userId, action: "CATEGORY_UPDATE", targetId: categoryId, details: { ...dto } });
    return updated;
  }

  async deleteCategory(categoryId: string, userId: string) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw categoryNotFound();
    await this.permissionService.assertHasPermission(category.serverId, userId, PERMISSIONS.MANAGE_CHANNELS);

    const deleted = await this.prisma.client.$transaction(async (tx) => {
      const current = await tx.channelCategory.findUnique({
        where: { id: categoryId },
        include: {
          permissionOverwrites: true,
          channels: { select: { id: true, permissionsSynced: true } },
        },
      });
      if (!current) throw categoryNotFound();
      const syncedChannelIds = current.channels.filter((channel) => channel.permissionsSynced).map((channel) => channel.id);
      if (syncedChannelIds.length > 0) {
        await tx.channelPermissionOverwrite.deleteMany({ where: { channelId: { in: syncedChannelIds } } });
        const copied = syncedChannelIds.flatMap((channelId) => current.permissionOverwrites.map((overwrite) => ({
          channelId,
          roleId: overwrite.roleId,
          memberId: overwrite.memberId,
          allow: overwrite.allow,
          deny: overwrite.deny,
        })));
        if (copied.length > 0) await tx.channelPermissionOverwrite.createMany({ data: copied });
      }
      await tx.channel.updateMany({
        where: { categoryId },
        data: { categoryId: null, permissionsSynced: false },
      });
      await tx.channelCategory.delete({ where: { id: categoryId } });
      return { name: current.name };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.wsGateway.emitChannelLifecycleChange(category.serverId);
    await this.auditLog.record({ serverId: category.serverId, actorId: userId, action: "CATEGORY_DELETE", targetId: categoryId, details: { name: deleted.name } });
  }

  async getChannelPermissionConfiguration(channelId: string, userId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    return this.readChannelPermissionConfiguration(channel);
  }

  private async readChannelPermissionConfiguration(channel: { id: string; categoryId: string | null }) {
    const channelId = channel.id;
    const source = await this.permissionService.getOverwriteSource(channelId);
    const overwrites = source?.type === "CATEGORY"
      ? await this.prisma.client.categoryPermissionOverwrite.findMany({ where: { categoryId: source.id }, orderBy: { id: "asc" } })
      : await this.prisma.client.channelPermissionOverwrite.findMany({ where: { channelId }, orderBy: { id: "asc" } });
    return {
      channelId,
      categoryId: channel.categoryId,
      permissionsSynced: source?.permissionsSynced ?? false,
      overwriteSource: source,
      overwrites: overwrites.map((overwrite) => this.serializeOverwrite(overwrite)),
    };
  }

  async getCategoryPermissionConfiguration(categoryId: string, userId: string) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw categoryNotFound();
    await this.permissionService.assertHasPermission(category.serverId, userId, PERMISSIONS.MANAGE_ROLES);
    const overwrites = await this.prisma.client.categoryPermissionOverwrite.findMany({
      where: { categoryId },
      orderBy: { id: "asc" },
    });
    return { categoryId, overwrites: overwrites.map((overwrite) => this.serializeOverwrite(overwrite)) };
  }

  async upsertChannelOverwrite(channelId: string, userId: string, targetType: string, targetId: string, dto: UpsertPermissionOverwriteDto) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    if (channel.permissionsSynced) {
      throw new BadRequestException({ error: { code: "CHANNEL_PERMISSIONS_SYNCED", message: "Unsync the Channel before editing local overwrites" } });
    }
    const masks = this.parseMasks(dto);
    const target = await this.validateTarget(channel.serverId, targetType, targetId);
    await this.assertCanAdministerOverwriteTarget(channel.serverId, userId, target);
    const existing = await this.prisma.client.channelPermissionOverwrite.findFirst({
      where: { channelId, ...(target.type === "ROLE" ? { roleId: target.id } : { memberId: target.id }) },
    });
    await this.permissionService.assertCanGrantPermissions(
      channel.serverId,
      userId,
      this.potentiallyGrantedBits(existing, masks),
    );
    const overwrite = existing
      ? await this.prisma.client.channelPermissionOverwrite.update({ where: { id: existing.id }, data: masks })
      : await this.prisma.client.channelPermissionOverwrite.create({
          data: { channelId, roleId: target.type === "ROLE" ? target.id : null, memberId: target.type === "MEMBER" ? target.id : null, ...masks },
        });
    await this.afterPermissionMutation(channel.serverId, [channelId], userId, "CHANNEL_OVERWRITE_SET", overwrite.id);
    return this.serializeOverwrite(overwrite);
  }

  async deleteChannelOverwrite(channelId: string, userId: string, targetType: string, targetId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    if (channel.permissionsSynced) {
      throw new BadRequestException({ error: { code: "CHANNEL_PERMISSIONS_SYNCED", message: "Synced Channels do not have local overwrites" } });
    }
    const target = await this.validateTarget(channel.serverId, targetType, targetId);
    await this.assertCanAdministerOverwriteTarget(channel.serverId, userId, target);
    const existing = await this.prisma.client.channelPermissionOverwrite.findFirst({
      where: { channelId, ...(target.type === "ROLE" ? { roleId: target.id } : { memberId: target.id }) },
    });
    if (!existing) return;
    await this.permissionService.assertCanGrantPermissions(channel.serverId, userId, existing.deny);
    await this.prisma.client.channelPermissionOverwrite.delete({ where: { id: existing.id } });
    await this.afterPermissionMutation(channel.serverId, [channelId], userId, "CHANNEL_OVERWRITE_DELETE", target.id);
  }

  async upsertCategoryOverwrite(categoryId: string, userId: string, targetType: string, targetId: string, dto: UpsertPermissionOverwriteDto) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw categoryNotFound();
    await this.permissionService.assertHasPermission(category.serverId, userId, PERMISSIONS.MANAGE_ROLES);
    const masks = this.parseMasks(dto);
    const target = await this.validateTarget(category.serverId, targetType, targetId);
    await this.assertCanAdministerOverwriteTarget(category.serverId, userId, target);
    const existing = await this.prisma.client.categoryPermissionOverwrite.findFirst({
      where: { categoryId, ...(target.type === "ROLE" ? { roleId: target.id } : { memberId: target.id }) },
    });
    await this.permissionService.assertCanGrantPermissions(
      category.serverId,
      userId,
      this.potentiallyGrantedBits(existing, masks),
    );
    const overwrite = existing
      ? await this.prisma.client.categoryPermissionOverwrite.update({ where: { id: existing.id }, data: masks })
      : await this.prisma.client.categoryPermissionOverwrite.create({
          data: { categoryId, roleId: target.type === "ROLE" ? target.id : null, memberId: target.type === "MEMBER" ? target.id : null, ...masks },
        });
    const affected = await this.syncedCategoryChannelIds(categoryId);
    await this.afterPermissionMutation(category.serverId, affected, userId, "CATEGORY_OVERWRITE_SET", overwrite.id);
    return this.serializeOverwrite(overwrite);
  }

  async deleteCategoryOverwrite(categoryId: string, userId: string, targetType: string, targetId: string) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw categoryNotFound();
    await this.permissionService.assertHasPermission(category.serverId, userId, PERMISSIONS.MANAGE_ROLES);
    const target = await this.validateTarget(category.serverId, targetType, targetId);
    await this.assertCanAdministerOverwriteTarget(category.serverId, userId, target);
    const existing = await this.prisma.client.categoryPermissionOverwrite.findFirst({
      where: { categoryId, ...(target.type === "ROLE" ? { roleId: target.id } : { memberId: target.id }) },
    });
    if (!existing) return;
    await this.permissionService.assertCanGrantPermissions(category.serverId, userId, existing.deny);
    await this.prisma.client.categoryPermissionOverwrite.delete({ where: { id: existing.id } });
    const affected = await this.syncedCategoryChannelIds(categoryId);
    await this.afterPermissionMutation(category.serverId, affected, userId, "CATEGORY_OVERWRITE_DELETE", target.id);
  }

  async syncChannelPermissions(channelId: string, userId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    if (!channel.categoryId) {
      throw new BadRequestException({ error: { code: "CHANNEL_HAS_NO_CATEGORY", message: "An uncategorized Channel cannot be permission-synced" } });
    }
    if (channel.permissionsSynced) return this.readChannelPermissionConfiguration(channel);
    await this.prisma.client.$transaction(async (tx) => {
      const [currentSource, nextSource] = await Promise.all([
        tx.channelPermissionOverwrite.findMany({ where: { channelId } }),
        tx.categoryPermissionOverwrite.findMany({ where: { categoryId: channel.categoryId! } }),
      ]);
      await this.assertCanApplyOverwriteSourceTransition(channel.serverId, userId, currentSource, nextSource);
      await tx.channelPermissionOverwrite.deleteMany({ where: { channelId } });
      await tx.channel.update({ where: { id: channelId }, data: { permissionsSynced: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.afterPermissionMutation(channel.serverId, [channelId], userId, "CHANNEL_PERMISSIONS_SYNC", channelId);
    return this.readChannelPermissionConfiguration({ id: channelId, categoryId: channel.categoryId });
  }

  async unsyncChannelPermissions(channelId: string, userId: string) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw channelNotFound();
    await this.permissionService.assertCanAdministerChannelPermissions(channelId, userId);
    if (!channel.categoryId) {
      throw new BadRequestException({ error: { code: "CHANNEL_HAS_NO_CATEGORY", message: "Uncategorized Channels are already independent" } });
    }
    if (!channel.permissionsSynced) return this.readChannelPermissionConfiguration(channel);
    await this.prisma.client.$transaction(async (tx) => {
      const inherited = await tx.categoryPermissionOverwrite.findMany({ where: { categoryId: channel.categoryId! } });
      await tx.channelPermissionOverwrite.deleteMany({ where: { channelId } });
      if (inherited.length > 0) {
        await tx.channelPermissionOverwrite.createMany({
          data: inherited.map((overwrite) => ({ channelId, roleId: overwrite.roleId, memberId: overwrite.memberId, allow: overwrite.allow, deny: overwrite.deny })),
        });
      }
      await tx.channel.update({ where: { id: channelId }, data: { permissionsSynced: false } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.afterPermissionMutation(channel.serverId, [channelId], userId, "CHANNEL_PERMISSIONS_UNSYNC", channelId);
    return this.readChannelPermissionConfiguration({ id: channelId, categoryId: channel.categoryId });
  }

  private parseMasks(dto: UpsertPermissionOverwriteDto): { allow: bigint; deny: bigint } {
    let allow: bigint;
    let deny: bigint;
    try {
      allow = BigInt(dto.allow);
      deny = BigInt(dto.deny);
    } catch {
      throw new BadRequestException({ error: { code: "INVALID_PERMISSION_MASK", message: "Permission masks must be non-negative decimal integers" } });
    }
    this.permissionService.assertValidChannelOverwriteMasks(allow, deny);
    return { allow, deny };
  }

  private async validateTarget(serverId: string, targetType: string, targetId: string): Promise<ValidatedOverwriteTarget> {
    const normalized = targetType.toUpperCase();
    if (normalized !== "ROLE" && normalized !== "MEMBER") {
      throw new BadRequestException({ error: { code: "INVALID_OVERWRITE_TARGET", message: "Overwrite target must be ROLE or MEMBER" } });
    }
    if (normalized === "ROLE") {
      const role = await this.prisma.client.role.findUnique({ where: { id: targetId }, select: { serverId: true } });
      if (!role || role.serverId !== serverId) {
        throw new BadRequestException({ error: { code: "CROSS_SERVER_OVERWRITE_TARGET", message: "Role target must belong to the same server" } });
      }
    } else {
      const member = await this.prisma.client.member.findUnique({ where: { id: targetId }, select: { serverId: true, userId: true } });
      if (!member || member.serverId !== serverId) {
        throw new BadRequestException({ error: { code: "CROSS_SERVER_OVERWRITE_TARGET", message: "Member target must belong to the same server" } });
      }
      return { type: "MEMBER", id: targetId, userId: member.userId };
    }
    return { type: "ROLE", id: targetId };
  }

  private async validatePrivateChannelTargets(
    serverId: string,
    actorId: string,
    roleIds: string[],
    memberIds: string[],
  ): Promise<{ everyoneRoleId: string; roleIds: string[]; memberIds: string[] }> {
    await this.permissionService.assertHasPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES);
    await this.permissionService.assertCanGrantPermissions(serverId, actorId, PERMISSIONS.VIEW_CHANNEL);

    const everyone = await this.prisma.client.role.findFirst({
      where: { serverId, isDefault: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (!everyone) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE_MISSING", message: "The server default role is unavailable" } });
    }
    await this.permissionService.assertCanManageRole(serverId, actorId, everyone.id);

    if (roleIds.includes(everyone.id)) {
      throw new BadRequestException({
        error: { code: "INVALID_PRIVATE_CHANNEL_TARGET", message: "@everyone cannot be an explicit private Channel allow target" },
      });
    }

    for (const roleId of roleIds) {
      const target = await this.validateTarget(serverId, "ROLE", roleId);
      await this.assertCanAdministerOverwriteTarget(serverId, actorId, target);
    }
    for (const memberId of memberIds) {
      const target = await this.validateTarget(serverId, "MEMBER", memberId);
      await this.assertCanAdministerOverwriteTarget(serverId, actorId, target);
    }

    return { everyoneRoleId: everyone.id, roleIds, memberIds };
  }

  private async assertCanAdministerOverwriteTarget(
    serverId: string,
    actorId: string,
    target: ValidatedOverwriteTarget,
  ): Promise<void> {
    if (target.type === "ROLE") {
      await this.permissionService.assertCanManageRole(serverId, actorId, target.id);
      return;
    }
    await this.permissionService.assertCanManageMember(
      serverId,
      actorId,
      target.userId,
      PERMISSIONS.MANAGE_ROLES,
    );
  }

  private potentiallyGrantedBits(
    current: Pick<StoredOverwrite, "allow" | "deny"> | null,
    next: Pick<StoredOverwrite, "allow" | "deny">,
  ): bigint {
    const currentAllow = current?.allow ?? 0n;
    const currentDeny = current?.deny ?? 0n;
    return (next.allow & ~currentAllow) | (currentDeny & ~next.deny);
  }

  private overwriteTargetKey(overwrite: StoredOverwrite): string {
    return overwrite.roleId ? `ROLE:${overwrite.roleId}` : `MEMBER:${overwrite.memberId}`;
  }

  private async assertCanApplyOverwriteSourceTransition(
    serverId: string,
    actorId: string,
    currentSource: StoredOverwrite[],
    nextSource: StoredOverwrite[],
  ): Promise<void> {
    await this.permissionService.assertHasPermission(serverId, actorId, PERMISSIONS.MANAGE_ROLES);
    const currentByTarget = new Map(currentSource.map((overwrite) => [this.overwriteTargetKey(overwrite), overwrite]));
    const nextByTarget = new Map(nextSource.map((overwrite) => [this.overwriteTargetKey(overwrite), overwrite]));
    const targetKeys = new Set([...currentByTarget.keys(), ...nextByTarget.keys()]);
    let potentiallyGranted = 0n;

    for (const key of targetKeys) {
      const current = currentByTarget.get(key);
      const next = nextByTarget.get(key);
      const currentAllow = current?.allow ?? 0n;
      const currentDeny = current?.deny ?? 0n;
      const nextAllow = next?.allow ?? 0n;
      const nextDeny = next?.deny ?? 0n;
      if (currentAllow === nextAllow && currentDeny === nextDeny) continue;

      const targetRow = next ?? current!;
      const target = await this.validateTarget(
        serverId,
        targetRow.roleId ? "ROLE" : "MEMBER",
        targetRow.roleId ?? targetRow.memberId!,
      );
      await this.assertCanAdministerOverwriteTarget(serverId, actorId, target);
      potentiallyGranted |= (nextAllow & ~currentAllow) | (currentDeny & ~nextDeny);
    }

    await this.permissionService.assertCanGrantPermissions(serverId, actorId, potentiallyGranted);
  }

  private serializeOverwrite(overwrite: { id: string; roleId: string | null; memberId: string | null; allow: bigint; deny: bigint }) {
    return {
      id: overwrite.id,
      targetType: overwrite.roleId ? "ROLE" as const : "MEMBER" as const,
      targetId: overwrite.roleId ?? overwrite.memberId!,
      allow: overwrite.allow.toString(),
      deny: overwrite.deny.toString(),
    };
  }

  private async getServerCategory(serverId: string, categoryId: string) {
    const category = await this.prisma.client.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.serverId !== serverId) throw categoryNotFound();
    return category;
  }

  private async syncedCategoryChannelIds(categoryId: string): Promise<string[]> {
    const channels = await this.prisma.client.channel.findMany({
      where: { categoryId, permissionsSynced: true },
      select: { id: true },
    });
    return channels.map((channel) => channel.id);
  }

  private async afterPermissionMutation(serverId: string, channelIds: string[], actorId: string, action: string, targetId: string): Promise<void> {
    await this.auditLog.record({ serverId, actorId, action, targetId });
    await this.wsGateway.emitChannelPermissionsChanged(serverId, channelIds);
  }
}
