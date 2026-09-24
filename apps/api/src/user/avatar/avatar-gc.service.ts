import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { parseAvatarKey, parseAvatarUrl } from "../../storage/avatar-object";

@Injectable()
export class AvatarGcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AvatarGcService.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private stopped = false;
  private cursor?: string;
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  onModuleInit() {
    this.timer = setInterval(() => { void this.run(); }, 6 * 60 * 60 * 1000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.running;
  }
  run(): Promise<void> {
    if (this.running || this.stopped) return this.running || Promise.resolve();
    this.running = this.sweep().finally(() => { this.running = undefined; });
    return this.running;
  }
  private async sweep(): Promise<void> {
    try {
      const rows = await this.prisma.client.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const cutoff = rows[0].now.getTime() - 24 * 60 * 60 * 1000;
      // Resume on the next interval if a large inventory exceeds 100 pages.
      for (let pageNumber = 0; pageNumber < 100 && !this.stopped; pageNumber++) {
        const page = await this.storage.listAvatars(this.cursor);
        for (const entry of page.objects) {
          if (this.stopped) return;
          const object = parseAvatarKey(entry.key);
          if (!object || !entry.lastModified || !Number.isFinite(entry.lastModified.getTime())) {
            this.logger.warn("AVATAR_GC_UNKNOWN_OBJECT"); continue;
          }
          if (object.time >= cutoff || entry.lastModified.getTime() >= cutoff) continue;
          try {
            const user = await this.prisma.client.user.findUnique({ where: { id: object.userId }, select: { avatarUrl: true } });
            if (parseAvatarUrl(object.userId, user?.avatarUrl || null)?.url !== object.url) await this.storage.deleteAvatar(object.key);
          } catch { this.logger.warn("AVATAR_GC_RETAIN_RETRY"); }
        }
        if (page.cursor && page.cursor === this.cursor) throw new Error("Repeated avatar cursor");
        this.cursor = page.cursor;
        if (!this.cursor) return;
      }
    } catch { this.logger.warn("AVATAR_GC_INVENTORY_RETRY"); }
  }
}
