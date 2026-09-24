import "@testing-library/jest-dom";
import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import {
  accountSecurityApi,
  api,
  subscribeToAuthenticationInvalid,
} from "../lib/api";

const user = {
  id: "user-1",
  email: "garden@example.test",
  username: "garden",
  displayName: "Garden",
  avatarUrl: null,
  bio: null,
  passwordChangeRequired: false,
};

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(headers),
  } as Response;
}

function AuthHarness() {
  const auth = useAuth();
  const [actionError, setActionError] = useState("");
  return <div>
    <output data-testid="auth-user">{auth.user ? `${auth.user.email}|${auth.user.passwordChangeRequired}` : "none"}</output>
    <output data-testid="auth-loading">{auth.loading ? "loading" : "ready"}</output>
    <output data-testid="action-error">{actionError}</output>
    <button type="button" onClick={() => { void auth.changeEmail({ newEmail: " NEW@EXAMPLE.TEST ", currentPassword: "current-password" }).catch((error) => setActionError(error.message)); }}>Change email</button>
    <button type="button" onClick={() => { void auth.changePassword({ currentPassword: "current-password", newPassword: "new-password" }).catch((error) => setActionError(error.message)); }}>Change password</button>
    <button type="button" onClick={() => { void api("/protected-check").catch(() => undefined); }}>Protected request</button>
  </div>;
}

