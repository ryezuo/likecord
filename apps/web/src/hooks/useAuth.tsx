"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  ApiError,
  accountSecurityApi,
  authApi,
  subscribeToAuthenticationInvalid,
  userApi,
} from "../lib/api";
import { resetThemeBootstrap } from "../lib/theme";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  passwordChangeRequired: boolean;
}

export class CredentialMutationUncertainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialMutationUncertainError";
  }
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string }) => Promise<AuthUser>;
  changeEmail: (data: { newEmail: string; currentPassword: string }) => Promise<AuthUser>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<AuthUser>;
  mergeAvatar: (userId: string, avatarUrl: string | null) => void;
  sessionVersion: number;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const session = useRef(0);
  const userRef = useRef(user); userRef.current = user;
  const mergeAvatar = useCallback((userId: string, avatarUrl: string | null) => {
    setUser((current) => current?.id === userId && current.avatarUrl !== avatarUrl ? { ...current, avatarUrl } : current);
  }, []);

  const debugAuth = typeof window !== "undefined" && window.localStorage.getItem("debugAuth") === "true";
  const da = (msg: string) => { if (debugAuth) console.log(`[Auth] ${msg}`); };

  const attemptAuth = useCallback(async () => {
    da("boot: starting auth check");
    setLoading(true);
    try {
      da("boot: calling /users/@me with the shared refresh owner");
      const data = await userApi.me();
      setUser(data);
      da("boot: access token valid, user logged in");
    } catch (e: any) {
      da(`boot: auth check failed (${e.message}), showing login`);
      setUser(null);
    } finally {
      setLoading(false);
      da("boot: auth check complete");
    }
  }, [debugAuth]);

  useEffect(() => { attemptAuth(); }, [attemptAuth]);

  useEffect(() => subscribeToAuthenticationInvalid(() => {
    resetThemeBootstrap();
    session.current += 1;
    setSessionVersion(session.current);
    setError(null);
    setUser(null);
  }), []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      resetThemeBootstrap();
      setSessionVersion(++session.current);
      setUser(data.user);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, inviteCode: string) => {
    setError(null);
    try {
      const data = await authApi.register({ email, username, password, inviteCode });
      const fullUser = await userApi.me();
      resetThemeBootstrap();
      setSessionVersion(++session.current);
      setUser(fullUser);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    resetThemeBootstrap();
    setSessionVersion(++session.current);
    try { await authApi.logout(); } catch { /* ok */ }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string; bio?: string }) => {
    const generation = session.current;
    const updated = await userApi.update(data);
    if (generation === session.current) setUser((current) => current?.id === updated.id
      ? { ...current, displayName: updated.displayName, bio: updated.bio } : current);
    return { ...updated, avatarUrl: userRef.current?.id === updated.id ? userRef.current.avatarUrl : null };
  }, []);

  const acceptAuthoritativeUser = useCallback((updated: AuthUser, generation: number) => {
    if (generation === session.current) setUser(updated);
    return updated;
  }, []);

  const reconcileAfterUncertainMutation = useCallback(async (generation: number) => {
    try {
      const updated = await userApi.me();
      return acceptAuthoritativeUser(updated, generation);
    } catch {
      return null;
    }
  }, [acceptAuthoritativeUser]);

  const changeEmail = useCallback(async (data: { newEmail: string; currentPassword: string }) => {
    const generation = session.current;
    const expectedEmail = data.newEmail.trim().toLowerCase();
    try {
      const result = await accountSecurityApi.changeEmail(data);
      return acceptAuthoritativeUser(result.user, generation);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status < 500) throw caught;
      const reconciled = await reconcileAfterUncertainMutation(generation);
      if (reconciled?.email === expectedEmail) return reconciled;
      throw new CredentialMutationUncertainError(
        reconciled
          ? "Your session is still active, but the email change could not be confirmed. Re-enter your password to retry."
          : "The email change could not be confirmed. Sign in again if Likecord asks you to continue.",
      );
    }
  }, [acceptAuthoritativeUser, reconcileAfterUncertainMutation]);

  const changePassword = useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    const generation = session.current;
    const wasRequired = userRef.current?.passwordChangeRequired === true;
    try {
      const result = await accountSecurityApi.changePassword(data);
      return acceptAuthoritativeUser(result.user, generation);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status < 500) throw caught;
      const reconciled = await reconcileAfterUncertainMutation(generation);
      if (wasRequired && reconciled && !reconciled.passwordChangeRequired) return reconciled;
      throw new CredentialMutationUncertainError(
        reconciled
          ? "Your session is still active, but the password change could not be confirmed. Re-enter your passwords to retry."
          : "The password change could not be confirmed. Try signing in with the new password if Likecord asks you to continue.",
      );
    }
  }, [acceptAuthoritativeUser, reconcileAfterUncertainMutation]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateProfile, changeEmail, changePassword, mergeAvatar, sessionVersion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
