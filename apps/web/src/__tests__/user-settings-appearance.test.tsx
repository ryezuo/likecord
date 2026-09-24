import "@testing-library/jest-dom";
import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatArea from "../components/layout/ChatArea";
import UserSettings from "../components/settings/UserSettings";
import { UserPreferencesProvider, useUserPreferences } from "../hooks/useUserPreferences";
import type { AuthUser } from "../hooks/useAuth";

const mockPreferenceGet = jest.fn();
const mockPreferenceUpdate = jest.fn();
const mockComposerMounted = jest.fn();
const mockComposerUnmounted = jest.fn();
let serverPreferences = { showSendButton: false, theme: "LIKECORD_DEFAULT" };

jest.mock("../lib/api", () => ({
  userPreferenceApi: {
    get: (...args: unknown[]) => mockPreferenceGet(...args),
    update: (...args: unknown[]) => mockPreferenceUpdate(...args),
  },
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const user: AuthUser = {
  id: "user-1",
  username: "garden-user",
  displayName: "Garden User",
  email: "garden@example.test",
  avatarUrl: null,
  bio: "Growing a calm community.",
  passwordChangeRequired: false,
};

function MountedComposer() {
  const { preferences } = useUserPreferences();
  useEffect(() => {
    mockComposerMounted();
    return () => { mockComposerUnmounted(); };
  }, []);

  return <ChatArea
    channelName="general" connected socketId="socket-1" activeChannelId="channel-1"
    messages={[]} msgsLoading={false} hasMore={false} editingMsgId={null} editContent=""
    pendingFiles={[]} uploadingIds={[]} uploadError={null} canSendMessages canAttachFiles
    showSendButton={preferences.showSendButton}
    debugLog={[]} lastPayload="" lastAttCount={0} dbg={false} user={user}
    onScroll={jest.fn()} onEditStart={jest.fn()} onEditChange={jest.fn()} onEditSave={jest.fn()}
    onEditCancel={jest.fn()} onDelete={jest.fn()} onSend={(event) => event.preventDefault()}
    onPaste={jest.fn()} onFileSelect={jest.fn()} onRemoveFile={jest.fn()}
  />;
}

function Harness() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return <UserPreferencesProvider>
    <button type="button" onClick={() => setSettingsOpen(true)}>Open settings</button>
    <MountedComposer />
    {settingsOpen && <UserSettings user={user} onUpdateProfile={jest.fn()} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={jest.fn()} onClose={() => setSettingsOpen(false)} />}
  </UserPreferencesProvider>;
}

describe("Appearance and mounted Composer reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.setAttribute("data-theme", "likecord-default");
    document.documentElement.style.colorScheme = "dark";
    serverPreferences = { showSendButton: false, theme: "LIKECORD_DEFAULT" };
    mockPreferenceGet.mockImplementation(async () => ({ ...serverPreferences }));
    mockPreferenceUpdate.mockImplementation(async (patch: { showSendButton?: boolean; theme?: string }) => {
      serverPreferences = { ...serverPreferences, ...patch };
      return { ...serverPreferences };
    });
  });

  it("updates the current Composer live and retains the authoritative value across Settings close/reopen without remount", async () => {
    render(<Harness />);
    await waitFor(() => expect(mockPreferenceGet).toHaveBeenCalledTimes(1));
    const composer = screen.getByTestId("composer");
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(mockComposerMounted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    const themeSelector = screen.getByRole("combobox", { name: "Theme" });
    fireEvent.change(themeSelector, { target: { value: "LIKECORD_RETRO_98" } });
    expect(themeSelector).toHaveValue("LIKECORD_RETRO_98");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
    await waitFor(() => expect(mockPreferenceUpdate).toHaveBeenCalledWith({ theme: "LIKECORD_RETRO_98" }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("checkbox", { name: /Show Send Button/ }));
    expect(await screen.findByText("Preference saved.")).toBeInTheDocument();
    expect(mockPreferenceUpdate).toHaveBeenCalledWith({ showSendButton: true }, expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByTestId("composer")).toBe(composer);

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("LIKECORD_RETRO_98");
    expect(screen.getByRole("checkbox", { name: /Show Send Button/ })).toBeChecked();
    expect(mockPreferenceGet).toHaveBeenCalledTimes(1);
    expect(mockComposerMounted).toHaveBeenCalledTimes(1);
    expect(mockComposerUnmounted).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
