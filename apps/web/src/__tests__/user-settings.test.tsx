import "@testing-library/jest-dom";
import React, { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ThemeId } from "@likecord/shared";
import type { AuthUser } from "../hooks/useAuth";
import UserSettings from "../components/settings/UserSettings";

const mockRetryPreferences = jest.fn();
const mockUpdateShowSendButton = jest.fn();
const mockUpdateTheme = jest.fn();
const mockRetryMutation = jest.fn();
let mockPreferenceState: {
  preferences: { showSendButton: boolean; theme: ThemeId };
  status: "loading" | "ready" | "error";
  error: string | null;
  retry: () => void;
  mutationStatus: "idle" | "saving" | "saved" | "error";
  mutationError: string | null;
  updateShowSendButton: (value: boolean) => void;
  updateTheme: (theme: ThemeId) => void;
  retryMutation: () => void;
} = {
  preferences: { showSendButton: false, theme: "LIKECORD_DEFAULT" }, status: "ready", error: null, retry: mockRetryPreferences,
  mutationStatus: "idle", mutationError: null, updateShowSendButton: mockUpdateShowSendButton, updateTheme: mockUpdateTheme, retryMutation: mockRetryMutation,
};

jest.mock("../hooks/useUserPreferences", () => ({
  useUserPreferences: () => mockPreferenceState,
}));

const initialUser: AuthUser = {
  id: "user-1",
  username: "garden-user",
  displayName: "Garden User",
  email: "garden@example.test",
  avatarUrl: null,
  bio: "Growing a calm community.",
  passwordChangeRequired: false,
};

function renderSettings(overrides: Partial<React.ComponentProps<typeof UserSettings>> = {}) {
  const props: React.ComponentProps<typeof UserSettings> = {
    user: initialUser,
    onUpdateProfile: jest.fn().mockResolvedValue(initialUser),
    onChangeEmail: jest.fn().mockResolvedValue(initialUser),
    onChangePassword: jest.fn().mockResolvedValue(initialUser),
    onLogout: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
    ...overrides,
  };
  return { ...render(<UserSettings {...props} />), props };
}

