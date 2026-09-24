"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { connectWs, disconnectWs, getSocket } from "../lib/ws";
import type { Socket } from "socket.io-client";

export function useWebSocket(authenticated: boolean): {
  connected: boolean;
  readyVersion: number;
  socket: Socket | null;
  subscribe: (channelIds: string[]) => void;
  unsubscribe: (channelIds: string[]) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
} {
  const [connected, setConnected] = useState(false);
  const [readyVersion, setReadyVersion] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const subRef = useRef<string[]>([]);
  const listenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  useEffect(() => {
    if (!authenticated) return;
    const s = connectWs();
    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      if (subRef.current.length > 0) s.emit("subscribe", { channelIds: subRef.current });
    };
    const onDisconnect = () => setConnected(false);
    const onReady = () => setReadyVersion((version) => version + 1);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("ws:ready", onReady);

    // Route effects may register while authentication is still resolving and
    // before a Socket.IO instance exists. Keep those declarative listeners and
    // attach them as soon as the authenticated socket is created.
    listenersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => s.on(event, handler));
    });

    if (s.connected) setConnected(true);

    // Heartbeat: periodically refresh presence TTL on server
    const heartbeat = setInterval(() => {
      if (s.connected) s.emit("presence:heartbeat");
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      // Clean up all registered listeners on this socket
      listenersRef.current.forEach((handlers, event) => {
        handlers.forEach((h) => s.off(event, h));
      });
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("ws:ready", onReady);
      disconnectWs();
      setConnected(false);
    };
  }, [authenticated]);

  const subscribe = useCallback((channelIds: string[]) => {
    const s = getSocket();
    subRef.current = channelIds;
    if (s?.connected) s.emit("subscribe", { channelIds });
  }, []);

  const unsubscribe = useCallback((channelIds: string[]) => {
    const s = getSocket();
    subRef.current = subRef.current.filter((id) => !channelIds.includes(id));
    if (s?.connected) s.emit("unsubscribe", { channelIds });
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void): (() => void) => {
    const s = getSocket();

    // Track even when no socket exists yet. The authenticated connection
    // effect above attaches pending handlers without requiring route effects
    // to rerun after auth bootstrap.
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);
    s?.on(event, handler);

    return () => {
      getSocket()?.off(event, handler);
      const handlers = listenersRef.current.get(event);
      handlers?.delete(handler);
      if (handlers?.size === 0) listenersRef.current.delete(event);
    };
  }, []);

  return { connected, readyVersion, socket, subscribe, unsubscribe, on };
}
