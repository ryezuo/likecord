"use client";

import { DEFAULT_THEME_ID, type ThemeId, type UserPreferenceDto } from "@likecord/shared";
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { userPreferenceApi } from "../lib/api";
import { applyRootTheme, parseThemeId, readThemeMirror, resetThemeBootstrap, resolveBootstrapTheme, writeThemeMirror } from "../lib/theme";
import { attachVoiceSoundsOwner, VoiceSoundsOwner } from "../lib/voiceSounds";
import {
  AudioOutputCoordinator,
  DEFAULT_AUDIO_OUTPUT_PROFILE,
  attachAudioOutputCoordinator,
  type AudioOutputRole,
  type AudioOutputRoleSettings,
  type AudioOutputState,
} from "../lib/audioOutput";
import { useAuth } from "./useAuth";
import { DEFAULT_CAPTURE_PREFERENCES, normalizeCapturePreferences, type CapturePreferences } from "@likecord/shared/capture-preferences";
import type { CallTransportProfile } from "../lib/callTransport";
import { attachVoiceCaptureOwner, VoiceCaptureOwner, type VoiceCaptureState } from "../lib/voiceCapture";
import type { CaptureFormatIntent } from "../lib/nativeCapture";

export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferenceDto> = Object.freeze({
  ...DEFAULT_CAPTURE_PREFERENCES,
  showSendButton: false,
  theme: DEFAULT_THEME_ID,
  soundEffectsEnabled: null,
  soundEffectsVolume: 70,
  callAndStreamVolume: 100,
});

export type UserPreferenceStatus = "loading" | "ready" | "error";
export type UserPreferenceMutationStatus = "idle" | "saving" | "saved" | "error";
type UserPreferencePatch = Partial<Pick<UserPreferenceDto, "showSendButton" | "theme">>;
type SoundPatch = { soundEffectsEnabled?: boolean; soundEffectsVolume?: number };

interface UserPreferencesContextValue {
  capture: { ready: boolean; state: VoiceCaptureState | null; mutationStatus: UserPreferenceMutationStatus; error: string | null };
  updateCapture: (patch: Partial<CapturePreferences>) => void;
  commitCapture: () => void;
  startMicTest: () => void;
  stopMicTest: () => void;
  chooseInput: (deviceId: string) => void;
  updateCaptureFormat: (format: CaptureFormatIntent) => void;
  retryCapture: () => void;
  useBrowserCaptureForSession: () => void;
  updateCallTransport: (patch: Partial<Omit<CallTransportProfile,"version">>) => void;
  retryCallTransport: () => void;
  preferences: UserPreferenceDto;
  status: UserPreferenceStatus;
  error: string | null;
  retry: () => void;
  mutationStatus: UserPreferenceMutationStatus;
  mutationError: string | null;
  updateShowSendButton: (showSendButton: boolean) => void;
  updateTheme: (theme: ThemeId) => void;
  retryMutation: () => void;
  soundEffects: {
    ready: boolean; enabled: boolean; volume: number; legacyCandidate: boolean | null;
    mutationStatus: UserPreferenceMutationStatus; error: string | null;
  };
  updateSoundEffectsEnabled: (enabled: boolean) => void;
  updateSoundEffectsVolume: (volume: number) => void;
  commitSoundEffects: () => void;
  importLegacySoundEffects: () => void;
  retrySoundEffects: () => void;
  playback: {
    ready: boolean;
    masterPercent: number;
    mutationStatus: UserPreferenceMutationStatus;
    error: string | null;
    output: AudioOutputState;
  };
  updateCallAndStreamVolume: (volume: number) => void;
  commitCallAndStreamVolume: () => void;
  retryCallAndStreamVolume: () => void;
  chooseAudioOutput: () => Promise<boolean>;
  applyListedAudioOutput: (deviceId: string) => void;
  resetAudioOutput: () => void;
  retryAudioOutput: () => void;
  refreshAudioOutputs: () => Promise<void>;
  updateAudioOutputRole: (role: AudioOutputRole, settings: Partial<AudioOutputRoleSettings>) => void;
  resetAudioOutputRole: (role: AudioOutputRole) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);
