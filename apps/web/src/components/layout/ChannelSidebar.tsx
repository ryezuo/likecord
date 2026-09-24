"use client";

import UserAvatar from "../ui/UserAvatar";

import { useState, useEffect, useCallback, useRef } from "react";
import { contextMenuTrigger } from "../ui/contextMenuTrigger";
import type { VoiceState } from "../../hooks/useVoice";
import type { VoiceOccupancyChannel, VoiceOccupancyMember } from "../../hooks/useVoiceOccupancy";
import type { VoicePersonalMixPreference } from "../../hooks/useVoicePersonalMix";
import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu";
import type { MemberContext } from "../../hooks/useMemberContext";
import Tooltip from "../ui/Tooltip";
import UserPanel from "./UserPanel";
import { HashIcon, HeadphonesOffIcon, LeaveStreamIcon, MembersIcon, MicOffIcon, PlusIcon, SettingsIcon, SpeakerIcon } from "../ui/icons";
import { hasServerPermission, parsePermissionMask, SERVER_PERMISSIONS } from "../../lib/permissions";

interface Channel { id: string; name: string; type: string; categoryId: string | null; permissionsSynced?: boolean; position: number; effectivePermissions?: string; }
interface Category { id: string; name: string; position: number; }
const COLLAPSE_KEY = "collapsed_categories";

function getCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
}

function saveCollapsed(key: string, value: boolean) {
  const current = getCollapsed();
  current[key] = value;
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(current));
}

interface Props {
  serverId?: string;
  serverName: string;
  textChannels: Channel[];
  voiceChannels: Channel[];
  categories?: Category[];
  activeChannelId: string | null;
  voice: VoiceState & {
    join: (id: string) => void;
    leave: () => void;
    toggleMute: () => void;
    toggleDeafen: () => void;
    clearError: () => void;
    startScreenShare: () => void;
    stopScreenShare: () => void;
    joinScreenShare: (shareId: string) => void;
    leaveScreenShare: (shareId: string) => void;
    setVoiceSoundsEnabled: (v: boolean) => void;
    voiceSoundsEnabled: boolean;
    debugEvents: string[];
    getVoicePersonalMixPreference: (targetUserId: string) => VoicePersonalMixPreference;
    setVoicePersonalMixPreference: (targetUserId: string, update: Partial<VoicePersonalMixPreference>) => void;
    getVoicePersonalMixStatus?: (targetUserId: string) => "loading" | "load-error" | "saving" | "save-error" | "saved";
    retryVoicePersonalMix?: (targetUserId: string) => void;
  };
  voiceOccupancy?: VoiceOccupancyChannel[];
  memberContext?: MemberContext;
  user: { id: string; username: string; displayName: string } | null;
  userStatus: "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE";
  isOwner: boolean;
  canOpenSettings: boolean;
  canCreateInvite: boolean;
  canManageChannels: boolean;
  canManageRoles?: boolean;
  onSelectChannel: (id: string) => void;
  onSettings: () => void;
  onInvite: () => void;
  onCreateChannel: (type?: "TEXT" | "VOICE", categoryId?: string) => void;
  onCreateCategory?: () => void;
  onLeaveServer?: () => void;
  onEditChannel?: (channel: Channel) => void;
  onDeleteChannel?: (channel: Channel) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (category: Category) => void;
  onSetStatus: (s: "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE") => void;
  onLogout: () => void;
  showUserPanel?: boolean;
}

