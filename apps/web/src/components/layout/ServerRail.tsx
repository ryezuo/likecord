"use client";

import { useState, useCallback, useRef } from "react";
import { contextMenuTrigger } from "../ui/contextMenuTrigger";
import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu";
import Tooltip from "../ui/Tooltip";
import ConfirmModal from "../ui/ConfirmModal";
import { hasServerPermission, parsePermissionMask, SERVER_PERMISSIONS } from "../../lib/permissions";
import { HomeIcon, LeaveStreamIcon } from "../ui/icons";

interface Server { id: string; name: string; ownerId: string; effectivePermissions?: string; }

interface Props {
  servers: Server[];
  activeServerId: string | null;
  isHome: boolean;
  onHome: () => void;
  myUserId: string | undefined;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onInvite: (serverId: string) => void;
  onSettings: (serverId: string) => void;
  onLeave: (serverId: string) => void;
  onDelete: (serverId: string) => Promise<void>;
}

export default function ServerRail({ servers, activeServerId, isHome, onHome, myUserId, onSelect, onAdd, onInvite, onSettings, onLeave, onDelete }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; invoker: HTMLElement; label: string; x: number; y: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!confirmDelete || deletePending) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    } catch (caught: unknown) {
      setDeleteError(caught instanceof Error && caught.message ? caught.message : "Failed to delete server. Please try again.");
    } finally {
      setDeletePending(false);
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, server: Server) => {
    const trigger = contextMenuTrigger(e);
    if (!trigger) return;
    const isOwner = server.ownerId === myUserId;
    const effectivePermissions = parsePermissionMask(server.effectivePermissions);
    const canCreateInvite = isOwner || hasServerPermission(effectivePermissions, SERVER_PERMISSIONS.CREATE_INVITE);
    const canOpenSettings = isOwner || [
      SERVER_PERMISSIONS.MANAGE_SERVER,
      SERVER_PERMISSIONS.MANAGE_ROLES,
      SERVER_PERMISSIONS.KICK_MEMBERS,
      SERVER_PERMISSIONS.BAN_MEMBERS,
      SERVER_PERMISSIONS.MUTE_MEMBERS,
    ].some((permission) => hasServerPermission(effectivePermissions, permission));
    const items: ContextMenuItem[] = [
      { label: "Open Server", onClick: () => onSelect(server.id) },
    ];
    if (canCreateInvite) items.push({ label: "Invite People", onClick: () => onInvite(server.id) });
    items.push(
      { label: "Mark as Read", onClick: () => {}, disabled: true },
      { label: "", onClick: () => {}, divider: true },
    );
    if (canOpenSettings) {
      items.push({ label: "Server Settings", onClick: () => onSettings(server.id) });
    }
    if (isOwner) {
      items.push({ label: "Delete Server", onClick: () => { setDeleteError(""); setConfirmDelete(server.id); }, danger: true });
    } else {
      items.push({
        label: "Leave Server",
        icon: <LeaveStreamIcon size={16} />,
        onClick: () => onLeave(server.id),
        danger: true,
      });
    }
    setContextMenu({ items, ...trigger, label: `Server actions for ${server.name}` });
  }, [myUserId, onSelect, onInvite, onLeave, onSettings]);

  return (
    <div className="server-rail" ref={railRef} tabIndex={-1}>
      <div className="server-rail-home-section">
        <Tooltip text="Home" position="right">
          <button type="button" className={`server-rail-icon server-rail-home ${isHome ? "active" : ""}`}
            aria-label="Home" aria-current={isHome ? "page" : undefined} onClick={onHome}>
            <HomeIcon size={24} />
          </button>
        </Tooltip>
        <div className="server-rail-divider" aria-hidden="true" />
      </div>
      <div className="server-rail-icons shell-hover-scrollbar">
        {servers.map((sv) => (
          <Tooltip key={sv.id} text={sv.name} position="right">
            <button className={`server-rail-icon ${sv.id === activeServerId ? "active" : ""}`}
              aria-label={sv.name}
              aria-current={!isHome && sv.id === activeServerId ? "page" : undefined}
              onClick={() => onSelect(sv.id)} onContextMenu={(e) => handleContextMenu(e, sv)}
              onKeyDown={(e) => handleContextMenu(e, sv)}>
              {sv.name[0].toUpperCase()}
            </button>
          </Tooltip>
        ))}
        <Tooltip text="Add Server" position="right">
          <button className="server-rail-icon add-server" aria-label="Add a Server" onClick={onAdd}>+</button>
        </Tooltip>
      </div>

      {contextMenu && (
        <ContextMenu items={contextMenu.items} ariaLabel={contextMenu.label} returnFocusTo={contextMenu.invoker}
          fallbackFocusTo={railRef.current} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={() => setContextMenu(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Server"
          message={`Are you sure you want to delete this server? This cannot be undone.`}
          confirmLabel="Delete Server"
          pendingLabel="Deleting…"
          danger
          pending={deletePending}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteError(""); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
