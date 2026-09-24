"use client";

import UserAvatar from "../ui/UserAvatar";

import { useState, useRef, useEffect } from "react";
import Tooltip from "../ui/Tooltip";
import { MicIcon, MicOffIcon, HeadphonesIcon, HeadphonesOffIcon, SettingsIcon, ScreenShareIcon, StopScreenShareIcon } from "../ui/icons";

type UserStatus = "ONLINE" | "IDLE" | "DO_NOT_DISTURB" | "OFFLINE";

interface Props {
  user: { id: string; username: string; displayName: string } | null;
  status: UserStatus;
  voice: {
    isMuted: boolean;
    isDeafened: boolean;
    serverMuted: boolean;
    channelId: string | null;
    status: string;
    screenShareStatus: "idle" | "starting" | "live" | "stopping";
    screenShareFeedback?: string | null;
    toggleMute: () => void;
    toggleDeafen: () => void;
    leave: () => void;
    startScreenShare: () => void;
    stopScreenShare: () => void;
  };
  channelName?: string;
  canSpeak?: boolean;
  onSetStatus: (status: UserStatus) => void;
  onLogout: () => void;
  onSettings?: () => void;
}

const statusLabels: Record<UserStatus, string> = {
  ONLINE: "Online",
  IDLE: "Away",
  DO_NOT_DISTURB: "Busy",
  OFFLINE: "Offline",
};

const statusDots: Record<UserStatus, string> = {
  ONLINE: "online",
  IDLE: "idle",
  DO_NOT_DISTURB: "dnd",
  OFFLINE: "offline",
};

export default function UserPanel({ user, status, voice, channelName, canSpeak = true, onSetStatus, onLogout, onSettings }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inVoice = !!voice.channelId;
  const isScreenShareBusy = voice.screenShareStatus === "starting" || voice.screenShareStatus === "stopping";
  const isScreenShareLive = voice.screenShareStatus === "live";
  const speakDenied = inVoice && voice.isMuted && !canSpeak;
  const screenShareLabel = isScreenShareLive ? "Stop sharing" : voice.screenShareStatus === "starting" ? "Starting screen share" : voice.screenShareStatus === "stopping" ? "Stopping screen share" : "Share your screen";
  const muteLabel = speakDenied ? "You do not have permission to speak in this channel" : inVoice ? (voice.isMuted ? "Unmute" : "Mute") : "Mute";
  const deafenLabel = inVoice ? (voice.isDeafened ? "Undeafen" : "Deafen") : "Deafen";

  // Ping simulation (would come from WS in production)
  const pingEstimate = inVoice ? 45 : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMenu(false); };
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showMenu]);

  return (
    <div className="user-panel">
      {inVoice && (
        <div className="voice-connection">
          <Tooltip text={pingEstimate !== null ? `${pingEstimate}ms` : "Latency unavailable"}>
            <span className="voice-connection-quality">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="2" y="16" width="4" height="6" rx="1" />
                <rect x="10" y="12" width="4" height="10" rx="1" />
                <rect x="18" y="8" width="4" height="14" rx="1" />
              </svg>
            </span>
          </Tooltip>
          <div className="voice-connection-info">
            <div className="voice-connection-name">{channelName || "Voice Channel"}</div>
            <div className="voice-connection-status">Voice Connected</div>
          </div>
          <div className="voice-connection-actions">
            <Tooltip text="Camera (coming soon)">
              <span className="user-panel-btn" style={{ cursor: "default", opacity: 0.4, fontSize: "0.7rem" }}>📷</span>
            </Tooltip>
            <Tooltip text={screenShareLabel}>
              <button
                type="button"
                className={`user-panel-btn screen-share-control ${isScreenShareLive ? "active live" : ""} ${isScreenShareBusy ? "pending" : ""}`}
                aria-label={screenShareLabel}
                aria-busy={isScreenShareBusy}
                title={screenShareLabel}
                disabled={isScreenShareBusy}
                onClick={isScreenShareLive ? voice.stopScreenShare : voice.startScreenShare}
              >
                {isScreenShareLive || voice.screenShareStatus === "stopping" ? <StopScreenShareIcon size={16} /> : <ScreenShareIcon size={16} />}
                {isScreenShareLive && <span className="screen-share-live-label">LIVE</span>}
              </button>
            </Tooltip>
            <Tooltip text="Leave voice">
              <button type="button" className="user-panel-btn voice-leave-button" aria-label="Leave voice" onClick={voice.leave}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-8" /><path d="M18 8l4 4-4 4" />
                  <path d="M2 12a10 10 0 0 0 13.5 9" /><path d="M2 12a10 10 0 0 1 13.5-9" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {inVoice && voice.screenShareFeedback && <div className="screen-share-stop-feedback" role="status" aria-live="polite">{voice.screenShareFeedback}</div>}

      <div className="user-panel-controls">
        <div className="user-panel-avatar" onClick={() => setShowMenu(!showMenu)} title="Set status">
          <UserAvatar userId={user?.id} name={user?.username} />
          <span className={`status-dot ${statusDots[status]}`} />
        </div>
        <div className="user-panel-info" onClick={() => setShowMenu(!showMenu)}>
          <div className="user-panel-name">{user?.displayName || ""}</div>
          <div className="user-panel-tag">{statusLabels[status]}</div>
        </div>
        <div className="user-panel-actions">
          <Tooltip text={muteLabel}>
            <button type="button" className={`user-panel-btn voice-toggle ${voice.isMuted || voice.serverMuted ? "active" : ""}`}
              aria-label="Mute microphone" aria-pressed={voice.isMuted || voice.serverMuted}
              disabled={speakDenied} aria-disabled={speakDenied} onClick={voice.toggleMute}>
              {voice.isMuted || voice.serverMuted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
            </button>
          </Tooltip>
          <Tooltip text={deafenLabel}>
            <button type="button" className={`user-panel-btn voice-toggle ${voice.isDeafened ? "active" : ""}`}
              aria-label="Deafen audio" aria-pressed={voice.isDeafened} onClick={voice.toggleDeafen}>
              {voice.isDeafened ? <HeadphonesOffIcon size={16} /> : <HeadphonesIcon size={16} />}
            </button>
          </Tooltip>
          <Tooltip text="User Settings">
            <button type="button" className="user-panel-btn" aria-label="Open User Settings" onClick={onSettings}>
              <SettingsIcon size={16} />
            </button>
          </Tooltip>
        </div>

        {showMenu && (
          <div className="user-menu" ref={menuRef}>
            <div className="user-menu-header">
              {user?.displayName || ""}
              <span className="user-menu-tag">@{user?.username || ""}</span>
            </div>
            <div className="user-menu-status-header">Set Status</div>
            {(Object.keys(statusLabels) as UserStatus[]).map((s) => (
              <button key={s} className={`user-menu-item ${status === s ? "active" : ""}`}
                onClick={() => { onSetStatus(s); setShowMenu(false); }}>
                <span className={`status-dot-sm ${statusDots[s]}`} />
                {statusLabels[s]}
              </button>
            ))}
            <div className="user-menu-divider" />
            <button className="user-menu-item danger" onClick={() => { onLogout(); setShowMenu(false); }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
