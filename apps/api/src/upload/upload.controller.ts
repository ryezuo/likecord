import {
  Controller, Post, Get, Param, Body, Req, Res, UseGuards, ValidationPipe,
} from "@nestjs/common";
import { Request, Response } from "express";
import { UploadService } from "./upload.service";
import { PrepareUploadDto } from "./dto/upload.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StorageService } from "../storage/storage.service";
import * as path from "path";

@Controller()
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly storage: StorageService,
  ) {}

  @Post("channels/:channelId/attachments/prepare")
  async prepare(
    @Param("channelId") channelId: string,
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) dto: PrepareUploadDto,
  ) {
    const user = req.user as { id: string };
    return this.uploadService.prepare(channelId, user.id, dto);
  }

  @Post("attachments/:attachmentId/upload")
  async upload(@Param("attachmentId") attachmentId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await this.uploadService.uploadFile(attachmentId, user.id, buffer);
          resolve(result);
        } catch (e) { reject(e); }
      });
      req.on("error", reject);
    });
  }

  @Post("attachments/:attachmentId/complete")
  async complete(@Param("attachmentId") attachmentId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.uploadService.complete(attachmentId, user.id);
  }

  @Get("attachments/:attachmentId/download")
  async download(@Param("attachmentId") attachmentId: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string };
    const { attachment, redirectUrl } = await this.uploadService.getDownloadInfo(attachmentId, user.id);

    if (redirectUrl) {
      return res.redirect(302, redirectUrl);
    }

    const file = await this.storage.download(attachment.s3Key);
    if (!file) {
      res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File not found" } });
      return;
    }
    const safeName = path.basename(attachment.fileName);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Content-Length", file.buffer.length);
    res.end(file.buffer);
  }
}
