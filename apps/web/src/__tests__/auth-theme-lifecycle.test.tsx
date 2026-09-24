import "@testing-library/jest-dom";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { THEME_LOCAL_STORAGE_KEY } from "../lib/theme";

let authenticationInvalid: (() => void) | null = null;
const mockUserMe = jest.fn();

jest.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  accountSecurityApi: { changeEmail: jest.fn(), changePassword: jest.fn() },
  authApi: { login: jest.fn(), logout: jest.fn(), register: jest.fn() },
  userApi: { me: (...args: unknown[]) => mockUserMe(...args), update: jest.fn() },
  subscribeToAuthenticationInvalid: (listener: () => void) => {
    authenticationInvalid = listener;
    return () => { authenticationInvalid = null; };
  },
}));

function AuthState() {
  const { user, loading } = useAuth();
  return <span>{loading ? "loading" : user?.id ?? "signed-out"}</span>;
}

describe("theme bootstrap authentication lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticationInvalid = null;
    window.localStorage.clear();
    document.documentElement.setAttribute("data-theme", "likecord-default");
    document.documentElement.style.colorScheme = "dark";
  });

  it("clears the mirror and resets the root on definitive authentication invalidation", async () => {
    mockUserMe.mockResolvedValue({
      id: "user-1", email: "one@example.test", username: "one", displayName: "One",
      avatarUrl: null, bio: null, passwordChangeRequired: false,
    });
    render(<AuthProvider><AuthState /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("user-1")).toBeInTheDocument());
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_DEFAULT");
    document.documentElement.setAttribute("data-theme", "stale-theme");
    document.documentElement.style.colorScheme = "light";

    act(() => authenticationInvalid?.());

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
