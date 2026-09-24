import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { AuditLogService } from "../audit/audit.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { WsGateway } from "../ws/ws.gateway";

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly auditLog: AuditLogService,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
  ) {}

  async list(serverId: string) {
    return this.prisma.client.role.findMany({
      where: { serverId },
      orderBy: [{ position: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  }

  async create(serverId: string, userId: string, dto: CreateRoleDto) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_ROLES);
    const permissions = this.parsePermissions(dto.permissions);
    await this.permissionService.assertCanGrantPermissions(serverId, userId, permissions);

    const isOwner = await this.permissionService.isOwner(serverId, userId);
    let position: number;
    if (dto.position !== undefined) {
      position = dto.position;
    } else if (isOwner) {
      const maxPos = await this.prisma.client.role.aggregate({ where: { serverId }, _max: { position: true } });
      position = Math.max(1, (maxPos._max.position ?? 0) + 1);
    } else {
      const highestRole = await this.permissionService.getHighestRole(serverId, userId);
      position = Math.max(1, (highestRole?.position ?? 1) - 1);
    }
    this.assertCustomRolePosition(position);
    await this.permissionService.assertCanPlaceRole(serverId, userId, position);

    const role = await this.prisma.client.role.create({
      data: {
        serverId,
        name: dto.name,
        color: dto.color ?? 0,
        permissions,
        position,
        isDefault: false,
        isMentionable: false,
        isHoisted: dto.isHoisted ?? false,
      },
    });
    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_CREATE",
      targetId: role.id,
      details: {
        name: role.name,
        position: role.position,
        permissions: role.permissions.toString(),
        isHoisted: role.isHoisted,
      },
    });
    this.emitPermissionsChanged(serverId);
    return role;
  }

  async update(serverId: string, roleId: string, userId: string, dto: UpdateRoleDto) {
    const role = await this.getServerRole(serverId, roleId);
    await this.permissionService.assertCanManageRole(serverId, userId, roleId);

    if (role.isDefault && dto.name !== undefined && dto.name !== role.name) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "Cannot rename the @everyone role" } });
    }
    if (role.isDefault && dto.position !== undefined && dto.position !== 0) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "Cannot move the @everyone role" } });
    }
    if (role.isDefault && dto.isHoisted === true) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "@everyone cannot be displayed as a separate member group" } });
    }

    let permissions: bigint | undefined;
    if (dto.permissions !== undefined) {
      permissions = this.parsePermissions(dto.permissions);
      const addedPermissions = permissions & ~role.permissions;
      await this.permissionService.assertCanGrantPermissions(serverId, userId, addedPermissions);
    }

    if (dto.position !== undefined && dto.position !== role.position) {
      throw new BadRequestException({
        error: { code: "ROLE_REORDER_REQUIRED", message: "Role positions must be changed through the complete reorder endpoint" },
      });
    }

    const updated = await this.prisma.client.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(permissions !== undefined && { permissions }),
        ...(dto.isHoisted !== undefined && { isHoisted: role.isDefault ? false : dto.isHoisted }),
      },
    });
    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_UPDATE",
      targetId: roleId,
      details: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(permissions !== undefined && { permissions: permissions.toString() }),
        ...(dto.isHoisted !== undefined && { isHoisted: dto.isHoisted }),
      },
    });
    this.emitPermissionsChanged(serverId);
    return updated;
  }

  async reorder(serverId: string, userId: string, roleIds: string[]) {
    await this.permissionService.assertHasPermission(serverId, userId, PERMISSIONS.MANAGE_ROLES);

    const roles = await this.prisma.client.role.findMany({
      where: { serverId },
      orderBy: [{ position: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const everyone = roles.find((role) => role.isDefault);
    const customRoles = roles.filter((role) => !role.isDefault);
    const customIds = new Set(customRoles.map((role) => role.id));

    if (
      roleIds.length !== customRoles.length ||
      new Set(roleIds).size !== roleIds.length ||
      roleIds.some((roleId) => !customIds.has(roleId))
    ) {
      throw new BadRequestException({
        error: { code: "INVALID_ROLE_ORDER", message: "Role order must contain every custom server role exactly once" },
      });
    }

    const isOwner = await this.permissionService.isOwner(serverId, userId);
    if (!isOwner) {
      const highestRole = await this.permissionService.getHighestRole(serverId, userId);
      if (!highestRole) {
        throw new ForbiddenException({ error: { code: "ROLE_HIERARCHY", message: "No manageable role hierarchy" } });
      }

      // Equal/higher roles are protected at their current visual indices. This
      // lets a manager reorder the lower segment without moving their ceiling.
      customRoles.forEach((role, index) => {
        if (role.position >= highestRole.position && roleIds[index] !== role.id) {
          throw new ForbiddenException({
            error: { code: "ROLE_HIERARCHY", message: "Cannot reorder an equal or higher role" },
          });
        }
      });
    }

    await this.prisma.client.$transaction([
      ...roleIds.map((roleId, index) => this.prisma.client.role.update({
        where: { id: roleId },
        data: { position: roleIds.length - index },
      })),
      ...(everyone ? [this.prisma.client.role.update({ where: { id: everyone.id }, data: { position: 0, isHoisted: false } })] : []),
    ]);

    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_REORDER",
      details: { roleIds },
    });
    this.emitPermissionsChanged(serverId);
    return this.list(serverId);
  }

  async delete(serverId: string, roleId: string, userId: string) {
    const role = await this.getServerRole(serverId, roleId);
    if (role.isDefault) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "Cannot delete the @everyone role" } });
    }
    await this.permissionService.assertCanManageRole(serverId, userId, roleId);

    await this.prisma.client.role.delete({ where: { id: roleId } });
    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_DELETE",
      targetId: roleId,
      details: { name: role.name },
    });
    this.emitPermissionsChanged(serverId);
  }

  async assignToMember(serverId: string, memberId: string, roleId: string, userId: string) {
    const [role, member] = await Promise.all([
      this.getServerRole(serverId, roleId),
      this.getServerMember(serverId, memberId),
    ]);
    if (role.isDefault) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "Cannot assign the @everyone role" } });
    }

    await this.permissionService.assertCanManageRole(serverId, userId, roleId);
    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.MANAGE_ROLES,
    );
    // Assignment is itself a grant and must not bypass the actor's authority.
    await this.permissionService.assertCanGrantPermissions(serverId, userId, role.permissions);

    const existing = await this.prisma.client.memberRole.findUnique({
      where: { memberId_roleId: { memberId, roleId } },
    });
    if (existing) return;

    await this.prisma.client.memberRole.create({ data: { memberId, roleId } });
    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_ASSIGN",
      targetId: member.userId,
      details: { roleName: role.name },
    });
    this.emitPermissionsChanged(serverId);
  }

  async removeFromMember(serverId: string, memberId: string, roleId: string, userId: string) {
    const [role, member] = await Promise.all([
      this.getServerRole(serverId, roleId),
      this.getServerMember(serverId, memberId),
    ]);
    if (role.isDefault) {
      throw new BadRequestException({ error: { code: "DEFAULT_ROLE", message: "Cannot remove the @everyone role" } });
    }

    await this.permissionService.assertCanManageRole(serverId, userId, roleId);
    await this.permissionService.assertCanManageMember(
      serverId,
      userId,
      member.userId,
      PERMISSIONS.MANAGE_ROLES,
    );

    const removed = await this.prisma.client.memberRole.deleteMany({ where: { memberId, roleId } });
    if (removed.count === 0) return;
    await this.auditLog.record({
      serverId,
      actorId: userId,
      action: "ROLE_REMOVE",
      targetId: member.userId,
      details: { roleName: role.name },
    });
    this.emitPermissionsChanged(serverId);
  }

  private async getServerRole(serverId: string, roleId: string) {
    const role = await this.prisma.client.role.findUnique({ where: { id: roleId } });
    if (!role || role.serverId !== serverId) throw new NotFoundException();
    return role;
  }

  private async getServerMember(serverId: string, memberId: string) {
    const member = await this.prisma.client.member.findUnique({ where: { id: memberId } });
    if (!member || member.serverId !== serverId) throw new NotFoundException();
    return member;
  }

  private parsePermissions(value: string | undefined): bigint {
    if (value === undefined) return 0n;
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException({ error: { code: "INVALID_PERMISSIONS", message: "Permissions must be an integer bitset" } });
    }
  }

  private assertCustomRolePosition(position: number): void {
    if (position < 1) {
      throw new BadRequestException({
        error: { code: "INVALID_ROLE_POSITION", message: "Custom roles must be positioned above @everyone" },
      });
    }
  }

  private emitPermissionsChanged(serverId: string): void {
    void this.wsGateway.emitServerPermissionsChanged(serverId);
  }
}
