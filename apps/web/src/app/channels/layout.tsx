"use client";

import AuthGate from "../../components/AuthGate";
import AppPage from "../app/page";
import { UserPreferencesProvider, useUserPreferences } from "../../hooks/useUserPreferences";

function PreferenceAwareAppPage() {
  const { preferences } = useUserPreferences();
  return <AppPage showSendButton={preferences.showSendButton} />;
}

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><UserPreferencesProvider><PreferenceAwareAppPage />{children}</UserPreferencesProvider></AuthGate>;
}
