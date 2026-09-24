"use client";

import { FormEvent, useState } from "react";
import { THEME_IDS } from "@likecord/shared";
import type { AuthUser } from "../../hooks/useAuth";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { THEME_REGISTRY, parseThemeId } from "../../lib/theme";
import SettingsLayer, { type SettingsNavigationGroup } from "./SettingsLayer";
import AvatarSettings from "./AvatarSettings";
import AccountSecuritySettings from "./AccountSecuritySettings";
import SoundEffectsSettings from "./SoundEffectsSettings";

interface Props {
  user: AuthUser;
  onUpdateProfile: (data: { displayName?: string; bio?: string }) => Promise<AuthUser>;
  onChangeEmail: (data: { newEmail: string; currentPassword: string }) => Promise<AuthUser>;
  onChangePassword: (data: { currentPassword: string; newPassword: string }) => Promise<AuthUser>;
  onLogout: () => Promise<void>;
  onClose: () => void;
}

const navigationGroups: SettingsNavigationGroup[] = [
  { label: "ACCOUNT", items: [
    { id: "my-account", label: "My Account" },
    { id: "account-security", label: "Account Security" },
  ] },
  { label: "APP SETTINGS", items: [{ id: "appearance", label: "Appearance" }, { id: "voice-audio", label: "Voice & Audio" }] },
];

function profileErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Unable to save your profile.";
}