const LEGACY_SOUND_KEY = "voiceSoundsEnabled";
function readLegacySound(): boolean | null {
  try {
    const value = window.localStorage.getItem(LEGACY_SOUND_KEY);
    return value === "false" ? false : value === "true" ? true : null;
  } catch { return null; }
}
function removeLegacySound() {
  try { window.localStorage.removeItem(LEGACY_SOUND_KEY); } catch { /* Storage may be unavailable. */ }
}
function preferenceErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Unable to load your app preferences.";
}
function mutationErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Unable to save your app preference.";
}
function normalizePreferences(value: UserPreferenceDto): UserPreferenceDto {
  return {
    ...normalizeCapturePreferences(value),
    showSendButton: value.showSendButton, theme: parseThemeId(value.theme),
    soundEffectsEnabled: typeof value.soundEffectsEnabled === "boolean" ? value.soundEffectsEnabled : null,
    soundEffectsVolume: Number.isInteger(value.soundEffectsVolume) && value.soundEffectsVolume >= 0 && value.soundEffectsVolume <= 100 ? value.soundEffectsVolume : 70,
    callAndStreamVolume: Number.isInteger(value.callAndStreamVolume) && value.callAndStreamVolume >= 0 && value.callAndStreamVolume <= 200 ? value.callAndStreamVolume : 100,
  };
}
function bootstrapPreferences(): UserPreferenceDto {
  return { ...DEFAULT_USER_PREFERENCES, theme: resolveBootstrapTheme() };
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const currentAccount = user?.id ?? null;
  const currentAccountRef = useRef(currentAccount);
  // Event callbacks check identity during this render, before passive effects.
  currentAccountRef.current = currentAccount;
  const initialPreferencesRef = useRef<UserPreferenceDto | null>(null);
  if (!initialPreferencesRef.current) initialPreferencesRef.current = bootstrapPreferences();
  const [preferences, setPreferences] = useState<UserPreferenceDto>(initialPreferencesRef.current);
  const [status, setStatus] = useState<UserPreferenceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [mutationStatus, setMutationStatus] = useState<UserPreferenceMutationStatus>("idle");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [legacyCandidate, setLegacyCandidate] = useState<boolean | null>(null);
  const legacyRef = useRef<boolean | null>(null);
  const [soundMutationStatus, setSoundMutationStatus] = useState<UserPreferenceMutationStatus>("idle");
  const [soundError, setSoundError] = useState<string | null>(null);
  const authoritativeRef = useRef<UserPreferenceDto>({ ...DEFAULT_USER_PREFERENCES });
  const desiredRef = useRef<UserPreferenceDto>(initialPreferencesRef.current);
  const failedPatchRef = useRef<UserPreferencePatch | null>(null);
  const mutationVersionRef = useRef(0);
  const generationRef = useRef(0);
  const accountIdRef = useRef<string | null | undefined>(undefined);
  const statusRef = useRef<UserPreferenceStatus>("loading");
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const requestControllerRef = useRef<AbortController | null>(null);
  const soundOwnerRef = useRef<VoiceSoundsOwner | null>(null);
  const soundDirtyRef = useRef<SoundPatch>({});
  const soundVersionRef = useRef(0);
  const soundQueuedRef = useRef(false);
  const soundImportRef = useRef(false);
  const soundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundKnownRef = useRef(false);
  const outputCoordinatorRef = useRef<AudioOutputCoordinator | null>(null);
  const [outputState, setOutputState] = useState<AudioOutputState>({
    status: "ready", error: null, storage: "memory", profile: { ...DEFAULT_AUDIO_OUTPUT_PROFILE, roles: {
      receive: { ...DEFAULT_AUDIO_OUTPUT_PROFILE.roles.receive }, sfx: { ...DEFAULT_AUDIO_OUTPUT_PROFILE.roles.sfx },
    } }, effectiveDeviceId: "", devices: [],
    capabilities: { picker: false, enumeration: false, contextSink: false, elementSink: false, permission: "not-queryable" },
    effective: { receive: null, sfx: null },
  });
  const [playbackMutationStatus, setPlaybackMutationStatus] = useState<UserPreferenceMutationStatus>("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const playbackDirtyRef = useRef<number | null>(null);
  const playbackVersionRef = useRef(0);
  const playbackQueuedRef = useRef(false);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackKnownRef = useRef(false);
  const captureOwnerRef = useRef<VoiceCaptureOwner | null>(null);
  const captureKnownRef = useRef(false);
  const captureDirtyRef = useRef<Partial<CapturePreferences>>({});
  const captureVersionRef = useRef(0);
  const captureQueuedRef = useRef(false);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [captureState, setCaptureState] = useState<VoiceCaptureState | null>(null);
  const [captureMutationStatus, setCaptureMutationStatus] = useState<UserPreferenceMutationStatus>("idle");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const configureCapture = useCallback(() => {
    captureOwnerRef.current?.configure(accountIdRef.current === currentAccountRef.current && currentAccountRef.current !== null && captureKnownRef.current, desiredRef.current);
  }, []);

  const configureSound = useCallback(() => {
    const sameAccount = accountIdRef.current === currentAccountRef.current && currentAccountRef.current !== null;
    soundOwnerRef.current?.configure({
      ready: sameAccount && soundKnownRef.current,
      enabled: desiredRef.current.soundEffectsEnabled ?? legacyRef.current ?? true,
      volume: desiredRef.current.soundEffectsVolume,
    });
  }, []);

  const configurePlayback = useCallback(() => {
    const sameAccount = accountIdRef.current === currentAccountRef.current && currentAccountRef.current !== null;
    outputCoordinatorRef.current?.configureMaster(
      sameAccount && playbackKnownRef.current,
      desiredRef.current.callAndStreamVolume,
    );
  }, []);

  useLayoutEffect(() => { applyRootTheme(preferences.theme); }, [preferences.theme]);

  useEffect(() => {
    const generation = ++generationRef.current;
    const previousAccountId = accountIdRef.current;
    const accountId = currentAccount;
    const accountChanged = previousAccountId !== undefined && previousAccountId !== accountId;
    const keepKnown = previousAccountId === accountId && soundKnownRef.current;
    const keepPlaybackKnown = previousAccountId === accountId && playbackKnownRef.current;
    const keepCaptureKnown = previousAccountId === accountId && captureKnownRef.current;
    accountIdRef.current = accountId;
    mutationVersionRef.current = 0;
    mutationQueueRef.current = Promise.resolve();
    failedPatchRef.current = null;
    captureQueuedRef.current = false;
    if (captureTimerRef.current !== null) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
    if (!keepCaptureKnown) {
      captureKnownRef.current = false; captureDirtyRef.current = {}; captureVersionRef.current = 0;
      setCaptureMutationStatus("idle"); setCaptureError(null);
    } else if (Object.keys(captureDirtyRef.current).length) {
      setCaptureMutationStatus("error"); setCaptureError("Input changes are unsaved. Retry saving.");
    }
    soundQueuedRef.current = false;
    if (soundTimerRef.current !== null) clearTimeout(soundTimerRef.current);
    soundTimerRef.current = null;
    playbackQueuedRef.current = false;
    if (playbackTimerRef.current !== null) clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;

    if (!user || accountChanged) resetThemeBootstrap();
    const initial = user && !accountChanged
      ? { ...DEFAULT_USER_PREFERENCES, theme: readThemeMirror() }
      : { ...DEFAULT_USER_PREFERENCES };
    if (!keepKnown) {
      authoritativeRef.current = { ...DEFAULT_USER_PREFERENCES };
      desiredRef.current = initial;
      soundKnownRef.current = false;
      soundDirtyRef.current = {};
      soundImportRef.current = false;
      soundVersionRef.current = 0;
      legacyRef.current = user ? readLegacySound() : null;
      setLegacyCandidate(legacyRef.current);
      setPreferences(initial);
      setSoundMutationStatus("idle");
      setSoundError(null);
    } else if (Object.keys(soundDirtyRef.current).length || soundImportRef.current) {
      // A hydration retry invalidates prior requests, but never their quiet
      // session intent. Keep an explicit way to resubmit the interrupted save.
      setSoundMutationStatus("error");
      setSoundError("Sound changes are not yet saved. Retry saving your settings.");
    }
    if (!keepPlaybackKnown) {
      playbackKnownRef.current = false;
      playbackDirtyRef.current = null;
      playbackVersionRef.current = 0;
      setPlaybackMutationStatus("idle");
      setPlaybackError(null);
    } else if (playbackDirtyRef.current !== null) {
      setPlaybackMutationStatus("error");
      setPlaybackError("Master volume is not yet saved. Retry saving your setting.");
    }
    setMutationStatus("idle");
    setMutationError(null);
    configureSound();
    configurePlayback();
    configureCapture();

    if (!user) {
      statusRef.current = "ready";
      setStatus("ready");
      setError(null);
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    let current = true;
    statusRef.current = "loading";
    setStatus("loading");
    setError(null);
    const soundVersion = soundVersionRef.current;
    void userPreferenceApi.get(controller.signal).then((value) => {
      if (!current || generationRef.current !== generation || currentAccountRef.current !== accountId) return;
      const authoritative = normalizePreferences(value);
      authoritativeRef.current = authoritative;
      const soundChanged = soundVersion !== soundVersionRef.current || Object.keys(soundDirtyRef.current).length > 0;
      const playbackChanged = playbackDirtyRef.current !== null;
      const intended = {
        ...authoritative,
        ...(soundChanged ? soundDirtyRef.current : {}),
        ...(playbackChanged ? { callAndStreamVolume: playbackDirtyRef.current! } : {}),
        ...captureDirtyRef.current,
      };
      desiredRef.current = intended;
      soundKnownRef.current = true;
      playbackKnownRef.current = true;
      captureKnownRef.current = true;
      if (authoritative.soundEffectsEnabled !== null) {
        legacyRef.current = null;
        setLegacyCandidate(null);
        removeLegacySound();
      }
      writeThemeMirror(intended.theme);
      setPreferences(intended);
      statusRef.current = "ready";
      setStatus("ready");
      configureSound();
      configurePlayback();
      configureCapture();
    }).catch((caught: unknown) => {
      if (!current || controller.signal.aborted || generationRef.current !== generation || currentAccountRef.current !== accountId) return;
      setError(preferenceErrorMessage(caught));
      statusRef.current = "error";
      setStatus("error");
    });

    return () => {
      current = false;
      controller.abort();
      if (captureTimerRef.current !== null) clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
      if (soundTimerRef.current !== null) clearTimeout(soundTimerRef.current);
      soundTimerRef.current = null;
      if (playbackTimerRef.current !== null) clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    };
  }, [retryVersion, currentAccount, configurePlayback, configureSound, configureCapture]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);

  const enqueueUpdate = useCallback((patch: UserPreferencePatch) => {
    if (statusRef.current !== "ready" || accountIdRef.current !== currentAccountRef.current) return;
    const accountId = currentAccountRef.current;
    const generation = generationRef.current;
    const mutationVersion = ++mutationVersionRef.current;
    const intended = normalizePreferences({ ...desiredRef.current, ...patch });
    desiredRef.current = intended;
    failedPatchRef.current = null;
    writeThemeMirror(intended.theme);
    setPreferences(intended);
    setMutationError(null);
    setMutationStatus("saving");

    mutationQueueRef.current = mutationQueueRef.current.then(async () => {
      if (generationRef.current !== generation || currentAccountRef.current !== accountId) return;
      try {
        const response = normalizePreferences(await userPreferenceApi.update(patch, requestControllerRef.current?.signal));
        if (generationRef.current !== generation || currentAccountRef.current !== accountId) return;
        // Appearance responses cannot overwrite SFX session intent or its queue.
        authoritativeRef.current = { ...authoritativeRef.current, theme: response.theme, showSendButton: response.showSendButton };
        if (mutationVersion === mutationVersionRef.current) {
          desiredRef.current = { ...desiredRef.current, theme: response.theme, showSendButton: response.showSendButton };
          writeThemeMirror(response.theme);
          setPreferences(desiredRef.current);
          setMutationStatus("saved");
        }
      } catch (caught: unknown) {
        if (generationRef.current !== generation || currentAccountRef.current !== accountId) return;
        if (mutationVersion === mutationVersionRef.current) {
          failedPatchRef.current = patch;
          desiredRef.current = { ...desiredRef.current, theme: authoritativeRef.current.theme, showSendButton: authoritativeRef.current.showSendButton };
          writeThemeMirror(authoritativeRef.current.theme);
          setPreferences(desiredRef.current);
          setMutationError(mutationErrorMessage(caught));
          setMutationStatus("error");
        }
      }
    });
  }, []);

  const commitSoundEffects = useCallback(() => {
    if (soundTimerRef.current !== null) clearTimeout(soundTimerRef.current);
    soundTimerRef.current = null;
    if (!soundKnownRef.current || !currentAccountRef.current || accountIdRef.current !== currentAccountRef.current || soundQueuedRef.current) return;
    if (!Object.keys(soundDirtyRef.current).length && !soundImportRef.current) return;
    const accountId = currentAccountRef.current;
    const generation = generationRef.current;
    const isCurrent = () => generationRef.current === generation && currentAccountRef.current === accountId;
    soundQueuedRef.current = true;
    setSoundMutationStatus("saving");
    setSoundError(null);
    mutationQueueRef.current = mutationQueueRef.current.then(async () => {
      while (isCurrent() && (Object.keys(soundDirtyRef.current).length || soundImportRef.current)) {
        const version = soundVersionRef.current;
        const patch = { ...soundDirtyRef.current };
        const importing = soundImportRef.current && patch.soundEffectsEnabled === undefined;
        const candidate = legacyRef.current;
        try {
          const response = normalizePreferences(importing && candidate !== null
            ? await userPreferenceApi.importSoundEffects({ enabled: candidate }, requestControllerRef.current?.signal)
            : await userPreferenceApi.update(patch, requestControllerRef.current?.signal));
          if (!isCurrent()) return;
          authoritativeRef.current = { ...authoritativeRef.current, soundEffectsEnabled: response.soundEffectsEnabled, soundEffectsVolume: response.soundEffectsVolume };
          if (response.soundEffectsEnabled !== null) {
            legacyRef.current = null;
            setLegacyCandidate(null);
            removeLegacySound();
          }
          soundImportRef.current = false;
          if (version === soundVersionRef.current) {
            // An import writes enabled only; a pending volume still needs its PATCH.
            soundDirtyRef.current = importing ? patch : {};
          }
          // Merge only fields without a newer local intention.
          desiredRef.current = { ...desiredRef.current, soundEffectsEnabled: response.soundEffectsEnabled, soundEffectsVolume: response.soundEffectsVolume, ...soundDirtyRef.current };
          setPreferences(desiredRef.current);
          configureSound();
        } catch (caught: unknown) {
          if (!isCurrent()) return;
          setSoundMutationStatus("error");
          setSoundError(mutationErrorMessage(caught));
          soundQueuedRef.current = false;
          return; // Keep intended false/zero/low values and pending import for Retry.
        }
      }
      if (isCurrent()) {
        soundQueuedRef.current = false;
        setSoundMutationStatus("saved");
      }
    });
  }, [configureSound]);

  const updateSound = useCallback((patch: SoundPatch, immediate: boolean) => {
    if (!soundKnownRef.current || !currentAccountRef.current || accountIdRef.current !== currentAccountRef.current) return;
    soundVersionRef.current++;
    soundDirtyRef.current = { ...soundDirtyRef.current, ...patch };
    if (patch.soundEffectsEnabled !== undefined) soundImportRef.current = false;
    desiredRef.current = { ...desiredRef.current, ...patch };
    setPreferences(desiredRef.current);
    setSoundMutationStatus("saving");
    setSoundError(null);
    configureSound();
    if (soundTimerRef.current !== null) clearTimeout(soundTimerRef.current);
    if (immediate) commitSoundEffects();
    else soundTimerRef.current = setTimeout(commitSoundEffects, 200);
  }, [commitSoundEffects, configureSound]);
  const updateSoundEffectsEnabled = useCallback((enabled: boolean) => updateSound({ soundEffectsEnabled: enabled }, true), [updateSound]);
  const updateSoundEffectsVolume = useCallback((volume: number) => {
    if (Number.isInteger(volume) && volume >= 0 && volume <= 100) updateSound({ soundEffectsVolume: volume }, false);
  }, [updateSound]);
  const importLegacySoundEffects = useCallback(() => {
    if (legacyRef.current === null || !soundKnownRef.current || desiredRef.current.soundEffectsEnabled !== null) return;
    soundImportRef.current = true;
    commitSoundEffects();
  }, [commitSoundEffects]);

  const commitCallAndStreamVolume = useCallback(() => {
    if (playbackTimerRef.current !== null) clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;
    if (!playbackKnownRef.current || !currentAccountRef.current
      || accountIdRef.current !== currentAccountRef.current || playbackQueuedRef.current
      || playbackDirtyRef.current === null) return;
    const accountId = currentAccountRef.current;
    const generation = generationRef.current;
    const isCurrent = () => generationRef.current === generation && currentAccountRef.current === accountId;
    playbackQueuedRef.current = true;
    setPlaybackMutationStatus("saving");
    setPlaybackError(null);
    mutationQueueRef.current = mutationQueueRef.current.then(async () => {
      while (isCurrent() && playbackDirtyRef.current !== null) {
        const version = playbackVersionRef.current;
        const volume = playbackDirtyRef.current;
        try {
          const response = normalizePreferences(await userPreferenceApi.update(
            { callAndStreamVolume: volume }, requestControllerRef.current?.signal,
          ));
          if (!isCurrent()) return;
          authoritativeRef.current = { ...authoritativeRef.current, callAndStreamVolume: response.callAndStreamVolume };
          if (version === playbackVersionRef.current) playbackDirtyRef.current = null;
          desiredRef.current = {
            ...desiredRef.current,
            callAndStreamVolume: playbackDirtyRef.current ?? response.callAndStreamVolume,
          };
          setPreferences(desiredRef.current);
          configurePlayback();
        } catch (caught: unknown) {
          if (!isCurrent()) return;
          playbackQueuedRef.current = false;
          setPlaybackMutationStatus("error");
          setPlaybackError(mutationErrorMessage(caught));
          return;
        }
      }
      if (isCurrent()) {
        playbackQueuedRef.current = false;
        setPlaybackMutationStatus("saved");
      }
    });
  }, [configurePlayback]);

  const updateCallAndStreamVolume = useCallback((volume: number) => {
    if (!Number.isInteger(volume) || volume < 0 || volume > 200 || !playbackKnownRef.current
      || !currentAccountRef.current || accountIdRef.current !== currentAccountRef.current) return;
    playbackVersionRef.current += 1;
    playbackDirtyRef.current = volume;
    desiredRef.current = { ...desiredRef.current, callAndStreamVolume: volume };
    setPreferences(desiredRef.current);
    setPlaybackMutationStatus("saving");
    setPlaybackError(null);
    configurePlayback();
    if (playbackTimerRef.current !== null) clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = setTimeout(commitCallAndStreamVolume, 200);
  }, [commitCallAndStreamVolume, configurePlayback]);

  const commitCapture = useCallback(() => {
    if (captureTimerRef.current !== null) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
    if (!captureKnownRef.current || !currentAccountRef.current || accountIdRef.current !== currentAccountRef.current || captureQueuedRef.current || !Object.keys(captureDirtyRef.current).length) return;
    const accountId = currentAccountRef.current;
    const generation = generationRef.current;
    const isCurrent = () => generation === generationRef.current && accountId === currentAccountRef.current;
    captureQueuedRef.current = true; setCaptureMutationStatus("saving"); setCaptureError(null);
    mutationQueueRef.current = mutationQueueRef.current.then(async () => {
      while (isCurrent() && Object.keys(captureDirtyRef.current).length) {
        const version = captureVersionRef.current;
        const patch = { ...captureDirtyRef.current };
        try {
          const response = normalizeCapturePreferences(await userPreferenceApi.update(patch, requestControllerRef.current?.signal));
          if (!isCurrent()) return;
          authoritativeRef.current = { ...authoritativeRef.current, ...response };
          if (version === captureVersionRef.current) captureDirtyRef.current = {};
          desiredRef.current = { ...desiredRef.current, ...response, ...captureDirtyRef.current };
          setPreferences(desiredRef.current); configureCapture();
        } catch (caught: unknown) {
          if (!isCurrent()) return;
          captureQueuedRef.current = false; setCaptureMutationStatus("error"); setCaptureError(mutationErrorMessage(caught));
          return; // Preserve current gain/gate/native intent. Saving never opens a microphone.
        }
      }
      if (isCurrent()) { captureQueuedRef.current = false; setCaptureMutationStatus("saved"); }
    });
  }, [configureCapture]);

  const updateCapture = useCallback((patch: Partial<CapturePreferences>) => {
    if (!captureKnownRef.current || !currentAccountRef.current || accountIdRef.current !== currentAccountRef.current) return;
    const intended = normalizeCapturePreferences({ ...desiredRef.current, ...patch });
    for (const key of Object.keys(patch) as Array<keyof CapturePreferences>) if (intended[key] !== patch[key]) return;
    captureVersionRef.current++; captureDirtyRef.current = { ...captureDirtyRef.current, ...patch };
    desiredRef.current = { ...desiredRef.current, ...intended };
    setPreferences(desiredRef.current); setCaptureMutationStatus("saving"); setCaptureError(null); configureCapture();
    if (captureTimerRef.current !== null) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = setTimeout(commitCapture, 200);
  }, [configureCapture, commitCapture]);

  useLayoutEffect(() => {
    const accountId = currentAccount;
    const owner = accountId ? new VoiceCaptureOwner(accountId, () => currentAccountRef.current === accountId) : null;
    captureOwnerRef.current = owner;
    const detach = owner ? attachVoiceCaptureOwner(owner) : () => undefined;
    const unsubscribe = owner?.subscribe(() => setCaptureState(owner.snapshot())) ?? (() => undefined);
    setCaptureState(owner?.snapshot() ?? null);
    configureCapture();
    return () => { unsubscribe(); detach(); if (captureOwnerRef.current === owner) captureOwnerRef.current = null; };
  }, [currentAccount, configureCapture]);
  const startMicTest = useCallback(() => { void captureOwnerRef.current?.startTest(); }, []);
  const stopMicTest = useCallback(() => captureOwnerRef.current?.stopTest(), []);
  const chooseInput = useCallback((deviceId: string) => { void captureOwnerRef.current?.chooseDevice(deviceId); }, []);
  const updateCaptureFormat = useCallback((format: CaptureFormatIntent) => { void captureOwnerRef.current?.updateFormat(format); }, []);
  const retryCapture = useCallback(() => { void captureOwnerRef.current?.retry(); }, []);
  const useBrowserCaptureForSession = useCallback(() => { void captureOwnerRef.current?.useBrowserForSession(); }, []);
  const updateCallTransport = useCallback((patch: Partial<Omit<CallTransportProfile,"version">>) => { captureOwnerRef.current?.transport.update(patch); }, []);
  const retryCallTransport = useCallback(() => { captureOwnerRef.current?.transport.retry(); }, []);

  useLayoutEffect(() => {
    const accountId = currentAccount;
    const isCurrent = () => currentAccountRef.current === accountId && accountId !== null;
    const coordinator = accountId ? new AudioOutputCoordinator(accountId, isCurrent) : null;
    outputCoordinatorRef.current = coordinator;
    const detachCoordinator = coordinator ? attachAudioOutputCoordinator(coordinator) : () => undefined;
    const unsubscribe = coordinator?.subscribe(() => setOutputState(coordinator.snapshot())) ?? (() => undefined);
    if (coordinator) setOutputState(coordinator.snapshot());
    const next = new VoiceSoundsOwner(isCurrent, updateSoundEffectsEnabled, accountId ?? "", coordinator ?? undefined);
    soundOwnerRef.current = next;
    const detach = attachVoiceSoundsOwner(next);
    configureSound();
    configurePlayback();
    return () => {
      unsubscribe();
      detach();
      detachCoordinator();
      if (soundOwnerRef.current === next) soundOwnerRef.current = null;
      if (outputCoordinatorRef.current === coordinator) outputCoordinatorRef.current = null;
    };
  }, [currentAccount, configurePlayback, configureSound, updateSoundEffectsEnabled]);

  const updateShowSendButton = useCallback((showSendButton: boolean) => enqueueUpdate({ showSendButton }), [enqueueUpdate]);
  const updateTheme = useCallback((theme: ThemeId) => enqueueUpdate({ theme }), [enqueueUpdate]);
  const retryMutation = useCallback(() => { if (failedPatchRef.current) enqueueUpdate(failedPatchRef.current); }, [enqueueUpdate]);
  const chooseAudioOutput = useCallback(() => outputCoordinatorRef.current?.chooseWithPicker() ?? Promise.resolve(false), []);
  const applyListedAudioOutput = useCallback((deviceId: string) => outputCoordinatorRef.current?.applyListedDevice(deviceId), []);
  const resetAudioOutput = useCallback(() => outputCoordinatorRef.current?.resetDevice(), []);
  const retryAudioOutput = useCallback(() => outputCoordinatorRef.current?.retry(), []);
  const refreshAudioOutputs = useCallback(() => outputCoordinatorRef.current?.refreshCapabilities() ?? Promise.resolve(), []);
  const updateAudioOutputRole = useCallback((role: AudioOutputRole, settings: Partial<AudioOutputRoleSettings>) => {
    outputCoordinatorRef.current?.updateRoleSettings(role, settings);
  }, []);
  const resetAudioOutputRole = useCallback((role: AudioOutputRole) => outputCoordinatorRef.current?.resetRoleSettings(role), []);
  const accountMatches = currentAccount !== null && accountIdRef.current === currentAccount;
  const exposedPreferences = accountMatches ? preferences : { ...DEFAULT_USER_PREFERENCES };
  const value = useMemo(() => ({
    capture: { ready: accountMatches && captureKnownRef.current, state: accountMatches ? captureState : null, mutationStatus: captureMutationStatus, error: captureError },
    updateCapture, commitCapture, startMicTest, stopMicTest, chooseInput, updateCaptureFormat, retryCapture, useBrowserCaptureForSession, updateCallTransport, retryCallTransport,
    preferences: exposedPreferences, status: accountMatches || currentAccount === null ? status : "loading" as const,
    error, retry, mutationStatus, mutationError, updateShowSendButton, updateTheme, retryMutation,
    soundEffects: {
      ready: accountMatches && soundKnownRef.current,
      enabled: accountMatches && (preferences.soundEffectsEnabled ?? legacyCandidate ?? true),
      volume: accountMatches ? preferences.soundEffectsVolume : 70,
      legacyCandidate: accountMatches && preferences.soundEffectsEnabled === null ? legacyCandidate : null,
      mutationStatus: soundMutationStatus, error: soundError,
    },
    updateSoundEffectsEnabled, updateSoundEffectsVolume, commitSoundEffects, importLegacySoundEffects,
    retrySoundEffects: commitSoundEffects,
    playback: {
      ready: accountMatches && playbackKnownRef.current,
      masterPercent: accountMatches ? preferences.callAndStreamVolume : 100,
      mutationStatus: playbackMutationStatus,
      error: playbackError,
      output: outputState,
    },
    updateCallAndStreamVolume, commitCallAndStreamVolume,
    retryCallAndStreamVolume: commitCallAndStreamVolume,
    chooseAudioOutput, applyListedAudioOutput, resetAudioOutput, retryAudioOutput, refreshAudioOutputs,
    updateAudioOutputRole, resetAudioOutputRole,
  }), [captureState, captureMutationStatus, captureError, updateCapture, commitCapture, startMicTest, stopMicTest, chooseInput, updateCaptureFormat, retryCapture, useBrowserCaptureForSession, updateCallTransport, retryCallTransport, accountMatches, currentAccount, exposedPreferences, status, error, retry, mutationStatus, mutationError, updateShowSendButton, updateTheme, retryMutation, preferences, legacyCandidate, soundMutationStatus, soundError, updateSoundEffectsEnabled, updateSoundEffectsVolume, commitSoundEffects, importLegacySoundEffects, playbackMutationStatus, playbackError, outputState, updateCallAndStreamVolume, commitCallAndStreamVolume, chooseAudioOutput, applyListedAudioOutput, resetAudioOutput, retryAudioOutput, refreshAudioOutputs, updateAudioOutputRole, resetAudioOutputRole]);

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  return context;
}
