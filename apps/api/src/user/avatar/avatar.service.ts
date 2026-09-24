import { Injectable, Logger } from "@nestjs/common";
import sharp from "sharp";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { AvatarObject, createAvatarObject, parseAvatarUrl, avatarPosterKey, requireAvatarRepresentation } from "../../storage/avatar-object";
import { WsGateway } from "../../ws/ws.gateway";
import { avatarError } from "./avatar-error";
import { normalizeAvatar } from "./avatar-image";
import { normalizeAnimatedAvatar } from "./avatar-animation";
import type { AvatarCrop } from "@likecord/shared";

sharp.cache({ memory: 32, files: 0, items: 20 });
sharp.concurrency(1);
export interface AvatarProjection { userId: string; avatarUrl: string | null }
export interface AvatarMutation { projection: AvatarProjection; changed: boolean; previous: AvatarObject | null }

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);
  private readonly active = new Set<string>();
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly ws: WsGateway) {}

  acquire(userId: string): () => void {
    if (this.active.has(userId)) throw avatarError(409, "AVATAR_UPLOAD_IN_PROGRESS");
    if (this.active.size >= 2) throw avatarError(503, "AVATAR_BUSY");
    this.active.add(userId);
    return () => this.active.delete(userId);
  }

  async databaseTime(): Promise<Date> {
    const rows = await this.prisma.client.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    return rows[0].now;
  }

  async metadata(userId: string): Promise<AvatarProjection> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    if (!user) throw avatarError(404, "NOT_FOUND");
    return { userId, avatarUrl: parseAvatarUrl(userId, user.avatarUrl)?.url || null };
  }

  async image(userId: string, version: string): Promise<AvatarObject> {
    const current = await this.metadata(userId);
    const object = parseAvatarUrl(userId, current.avatarUrl);
    if (!object || object.version !== version) throw avatarError(404, "NOT_FOUND");
    return object;
  }

  async readImage(object: AvatarObject): Promise<Buffer> {
    let buffer: Buffer | null;
    try { buffer = await this.storage.readAvatar(object.key); } catch { throw avatarError(503, "STORAGE_ERROR"); }
    if (!buffer) throw avatarError(404, "NOT_FOUND");
    return buffer;
  }

  async readPoster(object: AvatarObject): Promise<Buffer> {
    try {
      const poster = await this.storage.readAvatar(avatarPosterKey(object));
      if (poster) { requireAvatarRepresentation(poster, true); return poster; }
      const main = await this.storage.readAvatar(object.key);
      if (main && requireAvatarRepresentation(main) === "static") return main;
    } catch { throw avatarError(503, "STORAGE_ERROR"); }
    throw avatarError(404, "NOT_FOUND");
  }

  async replace(userId: string, input: Buffer, mime: string, crop: AvatarCrop | null = null, signal?: AbortSignal): Promise<AvatarMutation> {
    const animated = input.subarray(0, 3).toString("ascii") === "GIF"
      || (input.length >= 21 && input.toString("ascii", 0, 4) === "RIFF"
        && input.toString("ascii", 12, 16) === "VP8X" && (input[20] & 2) !== 0);
    const pair = animated ? await normalizeAnimatedAvatar(input, mime, crop, { signal }) : null;
    const buffer = pair?.main || await normalizeAvatar(input, mime, crop);
    if (pair && signal?.aborted) throw avatarError(400, "AVATAR_RECEIVE_ABORTED");
    const candidate = createAvatarObject(userId, await this.databaseTime());
    try {
      await this.storage.putAvatar(candidate.key, buffer);
      if (pair) await this.storage.putAvatar(avatarPosterKey(candidate), pair.poster);
    }
    catch { throw avatarError(503, "STORAGE_ERROR"); } // uncertain/partial put remains discoverable by inventory
    return this.mutate(userId, candidate);
  }

  remove(userId: string): Promise<AvatarMutation> { return this.mutate(userId, null); }

  private async mutate(userId: string, candidate: AvatarObject | null): Promise<AvatarMutation> {
    let previous: AvatarObject | null = null;
    let changed = false;
    let knownAbort: unknown;
    const next = candidate?.url || null;
    try {
      await this.prisma.client.$transaction(async (tx) => {
        try {
        const rows = await tx.$queryRaw<{ avatarUrl: string | null }[]>`
          SELECT "avatarUrl" FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
        if (!rows.length) { knownAbort = avatarError(401, "AUTH_REQUIRED"); throw knownAbort; }
        if (candidate) {
          const times = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
          const age = times[0].now.getTime() - candidate.time;
          if (age < 0 || age >= 300_000) { knownAbort = avatarError(409, "AVATAR_CANDIDATE_EXPIRED"); throw knownAbort; }
        }
        previous = parseAvatarUrl(userId, rows[0].avatarUrl);
        changed = rows[0].avatarUrl !== next;
        if (changed) await tx.user.update({ where: { id: userId }, data: { avatarUrl: next } });
        } catch (error) {
          // The callback failed before Prisma could issue COMMIT.
          knownAbort = error;
          throw error;
        }
      }, { maxWait: 5000, timeout: 5000 });
    } catch (error) {
      // Explicit aborts and documented transaction-conflict errors prove no promotion.
      const rolledBack = knownAbort || (error as { code?: string }).code === "P2034";
      if (rolledBack) {
        if (candidate) await this.cleanup(candidate);
        if (knownAbort && typeof knownAbort === "object" && "getStatus" in knownAbort) throw knownAbort;
        throw avatarError(503, "AVATAR_COMMIT_UNCONFIRMED");
      }
      // A network/commit error is not proof of rollback. Never delete a candidate here.
      try {
        const current = await this.prisma.client.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
        if (current && current.avatarUrl === next) return { projection: { userId, avatarUrl: next }, previous, changed };
      } catch { /* retain and let inventory retry */ }
      throw avatarError(503, "AVATAR_COMMIT_UNCONFIRMED");
    }
    return { projection: { userId, avatarUrl: next }, previous, changed };
  }

  /** Called only after the HTTP response has been committed to the transport. */
  async afterCommit(mutation: AvatarMutation): Promise<void> {
    if (!mutation.changed) return;
    try { await this.ws.emitAvatarUpdated(mutation.projection.userId); }
    catch { this.logger.warn("AVATAR_EVENT_FAILED"); }
    if (mutation.previous) await this.cleanup(mutation.previous);
  }

  private async cleanup(object: AvatarObject): Promise<void> {
    for (const key of [object.key, avatarPosterKey(object)]) {
      try { await this.storage.deleteAvatar(key); }
      catch { this.logger.warn("AVATAR_CLEANUP_RETRY"); }
    }
  }
}
