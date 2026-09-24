"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { inviteApi } from "../../lib/api";
import { safeInternalReturnTo } from "../../lib/navigation";
import { useAuth } from "../../hooks/useAuth";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInviteCode(code);
      setCheckingInvite(true);
      inviteApi.validate(code)
        .then((preview) => setInviteValid(preview.inviteStatus === "VALID"))
        .catch(() => setInviteValid(false))
        .finally(() => setCheckingInvite(false));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) { setError("Invite code is required"); return; }
    setError("");
    setSubmitting(true);
    try {
      await register(email, username, password, inviteCode);
      router.push(safeInternalReturnTo(searchParams.get("returnTo") || searchParams.get("redirect")) || "/channels/@me");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inviteCodeInvalid = inviteValid === false || error === "Invite code is required";
  const inviteCodeDescription = checkingInvite
    ? "invite-validation-status"
    : inviteValid === false
      ? "invite-validation-error"
      : error === "Invite code is required" ? "register-error" : undefined;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <span className="auth-brand-name">Likecord</span>
        </div>
        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Join Likecord with an invite from your community.</p>
        </div>
        {error && <div id="register-error" className="error-banner" role="alert">{error}</div>}
        {checkingInvite && <div id="invite-validation-status" className="info-banner" role="status">Validating invite...</div>}
        {inviteValid === false && <div id="invite-validation-error" className="error-banner" role="alert">Invalid or expired invite code</div>}
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={submitting || checkingInvite}>
          <label htmlFor="invite-code">Invite Code</label>
          <input id="invite-code" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Paste invite code" aria-invalid={inviteCodeInvalid ? "true" : undefined}
            aria-describedby={inviteCodeDescription} required />
          <label htmlFor="register-email">Email</label>
          <input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="register-username">Username</label>
          <input id="register-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={32} required />
          <label htmlFor="register-password">Password</label>
          <input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting || checkingInvite}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link href="/">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="loading-screen">Loading...</div>}><RegisterForm /></Suspense>;
}
