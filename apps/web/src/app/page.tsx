"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { safeInternalReturnTo } from "../lib/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const returnTo = safeInternalReturnTo(searchParams.get("returnTo") || searchParams.get("redirect"));
      router.replace(returnTo || "/channels/@me");
    }
  }, [user, loading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      // Login updates the shared user state; redirect via useEffect above
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <span className="auth-brand-name">Likecord</span>
        </div>
        <div className="auth-heading">
          <h1>Sign In</h1>
          <p>Welcome back. Enter your details to continue.</p>
        </div>
        {error && <div id="login-error" className="error-banner" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? "true" : undefined} aria-describedby={error ? "login-error" : undefined} required />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? "true" : undefined} aria-describedby={error ? "login-error" : undefined} required />
          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="auth-footer">
          Need an invite? <Link href="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="loading-screen">Loading...</div>}><LoginForm /></Suspense>;
}
