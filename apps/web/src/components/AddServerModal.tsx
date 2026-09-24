"use client";

import { useEffect, useState } from "react";
import { inviteApi, serverApi, type InvitePreview } from "../lib/api";
import { normalizeInviteInput } from "../lib/invite-normalizer";

type AddServerView = "choice" | "create" | "join" | "preview";

export interface ServerEntryResult {
  id: string;
  name: string;
  ownerId?: string;
}

interface Props {
  onClose: () => void;
  onComplete: (server: ServerEntryResult) => Promise<void> | void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AddServerModal({ onClose, onComplete }: Props) {
  const [view, setView] = useState<AddServerView>("choice");
  const [serverName, setServerName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  const goTo = (nextView: AddServerView) => {
    setError("");
    setView(nextView);
  };

  const goBack = () => {
    setError("");
    setPreview(null);
    setView(view === "preview" ? "join" : "choice");
  };

  const createServer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const name = serverName.trim();
    if (name.length < 2 || name.length > 100) {
      setError("Server name must be between 2 and 100 characters.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const server = await serverApi.create({ name });
      await onComplete({ id: server.id, name: server.name, ownerId: server.ownerId });
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Unable to create the server. Please try again."));
      setPending(false);
    }
  };

  const loadPreview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const normalized = normalizeInviteInput(inviteInput, window.location.origin);
    if (!normalized) {
      setError("Enter a valid invite code or a same-origin /invite link.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const nextPreview = await inviteApi.validate(normalized);
      if (nextPreview.inviteStatus === "VALID" && nextPreview.membershipStatus === "UNAUTHENTICATED") {
        setError("Your session could not be confirmed. Please sign in again and retry.");
        return;
      }
      setInviteCode(normalized);
      setPreview(nextPreview);
      setView("preview");
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Unable to check this invite. Please try again."));
    } finally {
      setPending(false);
    }
  };

  const joinServer = async () => {
    if (pending || !inviteCode || !preview || !("membershipStatus" in preview)) return;
    setPending(true);
    setError("");
    try {
      const result = await inviteApi.accept(inviteCode);
      await onComplete({ id: result.serverId, name: result.serverName });
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Unable to join the server. Please try again."));
      setPending(false);
    }
  };

  const openServer = async () => {
    if (pending || !preview || !("serverId" in preview)) return;
    setPending(true);
    setError("");
    try {
      await onComplete({ id: preview.serverId, name: preview.serverName });
    } catch (cause: unknown) {
      setError(errorMessage(cause, "Unable to open the server. Please try again."));
      setPending(false);
    }
  };

  const isUnavailable = preview?.inviteStatus === "UNAVAILABLE" && !("membershipStatus" in preview);
  const isAlreadyMember = preview && "membershipStatus" in preview && preview.membershipStatus === "ALREADY_MEMBER";
  const serverNameInvalid = error === "Server name must be between 2 and 100 characters.";
  const inviteInputInvalid = error === "Enter a valid invite code or a same-origin /invite link.";
  const title = view === "choice" ? "Add a Server"
    : view === "create" ? "Create a Server"
      : view === "join" ? "Join a Server" : "Invite Preview";

  return (
    <div className="modal-overlay" onClick={() => { if (!pending) onClose(); }}>
      <div className="modal add-server-modal" role="dialog" aria-modal="true" aria-labelledby="add-server-title" aria-busy={pending}
        onClick={(event) => event.stopPropagation()}>
        <div className="add-server-heading">
          <h3 id="add-server-title">{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon modal-close-button" aria-label="Close Add a Server" disabled={pending} onClick={onClose}>✕</button>
        </div>

        {view === "choice" ? (
          <div className="add-server-choices">
            <button type="button" className="btn btn-secondary" onClick={() => goTo("create")}>
              <strong>Create a Server</strong>
              <span>Start a new space for your community.</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => goTo("join")}>
              <strong>Join a Server</strong>
              <span>Use an invite code or Likecord invite link.</span>
            </button>
          </div>
        ) : null}

        {view === "create" ? (
          <form className="add-server-form" onSubmit={createServer} aria-busy={pending}>
            <label htmlFor="add-server-name">Server name</label>
            <input id="add-server-name" value={serverName} maxLength={100} autoFocus
              aria-invalid={serverNameInvalid ? "true" : undefined} aria-describedby={error ? "add-server-create-error" : undefined}
              onChange={(event) => { setServerName(event.target.value); setError(""); }} />
            {error ? <div id="add-server-create-error" className="error-banner" role="alert">{error}</div> : null}
            <div className="add-server-actions">
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={goBack}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create Server"}</button>
            </div>
          </form>
        ) : null}

        {view === "join" ? (
          <form className="add-server-form" onSubmit={loadPreview} aria-busy={pending}>
            <label htmlFor="add-server-invite">Invite code or URL</label>
            <input id="add-server-invite" value={inviteInput} autoFocus placeholder="code or /invite/code"
              aria-invalid={inviteInputInvalid ? "true" : undefined} aria-describedby={`add-server-invite-hint${error ? " add-server-invite-error" : ""}`}
              onChange={(event) => { setInviteInput(event.target.value); setError(""); }} />
            <div id="add-server-invite-hint" className="add-server-hint">
              <span>You can paste any of these forms:</span>
              <div className="invite-input-examples" aria-label="Invite examples">
                <code>abc123</code>
                <code>/invite/abc123</code>
                <code>https://staging.example.com/invite/abc123</code>
              </div>
            </div>
            {error ? <div id="add-server-invite-error" className="error-banner" role="alert">{error}</div> : null}
            <div className="add-server-actions">
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={goBack}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Checking…" : "Continue"}</button>
            </div>
          </form>
        ) : null}

        {view === "preview" ? (
          <div className="add-server-preview" aria-busy={pending}>
            {isUnavailable ? (
              <div className="add-server-preview-card">
                <strong>Invite unavailable</strong>
                <span>This invite is unavailable. Ask for a new invite and try again.</span>
              </div>
            ) : preview && "serverName" in preview ? (
              <div className="add-server-preview-card">
                <strong>{preview.serverName}</strong>
                <span>{isAlreadyMember
                  ? preview.inviteStatus === "UNAVAILABLE" ? "This invite is unavailable, but you are already a member." : "Already a member"
                  : "Review the server name before joining."}</span>
              </div>
            ) : null}
            {error ? <div className="error-banner" role="alert">{error}</div> : null}
            <div className="add-server-actions">
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={goBack}>Back</button>
              {isAlreadyMember ? (
                <button type="button" className="btn btn-primary" disabled={pending} onClick={openServer}>{pending ? "Opening…" : "Open Server"}</button>
              ) : !isUnavailable ? (
                <button type="button" className="btn btn-primary" disabled={pending} onClick={joinServer}>{pending ? "Joining…" : "Join Server"}</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
