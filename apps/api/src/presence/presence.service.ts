import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export type PresenceStatus = "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE";

export interface PresenceEntry {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
}

const PRESENCE_TTL = 120; // 2 minutes TTL (safety net for unexpected disconnects)
const CONNECTION_TTL = 600; // 10 min TTL on connection counters (auto-cleanup stale keys)

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  async set(userId: string, status: PresenceStatus): Promise<void> {
    const entry: PresenceEntry = { userId, status, lastSeen: Date.now() };
    await this.redis.set(`presence:${userId}`, JSON.stringify(entry), PRESENCE_TTL);
  }

  async get(userId: string): Promise<PresenceEntry | null> {
    const raw = await this.redis.get(`presence:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PresenceEntry;
  }

  async getAll(userIds: string[]): Promise<Map<string, PresenceEntry>> {
    const result = new Map<string, PresenceEntry>();
    for (const id of userIds) {
      const entry = await this.get(id);
      if (entry) result.set(id, entry);
    }
    return result;
  }

  async remove(userId: string): Promise<void> {
    const client = this.getClient();
    if (client) await client.del(`presence:${userId}`);
  }

  async heartbeat(userId: string): Promise<void> {
    const existing = await this.get(userId);
    if (existing) {
      existing.lastSeen = Date.now();
      await this.redis.set(`presence:${userId}`, JSON.stringify(existing), PRESENCE_TTL);
    } else {
      // Presence key expired — restore if user still has active connections
      const count = await this.getConnectionCount(userId);
      if (count > 0) {
        await this.set(userId, "ONLINE");
      }
    }
  }

  // ── Redis-backed connection counting (replaces in-memory Map) ──

  async incrementConnections(userId: string): Promise<number> {
    const key = `presence:connections:${userId}`;
    const client = this.getClient();
    if (!client) return 0;
    // INCR returns the NEW value; we want the count BEFORE increment
    const count = await client.incr(key);
    await client.expire(key, CONNECTION_TTL);
    return count - 1; // old count: 0 for first connection, 1+ for additional
  }

  async decrementConnections(userId: string): Promise<number | null> {
    const client = this.getClient();
    if (!client) return 0;
    const key = `presence:connections:${userId}`;
    try {
      const script = `
        local count = redis.call('DECR', KEYS[1])
        if count <= 0 then
          redis.call('DEL', KEYS[1])
          return 0
        end
        return count
      `;
      const result = await (client as any).eval(script, 1, key);
      return typeof result === "number" ? result : parseInt(String(result), 10) || 0;
    } catch {
      // Redis unavailable (shutdown or runtime failure). The decremented count cannot be
      // trusted, so return null instead of 0: callers must NOT interpret this as a
      // legitimate final disconnect (which would wrongly mark the user OFFLINE).
      // Graceful shutdown stays error-free because callers already guard best-effort.
      return null;
    }
  }

  async getConnectionCount(userId: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    const raw = await client.get(`presence:connections:${userId}`);
    return raw ? parseInt(raw, 10) : 0;
  }

  private getClient() {
    return (this.redis as any).getClient?.() || null;
  }
}