export default function ChannelSidebar({
  serverId, serverName, textChannels, voiceChannels, categories = [], activeChannelId, voice,
  voiceOccupancy = [], memberContext,
  user, userStatus, isOwner, canOpenSettings, canCreateInvite, canManageChannels, canManageRoles = false,
  onSelectChannel, onSettings, onInvite, onCreateChannel, onCreateCategory,
  onLeaveServer, onEditChannel, onDeleteChannel, onEditCategory, onDeleteCategory, onSetStatus, onLogout,
  showUserPanel = true,
}: Props) {
  const serverIdentity = serverId ?? serverName;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; invoker: HTMLElement; label: string; x: number; y: number } | null>(null);
  useEffect(() => { setCollapsed(getCollapsed()); }, [serverIdentity]);

  const openParticipant = (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, userId: string, channelId: string) => {
    const trigger = contextMenuTrigger(event);
    if (!trigger) return;
    setContextMenu(null);
    memberContext?.open(userId, "voice", trigger, sidebarRef.current, channelId);
  };

  const toggleCollapse = (key: string) => {
    memberContext?.closeOrigin("voice");
    setCollapsed((previous) => {
      const next = !previous[key];
      saveCollapsed(key, next);
      return { ...previous, [key]: next };
    });
  };

  const handleChannelContext = useCallback((event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, channel: Channel) => {
    const trigger = contextMenuTrigger(event);
    if (!trigger) return;
    const channelLabel = channel.type === "VOICE" ? `🔊 ${channel.name}` : `# ${channel.name}`;
    const items: ContextMenuItem[] = [
      { label: channelLabel, onClick: () => {}, disabled: true },
      { label: "Copy Channel ID", onClick: () => void navigator.clipboard?.writeText(channel.id) },
    ];
    // Category creation remains server-scoped, while this menu follows the
    // effective permission attached to the Channel list response.
    const canManageThisChannel = channel.effectivePermissions === undefined
      ? canManageChannels
      : hasServerPermission(parsePermissionMask(channel.effectivePermissions), SERVER_PERMISSIONS.MANAGE_CHANNELS);
    const canAdministerPermissions = canManageRoles && channel.effectivePermissions !== undefined &&
      hasServerPermission(parsePermissionMask(channel.effectivePermissions), SERVER_PERMISSIONS.VIEW_CHANNEL);
    if (canManageThisChannel || canAdministerPermissions) {
      items.push(
        { label: "", onClick: () => {}, divider: true },
        { label: "Edit Channel", onClick: () => onEditChannel?.(channel) },
      );
      if (canManageThisChannel) items.push(
        { label: "", onClick: () => {}, divider: true },
        { label: "Delete Channel", onClick: () => onDeleteChannel?.(channel), danger: true },
      );
    }
    setContextMenu({ items, ...trigger, label: `Channel actions for ${channel.name}` });
  }, [canManageChannels, canManageRoles, onDeleteChannel, onEditChannel]);

  const handleCategoryContext = useCallback((event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, category: Category) => {
    if (!(canManageChannels || canManageRoles)) return;
    const trigger = contextMenuTrigger(event);
    if (!trigger) return;
    setContextMenu({
      items: [
        { label: category.name, onClick: () => {}, disabled: true },
        { label: "", onClick: () => {}, divider: true },
        { label: "Edit Category", onClick: () => onEditCategory?.(category) },
        ...(canManageChannels ? [
          { label: "Create Channel", onClick: () => onCreateChannel("TEXT", category.id) },
          { label: "", onClick: () => {}, divider: true },
          { label: "Delete Category", onClick: () => onDeleteCategory?.(category), danger: true },
        ] : []),
      ],
      ...trigger,
      label: `Category actions for ${category.name}`,
    });
  }, [canManageChannels, canManageRoles, onCreateChannel, onDeleteCategory, onEditCategory]);

  const openServerMenu = useCallback((event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    const trigger = contextMenuTrigger(event);
    if (!trigger) return;
    const items: ContextMenuItem[] = [];
    if (canCreateInvite) items.push({ label: "Invite People", icon: <MembersIcon size={16} />, onClick: onInvite });
    if (canManageChannels) {
      items.push(
        { label: "Create Channel", icon: <HashIcon size={16} />, onClick: () => onCreateChannel("TEXT") },
        { label: "Create Category", icon: <PlusIcon size={16} />, onClick: () => onCreateCategory?.() },
      );
    }
    if (canOpenSettings) items.push({ label: "Server Settings", icon: <SettingsIcon size={16} />, onClick: onSettings });
    if (!isOwner && onLeaveServer) {
      if (items.length > 0) items.push({ label: "", onClick: () => {}, divider: true });
      items.push({
        label: "Leave Server",
        icon: <LeaveStreamIcon size={16} />,
        danger: true,
        onClick: onLeaveServer,
      });
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setContextMenu({ items, invoker: trigger.invoker, label: `Server actions for ${serverName}`, x: bounds.left + 8, y: bounds.bottom + 4 });
  }, [canCreateInvite, canManageChannels, canOpenSettings, isOwner, onCreateCategory, onCreateChannel, onInvite, onLeaveServer, onSettings, serverName]);

  const renderChannel = (channel: Channel) => {
    const isActive = channel.id === activeChannelId;
    if (channel.type === "VOICE") {
      const isInThisChannel = voice.channelId === channel.id;
      const canConnect = channel.effectivePermissions === undefined || hasServerPermission(
        parsePermissionMask(channel.effectivePermissions),
        SERVER_PERMISSIONS.CONNECT,
      );
      const channelMembers = voiceOccupancy.find((entry) => entry.channelId === channel.id)?.members ?? [];
      return (
        <div key={channel.id}>
          <button className={`channel-item voice-channel-btn ${isInThisChannel ? "active" : ""}`}
            disabled={!isInThisChannel && !canConnect}
            aria-label={!isInThisChannel && !canConnect ? `${channel.name}: Connect permission denied` : channel.name}
            title={!isInThisChannel && !canConnect ? "You do not have permission to connect to this voice channel." : undefined}
            onClick={() => { if (isInThisChannel) voice.leave(); else if (canConnect) voice.join(channel.id); }}
            onContextMenu={(event) => handleChannelContext(event, channel)}
            onKeyDown={(event) => handleChannelContext(event, channel)}>
            <SpeakerIcon size={16} /><span className="channel-item-label">{channel.name}</span>
          </button>
          {channelMembers.length > 0 && (
            <div className="voice-channel-members" role="list" aria-label={`${channel.name} voice participants`}>
              {channelMembers.map((member: VoiceOccupancyMember) => {
                const callMember = isInThisChannel
                  ? voice.members.find((candidate) => candidate.userId === member.userId)
                  : undefined;
                const isCurrentUser = member.userId === user?.id;
                const isMuted = isCurrentUser && isInThisChannel
                  ? voice.isMuted || voice.serverMuted
                  : callMember?.isMuted ?? member.isMuted;
                const isDeafened = isCurrentUser && isInThisChannel
                  ? voice.isDeafened
                  : callMember?.isDeafened ?? member.isDeafened;
                const isEffectivelyMuted = isMuted || isDeafened;
                const isSpeaking = isInThisChannel
                  && !isEffectivelyMuted
                  && voice.speakingUserIds.includes(member.userId);
                const identity = member.displayName || member.username;
                const activityLabel = isSpeaking
                  ? "speaking"
                  : isDeafened
                    ? "muted and deafened"
                    : isMuted
                      ? "muted"
                      : "not speaking";
                return (
                  <div key={member.userId} className={`voice-channel-member${isSpeaking ? " speaking" : ""}`}
                    role="listitem" aria-label={`${identity}, ${activityLabel}`}
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-expanded={memberContext?.entry?.origin === "voice" && memberContext.entry.channelId === channel.id && memberContext.entry.userId === member.userId}
                    onContextMenu={(event) => openParticipant(event, member.userId, channel.id)}
                    onKeyDown={(event) => openParticipant(event, member.userId, channel.id)}>
                    <span className={`voice-member-avatar${isSpeaking ? " is-speaking" : ""}`}><UserAvatar userId={member.userId} name={identity} interactive speaking={isSpeaking} /></span>
                    <span className="voice-member-name-sm">{identity}</span>
                    <span className="voice-member-icons-sm" aria-hidden="true">
                      {isSpeaking && <span data-testid="voice-status-speaking"><SpeakerIcon size={14} /></span>}
                      {(isMuted || isDeafened) && <span data-testid="voice-status-mic-off"><MicOffIcon size={14} /></span>}
                      {isDeafened && <span data-testid="voice-status-headphones-off"><HeadphonesOffIcon size={14} /></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return (
      <button key={channel.id} className={`channel-item ${isActive ? "active" : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelectChannel(channel.id)} onContextMenu={(event) => handleChannelContext(event, channel)}
        onKeyDown={(event) => handleChannelContext(event, channel)}>
        <HashIcon size={16} /><span className="channel-item-label">{channel.name}</span>
      </button>
    );
  };

  const renderUncategorizedSection = (channelList: Channel[], label: string, type: "TEXT" | "VOICE") => {
    if (channelList.length === 0 && !canManageChannels) return null;
    const key = `${serverIdentity}-${label}`;
    return (
      <div className="channel-section" data-testid={`uncategorized-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="channel-section-title channel-section-heading">
          <button type="button" className="channel-section-toggle" aria-expanded={!collapsed[key]} onClick={() => toggleCollapse(key)}>
            <span className="collapse-arrow">{collapsed[key] ? "▶" : "▼"}</span><span className="channel-section-name">{label}</span>
          </button>
          {canManageChannels ? <Tooltip text={`Create ${type === "TEXT" ? "Text" : "Voice"} Channel`}>
            <button type="button" className="channel-section-add" aria-label={`Create ${type === "TEXT" ? "Text" : "Voice"} Channel`}
              onClick={() => onCreateChannel(type)}><PlusIcon size={15} /></button>
          </Tooltip> : null}
        </div>
        {!collapsed[key] && channelList.map(renderChannel)}
      </div>
    );
  };

  const uncategorizedText = textChannels.filter((channel) => !channel.categoryId);
  const uncategorizedVoice = voiceChannels.filter((channel) => !channel.categoryId);

  return (
    <div className="channel-sidebar" ref={sidebarRef} tabIndex={-1}>
      <div className="channel-header">
        <button type="button" className="server-name" aria-haspopup="menu" aria-expanded={contextMenu?.label === `Server actions for ${serverName}`}
          onClick={openServerMenu} onKeyDown={openServerMenu}><span className="server-name-text">{serverName}</span><span className="channel-chevron" aria-hidden="true">⌄</span></button>
      </div>

      <div className="channel-scroll likecord-scrollbar shell-hover-scrollbar">
        {categories.map((category) => {
          const key = `${serverIdentity}-category-${category.id}`;
          const children = [...textChannels, ...voiceChannels].filter((channel) => channel.categoryId === category.id);
          if (children.length === 0 && !canManageChannels) return null;
          return (
            <div className="channel-section category-section" key={category.id} data-testid={`category-${category.id}`}>
              <div className="channel-section-title category-title channel-section-heading"
                onContextMenu={(event) => handleCategoryContext(event, category)}>
                <button type="button" className="channel-section-toggle" aria-expanded={!collapsed[key]}
                  onKeyDown={(event) => handleCategoryContext(event, category)}
                  data-testid={`category-toggle-${category.id}`} onClick={() => toggleCollapse(key)}>
                  <span className="collapse-arrow">{collapsed[key] ? "▶" : "▼"}</span><span className="channel-section-name">{category.name}</span>
                </button>
                {canManageChannels ? <Tooltip text={`Create Channel in ${category.name}`}>
                  <button type="button" className="channel-section-add" aria-label={`Create Channel in ${category.name}`}
                    onClick={() => onCreateChannel("TEXT", category.id)}><PlusIcon size={15} /></button>
                </Tooltip> : null}
              </div>
              {!collapsed[key] && children.map(renderChannel)}
            </div>
          );
        })}
        {renderUncategorizedSection(uncategorizedText, "TEXT CHANNELS", "TEXT")}
        {renderUncategorizedSection(uncategorizedVoice, "VOICE CHANNELS", "VOICE")}

        {voice.channelId && voice.screenShares.length > 0 && (
          <section className="live-streams-section" aria-label="Live streams">
            <div className="live-streams-label">LIVE STREAMS</div>
            {voice.screenShares.map((share) => {
              const isOwnShare = share.presenterId === user?.id;
              const isSubscribed = voice.subscribedShareIds.includes(share.shareId);
              const presenter = isOwnShare ? "Your screen" : voice.members.find((member) => member.userId === share.presenterId)?.displayName || "Someone";
              const viewerIds = voice.presenterViewerIds[share.shareId] || [];
              return (
                <div key={share.shareId} data-testid={`live-stream-${share.shareId}`} className={`live-stream-item ${isOwnShare ? "is-own" : ""} ${isSubscribed ? "is-subscribed" : ""}`}>
                  <div className="live-stream-header">
                    <span className="live-stream-presenter"><span className="live-stream-presenter-name">{presenter}</span> <span className="live-stream-live">● LIVE</span></span>
                    {!isOwnShare && <button type="button" className={`live-stream-action ${isSubscribed ? "is-subscribed" : ""}`} data-testid={`stream-action-${share.shareId}`} onClick={() => isSubscribed ? voice.leaveScreenShare(share.shareId) : voice.joinScreenShare(share.shareId)}>{isSubscribed ? "Leave Stream" : "Join Stream"}</button>}
                  </div>
                  {isOwnShare && <div className="live-stream-viewers" data-testid={`stream-viewers-${share.shareId}`}>{viewerIds.length} watching{viewerIds.length > 0 && `: ${viewerIds.map((id) => voice.members.find((member) => member.userId === id)?.displayName || id).join(", ")}`}</div>}
                </div>
              );
            })}
            {voice.streamNotice && <div className="live-stream-notice" role="status">{voice.streamNotice}</div>}
          </section>
        )}

        {voice.debugEvents.length > 0 && (
          <div className="voice-debug-panel" style={{ margin: "0.25rem 0.5rem" }}>
            <div className="voice-debug-header">Voice Debug</div>
            <div className="voice-debug-body">
              <div>status: {voice.status}</div><div>sounds: {voice.voiceSoundsEnabled ? "on" : "off"}</div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.25rem 0" }} />
              {voice.debugEvents.slice(-8).map((line, index) => <div key={index} className="debug-line">{line}</div>)}
            </div>
          </div>
        )}
      </div>

      {showUserPanel && <UserPanel user={user} status={userStatus} voice={voice}
        channelName={voiceChannels.find((channel) => channel.id === voice.channelId)?.name}
        canSpeak={voice.channelId ? (() => {
          const channel = voiceChannels.find((item) => item.id === voice.channelId);
          return channel?.effectivePermissions === undefined || hasServerPermission(
            parsePermissionMask(channel.effectivePermissions),
            SERVER_PERMISSIONS.SPEAK,
          );
        })() : true}
        onSetStatus={onSetStatus} onLogout={onLogout} />}
      {contextMenu && <ContextMenu items={contextMenu.items} ariaLabel={contextMenu.label} returnFocusTo={contextMenu.invoker}
        fallbackFocusTo={sidebarRef.current} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
