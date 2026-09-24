import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class WsSessionRegistryService {
  private readonly socketsBySession = new Map<string, Set<Socket>>();
  private readonly sessionBySocket = new Map<string, string>();

  associate(sessionId: string, socket: Socket): void {
    this.remove(socket);
    let sockets = this.socketsBySession.get(sessionId);
    if (!sockets) {
      sockets = new Set();
      this.socketsBySession.set(sessionId, sockets);
    }
    sockets.add(socket);
    this.sessionBySocket.set(socket.id, sessionId);
  }

  remove(socket: Socket): void {
    const sessionId = this.sessionBySocket.get(socket.id);
    if (!sessionId) return;
    this.sessionBySocket.delete(socket.id);
    const sockets = this.socketsBySession.get(sessionId);
    sockets?.delete(socket);
    if (sockets?.size === 0) this.socketsBySession.delete(sessionId);
  }

  disconnectSession(sessionId: string): number {
    const sockets = [...(this.socketsBySession.get(sessionId) ?? [])];
    this.quarantineSessions([sessionId]);
    let failed = false;
    for (const socket of sockets) {
      try {
        socket.emit("error", { code: "SESSION_REVOKED", message: "Session revoked" });
        socket.disconnect(true);
        this.remove(socket);
      } catch {
        failed = true;
      }
    }
    if (failed) throw new Error("SESSION_SOCKET_DISCONNECT_FAILED");
    return sockets.length;
  }

  disconnectSessions(sessionIds: Iterable<string>): number {
    let disconnected = 0;
    for (const sessionId of new Set(sessionIds)) disconnected += this.disconnectSession(sessionId);
    return disconnected;
  }

  count(sessionId: string): number {
    return this.socketsBySession.get(sessionId)?.size ?? 0;
  }

  quarantineSessions(sessionIds: Iterable<string>): number {
    let quarantined = 0;
    for (const sessionId of new Set(sessionIds)) {
      for (const socket of this.socketsBySession.get(sessionId) ?? []) {
        socket.data.authRevoked = true;
        quarantined += 1;
      }
    }
    return quarantined;
  }

  quarantinedCount(sessionId: string): number {
    let count = 0;
    for (const socket of this.socketsBySession.get(sessionId) ?? []) {
      if (socket.data.authRevoked === true) count += 1;
    }
    return count;
  }
}
