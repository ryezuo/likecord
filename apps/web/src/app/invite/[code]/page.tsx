"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { inviteApi, type InvitePreview } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { inviteRoute, serverRoute } from "../../../lib/navigation";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!code || authLoading) return;
    let active = true;
    setLoading(true);
    setError("");
    inviteApi.validate(code)
      .then((preview) => { if (active) setInvite(preview); })
      .catch((cause: Error) => { if (active) setError(cause.message || "Unable to load invite"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, authLoading, user?.id]);

  const handleAccept = async () => {
    if (!code) return;
    setAccepting(true);
    setError("");
    try {
      const result = await inviteApi.accept(code);
      router.push(serverRoute(result.serverId));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card-status" role="status">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true" />
            <span className="auth-brand-name">Likecord</span>
          </div>
          <p className="auth-status">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (!invite || (invite.inviteStatus === "UNAVAILABLE" && !("membershipStatus" in invite))) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true" />
            <span className="auth-brand-name">Likecord</span>
          </div>
          <div className="auth-heading">
            <h1>Invitation</h1>
            <p>Review this invite before continuing.</p>
          </div>
          <div className="error-banner" role="alert">{error || "This invite is unavailable. Ask for a new invite and try again."}</div>
          <Link href="/" className="auth-back-link">Back to home</Link>
        </div>
      </div>
    );
  }

  const alreadyMember = invite.membershipStatus === "ALREADY_MEMBER";
  const canonicalInvitePath = inviteRoute(code);
  const loginHref = `/?returnTo=${encodeURIComponent(canonicalInvitePath)}`;
  const registerHref = `/register?code=${encodeURIComponent(code)}&returnTo=${encodeURIComponent(canonicalInvitePath)}`;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <span className="auth-brand-name">Likecord</span>
        </div>
        <div className="auth-heading">
          <h1>Invitation</h1>
          <p>Review this invite before continuing.</p>
        </div>
        {error && <div id="invite-action-error" className="error-banner" role="alert">{error}</div>}
        <div className="invite-entry-summary">
          <span className="invite-entry-symbol" aria-hidden="true">🏠</span>
          <strong className="invite-entry-server-name">{invite.serverName}</strong>
          <p className="invite-entry-description">
            {alreadyMember && invite.inviteStatus === "UNAVAILABLE"
              ? "This invite is unavailable, but you're already a member of this server."
              : alreadyMember ? "Already a member" : "You've been invited to join this server"}
          </p>
        </div>
        {alreadyMember ? (
          <button type="button" className="btn btn-primary auth-submit" onClick={() => router.push(serverRoute(invite.serverId))}>
            Open Server
          </button>
        ) : user ? (
          <button type="button" className="btn btn-primary auth-submit" onClick={handleAccept} disabled={accepting}
            aria-busy={accepting} aria-describedby={error ? "invite-action-error" : undefined}>
            {accepting ? "Joining..." : "Accept Invite"}
          </button>
        ) : (
          <div className="auth-actions">
            <Link href={loginHref} className="btn btn-primary auth-action-link">Sign In</Link>
            <Link href={registerHref} className="btn btn-secondary auth-action-link">Register</Link>
          </div>
        )}
        <p className="auth-footer">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
