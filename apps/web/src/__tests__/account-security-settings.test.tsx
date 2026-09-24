import "@testing-library/jest-dom";
import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountSecuritySettings from "../components/settings/AccountSecuritySettings";
import type { AuthUser } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

const baseUser: AuthUser = {
  id: "user-1",
  email: "garden@example.test",
  username: "garden",
  displayName: "Garden",
  avatarUrl: null,
  bio: null,
  passwordChangeRequired: false,
};

function renderSecurity(overrides: Partial<React.ComponentProps<typeof AccountSecuritySettings>> = {}) {
  const props: React.ComponentProps<typeof AccountSecuritySettings> = {
    user: baseUser,
    onChangeEmail: jest.fn().mockResolvedValue(baseUser),
    onChangePassword: jest.fn().mockResolvedValue(baseUser),
    onPendingChange: jest.fn(),
    ...overrides,
  };
  return { ...render(<AccountSecuritySettings {...props} />), props };
}

function fillEmail(email = " New.Identity@Example.TEST ", password = "current-password") {
  fireEvent.change(screen.getByLabelText("New Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" }), { target: { value: password } });
}

function fillPassword(current = "current-password", next = "new-valid-password", confirm = next) {
  fireEvent.change(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" }), { target: { value: current } });
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: confirm } });
}

