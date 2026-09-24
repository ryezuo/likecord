"use client";

import { FormEvent, useState } from "react";
import type { AuthUser } from "../../hooks/useAuth";
import { ApiError } from "../../lib/api";

interface Props {
  user: AuthUser;
  onChangeEmail: (data: { newEmail: string; currentPassword: string }) => Promise<AuthUser>;
  onChangePassword: (data: { currentPassword: string; newPassword: string }) => Promise<AuthUser>;
  onPendingChange: (pending: boolean) => void;
}

function credentialErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (error.code === "CURRENT_PASSWORD_INVALID") return "Current password is incorrect.";
  if (error.code === "EMAIL_TAKEN") return "That email is already registered.";
  if (error.code === "EMAIL_UNCHANGED") return "Enter an email different from your current email.";
  if (error.code === "PASSWORD_UNCHANGED") return "Choose a password different from your current password.";
  if (error.code === "PASSWORD_CHANGE_REQUIRED") return "Change your password before changing your email.";
  if (error.code === "CREDENTIAL_RATE_LIMITED") return `Too many credential requests. Try again in about ${error.retryAfter} seconds.`;
  if (error.code === "CREDENTIAL_RATE_LIMIT_UNAVAILABLE") return "Credential protection is temporarily unavailable. Try again later.";
  if (["CSRF_TOKEN_MISSING", "CSRF_TOKEN_MISMATCH", "FORBIDDEN_ORIGIN"].includes(error.code ?? "")) {
    return "The security check failed. Refresh Likecord before trying again.";
  }
  if (error.code === "SESSION_RECONCILIATION_FAILED") return "Your credentials changed, but this session must sign in again.";
  if (error.status === 400) return "Check the entered value and try again.";
  return error.message || fallback;
}

