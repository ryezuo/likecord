import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { CleanupService } from "./cleanup.service";
import { AttachmentDownloadCacheMiddleware } from "./attachment-download-cache.middleware";

@Module({
  controllers: [UploadController],
  providers: [UploadService, CleanupService],
  exports: [UploadService, CleanupService],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AttachmentDownloadCacheMiddleware)
      .forRoutes({ path: "attachments/:attachmentId/download", method: RequestMethod.GET });
  }
}
