import { Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { RedisService } from "../redis/redis.service";
import { LinkPreviewCache } from "./link-preview.cache";
import { LinkPreviewExecutor } from "./link-preview.executor";
import { LinkPreviewTransport } from "./link-preview.transport";
import { LinkPreviewService } from "./link-preview.service";
import { LinkPreviewProjectionService } from "./link-preview.projection";
import { MessageLinkPreviewService } from "./message-link-preview.service";

// MessageModule imports this in LP.2. Module construction is the fail-fast
// activation seam for the dedicated cache HMAC secret.
@Module({
  imports: [RedisModule],
  providers: [
    { provide: LinkPreviewCache, inject: [RedisService], useFactory: (redis: RedisService) =>
      new LinkPreviewCache(redis.getClient(), process.env.LINK_PREVIEW_CACHE_HMAC_SECRET || "") },
    { provide: LinkPreviewExecutor, useFactory: () => new LinkPreviewExecutor() },
    { provide: LinkPreviewTransport, useFactory: () => new LinkPreviewTransport() },
    { provide: LinkPreviewService, inject: [LinkPreviewCache, LinkPreviewExecutor, LinkPreviewTransport],
      useFactory: (cache: LinkPreviewCache, executor: LinkPreviewExecutor, transport: LinkPreviewTransport) =>
        new LinkPreviewService(cache, executor, transport) },
    LinkPreviewProjectionService,
    MessageLinkPreviewService,
  ],
  exports: [MessageLinkPreviewService],
})
export class LinkPreviewModule {}
