"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { voiceMixApi } from "../lib/api";

export interface VoicePersonalMixPreference {
  volumePercent: number;
  locallyMuted: boolean;
}

export function applyVoicePersonalMixToCallSink(
  element: HTMLAudioElement,
  preference: VoicePersonalMixPreference,
  deafened: boolean,
  ready = true,
) {
  element.volume = preference.volumePercent / 100;
  element.muted = !ready || deafened || preference.locallyMuted;
}

const DEFAULT_VOICE_PERSONAL_MIX_PREFERENCE: VoicePersonalMixPreference = {
  volumePercent: 100,
  locallyMuted: false,
};

export const VOICE_MIX_WRITE_DELAY_MS = 200;

interface MixSession {
  listenerUserId?: string;
  active: boolean;
  ready: boolean;
  loading: boolean;
  loadError: boolean;
  abort: AbortController;
  preferences: Map<string, VoicePersonalMixPreference>;
  pending: Map<string, VoicePersonalMixPreference>;
  writing: Set<string>;
  errors: Set<string>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
}

function createSession(listenerUserId?: string): MixSession {
  return {
    listenerUserId, active: true, ready: false, loading: false, loadError: false,
    abort: new AbortController(), preferences: new Map(), pending: new Map(),
    writing: new Set(), errors: new Set(), timers: new Map(),
  };
}

export function useVoicePersonalMix(listenerUserId?: string) {
  const sessionRef = useRef<MixSession>(createSession());
  const [personalMixRevision, setRevision] = useState(0);
  const notify = useCallback(() => setRevision((revision) => revision + 1), []);

  const hydrate = useCallback(async (session: MixSession) => {
    if (!session.active || !session.listenerUserId || session.loading || session.ready) return;
    session.loading = true;
    session.loadError = false;
    notify();
    try {
      const rows = await voiceMixApi.list(session.abort.signal);
      if (!session.active) return;
      session.preferences.clear();
      for (const row of rows) {
        if (row.targetUserId === session.listenerUserId) continue;
        session.preferences.set(row.targetUserId, { volumePercent: row.volumePercent, locallyMuted: row.muted });
      }
      // Publish readiness only after the entire map is available to every sink.
      session.ready = true;
    } catch {
      if (session.active) session.loadError = true;
    } finally {
      session.loading = false;
      if (session.active) notify();
    }
  }, [notify]);

  useEffect(() => {
    const session = createSession(listenerUserId);
    sessionRef.current = session;
    notify();
    void hydrate(session);
    return () => {
      session.active = false;
      session.abort.abort();
      session.timers.forEach(clearTimeout);
    };
  }, [hydrate, listenerUserId, notify]);

  const flush = useCallback(async function writeLatest(session: MixSession, targetUserId: string) {
    if (!session.active || session.writing.has(targetUserId)) return;
    const preference = session.pending.get(targetUserId);
    if (!preference) return;
    session.pending.delete(targetUserId);
    session.writing.add(targetUserId);
    try {
      if (preference.volumePercent === 100 && !preference.locallyMuted) {
        await voiceMixApi.reset(targetUserId, session.abort.signal);
      } else {
        await voiceMixApi.put(targetUserId, {
          volumePercent: preference.volumePercent, muted: preference.locallyMuted,
        }, session.abort.signal);
      }
    } catch {
      // An older failed request must not invalidate a newer queued edit.
      if (session.active && !session.pending.has(targetUserId)) session.errors.add(targetUserId);
    } finally {
      session.writing.delete(targetUserId);
      if (session.active) {
        notify();
        if (session.pending.has(targetUserId)) {
          clearTimeout(session.timers.get(targetUserId));
          session.timers.delete(targetUserId);
          void writeLatest(session, targetUserId);
        }
      }
    }
  }, [notify]);

  const isVoicePersonalMixReady = useCallback(() => {
    const session = sessionRef.current;
    return session.active && session.listenerUserId === listenerUserId && session.ready;
  }, [listenerUserId]);

  const getVoicePersonalMixPreference = useCallback((targetUserId: string): VoicePersonalMixPreference => {
    if (!isVoicePersonalMixReady() || targetUserId === listenerUserId) return DEFAULT_VOICE_PERSONAL_MIX_PREFERENCE;
    return sessionRef.current.preferences.get(targetUserId) ?? DEFAULT_VOICE_PERSONAL_MIX_PREFERENCE;
  }, [isVoicePersonalMixReady, listenerUserId]);

  const setVoicePersonalMixPreference = useCallback((
    targetUserId: string,
    update: Partial<VoicePersonalMixPreference>,
  ) => {
    if (!listenerUserId || targetUserId === listenerUserId || !isVoicePersonalMixReady()) return;
    const session = sessionRef.current;
    const current = getVoicePersonalMixPreference(targetUserId);
    const volumePercent = update.volumePercent === undefined
      ? current.volumePercent
      : Number.isFinite(update.volumePercent)
        ? Math.min(100, Math.max(0, Math.round(update.volumePercent)))
        : current.volumePercent;
    const preference = { volumePercent, locallyMuted: update.locallyMuted ?? current.locallyMuted };
    session.preferences.set(targetUserId, preference);
    session.pending.set(targetUserId, preference);
    session.errors.delete(targetUserId);
    clearTimeout(session.timers.get(targetUserId));
    session.timers.set(targetUserId, setTimeout(() => {
      session.timers.delete(targetUserId);
      void flush(session, targetUserId);
    }, VOICE_MIX_WRITE_DELAY_MS));
    notify();
  }, [flush, getVoicePersonalMixPreference, isVoicePersonalMixReady, listenerUserId, notify]);

  const getVoicePersonalMixStatus = useCallback((targetUserId: string) => {
    const session = sessionRef.current;
    if (!isVoicePersonalMixReady()) return session.loadError ? "load-error" : "loading";
    if (session.errors.has(targetUserId)) return "save-error";
    return session.pending.has(targetUserId) || session.writing.has(targetUserId) ? "saving" : "saved";
  }, [isVoicePersonalMixReady]);

  const retryVoicePersonalMix = useCallback((targetUserId: string) => {
    if (!isVoicePersonalMixReady()) void hydrate(sessionRef.current);
    else setVoicePersonalMixPreference(targetUserId, {});
  }, [hydrate, isVoicePersonalMixReady, setVoicePersonalMixPreference]);

  return {
    getVoicePersonalMixPreference, setVoicePersonalMixPreference,
    isVoicePersonalMixReady, personalMixRevision, getVoicePersonalMixStatus, retryVoicePersonalMix,
  };
}
