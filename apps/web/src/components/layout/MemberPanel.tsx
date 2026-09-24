"use client";

import UserAvatar from "../ui/UserAvatar";

import { useEffect, useRef, useState } from "react";
import { type Role, type ServerMember } from "../../lib/api";
import type { MemberContext } from "../../hooks/useMemberContext";
import { contextMenuTrigger } from "../ui/contextMenuTrigger";
import Tooltip from "../ui/Tooltip";

interface Props {
  serverId: string | null;
  context: MemberContext;
  voiceMembers: Array<{ userId: string }>;
  presenceMap: Record<string, string>;
  visible?: boolean;
  showHeader?: boolean;
  onToggleVisibility?: () => void;
}

export interface GroupedMember {
  key: string;
  label: string;
  roleColor: number;
  members: ServerMember[];
}

const TOGGLE_KEY = "member_panel_visible";
const STATUS_LABELS: Record<string, string> = { ONLINE: "Online", IDLE: "Away", DO_NOT_DISTURB: "Busy", OFFLINE: "Offline" };
const STATUS_COLORS: Record<string, number> = { ONLINE: 0x23a559, IDLE: 0xf0b232, DO_NOT_DISTURB: 0xda373c, OFFLINE: 0x80848e };

function isPanelVisible(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TOGGLE_KEY) !== "false";
}

function compareRoles(left: Role, right: Role): number {
  if (left.position !== right.position) return right.position - left.position;
  const created = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  return created || left.id.localeCompare(right.id);
}

export function buildMemberGroups(
  members: ServerMember[],
  presenceMap: Record<string, string>,
): GroupedMember[] {
  const activeMembers = members.filter((member) => !member.isBanned);
  const hoisted = new Map<string, { role: Role; members: ServerMember[] }>();
  const statusGroups: Record<string, ServerMember[]> = { ONLINE: [], IDLE: [], DO_NOT_DISTURB: [], OFFLINE: [] };

  for (const member of activeMembers) {
    const highestHoisted = (member.roles ?? [])
      .map((membership) => membership.role)
      .filter((role) => role.isHoisted && !role.isDefault)
      .sort(compareRoles)[0];
    if (highestHoisted) {
      const group = hoisted.get(highestHoisted.id) ?? { role: highestHoisted, members: [] };
      group.members.push(member);
      hoisted.set(highestHoisted.id, group);
      continue;
    }

    const status = presenceMap[member.userId] || "OFFLINE";
    (statusGroups[status] ?? statusGroups.OFFLINE).push(member);
  }

  const groups: GroupedMember[] = Array.from(hoisted.values())
    .sort((left, right) => compareRoles(left.role, right.role))
    .map(({ role, members: groupedMembers }) => ({ key: `role:${role.id}`, label: role.name, roleColor: role.color, members: groupedMembers }));

  for (const status of ["ONLINE", "IDLE", "DO_NOT_DISTURB", "OFFLINE"]) {
    if (statusGroups[status].length > 0) {
      groups.push({ key: `status:${status}`, label: STATUS_LABELS[status], roleColor: STATUS_COLORS[status], members: statusGroups[status] });
    }
  }
  return groups;
}

export default function MemberPanel({
  serverId, context, voiceMembers, presenceMap,
  visible: controlledVisible, showHeader = true, onToggleVisibility,
}: Props) {
  const { members, ownerId } = context;
  const [internalVisible, setInternalVisible] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setInternalVisible(isPanelVisible()); }, []);
  const visible = controlledVisible ?? internalVisible;

  const handleMemberContext = (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, member: ServerMember) => {
    const trigger = contextMenuTrigger(event);
    if (trigger) context.open(member.userId, "member", trigger, panelRef.current);
  };

  const toggleVisibility = () => {
    context.closeOrigin("member");
    if (onToggleVisibility) {
      onToggleVisibility();
      return;
    }
    setInternalVisible((current) => {
      const next = !current;
      localStorage.setItem(TOGGLE_KEY, String(next));
      return next;
    });
  };

  if (!serverId || !visible) {
    return showHeader ? <div className="member-panel-toggle" ref={panelRef} tabIndex={-1}><Tooltip text="Show member list"><button onClick={toggleVisibility} className="btn btn-ghost btn-icon member-panel-toggle-btn">👥</button></Tooltip></div> : null;
  }

  const activeMembers = members.filter((member) => !member.isBanned);
  const groups = buildMemberGroups(members, presenceMap);

  return (
    <div className="member-panel" ref={panelRef} tabIndex={-1} aria-label="Member list">
      {showHeader && <div className="member-panel-header"><span>Membros — {activeMembers.length}</span><Tooltip text="Hide member list"><button onClick={toggleVisibility} className="btn btn-ghost btn-icon member-panel-toggle-btn">✕</button></Tooltip></div>}
      {context.loadError && !context.entry && <div className="member-panel-error" role="alert">
        {context.loadError} <button type="button" onClick={context.retry}>Retry member list</button>
      </div>}
      <div className="member-panel-scroll likecord-scrollbar shell-hover-scrollbar">
        {groups.length === 0 && <div className="member-group-empty">No members to display</div>}
        {groups.map((group) => <div key={group.key} className="member-group" role="list" aria-label={`${group.label} members`}>
          <div className={`member-group-label member-group-${group.key.startsWith("status:") ? group.key.slice(7).toLowerCase() : "role"}`}><span style={{ color: !group.key.startsWith("status:") && group.roleColor ? `#${group.roleColor.toString(16).padStart(6, "0")}` : undefined }}>{group.label.toUpperCase()}</span><span className="member-group-count"> — {group.members.length}</span></div>
          {group.members.map((member) => {
            const memberStatus = presenceMap[member.userId] || "OFFLINE";
            const isOwnerMember = member.userId === ownerId;
            const statusClass = memberStatus === "ONLINE" ? "online" : memberStatus === "IDLE" ? "idle" : memberStatus === "DO_NOT_DISTURB" ? "dnd" : "offline";
            const isVoiceConnected = voiceMembers.some((voiceMember) => voiceMember.userId === member.userId);
            return <div key={member.id} className="member-row" role="listitem" tabIndex={0} aria-haspopup={context.voiceChannelFor(member.userId) ? "dialog" : "menu"}
              aria-expanded={context.entry?.origin === "member" && context.entry.userId === member.userId}
              aria-label={`${member.user.displayName || member.user.username}, member actions`}
              onContextMenu={(event) => handleMemberContext(event, member)} onKeyDown={(event) => handleMemberContext(event, member)}>
              <div className={`member-row-avatar ${statusClass}${isOwnerMember ? " owner" : ""}`}><UserAvatar userId={member.userId} name={member.user.displayName} avatarUrl={member.user.avatarUrl} interactive /></div>
              <div className="member-row-info"><div className="member-row-name">{isOwnerMember && <span className="member-row-badge" title="Real server owner">👑</span>}{member.user.displayName}{isVoiceConnected && <span className="member-row-voice" title="In voice">🔊</span>}</div><div className="member-row-status">{STATUS_LABELS[memberStatus] || "Offline"}</div></div>
            </div>;
          })}
        </div>)}
      </div>
    </div>
  );
}
