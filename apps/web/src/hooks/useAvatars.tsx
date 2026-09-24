"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { AvatarStore, canonicalAvatar } from "../lib/avatar-store";

const AvatarContext = createContext<AvatarStore | null>(null);
type SubscribeEvent = (event: string, callback: (payload: { userId?: string }) => void) => () => void;
export function AvatarProvider({ children, on, readyVersion }: { children: ReactNode; on: SubscribeEvent; readyVersion: number }) {
  const { user, mergeAvatar, sessionVersion } = useAuth();
  const merge = useRef(mergeAvatar); merge.current = mergeAvatar;
  const sessionKey = `${user?.id}:${sessionVersion}`;
  const currentSession = useRef(sessionKey); currentSession.current = sessionKey;
  const store = useMemo(() => new AvatarStore(user?.id || "", user?.avatarUrl || null,
    (url) => { if (user && currentSession.current === sessionKey) merge.current?.(user.id, url); }), [user?.id, sessionVersion]);
  const disposals = useRef(new Map<AvatarStore, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const unsubscribe = on("user:avatar-updated", (event) => { if (typeof event?.userId === "string") store.invalidate(event.userId); });
    const focus = () => store.recover();
    window.addEventListener("focus", focus);
    return () => { unsubscribe(); window.removeEventListener("focus", focus); };
  }, [store, on]);
  useEffect(() => { store.recover(); }, [store, readyVersion]);
  useEffect(() => {
    clearTimeout(disposals.current.get(store));
    return () => { disposals.current.set(store, setTimeout(() => { store.dispose(); disposals.current.delete(store); }, 0)); };
  }, [store]);
  return <AvatarContext.Provider value={store}>{children}</AvatarContext.Provider>;
}
export function useAvatarOwner() { return useContext(AvatarContext); }
export function useAvatar(userId?: string, initial?: string | null) {
  const store = useAvatarOwner();
  const subscribe = useCallback((listener: () => void) => store?.subscribe(userId || "", listener, initial) || (() => {}), [store, userId]);
  const snapshot = useCallback(() => {
    const value = store?.read(userId || "");
    return value === undefined ? canonicalAvatar(userId || "", initial) : value;
  }, [store, userId, initial]);
  const url = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { url, store };
}