export default function AccountSecuritySettings({ user, onChangeEmail, onChangePassword, onPendingChange }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const canonicalNewEmail = newEmail.trim().toLowerCase();
  const emailBlocked = user.passwordChangeRequired;

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailPending || passwordPending || emailBlocked || !canonicalNewEmail || !emailPassword) return;
    if (canonicalNewEmail === user.email) {
      setEmailError("Enter an email different from your current email.");
      setEmailSuccess("");
      return;
    }
    setEmailPending(true);
    onPendingChange(true);
    setEmailError("");
    setEmailSuccess("");
    try {
      await onChangeEmail({ newEmail, currentPassword: emailPassword });
      setNewEmail("");
      setEmailPassword("");
      setEmailSuccess("Email changed. Other sessions were signed out.");
    } catch (caught) {
      setEmailPassword("");
      setEmailError(credentialErrorMessage(caught, "Unable to change your email."));
    } finally {
      setEmailPending(false);
      onPendingChange(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailPending || passwordPending || !currentPassword || !newPassword || !confirmPassword) return;
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError("New password must be between 8 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordPending(true);
    onPendingChange(true);
    try {
      await onChangePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed. Other sessions were signed out.");
    } catch (caught) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(credentialErrorMessage(caught, "Unable to change your password."));
    } finally {
      setPasswordPending(false);
      onPendingChange(false);
    }
  };

  return <section aria-labelledby="account-security-title">
    <header className="user-settings-heading">
      <h3 id="account-security-title">Account Security</h3>
      <p>Change the credentials you use to sign in. A successful change signs out your other sessions.</p>
    </header>

    {emailBlocked && <div className="info-banner account-security-required" role="status">
      Change your password before changing your email. Other Settings and Log Out remain available.
    </div>}

    <div className="account-security-forms">
      <form className="user-settings-form account-security-form" aria-busy={emailPending} onSubmit={(event) => { void submitEmail(event); }}>
        <header className="account-security-form-heading">
          <h4>Change Email</h4>
          <p>Your new email becomes your sign-in email immediately.</p>
        </header>
        <div className="user-settings-field user-settings-readonly">
          <label htmlFor="account-security-current-email">Current Email</label>
          <input id="account-security-current-email" type="email" value={user.email} readOnly aria-readonly="true" autoComplete="email" />
        </div>
        <div className="user-settings-field">
          <label htmlFor="account-security-new-email">New Email</label>
          <input id="account-security-new-email" type="email" value={newEmail} required disabled={emailBlocked || emailPending}
            autoComplete="email" aria-invalid={emailError ? "true" : undefined}
            aria-describedby={emailBlocked ? "account-security-email-blocked" : emailError ? "account-security-email-error" : undefined}
            onChange={(event) => { setNewEmail(event.target.value); setEmailError(""); setEmailSuccess(""); }} />
          {emailBlocked && <p id="account-security-email-blocked" className="user-settings-field-help">Email change is available after you change your password.</p>}
        </div>
        <div className="user-settings-field">
          <label htmlFor="account-security-email-password">Current Password</label>
          <input id="account-security-email-password" type="password" value={emailPassword} required maxLength={128}
            disabled={emailBlocked || emailPending} autoComplete="current-password" aria-invalid={emailError ? "true" : undefined}
            aria-describedby={emailError ? "account-security-email-error" : undefined}
            onChange={(event) => { setEmailPassword(event.target.value); setEmailError(""); setEmailSuccess(""); }} />
        </div>
        {emailError && <div id="account-security-email-error" className="error-banner" role="alert">{emailError}</div>}
        <div className="user-settings-actions">
          <button type="submit" className="btn btn-primary" disabled={emailBlocked || emailPending || passwordPending || !canonicalNewEmail || !emailPassword}>
            {emailPending ? "Changing Email…" : "Change Email"}
          </button>
          {emailSuccess && <span className="user-settings-save-status" role="status" aria-live="polite">{emailSuccess}</span>}
        </div>
      </form>

      <form className="user-settings-form account-security-form" aria-busy={passwordPending} onSubmit={(event) => { void submitPassword(event); }}>
        <header className="account-security-form-heading">
          <h4>Change Password</h4>
          <p>Use 8 to 128 characters. No additional complexity rules apply.</p>
        </header>
        <div className="user-settings-field">
          <label htmlFor="account-security-current-password">Current Password</label>
          <input id="account-security-current-password" type="password" value={currentPassword} required maxLength={128}
            disabled={passwordPending} autoComplete="current-password" aria-invalid={passwordError ? "true" : undefined}
            aria-describedby={passwordError ? "account-security-password-error" : undefined}
            onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError(""); setPasswordSuccess(""); }} />
        </div>
        <div className="user-settings-field">
          <label htmlFor="account-security-new-password">New Password</label>
          <input id="account-security-new-password" type="password" value={newPassword} required minLength={8} maxLength={128}
            disabled={passwordPending} autoComplete="new-password" aria-invalid={passwordError ? "true" : undefined}
            aria-describedby="account-security-password-help"
            onChange={(event) => { setNewPassword(event.target.value); setPasswordError(""); setPasswordSuccess(""); }} />
          <p id="account-security-password-help" className="user-settings-field-help">8 to 128 characters.</p>
        </div>
        <div className="user-settings-field">
          <label htmlFor="account-security-confirm-password">Confirm New Password</label>
          <input id="account-security-confirm-password" type="password" value={confirmPassword} required minLength={8} maxLength={128}
            disabled={passwordPending} autoComplete="new-password" aria-invalid={passwordError ? "true" : undefined}
            aria-describedby={passwordError ? "account-security-password-error" : undefined}
            onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); setPasswordSuccess(""); }} />
        </div>
        {passwordError && <div id="account-security-password-error" className="error-banner" role="alert">{passwordError}</div>}
        <div className="user-settings-actions">
          <button type="submit" className="btn btn-primary" disabled={emailPending || passwordPending || !currentPassword || !newPassword || !confirmPassword}>
            {passwordPending ? "Changing Password…" : "Change Password"}
          </button>
          {passwordSuccess && <span className="user-settings-save-status" role="status" aria-live="polite">{passwordSuccess}</span>}
        </div>
      </form>
    </div>
  </section>;
}
