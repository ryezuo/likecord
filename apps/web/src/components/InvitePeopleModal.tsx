"use client";

import { useEffect, useRef, useState } from "react";
import { inviteApi } from "../lib/api";

interface Props {
  serverId: string;
  serverName: string;
  canManageInvites?: boolean;
  onManageInvites?: () => void;
  onClose: () => void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function InvitePeopleModal({ serverId, serverName, canManageInvites = false, onManageInvites, onClose }: Props) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setInviteUrl("");
    setCopyState("idle");
    void inviteApi.ensure(serverId).then((invite) => {
      if (cancelled) return;
      setInviteUrl(`${window.location.origin}/invite/${encodeURIComponent(invite.code)}`);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(errorMessage(cause, "Unable to create an invite link. Please try again."));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [serverId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal invite-people-modal" role="dialog" aria-modal="true" aria-labelledby="invite-people-title"
        onClick={(event) => event.stopPropagation()}>
        <div className="add-server-heading">
          <h3 id="invite-people-title">Invite People to {serverName}</h3>
          <button type="button" className="btn btn-ghost btn-icon modal-close-button" aria-label="Close Invite People" onClick={onClose}>✕</button>
        </div>
        <p className="invite-people-description">Share this canonical Likecord invite link.</p>
        {loading ? <div className="invite-people-loading" role="status">Preparing invite link…</div> : null}
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        {inviteUrl ? (
          <div className="invite-copy-row">
            <input ref={inputRef} aria-label="Invite link" readOnly value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.currentTarget.select()} />
            <button type="button" className="btn btn-primary" onClick={copyInvite}>{copyState === "copied" ? "Copied ✓" : "Copy"}</button>
          </div>
        ) : null}
        {copyState === "copied" ? <div className="invite-copy-status" role="status">Copied ✓</div> : null}
        {copyState === "failed" ? <div className="error-banner" role="alert">Copy failed. The link is selected so you can copy it manually.</div> : null}
        <div className="invite-people-actions">
          {canManageInvites && onManageInvites ? <button type="button" className="btn btn-secondary" onClick={onManageInvites}>Manage Invites</button> : null}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
