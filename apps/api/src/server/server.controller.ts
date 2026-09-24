import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, ValidationPipe, HttpCode,
} from "@nestjs/common";
import { Request } from "express";
import { ServerService } from "./server.service";
import { CreateServerDto, UpdateServerDto } from "./dto/server.dto";
import { UpdateMemberDto, MuteMemberDto } from "./dto/member.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServerAccessGuard } from "./guards/server-access.guard";
// import { RequiresPermission } from "./guards/requires-permission.decorator";

@Controller()
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Post("servers")
  async create(@Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CreateServerDto) {
    const user = req.user as { id: string };
    const server = await this.serverService.create(user.id, dto);
    return { id: server.id, name: server.name, ownerId: server.ownerId, description: server.description, createdAt: server.createdAt.toISOString() };
  }

  @Get("servers/:serverId")
  @UseGuards(ServerAccessGuard)
  async getById(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.serverService.getById(serverId, user.id);
  }

  @Patch("servers/:serverId")
  @UseGuards(ServerAccessGuard)
  async update(@Param("serverId") serverId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateServerDto) {
    const user = req.user as { id: string };
    return this.serverService.update(serverId, user.id, dto);
  }

  @Delete("servers/:serverId")
  @UseGuards(ServerAccessGuard)
  async delete(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.serverService.delete(serverId, user.id);
    return { success: true };
  }

  @Get("users/@me/servers")
  async listForUser(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.serverService.listForUser(user.id);
  }

  @Get("servers/:serverId/members")
  @UseGuards(ServerAccessGuard)
  async getMembers(@Param("serverId") serverId: string) {
    return this.serverService.getMembers(serverId);
  }

  @Delete("servers/:serverId/members/@me")
  async leaveServer(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.serverService.leaveServer(serverId, user.id);
  }

  @Get("servers/:serverId/members/:memberId")
  @UseGuards(ServerAccessGuard)
  async getMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string) {
    return this.serverService.getMember(serverId, memberId);
  }

  @Patch("servers/:serverId/members/:memberId")
  @UseGuards(ServerAccessGuard)
  async updateMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateMemberDto) {
    const user = req.user as { id: string };
    return this.serverService.updateMember(serverId, memberId, user.id, dto);
  }

  @Delete("servers/:serverId/members/:memberId")
  @UseGuards(ServerAccessGuard)
  async removeMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.serverService.removeMember(serverId, memberId, user.id);
    return { success: true };
  }

  @Post("servers/:serverId/members/:memberId/ban")
  @HttpCode(200)
  @UseGuards(ServerAccessGuard)
  async banMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.serverService.banMember(serverId, memberId, user.id);
    return { success: true };
  }

  @Post("servers/:serverId/members/:memberId/unban")
  @HttpCode(200)
  @UseGuards(ServerAccessGuard)
  async unbanMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.serverService.unbanMember(serverId, memberId, user.id);
    return { success: true };
  }

  @Post("servers/:serverId/members/:memberId/mute")
  @HttpCode(200)
  @UseGuards(ServerAccessGuard)
  async muteMember(
    @Param("serverId") serverId: string, @Param("memberId") memberId: string,
    @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: MuteMemberDto,
  ) {
    const user = req.user as { id: string };
    await this.serverService.muteMember(serverId, memberId, user.id, dto.until ? new Date(dto.until) : undefined);
    return { success: true };
  }

  @Post("servers/:serverId/members/:memberId/unmute")
  @HttpCode(200)
  @UseGuards(ServerAccessGuard)
  async unmuteMember(@Param("serverId") serverId: string, @Param("memberId") memberId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.serverService.unmuteMember(serverId, memberId, user.id);
    return { success: true };
  }

  @Get("servers/:serverId/audit-logs")
  @UseGuards(ServerAccessGuard)
  async getAuditLogs(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.serverService.getAuditLogs(serverId, user.id);
  }
}
