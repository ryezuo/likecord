"use client";

import Tooltip from "../ui/Tooltip";
import { MembersIcon } from "../ui/icons";

interface Props {
  title: string;
  connected: boolean;
  socketId?: string;
  activeChannelId?: string | null;
  memberCount?: number;
  memberPanelVisible?: boolean;
  onToggleMemberPanel?: () => void;
}

export default function AppShellHeader({
  title,
  connected,
  socketId,
  activeChannelId,
  memberCount,
  memberPanelVisible,
  onToggleMemberPanel,
}: Props) {
  const memberToggleLabel = memberPanelVisible ? "Hide member list" : "Show member list";

  return (
    <header className="chat-header app-shell-header">
      <span className="chat-header-name">{title}</span>
      <span className="app-shell-header-actions">
        <span className="ws-info">
          <span className={`ws-status ${connected ? "connected" : "disconnected"}`}>
            {connected ? "• " : "◦ "}
          </span>
          <span className="ws-debug">
            WS:{connected ? "ON" : "OFF"} ID:{socketId?.slice(0, 6) || "-"} CH:{activeChannelId?.slice(0, 6) || "-"}
          </span>
        </span>
        {onToggleMemberPanel && (
          <span className="app-shell-member-control">
            <span className="app-shell-member-count">Members — {memberCount ?? 0}</span>
            <Tooltip text={memberToggleLabel}>
              <button
                type="button"
                className="btn btn-ghost btn-icon member-panel-toggle-btn"
                aria-label={memberToggleLabel}
                aria-pressed={memberPanelVisible}
                onClick={onToggleMemberPanel}
              >
                <MembersIcon size={18} />
              </button>
            </Tooltip>
          </span>
        )}
      </span>
    </header>
  );
}
