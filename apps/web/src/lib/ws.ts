import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectWs(): Socket {
  if (socket?.connected) return socket;
  socket = io({
    path: "/api/v1/ws",
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });
  return socket;
}

export function disconnectWs(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
