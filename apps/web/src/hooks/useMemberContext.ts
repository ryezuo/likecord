"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { memberApi, roleApi, serverApi, type Role, type ServerMember } from "../lib/api";
import { buildMemberContextActions, memberIdentity, type MemberContextAction } from "../lib/memberContextActions";
import { isContextInvokerAvailable } from "../lib/contextFocus";
import type { VoiceOccupancyState } from "./useVoiceOccupancy";
import type { useWebSocket } from "./useWebSocket";

const EMPTY_OCCUPANCY: VoiceOccupancyState = { channels: [], ready: true, isCurrent: () => true };
interface Options {
  serverId: string | null;
  myUserId?: string;
  ownerId?: string;
  effectivePermissions?: string;
  connected?: boolean;
  readyVersion?: number;
  refreshKey?: number;
  on?: ReturnType<typeof useWebSocket>["on"];
  occupancy?: VoiceOccupancyState;
}
interface MemberSnapshot {
  scope: string;
  members: ServerMember[];
  roles: Role[];
  server: Awaited<ReturnType<typeof serverApi.get>>;
}
export interface MemberContextEntry {
  userId: string;
  origin: "member" | "voice";
  channelId?: string;
  invoker: HTMLElement;
  fallback: HTMLElement | null;
  x: number;
  y: number;
  epoch: number;
  scope: string;
}

