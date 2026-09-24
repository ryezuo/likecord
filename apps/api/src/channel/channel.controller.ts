import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Req, UseGuards, ValidationPipe,
} from "@nestjs/common";
import { Request } from "express";
import { ChannelService } from "./channel.service";
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpsertPermissionOverwriteDto,
} from "./dto/channel.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ServerAccessGuard } from "../server/guards/server-access.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get("servers/:serverId/channels")
  @UseGuards(ServerAccessGuard)
  async listChannels(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.channelService.listChannels(serverId, user.id);
  }

  @Get("channels/:channelId")
  async getChannel(@Param("channelId") channelId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.channelService.getChannel(channelId, user.id);
  }

  @Post("servers/:serverId/channels")
  @UseGuards(ServerAccessGuard)
  async createChannel(@Param("serverId") serverId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CreateChannelDto) {
    const user = req.user as { id: string };
    return this.channelService.createChannel(serverId, user.id, dto);
  }

  @Patch("channels/:channelId")
  async updateChannel(@Param("channelId") channelId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateChannelDto) {
    const user = req.user as { id: string };
    return this.channelService.updateChannel(channelId, user.id, dto);
  }

  @Delete("channels/:channelId")
  async deleteChannel(@Param("channelId") channelId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.channelService.deleteChannel(channelId, user.id);
    return { success: true };
  }

  @Get("servers/:serverId/categories")
  @UseGuards(ServerAccessGuard)
  async listCategories(@Param("serverId") serverId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.channelService.listCategories(serverId, user.id);
  }

  @Post("servers/:serverId/categories")
  @UseGuards(ServerAccessGuard)
  async createCategory(@Param("serverId") serverId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CreateCategoryDto) {
    const user = req.user as { id: string };
    return this.channelService.createCategory(serverId, user.id, dto);
  }

  @Patch("categories/:categoryId")
  async updateCategory(@Param("categoryId") categoryId: string, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateCategoryDto) {
    const user = req.user as { id: string };
    return this.channelService.updateCategory(categoryId, user.id, dto);
  }

  @Delete("categories/:categoryId")
  async deleteCategory(@Param("categoryId") categoryId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    await this.channelService.deleteCategory(categoryId, user.id);
    return { success: true };
  }

  @Get("channels/:channelId/permissions")
  getChannelPermissions(@Param("channelId") channelId: string, @Req() req: Request) {
    return this.channelService.getChannelPermissionConfiguration(channelId, (req.user as { id: string }).id);
  }

  @Post("channels/:channelId/permissions/sync")
  syncChannelPermissions(@Param("channelId") channelId: string, @Req() req: Request) {
    return this.channelService.syncChannelPermissions(channelId, (req.user as { id: string }).id);
  }

  @Post("channels/:channelId/permissions/unsync")
  unsyncChannelPermissions(@Param("channelId") channelId: string, @Req() req: Request) {
    return this.channelService.unsyncChannelPermissions(channelId, (req.user as { id: string }).id);
  }

  @Put("channels/:channelId/permissions/:targetType/:targetId")
  upsertChannelOverwrite(
    @Param("channelId") channelId: string,
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpsertPermissionOverwriteDto,
  ) {
    return this.channelService.upsertChannelOverwrite(channelId, (req.user as { id: string }).id, targetType, targetId, dto);
  }

  @Delete("channels/:channelId/permissions/:targetType/:targetId")
  async deleteChannelOverwrite(
    @Param("channelId") channelId: string,
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Req() req: Request,
  ) {
    await this.channelService.deleteChannelOverwrite(channelId, (req.user as { id: string }).id, targetType, targetId);
    return { success: true };
  }

  @Get("categories/:categoryId/permissions")
  getCategoryPermissions(@Param("categoryId") categoryId: string, @Req() req: Request) {
    return this.channelService.getCategoryPermissionConfiguration(categoryId, (req.user as { id: string }).id);
  }

  @Put("categories/:categoryId/permissions/:targetType/:targetId")
  upsertCategoryOverwrite(
    @Param("categoryId") categoryId: string,
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpsertPermissionOverwriteDto,
  ) {
    return this.channelService.upsertCategoryOverwrite(categoryId, (req.user as { id: string }).id, targetType, targetId, dto);
  }

  @Delete("categories/:categoryId/permissions/:targetType/:targetId")
  async deleteCategoryOverwrite(
    @Param("categoryId") categoryId: string,
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Req() req: Request,
  ) {
    await this.channelService.deleteCategoryOverwrite(categoryId, (req.user as { id: string }).id, targetType, targetId);
    return { success: true };
  }
}
