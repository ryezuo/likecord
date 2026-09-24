import "@testing-library/jest-dom";
import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserSettings from "../components/settings/UserSettings";
import type { AuthUser } from "../hooks/useAuth";

const mounted = { websocket: jest.fn(), voice: jest.fn(), screenShare: jest.fn() };
const unmounted = { websocket: jest.fn(), voice: jest.fn(), screenShare: jest.fn() };

jest.mock("../components/settings/AvatarSettings", () => () => null);
jest.mock("../hooks/useUserPreferences", () => ({
  useUserPreferences: () => ({
    preferences: { showSendButton: false }, status: "ready", error: null, retry: jest.fn(),
    mutationStatus: "idle", mutationError: null, updateShowSendButton: jest.fn(), retryMutation: jest.fn(),
  }),
}));

const initialUser: AuthUser = {
  id: "user-1", email: "garden@example.test", username: "garden", displayName: "Garden",
  avatarUrl: null, bio: null, passwordChangeRequired: false,
};

function PersistentOwner({ owner }: { owner: keyof typeof mounted }) {
  useEffect(() => {
    mounted[owner]();
    return () => { unmounted[owner](); };
  }, [owner]);
  return <div data-testid={`${owner}-owner`} />;
}

function Harness() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [user, setUser] = useState(initialUser);
  const changeEmail = async (data: { newEmail: string; currentPassword: string }) => {
    const updated = { ...user, email: data.newEmail.trim().toLowerCase() };
    setUser(updated);
    return updated;
  };
  const changePassword = async () => user;
  return <>
    <PersistentOwner owner="websocket" />
    <PersistentOwner owner="voice" />
    <PersistentOwner owner="screenShare" />
    <output data-testid="current-email">{user.email}</output>
    <button type="button" onClick={() => setSettingsOpen(true)}>Open settings</button>
    {settingsOpen && <UserSettings user={user} onUpdateProfile={jest.fn()} onChangeEmail={changeEmail}
      onChangePassword={changePassword} onLogout={jest.fn()} onClose={() => setSettingsOpen(false)} />}
  </>;
}

describe("Account Security persistent-owner lifecycle", () => {
  beforeEach(() => {
    for (const spy of [...Object.values(mounted), ...Object.values(unmounted)]) spy.mockClear();
  });

  it("keeps WebSocket, Voice, and Screen Share owners mounted across Settings and a successful credential mutation", async () => {
    render(<Harness />);
    const owners = ["websocket", "voice", "screenShare"] as const;
    for (const owner of owners) expect(mounted[owner]).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Account Security" }));
    fireEvent.change(screen.getByLabelText("New Email"), { target: { value: " NEW@EXAMPLE.TEST " } });
    fireEvent.change(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" }), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    await waitFor(() => expect(screen.getByTestId("current-email")).toHaveTextContent("new@example.test"));

    fireEvent.change(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" }), { target: { value: "current-password" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "new-valid-password" } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "new-valid-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await screen.findByText("Password changed. Other sessions were signed out.");
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));

    for (const owner of owners) {
      expect(mounted[owner]).toHaveBeenCalledTimes(1);
      expect(unmounted[owner]).not.toHaveBeenCalled();
    }
  });
});