describe("Account Security settings", () => {
  it("uses independent accessible credential forms and the accepted autocomplete and password policy", () => {
    renderSecurity();
    expect(screen.getByLabelText("Current Email")).toHaveValue("garden@example.test");
    expect(screen.getByLabelText("Current Email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("New Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" })).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("New Password")).toHaveAttribute("minlength", "8");
    expect(screen.getByLabelText("New Password")).toHaveAttribute("maxlength", "128");
    expect(screen.getByLabelText("New Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.queryByText(/verify|verification|mailbox|MFA|session management/i)).not.toBeInTheDocument();
  });

  it("reconciles the canonical email response and clears only the email form's password", async () => {
    const change = jest.fn().mockResolvedValue({ ...baseUser, email: "new.identity@example.test" });
    function Harness() {
      const [user, setUser] = useState(baseUser);
      return <AccountSecuritySettings user={user} onPendingChange={jest.fn()}
        onChangeEmail={async (data) => { const updated = await change(data); setUser(updated); return updated; }}
        onChangePassword={jest.fn()} />;
    }
    render(<Harness />);
    fillEmail();
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    await waitFor(() => expect(change).toHaveBeenCalledWith({ newEmail: "New.Identity@Example.TEST", currentPassword: "current-password" }));
    expect(screen.getByLabelText("Current Email")).toHaveValue("new.identity@example.test");
    expect(screen.getByLabelText("New Email")).toHaveValue("");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" })).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Other sessions were signed out");
  });

  it.each([
    [new ApiError("wrong", 401, "CURRENT_PASSWORD_INVALID"), "Current password is incorrect"],
    [new ApiError("taken", 409, "EMAIL_TAKEN"), "already registered"],
    [new ApiError("slow", 429, "CREDENTIAL_RATE_LIMITED", 30), "about 30 seconds"],
    [new ApiError("csrf", 403, "CSRF_TOKEN_MISSING"), "security check failed"],
  ])("maps an email failure without leaking internals and clears its password", async (failure, message) => {
    const change = jest.fn().mockRejectedValue(failure);
    renderSecurity({ onChangeEmail: change });
    fillEmail();
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("New Email")).toHaveValue("New.Identity@Example.TEST");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" })).toHaveValue("");
  });

  it("blocks canonical-same email and the accepted forced-password state without sending a request", () => {
    const change = jest.fn();
    const view = renderSecurity({ onChangeEmail: change });
    fillEmail(" GARDEN@EXAMPLE.TEST ");
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    expect(screen.getByRole("alert")).toHaveTextContent("different from your current email");
    expect(change).not.toHaveBeenCalled();

    view.rerender(<AccountSecuritySettings {...view.props} user={{ ...baseUser, passwordChangeRequired: true }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Change your password before changing your email");
    expect(screen.getByLabelText("New Email")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Change Email" })).toBeDisabled();
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" })).toBeEnabled();
  });

  it("leaves invalid email to the native email constraint without calling the API", () => {
    const change = jest.fn();
    renderSecurity({ onChangeEmail: change });
    fillEmail("not-an-email");
    expect(screen.getByLabelText("New Email")).toBeInvalid();
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    expect(change).not.toHaveBeenCalled();
  });

  it("validates mismatch and 8..128 bounds without sending confirmPassword", () => {
    const change = jest.fn();
    renderSecurity({ onChangePassword: change });
    fillPassword("current-password", "short", "short");
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("between 8 and 128");
    expect(change).not.toHaveBeenCalled();

    fillPassword("current-password", "new-valid-password", "different-password");
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
    expect(change).not.toHaveBeenCalled();
  });

  it("clears password fields on success and reconciles the forced flag", async () => {
    const changePassword = jest.fn().mockResolvedValue({ ...baseUser, passwordChangeRequired: false });
    function Harness() {
      const [user, setUser] = useState({ ...baseUser, passwordChangeRequired: true });
      return <AccountSecuritySettings user={user} onPendingChange={jest.fn()} onChangeEmail={jest.fn()}
        onChangePassword={async (data) => { const updated = await changePassword(data); setUser(updated); return updated; }} />;
    }
    render(<Harness />);
    fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: "current-password", newPassword: "new-valid-password" }));
    expect(changePassword.mock.calls[0][0]).not.toHaveProperty("confirmPassword");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" })).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
    expect(screen.queryByText("Change your password before changing your email.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New Email")).toBeEnabled();
  });

  it("does not couple a successful password change to the independent email draft", async () => {
    renderSecurity({ onChangePassword: jest.fn().mockResolvedValue(baseUser) });
    fillEmail("draft@example.test", "email-form-password");
    fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await screen.findByText("Password changed. Other sessions were signed out.");
    expect(screen.getByLabelText("New Email")).toHaveValue("draft@example.test");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-email-password" })).toHaveValue("email-form-password");
  });

  it("clears all password fields after an authoritative password failure", async () => {
    renderSecurity({ onChangePassword: jest.fn().mockRejectedValue(new ApiError("invalid", 401, "CURRENT_PASSWORD_INVALID")) });
    fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" })).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
  });

  it.each([
    [new ApiError("invalid", 400, "PASSWORD_INVALID"), "Check the entered value"],
    [new ApiError("slow", 429, "CREDENTIAL_RATE_LIMITED", 45), "about 45 seconds"],
    [new ApiError("csrf", 403, "CSRF_TOKEN_MISMATCH"), "security check failed"],
    [new ApiError("session", 401, "SESSION_RECONCILIATION_FAILED"), "must sign in again"],
  ])("maps a password failure to its form and clears sensitive fields", async (failure, message) => {
    renderSecurity({ onChangePassword: jest.fn().mockRejectedValue(failure) });
    fillPassword();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Current Password", { selector: "#account-security-current-password" })).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
  });

  it("prevents double submit and reports the pending lock to the Settings owner", async () => {
    let finish!: (value: AuthUser) => void;
    const pending = new Promise<AuthUser>((resolve) => { finish = resolve; });
    const change = jest.fn().mockReturnValue(pending);
    const pendingChange = jest.fn();
    renderSecurity({ onChangeEmail: change, onPendingChange: pendingChange });
    fillEmail();
    fireEvent.click(screen.getByRole("button", { name: "Change Email" }));
    fireEvent.click(screen.getByRole("button", { name: "Changing Email…" }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(pendingChange).toHaveBeenCalledWith(true);
    await act(async () => { finish({ ...baseUser, email: "new.identity@example.test" }); });
    expect(pendingChange).toHaveBeenLastCalledWith(false);
  });
});
