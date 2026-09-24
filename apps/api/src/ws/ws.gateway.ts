import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";
import { PresenceService, PresenceStatus } from "../presence/presence.service";
import {
  VoiceService,
  type ScreenShareSession,
  type ScreenShareViewerSubscription,
  type VoiceOccupancySnapshot,
} from "../voice/voice.service";
import { SessionService } from "../session/session.service";
import { type JwtPayload } from "../auth/strategies/jwt.strategy";
import { WsSessionRegistryService } from "./ws-session-registry.service";

interface AuthSocket extends Socket {
  userId?: string;
  sessionId?: string;
  serverMemberships?: string[];
  voiceChannel?: string;
}

interface VoiceActionResult {
  ok: boolean;
  code?: string;
  message?: string;
  isMuted?: boolean;
  serverMuted?: boolean;
}

function voiceActionFailure(error: unknown): VoiceActionResult {
  const errorObject = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const response = typeof errorObject.response === "object" && errorObject.response !== null
    ? errorObject.response as Record<string, unknown>
    : {};
  const nested = typeof response.error === "object" && response.error !== null
    ? response.error as Record<string, unknown>
    : {};
  const code = [nested.code, response.code].find((value): value is string => typeof value === "string")
    ?? "VOICE_JOIN_FAILED";
  const message = [nested.message, response.message, errorObject.message]
    .find((value): value is string => typeof value === "string")
    ?? "Failed to join voice channel";
  return { ok: false, code, message };
}

