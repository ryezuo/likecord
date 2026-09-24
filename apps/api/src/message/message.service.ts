import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { CreateMessageDto, UpdateMessageDto } from "./dto/message.dto";
import { WsGateway } from "../ws/ws.gateway";
import { UploadService } from "../upload/upload.service";
import { MessageLinkPreviewService } from "../link-preview/message-link-preview.service";

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly wsGateway: WsGateway,
    private readonly uploadService: UploadService,
    private readonly messageLinkPreview?: MessageLinkPreviewService,
  ) {}

  async list(channelId: string, userId: string, query: { before?: string; limit?: number }) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });
    if (channel.type !== "TEXT") throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });

    const member = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!member || member.isBanned) throw new ForbiddenException({ error: { code: "NOT_MEMBER", message: "Not a member of this server" } });

    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.READ_MESSAGE_HISTORY);

    const limit = Math.min(Math.max(1, query.limit || 50), 50);
    const messages = await this.prisma.client.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(query.before ? { id: { lt: query.before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });

    const ordered = messages.reverse();
    const previews = this.messageLinkPreview
      ? await this.messageLinkPreview.cachedForMessages(channel.serverId, ordered)
      : new Map();
    return ordered.map((msg) => this.serialize(msg, previews.get(msg.id)));
  }

  async create(channelId: string, userId: string, dto: CreateMessageDto) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });
    if (channel.type !== "TEXT") throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });

    const member = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!member || member.isBanned) throw new ForbiddenException({ error: { code: "NOT_MEMBER", message: "Not a member" } });

    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.SEND_MESSAGES);

    const hasAttachments = dto.attachmentIds && dto.attachmentIds.length > 0;
    const hasContent = !!dto.content;
    if (!hasContent && !hasAttachments) {
      throw new BadRequestException({ error: { code: "EMPTY_MESSAGE", message: "Message must have content or attachments" } });
    }

    if (hasAttachments) {
      await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.ATTACH_FILES);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[MessageService] attachmentIds:`, dto.attachmentIds);
      }
      const atts = await this.prisma.client.attachment.findMany({
        where: { id: { in: dto.attachmentIds } },
      });
      if (atts.length !== dto.attachmentIds!.length) {
        throw new BadRequestException({ error: { code: "ATTACHMENT_NOT_FOUND", message: "One or more attachments not found" } });
      }
      if (process.env.NODE_ENV !== "production") {
        console.log(`[MessageService] Found ${atts.length} attachments`);
      }
      for (const att of atts) {
        if (att.messageId) throw new BadRequestException({ error: { code: "ATTACHMENT_LINKED", message: `Attachment ${att.id} already linked` } });
        if (!att.processed) throw new BadRequestException({ error: { code: "ATTACHMENT_NOT_READY", message: "Attachment not completed" } });
        if (!att.s3Key.startsWith(userId + "/") && !att.s3Key.startsWith("attachments/" + userId + "/")) {
          throw new ForbiddenException({ error: { code: "ATTACHMENT_NOT_OWNED", message: "Attachment does not belong to you" } });
        }
      }
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.client.message.findUnique({
        where: { channelId_idempotencyKey: { channelId, idempotencyKey: dto.idempotencyKey } },
      });
      if (existing) return { message: this.serialize(existing), cached: true };
    }

    const message = await this.prisma.client.message.create({
      data: {
        channelId,
        authorId: userId,
        content: dto.content ?? "",
        idempotencyKey: dto.idempotencyKey || null,
        ...(hasAttachments ? {
          attachments: {
            connect: dto.attachmentIds!.map((id) => ({ id })),
          },
        } : {}),
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });

    const serialized = this.serialize(message);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[MessageService] Created message ${message.id} with ${serialized.attachments?.length || 0} attachments`);
    }

    this.wsGateway.emitToChannel(channelId, "message:created", { message: serialized });
    this.messageLinkPreview?.schedule({
      id: message.id,
      channelId,
      serverId: channel.serverId,
      accountId: userId,
      content: message.content,
    });

    return { message: serialized, cached: false };
  }

  async update(messageId: string, userId: string, dto: UpdateMessageDto) {
    const msg = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: { channel: { select: { serverId: true } } },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException({ error: { code: "MESSAGE_NOT_FOUND", message: "Message not found" } });
    if (msg.authorId !== userId) throw new ForbiddenException({ error: { code: "NOT_AUTHOR", message: "Only the author can edit" } });
    await this.permissionService.assertHasChannelPermission(msg.channelId, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(msg.channelId, userId, PERMISSIONS.SEND_MESSAGES);

    const updated = await this.prisma.client.message.update({
      where: { id: messageId },
      data: { content: dto.content, editedAt: new Date() },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    const serialized = this.serialize(updated);
    this.wsGateway.emitToChannel(updated.channelId, "message:updated", { message: serialized });
    this.messageLinkPreview?.schedule({
      id: updated.id,
      channelId: updated.channelId,
      serverId: msg.channel.serverId,
      accountId: userId,
      content: updated.content,
    });

    return { message: serialized };
  }

  async delete(messageId: string, userId: string) {
    const msg = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, authorId: true, deletedAt: true },
    });
    if (!msg) throw new NotFoundException({ error: { code: "MESSAGE_NOT_FOUND", message: "Message not found" } });

    await this.permissionService.assertHasChannelPermission(msg.channelId, userId, PERMISSIONS.VIEW_CHANNEL);

    if (msg.authorId !== userId) {
      await this.permissionService.assertHasChannelPermission(msg.channelId, userId, PERMISSIONS.MANAGE_MESSAGES);
    }

    const transitioned = msg.deletedAt
      ? false
      : await this.prisma.client.$transaction(async (tx) => {
          const result = await tx.message.updateMany({
            where: { id: messageId, deletedAt: null },
            data: { deletedAt: new Date(), content: "" },
          });
          return result.count === 1;
        });

    const response = { messageId, channelId: msg.channelId };
    if (transitioned) {
      this.wsGateway.emitToChannel(msg.channelId, "message:deleted", response);
    }

    // Cleanup is deliberately after both the committed Message transition and
    // its realtime notification. Failures leave Attachment rows as retry handles.
    await this.uploadService.deleteMessageAttachments(messageId);

    return response;
  }

  private serialize(msg: any, linkPreview?: unknown) {
    const attachments = msg.attachments?.length
      ? msg.attachments.map((a: any) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        }))
      : undefined;

    return {
      id: msg.id,
      channelId: msg.channelId,
      authorId: msg.authorId,
      content: msg.content,
      editedAt: msg.editedAt?.toISOString?.() ?? msg.editedAt ?? null,
      createdAt: msg.createdAt.toISOString ? msg.createdAt.toISOString() : msg.createdAt,
      author: msg.author || undefined,
      attachments,
      ...(linkPreview ? { linkPreview } : {}),
    };
  }
}
