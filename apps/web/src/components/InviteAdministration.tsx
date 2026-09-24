"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inviteApi, type ServerInvite } from "../lib/api";
import ConfirmModal from "./ui/ConfirmModal";

export type InviteStatus = "ACTIVE" | "EXPIRED" | "EXHAUSTED" | "REVOKED";

export function deriveInviteStatus(invite: ServerInvite, now = Date.now()): InviteStatus {
  if (invite.isRevoked) return "REVOKED";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now) return "EXPIRED";
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return "EXHAUSTED";
  return "ACTIVE";
}

export function formatInviteTimestamp(value: string | null): string {
  if (!value) return "Unavailable";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Unavailable";
  return timestamp.toLocaleString();
}

const STATUS_LABELS: Record<InviteStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  EXHAUSTED: "Exhausted",
  REVOKED: "Revoked",
};

const EXPIRATION_OPTIONS = [
  { label: "Never", value: "" },
  { label: "1 hour", value: "1" },
  { label: "6 hours", value: "6" },
  { label: "12 hours", value: "12" },
  { label: "1 day", value: "24" },
  { label: "7 days", value: "168" },
];

const MAX_USES_OPTIONS = ["", "1", "5", "10", "25", "50", "100"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface Props { serverId: string; }

export default function InviteAdministration({ serverId }: Props) {
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ServerInvite | null>(null);
  const [revokePending, setRevokePending] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [copyState, setCopyState] = useState<Record<string, "copied" | "failed">>({});
  const inviteInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      setInvites(await inviteApi.list(serverId));
      setError("");
    } catch (caught: unknown) {
      setError(errorMessage(caught, "Unable to load invites. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => { void loadInvites(); }, [loadInvites]);

  const canonicalUrl = (code: string) => `${window.location.origin}/invite/${encodeURIComponent(code)}`;

  const copyInvite = async (invite: ServerInvite) => {
    const url = canonicalUrl(invite.code);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState((current) => ({ ...current, [invite.id]: "copied" }));
    } catch {
      setCopyState((current) => ({ ...current, [invite.id]: "failed" }));
      inviteInputs.current[invite.id]?.focus();
      inviteInputs.current[invite.id]?.select();
    }
  };

  const createInvite = async () => {
    if (createPending) return;
    setCreatePending(true);
    setError("");
    try {
      await inviteApi.create(serverId, {
        ...(expiresInHours ? { expiresInHours: Number(expiresInHours) } : {}),
        ...(maxUses ? { maxUses: Number(maxUses) } : {}),
      });
      await loadInvites();
      setShowCreate(false);
      setExpiresInHours("");
      setMaxUses("");
    } catch (caught: unknown) {
      setError(errorMessage(caught, "Unable to create invite. Please try again."));
    } finally {
      setCreatePending(false);
    }
  };

  const revokeInvite = async () => {
    if (!revokeTarget || revokePending) return;
    setRevokePending(true);
    setRevokeError("");
    try {
      await inviteApi.revoke(serverId, revokeTarget.id);
      await loadInvites();
      setRevokeTarget(null);
    } catch (caught: unknown) {
      setRevokeError(errorMessage(caught, "Unable to revoke invite. Please try again."));
    } finally {
      setRevokePending(false);
    }
  };

  return (
    <section aria-labelledby="invite-admin-title">
      <div className="settings-header-row invite-admin-toolbar">
        <div><h3 id="invite-admin-title">Invites</h3><p className="text-muted">Create and manage canonical links for this server.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate((current) => !current)}>Create Invite</button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}<button className="btn btn-ghost btn-icon" aria-label="Dismiss invite error" onClick={() => setError("")}>✕</button></div> : null}
      {showCreate ? <div className="invite-policy-card">
        <h4>New Invite Policy</h4>
        <div className="invite-policy-fields">
          <label htmlFor="invite-expiration">Expiration<select id="invite-expiration" value={expiresInHours} disabled={createPending} onChange={(event) => setExpiresInHours(event.target.value)}>
            {EXPIRATION_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
          </select></label>
          <label htmlFor="invite-max-uses">Maximum uses<select id="invite-max-uses" value={maxUses} disabled={createPending} onChange={(event) => setMaxUses(event.target.value)}>
            {MAX_USES_OPTIONS.map((value) => <option key={value || "unlimited"} value={value}>{value || "Unlimited"}</option>)}
          </select></label>
        </div>
        <div className="invite-policy-actions">
          <button type="button" className="btn btn-primary" disabled={createPending} onClick={() => void createInvite()}>{createPending ? "Creating…" : "Create Invite"}</button>
          <button type="button" className="btn btn-secondary" disabled={createPending} onClick={() => setShowCreate(false)}>Cancel</button>
        </div>
      </div> : null}
      {loading ? <p role="status" className="text-muted">Loading invites…</p> : null}
      {!loading && invites.length === 0 ? <p className="text-muted">No invites have been created yet.</p> : null}
      <div className="invite-admin-list">
        {invites.map((invite) => {
          const status = deriveInviteStatus(invite);
          const url = canonicalUrl(invite.code);
          return <article className="invite-admin-card" key={invite.id}>
            <div className="invite-admin-card-heading">
              <div><strong>{invite.code}</strong><span className={`invite-status ${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span></div>
              <span className="text-muted invite-admin-creator">Created by {invite.creator?.displayName || invite.creator?.username || invite.creatorId}</span>
            </div>
            <div className="invite-copy-row">
              <input ref={(element) => { inviteInputs.current[invite.id] = element; }} aria-label={`Invite link ${invite.code}`} readOnly value={url}
                onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.currentTarget.select()} />
              <button type="button" className="btn btn-secondary" onClick={() => void copyInvite(invite)}>{copyState[invite.id] === "copied" ? "Copied ✓" : "Copy"}</button>
            </div>
            {copyState[invite.id] === "failed" ? <div className="error-banner" role="alert">Copy failed. The link is selected so you can copy it manually.</div> : null}
            <dl className="invite-admin-meta">
              <div><dt>Created</dt><dd>{formatInviteTimestamp(invite.createdAt)}</dd></div>
              <div><dt>Expires</dt><dd>{invite.expiresAt ? formatInviteTimestamp(invite.expiresAt) : "Never"}</dd></div>
              <div><dt>Uses</dt><dd>{invite.useCount} / {invite.maxUses ?? "Unlimited"}</dd></div>
            </dl>
            {status === "ACTIVE" ? <button type="button" className="danger-button" onClick={() => { setRevokeError(""); setRevokeTarget(invite); }}>Revoke</button> : null}
          </article>;
        })}
      </div>
      {revokeTarget ? <ConfirmModal title="Revoke Invite" message={`Revoke invite ${revokeTarget.code}? Existing uses remain in history, but the link will stop working.`}
        confirmLabel="Revoke Invite" pendingLabel="Revoking…" danger pending={revokePending} error={revokeError}
        onConfirm={() => void revokeInvite()} onCancel={() => { if (!revokePending) { setRevokeError(""); setRevokeTarget(null); } }} /> : null}
    </section>
  );
}
