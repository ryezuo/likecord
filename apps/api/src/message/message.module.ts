import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { UploadModule } from "../upload/upload.module";
import { LinkPreviewModule } from "../link-preview/link-preview.module";

@Module({
  imports: [UploadModule, LinkPreviewModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
