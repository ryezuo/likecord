import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, ValidationPipe,
} from "@nestjs/common";
import { Request } from "express";
import { MessageService } from "./message.service";
import { CreateMessageDto, UpdateMessageDto } from "./dto/message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get("channels/:channelId/messages")
  async list(
    @Param("channelId") channelId: string,
    @Req() req: Request,
    @Query("before") before?: string,
    @Query("limit") limit?: string,
  ) {
    const user = req.user as { id: string };
    return this.messageService.list(channelId, user.id, { before, limit: limit ? parseInt(limit, 10) : 50 });
  }

  @Post("channels/:channelId/messages")
  async create(
    @Param("channelId") channelId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: CreateMessageDto,
  ) {
    const user = req.user as { id: string };
    return this.messageService.create(channelId, user.id, dto);
  }

  @Patch("messages/:messageId")
  async update(
    @Param("messageId") messageId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateMessageDto,
  ) {
    const user = req.user as { id: string };
    return this.messageService.update(messageId, user.id, dto);
  }

  @Delete("messages/:messageId")
  async delete(
    @Param("messageId") messageId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.messageService.delete(messageId, user.id);
  }
}
