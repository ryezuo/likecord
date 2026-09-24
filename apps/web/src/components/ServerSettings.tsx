"use client";

import UserAvatar from "./ui/UserAvatar";

import { useEffect, useMemo, useState } from "react";
import { auditLogApi, memberApi, roleApi, serverApi, type AuditLogEntry, type Role, type ServerMember } from "../lib/api";
import { hasServerPermission, parsePermissionMask, SERVER_PERMISSIONS } from "../lib/permissions";
import InviteAdministration from "./InviteAdministration";
import SettingsLayer, { type SettingsNavigationGroup } from "./settings/SettingsLayer";

const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: Array<{ key: string; label: string; bit: bigint }>;
}> = [
  {
    label: "General / Server",
    permissions: [
      { key: "ADMINISTRATOR", label: "Administrator", bit: SERVER_PERMISSIONS.ADMINISTRATOR },
      { key: "MANAGE_SERVER", label: "Manage Server", bit: SERVER_PERMISSIONS.MANAGE_SERVER },
      { key: "MANAGE_ROLES", label: "Manage Roles", bit: SERVER_PERMISSIONS.MANAGE_ROLES },
      { key: "MANAGE_CHANNELS", label: "Manage Channels", bit: SERVER_PERMISSIONS.MANAGE_CHANNELS },
      { key: "CREATE_INVITE", label: "Create Invite", bit: SERVER_PERMISSIONS.CREATE_INVITE },
      { key: "KICK_MEMBERS", label: "Kick Members", bit: SERVER_PERMISSIONS.KICK_MEMBERS },
      { key: "BAN_MEMBERS", label: "Ban Members", bit: SERVER_PERMISSIONS.BAN_MEMBERS },
    ],
  },
  {
    label: "Text",
    permissions: [
      { key: "VIEW_CHANNEL", label: "View Channel", bit: SERVER_PERMISSIONS.VIEW_CHANNEL },
      { key: "SEND_MESSAGES", label: "Send Messages", bit: SERVER_PERMISSIONS.SEND_MESSAGES },
      { key: "MANAGE_MESSAGES", label: "Manage Messages", bit: SERVER_PERMISSIONS.MANAGE_MESSAGES },
      { key: "ATTACH_FILES", label: "Attach Files", bit: SERVER_PERMISSIONS.ATTACH_FILES },
      { key: "READ_MESSAGE_HISTORY", label: "Read Message History", bit: SERVER_PERMISSIONS.READ_MESSAGE_HISTORY },
    ],
  },
  {
    label: "Voice",
    permissions: [
      { key: "CONNECT", label: "Connect", bit: SERVER_PERMISSIONS.CONNECT },
      { key: "SPEAK", label: "Speak", bit: SERVER_PERMISSIONS.SPEAK },
      { key: "STREAM", label: "Stream", bit: SERVER_PERMISSIONS.STREAM },
      { key: "MUTE_MEMBERS", label: "Mute Members", bit: SERVER_PERMISSIONS.MUTE_MEMBERS },
      { key: "DEAFEN_MEMBERS", label: "Deafen Members", bit: SERVER_PERMISSIONS.DEAFEN_MEMBERS },
      { key: "MOVE_MEMBERS", label: "Move Members", bit: SERVER_PERMISSIONS.MOVE_MEMBERS },
    ],
  },
];

const ALL_PERMISSION_ITEMS = PERMISSION_GROUPS.flatMap((group) => group.permissions);
export type ServerSettingsTab = "general" | "roles" | "members" | "invites" | "audit-logs" | "delete";

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => Promise<void>;
}

interface Props {
  serverId: string;
  serverName: string;
  ownerId: string;
  myUserId: string | undefined;
  effectivePermissions?: string;
  refreshKey?: number;
  initialTab?: ServerSettingsTab;
  onClose: () => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
}