@WSGateway({
  namespace: "/",
  path: "/api/v1/ws",
  cors: { origin: true, credentials: true },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly presenceService: PresenceService,
    private readonly voiceService: VoiceService,
    private readonly sessionService: SessionService,
    private readonly sessionRegistry: WsSessionRegistryService,
  ) {}

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const cookieHeader = client.handshake.headers.cookie || "";
      const origin = client.handshake.headers.origin;
      const allowedOrigin = process.env.CORS_ORIGIN || "";
      if (allowedOrigin && origin && !origin.startsWith(allowedOrigin) && !origin.includes("localhost")) {
        client.disconnect(); return;
      }
      const cookies = this.parseCookies(cookieHeader);
      const cookieToken = cookies["access_token"];
      const queryToken = process.env.NODE_ENV === "test"
        ? (client.handshake.query?.access_token as string | undefined) : undefined;
      const accessToken = cookieToken || queryToken;
      if (!accessToken) {
        client.emit("error", { code: "AUTH_REQUIRED", message: "Missing access token" });
        client.disconnect(); return;
      }
      const payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
      if (!payload.sid || !Number.isInteger(payload.sv)
        || !await this.sessionService.validateAccessSession(payload.sid, payload.sub, payload.sv)) {
        client.emit("error", { code: "AUTH_FAILED", message: "Invalid token" });
        client.disconnect(); return;
      }
      client.userId = payload.sub;
      client.sessionId = payload.sid;
      client.use((_event, next) => {
        if (client.data.authRevoked === true) return next(new Error("SESSION_REVOKED"));
        next();
      });
      const memberships = await this.prisma.client.member.findMany({
        where: { userId: payload.sub, isBanned: false }, select: { serverId: true },
      });
      client.serverMemberships = memberships.map((m) => m.serverId);
      await client.join(`user:${payload.sub}`);
      // Redis-backed connection count: first connection sets ONLINE
      const prevCount = await this.presenceService.incrementConnections(payload.sub);
      await Promise.all(memberships.map((m) => client.join(`server:${m.serverId}`)));
      if (prevCount === 0) {
        await this.presenceService.set(payload.sub, "ONLINE");
      }
      if (prevCount <= 1) {
        // First connection (or reconnection after all sockets dropped):
        // broadcast ONLINE to all servers
        this.server.to([...memberships.map((m) => `server:${m.serverId}`)]).emit("presence:update", {
          userId: payload.sub, status: "ONLINE",
        });
      }
      this.sessionRegistry.associate(payload.sid, client);
      client.emit("ws:ready", {});
    } catch {
      client.emit("error", { code: "AUTH_FAILED", message: "Invalid token" });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket): Promise<void> {
    this.sessionRegistry.remove(client);
    if (client.userId) {
      try {
        await this.cleanupScreenShareViewersForSocket(client);
      } catch { /* viewer cleanup is best-effort */ }
      try {
        // Screen-share ownership is socket-specific and must not depend on Redis
        // presence cleanup succeeding.
        const removed = await this.voiceService.removeScreenSharesForUser(client.userId, client.id);
        for (const s of removed) {
          this.server.to(`voice:${s.channelId}`).emit("screen:share-stopped", {
            shareId: s.shareId, channelId: s.channelId, presenterId: s.presenterUserId,
          });
        }
      } catch { /* screen share cleanup is best-effort */ }

      try {
        // Only the socket that actually joined voice may remove this user's
        // voice state. An unrelated same-user tab must leave it untouched.
        if (client.voiceChannel) {
          const channelId = client.voiceChannel;
          const voiceState = await this.voiceService.getVoiceState(channelId, client.userId);
          await this.voiceService.leave(channelId, client.userId);
          client.to(`voice:${channelId}`).emit("voice:user-left", { userId: client.userId, channelId });
          client.voiceChannel = undefined;
          if (voiceState) this.emitVoiceOccupancyChanged(voiceState.serverId);
        }
      } catch { /* voice state cleanup is best-effort */ }

      try {
        // null = Redis unavailable: count untrustworthy → must NOT mark OFFLINE (only === 0 is a real final disconnect)
        const remaining = await this.presenceService.decrementConnections(client.userId);
        if (remaining === 0) {
          try { await this.presenceService.remove(client.userId); } catch { /* okay */ }
          if (client.serverMemberships) {
            this.server.to(client.serverMemberships.map((s) => `server:${s}`)).emit("presence:update", {
              userId: client.userId, status: "OFFLINE",
            });
          }
        }
      } catch { /* Redis/presence cleanup is best-effort during shutdown */ }
    }
  }

  // ── Voice signaling ──

  @SubscribeMessage("voice:occupancy:get")
  async handleVoiceOccupancyGet(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { serverId: string },
  ): Promise<VoiceOccupancySnapshot | null> {
    if (!client.userId || !data?.serverId) return null;
    return (await this.voiceService.getOccupancySnapshot(data.serverId, client.userId))
      ?? { serverId: data.serverId, channels: [] };
  }

  @SubscribeMessage("voice:authorize-join")
  async handleVoiceJoinAuthorization(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { serverId: string; channelId: string },
  ): Promise<VoiceActionResult> {
    if (!client.userId || !data?.channelId || !data?.serverId) {
      return { ok: false, code: "INVALID_VOICE_JOIN", message: "Invalid voice join request" };
    }
    try {
      await this.voiceService.validateJoin(data.serverId, data.channelId, client.userId);
      return { ok: true };
    } catch (error: unknown) {
      return voiceActionFailure(error);
    }
  }

  @SubscribeMessage("voice:join")
  async handleVoiceJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { serverId: string; channelId: string },
  ): Promise<VoiceActionResult> {
    if (!client.userId || !data?.channelId || !data?.serverId) {
      return { ok: false, code: "INVALID_VOICE_JOIN", message: "Invalid voice join request" };
    }
    try {
      // Leave previous voice channel
      if (client.voiceChannel) {
        const previousChannelId = client.voiceChannel;
        const previousState = await this.voiceService.getVoiceState(previousChannelId, client.userId);
        await this.cleanupScreenShareViewersForSocket(client, previousChannelId);
        await this.voiceService.leave(previousChannelId, client.userId);
        client.leave(`voice:${previousChannelId}`);
        client.to(`voice:${previousChannelId}`).emit("voice:user-left", { userId: client.userId, channelId: previousChannelId });
        client.voiceChannel = undefined;
        if (previousState) this.emitVoiceOccupancyChanged(previousState.serverId);
      }

      const joined = await this.voiceService.join(data.serverId, data.channelId, client.userId);
      client.voiceChannel = data.channelId;
      client.join(`voice:${data.channelId}`);
      if (joined.isMuted) {
        client.emit("voice:state-updated", { userId: client.userId, channelId: data.channelId, isMuted: true, serverMuted: joined.serverMuted });
      }

      // Get current members with user metadata
      const memberEntries = await this.voiceService.getUsers(data.channelId);
      const userIds = memberEntries.map((e) => e.userId);
      const users = await this.prisma.client.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const membersWithMeta = memberEntries.map((e) => {
        const u = userMap.get(e.userId);
        return {
          userId: e.userId,
          username: u?.username ?? e.userId,
          displayName: u?.displayName ?? u?.username ?? e.userId,
          isMuted: e.isMuted,
          isDeafened: e.isDeafened,
        };
      });
      client.emit("voice:state", { channelId: data.channelId, members: membersWithMeta });

      // Notify others with user metadata
      const joiningUser = users.find((u) => u.id === client.userId);
      client.to(`voice:${data.channelId}`).emit("voice:user-joined", {
        userId: client.userId,
        username: joiningUser?.username ?? client.userId,
        displayName: joiningUser?.displayName ?? joiningUser?.username ?? client.userId,
        channelId: data.channelId,
      });
      this.emitVoiceOccupancyChanged(data.serverId);
      // Joining is asynchronous and a client may request share state while the
      // authorization check is still in flight. Emit the canonical current
      // state when the authorized join completes so late joiners always
      // converge without relying on that race.
      await this.emitScreenShareState(client, data.channelId);
      return { ok: true, isMuted: joined.isMuted, serverMuted: joined.serverMuted };
    } catch (error: unknown) {
      const failure = voiceActionFailure(error);
      client.emit("voice:error", { code: failure.code, message: failure.message });
      return failure;
    }
  }

  @SubscribeMessage("voice:leave")
  async handleVoiceLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string },
  ): Promise<void> {
    if (!client.userId || !data?.channelId) return;
    const voiceState = await this.voiceService.getVoiceState(data.channelId, client.userId);
    await this.cleanupScreenShareViewersForSocket(client, data.channelId);
    // Remove this socket's screen shares in this channel (socket-specific ownership)
    try {
      const removed = await this.voiceService.removeScreenSharesForUser(client.userId, client.id);
      for (const s of removed) {
        if (s.channelId === data.channelId) {
          client.to(`voice:${data.channelId}`).emit("screen:share-stopped", {
            shareId: s.shareId, channelId: s.channelId, presenterId: s.presenterUserId,
          });
        }
      }
    } catch { /* best-effort */ }
    await this.voiceService.leave(data.channelId, client.userId);
    client.leave(`voice:${data.channelId}`);
    if (client.voiceChannel === data.channelId) client.voiceChannel = undefined;
    client.to(`voice:${data.channelId}`).emit("voice:user-left", { userId: client.userId, channelId: data.channelId });
    if (voiceState) this.emitVoiceOccupancyChanged(voiceState.serverId);
  }

  @SubscribeMessage("voice:offer")
  async handleVoiceOffer(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; toUserId: string; sdp: string },
  ): Promise<void> {
    if (!client.userId || !data?.toUserId || !data?.sdp) return;
    if (!await this.hasVoiceSignalAccess(client, data.channelId, data.toUserId)) return;
    client.to(`user:${data.toUserId}`).emit("voice:offer", {
      fromUserId: client.userId, sdp: data.sdp, channelId: data.channelId,
    });
  }

  @SubscribeMessage("voice:answer")
  async handleVoiceAnswer(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; toUserId: string; sdp: string },
  ): Promise<void> {
    if (!client.userId || !data?.toUserId || !data?.sdp) return;
    if (!await this.hasVoiceSignalAccess(client, data.channelId, data.toUserId)) return;
    client.to(`user:${data.toUserId}`).emit("voice:answer", {
      fromUserId: client.userId, sdp: data.sdp, channelId: data.channelId,
    });
  }

  @SubscribeMessage("voice:ice-candidate")
  async handleVoiceIceCandidate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; toUserId: string; candidate: any },
  ): Promise<void> {
    if (!client.userId || !data?.toUserId || !data?.candidate) return;
    if (!await this.hasVoiceSignalAccess(client, data.channelId, data.toUserId)) return;
    client.to(`user:${data.toUserId}`).emit("voice:ice-candidate", {
      fromUserId: client.userId, candidate: data.candidate, channelId: data.channelId,
    });
  }

  @SubscribeMessage("voice:mute")
  async handleVoiceMute(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; muted: boolean; serverId?: string },
  ): Promise<VoiceActionResult> {
    if (!client.userId || !data?.channelId || typeof data.muted !== "boolean") {
      return { ok: false, code: "INVALID_VOICE_STATE", message: "Invalid voice state request" };
    }
    if (client.voiceChannel !== data.channelId) {
      return { ok: false, code: "NOT_IN_VOICE", message: "You are not connected to this voice channel" };
    }
    const currentState = await this.voiceService.getVoiceState(data.channelId, client.userId);
    if (!currentState) {
      return { ok: false, code: "NOT_IN_VOICE", message: "You are not connected to this voice channel" };
    }
    if (!data.muted && !await this.permissionService.hasChannelPermission(
      data.channelId,
      client.userId,
      PERMISSIONS.SPEAK,
    )) {
      await this.voiceService.updateMute(data.channelId, client.userId, true);
      client.emit("voice:state-updated", {
        userId: client.userId, channelId: data.channelId, isMuted: true,
        isDeafened: currentState.isDeafened,
      });
      client.emit("voice:error", { code: "MISSING_SPEAK_PERMISSION", message: "You cannot speak in this channel" });
      this.emitVoiceOccupancyChanged(currentState.serverId);
      return { ok: false, code: "MISSING_SPEAK_PERMISSION", message: "You cannot speak in this channel", isMuted: true };
    }
    // Check server mute — server-muted users cannot unmute themselves
    if (!data.muted) {
      const serverMember = await this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId: currentState.serverId, userId: client.userId } },
      });
      if (serverMember?.isMuted) {
        await this.voiceService.updateMute(data.channelId, client.userId, true);
        client.emit("voice:state-updated", {
          userId: client.userId, channelId: data.channelId, isMuted: true,
          isDeafened: currentState.isDeafened, serverMuted: true,
        });
        client.emit("voice:error", { code: "SERVER_MUTED", message: "You are server-muted and cannot unmute yourself" });
        this.emitVoiceOccupancyChanged(currentState.serverId);
        return { ok: false, code: "SERVER_MUTED", message: "You are server-muted and cannot unmute yourself", isMuted: true };
      }
    }
    await this.voiceService.updateMute(data.channelId, client.userId, data.muted);
    // Get current voice state to include serverMuted
    const state = await this.voiceService.getVoiceState(data.channelId, client.userId);
    client.to(`voice:${data.channelId}`).emit("voice:state-updated", {
      userId: client.userId, channelId: data.channelId, isMuted: data.muted,
      isDeafened: state?.isDeafened ?? false,
    });
    this.emitVoiceOccupancyChanged(currentState.serverId);
    return { ok: true, isMuted: data.muted };
  }

  @SubscribeMessage("voice:deafen")
  async handleVoiceDeafen(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; deafened: boolean },
  ): Promise<void> {
    if (!client.userId || !data?.channelId) return;
    if (client.voiceChannel !== data.channelId) return;
    const currentState = await this.voiceService.getVoiceState(data.channelId, client.userId);
    if (!currentState) return;
    await this.voiceService.updateDeafen(data.channelId, client.userId, data.deafened);
    client.to(`voice:${data.channelId}`).emit("voice:state-updated", {
      userId: client.userId, channelId: data.channelId, isDeafened: data.deafened,
    });
    this.emitVoiceOccupancyChanged(currentState.serverId);
  }

  // ── Screen Share signaling ──

  @SubscribeMessage("screen:share-start")
  async handleScreenShareStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; streamId?: string },
  ): Promise<void> {
    if (!client.userId || !data?.channelId || client.voiceChannel !== data.channelId) return;

    try {
      await this.voiceService.validateStream(data.channelId, client.userId);
    } catch {
      client.emit("screen:share-error", {
        code: "MISSING_PERMISSION",
        message: "You do not have permission to stream in this channel",
      });
      return;
    }

    const session = await this.voiceService.createScreenShare(
      data.channelId, client.userId, client.id, data.streamId || "",
    );
    if (!session) {
      client.emit("screen:share-error", {
        code: "SCREEN_SHARE_ALREADY_ACTIVE",
        message: "You already have an active screen share in this channel",
      });
      return;
    }

    const payload = {
      shareId: session.shareId,
      channelId: session.channelId,
      presenterId: session.presenterUserId,
      streamId: session.streamId,
    };
    client.to(`voice:${data.channelId}`).emit("screen:share-started", payload);
    client.emit("screen:share-started", payload);
  }

  @SubscribeMessage("screen:share-stop")
  async handleScreenShareStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string; shareId?: string },
  ): Promise<void> {
    if (!client.userId || !data?.channelId) return;
    let session = null;
    if (data.shareId) {
      session = await this.voiceService.getScreenShare(data.shareId);
      if (!session || session.channelId !== data.channelId) return;
      // Socket-specific ownership: only the socket that started the share may stop it.
      if (session.presenterSocketId && session.presenterSocketId !== client.id) return;
    } else {
      // Legacy path: find this socket's share in the channel
      session = await this.voiceService.findScreenShareByUser(data.channelId, client.userId);
      if (!session || (session.presenterSocketId && session.presenterSocketId !== client.id)) return;
    }

    const removed = await this.voiceService.removeScreenShare(session.shareId);
    if (!removed) return;
    const payload = {
      shareId: removed.shareId,
      channelId: removed.channelId,
      presenterId: removed.presenterUserId,
    };
    client.to(`voice:${data.channelId}`).emit("screen:share-stopped", payload);
    client.emit("screen:share-stopped", payload);
  }

  @SubscribeMessage("screen:share-state")
  async handleScreenShareState(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: string },
  ): Promise<void> {
    if (!client.userId || !data?.channelId) return;
    if (client.voiceChannel !== data.channelId) return;
    const canViewShares = await this.permissionService.hasChannelPermission(
      data.channelId,
      client.userId,
      PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT,
    );
    if (!canViewShares) return;
    await this.emitScreenShareState(client, data.channelId);
  }

  private async emitScreenShareState(client: AuthSocket, channelId: string): Promise<void> {
    const shares = await this.voiceService.listScreenShares(channelId);
    client.emit("screen:share-state", {
      channelId,
      shares: shares.map((s) => ({
        shareId: s.shareId,
        presenterId: s.presenterUserId,
        streamId: s.streamId,
      })),
    });
  }

  @SubscribeMessage("screen:viewer-join")
  async handleScreenViewerJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { shareId: string },
  ): Promise<void> {
    if (!client.userId || !data?.shareId) return;
    const session = await this.voiceService.getScreenShare(data.shareId);
    if (!session) {
      client.emit("screen:viewer-error", { code: "SCREEN_SHARE_NOT_FOUND", message: "Screen share not found" });
      return;
    }
    if (client.voiceChannel !== session.channelId || !await this.hasScreenShareViewerAccess(client.userId, session)) {
      client.emit("screen:viewer-error", { code: "SCREEN_VIEWER_NOT_ALLOWED", message: "Join the share's voice channel first" });
      return;
    }
    if (session.presenterSocketId === client.id) {
      client.emit("screen:viewer-error", { code: "SCREEN_PRESENTER_CANNOT_VIEW", message: "Presenters cannot join their own share" });
      return;
    }

    const added = await this.voiceService.addScreenShareViewer(session.shareId, client.id, client.userId);
    const payload = { shareId: session.shareId, viewerId: client.userId };
    client.emit("screen:viewer-joined", payload);
    if (added) this.emitScreenViewerJoined({ ...session, viewerSocketId: client.id, viewerUserId: client.userId });
  }

  @SubscribeMessage("screen:viewer-leave")
  async handleScreenViewerLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { shareId: string },
  ): Promise<void> {
    if (!client.userId || !data?.shareId) return;
    const removed = await this.voiceService.removeScreenShareViewer(data.shareId, client.id);
    if (!removed) return;
    const payload = { shareId: removed.shareId, viewerId: removed.viewerUserId };
    client.emit("screen:viewer-left", payload);
    this.emitScreenViewerLeft(removed);
  }

  @SubscribeMessage("screen:viewer-state")
  async handleScreenViewerState(@ConnectedSocket() client: AuthSocket): Promise<void> {
    if (!client.userId) return;
    const subscribedShareIds = await this.voiceService.listScreenShareSubscriptionsForSocket(client.id);
    const presenterShares = client.voiceChannel
      ? (await this.voiceService.listScreenShares(client.voiceChannel))
        .filter((share) => share.presenterSocketId === client.id)
      : [];
    client.emit("screen:viewer-state", {
      subscribedShareIds,
      presenterShares: await Promise.all(presenterShares.map(async (share) => {
        const viewerIds = await this.voiceService.listScreenShareViewerIds(share.shareId);
        return { shareId: share.shareId, viewerIds, viewerCount: viewerIds.length };
      })),
    });
  }

  @SubscribeMessage("subscribe")
  async handleSubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelIds: string[] },
  ): Promise<void> {
    if (!client.userId || !data?.channelIds) return;
    const allowed: string[] = [];
    for (const channelId of data.channelIds) {
      try {
        const channel = await this.prisma.client.channel.findUnique({
          where: { id: channelId },
          select: { id: true, serverId: true },
        });
        if (!channel) continue;
        const member = await this.prisma.client.member.findUnique({
          where: { serverId_userId: { serverId: channel.serverId, userId: client.userId! } },
        });
        if (!member || member.isBanned) continue;
        const hasView = await this.permissionService.hasChannelPermission(
          channel.id, client.userId!, PERMISSIONS.VIEW_CHANNEL,
        );
        if (hasView) allowed.push(channelId);
      } catch { /* skip unauthorized channels */ }
    }
    for (const ch of allowed) {
      client.join(`channel:${ch}`);
    }
  }

  @SubscribeMessage("unsubscribe")
  handleUnsubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelIds: string[] },
  ): void {
    if (!data?.channelIds) return;
    for (const ch of data.channelIds) {
      client.leave(`channel:${ch}`);
    }
  }

  private async hasScreenShareViewerAccess(userId: string, session: ScreenShareSession): Promise<boolean> {
    try {
      const channel = await this.prisma.client.channel.findUnique({
        where: { id: session.channelId },
        select: { serverId: true, type: true },
      });
      if (!channel || channel.type !== "VOICE") return false;
      const member = await this.prisma.client.member.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
      });
      if (!member || member.isBanned) return false;
      return this.permissionService.hasChannelPermission(
        session.channelId,
        userId,
        PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT,
      );
    } catch {
      return false;
    }
  }

  private async hasVoiceSignalAccess(client: AuthSocket, channelId: string, targetUserId: string): Promise<boolean> {
    if (!client.userId || !channelId || client.voiceChannel !== channelId) return false;
    const [senderState, targetState, canConnect] = await Promise.all([
      this.voiceService.getVoiceState(channelId, client.userId),
      this.voiceService.getVoiceState(channelId, targetUserId),
      this.permissionService.hasChannelPermission(
        channelId,
        client.userId,
        PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT,
      ),
    ]);
    return !!senderState && !!targetState && canConnect;
  }

  private async evictSocketFromVoice(
    socket: AuthSocket,
    serverId: string,
    channelId: string,
    reason: "CONNECT" | "CHANNEL_DELETED" | "MEMBERSHIP_REMOVED" | "SERVER_DELETED",
  ): Promise<void> {
    if (!socket.userId) return;
    await this.cleanupScreenShareViewersForSocket(socket, channelId);
    const removed = await this.voiceService.removeScreenSharesForUser(socket.userId, socket.id);
    for (const share of removed) {
      this.server.to(`voice:${share.channelId}`).emit("screen:share-stopped", {
        shareId: share.shareId,
        channelId: share.channelId,
        presenterId: share.presenterUserId,
      });
    }
    await this.voiceService.leave(channelId, socket.userId);
    socket.to(`voice:${channelId}`).emit("voice:user-left", { userId: socket.userId, channelId });
    socket.leave(`voice:${channelId}`);
    socket.voiceChannel = undefined;
    socket.emit("voice:permission-revoked", { serverId, reason });
    this.emitVoiceOccupancyChanged(serverId);
  }

  private async cleanupScreenShareViewersForSocket(client: AuthSocket, channelId?: string): Promise<void> {
    const removed = await this.voiceService.removeScreenShareViewersForSocket(client.id, channelId);
    for (const subscription of removed) this.emitScreenViewerLeft(subscription);
  }

  emitToChannel(channelId: string, event: string, data: unknown): void {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  async emitAvatarUpdated(userId: string): Promise<void> {
    const memberships = await this.prisma.client.member.findMany({
      where: { userId, isBanned: false }, select: { serverId: true },
    });
    const rooms = [...new Set([`user:${userId}`, ...memberships.map((member) => `server:${member.serverId}`)])];
    this.server.to(rooms).emit("user:avatar-updated", { userId });
  }

  emitScreenViewerJoined(subscription: ScreenShareViewerSubscription): void {
    this.server.to(subscription.presenterSocketId).emit("screen:viewer-joined", {
      shareId: subscription.shareId,
      viewerId: subscription.viewerUserId,
    });
  }

  emitScreenViewerLeft(subscription: ScreenShareViewerSubscription): void {
    this.server.to(subscription.presenterSocketId).emit("screen:viewer-left", {
      shareId: subscription.shareId,
      viewerId: subscription.viewerUserId,
    });
  }

  emitToServer(serverId: string, event: string, data: unknown): void {
    this.server.to(`server:${serverId}`).emit(event, data);
  }

  emitVoiceOccupancyChanged(serverId: string): void {
    this.emitToServer(serverId, "voice:occupancy-changed", { serverId });
  }

  /**
   * Channel lists are permission-filtered through HTTP. The socket event is an
   * intentionally metadata-free invalidation so a server room never receives
   * private channel names, IDs, or types from the realtime transport.
   */
  emitChannelLifecycleChange(serverId: string): void {
    this.emitToServer(serverId, "channels:changed", { serverId });
    this.emitVoiceOccupancyChanged(serverId);
  }

  async emitChannelPermissionsChanged(serverId: string, channelIds: string[]): Promise<void> {
    this.emitToServer(serverId, "permissions:changed", { serverId });
    this.emitVoiceOccupancyChanged(serverId);
    await this.reconcileChannelPermissions(serverId, channelIds);
  }

  async emitServerPermissionsChanged(serverId: string): Promise<void> {
    const channels = await this.prisma.client.channel.findMany({ where: { serverId }, select: { id: true } });
    await this.emitChannelPermissionsChanged(serverId, channels.map((channel) => channel.id));
  }

  /**
   * Remove rooms and active media state immediately after authorization
   * changes. HTTP/sidebar reconciliation is not trusted as an eviction path.
   */
  async reconcileChannelPermissions(serverId: string, channelIds: string[]): Promise<void> {
    const namespaceSockets = this.getConnectedSockets();
    if (!namespaceSockets || channelIds.length === 0) return;
    const affected = new Set(channelIds);

    for (const rawSocket of namespaceSockets.values()) {
      const socket = rawSocket as AuthSocket;
      if (!socket.userId) continue;

      for (const channelId of affected) {
        if (!socket.rooms.has(`channel:${channelId}`)) continue;
        if (!await this.permissionService.hasChannelPermission(channelId, socket.userId, PERMISSIONS.VIEW_CHANNEL)) {
          socket.leave(`channel:${channelId}`);
          socket.emit("channel:permission-revoked", { serverId });
        }
      }

      if (!socket.voiceChannel || !affected.has(socket.voiceChannel)) continue;
      const voiceChannelId = socket.voiceChannel;
      const permissions = await this.permissionService.getChannelPermissions(voiceChannelId, socket.userId);
      const canRemain = (permissions & (PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT)) ===
        (PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT);
      if (!canRemain) {
        await this.evictSocketFromVoice(socket, serverId, voiceChannelId, "CONNECT");
        continue;
      }

      if ((permissions & PERMISSIONS.SPEAK) === 0n) {
        await this.voiceService.updateMute(voiceChannelId, socket.userId, true);
        socket.to(`voice:${voiceChannelId}`).emit("voice:state-updated", {
          userId: socket.userId,
          channelId: voiceChannelId,
          isMuted: true,
        });
        socket.emit("voice:speak-permission-revoked", { serverId });
        this.emitVoiceOccupancyChanged(serverId);
      }

      if ((permissions & PERMISSIONS.STREAM) === 0n) {
        const removed = await this.voiceService.removeScreenSharesForUser(socket.userId, socket.id);
        for (const share of removed) {
          this.server.to(`voice:${share.channelId}`).emit("screen:share-stopped", {
            shareId: share.shareId,
            channelId: share.channelId,
            presenterId: share.presenterUserId,
          });
        }
        if (removed.length > 0) socket.emit("screen:share-permission-revoked", { serverId });
      }
    }
  }

  async evictChannelParticipants(serverId: string, channelId: string): Promise<void> {
    const namespaceSockets = this.getConnectedSockets();
    if (!namespaceSockets) return;
    for (const rawSocket of namespaceSockets.values()) {
      const socket = rawSocket as AuthSocket;
      if (!socket.userId) continue;
      if (socket.rooms.has(`channel:${channelId}`)) socket.leave(`channel:${channelId}`);
      if (socket.voiceChannel === channelId) await this.evictSocketFromVoice(socket, serverId, channelId, "CHANNEL_DELETED");
    }
  }

  emitToVoiceChannel(channelId: string, event: string, data: unknown): void {
    this.server.to(`voice:${channelId}`).emit(event, data);
  }

  async evictUserFromServer(userId: string, serverId: string): Promise<void> {
    // Fetch channel IDs belonging to this server so we can leave their rooms
    const serverChannels = await this.prisma.client.channel.findMany({
      where: { serverId },
      select: { id: true },
    });
    await this.evictSocketsFromServer(new Set([userId]), serverId, serverChannels.map((channel) => channel.id), "MEMBERSHIP_REMOVED");
  }

  async convergeUserLeftServer(userId: string, serverId: string, channelIds: string[]): Promise<void> {
    this.emitToUser(userId, "server:membership-removed", { serverId });
    await this.evictSocketsFromServer(new Set([userId]), serverId, channelIds, "MEMBERSHIP_REMOVED");
    this.emitToServer(serverId, "server:member-left", { serverId });
  }

  async convergeDeletedServer(serverId: string, userIds: string[], channelIds: string[]): Promise<void> {
    const affected = new Set(userIds);
    for (const userId of affected) this.emitToUser(userId, "server:deleted", { serverId });
    await this.evictSocketsFromServer(affected, serverId, channelIds, "SERVER_DELETED");
  }

  private async evictSocketsFromServer(
    userIds: Set<string>,
    serverId: string,
    channelIds: string[],
    reason: "MEMBERSHIP_REMOVED" | "SERVER_DELETED",
  ): Promise<void> {
    const namespaceSockets = this.getConnectedSockets();
    if (!namespaceSockets) return;
    const channelSet = new Set(channelIds);

    for (const rawSocket of namespaceSockets.values()) {
      const socket = rawSocket as AuthSocket;
      if (!socket.userId || !userIds.has(socket.userId)) continue;

      if (socket.voiceChannel && channelSet.has(socket.voiceChannel)) {
        await this.evictSocketFromVoice(socket, serverId, socket.voiceChannel, reason);
      } else {
        try { await this.cleanupScreenShareViewersForSocket(socket); } catch { /* best-effort ephemeral cleanup */ }
        try {
          const removed = await this.voiceService.removeScreenSharesForUser(socket.userId, socket.id);
          for (const share of removed) {
            this.server.to(`voice:${share.channelId}`).emit("screen:share-stopped", {
              shareId: share.shareId, channelId: share.channelId, presenterId: share.presenterUserId,
            });
          }
        } catch { /* best-effort ephemeral cleanup */ }
      }

      await Promise.resolve(socket.leave(`server:${serverId}`));
      for (const channelId of channelSet) await Promise.resolve(socket.leave(`channel:${channelId}`));
      socket.serverMemberships = (socket.serverMemberships || []).filter((membership) => membership !== serverId);
    }
  }

  @SubscribeMessage("presence:heartbeat")
  async handlePresenceHeartbeat(@ConnectedSocket() client: AuthSocket): Promise<void> {
    if (client.userId) {
      await this.presenceService.heartbeat(client.userId);
    }
  }

  @SubscribeMessage("presence:get-state")
  async handleGetPresenceState(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { serverId: string },
  ): Promise<void> {
    if (!client.userId || !data?.serverId) return;
    if (!await this.permissionService.canAccessServer(data.serverId, client.userId)) return;
    const members = await this.prisma.client.member.findMany({
      where: { serverId: data.serverId, isBanned: false },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    const presenceMap = await this.presenceService.getAll(userIds);
    const presences = Array.from(presenceMap.entries()).map(([userId, entry]) => ({
      userId, status: entry.status, lastSeen: entry.lastSeen,
    }));
    client.emit("presence:state", { serverId: data.serverId, presences });
  }

  @SubscribeMessage("presence:set-status")
  async handleSetStatus(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { status: PresenceStatus },
  ): Promise<void> {
    if (!client.userId || !data?.status) return;
    await this.presenceService.set(client.userId, data.status);
    if (client.serverMemberships) {
      this.server.to(client.serverMemberships.map((s) => `server:${s}`)).emit("presence:update", {
        userId: client.userId, status: data.status,
      });
    }
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!cookieHeader) return result;
    for (const pair of cookieHeader.split(";")) {
      const [key, ...val] = pair.trim().split("=");
      if (key) result[key] = val.join("=");
    }
    return result;
  }

  /** Join every connected socket for a user only after active membership exists. */
  async joinUserToServer(userId: string, serverId: string): Promise<void> {
    const membership = await this.prisma.client.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
      select: { isBanned: true },
    });
    if (!membership || membership.isBanned) return;

    const namespaceSockets = this.getConnectedSockets();
    if (!namespaceSockets) return;
    const joins: Promise<void>[] = [];
    for (const rawSocket of namespaceSockets.values()) {
      const socket = rawSocket as AuthSocket;
      if (socket.userId !== userId) continue;
      joins.push(Promise.resolve(socket.join(`server:${serverId}`)).then(() => {
        socket.serverMemberships = Array.from(new Set([...(socket.serverMemberships || []), serverId]));
      }));
    }
    await Promise.all(joins);
  }

  private getConnectedSockets(): Map<string, Socket> | undefined {
    // Nest supplies a Socket.IO Namespace when a namespace is configured and
    // a Server otherwise. Namespace.sockets is already the Map; on a Server
    // the Map lives at server.sockets.sockets.
    const socketContainer = (this.server as any)?.sockets;
    const sockets = socketContainer?.sockets ?? socketContainer;
    return sockets && typeof sockets.values === "function" ? sockets as Map<string, Socket> : undefined;
  }
}