export default function UserSettings({ user, onUpdateProfile, onChangeEmail, onChangePassword, onLogout, onClose }: Props) {
  const {
    preferences,
    status: preferenceStatus,
    error: preferenceError,
    retry: retryPreferences,
    mutationStatus,
    mutationError,
    updateShowSendButton,
    updateTheme,
    retryMutation,
  } = useUserPreferences();
  const [activeSection, setActiveSection] = useState("my-account");
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [credentialPending, setCredentialPending] = useState(false);
  const dirty = displayName !== user.displayName || bio !== (user.bio ?? "");
  const interactionLocked = saving || loggingOut || avatarPending || credentialPending;

  const resetDraft = () => {
    setDisplayName(user.displayName);
    setBio(user.bio ?? "");
    setSaveError("");
    setSaveSuccess("");
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving || avatarPending || credentialPending) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const updated = await onUpdateProfile({ displayName, bio });
      setDisplayName(updated.displayName);
      setBio(updated.bio ?? "");
      setSaveSuccess("Profile saved.");
    } catch (caught: unknown) {
      setSaveError(profileErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const logOut = async () => {
    if (interactionLocked) return;
    setLoggingOut(true);
    await onLogout();
  };

  return (
    <SettingsLayer
      title="User Settings"
      groups={interactionLocked ? navigationGroups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item, disabled: true })) })) : navigationGroups}
      activeId={activeSection}
      onSelect={(section) => { if (!interactionLocked) setActiveSection(section); }}
      onClose={onClose}
      closeDisabled={interactionLocked}
      footerItems={[{ id: "logout", label: loggingOut ? "Logging out…" : "Log Out", danger: true, disabled: interactionLocked }]}
      onFooterAction={() => { void logOut(); }}
    >
      <div className="settings-content user-settings-content">
        {activeSection === "voice-audio" && <SoundEffectsSettings />}
        {activeSection === "my-account" && <section aria-labelledby="my-account-title">
          <header className="user-settings-heading">
            <h3 id="my-account-title">My Account</h3>
            <p>Manage the profile details that people see across Likecord.</p>
          </header>

          <AvatarSettings key={user.id} user={user} disabled={saving || loggingOut} onPending={setAvatarPending} />
          <form className="user-settings-form" aria-busy={saving} onSubmit={(event) => { void saveProfile(event); }}>
            <div className="user-settings-field">
              <label htmlFor="user-settings-display-name">Display Name</label>
              <input id="user-settings-display-name" value={displayName} maxLength={64} disabled={saving}
                aria-invalid={saveError ? "true" : undefined} aria-describedby={saveError ? "user-settings-save-error" : "user-settings-display-name-help"}
                onChange={(event) => { setDisplayName(event.target.value); setSaveError(""); setSaveSuccess(""); }} />
              <p id="user-settings-display-name-help" className="user-settings-field-help">Up to 64 characters.</p>
            </div>

            <div className="user-settings-field">
              <label htmlFor="user-settings-bio">Bio</label>
              <textarea id="user-settings-bio" value={bio} maxLength={500} disabled={saving}
                aria-invalid={saveError ? "true" : undefined} aria-describedby={saveError ? "user-settings-save-error" : "user-settings-bio-help"}
                onChange={(event) => { setBio(event.target.value); setSaveError(""); setSaveSuccess(""); }} />
              <p id="user-settings-bio-help" className="user-settings-field-help">Up to 500 characters.</p>
            </div>

            <div className="user-settings-identity" aria-labelledby="user-settings-identity-title">
              <div className="user-settings-identity-heading">
                <h4 id="user-settings-identity-title">Account identity</h4>
                <p>Username is read-only. Change your sign-in email in Account Security.</p>
              </div>
              <div className="user-settings-field user-settings-readonly">
                <label htmlFor="user-settings-username">Username</label>
                <input id="user-settings-username" value={user.username} readOnly aria-readonly="true" />
              </div>
              <div className="user-settings-field user-settings-readonly">
                <label htmlFor="user-settings-email">Email</label>
                <input id="user-settings-email" value={user.email} readOnly aria-readonly="true" />
              </div>
            </div>

            {saveError && <div id="user-settings-save-error" className="error-banner" role="alert">{saveError}</div>}
            <div className="user-settings-actions">
              <button type="submit" className="btn btn-primary" disabled={!dirty || saving || avatarPending}>{saving ? "Saving…" : "Save Changes"}</button>
              <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={resetDraft}>Cancel</button>
              {saveSuccess && <span className="user-settings-save-status" role="status" aria-live="polite">{saveSuccess}</span>}
            </div>
          </form>
        </section>}

        {activeSection === "account-security" && <AccountSecuritySettings
          user={user}
          onChangeEmail={onChangeEmail}
          onChangePassword={onChangePassword}
          onPendingChange={setCredentialPending}
        />}

        {activeSection === "appearance" && <section aria-labelledby="appearance-title">
          <header className="user-settings-heading">
            <h3 id="appearance-title">Appearance</h3>
            <p>Choose your Likecord theme and which compact controls appear in your workspace.</p>
          </header>

          {preferenceStatus === "loading" && <div className="user-settings-sync-status" role="status" aria-live="polite" aria-busy="true">Loading appearance preferences…</div>}
          {preferenceStatus === "error" && <div className="error-banner user-settings-sync-error" role="alert">
            <span>{preferenceError || "Unable to load your app preferences."} The safe default remains active.</span>
            <button type="button" className="btn btn-secondary" onClick={retryPreferences}>Retry</button>
          </div>}

          <div className="user-settings-field user-settings-theme-control">
            <label htmlFor="user-settings-theme">Theme</label>
            <select
              id="user-settings-theme"
              value={preferences.theme}
              disabled={preferenceStatus !== "ready"}
              aria-describedby="user-settings-theme-description"
              aria-busy={mutationStatus === "saving"}
              onChange={(event) => updateTheme(parseThemeId(event.target.value))}
            >
              {THEME_IDS.filter((theme) => THEME_REGISTRY[theme].selectable).map((theme) => (
                <option key={theme} value={theme}>{THEME_REGISTRY[theme].label}</option>
              ))}
            </select>
            <p id="user-settings-theme-description" className="user-settings-field-help">
              Applies immediately and stays with your account.
            </p>
          </div>

          <label className="user-settings-preference" aria-busy={mutationStatus === "saving"}>
            <span className="user-settings-preference-copy">
              <strong>Show Send Button</strong>
              <span id="show-send-button-description">Show a compact Send button beside the message field. Enter continues to send and Shift+Enter adds a new line.</span>
            </span>
            <input type="checkbox" checked={preferences.showSendButton}
              disabled={preferenceStatus !== "ready"}
              aria-describedby="show-send-button-description"
              onChange={(event) => updateShowSendButton(event.target.checked)} />
          </label>

          {mutationStatus !== "idle" && <div className="user-settings-preference-status" aria-live="polite">
            {mutationStatus === "saving" && <span role="status">Saving preference…</span>}
            {mutationStatus === "saved" && <span className="user-settings-save-status" role="status">Preference saved.</span>}
            {mutationStatus === "error" && <div className="error-banner user-settings-sync-error" role="alert">
              <span>{mutationError || "Unable to save your app preference."} The last confirmed value was restored.</span>
              <button type="button" className="btn btn-secondary" onClick={retryMutation}>Retry</button>
            </div>}
          </div>}
        </section>}
      </div>
    </SettingsLayer>
  );
}