export function useMemberContext({ serverId, myUserId, ownerId, effectivePermissions, connected = true,
  readyVersion = 0, refreshKey = 0, on, occupancy = EMPTY_OCCUPANCY }: Options) {
  const scope = `${serverId ?? ""}:${myUserId ?? ""}`;
  const latest = useRef({ scope, connected, occupancy });
  latest.current = { scope, connected, occupancy };
  const epoch = useRef(0);
  const request = useRef(0);
  const snapshotRef = useRef<MemberSnapshot | null>(null);
  const knownSnapshotRef = useRef<MemberSnapshot | null>(null);
  const pendingRef = useRef<{ scope: string } | null>(null);
  const [snapshot, setSnapshot] = useState<MemberSnapshot | null>(null);
  const [entry, setEntry] = useState<MemberContextEntry | null>(null);
  const [confirmation, setConfirmation] = useState<{ entry: MemberContextEntry; snapshot: MemberSnapshot; action: MemberContextAction; username: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(false);
  const [authorityRevision, setAuthorityRevision] = useState(0);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  const invalidate = useCallback(() => {
    epoch.current++;
    request.current++;
    snapshotRef.current = null;
    setAuthorityRevision((revision) => revision + 1);
    setEntry(null);
    setConfirmation(null);
  }, []);

  const refresh = useCallback(async () => {
    const generation = ++request.current;
    snapshotRef.current = null;
    if (!serverId || !myUserId || !latest.current.connected || latest.current.scope !== scope) return null;
    setLoading(true);
    setLoadError("");
    try {
      const [members, roles, server] = await Promise.all([
        memberApi.list(serverId), roleApi.list(serverId), serverApi.get(serverId),
      ]);
      if (generation !== request.current || latest.current.scope !== scope) return null;
      if (server.id !== serverId) throw new Error("Member context is unavailable.");
      const next = { scope, server, members: members.filter((member) => member.serverId === serverId && !member.isBanned),
        roles: roles.filter((role) => role.serverId === serverId) };
      snapshotRef.current = next;
      knownSnapshotRef.current = next;
      setSnapshot(next);
      return next;
    } catch (error) {
      if (generation === request.current && latest.current.scope === scope) {
        setLoadError(error instanceof Error ? error.message : "Could not load member actions.");
      }
      return null;
    } finally {
      if (generation === request.current && latest.current.scope === scope) setLoading(false);
    }
  }, [serverId, myUserId, scope]);

  useLayoutEffect(() => {
    invalidate();
    setFeedback(null);
  }, [scope, ownerId, effectivePermissions, connected, readyVersion, refreshKey, invalidate]);
  useLayoutEffect(() => { setPending(false); }, [scope]);
  useEffect(() => {
    void refresh();
    return () => { epoch.current++; request.current++; snapshotRef.current = null; };
  }, [refresh, ownerId, effectivePermissions, connected, readyVersion, refreshKey]);

  // These are existing member-authority events, not another occupancy owner.
  // Increment the guard synchronously, before React/refetch can expose old UI.
  useEffect(() => {
    if (!on || !serverId) return;
    const reconcile = (data: { serverId?: string }) => {
      if (data?.serverId !== serverId) return;
      invalidate();
      void refresh();
    };
    const removed = (data: { memberId?: string; userId?: string }) => {
      if (knownSnapshotRef.current?.scope !== scope || !knownSnapshotRef.current.members.some((member) => member.id === data?.memberId && member.userId === data?.userId)) return;
      invalidate();
      setSnapshot((current) => current?.scope === scope ? { ...current,
        members: current.members.filter((member) => member.id !== data.memberId),
      } : current);
      void refresh();
    };
    const serverRemoved = (data: { serverId?: string }) => { if (data?.serverId === serverId) invalidate(); };
    const cleanups = [on("server:member-joined", reconcile), on("server:member-left", reconcile),
      on("permissions:changed", reconcile), on("member:removed", removed), on("disconnect", invalidate),
      ...["server:kicked", "server:banned", "server:membership-removed", "server:deleted"].map((event) => on(event, serverRemoved))];
    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, [on, serverId, scope, invalidate, refresh]);

  const members = snapshot?.scope === scope ? snapshot.members : [];
  const voiceChannelFor = (userId: string) => userId !== myUserId && occupancy.ready
    ? occupancy.channels.find((channel) => channel.members.some((member) => member.userId === userId))?.channelId : undefined;
  const contextValid = (context: MemberContextEntry) => {
    if (context.scope !== latest.current.scope || context.epoch !== epoch.current || !latest.current.connected || !isContextInvokerAvailable(context.invoker)) return false;
    return !context.channelId || latest.current.occupancy.channels.some((channel) => channel.channelId === context.channelId
      && channel.members.some((member) => member.userId === context.userId));
  };
  const dispatchValid = (context: MemberContextEntry, data: MemberSnapshot | null) => contextValid(context)
    && !!data && snapshotRef.current === data && (!context.channelId || latest.current.occupancy.isCurrent());

  const open = (userId: string, origin: MemberContextEntry["origin"], trigger: { invoker: HTMLElement; x: number; y: number }, fallback: HTMLElement | null, channelId?: string) => {
    if (!serverId || !myUserId || !connected || pendingRef.current?.scope === scope) return;
    const visibleChannel = origin === "voice" ? channelId : voiceChannelFor(userId);
    if (origin === "member" && !members.some((member) => member.userId === userId)) return;
    if (origin === "voice" && (!visibleChannel || !occupancy.isCurrent())) return;
    invalidate();
    const next = { ...trigger, userId, origin, channelId: visibleChannel, fallback, scope, epoch: epoch.current };
    if (!contextValid(next)) return;
    setFeedback(null);
    setEntry(next);
    void refresh();
  };

  useLayoutEffect(() => {
    const context = entry ?? confirmation?.entry;
    if (!context) return;
    const missingMember = !loading && !loadError && snapshotRef.current && !snapshotRef.current.members.some((member) => member.userId === context.userId);
    if (!contextValid(context) || missingMember) invalidate();
  });

  const execute = async (action: MemberContextAction, context: MemberContextEntry, data: MemberSnapshot) => {
    if (!dispatchValid(context, data) || pendingRef.current?.scope === scope) return false;
    const target = data.members.find((member) => member.userId === context.userId);
    if (!target || !serverId) return false;
    const operation = { scope };
    pendingRef.current = operation;
    setPending(true);
    setFeedback(null);
    try {
      const command = action.command;
      if (command.kind === "role") {
        await (command.assigned ? roleApi.removeFromMember : roleApi.assignToMember)(serverId, target.id, command.roleId);
      } else if (command.kind === "copy") {
        await navigator.clipboard.writeText(target.userId);
      } else {
        await memberApi[command.kind](serverId, target.id);
      }
      if (latest.current.scope !== context.scope || epoch.current !== context.epoch) return true;
      if (command.kind === "copy") setFeedback({ error: false, text: "User ID copied." });
      else { invalidate(); await refresh(); }
      return true;
    } catch (error) {
      if (latest.current.scope === context.scope && epoch.current === context.epoch) setFeedback({ error: true,
        text: action.command.kind === "copy" ? "Could not copy User ID. Please try again."
          : error instanceof Error ? error.message : "Moderation action failed. Please try again.",
      });
      return false;
    } finally {
      if (pendingRef.current === operation) {
        pendingRef.current = null;
        if (latest.current.scope === scope) setPending(false);
      }
    }
  };

  const target = members.find((member) => member.userId === entry?.userId);
  const currentSnapshot = snapshotRef.current;
  const actions = target && currentSnapshot && myUserId && serverId ? buildMemberContextActions({
    ...currentSnapshot.server, serverId, myUserId, members: currentSnapshot.members, roles: currentSnapshot.roles, target,
  }) : { roles: [], moderation: [], utility: [] };
  const invoke = (action: MemberContextAction) => {
    if (!entry || !dispatchValid(entry, currentSnapshot) || !currentSnapshot) return;
    setEntry(null);
    if (action.command.kind === "kick" || action.command.kind === "ban") {
      setFeedback(null);
      setConfirmation({ entry, snapshot: currentSnapshot, action, username: target!.user.username });
    } else void execute(action, entry, currentSnapshot);
  };

  return {
    serverId, myUserId, ownerId, members, entry, actions, loading, loadError, pending, feedback, confirmation, authorityRevision,
    identity: target ? memberIdentity(target) : occupancy.channels.flatMap((channel) => channel.members)
      .find((member) => member.userId === entry?.userId)?.displayName || occupancy.channels.flatMap((channel) => channel.members)
      .find((member) => member.userId === entry?.userId)?.username || "Member",
    voiceChannelFor, open, invoke, invalidate, retry: () => { if (entry) setEntry(entry); void refresh(); },
    close: () => setEntry(null),
    closeOrigin: (origin: MemberContextEntry["origin"]) => {
      if (entry?.origin === origin || confirmation?.entry.origin === origin) invalidate();
    },
    canEditMix: () => !!entry && contextValid(entry) && latest.current.occupancy.isCurrent(),
    confirm: async () => {
      if (!confirmation) return;
      if (await execute(confirmation.action, confirmation.entry, confirmation.snapshot)) {
        setConfirmation((current) => current === confirmation ? null : current);
      }
    },
    cancel: () => { if (pendingRef.current?.scope !== scope) setConfirmation(null); },
    dismissFeedback: () => setFeedback(null),
  };
}

export type MemberContext = ReturnType<typeof useMemberContext>;
