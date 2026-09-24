import { Injectable, BadRequestException, ForbiddenException, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import * as crypto from "crypto";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { StorageService } from "../storage/storage.service";

const logger = new Logger("UploadService");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/zip", "application/gzip",
  "application/json", "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 104857600; // 100 MB

const BROAD_MIME_MAP: Record<string, string> = {
  "image/jpeg": "image/",
  "image/png": "image/",
  "image/gif": "image/",
  "image/webp": "image/",
  "application/pdf": "application/pdf",
  "text/plain": "text/",
  "text/csv": "text/",
  "application/zip": "application/",
  "application/gzip": "application/",
  "application/json": "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "application/",
};

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly storage: StorageService,
  ) {}

  async prepare(channelId: string, userId: string, dto: { fileName: string; mimeType: string; fileSize: number }) {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });

    const member = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!member || member.isBanned) throw new ForbiddenException({ error: { code: "NOT_MEMBER", message: "Not a member" } });

    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.ATTACH_FILES);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.SEND_MESSAGES);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL);

    const ext = path.extname(dto.fileName).toLowerCase();
    const dangerous = [".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".vbs", ".sh", ".dll", ".wasm"];
    if (dangerous.includes(ext)) {
      throw new BadRequestException({ error: { code: "FILE_TYPE_REJECTED", message: "File type not allowed" } });
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      // Allow the upload but it will be validated at completion
    }

    if (dto.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException({ error: { code: "FILE_TOO_LARGE", message: "File exceeds 100 MB limit" } });
    }

    const key = this.storage.generateKey(userId, dto.fileName);
    const attachmentId = crypto.randomUUID();

    await this.prisma.client.attachment.create({
      data: {
        id: attachmentId,
        messageId: null,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        s3Key: key,
        processed: false,
      },
    });

    const providerName = this.storage.getProvider();

    if (providerName === "r2") {
      const uploadTtl = parseInt(process.env.R2_PRESIGNED_UPLOAD_TTL || "300", 10);
      const uploadUrl = await this.storage.createPresignedUploadUrl(key, dto.mimeType, uploadTtl);
      return {
        attachmentId,
        uploadUrl,
        key,
        expiresIn: uploadTtl,
      };
    }

    return {
      attachmentId,
      uploadUrl: `/api/v1/attachments/${attachmentId}/upload`,
      key,
      expiresIn: 3600,
    };
  }

  async complete(attachmentId: string, userId: string) {
    const attachment = await this.prisma.client.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException();
    if (!attachment.s3Key.startsWith(userId + "/") && !attachment.s3Key.startsWith("attachments/" + userId + "/")) {
      throw new ForbiddenException({ error: { code: "NOT_OWNER", message: "Attachment does not belong to you" } });
    }
    if (attachment.messageId) throw new BadRequestException({ error: { code: "ALREADY_LINKED", message: "Already linked to a message" } });

    const providerName = this.storage.getProvider();

    if (providerName === "r2") {
      // R2 mode: the browser PUT the object directly to R2 with the presigned URL from /prepare.
      // There is no server-side proxy upload, so "uploaded" is proven by a successful HEAD on
      // the exact key returned by /prepare — never by the attachment.processed DB flag.
      let head: { size: number; contentType: string } | null;
      try {
        head = await this.storage.headObject(attachment.s3Key);
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name ?? "UnknownError";
        logger.error(`[R2] complete headObject failed attachmentId=${attachmentId} key=${attachment.s3Key} error=${name}`);
        throw new InternalServerErrorException({ error: { code: "STORAGE_ERROR", message: "Storage backend error" } });
      }
      if (!head) {
        // Genuine not-found from R2: the object was never uploaded to the prepared key.
        throw new BadRequestException({ error: { code: "NOT_UPLOADED", message: "File has not been uploaded yet" } });
      }

      const declaredMime = attachment.mimeType;
      const actualMime = head.contentType;
      if (!this.isCompatibleMime(declaredMime, actualMime)) {
        await this.storage.delete(attachment.s3Key);
        throw new BadRequestException({
          error: { code: "MIME_MISMATCH", message: "Declared MIME type does not match stored file content-type" },
        });
      }

      // Magic-byte validation: read first 512 bytes and validate content
      let headerBytes: Buffer | null;
      try {
        headerBytes = await this.storage.downloadRange(attachment.s3Key, 0, 511);
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name ?? "UnknownError";
        logger.error(`[R2] complete range read failed attachmentId=${attachmentId} key=${attachment.s3Key} error=${name}`);
        throw new InternalServerErrorException({ error: { code: "STORAGE_ERROR", message: "Storage backend error" } });
      }
      if (!headerBytes) {
        // HEAD succeeded but the range read reports not-found: backend inconsistency.
        // This is a storage access failure — do NOT delete the object.
        logger.error(`[R2] complete range read returned not-found after successful HEAD attachmentId=${attachmentId} key=${attachment.s3Key}`);
        throw new InternalServerErrorException({ error: { code: "STORAGE_ERROR", message: "Storage backend error" } });
      }
      const { validateMagicBytes } = await import("./magic-bytes");
      if (!validateMagicBytes(headerBytes, declaredMime)) {
        // Actual content validation failure per application policy — delete the invalid object.
        await this.storage.delete(attachment.s3Key);
        throw new BadRequestException({
          error: { code: "MIME_MISMATCH", message: "Declared MIME type does not match file content" },
        });
      }

      await this.prisma.client.attachment.update({
        where: { id: attachmentId },
        data: { processed: true, fileSize: head.size },
      });

      return {
        id: attachmentId,
        fileName: attachment.fileName,
        fileSize: head.size,
        mimeType: attachment.mimeType,
      };
    }

    // Local storage: the /upload proxy endpoint must have stored the file first.
    if (!attachment.processed) throw new BadRequestException({ error: { code: "NOT_UPLOADED", message: "File has not been uploaded yet" } });

    // Local storage: verify full file exists
    const stored = await this.storage.download(attachment.s3Key);
    if (!stored) throw new BadRequestException({ error: { code: "STORAGE_MISSING", message: "Uploaded file not found in storage" } });

    return {
      id: attachmentId,
      fileName: attachment.fileName,
      fileSize: stored.buffer.length,
      mimeType: attachment.mimeType,
    };
  }

  async uploadFile(attachmentId: string, userId: string, buffer: Buffer) {
    const attachment = await this.prisma.client.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException();
    if (!attachment.s3Key.startsWith(userId + "/") && !attachment.s3Key.startsWith("attachments/" + userId + "/")) {
      throw new ForbiddenException({ error: { code: "NOT_OWNER", message: "Attachment does not belong to you" } });
    }

    // Magic-byte validation
    const { validateMagicBytes } = await import("./magic-bytes");
    if (!validateMagicBytes(buffer, attachment.mimeType)) {
      throw new BadRequestException({
        error: { code: "MIME_MISMATCH", message: "Declared MIME type does not match file content" },
      });
    }

    await this.storage.upload(attachment.s3Key, buffer, attachment.mimeType);
    await this.prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true, fileSize: buffer.length },
    });

    return { id: attachmentId, fileName: attachment.fileName, fileSize: buffer.length };
  }

  async getDownloadInfo(attachmentId: string, userId: string) {
    const attachment = await this.prisma.client.attachment.findUnique({
      where: { id: attachmentId },
      include: { message: { include: { channel: true } } },
    });
    if (!attachment || !attachment.processed) throw new NotFoundException();

    // Check membership
    const channel = attachment.message?.channel;
    if (!channel) throw new NotFoundException();

    const member = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!member || member.isBanned) throw new ForbiddenException();
    await this.permissionService.assertHasChannelPermission(channel.id, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(channel.id, userId, PERMISSIONS.READ_MESSAGE_HISTORY);

    // Deny if parent message is deleted
    if (attachment.message?.deletedAt) {
      throw new ForbiddenException({ error: { code: "MESSAGE_DELETED", message: "Parent message was deleted" } });
    }

    const providerName = this.storage.getProvider();

    if (providerName === "r2") {
      const downloadTtl = parseInt(process.env.R2_PRESIGNED_DOWNLOAD_TTL || "600", 10);
      const redirectUrl = await this.storage.createPresignedDownloadUrl(attachment.s3Key, downloadTtl);
      return { attachment, redirectUrl };
    }

    return { attachment, redirectUrl: null };
  }

  async deleteOrphaned(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphans = await this.prisma.client.attachment.findMany({
      where: { messageId: null, createdAt: { lt: cutoff } },
    });
    let count = 0;
    for (const o of orphans) {
      await this.storage.delete(o.s3Key);
      await this.prisma.client.attachment.delete({ where: { id: o.id } });
      count++;
    }
    return count;
  }

  async deleteExpired(): Promise<number> {
    const deletedMessageAttachments = await this.prisma.client.attachment.findMany({
      where: {
        message: { deletedAt: { not: null } },
      },
    });
    return this.deleteAttachmentObjects(deletedMessageAttachments);
  }

  async deleteMessageAttachments(messageId: string): Promise<number> {
    const attachments = await this.prisma.client.attachment.findMany({
      where: { messageId },
    });
    return this.deleteAttachmentObjects(attachments);
  }

  private async deleteAttachmentObjects(attachments: Array<{ id: string; messageId: string | null; s3Key: string }>): Promise<number> {
    let count = 0;
    for (const attachment of attachments) {
      try {
        await this.storage.delete(attachment.s3Key);
        const removed = await this.prisma.client.attachment.deleteMany({
          where: { id: attachment.id, messageId: attachment.messageId },
        });
        count += removed.count;
      } catch (error: unknown) {
        const name = (error as { name?: string })?.name ?? "UnknownError";
        logger.error(
          `[Cleanup] attachment delete failed attachmentId=${attachment.id} key=${attachment.s3Key} error=${name}`,
        );
      }
    }
    return count;
  }

  private isCompatibleMime(declared: string, actual: string): boolean {
    if (!actual) return true;
    if (declared === actual) return true;
    const broad = BROAD_MIME_MAP[declared];
    if (broad) {
      return actual.startsWith(broad);
    }
    return true;
  }
}