describe("Account Security API and AuthProvider reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = "csrf_token=csrf-account-security";
    global.fetch = jest.fn();
  });

  it("uses the shared cookie/CSRF client and never sends confirmPassword", async () => {
    (fetch as jest.Mock).mockResolvedValue(response(200, { success: true, user }));
    await accountSecurityApi.changePassword({ currentPassword: "current-password", newPassword: "new-password" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, options] = (fetch as jest.Mock).mock.calls[0];
    expect(options).toEqual(expect.objectContaining({
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf-account-security" },
    }));
    expect(JSON.parse(options.body)).toEqual({ currentPassword: "current-password", newPassword: "new-password" });
    expect(options.body).not.toContain("confirmPassword");
  });

  it("does not auto-replay a credential mutation after an uncertain network outcome", async () => {
    (fetch as jest.Mock).mockRejectedValue(new TypeError("network unavailable"));
    await expect(accountSecurityApi.changeEmail({ newEmail: "new@example.test", currentPassword: "secret" })).rejects.toThrow("network unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not refresh or replay a credential mutation rejected for the current password", async () => {
    (fetch as jest.Mock).mockResolvedValue(response(401, {
      error: { code: "CURRENT_PASSWORD_INVALID", message: "Current password is invalid" },
    }));
    await expect(accountSecurityApi.changePassword({
      currentPassword: "wrong-password",
      newPassword: "new-valid-password",
    })).rejects.toMatchObject({ status: 401, code: "CURRENT_PASSWORD_INVALID" });
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/users/@me/password"))).toHaveLength(1);
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/auth/refresh"))).toHaveLength(0);
  });

  it("shares one safe pre-mutation refresh after an explicit pre-handler 401", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response(401, { error: { code: "SESSION_INVALID", message: "Session is no longer active" } }))
      .mockResolvedValueOnce(response(201, { success: true }))
      .mockResolvedValueOnce(response(200, { user: { ...user, email: "new@example.test" } }));
    await accountSecurityApi.changeEmail({ newEmail: "new@example.test", currentPassword: "secret" });
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/auth/refresh"))).toHaveLength(1);
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/users/@me/email"))).toHaveLength(2);
  });

  it("signals only a definitive refresh rejection, not a temporary network failure", async () => {
    const invalid = jest.fn();
    const unsubscribe = subscribeToAuthenticationInvalid(invalid);
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response(401, { error: { code: "SESSION_INVALID" } }))
      .mockResolvedValueOnce(response(401, { error: { code: "REFRESH_SESSION_REVOKED", message: "Session expired" } }));
    await expect(api("/protected-check")).rejects.toMatchObject({ status: 401 });
    expect(invalid).toHaveBeenCalledTimes(1);

    (fetch as jest.Mock).mockReset()
      .mockResolvedValueOnce(response(401, { error: { code: "SESSION_INVALID" } }))
      .mockRejectedValueOnce(new TypeError("temporary network failure"));
    await expect(api("/protected-check")).rejects.toMatchObject({ status: 401 });
    expect(invalid).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("updates canonical email and clears the forced flag without changing the logical Auth owner", async () => {
    (fetch as jest.Mock).mockImplementation((input, options) => {
      const path = String(input);
      if (path.endsWith("/users/@me/email")) return Promise.resolve(response(200, { user: { ...user, email: "new@example.test" } }));
      if (path.endsWith("/users/@me/password")) return Promise.resolve(response(200, { success: true, user: { ...user, email: "new@example.test", passwordChangeRequired: false } }));
      if (path.endsWith("/users/@me") && (!options?.method || options.method === "GET")) return Promise.resolve(response(200, user));
      throw new Error(`Unexpected request ${path}`);
    });
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready"));
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    await waitFor(() => expect(screen.getByTestId("auth-user")).toHaveTextContent("new@example.test|false"));
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/users/@me/password"))).toHaveLength(1));
    expect(screen.getByTestId("auth-user")).toHaveTextContent("new@example.test|false");
  });

  it("clears a stale authenticated user after definitive session rejection and does not refresh-loop", async () => {
    (fetch as jest.Mock).mockImplementation((input) => {
      const path = String(input);
      if (path.endsWith("/users/@me")) return Promise.resolve(response(200, user));
      if (path.endsWith("/protected-check")) return Promise.resolve(response(401, { error: { code: "SESSION_INVALID" } }));
      if (path.endsWith("/auth/refresh")) return Promise.resolve(response(401, { error: { code: "REFRESH_SESSION_REVOKED", message: "Session expired" } }));
      throw new Error(`Unexpected request ${path}`);
    });
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-user")).toHaveTextContent("garden@example.test|false"));
    fireEvent.click(screen.getByRole("button", { name: "Protected request" }));
    await waitFor(() => expect(screen.getByTestId("auth-user")).toHaveTextContent("none"));
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("keeps the authenticated user on a temporary refresh network failure", async () => {
    (fetch as jest.Mock).mockImplementation((input) => {
      const path = String(input);
      if (path.endsWith("/users/@me")) return Promise.resolve(response(200, user));
      if (path.endsWith("/protected-check")) return Promise.resolve(response(401, { error: { code: "SESSION_INVALID" } }));
      if (path.endsWith("/auth/refresh")) return Promise.reject(new TypeError("temporary network failure"));
      throw new Error(`Unexpected request ${path}`);
    });
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-user")).toHaveTextContent("garden@example.test|false"));
    fireEvent.click(screen.getByRole("button", { name: "Protected request" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByTestId("auth-user")).toHaveTextContent("garden@example.test|false");
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("uses one bounded authoritative read after an uncertain email response and never resends the mutation", async () => {
    let meCalls = 0;
    (fetch as jest.Mock).mockImplementation((input) => {
      const path = String(input);
      if (path.endsWith("/users/@me/email")) return Promise.reject(new TypeError("response lost"));
      if (path.endsWith("/users/@me")) {
        meCalls += 1;
        return Promise.resolve(response(200, meCalls === 1 ? user : { ...user, email: "new@example.test" }));
      }
      throw new Error(`Unexpected request ${path}`);
    });
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready"));
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    await waitFor(() => expect(screen.getByTestId("auth-user")).toHaveTextContent("new@example.test|false"));
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/users/@me/email"))).toHaveLength(1);
    expect(meCalls).toBe(2);
  });

  it("requires explicit retry when an uncertain password response cannot be proven by the authoritative read", async () => {
    (fetch as jest.Mock).mockImplementation((input) => {
      const path = String(input);
      if (path.endsWith("/users/@me/password")) return Promise.reject(new TypeError("response lost"));
      if (path.endsWith("/users/@me")) return Promise.resolve(response(200, user));
      throw new Error(`Unexpected request ${path}`);
    });
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready"));
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getByTestId("action-error")).toHaveTextContent("could not be confirmed"));
    expect(screen.getByTestId("auth-user")).toHaveTextContent("garden@example.test|false");
    expect((fetch as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith("/users/@me/password"))).toHaveLength(1);
  });
});
