import {
  Controller, Get, Post, Delete, Body, Param, Req, UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from "@nestjs/common";
import { Request } from "express";
import { InviteService } from "./invite.service";
import { CreateInviteDto } from "./dto/invite.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/guards/public.decorator";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post("servers/:serverId/invites")
  async create(@Param("serverId") serverId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CreateInviteDto) {
    const user = req.user as { id: string };
    return this.inviteService.create(serverId, user.id, dto);
  }

  @Post("servers/:serverId/invites/ensure")
  @HttpCode(HttpStatus.OK)
  async ensure(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.inviteService.ensureDefault(serverId, user.id);
  }

  @Get("servers/:serverId/invites")
  async list(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.inviteService.list(serverId, user.id);
  }

  @Delete("servers/:serverId/invites/:inviteId")
  async revoke(@Param("serverId") serverId: string, @Param("inviteId") inviteId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.inviteService.revoke(serverId, inviteId, user.id);
    return { success: true };
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get("invites/:code/validate")
  async validate(@Param("code") code: string, @Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    return this.inviteService.validate(code, user?.id);
  }

  @Post("invites/:code/accept")
  @HttpCode(HttpStatus.OK)
  async accept(@Param("code") code: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.inviteService.accept(code, user.id);
  }
}