describe("User Settings workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferenceState = {
      preferences: { showSendButton: false, theme: "LIKECORD_DEFAULT" }, status: "ready", error: null, retry: mockRetryPreferences,
      mutationStatus: "idle", mutationError: null, updateShowSendButton: mockUpdateShowSendButton, updateTheme: mockUpdateTheme, retryMutation: mockRetryMutation,
    };
  });

  it("opens on the truthful My Account section with only real fields and navigation", () => {
    renderSettings();
    const dialog = screen.getByRole("dialog", { name: "User Settings" });
    expect(within(dialog).getByRole("button", { name: "My Account" })).toHaveAttribute("aria-current", "page");
    expect(within(dialog).getByRole("button", { name: "Account Security" })).not.toHaveAttribute("aria-current");
    expect(within(dialog).getByRole("button", { name: "Appearance" })).not.toHaveAttribute("aria-current");
    expect(within(dialog).getByLabelText("Display Name")).toHaveValue("Garden User");
    expect(within(dialog).getByLabelText("Bio")).toHaveValue("Growing a calm community.");
    expect(within(dialog).getByLabelText("Username")).toHaveValue("garden-user");
    expect(within(dialog).getByLabelText("Username")).toHaveAttribute("readonly");
    expect(within(dialog).getByLabelText("Email")).toHaveValue("garden@example.test");
    expect(within(dialog).getByLabelText("Email")).toHaveAttribute("readonly");
    expect(within(dialog).getByRole("button", { name: "Voice & Audio" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Language|Themes|Privacy|Notifications/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });

  it("saves through the existing profile owner and reconciles its authoritative response", async () => {
    const update = jest.fn();
    function Harness() {
      const [user, setUser] = useState(initialUser);
      const updateProfile = async (data: { displayName?: string; bio?: string }) => {
        const updated = { ...user, ...data, displayName: `${data.displayName} (server)` } as AuthUser;
        update(data);
        setUser(updated);
        return updated;
      };
      return <><output data-testid="auth-identity">{user.displayName}|{user.bio}</output>
        <UserSettings user={user} onUpdateProfile={updateProfile} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={jest.fn()} onClose={jest.fn()} /></>;
    }
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "New Name" } });
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "New bio" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ displayName: "New Name", bio: "New bio" }));
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    expect(screen.getByTestId("auth-identity")).toHaveTextContent("New Name (server)|New bio");
    expect(screen.getByLabelText("Display Name")).toHaveValue("New Name (server)");
  });

  it("keeps a failed save recoverable without diverging the authenticated identity", async () => {
    const update = jest.fn()
      .mockRejectedValueOnce(new Error("Display name was rejected"))
      .mockResolvedValueOnce({ ...initialUser, displayName: "Recovered" });
    renderSettings({ onUpdateProfile: update });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Recovered" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Display name was rejected");
    expect(screen.getByLabelText("Display Name")).toHaveValue("Recovered");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  });

  it("cancels drafts without persisting them", () => {
    const update = jest.fn();
    renderSettings({ onUpdateProfile: update });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Unsaved" } });
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Unsaved bio" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Display Name")).toHaveValue("Garden User");
    expect(screen.getByLabelText("Bio")).toHaveValue("Growing a calm community.");
    expect(update).not.toHaveBeenCalled();
  });

  it("closes with Escape or the explicit control, restores focus, and discards closed drafts", () => {
    const update = jest.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Open settings</button>
        {open && <UserSettings user={initialUser} onUpdateProfile={update} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={jest.fn()} onClose={() => setOpen(false)} />}</>;
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open settings" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("button", { name: "Close settings" })).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(opener).toHaveFocus();
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(opener);
    expect(screen.getByLabelText("Display Name")).toHaveValue("Garden User");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "User Settings" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("contains Tab focus within the modal settings layer", () => {
    renderSettings();
    const close = screen.getByRole("button", { name: "Close settings" });
    const first = screen.getByRole("button", { name: "My Account" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
  });

  it("opens Appearance by keyboard with the native two-theme selector and existing preference", async () => {
    const interaction = userEvent.setup();
    renderSettings();
    const appearance = screen.getByRole("button", { name: "Appearance" });
    appearance.focus();
    await interaction.keyboard("{Enter}");

    expect(appearance).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    const theme = screen.getByRole("combobox", { name: "Theme" });
    expect(theme).toHaveValue("LIKECORD_DEFAULT");
    expect(within(theme).getAllByRole("option")).toHaveLength(2);
    expect(within(theme).getByRole("option", { name: "Likecord Default" })).toHaveValue("LIKECORD_DEFAULT");
    expect(within(theme).getByRole("option", { name: "Retro 98" })).toHaveValue("LIKECORD_RETRO_98");
    expect(screen.queryByRole("option", { name: /XP|Coming Soon/i })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Show Send Button/ })).not.toBeChecked();
    expect(screen.queryByText(/accent color|compact mode|font size|message density/i)).not.toBeInTheDocument();

    await interaction.selectOptions(theme, "LIKECORD_RETRO_98");
    expect(mockUpdateTheme).toHaveBeenCalledWith("LIKECORD_RETRO_98");

    fireEvent.click(screen.getByRole("checkbox", { name: /Show Send Button/ }));
    expect(mockUpdateShowSendButton).toHaveBeenCalledWith(true);
  });

  it("uses the existing logout callback without adding confirmation", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    renderSettings({ onLogout: logout });
    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument();
  });

  it("shows truthful preference loading and recoverable hydration errors", () => {
    mockPreferenceState = { ...mockPreferenceState, status: "loading" };
    const view = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading appearance preferences");
    expect(screen.getByRole("checkbox", { name: /Show Send Button/ })).toBeDisabled();

    mockPreferenceState = { ...mockPreferenceState, status: "error", error: "Preferences unavailable" };
    view.rerender(<UserSettings {...view.props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Preferences unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockRetryPreferences).toHaveBeenCalledTimes(1);
  });

  it("shows preference mutation progress, rollback errors, and retry", () => {
    mockPreferenceState = { ...mockPreferenceState, mutationStatus: "saving", preferences: { showSendButton: true, theme: "LIKECORD_RETRO_98" } };
    const view = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saving preference");
    expect(screen.getByRole("checkbox", { name: /Show Send Button/ })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("LIKECORD_RETRO_98");

    mockPreferenceState = { ...mockPreferenceState, mutationStatus: "error", mutationError: "Save unavailable", preferences: { showSendButton: false, theme: "LIKECORD_DEFAULT" } };
    view.rerender(<UserSettings {...view.props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("last confirmed value was restored");
    expect(screen.getByRole("checkbox", { name: /Show Send Button/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockRetryMutation).toHaveBeenCalledTimes(1);
  });
});
