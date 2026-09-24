import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const REVOKED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class RefreshCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RefreshCleanupService.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Run once on startup, then periodically
    this.cleanup().catch(() => {});
    this.interval = setInterval(() => {
      this.cleanup().catch(() => {});
    }, CLEANUP_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async cleanup() {
    const isDev = process.env.NODE_ENV !== "production";

    const [revoked, expired] = await Promise.all([
      this.prisma.client.refreshSession.deleteMany({
        where: {
          revokedAt: {
            not: null,
            lt: new Date(Date.now() - REVOKED_RETENTION_MS),
          },
        },
      }),
      this.prisma.client.refreshSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      }),
    ]);

    const total = revoked.count + expired.count;

    if (isDev && total > 0) {
      this.logger.log(
        `Cleaned up ${total} refresh sessions (${revoked.count} revoked, ${expired.count} expired)`,
      );
    }
  }
}
