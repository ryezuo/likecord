import { Body, Controller, Get, Header, Param, Put, Req, UseGuards, ValidationPipe } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NavigationService } from "./navigation.service";
import { UpdateLastTextChannelDto } from "./dto/navigation.dto";

@Controller("navigation")
@UseGuards(JwtAuthGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get("continue")
  @Header("Cache-Control", "private, no-store")
  resolveContinue(@Req() req: Request) {
    return this.navigationService.resolveContinue((req.user as { id: string }).id);
  }

  @Get("servers/:serverId")
  resolveServer(@Param("serverId") serverId: string, @Req() req: Request) {
    return this.navigationService.resolveServer(serverId, (req.user as { id: string }).id);
  }

  @Get("servers/:serverId/channels/:channelId")
  validateTextChannel(
    @Param("serverId") serverId: string,
    @Param("channelId") channelId: string,
    @Req() req: Request,
  ) {
    return this.navigationService.validateTextChannel(serverId, channelId, (req.user as { id: string }).id);
  }

  @Put("servers/:serverId/preference")
  setLastTextChannel(
    @Param("serverId") serverId: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateLastTextChannelDto,
    @Req() req: Request,
  ) {
    return this.navigationService.setLastTextChannel(serverId, dto.channelId, (req.user as { id: string }).id);
  }
}