export default function ServerSettings({
  serverId, serverName, ownerId, myUserId, effectivePermissions, refreshKey,
  initialTab, onClose, onUpdateName, onDelete,
}: Props) {
  const [tab, setTab] = useState<ServerSettingsTab>(initialTab ?? "general");
  const [editName, setEditName] = useState(serverName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [draggingRoleId, setDraggingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99aab5");
  const [newRolePerms, setNewRolePerms] = useState<bigint>(0n);
  const [newRoleHoisted, setNewRoleHoisted] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const isOwner = myUserId === ownerId;
  const permissionMask = parsePermissionMask(effectivePermissions);
  const canManageServer = isOwner || hasServerPermission(permissionMask, SERVER_PERMISSIONS.MANAGE_SERVER);
  const canManageRoles = isOwner || hasServerPermission(permissionMask, SERVER_PERMISSIONS.MANAGE_ROLES);
  const canKickMembers = isOwner || hasServerPermission(permissionMask, SERVER_PERMISSIONS.KICK_MEMBERS);
  const canBanMembers = isOwner || hasServerPermission(permissionMask, SERVER_PERMISSIONS.BAN_MEMBERS);
  const canMuteMembers = isOwner || hasServerPermission(permissionMask, SERVER_PERMISSIONS.MUTE_MEMBERS);
  const canModerateMembers = canKickMembers || canBanMembers || canMuteMembers;

  const availableTabs = useMemo(() => [
    ...(canManageServer ? (["general"] as ServerSettingsTab[]) : []),
    ...(canManageRoles ? (["roles"] as ServerSettingsTab[]) : []),
    ...(canModerateMembers ? (["members"] as ServerSettingsTab[]) : []),
    ...(canManageServer ? (["invites", "audit-logs"] as ServerSettingsTab[]) : []),
    ...(isOwner ? (["delete"] as ServerSettingsTab[]) : []),
  ], [canManageServer, canManageRoles, canModerateMembers, isOwner]);

  const navigationGroups = useMemo<SettingsNavigationGroup[]>(() => [
    { label: "SERVER", items: canManageServer ? [{ id: "general", label: "Overview" }] : [] },
    { label: "PEOPLE", items: [
      ...(canManageRoles ? [{ id: "roles", label: "Roles" }] : []),
      ...(canModerateMembers ? [{ id: "members", label: "Members" }] : []),
    ] },
    { label: "INVITES", items: canManageServer ? [{ id: "invites", label: "Invites" }] : [] },
    { label: "ACTIVITY", items: canManageServer ? [{ id: "audit-logs", label: "Audit Log" }] : [] },
    { label: "DANGER ZONE", items: isOwner ? [{ id: "delete", label: "Delete Server", danger: true }] : [] },
  ], [canManageServer, canManageRoles, canModerateMembers, isOwner]);

  const loadRoles = async () => {
    try { setRoles(await roleApi.list(serverId)); } catch { setRoles([]); }
  };
  const loadMembers = async () => {
    try { setMembers(await memberApi.list(serverId)); } catch { setMembers([]); }
  };
  const loadAuditLogs = async () => {
    try { setAuditLogs(await auditLogApi.list(serverId)); } catch { setAuditLogs([]); }
  };

  useEffect(() => {
    if (availableTabs.length === 0) onClose();
    else if (!availableTabs.includes(tab)) setTab(availableTabs[0]);
  }, [availableTabs, onClose, tab]);
  useEffect(() => {
    if (initialTab && availableTabs.includes(initialTab)) setTab(initialTab);
  }, [availableTabs, initialTab]);
  useEffect(() => { void loadRoles(); void loadMembers(); }, [serverId, refreshKey]);
  useEffect(() => { if (tab === "audit-logs" && canManageServer) void loadAuditLogs(); }, [tab, serverId, refreshKey, canManageServer]);

  const actorMember = members.find((member) => member.userId === myUserId);
  const actorHighestPosition = isOwner
    ? Number.POSITIVE_INFINITY
    : Math.max(0, ...(actorMember?.roles?.map((membership) => membership.role.position) ?? []));
  const isRoleManageable = (role: Role): boolean => canManageRoles && (isOwner || role.position < actorHighestPosition);
  const getMemberHighestPosition = (member: ServerMember): number => Math.max(0, ...(member.roles ?? []).map((membership) => membership.role.position));
  const canManageTarget = (member: ServerMember): boolean => {
    if (member.userId === ownerId || member.userId === myUserId) return false;
    return isOwner || actorHighestPosition > getMemberHighestPosition(member);
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || !canManageServer) return;
    try {
      await serverApi.update(serverId, { name: editName });
      onUpdateName(editName);
      setError("");
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Failed to update server"); }
  };
  const handleDelete = async () => {
    if (!isOwner || deleteConfirmName !== serverName) return;
    try { await serverApi.delete(serverId); onDelete(); }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Failed to delete server"); }
  };
  const handleCreateRole = async () => {
    if (!canManageRoles || !newRoleName.trim()) return;
    setRoleError("");
    try {
      await roleApi.create(serverId, {
        name: newRoleName.trim(),
        color: parseInt(newRoleColor.replace("#", ""), 16),
        permissions: newRolePerms.toString(),
        isHoisted: newRoleHoisted,
      });
      setShowCreateRole(false);
      setNewRoleName("");
      setNewRoleColor("#99aab5");
      setNewRolePerms(0n);
      setNewRoleHoisted(false);
      await loadRoles();
    } catch (caught: unknown) { setRoleError(caught instanceof Error ? caught.message : "Failed to create role"); }
  };
  const handleUpdateRole = async (roleId: string, data: { name?: string; permissions?: string; isHoisted?: boolean }) => {
    try { await roleApi.update(serverId, roleId, data); setEditRoleId(null); await loadRoles(); }
    catch (caught: unknown) { setRoleError(caught instanceof Error ? caught.message : "Failed to update role"); }
  };
  const handleDeleteRole = async (roleId: string) => {
    try { await roleApi.delete(serverId, roleId); await loadRoles(); }
    catch (caught: unknown) { setRoleError(caught instanceof Error ? caught.message : "Failed to delete role"); }
  };
  const persistRoleOrder = async (nextCustomRoles: Role[]) => {
    const everyone = roles.filter((role) => role.isDefault);
    setRoles([...nextCustomRoles, ...everyone]);
    try { setRoles(await roleApi.reorder(serverId, nextCustomRoles.map((role) => role.id))); setRoleError(""); }
    catch (caught: unknown) {
      setRoleError(caught instanceof Error ? caught.message : "Failed to reorder roles");
      await loadRoles();
    }
  };
  const moveRole = (roleId: string, offset: number) => {
    const customRoles = roles.filter((role) => !role.isDefault);
    const from = customRoles.findIndex((role) => role.id === roleId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= customRoles.length) return;
    if (!isRoleManageable(customRoles[from]) || !isRoleManageable(customRoles[to])) return;
    const next = [...customRoles];
    [next[from], next[to]] = [next[to], next[from]];
    void persistRoleOrder(next);
  };
  const dropRole = (targetRoleId: string) => {
    if (!draggingRoleId || draggingRoleId === targetRoleId) return;
    const customRoles = roles.filter((role) => !role.isDefault);
    const from = customRoles.findIndex((role) => role.id === draggingRoleId);
    const to = customRoles.findIndex((role) => role.id === targetRoleId);
    if (from < 0 || to < 0 || !isRoleManageable(customRoles[from]) || !isRoleManageable(customRoles[to])) return;
    const next = [...customRoles];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggingRoleId(null);
    void persistRoleOrder(next);
  };
  const showConfirm = (title: string, message: string, danger: boolean, onConfirm: () => Promise<void>) => {
    setConfirm({ title, message, confirmLabel: danger ? "Confirm" : "OK", danger, onConfirm });
  };
  const executeConfirm = async () => {
    if (!confirm) return;
    try { await confirm.onConfirm(); }
    catch (caught: unknown) { setMemberError(caught instanceof Error ? caught.message : "Action failed"); }
    setConfirm(null);
  };
  const runMemberAction = async (action: () => Promise<unknown>) => {
    try { await action(); await loadMembers(); setMemberError(""); }
    catch (caught: unknown) { setMemberError(caught instanceof Error ? caught.message : "Action failed"); }
  };
  const toggleNewPermission = (bit: bigint) => setNewRolePerms((current) => (current & bit) !== 0n ? current & ~bit : current | bit);
  const renderColorPreview = (color: number) => <span className="role-color-preview" style={{ background: `#${color.toString(16).padStart(6, "0")}` }} />;

  return (
    <SettingsLayer title="Server Settings" resourceName={serverName} groups={navigationGroups} activeId={tab} onSelect={(id) => setTab(id as ServerSettingsTab)} onClose={onClose}>
          <div className="settings-content">
            {error && <div className="error-banner settings-feedback">{error}<button className="btn btn-ghost btn-icon settings-feedback-dismiss" aria-label="Dismiss server settings error" onClick={() => setError("")}>✕</button></div>}
            {roleError && <div className="error-banner settings-feedback">{roleError}<button className="btn btn-ghost btn-icon settings-feedback-dismiss" aria-label="Dismiss role error" onClick={() => setRoleError("")}>✕</button></div>}
            {memberError && <div className="error-banner settings-feedback">{memberError}<button className="btn btn-ghost btn-icon settings-feedback-dismiss" aria-label="Dismiss member error" onClick={() => setMemberError("")}>✕</button></div>}

            {tab === "general" && canManageServer && (
              <section className="settings-section settings-overview-section" aria-labelledby="server-overview-title">
                <h3 id="server-overview-title">Overview</h3>
                <label htmlFor="server-settings-name">Server Name</label>
                <input id="server-settings-name" value={editName} onChange={(event) => setEditName(event.target.value)} />
                <button className="btn btn-primary" onClick={handleUpdateName}>Save Changes</button>
              </section>
            )}

            {tab === "roles" && canManageRoles && (
              <section className="settings-section" aria-labelledby="roles-settings-title">
                <div className="settings-header-row">
                  <div><h3 id="roles-settings-title">Roles</h3><p className="text-muted">Higher roles appear first. Drag a manageable role or use the arrow controls.</p></div>
                  <button className="btn btn-primary" onClick={() => setShowCreateRole(true)}>Create Role</button>
                </div>
                <div className="role-list">
                  {roles.map((role, roleIndex) => {
                    const manageable = isRoleManageable(role);
                    const customRoles = roles.filter((candidate) => !candidate.isDefault);
                    const customIndex = customRoles.findIndex((candidate) => candidate.id === role.id);
                    const previous = customRoles[customIndex - 1];
                    const next = customRoles[customIndex + 1];
                    const canMoveUp = !role.isDefault && manageable && !!previous && isRoleManageable(previous);
                    const canMoveDown = !role.isDefault && manageable && !!next && isRoleManageable(next);
                    const rolePermissions = parsePermissionMask(role.permissions);

                    if (editRoleId === role.id) {
                      return <div key={role.id} className="role-card editing">
                        <input value={role.name} onChange={(event) => setRoles((current) => current.map((candidate) => candidate.id === role.id ? { ...candidate, name: event.target.value } : candidate))} disabled={role.isDefault} />
                        {(rolePermissions & SERVER_PERMISSIONS.ADMINISTRATOR) !== 0n && <div className="error-banner">Administrator grants all server permissions. Assign with caution.</div>}
                        {PERMISSION_GROUPS.map((group) => <div className="permission-group" key={group.label}>
                          <div className="perm-toggles-header">{group.label}</div>
                          <div className="perm-toggles">{group.permissions.map((permission) => <label key={permission.key} className="perm-toggle">
                            <input type="checkbox" checked={(rolePermissions & permission.bit) !== 0n} onChange={() => {
                              const nextPermissions = (rolePermissions & permission.bit) !== 0n ? rolePermissions & ~permission.bit : rolePermissions | permission.bit;
                              setRoles((current) => current.map((candidate) => candidate.id === role.id ? { ...candidate, permissions: nextPermissions.toString() } : candidate));
                            }} /><span>{permission.label}</span>
                          </label>)}</div>
                        </div>)}
                        <label className="role-hoist-toggle"><input type="checkbox" checked={role.isHoisted} disabled={role.isDefault} onChange={(event) => setRoles((current) => current.map((candidate) => candidate.id === role.id ? { ...candidate, isHoisted: event.target.checked } : candidate))} />Display members separately</label>
                        <div className="role-edit-actions">
                          <button className="btn btn-primary" onClick={() => void handleUpdateRole(role.id, { ...(role.isDefault ? {} : { name: role.name }), permissions: role.permissions, isHoisted: role.isDefault ? false : role.isHoisted })}>Save</button>
                          <button className="btn btn-secondary" onClick={() => { setEditRoleId(null); void loadRoles(); }}>Cancel</button>
                        </div>
                      </div>;
                    }

                    const permissionLabels = ALL_PERMISSION_ITEMS.filter((permission) => (rolePermissions & permission.bit) !== 0n).map((permission) => permission.label);
                    return <div key={role.id} className={`role-card ${role.isDefault ? "default" : ""} ${!manageable ? "protected" : ""} ${draggingRoleId === role.id ? "dragging" : ""}`}
                      draggable={!role.isDefault && manageable} onDragStart={() => setDraggingRoleId(role.id)} onDragEnd={() => setDraggingRoleId(null)}
                      onDragOver={(event) => { if (!role.isDefault && manageable) event.preventDefault(); }} onDrop={() => dropRole(role.id)} data-role-index={roleIndex}>
                      <div className="role-card-header">
                        <span className="role-drag-handle" title={role.isDefault ? "@everyone is fixed" : manageable ? "Drag to reorder" : "Protected by hierarchy"}>☰</span>
                        {role.color ? renderColorPreview(role.color) : null}<span className="role-name">{role.isDefault ? "@everyone" : role.name}</span>
                        {role.isHoisted && <span className="member-badge">Separate group</span>}{!manageable && <span className="role-protected-label">Protected</span>}<span className="role-position">Position: {role.position}</span>
                        <div className="role-card-actions">
                          {!role.isDefault && <button aria-label={`Move ${role.name} up`} onClick={() => moveRole(role.id, -1)} disabled={!canMoveUp}>↑</button>}
                          {!role.isDefault && <button aria-label={`Move ${role.name} down`} onClick={() => moveRole(role.id, 1)} disabled={!canMoveDown}>↓</button>}
                          <button onClick={() => setEditRoleId(role.id)} disabled={!manageable}>Edit</button>
                          {!role.isDefault && <button className="role-delete-action" onClick={() => showConfirm("Delete Role", `Delete role "${role.name}"?`, true, () => handleDeleteRole(role.id))} disabled={!manageable}>Delete</button>}
                        </div>
                      </div>
                      <div className="role-perms-summary">{permissionLabels.length === 0 ? <span className="text-muted">No permissions</span> : permissionLabels.slice(0, 5).join(", ") + (permissionLabels.length > 5 ? ` +${permissionLabels.length - 5} more` : "")}</div>
                    </div>;
                  })}
                </div>

                {showCreateRole && <div className="modal-overlay" onClick={() => setShowCreateRole(false)}><div className="modal" onClick={(event) => event.stopPropagation()}>
                  <h3>Create Role</h3><label>Name</label><input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Role name" />
                  <label>Color</label><input type="color" value={newRoleColor} onChange={(event) => setNewRoleColor(event.target.value)} />
                  {(newRolePerms & SERVER_PERMISSIONS.ADMINISTRATOR) !== 0n && <div className="error-banner">Administrator grants all server permissions. Assign with caution.</div>}
                  {PERMISSION_GROUPS.map((group) => <div className="permission-group" key={group.label}><div className="perm-toggles-header">{group.label}</div><div className="perm-toggles">
                    {group.permissions.map((permission) => <label key={permission.key} className="perm-toggle"><input type="checkbox" checked={(newRolePerms & permission.bit) !== 0n} onChange={() => toggleNewPermission(permission.bit)} /><span>{permission.label}</span></label>)}
                  </div></div>)}
                  <label className="role-hoist-toggle"><input type="checkbox" checked={newRoleHoisted} onChange={(event) => setNewRoleHoisted(event.target.checked)} />Display members separately</label>
                  <button className="btn btn-primary" onClick={handleCreateRole}>Create</button><button className="btn btn-secondary" onClick={() => { setShowCreateRole(false); setRoleError(""); }}>Cancel</button>
                </div></div>}
              </section>
            )}

            {tab === "members" && canModerateMembers && <section className="settings-section" aria-labelledby="member-moderation-title">
              <h3 id="member-moderation-title">Member Moderation</h3><p className="text-muted">Assign ordinary roles from the persistent Member List context menu.</p>
              <div className="member-list">{members.filter((member) => !member.isBanned).map((member) => {
                const manageableTarget = canManageTarget(member);
                return <div key={member.id} className={`member-card ${member.userId === ownerId ? "owner" : ""}`}>
                  <div className="member-card-header"><span className="member-avatar"><UserAvatar userId={member.userId} name={member.user.displayName} avatarUrl={member.user.avatarUrl} /></span><span className="member-name">{member.user.displayName}</span><span className="member-username">@{member.user.username}</span>
                    {member.userId === ownerId && <span className="member-badge">Real Owner</span>}{member.isMuted && <span className="member-badge muted">Muted</span>}
                  </div>
                  {manageableTarget && <div className="member-actions">
                    {canKickMembers && <button className="sm-btn danger" onClick={() => showConfirm("Kick Member", `Kick @${member.user.username}?`, true, () => runMemberAction(() => memberApi.kick(serverId, member.id)))}>Kick</button>}
                    {canBanMembers && <button className="sm-btn danger" onClick={() => showConfirm("Ban Member", `Ban @${member.user.username}?`, true, () => runMemberAction(() => memberApi.ban(serverId, member.id)))}>Ban</button>}
                    {canMuteMembers && (member.isMuted ? <button className="sm-btn" onClick={() => void runMemberAction(() => memberApi.unmute(serverId, member.id))}>Unmute</button> : <button className="sm-btn" onClick={() => void runMemberAction(() => memberApi.mute(serverId, member.id))}>Mute</button>)}
                  </div>}
                </div>;
              })}
              {canBanMembers && members.some((member) => member.isBanned) && <div className="banned-section"><h4>Banned Members</h4>{members.filter((member) => member.isBanned).map((member) => <div key={member.id} className="member-card banned">
                <span className="member-name">{member.user.displayName}</span><span className="member-username">@{member.user.username}</span><button className="sm-btn" onClick={() => void runMemberAction(() => memberApi.unban(serverId, member.id))}>Unban</button>
              </div>)}</div>}
              </div>
            </section>}

            {tab === "invites" && canManageServer && <InviteAdministration serverId={serverId} />}

            {tab === "audit-logs" && canManageServer && <section className="settings-section" aria-labelledby="audit-log-title"><h3 id="audit-log-title">Audit Log</h3>{auditLogs.length === 0 ? <p className="text-muted">No audit log entries yet.</p> : <div className="audit-log-list">{auditLogs.map((entry) => <div key={entry.id} className="audit-log-entry">
              <div className="audit-log-action">{entry.action}</div><div className="audit-log-meta"><span>Actor: {entry.actor?.displayName || entry.actor?.username || `${entry.actorId.slice(0, 8)}...`}</span>
                {entry.targetId && <span>Target: {entry.target?.displayName || entry.target?.username || `${entry.targetId.slice(0, 8)}...`}</span>}<span>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
            </div>)}</div>}</section>}

            {tab === "delete" && isOwner && <section className="danger-zone" aria-labelledby="delete-server-title">
              <h3 id="delete-server-title">Delete Server</h3>
              <p className="text-muted">This permanently deletes the Server and its Server-scoped data.</p>
              {!showDeleteConfirm ? <button className="danger-button" onClick={() => setShowDeleteConfirm(true)}>Delete Server</button> : <div>
                <label htmlFor="delete-server-confirmation">Type <strong>{serverName}</strong> to confirm deletion:</label>
                <input id="delete-server-confirmation" value={deleteConfirmName} onChange={(event) => setDeleteConfirmName(event.target.value)} placeholder={serverName} />
                <button className="danger-button" onClick={handleDelete} disabled={deleteConfirmName !== serverName}>Confirm Delete</button>
                <button className="btn btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(""); }}>Cancel</button>
              </div>}
            </section>}
          </div>
        {confirm && <div className="modal-overlay" onClick={() => setConfirm(null)}><div className="modal confirm-modal" onClick={(event) => event.stopPropagation()}>
          <h3>{confirm.title}</h3><p className="confirm-message">{confirm.message}</p><div className="confirm-actions"><button className={`btn ${confirm.danger ? "btn-danger" : "btn-primary"}`} onClick={() => void executeConfirm()}>{confirm.confirmLabel}</button><button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button></div>
        </div></div>}
    </SettingsLayer>
  );
}
