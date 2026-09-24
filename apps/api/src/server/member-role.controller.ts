import { Controller, Put, Delete, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { RoleService } from "../role/role.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServerAccessGuard } from "../server/guards/server-access.guard";

@Controller("servers/:serverId/members/:memberId/roles")
@UseGuards(JwtAuthGuard, ServerAccessGuard)
export class MemberRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Put(":roleId")
  async assignRole(
    @Param("serverId") serverId: string,
    @Param("memberId") memberId: string,
    @Param("roleId") roleId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    await this.roleService.assignToMember(serverId, memberId, roleId, user.id);
    return { success: true };
  }

  @Delete(":roleId")
  async removeRole(
    @Param("serverId") serverId: string,
    @Param("memberId") memberId: string,
    @Param("roleId") roleId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    await this.roleService.removeFromMember(serverId, memberId, roleId, user.id);
    return { success: true };
  }
}
