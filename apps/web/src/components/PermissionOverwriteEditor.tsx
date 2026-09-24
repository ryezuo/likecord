"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  channelApi,
  memberApi,
  roleApi,
  type PermissionOverwrite,
  type Role,
  type ServerMember,
} from "../lib/api";
import { SERVER_PERMISSIONS } from "../lib/permissions";
import ConfirmModal from "./ui/ConfirmModal";

type TargetType = "ROLE" | "MEMBER";
type PermissionState = "DENY" | "NEUTRAL" | "ALLOW";
type PermissionGroupName = "GENERAL" | "TEXT" | "VOICE";

interface PermissionItem {
  key: string;
  label: string;
  bit: bigint;
}

const PERMISSION_GROUPS: Record<PermissionGroupName, PermissionItem[]> = {
  GENERAL: [
    { key: "VIEW_CHANNEL", label: "View Channel", bit: SERVER_PERMISSIONS.VIEW_CHANNEL },
    { key: "MANAGE_CHANNELS", label: "Manage Channel", bit: SERVER_PERMISSIONS.MANAGE_CHANNELS },
  ],
  TEXT: [
    { key: "SEND_MESSAGES", label: "Send Messages", bit: SERVER_PERMISSIONS.SEND_MESSAGES },
    { key: "MANAGE_MESSAGES", label: "Manage Messages", bit: SERVER_PERMISSIONS.MANAGE_MESSAGES },
    { key: "ATTACH_FILES", label: "Attach Files", bit: SERVER_PERMISSIONS.ATTACH_FILES },
    { key: "READ_MESSAGE_HISTORY", label: "Read Message History", bit: SERVER_PERMISSIONS.READ_MESSAGE_HISTORY },
  ],
  VOICE: [
    { key: "CONNECT", label: "Connect", bit: SERVER_PERMISSIONS.CONNECT },
    { key: "SPEAK", label: "Speak", bit: SERVER_PERMISSIONS.SPEAK },
    { key: "STREAM", label: "Stream", bit: SERVER_PERMISSIONS.STREAM },
  ],
};

interface Props {
  serverId: string;
  ownerId: string;
  actorUserId?: string;
  scope: "CHANNEL" | "CATEGORY";
  scopeId: string;
  channelType?: string;
  refreshKey?: number;
}

interface SelectedTarget {
  type: TargetType;
  id: string;
}

