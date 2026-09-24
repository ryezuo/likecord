import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, ValidationPipe,
} from "@nestjs/common";
import { Request } from "express";
import { RoleService } from "./role.service";
import { CreateRoleDto, ReorderRolesDto, UpdateRoleDto } from "./dto/role.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServerAccessGuard } from "../server/guards/server-access.guard";

@Controller("servers/:serverId/roles")
@UseGuards(JwtAuthGuard, ServerAccessGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async list(@Param("serverId") serverId: string) {
    return this.roleService.list(serverId);
  }

  @Post()
  async create(@Param("serverId") serverId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CreateRoleDto) {
    const user = req.user as { id: string };
    return this.roleService.create(serverId, user.id, dto);
  }

  @Patch("order")
  async reorder(
    @Param("serverId") serverId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: ReorderRolesDto,
  ) {
    const user = req.user as { id: string };
    return this.roleService.reorder(serverId, user.id, dto.roleIds);
  }

  @Patch(":roleId")
  async update(@Param("serverId") serverId: string, @Param("roleId") roleId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateRoleDto) {
    const user = req.user as { id: string };
    return this.roleService.update(serverId, roleId, user.id, dto);
  }

  @Delete(":roleId")
  async delete(@Param("serverId") serverId: string, @Param("roleId") roleId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.roleService.delete(serverId, roleId, user.id);
    return { success: true };
  }
}
