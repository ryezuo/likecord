"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/ws";

export interface VoiceOccupancyMember {
  userId: string;
  username: string;
  displayName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface VoiceOccupancyChannel {
  channelId: string;
  members: VoiceOccupancyMember[];
}

interface VoiceOccupancySnapshot {
  serverId: string;
  channels: VoiceOccupancyChannel[];
}

export interface VoiceOccupancyState {
  channels: VoiceOccupancyChannel[];
  ready: boolean;
  /** Synchronous dispatch guard, including invalidations before React commits. */
  isCurrent: () => boolean;
}
interface OccupancyRead {
  scope: string;
  snapshot: VoiceOccupancySnapshot | null;
  ready: boolean;
}

function isOccupancySnapshot(value: unknown, serverId: string): value is VoiceOccupancySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<VoiceOccupancySnapshot>;
  return snapshot.serverId === serverId && Array.isArray(snapshot.channels);
}

export function useVoiceOccupancy(
  serverId: string | null,
  authenticated: boolean,
  readyVersion: number,
  callChannelId: string | null = null,
): VoiceOccupancyState {
  const callChannelRef = useRef(callChannelId);
  callChannelRef.current = callChannelId;
  const scope = `${authenticated}:${serverId}:${readyVersion}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const currentRef = useRef(false);
  const [state, setState] = useState<OccupancyRead | null>(null);
  const acceptedRead = useRef<OccupancyRead | null>(null);

  useEffect(() => {
    if (!authenticated || !serverId) return;
    const socket = getSocket();
    // Some composition tests intentionally provide a minimal socket facade.
    // Occupancy is optional metadata, so an incomplete transport fails closed.
    if (!socket || typeof socket.on !== "function" || typeof socket.off !== "function" || typeof socket.emit !== "function") return;

    let active = true;
    let refreshQueued = false;
    let generation = 0;
    currentRef.current = false;

    const refresh = () => {
      if (!socket.connected) {
        currentRef.current = false;
        setState({ scope, snapshot: null, ready: false });
        return;
      }
      const request = generation;
      socket.emit("voice:occupancy:get", { serverId }, (response: unknown) => {
        if (!active || request !== generation || scopeRef.current !== scope || !socket.connected) return;
        const valid = isOccupancySnapshot(response, serverId);
        currentRef.current = valid;
        const next = { scope, snapshot: valid ? response : null, ready: valid };
        acceptedRead.current = next;
        setState(next);
      });
    };
    const queueRefresh = () => {
      generation++;
      currentRef.current = false;
      setState((previous) => previous?.scope === scope ? { ...previous, ready: false } : null);
      if (refreshQueued) return;
      refreshQueued = true;
      void Promise.resolve().then(() => {
        refreshQueued = false;
        if (active) refresh();
      });
    };
    const handleInvalidation = (data: { serverId?: string }) => {
      if (data?.serverId === serverId) queueRefresh();
    };
    const handleDisconnect = () => {
      generation++;
      currentRef.current = false;
      if (active) setState({ scope, snapshot: null, ready: false });
    };
    const handleAccessInvalidation = (data: { serverId?: string }) => {
      if (data?.serverId !== serverId) return;
      handleDisconnect();
      queueRefresh();
    };
    // This event only reaches the current call. Remove known departures now,
    // before the broader observer snapshot catches up, using the same owner.
    const handleUserLeft = (data: { userId: string }) => {
      if (!callChannelRef.current) return;
      setState((previous) => previous?.scope === scope && previous.snapshot ? {
        ...previous, snapshot: { ...previous.snapshot, channels: previous.snapshot.channels.map((channel) => ({
          ...channel, members: channel.channelId === callChannelRef.current
            ? channel.members.filter((member) => member.userId !== data.userId) : channel.members,
        })) },
      } : previous);
      queueRefresh();
    };

    socket.on("voice:occupancy-changed", handleInvalidation);
    socket.on("permissions:changed", handleAccessInvalidation);
    socket.on("channels:changed", handleAccessInvalidation);
    socket.on("voice:user-left", handleUserLeft);
    socket.on("disconnect", handleDisconnect);
    queueRefresh();

    return () => {
      active = false;
      currentRef.current = false;
      socket.off("voice:occupancy-changed", handleInvalidation);
      socket.off("permissions:changed", handleAccessInvalidation);
      socket.off("channels:changed", handleAccessInvalidation);
      socket.off("voice:user-left", handleUserLeft);
      socket.off("disconnect", handleDisconnect);
    };
  }, [authenticated, readyVersion, serverId, scope]);

  return {
    channels: state?.scope === scope ? state.snapshot?.channels ?? [] : [],
    ready: state?.scope === scope && state.ready,
    isCurrent: () => state === acceptedRead.current && state?.scope === scope && scopeRef.current === scope && currentRef.current,
  };
}