function targetKey(type: TargetType, id: string) {
  return `${type}:${id}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function PermissionOverwriteEditor({
  serverId,
  ownerId,
  actorUserId,
  scope,
  scopeId,
  channelType,
  refreshKey,
}: Props) {
  const [overwrites, setOverwrites] = useState<PermissionOverwrite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [selected, setSelected] = useState<SelectedTarget | null>(null);
  const [pendingTarget, setPendingTarget] = useState<SelectedTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<TargetType>("ROLE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<SelectedTarget | null>(null);
  const loadedIdentityRef = useRef<string | null>(null);

  const loadConfiguration = useCallback(async (preserveSelection = true) => {
    const response = scope === "CHANNEL"
      ? await channelApi.getPermissionConfiguration(scopeId)
      : await channelApi.getCategoryPermissionConfiguration(scopeId);
    setOverwrites(response.overwrites);
    setSelected((current) => {
      if (!preserveSelection || !current) {
        const everyone = roles.find((role) => role.isDefault);
        const initial = response.overwrites.find((overwrite) => everyone && overwrite.targetType === "ROLE" && overwrite.targetId === everyone.id)
          ?? response.overwrites[0];
        return initial ? { type: initial.targetType, id: initial.targetId } : current;
      }
      const stillExists = response.overwrites.some((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) === targetKey(current.type, current.id));
      return stillExists || targetKey(current.type, current.id) === (pendingTarget ? targetKey(pendingTarget.type, pendingTarget.id) : "") ? current : null;
    });
    return response;
  }, [pendingTarget, roles, scope, scopeId]);

  useEffect(() => {
    let cancelled = false;
    const identity = `${serverId}:${scope}:${scopeId}`;
    const isInitialIdentityLoad = loadedIdentityRef.current !== identity;
    if (isInitialIdentityLoad) setLoading(true);
    setError("");
    Promise.all([
      scope === "CHANNEL" ? channelApi.getPermissionConfiguration(scopeId) : channelApi.getCategoryPermissionConfiguration(scopeId),
      roleApi.list(serverId),
      memberApi.list(serverId),
    ]).then(([configuration, nextRoles, nextMembers]) => {
      if (cancelled) return;
      setOverwrites(configuration.overwrites);
      setRoles(nextRoles.filter((role) => role.serverId === serverId));
      setMembers(nextMembers.filter((member) => member.serverId === serverId));
      loadedIdentityRef.current = identity;
      setPendingTarget(null);
      setSelected((current) => {
        if (current && configuration.overwrites.some((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) === targetKey(current.type, current.id))) return current;
        const defaultRole = nextRoles.find((role) => role.serverId === serverId && role.isDefault);
        const defaultOverwrite = configuration.overwrites.find((overwrite) => overwrite.targetType === "ROLE" && overwrite.targetId === defaultRole?.id);
        const initial = defaultOverwrite ?? configuration.overwrites[0];
        return initial ? { type: initial.targetType, id: initial.targetId } : null;
      });
    }).catch((caught: unknown) => {
      if (!cancelled) setError(errorMessage(caught, "Failed to load permission configuration"));
    }).finally(() => { if (!cancelled && isInitialIdentityLoad) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, scope, scopeId, serverId]);

  const actorIsOwner = actorUserId === ownerId;
  const actorMember = members.find((member) => member.userId === actorUserId);
  const actorHighestPosition = actorIsOwner
    ? Number.POSITIVE_INFINITY
    : Math.max(0, ...(actorMember?.roles.map((membership) => membership.role.position) ?? []));
  const configuredKeys = useMemo(() => new Set(overwrites.map((overwrite) => targetKey(overwrite.targetType, overwrite.targetId))), [overwrites]);
  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const roleIsManageable = (role: Role | undefined) => !!role && role.serverId === serverId && (actorIsOwner || role.position < actorHighestPosition);
  const memberIsManageable = (member: ServerMember | undefined) => {
    if (!member || member.serverId !== serverId || member.isBanned) return false;
    if (actorIsOwner) return true;
    if (member.userId === actorUserId || member.userId === ownerId) return false;
    const targetHighestPosition = Math.max(0, ...member.roles.map((membership) => membership.role.position));
    return actorHighestPosition > targetHighestPosition;
  };

  const eligibleRoles = roles
    .filter((role) => roleIsManageable(role) && !configuredKeys.has(targetKey("ROLE", role.id)))
    .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name));
  const eligibleMembers = members
    .filter((member) => memberIsManageable(member) && !configuredKeys.has(targetKey("MEMBER", member.id)))
    .sort((left, right) => left.user.displayName.localeCompare(right.user.displayName));

  const selectedOverwrite = selected
    ? overwrites.find((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) === targetKey(selected.type, selected.id))
    : undefined;
  const selectedRole = selected?.type === "ROLE" ? roleById.get(selected.id) : undefined;
  const selectedMember = selected?.type === "MEMBER" ? memberById.get(selected.id) : undefined;
  const selectedManageable = selected?.type === "ROLE" ? roleIsManageable(selectedRole) : memberIsManageable(selectedMember);
  const allow = BigInt(selectedOverwrite?.allow ?? "0");
  const deny = BigInt(selectedOverwrite?.deny ?? "0");

  const groups: PermissionGroupName[] = scope === "CATEGORY"
    ? ["GENERAL", "TEXT", "VOICE"]
    : channelType === "VOICE" ? ["GENERAL", "VOICE"] : ["GENERAL", "TEXT"];

  const getState = (bit: bigint): PermissionState => {
    if ((deny & bit) !== 0n) return "DENY";
    if ((allow & bit) !== 0n) return "ALLOW";
    return "NEUTRAL";
  };

  const selectNewTarget = (target: SelectedTarget) => {
    setPendingTarget(target);
    setSelected(target);
    setPickerOpen(false);
    setError("");
  };

  const persistState = async (bit: bigint, state: PermissionState) => {
    if (!selected || !selectedManageable || saving) return;
    let nextAllow = allow & ~bit;
    let nextDeny = deny & ~bit;
    if (state === "ALLOW") nextAllow |= bit;
    if (state === "DENY") nextDeny |= bit;

    if (!selectedOverwrite && nextAllow === 0n && nextDeny === 0n) return;
    setSaving(true);
    setError("");
    try {
      const saved = scope === "CHANNEL"
        ? await channelApi.setOverwrite(scopeId, selected.type, selected.id, { allow: nextAllow.toString(), deny: nextDeny.toString() })
        : await channelApi.setCategoryOverwrite(scopeId, selected.type, selected.id, { allow: nextAllow.toString(), deny: nextDeny.toString() });
      setOverwrites((current) => {
        const key = targetKey(saved.targetType, saved.targetId);
        const exists = current.some((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) === key);
        return exists
          ? current.map((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) === key ? saved : overwrite)
          : [...current, saved];
      });
      setPendingTarget(null);
    } catch (caught: unknown) {
      setError(errorMessage(caught, "The permission change was rejected"));
      try { await loadConfiguration(); } catch { /* Retain the actionable mutation error. */ }
    } finally {
      setSaving(false);
    }
  };

  const removeOverwrite = async () => {
    if (!removeTarget || !selectedManageable || saving) return;
    setSaving(true);
    setError("");
    try {
      if (scope === "CHANNEL") await channelApi.deleteOverwrite(scopeId, removeTarget.type, removeTarget.id);
      else await channelApi.deleteCategoryOverwrite(scopeId, removeTarget.type, removeTarget.id);
      const removedKey = targetKey(removeTarget.type, removeTarget.id);
      setOverwrites((current) => current.filter((overwrite) => targetKey(overwrite.targetType, overwrite.targetId) !== removedKey));
      setSelected(null);
      setPendingTarget(null);
    } catch (caught: unknown) {
      setError(errorMessage(caught, "The overwrite could not be removed"));
      try { await loadConfiguration(); } catch { /* Retain the actionable mutation error. */ }
    } finally {
      setRemoveTarget(null);
      setSaving(false);
    }
  };

  const renderRoleName = (role: Role | undefined, fallbackId: string) => role?.isDefault ? (
    <><span>@everyone</span><small>Default role</small></>
  ) : <><span>{role?.name ?? "Unknown role"}</span><small>{role ? `Position ${role.position}` : fallbackId}</small></>;

  const renderMemberName = (member: ServerMember | undefined, fallbackId: string) => (
    <><span>{member?.user.displayName ?? "Unknown member"}</span><small>{member ? `@${member.user.username}` : fallbackId}</small></>
  );

  const renderTargetButton = (target: SelectedTarget, persisted: boolean) => {
    const key = targetKey(target.type, target.id);
    const manageable = target.type === "ROLE" ? roleIsManageable(roleById.get(target.id)) : memberIsManageable(memberById.get(target.id));
    return (
      <button key={key} type="button" className={`permission-target ${selected && targetKey(selected.type, selected.id) === key ? "active" : ""}`}
        onClick={() => { setSelected(target); setError(""); }} aria-label={`Select permission target ${key}`}
        aria-pressed={!!selected && targetKey(selected.type, selected.id) === key}>
        <span className="permission-target-name">
          {target.type === "ROLE" ? renderRoleName(roleById.get(target.id), target.id) : renderMemberName(memberById.get(target.id), target.id)}
        </span>
        {!manageable && <span className="permission-target-protected">Protected</span>}
        {!persisted && <span className="permission-target-draft">All neutral</span>}
      </button>
    );
  };

  if (loading) return <div className="permission-editor-status">Loading permission configuration…</div>;

  const roleOverwrites = overwrites.filter((overwrite) => overwrite.targetType === "ROLE");
  const memberOverwrites = overwrites.filter((overwrite) => overwrite.targetType === "MEMBER");

  return (
    <div className="permission-editor" data-testid={`${scope.toLowerCase()}-permission-editor`}>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="permission-editor-grid">
        <aside className="permission-target-panel">
          <div className="permission-target-heading"><strong>Roles</strong></div>
          {roleOverwrites.length === 0 && pendingTarget?.type !== "ROLE" && <p className="permission-empty">No role overrides</p>}
          {roleOverwrites.map((overwrite) => renderTargetButton({ type: "ROLE", id: overwrite.targetId }, true))}
          {pendingTarget?.type === "ROLE" && !configuredKeys.has(targetKey("ROLE", pendingTarget.id)) && renderTargetButton(pendingTarget, false)}
          <div className="permission-target-heading"><strong>Members</strong></div>
          {memberOverwrites.length === 0 && pendingTarget?.type !== "MEMBER" && <p className="permission-empty">No member overrides</p>}
          {memberOverwrites.map((overwrite) => renderTargetButton({ type: "MEMBER", id: overwrite.targetId }, true))}
          {pendingTarget?.type === "MEMBER" && !configuredKeys.has(targetKey("MEMBER", pendingTarget.id)) && renderTargetButton(pendingTarget, false)}
          <button type="button" className="permission-add-target" onClick={() => setPickerOpen((current) => !current)}>Add Role or Member</button>
          {pickerOpen && <div className="permission-picker likecord-scrollbar" data-testid="permission-target-picker">
            <div className="permission-picker-tabs">
              <button type="button" className={pickerType === "ROLE" ? "active" : ""} aria-pressed={pickerType === "ROLE"} onClick={() => setPickerType("ROLE")}>Roles</button>
              <button type="button" className={pickerType === "MEMBER" ? "active" : ""} aria-pressed={pickerType === "MEMBER"} onClick={() => setPickerType("MEMBER")}>Members</button>
            </div>
            {pickerType === "ROLE" ? eligibleRoles.map((role) => (
              <button type="button" key={role.id} onClick={() => selectNewTarget({ type: "ROLE", id: role.id })}>
                {role.isDefault ? "@everyone — Default role" : role.name}
              </button>
            )) : eligibleMembers.map((member) => (
              <button type="button" key={member.id} onClick={() => selectNewTarget({ type: "MEMBER", id: member.id })}>
                {member.user.displayName} (@{member.user.username})
              </button>
            ))}
            {((pickerType === "ROLE" && eligibleRoles.length === 0) || (pickerType === "MEMBER" && eligibleMembers.length === 0)) && <p className="permission-empty">No eligible targets</p>}
          </div>}
        </aside>

        <section className="permission-matrix">
          {!selected ? <div className="permission-editor-status">Select or add a Role or Member target.</div> : <>
            <div className="permission-matrix-header">
              <div><h4>{selected.type === "ROLE" ? (selectedRole?.isDefault ? "@everyone" : selectedRole?.name ?? "Unknown role") : selectedMember?.user.displayName ?? "Unknown member"}</h4>
                <p>Raw override at this {scope === "CHANNEL" ? "Channel" : "Category"} scope</p></div>
              {selectedOverwrite && <button type="button" className="permission-remove" disabled={!selectedManageable || saving} onClick={() => setRemoveTarget(selected)}>Remove Override</button>}
            </div>
            {!selectedManageable && <div className="permission-protected-notice">This target is protected by the current hierarchy. Its raw overwrite is read-only.</div>}
            {!selectedOverwrite && <div className="permission-neutral-notice">New targets start with every permission neutral. Nothing is saved until the first Allow or Deny choice.</div>}
            {groups.map((group) => <div className="permission-matrix-group" key={group}>
              <h5>{group}</h5>
              {PERMISSION_GROUPS[group].map((permission) => {
                const state = getState(permission.bit);
                return <div className="permission-row" key={permission.key} data-permission={permission.key}>
                  <span>{permission.label}</span>
                  <div className="tri-state-control" role="group" aria-label={`${permission.label} permission`}>
                    {(["DENY", "NEUTRAL", "ALLOW"] as PermissionState[]).map((choice) => <button type="button" key={choice}
                      className={`${choice.toLowerCase()} ${state === choice ? "active" : ""}`} aria-pressed={state === choice}
                      aria-label={`${permission.label}: ${choice}`} title={choice} disabled={!selectedManageable || saving}
                      onClick={() => void persistState(permission.bit, choice)}>{choice === "DENY" ? "✕" : choice === "ALLOW" ? "✓" : "/"}</button>)}
                  </div>
                </div>;
              })}
            </div>)}
          </>}
        </section>
      </div>
      {removeTarget && <ConfirmModal title="Remove Override?" message="All raw permissions for this target will return to Neutral at this scope. The Role, Member, and Role assignments remain unchanged."
        confirmLabel="Remove Override" danger onConfirm={() => void removeOverwrite()} onCancel={() => setRemoveTarget(null)} />}
    </div>
  );
}

export { PERMISSION_GROUPS };
