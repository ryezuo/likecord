import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { UploadService } from "./upload.service";

@Injectable()
export class CleanupService implements OnApplicationBootstrap {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly uploadService: UploadService) {}

  onApplicationBootstrap() {
    // Run cleanup every 6 hours in production, every 30 minutes in development
    const intervalMs = process.env.NODE_ENV === "production" ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000;
    this.intervalHandle = setInterval(async () => {
      try {
        const expired = await this.uploadService.deleteExpired();
        const orphans = await this.uploadService.deleteOrphaned();
        if (orphans > 0 || expired > 0) {
          console.log(`[Cleanup] Removed ${orphans} orphaned, ${expired} expired attachments`);
        }
      } catch (err) {
        console.error("[Cleanup] Error during attachment cleanup:", err);
      }
    }, intervalMs);
  }

  // For testing: immediately run cleanup
  async runNow(): Promise<{ orphans: number; expired: number }> {
    const expired = await this.uploadService.deleteExpired();
    const orphans = await this.uploadService.deleteOrphaned();
    return { orphans, expired };
  }
}
