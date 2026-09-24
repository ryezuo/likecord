"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useMessages } from "../../hooks/useMessages";
import type { Attachment } from "../../hooks/useMessages";
import { useVoice } from "../../hooks/useVoice";
import { useMemberContext } from "../../hooks/useMemberContext";
import MemberContextSurface from "../../components/member/MemberContextSurface";
import { useVoiceOccupancy } from "../../hooks/useVoiceOccupancy";
import { usePathname, useRouter } from "next/navigation";
import { getSocket } from "../../lib/ws";
import {
  serverApi,
  channelApi,
  attachmentApi,
  navigationApi,
  roleApi,
  memberApi,
  type Role,
  type ServerMember,
} from "../../lib/api";
import { hasServerPermission, parsePermissionMask, SERVER_PERMISSIONS } from "../../lib/permissions";
import { serverRoute, textChannelRoute } from "../../lib/navigation";
import ServerSettings from "../../components/ServerSettings";
import type { ServerSettingsTab } from "../../components/ServerSettings";
import ServerRail from "../../components/layout/ServerRail";
import ChannelSidebar from "../../components/layout/ChannelSidebar";
import ChatArea from "../../components/layout/ChatArea";
import MemberPanel from "../../components/layout/MemberPanel";
import UserPanel from "../../components/layout/UserPanel";
import AppShellHeader from "../../components/layout/AppShellHeader";
import Home from "../../components/layout/Home";
import ConfirmModal from "../../components/ui/ConfirmModal";
import ScreenShareViewerWorkspace, { type ViewerStream } from "../../components/layout/ScreenShareViewerWorkspace";
import PermissionOverwriteEditor from "../../components/PermissionOverwriteEditor";
import AddServerModal, { type ServerEntryResult } from "../../components/AddServerModal";
import InvitePeopleModal from "../../components/InvitePeopleModal";
import SettingsLayer, { type SettingsNavigationGroup } from "../../components/settings/SettingsLayer";
import { AvatarProvider } from "../../hooks/useAvatars";
import UserSettings from "../../components/settings/UserSettings";

interface Server { id: string; name: string; ownerId: string; effectivePermissions?: string; }
interface Channel { id: string; name: string; type: string; categoryId: string | null; permissionsSynced: boolean; position: number; effectivePermissions?: string; }
interface Category { id: string; name: string; position: number; }
type DeleteTarget = { type: "channel"; value: Channel } | { type: "category"; value: Category } | null;
type EntitySettingsTab = "overview" | "permissions" | "delete";
type PermissionTransition = { action: "sync" | "unsync"; channel: Channel; categoryName: string } | null;
const MEMBER_PANEL_VISIBILITY_KEY = "member_panel_visible";

function actionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function AppContent({ showSendButton = false }: { showSendButton?: boolean }) {
  const { user, logout, updateProfile, changeEmail, changePassword } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { connected, readyVersion, subscribe, unsubscribe, on, socket } = useWebSocket(!!user);

  const routeSegments = pathname.split("/").filter(Boolean);
  const activeServerId = routeSegments[0] === "channels" && routeSegments[1] && routeSegments[1] !== "@me"
    ? routeSegments[1]
    : null;
  const routeChannelId = activeServerId && routeSegments.length === 3 ? routeSegments[2] : null;
  const isHome = pathname === "/channels/@me";

  const [servers, setServers] = useState<Server[]>([]);
  const [serversAccountId, setServersAccountId] = useState<string | null>(null);
  const [serversStatus, setServersStatus] = useState<"loading" | "ready" | "error">("loading");
  const [serversRetry, setServersRetry] = useState(0);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const visibleServers = serversAccountId === user?.id ? servers : [];
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resolvedChannelId, setResolvedChannelId] = useState<string | null>(null);
  const [routeStatus, setRouteStatus] = useState<"home" | "loading" | "channel-loading" | "channel" | "empty" | "unavailable">("loading");
  const [loadedServerId, setLoadedServerId] = useState<string | null>(null);
  const loadedServerIdRef = useRef<string | null>(null);
  const activeServerIdRef = useRef<string | null>(activeServerId);
  const removedServerIdsRef = useRef(new Set<string>());
  const lastPersistedNavigation = useRef<string | null>(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [inviteServerId, setInviteServerId] = useState<string | null>(null);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [channelSettingsTab, setChannelSettingsTab] = useState<EntitySettingsTab>("overview");
  const [categorySettingsTab, setCategorySettingsTab] = useState<EntitySettingsTab>("overview");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<ServerSettingsTab>("general");
  const [channelName, setChannelName] = useState("");
  const [channelCategoryId, setChannelCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelCategoryId, setEditChannelCategoryId] = useState("");
  const [channelError, setChannelError] = useState("");
  const [channelPending, setChannelPending] = useState(false);
  const [managementError, setManagementError] = useState("");
  const [newChannelType, setNewChannelType] = useState<"TEXT" | "VOICE">("TEXT");
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [privateRoles, setPrivateRoles] = useState<Role[]>([]);
  const [privateMembers, setPrivateMembers] = useState<ServerMember[]>([]);
  const [privateTargetsLoading, setPrivateTargetsLoading] = useState(false);
  const [privateRoleIds, setPrivateRoleIds] = useState<string[]>([]);
  const [privateMemberIds, setPrivateMemberIds] = useState<string[]>([]);
  const [permissionTransition, setPermissionTransition] = useState<PermissionTransition>(null);
  const [leaveServerId, setLeaveServerId] = useState<string | null>(null);
  const [leavePending, setLeavePending] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingIds, setUploadingIds] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [lastPayload, setLastPayload] = useState<string>("");
  const [lastAttCount, setLastAttCount] = useState<number>(0);
  const [memberPanelVisible, setMemberPanelVisible] = useState(true);
  const debugRef = useRef<HTMLDivElement>(null);

  // Async channel refetches must never overwrite the currently selected server.
  activeServerIdRef.current = activeServerId;

  // This is only a validation cache. Route IDs remain the sole navigation authority.
  const activeChannelId = routeChannelId && routeChannelId === resolvedChannelId ? routeChannelId : null;

  const dbg = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_ATTACHMENTS === "true") ||
    (typeof window !== "undefined" && (
      window.location.search.includes("debugAttachments=1") ||
      window.localStorage.getItem("debugAttachments") === "true"
    ));

  const addDebug = (msg: string) => {
    if (!dbg) return;
    console.log(`[Attach] ${msg}`);
    setDebugLog((prev) => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => { if (dbg) addDebug("Debug active"); }, [dbg]);
  useEffect(() => {
    setMemberPanelVisible(localStorage.getItem(MEMBER_PANEL_VISIBILITY_KEY) !== "false");
  }, []);

  const hasVoiceCapability = useCallback((channelId: string, capability: "CONNECT" | "SPEAK") => {
    const channel = channels.find((item) => item.id === channelId && item.type === "VOICE");
    if (!channel?.effectivePermissions) return false;
    return hasServerPermission(
      parsePermissionMask(channel.effectivePermissions),
      capability === "CONNECT" ? SERVER_PERMISSIONS.CONNECT : SERVER_PERMISSIONS.SPEAK,
    );
  }, [channels]);
  const voice = useVoice(activeServerId, !!user, user?.id, user?.username, user?.displayName, hasVoiceCapability);
  const voiceOccupancy = useVoiceOccupancy(activeServerId, !!user, readyVersion, voice.channelId);

  const [userStatus, setUserStatus] = useState<"ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE">("ONLINE");
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});

  // Listen for presence updates
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    const cleanupUpdate = on("presence:update", (data: { userId: string; status: string }) => {
      if (data.userId === user?.id) setUserStatus(data.status as any);
      setPresenceMap((prev) => ({ ...prev, [data.userId]: data.status }));
    });
    if (cleanupUpdate) cleanups.push(cleanupUpdate);

    const cleanupState = on("presence:state", (data: { serverId: string; presences: Array<{ userId: string; status: string }> }) => {
      const map: Record<string, string> = {};
      for (const p of data.presences) map[p.userId] = p.status;
      setPresenceMap((prev) => ({ ...prev, ...map }));
    });
    if (cleanupState) cleanups.push(cleanupState);

    return () => cleanups.forEach((c) => c());
  }, [on, user?.id]);

  // Request presence state when server changes
  useEffect(() => {
    if (!activeServerId) return;
    const s = getSocket();
    if (s?.connected) s.emit("presence:get-state", { serverId: activeServerId });
  }, [activeServerId]);

  const emitStatus = useCallback((status: "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE") => {
    const s = getSocket();
    if (s?.connected) s.emit("presence:set-status", { status });
    setUserStatus(status);
  }, []);

  const activeServer = visibleServers.find((s) => s.id === activeServerId);
  const activeChannel = channels.find((channel) => channel.id === activeChannelId);
  const textChannels = channels.filter((c) => c.type === "TEXT");
  const voiceChannels = channels.filter((c) => c.type === "VOICE");
  const isOwner = activeServer?.ownerId === user?.id;
  const effectivePermissions = parsePermissionMask(activeServer?.effectivePermissions);
  const canCreateInvite = isOwner || hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.CREATE_INVITE);
  const canManageChannels = hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.MANAGE_CHANNELS);
  const canManageServer = isOwner || hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.MANAGE_SERVER);
  const canManageRoles = hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.MANAGE_ROLES);
  const canModerateMembers = isOwner || [
    SERVER_PERMISSIONS.KICK_MEMBERS,
    SERVER_PERMISSIONS.BAN_MEMBERS,
    SERVER_PERMISSIONS.MUTE_MEMBERS,
  ].some((permission) => hasServerPermission(effectivePermissions, permission));
  const canOpenSettings = canManageServer || canManageRoles || canModerateMembers;
  const canManageChannelStructure = (channel: Channel) => hasServerPermission(
    parsePermissionMask(channel.effectivePermissions),
    SERVER_PERMISSIONS.MANAGE_CHANNELS,
  );
  const canAdministerChannelPermissions = (channel: Channel) => !!canManageRoles && hasServerPermission(
    parsePermissionMask(channel.effectivePermissions),
    SERVER_PERMISSIONS.VIEW_CHANNEL,
  );
  const activeChannelPermissions = parsePermissionMask(activeChannel?.effectivePermissions);
  const canSendMessages = !!activeChannel && hasServerPermission(activeChannelPermissions, SERVER_PERMISSIONS.SEND_MESSAGES);
  const canAttachFiles = !!activeChannel && hasServerPermission(activeChannelPermissions, SERVER_PERMISSIONS.ATTACH_FILES);
  const canManageMessages = !!activeChannel && hasServerPermission(activeChannelPermissions, SERVER_PERMISSIONS.MANAGE_MESSAGES);
  const canUseAttachments = canSendMessages && canAttachFiles;
  const canReadMessageHistory = !!activeChannel && hasServerPermission(activeChannelPermissions, SERVER_PERMISSIONS.READ_MESSAGE_HISTORY);
  const privateActorMember = privateMembers.find((member) => member.userId === user?.id);
  const privateActorHighestPosition = isOwner
    ? Number.POSITIVE_INFINITY
    : Math.max(0, ...(privateActorMember?.roles.map((membership) => membership.role.position) ?? []));
  const privateDefaultRole = privateRoles.find((role) => role.isDefault);
  const canUsePrivateChannelPreset = !!canManageChannels && !!canManageRoles && (
    !!isOwner || (
      hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.VIEW_CHANNEL) &&
      !!privateDefaultRole &&
      privateActorHighestPosition > privateDefaultRole.position
    )
  );
  const eligiblePrivateRoles = privateRoles
    .filter((role) => role.serverId === activeServerId && !role.isDefault && (isOwner || role.position < privateActorHighestPosition))
    .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name));
  const eligiblePrivateMembers = privateMembers
    .filter((member) => {
      if (member.serverId !== activeServerId || member.isBanned) return false;
      if (isOwner) return true;
      if (member.userId === user?.id || member.userId === activeServer?.ownerId) return false;
      const targetHighest = Math.max(0, ...member.roles.map((membership) => membership.role.position));
      return privateActorHighestPosition > targetHighest;
    })
    .sort((left, right) => left.user.displayName.localeCompare(right.user.displayName));
  const { messages, loadMore, hasMore, loading: msgsLoading, send, edit, remove, handleWsEvent } = useMessages(
    activeChannelId,
    canReadMessageHistory,
  );

  useEffect(() => {
    if (!canUseAttachments) {
      setPendingFiles([]);
      setUploadingIds([]);
    }
  }, [canUseAttachments]);

  useEffect(() => {
    if (showChannelModal && newChannelPrivate && !canUsePrivateChannelPreset) setNewChannelPrivate(false);
  }, [canUsePrivateChannelPreset, newChannelPrivate, showChannelModal]);

  const finalizeServerRemoval = useCallback((serverId: string) => {
    if (removedServerIdsRef.current.has(serverId)) return;
    removedServerIdsRef.current.add(serverId);
    setServers((current) => current.filter((server) => server.id !== serverId));
    setInviteServerId((current) => current === serverId ? null : current);
    if (activeServerIdRef.current === serverId) {
      voice.leave();
      router.replace("/channels/@me");
    }
  }, [router, voice]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    for (const ev of ["server:kicked", "server:banned", "server:membership-removed", "server:deleted"]) {
      const cleanup = on(ev, (data: any) => {
        const removedServerId = data?.serverId;
        if (!removedServerId) return;
        finalizeServerRemoval(removedServerId);
      });
      if (cleanup) cleanups.push(cleanup);
    }
    return () => cleanups.forEach((c) => c());
  }, [finalizeServerRemoval, on]);

  // Message WS events
  useEffect(() => {
    if (!activeChannelId) return;
    const cleanups: (() => void)[] = [];
    for (const ev of ["message:created", "message:updated", "message:deleted", "message:preview-updated"]) {
      const cleanup = on(ev, (data: any) => {
        const msgChannelId = data?.message?.channelId || data?.channelId;
        if (msgChannelId && msgChannelId !== activeChannelId) return;
        handleWsEvent(ev, data);
      });
      if (cleanup) cleanups.push(cleanup);
    }
    return () => cleanups.forEach((c) => c());
  }, [activeChannelId, on, handleWsEvent]);

  useEffect(() => {
    if (activeChannelId) { subscribe([activeChannelId]); }
    return () => { if (activeChannelId) unsubscribe([activeChannelId]); };
  }, [activeChannelId, subscribe, unsubscribe]);

  useEffect(() => { removedServerIdsRef.current.clear(); }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setServersStatus("loading");
    if (!user?.id) {
      setServers([]);
      setServersAccountId(null);
      return;
    }
    const accountId = user.id;
    void serverApi.list().then((list) => {
      if (cancelled) return;
      setServers(list);
      setServersAccountId(accountId);
      setServersStatus("ready");
    }).catch(() => {
      if (!cancelled) setServersStatus("error");
    });
    return () => { cancelled = true; };
  }, [user?.id, isHome, readyVersion, homeRefreshKey, serversRetry]);

  useEffect(() => {
    if (!isHome) return;
    const cleanups = [
      "permissions:changed", "channels:changed", "server:kicked", "server:banned",
      "server:membership-removed", "server:deleted", "server:member-joined", "server:member-left",
    ].map((event) => on(event, () => setHomeRefreshKey((key) => key + 1)));
    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, [isHome, on]);

  const loadChannels = useCallback(async (serverId: string, resolveMissingRoute = false) => {
    const ch = await channelApi.list(serverId).catch(() => []);
    if (activeServerIdRef.current !== serverId) return;
    setChannels(ch);
    if (resolveMissingRoute && routeChannelId && !ch.some((channel) => channel.id === routeChannelId && channel.type === "TEXT")) {
      setResolvedChannelId(null);
      setRouteStatus("channel-loading");
      router.replace(serverRoute(serverId));
    }
  }, [routeChannelId, router]);

  const loadCategories = useCallback(async (serverId: string) => {
    // The category endpoint is independently permission-filtered. Missing
    // categories are never reconstructed from Channel.categoryId on the client.
    const listCategories = channelApi.listCategories;
    if (!listCategories) {
      if (activeServerIdRef.current === serverId) setCategories([]);
      return;
    }
    const nextCategories = await listCategories(serverId).catch(() => []);
    if (activeServerIdRef.current === serverId) setCategories(nextCategories);
  }, []);

  useEffect(() => {
    if (!activeServerId) {
      setCategories([]);
      return;
    }
    void loadCategories(activeServerId);
  }, [activeServerId, loadCategories]);

  const refreshServerAuthorization = useCallback(async (serverId: string) => {
    try {
      const refreshed = await serverApi.get(serverId);
      setServers((current) => current.map((server) => server.id === serverId ? { ...server, ...refreshed } : server));
    } catch {
      // Membership loss is reconciled by the existing kick/ban and list flows.
    }
  }, []);

  // Channel lifecycle messages deliberately carry no channel data. The API
  // remains authoritative and returns the caller's permission-filtered list.
  useEffect(() => {
    if (!activeServerId) return;

    const reconcile = (data: { serverId?: string }) => {
      if (data?.serverId !== activeServerId) return;
      void loadChannels(activeServerId, true);
      void loadCategories(activeServerId);
    };
    const reconcilePermissions = (data: { serverId?: string }) => {
      if (data?.serverId !== activeServerId) return;
      void refreshServerAuthorization(activeServerId);
      void loadChannels(activeServerId, true);
      void loadCategories(activeServerId);
    };

    const cleanupChanged = on("channels:changed", reconcile);
    const cleanupPermissions = on("permissions:changed", reconcilePermissions);
    return () => {
      cleanupChanged?.();
      cleanupPermissions?.();
    };
  }, [activeServerId, loadCategories, loadChannels, on, refreshServerAuthorization]);

  useEffect(() => {
    if (!activeServerId || !readyVersion) return;
    void loadChannels(activeServerId, true);
    void loadCategories(activeServerId);
    void refreshServerAuthorization(activeServerId);
  }, [activeServerId, loadCategories, loadChannels, readyVersion, refreshServerAuthorization]);

  useEffect(() => {
    if (showSettingsModal && !canOpenSettings) setShowSettingsModal(false);
  }, [showSettingsModal, canOpenSettings]);

  useEffect(() => {
    if (editingChannel) {
      const canUseStructure = canManageChannelStructure(editingChannel);
      const canUsePermissions = canAdministerChannelPermissions(editingChannel);
      const activeSectionIsAccessible = channelSettingsTab === "permissions" ? canUsePermissions : canUseStructure;
      if (!activeSectionIsAccessible) {
        if (canUseStructure) setChannelSettingsTab("overview");
        else if (canUsePermissions) setChannelSettingsTab("permissions");
        else setEditingChannel(null);
      }
    }
    if (editingCategory) {
      const activeSectionIsAccessible = categorySettingsTab === "permissions" ? canManageRoles : canManageChannels;
      if (!activeSectionIsAccessible) {
        if (canManageChannels) setCategorySettingsTab("overview");
        else if (canManageRoles) setCategorySettingsTab("permissions");
        else setEditingCategory(null);
      }
    }
  }, [canManageChannels, canManageRoles, categorySettingsTab, channelSettingsTab, editingCategory, editingChannel]);

  useEffect(() => {
    if (!editingChannel || loadedServerId !== activeServerId) return;
    const refreshed = channels.find((channel) => channel.id === editingChannel.id);
    if (!refreshed) {
      setEditingChannel(null);
      return;
    }
    if (refreshed !== editingChannel) setEditingChannel(refreshed);
  }, [activeServerId, channels, editingChannel, loadedServerId]);

  useEffect(() => {
    if (!editingCategory || loadedServerId !== activeServerId) return;
    const refreshed = categories.find((category) => category.id === editingCategory.id);
    if (!refreshed) {
      setEditingCategory(null);
      return;
    }
    if (refreshed !== editingCategory) setEditingCategory(refreshed);
  }, [activeServerId, categories, editingCategory, loadedServerId]);

  useEffect(() => {
    let cancelled = false;

    if (isHome) {
      setResolvedChannelId(null);
      setRouteStatus("home");
      return () => { cancelled = true; };
    }
    if (!activeServerId) {
      setResolvedChannelId(null);
      setRouteStatus("unavailable");
      return () => { cancelled = true; };
    }

    const resolveRoute = async () => {
      try {
        const isLoadedServer = loadedServerIdRef.current === activeServerId;

        // A channel-only route transition must retain the loaded server shell.
        // This keeps the rails, member panel, voice state, and screen-share workspace
        // mounted while the destination text channel is validated.
        if (isLoadedServer) {
          setResolvedChannelId(null);
          setRouteStatus("channel-loading");

          if (routeChannelId) {
            const destination = await navigationApi.validateTextChannel(activeServerId, routeChannelId);
            if (cancelled) return;
            setResolvedChannelId(destination.channel.id);
            setRouteStatus("channel");
            return;
          }

          const destination = await navigationApi.resolveServer(activeServerId);
          if (cancelled) return;
          if (destination.channelId) {
            router.replace(textChannelRoute(activeServerId, destination.channelId));
            return;
          }
          setRouteStatus("empty");
          return;
        }

        setResolvedChannelId(null);
        setChannels([]);
        setRouteStatus("loading");

        if (routeChannelId) {
          const [loadedChannels, destination] = await Promise.all([
            channelApi.list(activeServerId),
            navigationApi.validateTextChannel(activeServerId, routeChannelId),
          ]);
          if (cancelled) return;
          setChannels(loadedChannels);
          loadedServerIdRef.current = activeServerId;
          setLoadedServerId(activeServerId);
          setResolvedChannelId(destination.channel.id);
          setRouteStatus("channel");
          return;
        }

        const [loadedChannels, destination] = await Promise.all([
          channelApi.list(activeServerId),
          navigationApi.resolveServer(activeServerId),
        ]);
        if (cancelled) return;
        setChannels(loadedChannels);
        loadedServerIdRef.current = activeServerId;
        setLoadedServerId(activeServerId);
        if (destination.channelId) {
          setRouteStatus("channel-loading");
          router.replace(textChannelRoute(activeServerId, destination.channelId));
          return;
        }
        setRouteStatus("empty");
      } catch {
        if (!cancelled) setRouteStatus("unavailable");
      }
    };
    void resolveRoute();
    return () => { cancelled = true; };
  }, [activeServerId, isHome, routeChannelId, router]);

  useEffect(() => {
    if (!activeServerId || !activeChannelId || routeStatus !== "channel") return;
    const navigationKey = `${activeServerId}:${activeChannelId}`;
    if (lastPersistedNavigation.current === navigationKey) return;
    lastPersistedNavigation.current = navigationKey;
    void navigationApi.setLastTextChannel(activeServerId, activeChannelId).catch(() => {
      console.warn("Failed to save last text channel preference");
    });
  }, [activeChannelId, activeServerId, routeStatus]);

  const completeServerEntry = useCallback(async (server: ServerEntryResult) => {
    removedServerIdsRef.current.delete(server.id);
    setServers((current) => {
      const existing = current.find((entry) => entry.id === server.id);
      const next = existing
        ? current.map((entry) => entry.id === server.id ? { ...entry, name: server.name, ownerId: server.ownerId ?? entry.ownerId } : entry)
        : [...current, { id: server.id, name: server.name, ownerId: server.ownerId ?? "" }];
      return Array.from(new Map(next.map((entry) => [entry.id, entry])).values());
    });
    try {
      const refreshed = await serverApi.list();
      setServers(Array.from(new Map(refreshed.map((entry) => [entry.id, entry])).values()));
    } catch {
      // Keep the successful operation result visible; canonical routing will refetch server state.
    }
    setShowAddServerModal(false);
    router.push(serverRoute(server.id));
  }, [router]);

  const deleteServer = useCallback(async (serverId: string) => {
    await serverApi.delete(serverId);
    finalizeServerRemoval(serverId);
  }, [finalizeServerRemoval]);

  const requestLeaveServer = useCallback((serverId: string) => {
    const server = servers.find((candidate) => candidate.id === serverId);
    if (!server || server.ownerId === user?.id) return;
    setLeaveError("");
    setLeaveServerId(serverId);
  }, [servers, user?.id]);

  const confirmLeaveServer = useCallback(async () => {
    if (!leaveServerId || leavePending) return;
    setLeavePending(true);
    setLeaveError("");
    try {
      await memberApi.leave(leaveServerId);
      finalizeServerRemoval(leaveServerId);
      setLeaveServerId(null);
    } catch (error: unknown) {
      setLeaveError(actionErrorMessage(error, "Failed to leave server. Please try again."));
    } finally {
      setLeavePending(false);
    }
  }, [finalizeServerRemoval, leavePending, leaveServerId]);

  const createChannel = async () => {
    if (!activeServerId || !channelName.trim() || channelPending) return;
    if (newChannelPrivate && !canUsePrivateChannelPreset) {
      setChannelError("You no longer have permission to create a Private Channel.");
      return;
    }
    setChannelError("");
    setChannelPending(true);
    try {
      await channelApi.create(activeServerId, {
        name: channelName.trim(),
        type: newChannelType,
        ...(channelCategoryId ? { categoryId: channelCategoryId } : {}),
        ...(newChannelPrivate ? {
          isPrivate: true,
          allowedRoleIds: privateRoleIds,
          allowedMemberIds: privateMemberIds,
        } : {}),
      });
      setShowChannelModal(false);
      setChannelName("");
      setChannelCategoryId("");
      setNewChannelPrivate(false);
      setPrivateRoleIds([]);
      setPrivateMemberIds([]);
      await Promise.all([loadChannels(activeServerId), loadCategories(activeServerId)]);
    } catch (error: unknown) {
      setChannelError(actionErrorMessage(error, "Failed to create channel"));
    } finally {
      setChannelPending(false);
    }
  };

  const openCreateChannel = (type: "TEXT" | "VOICE" = "TEXT", categoryId?: string) => {
    setChannelError("");
    setChannelName("");
    setNewChannelType(type);
    setChannelCategoryId(categoryId || "");
    setNewChannelPrivate(false);
    setPrivateRoles([]);
    setPrivateMembers([]);
    setPrivateTargetsLoading(false);
    setPrivateRoleIds([]);
    setPrivateMemberIds([]);
    setShowChannelModal(true);
    if (!activeServerId || !canManageChannels || !canManageRoles) return;
    setPrivateTargetsLoading(true);
    void (async () => {
      try {
        const [roles, members] = await Promise.all([roleApi.list(activeServerId), memberApi.list(activeServerId)]);
        if (activeServerIdRef.current !== activeServerId) return;
        setPrivateRoles(roles.filter((role) => role.serverId === activeServerId));
        setPrivateMembers(members.filter((member) => member.serverId === activeServerId));
      } catch {
        if (activeServerIdRef.current === activeServerId) {
          setPrivateRoles([]);
          setPrivateMembers([]);
        }
      } finally {
        if (activeServerIdRef.current === activeServerId) setPrivateTargetsLoading(false);
      }
    })();
  };

  const createCategory = async () => {
    if (!activeServerId || !categoryName.trim()) return;
    setManagementError("");
    try {
      await channelApi.createCategory(activeServerId, { name: categoryName.trim() });
      setShowCategoryModal(false);
      setCategoryName("");
      await loadCategories(activeServerId);
    } catch (error: unknown) {
      setManagementError(actionErrorMessage(error, "Failed to create category"));
    }
  };

  const openEditCategory = (category: Category) => {
    setManagementError("");
    setCategoryName(category.name);
    setCategorySettingsTab(canManageChannels ? "overview" : "permissions");
    setEditingCategory(category);
  };

  const openCategoryPermissions = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category || !canManageRoles) return;
    setManagementError("");
    setCategoryName(category.name);
    setCategorySettingsTab("permissions");
    setEditingChannel(null);
    setEditingCategory(category);
  };

  const updateCategory = async () => {
    if (!activeServerId || !editingCategory || !categoryName.trim()) return;
    setManagementError("");
    try {
      await channelApi.updateCategory(editingCategory.id, { name: categoryName.trim() });
      setEditingCategory(null);
      setCategoryName("");
      await loadCategories(activeServerId);
    } catch (error: unknown) {
      setManagementError(actionErrorMessage(error, "Failed to update category"));
    }
  };

  const openEditChannel = (channel: Channel) => {
    setManagementError("");
    setEditChannelName(channel.name);
    setEditChannelCategoryId(channel.categoryId || "");
    setChannelSettingsTab(canManageChannelStructure(channel) ? "overview" : "permissions");
    setEditingChannel(channel);
  };

  const updateChannel = async () => {
    if (!activeServerId || !editingChannel || !editChannelName.trim()) return;
    setManagementError("");
    try {
      await channelApi.update(editingChannel.id, {
        name: editChannelName.trim(),
        categoryId: editChannelCategoryId || null,
      });
      setEditingChannel(null);
      await Promise.all([loadChannels(activeServerId, true), loadCategories(activeServerId)]);
    } catch (error: unknown) {
      setManagementError(actionErrorMessage(error, "Failed to update channel"));
    }
  };

  const deleteStructuralTarget = async () => {
    if (!activeServerId || !deleteTarget) return;
    const target = deleteTarget;
    setManagementError("");
    try {
      if (target.type === "category") {
        await channelApi.deleteCategory(target.value.id);
        setEditingCategory((current) => current?.id === target.value.id ? null : current);
      } else {
        await channelApi.delete(target.value.id);
        setEditingChannel((current) => current?.id === target.value.id ? null : current);
      }
      setDeleteTarget(null);
      await Promise.all([loadChannels(activeServerId, true), loadCategories(activeServerId)]);
    } catch (error: unknown) {
      setManagementError(actionErrorMessage(error, `Failed to delete ${target.type}`));
    }
  };

  const permissionStateLabel = (channel: Channel) => {
    if (!channel.categoryId) return "INDEPENDENT";
    if (!channel.permissionsSynced) return "UNSYNCED";
    const category = categories.find((item) => item.id === channel.categoryId);
    return category ? `SYNCED with ${category.name}` : "SYNCED";
  };

  const applyPermissionTransition = async () => {
    if (!activeServerId || !permissionTransition) return;
    const { action, channel } = permissionTransition;
    setManagementError("");
    try {
      const configuration = action === "sync"
        ? await channelApi.syncPermissions(channel.id)
        : await channelApi.unsyncPermissions(channel.id);
      setChannels((current) => current.map((item) => item.id === channel.id
        ? { ...item, categoryId: configuration.categoryId, permissionsSynced: configuration.permissionsSynced }
        : item));
      setEditingChannel((current) => current?.id === channel.id
        ? { ...current, categoryId: configuration.categoryId, permissionsSynced: configuration.permissionsSynced }
        : current);
      setPermissionTransition(null);
      await Promise.all([loadChannels(activeServerId, true), loadCategories(activeServerId)]);
    } catch (error: unknown) {
      setManagementError(actionErrorMessage(error, `Failed to ${action} Channel permissions`));
      setPermissionTransition(null);
      await loadChannels(activeServerId, true);
    }
  };

  const handleEdit = async (msgId: string) => {
    await edit(msgId, editContent);
    setEditingMsgId(null);
    setEditContent("");
  };

  const handleComposerPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !canUseAttachments) return;
    addDebug(`Paste event: ${items.length} items`);
    for (const item of Array.from(items)) {
      addDebug(`  Item: kind=${item.kind} type=${item.type}`);
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          addDebug(`  Image paste: ${file.name} size=${(file.size / 1024).toFixed(0)}KB`);
          if (file.size > 104857600) {
            addDebug(`  REJECTED: ${file.name} exceeds 100MB`);
            setUploadError("Image from clipboard exceeds 100 MB limit");
            continue;
          }
          setPendingFiles((prev) => [...prev, file]);
        }
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          addDebug(`  Non-image paste: ${file.name} type=${item.type}`);
          setPendingFiles((prev) => [...prev, file]);
        }
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendMessages) return;
    const form = e.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem("content") as HTMLInputElement;
    const text = input.value.trim();
    const attIds: string[] = [];
    addDebug(`Send clicked. text="${text.substring(0, 50)}" pendingFiles=${pendingFiles.length}`);

    if (canUseAttachments && pendingFiles.length > 0) {
      setUploadError(null);
      for (const file of pendingFiles) {
        addDebug(`  Upload file: ${file.name}`);
        try {
          const prep = await attachmentApi.prepare(activeChannelId!, {
            fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size,
          });
          addDebug(`  Prepare OK: attachmentId=${prep.attachmentId}`);
          setUploadingIds((prev) => [...prev, prep.attachmentId]);
          await attachmentApi.upload(prep, file);
          addDebug(`  Upload OK: ${prep.attachmentId}`);
          await attachmentApi.complete(prep.attachmentId);
          addDebug(`  Complete OK: ${prep.attachmentId}`);
          attIds.push(prep.attachmentId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          addDebug(`  FAILED: ${msg}`);
          setUploadError(msg);
          setUploadingIds([]);
          return;
        }
      }
      setUploadingIds([]);
    }

    if (!text && attIds.length === 0) {
      addDebug("  Nothing to send (no text, no attachments)");
      return;
    }

    input.value = "";
    setPendingFiles([]);
    const payload = JSON.stringify({ content: text || undefined, attachmentIds: attIds.length > 0 ? attIds : undefined });
    setLastPayload(payload);
    addDebug(`  Sending message payload: ${payload}`);
    await send(text, attIds.length > 0 ? attIds : undefined);
    setTimeout(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        addDebug(`  Last message attachments: ${lastMsg.attachments?.length || 0}`);
        setLastAttCount(lastMsg.attachments?.length || 0);
      }
    }, 500);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 100 && hasMore && !msgsLoading) loadMore();
  };

  const serverRouteIsReady = !!activeServerId && loadedServerId === activeServerId && (
    routeStatus === "channel-loading" || routeStatus === "channel" || routeStatus === "empty"
  );
  const memberContext = useMemberContext({
    serverId: serverRouteIsReady ? activeServerId : null, myUserId: user?.id,
    ownerId: activeServer?.ownerId, effectivePermissions: activeServer?.effectivePermissions,
    connected, readyVersion, on,
    occupancy: { ...voiceOccupancy, channels: voiceOccupancy.channels.filter((entry) => voiceChannels.some((channel) => channel.id === entry.channelId)) },
  });
  const toggleMemberPanel = useCallback(() => {
    memberContext.closeOrigin("member");
    setMemberPanelVisible((current) => {
      const next = !current;
      localStorage.setItem(MEMBER_PANEL_VISIBILITY_KEY, String(next));
      return next;
    });
  }, [memberContext]);
  const selectedChannelId = serverRouteIsReady && routeChannelId && textChannels.some((channel) => channel.id === routeChannelId)
    ? routeChannelId
    : activeChannelId;
  const activeVoiceChannel = voiceChannels.find((channel) => channel.id === voice.channelId);
  const canSpeakInActiveVoice = activeVoiceChannel?.effectivePermissions === undefined || hasServerPermission(
    parsePermissionMask(activeVoiceChannel.effectivePermissions),
    SERVER_PERMISSIONS.SPEAK,
  );
  const activeMemberCount = memberContext.members.filter((member) => !member.isBanned).length;
  const shellHeaderTitle = routeStatus === "channel" && activeChannel
    ? `# ${activeChannel.name}`
    : activeServer?.name || "Server";
  const remoteSubscribedStreams: ViewerStream[] = voice.screenShares
    .filter((share) => share.presenterId !== user?.id && voice.subscribedShareIds.includes(share.shareId))
    .map((share) => ({
      shareId: share.shareId,
      presenterId: share.presenterId,
      presenterName: voice.members.find((member) => member.userId === share.presenterId)?.displayName || "Someone",
      stream: voice.remoteScreenStreams[share.presenterId],
      volume: voice.streamAudioByShareId?.[share.shareId]?.volume ?? 1,
      muted: voice.streamAudioByShareId?.[share.shareId]?.muted ?? false,
      audioAvailable: voice.screenAudioAvailableByShareId?.[share.shareId] ?? false,
    }));
  const localPresenterShares = voice.screenShares.filter((share) => share.presenterId === user?.id);
  const channelSettingsGroups: SettingsNavigationGroup[] = editingChannel ? [
    { label: "CHANNEL", items: canManageChannelStructure(editingChannel) ? [{ id: "overview", label: "Overview" }] : [] },
    { label: "PERMISSIONS", items: canAdministerChannelPermissions(editingChannel) ? [{ id: "permissions", label: "Permissions" }] : [] },
    { label: "DANGER ZONE", items: canManageChannelStructure(editingChannel) ? [{ id: "delete", label: "Delete Channel", danger: true }] : [] },
  ] : [];
  const categorySettingsGroups: SettingsNavigationGroup[] = editingCategory ? [
    { label: "CATEGORY", items: canManageChannels ? [{ id: "overview", label: "Overview" }] : [] },
    { label: "PERMISSIONS", items: canManageRoles ? [{ id: "permissions", label: "Permissions" }] : [] },
    { label: "DANGER ZONE", items: canManageChannels ? [{ id: "delete", label: "Delete Category", danger: true }] : [] },
  ] : [];

  return (
    <AvatarProvider on={on} readyVersion={readyVersion}><div className="app-layout">
      <div className={`app-navigation${serverRouteIsReady ? "" : " rail-only"}`}>
        <div className="app-navigation-columns">
          <ServerRail servers={visibleServers} activeServerId={activeServerId} myUserId={user?.id}
            isHome={isHome} onHome={() => router.push("/channels/@me")}
            onSelect={(id) => router.push(serverRoute(id))} onAdd={() => setShowAddServerModal(true)}
            onInvite={(id) => { router.push(serverRoute(id)); setInviteServerId(id); }}
            onSettings={(id) => { router.push(serverRoute(id)); setSettingsInitialTab("general"); setShowSettingsModal(true); }}
            onLeave={requestLeaveServer}
            onDelete={deleteServer} />

          {serverRouteIsReady && <ChannelSidebar
          serverId={activeServerId ?? undefined}
          serverName={activeServer?.name || ""}
          textChannels={textChannels}
          voiceChannels={voiceChannels}
          categories={categories}
          activeChannelId={selectedChannelId}
          voice={voice}
          voiceOccupancy={voiceOccupancy.channels} memberContext={memberContext}
          user={user}
          userStatus={userStatus}
          isOwner={isOwner}
          canOpenSettings={canOpenSettings}
          canCreateInvite={canCreateInvite}
          canManageChannels={canManageChannels}
          canManageRoles={canManageRoles}
          onSelectChannel={(id) => activeServerId && router.push(textChannelRoute(activeServerId, id))}
          onSetStatus={emitStatus}
          onLogout={logout}
          onSettings={() => { setSettingsInitialTab("general"); setShowSettingsModal(true); }}
          onInvite={() => { if (activeServerId) setInviteServerId(activeServerId); }}
          onCreateChannel={openCreateChannel}
          onCreateCategory={() => { setManagementError(""); setCategoryName(""); setShowCategoryModal(true); }}
          onLeaveServer={() => { if (activeServerId) requestLeaveServer(activeServerId); }}
          onEditChannel={(channel) => {
            const current = channels.find((item) => item.id === channel.id);
            if (current) openEditChannel(current);
          }}
          onDeleteChannel={(channel) => {
            const current = channels.find((item) => item.id === channel.id);
            if (current) { setManagementError(""); setDeleteTarget({ type: "channel", value: current }); }
          }}
          onEditCategory={openEditCategory}
          onDeleteCategory={(category) => { setManagementError(""); setDeleteTarget({ type: "category", value: category }); }}
          showUserPanel={false}
          />}
        </div>
        {serverRouteIsReady && (
          <div className="user-panel-section">
            <UserPanel
              user={user}
              status={userStatus}
              voice={voice}
              channelName={activeVoiceChannel?.name}
              canSpeak={voice.channelId ? canSpeakInActiveVoice : true}
              onSetStatus={emitStatus}
              onLogout={logout}
              onSettings={() => setShowUserSettings(true)}
            />
          </div>
        )}
      </div>

      <div className="app-workspace">
        {serverRouteIsReady && <AppShellHeader
          title={shellHeaderTitle}
          connected={connected}
          socketId={socket?.id}
          activeChannelId={activeChannelId}
          memberCount={activeMemberCount}
          memberPanelVisible={memberPanelVisible}
          onToggleMemberPanel={toggleMemberPanel}
        />}
        <div className="app-workspace-body">

      <ScreenShareViewerWorkspace streams={remoteSubscribedStreams} onVolumeChange={voice.setStreamVolume} onMuteChange={voice.setStreamMuted} onLeaveStream={voice.leaveScreenShare} onPresentationChange={(shareId, mode) => voice.setRemoteScreenAudioHidden(shareId, mode === "HIDDEN")} selfShare={localPresenterShares[0] ? {
        shareId: localPresenterShares[0].shareId, stream: voice.localScreenStream,
        viewerNames: (voice.presenterViewerIds[localPresenterShares[0].shareId] || []).map(viewerId => voice.members.find(member => member.userId === viewerId)?.displayName || viewerId),
        onStop: voice.stopScreenShare, stopping: voice.screenShareStatus === "stopping",
      } : undefined}>

      {isHome ? (
        user && <Home key={user.id} displayName={user.displayName || user.username}
          servers={visibleServers} serversStatus={serversStatus}
          refreshKey={`${readyVersion}:${homeRefreshKey}`}
          onRetryServers={() => setServersRetry((value) => value + 1)}
          onAddServer={() => setShowAddServerModal(true)} onNavigate={(path) => router.push(path)} />
      ) : routeStatus === "loading" ? (
        <div className="empty-state route-system-state route-system-state-loading" role="status" aria-live="polite" aria-busy="true"><h2>Loading server…</h2><p>Preparing your workspace.</p></div>
      ) : routeStatus === "channel-loading" ? (
        <div className="empty-state route-system-state route-system-state-loading channel-content-loading" data-testid="channel-content-loading" role="status" aria-live="polite" aria-busy="true"><h2>Loading channel…</h2><p>Opening the selected conversation.</p></div>
      ) : routeStatus === "unavailable" ? (
        <div className="empty-state route-system-state route-system-state-unavailable" role="status" aria-live="polite"><h2>This server or channel is unavailable</h2><p>Choose a server you can access.</p></div>
      ) : routeStatus === "empty" ? (
        <div className="empty-state route-system-state" role="status" aria-live="polite"><h2>No accessible text channels</h2><p>This server does not currently have a text channel you can open.</p></div>
      ) : activeChannelId ? (
        <ChatArea
          channelName={activeChannel?.name || ""}
          connected={connected}
          socketId={socket?.id}
          activeChannelId={activeChannelId}
          messages={messages}
          msgsLoading={msgsLoading}
          hasMore={hasMore}
          editingMsgId={editingMsgId}
          editContent={editContent}
          pendingFiles={pendingFiles}
          uploadingIds={uploadingIds}
          uploadError={uploadError}
          canSendMessages={canSendMessages}
          canAttachFiles={canAttachFiles}
          canManageMessages={canManageMessages}
          showSendButton={showSendButton}
          debugLog={debugLog}
          lastPayload={lastPayload}
          lastAttCount={lastAttCount}
          dbg={dbg}
          user={user}
          onScroll={handleScroll}
          onEditStart={(id, content) => { setEditingMsgId(id); setEditContent(content); }}
          onEditChange={setEditContent}
          onEditSave={handleEdit}
          onEditCancel={() => { setEditingMsgId(null); setEditContent(""); }}
          onDelete={(id) => remove(id)}
          onSend={handleSend}
          onPaste={handleComposerPaste}
          onFileSelect={(files) => {
            if (!files || !canUseAttachments) return;
            addDebug(`File picker: ${files.length} files selected`);
            for (const f of Array.from(files)) {
              addDebug(`  File: ${f.name} type=${f.type} size=${(f.size / 1024).toFixed(0)}KB`);
              if (f.size > 104857600) {
                addDebug(`  REJECTED: ${f.name} exceeds 100MB`);
                setUploadError(`${f.name} exceeds 100 MB limit`);
                continue;
              }
              setPendingFiles((prev) => [...prev, f]);
            }
          }}
          onRemoveFile={(i) => {
            addDebug(`Removed pending file`);
            setPendingFiles((prev) => prev.filter((_, j) => j !== i));
          }}
          showHeader={false}
        />
      ) : (
        <div className="empty-state route-system-state" role="status" aria-live="polite"><h2>Select a channel</h2><p>Choose a server and text channel to start chatting.</p></div>
      )}
      </ScreenShareViewerWorkspace>

          {serverRouteIsReady && memberPanelVisible && <MemberPanel
            serverId={activeServerId}
            context={memberContext}
            voiceMembers={voice.members}
            presenceMap={presenceMap}
            visible
            showHeader={false}
            onToggleVisibility={toggleMemberPanel}
          />}
        </div>
      </div>
      <MemberContextSurface context={memberContext} mix={voice} />

      {showUserSettings && user && <UserSettings
        user={user}
        onUpdateProfile={updateProfile}
        onChangeEmail={changeEmail}
        onChangePassword={changePassword}
        onLogout={logout}
        onClose={() => setShowUserSettings(false)}
      />}

      {/* Modals */}
      {showAddServerModal && <AddServerModal onClose={() => setShowAddServerModal(false)} onComplete={completeServerEntry} />}

      {leaveServerId && <ConfirmModal
        title={`Leave ${servers.find((server) => server.id === leaveServerId)?.name ?? "server"}?`}
        message="You will lose access to this server until you join it again with an invite."
        confirmLabel="Leave Server"
        pendingLabel="Leaving…"
        danger
        pending={leavePending}
        error={leaveError}
        onConfirm={() => { void confirmLeaveServer(); }}
        onCancel={() => { if (!leavePending) { setLeaveError(""); setLeaveServerId(null); } }}
      />}

      {showChannelModal && (
        <div className="modal-overlay" onClick={() => { if (!channelPending) { setShowChannelModal(false); setChannelError(""); } }}>
          <div className="modal create-channel-modal shell-creation-modal" role="dialog" aria-modal="true" aria-labelledby="create-channel-title" onClick={(e) => e.stopPropagation()}>
            <div className="add-server-heading">
              <h3 id="create-channel-title">Create Channel</h3>
              <button type="button" className="btn btn-ghost btn-icon modal-close-button" aria-label="Close Create Channel" disabled={channelPending}
                onClick={() => { setShowChannelModal(false); setChannelError(""); }}>✕</button>
            </div>
            {channelError && <div className="error-banner">{channelError}</div>}
            <label htmlFor="create-channel-name">Channel Name</label>
            <input id="create-channel-name" value={channelName} disabled={channelPending} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel name" />
            <fieldset className="channel-type-options">
              <legend>Channel Type</legend>
              <label><input type="radio" name="channel-type" value="TEXT" checked={newChannelType === "TEXT"} disabled={channelPending}
                onChange={() => setNewChannelType("TEXT")} /><span><strong>Text Channel</strong><small>Messages, files, and conversation.</small></span></label>
              <label><input type="radio" name="channel-type" value="VOICE" checked={newChannelType === "VOICE"} disabled={channelPending}
                onChange={() => setNewChannelType("VOICE")} /><span><strong>Voice Channel</strong><small>Voice and Screen Share.</small></span></label>
            </fieldset>
            <label htmlFor="create-channel-category">Category</label>
            <select id="create-channel-category" value={channelCategoryId} disabled={channelPending} onChange={(e) => setChannelCategoryId(e.target.value)}>
              <option value="">No Category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {privateTargetsLoading && canManageChannels && canManageRoles && <p className="permission-empty">Checking Private Channel eligibility…</p>}
            {canUsePrivateChannelPreset && <div className="private-channel-preset">
              <label className="private-channel-toggle" htmlFor="create-channel-private">
                <input id="create-channel-private" type="checkbox" checked={newChannelPrivate}
                  onChange={(event) => setNewChannelPrivate(event.target.checked)} />
                <span><strong>Private Channel</strong><small>Only selected Roles and Members can view this Channel.</small></span>
              </label>
              {newChannelPrivate && <fieldset className="private-channel-targets">
                <legend>Who can access?</legend>
                <div className="private-channel-target-group">
                  <strong>Roles</strong>
                  {eligiblePrivateRoles.map((role) => <label key={role.id}>
                    <input type="checkbox" checked={privateRoleIds.includes(role.id)}
                      onChange={(event) => setPrivateRoleIds((current) => event.target.checked
                        ? [...current, role.id]
                        : current.filter((id) => id !== role.id))} />
                    {role.name}
                  </label>)}
                  {eligiblePrivateRoles.length === 0 && <span className="permission-empty">No eligible Roles</span>}
                </div>
                <div className="private-channel-target-group">
                  <strong>Members</strong>
                  {eligiblePrivateMembers.map((member) => <label key={member.id}>
                    <input type="checkbox" checked={privateMemberIds.includes(member.id)}
                      onChange={(event) => setPrivateMemberIds((current) => event.target.checked
                        ? [...current, member.id]
                        : current.filter((id) => id !== member.id))} />
                    {member.user.displayName} (@{member.user.username})
                  </label>)}
                  {eligiblePrivateMembers.length === 0 && <span className="permission-empty">No eligible Members</span>}
                </div>
              </fieldset>}
            </div>}
            <button className="btn btn-primary" disabled={channelPending} onClick={createChannel}>{channelPending ? "Creating…" : "Create Channel"}</button>
            <button className="btn btn-secondary" disabled={channelPending} onClick={() => { setShowChannelModal(false); setChannelError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => { setShowCategoryModal(false); setManagementError(""); }}>
          <div className="modal shell-creation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Category</h3>
            {managementError && <div className="error-banner">{managementError}</div>}
            <label htmlFor="create-category-name">Name</label>
            <input id="create-category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name" />
            <button className="btn btn-primary" onClick={createCategory}>Create</button>
            <button className="btn btn-secondary" onClick={() => { setShowCategoryModal(false); setManagementError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {editingCategory && (
        <SettingsLayer
          title="Category Settings"
          resourceName={editingCategory.name}
          groups={categorySettingsGroups}
          activeId={categorySettingsTab}
          onSelect={(id) => setCategorySettingsTab(id as EntitySettingsTab)}
          onClose={() => { setEditingCategory(null); setManagementError(""); }}
        >
          <div className="settings-content entity-settings-content">
            {managementError && <div className="error-banner" role="alert">{managementError}</div>}
            {categorySettingsTab === "overview" && canManageChannels && <section aria-labelledby="category-overview-title">
              <div className="entity-settings-heading"><h3 id="category-overview-title">Overview</h3></div>
              <div className="entity-settings-pane">
                <label htmlFor="edit-category-name">Category Name</label>
                <input id="edit-category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                <button className="btn btn-primary" onClick={updateCategory}>Save Changes</button>
              </div>
            </section>}
            {categorySettingsTab === "permissions" && canManageRoles && activeServer && <section aria-labelledby="category-permissions-title">
              <div className="entity-settings-heading"><h3 id="category-permissions-title">Permissions</h3></div>
              <PermissionOverwriteEditor serverId={activeServer.id} ownerId={activeServer.ownerId} actorUserId={user?.id}
                scope="CATEGORY" scopeId={editingCategory.id} refreshKey={memberContext.authorityRevision} />
            </section>}
            {categorySettingsTab === "delete" && canManageChannels && <section className="danger-zone" aria-labelledby="delete-category-title">
              <h3 id="delete-category-title">Delete Category</h3>
              <p>Channels in this Category will remain, become uncategorized, and preserve their effective permission source independently.</p>
              <button className="danger-button" onClick={() => setDeleteTarget({ type: "category", value: editingCategory })}>Delete Category</button>
            </section>}
          </div>
        </SettingsLayer>
      )}

      {editingChannel && (
        <SettingsLayer
          title="Channel Settings"
          resourceName={`${editingChannel.type === "VOICE" ? "" : "# "}${editingChannel.name}`}
          resourceType={editingChannel.type === "VOICE" ? "Voice Channel" : "Text Channel"}
          groups={channelSettingsGroups}
          activeId={channelSettingsTab}
          onSelect={(id) => setChannelSettingsTab(id as EntitySettingsTab)}
          onClose={() => { setEditingChannel(null); setManagementError(""); }}
        >
          <div className="settings-content entity-settings-content">
            {managementError && <div className="error-banner" role="alert">{managementError}</div>}
            {channelSettingsTab === "overview" && canManageChannelStructure(editingChannel) && <section aria-labelledby="channel-overview-title">
              <div className="entity-settings-heading"><h3 id="channel-overview-title">Overview</h3></div>
              <div className="entity-settings-pane">
                <div className="readonly-permission-state"><span>Channel Type</span><strong>{editingChannel.type === "VOICE" ? "Voice" : "Text"}</strong></div>
                <label htmlFor="edit-channel-name">Channel Name</label>
                <input id="edit-channel-name" value={editChannelName} onChange={(e) => setEditChannelName(e.target.value)} />
                <label htmlFor="edit-channel-category">Category</label>
                <select id="edit-channel-category" value={editChannelCategoryId} onChange={(e) => setEditChannelCategoryId(e.target.value)}>
                  <option value="">No Category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <div className="readonly-permission-state"><span>Permissions</span><strong>{permissionStateLabel(editingChannel)}</strong></div>
                <button className="btn btn-primary" onClick={updateChannel}>Save Changes</button>
              </div>
            </section>}
            {channelSettingsTab === "permissions" && canAdministerChannelPermissions(editingChannel) && <section aria-labelledby="channel-permissions-title">
              <div className="entity-settings-heading"><h3 id="channel-permissions-title">Permissions</h3></div>
              {editingChannel.permissionsSynced && editingChannel.categoryId ? <div className="synced-permission-source">
                <h4>Permissions synced with Category: {categories.find((category) => category.id === editingChannel.categoryId)?.name ?? "Unknown Category"}</h4>
                <p>This Channel uses the Category overwrite set. Local Channel controls are unavailable while it is synced.</p>
                <div className="permission-source-actions">
                  <button className="btn btn-secondary" onClick={() => openCategoryPermissions(editingChannel.categoryId!)}>Edit Category Permissions</button>
                  <button className="btn btn-primary" onClick={() => setPermissionTransition({
                    action: "unsync",
                    channel: editingChannel,
                    categoryName: categories.find((category) => category.id === editingChannel.categoryId)?.name ?? "this Category",
                  })}>Unsync</button>
                </div>
              </div> : activeServer && <div className="local-permission-source">
                {editingChannel.categoryId && <div className="permission-source-actions">
                  <p>This Channel has its own overwrite source. Category permission changes do not affect it.</p>
                  <button className="btn btn-primary" onClick={() => setPermissionTransition({
                    action: "sync",
                    channel: editingChannel,
                    categoryName: categories.find((category) => category.id === editingChannel.categoryId)?.name ?? "this Category",
                  })}>Sync Permissions</button>
                </div>}
                <PermissionOverwriteEditor serverId={activeServer.id} ownerId={activeServer.ownerId} actorUserId={user?.id}
                  scope="CHANNEL" scopeId={editingChannel.id} channelType={editingChannel.type} refreshKey={memberContext.authorityRevision} />
              </div>}
            </section>}
            {channelSettingsTab === "delete" && canManageChannelStructure(editingChannel) && <section className="danger-zone" aria-labelledby="delete-channel-title">
              <h3 id="delete-channel-title">Delete Channel</h3>
              <p>This permanently deletes the Channel and its Channel-scoped data.</p>
              <button className="danger-button" onClick={() => setDeleteTarget({ type: "channel", value: editingChannel })}>Delete Channel</button>
            </section>}
          </div>
        </SettingsLayer>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.type === "category" ? `Delete Category "${deleteTarget.value.name}"?` : deleteTarget.value.type === "VOICE" ? `Delete Voice Channel "${deleteTarget.value.name}"?` : `Delete #${deleteTarget.value.name}?`}
          message={managementError || (deleteTarget.type === "category" ? "Channels will remain, become uncategorized, and preserve their effective permission source independently." : "This permanently deletes the channel and its channel-scoped data.")}
          confirmLabel={deleteTarget.type === "category" ? "Delete Category" : "Delete Channel"}
          danger
          onConfirm={deleteStructuralTarget}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {permissionTransition && (
        <ConfirmModal
          title={permissionTransition.action === "unsync"
            ? `Unsync permissions from ${permissionTransition.categoryName}?`
            : `Sync permissions with ${permissionTransition.categoryName}?`}
          message={permissionTransition.action === "unsync"
            ? "The current Category permission configuration will be copied to this Channel. Future Category permission changes will no longer affect this Channel."
            : "Current Channel-specific permission overrides will be replaced by the Category's permissions."}
          confirmLabel={permissionTransition.action === "unsync" ? "Unsync" : "Sync Permissions"}
          danger={permissionTransition.action === "sync"}
          onConfirm={() => void applyPermissionTransition()}
          onCancel={() => setPermissionTransition(null)}
        />
      )}

      {inviteServerId && servers.find((server) => server.id === inviteServerId) ? <InvitePeopleModal
        serverId={inviteServerId}
        serverName={servers.find((server) => server.id === inviteServerId)!.name}
        canManageInvites={servers.find((server) => server.id === inviteServerId)!.ownerId === user?.id || hasServerPermission(
          parsePermissionMask(servers.find((server) => server.id === inviteServerId)!.effectivePermissions),
          SERVER_PERMISSIONS.MANAGE_SERVER,
        )}
        onManageInvites={() => {
          setInviteServerId(null);
          setSettingsInitialTab("invites");
          setShowSettingsModal(true);
        }}
        onClose={() => setInviteServerId(null)}
      /> : null}

      {showSettingsModal && activeServer && (
        <ServerSettings
          serverId={activeServer.id}
          serverName={activeServer.name}
          ownerId={activeServer.ownerId}
          myUserId={user?.id}
          effectivePermissions={activeServer.effectivePermissions}
          refreshKey={memberContext.authorityRevision}
          initialTab={settingsInitialTab}
          onClose={() => setShowSettingsModal(false)}
          onUpdateName={(name) => {
            setServers((prev) => prev.map((s) => s.id === activeServer.id ? { ...s, name } : s));
          }}
          onDelete={() => {
            finalizeServerRemoval(activeServer.id);
            setShowSettingsModal(false);
          }}
        />
      )}
    </div></AvatarProvider>
  );
}

export default function AppPage({ showSendButton = false }: { showSendButton?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/app") router.replace("/channels/@me");
  }, [pathname, router]);

  if (pathname === "/app") return <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">Opening Likecord…</div>;
  return <AppContent showSendButton={showSendButton} />;
}
