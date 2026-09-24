import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { RedisService } from "../redis/redis.service";
import * as crypto from "crypto";

const VOICE_PREFIX = "voice:";
const SCREEN_PREFIX = "screen:";
const MAX_USERS_PER_CHANNEL = 8;
const SCREEN_SHARE_CLEANUP_TTL = 86400; // 24h safety net TTL for crash recovery

export interface VoiceStateEntry {
  userId: string;
  channelId: string;
  serverId: string;
  isMuted: boolean;
  isDeafened: boolean;
  joinedAt: number;
}

export interface VoiceOccupancyMember {
  userId: string;
  username: string;
  displayName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface VoiceOccupancySnapshot {
  serverId: string;
  channels: Array<{
    channelId: string;
    members: VoiceOccupancyMember[];
  }>;
}

export interface ScreenShareSession {
  shareId: string;
  channelId: string;
  presenterUserId: string;
  presenterSocketId: string;
  streamId: string;
  startedAt: number;
}

export interface ScreenShareViewerSubscription {
  shareId: string;
  channelId: string;
  presenterUserId: string;
  presenterSocketId: string;
  viewerUserId: string;
  viewerSocketId: string;
}

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly redis: RedisService,
  ) {}

  private stateKey(channelId: string, userId: string): string {
    return `${VOICE_PREFIX}${channelId}:${userId}`;
  }

  private channelMembersKey(channelId: string): string {
    return `${VOICE_PREFIX}channel:${channelId}:members`;
  }

  async validateJoin(serverId: string, channelId: string, userId: string): Promise<boolean> {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });
    if (channel.type !== "VOICE") throw new ForbiddenException({ error: { code: "NOT_VOICE_CHANNEL", message: "Not a voice channel" } });
    if (channel.serverId !== serverId) throw new ForbiddenException({ error: { code: "WRONG_SERVER", message: "Channel does not belong to this server" } });

    const member = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!member || member.isBanned) throw new ForbiddenException({ error: { code: "NOT_MEMBER", message: "Not a member" } });

    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.CONNECT);

    // Check user count
    const count = await this.getUserCount(channelId);
    if (count >= MAX_USERS_PER_CHANNEL) {
      throw new ForbiddenException({ error: { code: "CHANNEL_FULL", message: `Voice channel is full (max ${MAX_USERS_PER_CHANNEL} users)` } });
    }
    return member.isMuted;
  }

  async validateStream(channelId: string, userId: string): Promise<void> {
    const channel = await this.prisma.client.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException({ error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" } });
    if (channel.type !== "VOICE") throw new ForbiddenException({ error: { code: "NOT_VOICE_CHANNEL", message: "Not a voice channel" } });
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.CONNECT);
    await this.permissionService.assertHasChannelPermission(channelId, userId, PERMISSIONS.STREAM);
  }

  async join(serverId: string, channelId: string, userId: string): Promise<VoiceStateEntry & { serverMuted: boolean }> {
    const serverMuted = await this.validateJoin(serverId, channelId, userId);
    const canSpeak = await this.permissionService.hasChannelPermission(channelId, userId, PERMISSIONS.SPEAK);

    const entry: VoiceStateEntry = {
      userId,
      channelId,
      serverId,
      isMuted: serverMuted || !canSpeak,
      isDeafened: false,
      joinedAt: Date.now(),
    };

    const client = (this.redis as any).getClient();
    if (client) {
      await client.set(this.stateKey(channelId, userId), JSON.stringify(entry));
      await client.sadd(this.channelMembersKey(channelId), userId);
    }
    return { ...entry, serverMuted };
  }

  async leave(channelId: string, userId: string): Promise<void> {
    const client = (this.redis as any).getClient();
    if (client) {
      await client.del(this.stateKey(channelId, userId));
      await client.srem(this.channelMembersKey(channelId), userId);
    }
  }

  async getUsers(channelId: string): Promise<VoiceStateEntry[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    const userIds = await client.smembers(this.channelMembersKey(channelId));
    const entries: VoiceStateEntry[] = [];
    for (const uid of userIds) {
      const raw = await client.get(this.stateKey(channelId, uid));
      if (raw) {
        try { entries.push(JSON.parse(raw)); } catch { /* skip */ }
      }
    }
    return entries;
  }

  async getUserCount(channelId: string): Promise<number> {
    const client = (this.redis as any).getClient();
    if (!client) return 0;
    return client.scard(this.channelMembersKey(channelId));
  }

  async getVoiceState(channelId: string, userId: string): Promise<VoiceStateEntry | null> {
    const client = (this.redis as any).getClient();
    if (!client) return null;
    const raw = await client.get(this.stateKey(channelId, userId));
    if (!raw) return null;
    try { return JSON.parse(raw) as VoiceStateEntry; } catch { return null; }
  }

  async getOccupancySnapshot(serverId: string, userId: string): Promise<VoiceOccupancySnapshot | null> {
    if (!await this.permissionService.canAccessServer(serverId, userId)) return null;

    const voiceChannels = await this.prisma.client.channel.findMany({
      where: { serverId, type: "VOICE" },
      select: { id: true, position: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    const visibleChannels = (await Promise.all(voiceChannels.map(async (channel) => ({
      channel,
      visible: await this.permissionService.hasChannelPermission(channel.id, userId, PERMISSIONS.VIEW_CHANNEL),
    })))).filter((entry) => entry.visible).map((entry) => entry.channel);

    const occupancy = await Promise.all(visibleChannels.map(async (channel) => ({
      channelId: channel.id,
      entries: (await this.getUsers(channel.id)).filter((entry) =>
        entry.channelId === channel.id && entry.serverId === serverId
      ),
    })));
    const occupied = occupancy.filter((channel) => channel.entries.length > 0);
    const occupantIds = [...new Set(occupied.flatMap((channel) => channel.entries.map((entry) => entry.userId)))];
    if (occupantIds.length === 0) return { serverId, channels: [] };

    const activeMembers = await this.prisma.client.member.findMany({
      where: { serverId, isBanned: false, userId: { in: occupantIds } },
      select: {
        userId: true,
        user: { select: { username: true, displayName: true } },
      },
    });
    const identityByUserId = new Map(activeMembers.map((member) => [member.userId, member.user]));

    return {
      serverId,
      channels: occupied.map((channel) => ({
        channelId: channel.channelId,
        members: channel.entries
          .map((entry): VoiceOccupancyMember | null => {
            const identity = identityByUserId.get(entry.userId);
            if (!identity) return null;
            return {
              userId: entry.userId,
              username: identity.username,
              displayName: identity.displayName,
              isMuted: entry.isMuted,
              isDeafened: entry.isDeafened,
            };
          })
          .filter((member): member is VoiceOccupancyMember => member !== null)
          .sort((left, right) => {
            const identityOrder = (left.displayName || left.username).localeCompare(right.displayName || right.username);
            return identityOrder || left.userId.localeCompare(right.userId);
          }),
      })).filter((channel) => channel.members.length > 0),
    };
  }

  async updateMute(channelId: string, userId: string, muted: boolean): Promise<void> {
    const client = (this.redis as any).getClient();
    if (!client) return;
    const raw = await client.get(this.stateKey(channelId, userId));
    if (!raw) return;
    const entry = JSON.parse(raw) as VoiceStateEntry;
    entry.isMuted = muted;
    await client.set(this.stateKey(channelId, userId), JSON.stringify(entry));
  }

  async updateDeafen(channelId: string, userId: string, deafened: boolean): Promise<void> {
    const client = (this.redis as any).getClient();
    if (!client) return;
    const raw = await client.get(this.stateKey(channelId, userId));
    if (!raw) return;
    const entry = JSON.parse(raw) as VoiceStateEntry;
    entry.isDeafened = deafened;
    await client.set(this.stateKey(channelId, userId), JSON.stringify(entry));
  }

  // ── Screen Share sessions (Redis-backed, ephemeral) ──
  // Key model:
  //   screen:share:{shareId}            → JSON { shareId, channelId, presenterUserId, presenterSocketId, streamId, startedAt }
  //   screen:channel:{channelId}:shares → SET of shareIds
  //   screen:user:{channelId}:{userId}  → shareId (index: user owns at most one share per channel)

  private shareKey(shareId: string): string {
    return `${SCREEN_PREFIX}share:${shareId}`;
  }

  private channelSharesKey(channelId: string): string {
    return `${SCREEN_PREFIX}channel:${channelId}:shares`;
  }

  private userShareKey(channelId: string, userId: string): string {
    return `${SCREEN_PREFIX}user:${channelId}:${userId}`;
  }

  private shareViewersKey(shareId: string): string {
    return `${this.shareKey(shareId)}:viewers`;
  }

  private viewerSharesKey(socketId: string): string {
    return `${SCREEN_PREFIX}viewer:socket:${socketId}:shares`;
  }

  private viewerSocketUserKey(socketId: string): string {
    return `${SCREEN_PREFIX}viewer:socket:${socketId}:user`;
  }

  private viewerUserSocketsKey(userId: string): string {
    return `${SCREEN_PREFIX}viewer:user:${userId}:sockets`;
  }

  /** Creates a share session. Returns null if the user already owns a share in this channel. */
  async createScreenShare(channelId: string, userId: string, socketId: string, streamId: string): Promise<ScreenShareSession | null> {
    const client = (this.redis as any).getClient();
    if (!client) return null;
    const existing = await this.findScreenShareByUser(channelId, userId);
    if (existing) return null;
    const shareId = crypto.randomBytes(8).toString("hex");
    const session: ScreenShareSession = {
      shareId,
      channelId,
      presenterUserId: userId,
      presenterSocketId: socketId,
      streamId: typeof streamId === "string" ? streamId.slice(0, 256) : "",
      startedAt: Date.now(),
    };
    await client.setex(this.shareKey(shareId), SCREEN_SHARE_CLEANUP_TTL, JSON.stringify(session));
    await client.sadd(this.channelSharesKey(channelId), shareId);
    await client.set(this.userShareKey(channelId, userId), shareId);
    return session;
  }

  async getScreenShare(shareId: string): Promise<ScreenShareSession | null> {
    const raw = await this.redis.get(this.shareKey(shareId));
    if (!raw) return null;
    try { return JSON.parse(raw) as ScreenShareSession; } catch { return null; }
  }

  async listScreenShares(channelId: string): Promise<ScreenShareSession[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    const shareIds = await client.smembers(this.channelSharesKey(channelId));
    const sessions: ScreenShareSession[] = [];
    for (const sid of shareIds) {
      const s = await this.getScreenShare(sid);
      if (s) sessions.push(s);
    }
    return sessions;
  }

  async findScreenShareByUser(channelId: string, userId: string): Promise<ScreenShareSession | null> {
    const shareId = await this.redis.get(this.userShareKey(channelId, userId));
    if (!shareId) return null;
    return this.getScreenShare(shareId);
  }

  /** Adds one socket-specific viewer subscription. Returns false when it already exists. */
  async addScreenShareViewer(shareId: string, viewerSocketId: string, viewerUserId: string): Promise<boolean> {
    const client = (this.redis as any).getClient();
    if (!client) return false;
    const added = await client.sadd(this.shareViewersKey(shareId), viewerSocketId);
    await client.sadd(this.viewerSharesKey(viewerSocketId), shareId);
    await client.setex(this.viewerSocketUserKey(viewerSocketId), SCREEN_SHARE_CLEANUP_TTL, viewerUserId);
    await client.sadd(this.viewerUserSocketsKey(viewerUserId), viewerSocketId);
    await client.expire(this.shareViewersKey(shareId), SCREEN_SHARE_CLEANUP_TTL);
    await client.expire(this.viewerSharesKey(viewerSocketId), SCREEN_SHARE_CLEANUP_TTL);
    await client.expire(this.viewerUserSocketsKey(viewerUserId), SCREEN_SHARE_CLEANUP_TTL);
    return added === 1;
  }

  async listScreenShareViewerIds(shareId: string): Promise<string[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    const socketIds = await client.smembers(this.shareViewersKey(shareId));
    const viewerIds = new Set<string>();
    for (const socketId of socketIds) {
      const userId = await client.get(this.viewerSocketUserKey(socketId));
      if (userId) viewerIds.add(userId);
    }
    return [...viewerIds];
  }

  async listScreenShareSubscriptionsForSocket(socketId: string): Promise<string[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    return client.smembers(this.viewerSharesKey(socketId));
  }

  /** Removes one socket-specific viewer subscription. Returns null when it was already absent. */
  async removeScreenShareViewer(shareId: string, viewerSocketId: string): Promise<ScreenShareViewerSubscription | null> {
    const client = (this.redis as any).getClient();
    if (!client) return null;

    const session = await this.getScreenShare(shareId);
    const viewerUserId = await client.get(this.viewerSocketUserKey(viewerSocketId));
    const removed = await client.srem(this.shareViewersKey(shareId), viewerSocketId);
    await client.srem(this.viewerSharesKey(viewerSocketId), shareId);

    const remainingShares = await client.scard(this.viewerSharesKey(viewerSocketId));
    if (remainingShares === 0) {
      await client.del(this.viewerSharesKey(viewerSocketId));
      await client.del(this.viewerSocketUserKey(viewerSocketId));
      if (viewerUserId) await client.srem(this.viewerUserSocketsKey(viewerUserId), viewerSocketId);
    }

    if (removed !== 1 || !session || !viewerUserId) return null;
    return {
      shareId: session.shareId,
      channelId: session.channelId,
      presenterUserId: session.presenterUserId,
      presenterSocketId: session.presenterSocketId,
      viewerUserId,
      viewerSocketId,
    };
  }

  async removeScreenShareViewersForSocket(socketId: string, channelId?: string): Promise<ScreenShareViewerSubscription[]> {
    const shareIds = await this.listScreenShareSubscriptionsForSocket(socketId);
    const removed: ScreenShareViewerSubscription[] = [];
    for (const shareId of shareIds) {
      const session = await this.getScreenShare(shareId);
      if (channelId && session && session.channelId !== channelId) continue;
      const subscription = await this.removeScreenShareViewer(shareId, socketId);
      if (subscription) removed.push(subscription);
    }
    return removed;
  }

  async removeScreenShareViewersForUser(userId: string): Promise<ScreenShareViewerSubscription[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    const socketIds = await client.smembers(this.viewerUserSocketsKey(userId));
    const removed: ScreenShareViewerSubscription[] = [];
    for (const socketId of socketIds) {
      removed.push(...await this.removeScreenShareViewersForSocket(socketId));
    }
    await client.del(this.viewerUserSocketsKey(userId));
    return removed;
  }

  /** Removes a specific share. Returns the removed session (or null if absent). */
  async removeScreenShare(shareId: string): Promise<ScreenShareSession | null> {
    const client = (this.redis as any).getClient();
    if (!client) return null;
    const session = await this.getScreenShare(shareId);
    if (!session) return null;
    const viewerSocketIds = await client.smembers(this.shareViewersKey(shareId));
    for (const viewerSocketId of viewerSocketIds) {
      await this.removeScreenShareViewer(shareId, viewerSocketId);
    }
    await client.del(this.shareKey(shareId));
    await client.del(this.shareViewersKey(shareId));
    await client.srem(this.channelSharesKey(session.channelId), shareId);
    await client.del(this.userShareKey(session.channelId, session.presenterUserId));
    return session;
  }

  /**
   * Removes shares for a user.
   * If socketId is provided, only shares owned by that exact socket are removed (disconnect path).
   * Otherwise all shares by userId are removed (kick/ban admin cleanup).
   */
  async removeScreenSharesForUser(userId: string, socketId?: string): Promise<ScreenShareSession[]> {
    const client = (this.redis as any).getClient();
    if (!client) return [];
    const removed: ScreenShareSession[] = [];
    const keys = await client.keys(`${SCREEN_PREFIX}share:*`);
    for (const key of keys) {
      if (key.endsWith(":viewers")) continue;
      const raw = await client.get(key);
      if (!raw) continue;
      try {
        const session = JSON.parse(raw) as ScreenShareSession;
        if (session.presenterUserId !== userId) continue;
        if (socketId && session.presenterSocketId !== socketId) continue;
        const s = await this.removeScreenShare(session.shareId);
        if (s) removed.push(s);
      } catch { /* skip malformed */ }
    }
    return removed;
  }

  async getIceServers(): Promise<Array<{ urls: string | string[]; username?: string; credential?: string }>> {
    const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: "stun:stun.l.google.com:19302" },
    ];

    const turnSecret = process.env.TURN_SECRET;
    const turnHost = process.env.TURN_HOST || "localhost";

    if (turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + 86400;
      const username = `${expiry}:likecord`;
      const hmac = crypto.createHmac("sha1", turnSecret).update(username).digest("base64");
      servers.push({
        urls: [`turn:${turnHost}:3478`, `turns:${turnHost}:5349`],
        username,
        credential: hmac,
      });
    }

    return servers;
  }

  async getVoiceStateByUserId(userId: string): Promise<VoiceStateEntry | null> {
    const client = (this.redis as any).getClient();
    if (!client) return null;
    const keys = await client.keys(`${VOICE_PREFIX}*:${userId}`);
    for (const key of keys) {
      const raw = await client.get(key);
      if (raw) {
        try { return JSON.parse(raw) as VoiceStateEntry; } catch { /* */ }
      }
    }
    return null;
  }

  async handleDisconnect(userId: string): Promise<{ channelId: string } | null> {
    // Find which voice channel the user was in and leave it
    const client = (this.redis as any).getClient();
    if (!client) return null;
    // Scan all voice keys for this user
    const keys = await client.keys(`${VOICE_PREFIX}*:${userId}`);
    if (keys.length === 0) return null;
    // Parse the channelId from the key
    for (const key of keys) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        const channelId = parts[1];
        await this.leave(channelId, userId);
        return { channelId };
      }
    }
    return null;
  }
}
