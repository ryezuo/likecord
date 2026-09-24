import type { Role, ServerMember } from "./api";
import { hasServerPermission, parsePermissionMask, SERVER_PERMISSIONS } from "./permissions";

export type MemberCommand = { kind: "role"; roleId: string; assigned: boolean }
  | { kind: "mute" | "unmute" | "kick" | "ban" | "copy" };
export interface MemberContextAction {
  label: string;
  command: MemberCommand;
  checked?: boolean;
  danger?: boolean;
  description?: string;
}
export interface MemberContextActions {
  roles: MemberContextAction[];
  moderation: MemberContextAction[];
  utility: MemberContextAction[];
}

export const memberIdentity = (member: ServerMember) => member.user.displayName || member.user.username;

// Presentation eligibility only. Every mutation still uses canonical backend
// permission/hierarchy checks; Voice presence never grants server authority.
export function buildMemberContextActions({ serverId, ownerId, myUserId, effectivePermissions, members, roles, target }: {
  serverId: string; ownerId: string; myUserId: string; effectivePermissions: string;
  members: ServerMember[]; roles: Role[]; target: ServerMember;
}): MemberContextActions {
  const result: MemberContextActions = { roles: [], moderation: [], utility: [] };
  if (target.serverId !== serverId || target.isBanned) return result;
  result.utility.push({ label: "Copy User ID", command: { kind: "copy" } });
  const actor = members.find((member) => member.userId === myUserId && member.serverId === serverId && !member.isBanned);
  if (!actor) return result;
  const mask = parsePermissionMask(effectivePermissions);
  const owner = myUserId === ownerId;
  const allowed = (permission: bigint) => owner || hasServerPermission(mask, permission);
  const highest = (member: ServerMember) => Math.max(0, ...(member.roles ?? [])
    .filter(({ role }) => role.serverId === serverId).map(({ role }) => role.position));
  const actorPosition = owner ? Infinity : highest(actor);
  const manageable = target.userId !== ownerId && target.userId !== myUserId && (owner || actorPosition > highest(target));
  const rolesManageable = owner || (target.userId !== ownerId && target.userId !== myUserId && actorPosition > highest(target));
  if (allowed(SERVER_PERMISSIONS.MANAGE_ROLES) && rolesManageable) {
    const assignedIds = new Set(target.roles.map(({ roleId }) => roleId));
    for (const role of roles) {
      if (role.serverId !== serverId || role.isDefault || (!owner && role.position >= actorPosition)) continue;
      const assigned = assignedIds.has(role.id);
      if (!assigned && !owner && (parsePermissionMask(role.permissions) & ~mask) !== 0n) continue;
      result.roles.push({ label: role.name, checked: assigned, command: { kind: "role", roleId: role.id, assigned } });
    }
  }
  if (manageable) {
    if (allowed(SERVER_PERMISSIONS.MUTE_MEMBERS)) result.moderation.push({
      label: target.isMuted ? "Server Unmute" : "Server Mute",
      description: target.isMuted ? "Unmute this member on the server." : "Mute this member on the server.",
      command: { kind: target.isMuted ? "unmute" : "mute" },
    });
    if (allowed(SERVER_PERMISSIONS.KICK_MEMBERS)) result.moderation.push({ label: "Kick", danger: true, command: { kind: "kick" } });
    if (allowed(SERVER_PERMISSIONS.BAN_MEMBERS)) result.moderation.push({ label: "Ban", danger: true, command: { kind: "ban" } });
  }
  return result;
}
