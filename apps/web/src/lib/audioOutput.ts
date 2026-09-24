"use client";

export type AudioOutputRole = "receive" | "sfx";
export type AudioLatencyIntent = "auto" | "interactive" | "balanced" | "playback" | number;
export type AudioRenderSizeIntent = "auto" | "hardware" | number;
export type AudioChannelLayout = "auto" | "mono" | "stereo";

export interface AudioOutputRoleSettings {
  latencyHint: AudioLatencyIntent;
  sampleRate: number | null;
  renderSizeHint: AudioRenderSizeIntent;
  channelLayout: AudioChannelLayout;
}

export interface AudioOutputProfileV1 {
  version: 1;
  deviceId: string;
  roles: Record<AudioOutputRole, AudioOutputRoleSettings>;
}

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

export interface AudioOutputEffectiveState {
  sampleRate: number | null;
  renderQuantumSize: number | null;
  baseLatencyMs: number | null;
  outputLatencyMs: number | null;
  outputTimestamp: { contextTime: number; performanceTime: number } | null;
  channelCount: number | null;
  contextState: AudioContextState | "unavailable";
  note: string | null;
}

export interface AudioOutputCapabilities {
  picker: boolean;
  enumeration: boolean;
  contextSink: boolean;
  elementSink: boolean;
  permission: "granted" | "prompt" | "denied" | "not-queryable";
}

export interface AudioOutputState {
  status: "ready" | "applying" | "failed" | "device-lost";
  error: string | null;
  storage: "local" | "memory";
  profile: AudioOutputProfileV1;
  effectiveDeviceId: string;
  devices: AudioOutputDevice[];
  capabilities: AudioOutputCapabilities;
  effective: Record<AudioOutputRole, AudioOutputEffectiveState | null>;
}

export interface AudioOutputAdapter {
  readonly id: string;
  readonly role: AudioOutputRole;
  setTransitionMuted(muted: boolean): void;
  setMaster?(ready: boolean, percent: number): void;
  apply(settings: AudioOutputRoleSettings, deviceId: string): Promise<AudioOutputEffectiveState>;
  dispose?(): void;
}

const AUTO_ROLE_SETTINGS: AudioOutputRoleSettings = Object.freeze({
  latencyHint: "auto",
  sampleRate: null,
  renderSizeHint: "auto",
  channelLayout: "auto",
});

export const DEFAULT_AUDIO_OUTPUT_PROFILE: AudioOutputProfileV1 = Object.freeze({
  version: 1,
  deviceId: "",
  roles: Object.freeze({
    receive: Object.freeze({ ...AUTO_ROLE_SETTINGS }),
    sfx: Object.freeze({ ...AUTO_ROLE_SETTINGS }),
  }),
});

const EMPTY_EFFECTIVE: Record<AudioOutputRole, AudioOutputEffectiveState | null> = { receive: null, sfx: null };
const DEFAULT_CAPABILITIES: AudioOutputCapabilities = {
  picker: false,
  enumeration: false,
  contextSink: false,
  elementSink: false,
  permission: "not-queryable",
};

function cloneProfile(profile: AudioOutputProfileV1): AudioOutputProfileV1 {
  return {
    version: 1,
    deviceId: profile.deviceId,
    roles: {
      receive: { ...profile.roles.receive },
      sfx: { ...profile.roles.sfx },
    },
  };
}

function sanitizeLatency(value: unknown): AudioLatencyIntent {
  if (value === "auto" || value === "interactive" || value === "balanced" || value === "playback") return value;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000 ? value : "auto";
}

function sanitizeSampleRate(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 8000 && value <= 192000 ? value : null;
}

function sanitizeRenderSize(value: unknown): AudioRenderSizeIntent {
  if (value === "auto" || value === "hardware") return value;
  return typeof value === "number" && Number.isInteger(value) && value >= 64 && value <= 2048 && (value & (value - 1)) === 0
    ? value
    : "auto";
}

function sanitizeLayout(value: unknown): AudioChannelLayout {
  return value === "mono" || value === "stereo" ? value : "auto";
}

export function sanitizeAudioOutputRoleSettings(value: unknown): AudioOutputRoleSettings {
  const record = value && typeof value === "object" ? value as Partial<AudioOutputRoleSettings> : {};
  return {
    latencyHint: sanitizeLatency(record.latencyHint),
    sampleRate: sanitizeSampleRate(record.sampleRate),
    renderSizeHint: sanitizeRenderSize(record.renderSizeHint),
    channelLayout: sanitizeLayout(record.channelLayout),
  };
}

export function sanitizeAudioOutputProfile(value: unknown): AudioOutputProfileV1 {
  const record = value && typeof value === "object" ? value as Partial<AudioOutputProfileV1> : {};
  const roles = record.roles && typeof record.roles === "object" ? record.roles : {} as AudioOutputProfileV1["roles"];
  return {
    version: 1,
    deviceId: typeof record.deviceId === "string" && record.deviceId.length <= 512 ? record.deviceId : "",
    roles: {
      receive: sanitizeAudioOutputRoleSettings(roles.receive),
      sfx: sanitizeAudioOutputRoleSettings(roles.sfx),
    },
  };
}

export function audioContextOptions(settings: AudioOutputRoleSettings): AudioContextOptions & { renderSizeHint?: string | number } {
  const options: AudioContextOptions & { renderSizeHint?: string | number } = {};
  if (settings.latencyHint !== "auto") {
    options.latencyHint = typeof settings.latencyHint === "number" ? settings.latencyHint / 1000 : settings.latencyHint;
  }
  if (settings.sampleRate !== null) options.sampleRate = settings.sampleRate;
  if (settings.renderSizeHint !== "auto") options.renderSizeHint = settings.renderSizeHint;
  return options;
}

function sameSettings(left: AudioOutputRoleSettings, right: AudioOutputRoleSettings) {
  return left.latencyHint === right.latencyHint
    && left.sampleRate === right.sampleRate
    && left.renderSizeHint === right.renderSizeHint
    && left.channelLayout === right.channelLayout;
}

function requiresConfiguredOutput(profile: AudioOutputProfileV1, role: AudioOutputRole) {
  const settings = profile.roles[role];
  return profile.deviceId !== ""
    || settings.latencyHint !== "auto"
    || settings.sampleRate !== null
    || settings.renderSizeHint !== "auto"
    || settings.channelLayout !== "auto";
}

function safeOutputError(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError") return "Output selection was denied or dismissed.";
  if (name === "NotFoundError") return "The selected output is no longer available.";
  if (name === "AbortError") return "Output selection was cancelled.";
  if (name === "InvalidStateError") return "Output selection needs a new explicit interaction.";
  if (name === "NotSupportedError") return "This output configuration is not supported by the current browser.";
  return "Likecord could not apply the requested output configuration.";
}

function profileStorageKey(accountId: string) {
  return `likecord.audio-output.v1:${accountId}`;
}

export class AudioOutputCoordinator {
  private listeners = new Set<() => void>();
  private adapters = new Map<string, AudioOutputAdapter>();
  private disposed = false;
  private generation = 0;
  private appliedGeneration = 0;
  private applyQueue: Promise<void> = Promise.resolve();
  private effectiveProfile: AudioOutputProfileV1;
  private master = { ready: false, percent: 100 };
  private state: AudioOutputState;

  constructor(readonly accountId: string, private readonly isCurrent: () => boolean) {
    let profile = cloneProfile(DEFAULT_AUDIO_OUTPUT_PROFILE);
    let storage: AudioOutputState["storage"] = "local";
    try {
      const stored = window.localStorage.getItem(profileStorageKey(accountId));
      if (stored) profile = sanitizeAudioOutputProfile(JSON.parse(stored));
    } catch {
      storage = "memory";
    }
    this.effectiveProfile = cloneProfile(profile);
    this.state = {
      status: "ready",
      error: null,
      storage,
      profile,
      effectiveDeviceId: profile.deviceId,
      devices: [],
      capabilities: { ...DEFAULT_CAPABILITIES },
      effective: { ...EMPTY_EFFECTIVE },
    };
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", this.onDeviceChange);
    }
    void this.refreshCapabilities();
  }

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(patch: Partial<AudioOutputState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private saveProfile(profile: AudioOutputProfileV1) {
    let storage = this.state.storage;
    try {
      window.localStorage.setItem(profileStorageKey(this.accountId), JSON.stringify(profile));
      storage = "local";
    } catch {
      storage = "memory";
    }
    this.publish({ profile, storage });
  }

  configureMaster(ready: boolean, percent: number) {
    const safePercent = Number.isInteger(percent) ? Math.max(0, Math.min(200, percent)) : 100;
    this.master = { ready, percent: safePercent };
    for (const adapter of this.adapters.values()) adapter.setMaster?.(ready, safePercent);
  }

  registerAdapter(adapter: AudioOutputAdapter): () => void {
    if (this.disposed || !this.isCurrent()) {
      adapter.setTransitionMuted(true);
      adapter.dispose?.();
      return () => undefined;
    }
    const previous = this.adapters.get(adapter.id);
    if (previous && previous !== adapter) previous.dispose?.();
    this.adapters.set(adapter.id, adapter);
    adapter.setTransitionMuted(true);
    adapter.setMaster?.(this.master.ready, this.master.percent);
    if (requiresConfiguredOutput(this.state.profile, adapter.role)) this.scheduleApply();
    else adapter.setTransitionMuted(false);
    return () => {
      if (this.adapters.get(adapter.id) === adapter) this.adapters.delete(adapter.id);
    };
  }

  reportAdapterEffective(adapterId: string, effective: AudioOutputEffectiveState) {
    const adapter = this.adapters.get(adapterId);
    if (!adapter || this.disposed || !this.isCurrent()) return;
    this.publish({
      effective: { ...this.state.effective, [adapter.role]: effective },
      effectiveDeviceId: effective.contextState === "unavailable" ? this.state.effectiveDeviceId : this.state.profile.deviceId,
    });
  }

  reportAdapterFailure(adapterId: string, error: unknown) {
    const adapter = this.adapters.get(adapterId);
    if (!adapter || this.disposed || !this.isCurrent()) return;
    adapter.setTransitionMuted(true);
    this.publish({
      status: "device-lost",
      error: `${safeOutputError(error)} The affected audio remains silent until you choose another output.`,
    });
  }

  async chooseWithPicker(): Promise<boolean> {
    if (this.disposed || !this.isCurrent() || typeof navigator === "undefined") return false;
    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      selectAudioOutput?: () => Promise<MediaDeviceInfo>;
    };
    if (!mediaDevices?.selectAudioOutput || !this.state.capabilities.contextSink) return false;
    // Deliberately invoke before any await so transient user activation is kept.
    const selection = mediaDevices.selectAudioOutput.call(mediaDevices);
    this.publish({ status: "applying", error: null });
    try {
      const device = await selection;
      if (!this.isCurrent() || this.disposed) return false;
      this.rememberEphemeralDevice(device);
      this.setDevice(device.deviceId);
      return true;
    } catch (error) {
      if (this.isCurrent() && !this.disposed) this.publish({ status: "failed", error: safeOutputError(error) });
      return false;
    }
  }

  applyListedDevice(deviceId: string) {
    if (deviceId !== "" && !this.state.devices.some((device) => device.deviceId === deviceId)) return;
    this.setDevice(deviceId);
  }

  resetDevice() { this.setDevice(""); }

  private setDevice(deviceId: string) {
    const profile = cloneProfile(this.state.profile);
    profile.deviceId = deviceId;
    this.saveProfile(profile);
    this.scheduleApply();
  }

  updateRoleSettings(role: AudioOutputRole, settings: Partial<AudioOutputRoleSettings>) {
    const profile = cloneProfile(this.state.profile);
    profile.roles[role] = sanitizeAudioOutputRoleSettings({ ...profile.roles[role], ...settings });
    this.saveProfile(profile);
    this.scheduleApply();
  }

  resetRoleSettings(role: AudioOutputRole) {
    const profile = cloneProfile(this.state.profile);
    profile.roles[role] = { ...AUTO_ROLE_SETTINGS };
    this.saveProfile(profile);
    this.scheduleApply();
  }

  retry() { return this.scheduleApply(); }

  async refreshCapabilities() {
    if (this.disposed || typeof navigator === "undefined") return;
    const mediaDevices = navigator.mediaDevices as (MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> }) | undefined;
    const contextPrototype = typeof AudioContext !== "undefined" ? AudioContext.prototype as AudioContext & { setSinkId?: (sinkId: string) => Promise<void> } : null;
    const elementPrototype = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.prototype as HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> } : null;
    const capabilities: AudioOutputCapabilities = {
      picker: typeof mediaDevices?.selectAudioOutput === "function",
      enumeration: typeof mediaDevices?.enumerateDevices === "function",
      contextSink: typeof contextPrototype?.setSinkId === "function",
      elementSink: typeof elementPrototype?.setSinkId === "function",
      permission: "not-queryable",
    };
    const devices: AudioOutputDevice[] = [];
    if (capabilities.enumeration) {
      try {
        const enumerated = await mediaDevices!.enumerateDevices();
        for (const device of enumerated) {
          if (device.kind === "audiooutput") devices.push({ deviceId: device.deviceId, label: device.label });
        }
      } catch { /* Enumeration is optional and never opens a microphone. */ }
    }
    const queryPermission = navigator.permissions?.query;
    if (typeof queryPermission === "function") {
      try {
        const permission = await queryPermission.call(navigator.permissions, { name: "speaker-selection" as PermissionName });
        if (permission?.state === "granted" || permission?.state === "prompt" || permission?.state === "denied") {
          capabilities.permission = permission.state;
        }
      } catch { /* Unsupported permission query is distinct from denial. */ }
    }
    if (this.disposed || !this.isCurrent()) return;
    this.publish({ capabilities, devices });
  }

  private rememberEphemeralDevice(device: MediaDeviceInfo) {
    const current = this.state.devices.filter((entry) => entry.deviceId !== device.deviceId);
    this.publish({ devices: [...current, { deviceId: device.deviceId, label: device.label }] });
  }

  private onDeviceChange = () => {
    void this.refreshCapabilities().finally(() => {
      if (!this.disposed && this.isCurrent()) this.scheduleApply();
    });
  };

  private scheduleApply(): Promise<void> {
    if (this.disposed || !this.isCurrent()) return Promise.resolve();
    this.generation += 1;
    this.publish({ status: "applying", error: null });
    this.applyQueue = this.applyQueue.then(() => this.reconcile()).catch(() => undefined);
    return this.applyQueue;
  }

  private async reconcile() {
    while (!this.disposed && this.isCurrent() && this.appliedGeneration < this.generation) {
      const generation = this.generation;
      const desired = cloneProfile(this.state.profile);
      const previous = cloneProfile(this.effectiveProfile);
      const adapters = [...this.adapters.values()];
      adapters.forEach((adapter) => adapter.setTransitionMuted(true));
      let failure: unknown = null;
      const effective = { ...this.state.effective };
      for (const adapter of adapters) {
        try {
          effective[adapter.role] = await adapter.apply(desired.roles[adapter.role], desired.deviceId);
        } catch (error) {
          failure = error;
          break;
        }
      }
      if (failure) {
        let rollbackFailed = false;
        for (const adapter of adapters) {
          try {
            effective[adapter.role] = await adapter.apply(previous.roles[adapter.role], previous.deviceId);
          } catch {
            rollbackFailed = true;
          }
        }
        this.appliedGeneration = generation;
        if (generation !== this.generation) continue;
        if (!rollbackFailed) adapters.forEach((adapter) => adapter.setTransitionMuted(false));
        const message = safeOutputError(failure);
        this.publish({
          status: rollbackFailed ? "device-lost" : "failed",
          error: rollbackFailed ? `${message} The affected audio remains silent until you choose another output.` : `${message} The previous output remains active.`,
          effective,
        });
        return;
      }
      this.appliedGeneration = generation;
      this.effectiveProfile = desired;
      if (generation !== this.generation) continue;
      adapters.forEach((adapter) => adapter.setTransitionMuted(false));
      const hasActiveContext = Object.values(effective).some(
        (state) => state !== null && state.contextState !== "unavailable",
      );
      this.publish({
        status: "ready",
        error: null,
        effectiveDeviceId: hasActiveContext ? desired.deviceId : this.state.effectiveDeviceId,
        effective,
      });
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener("devicechange", this.onDeviceChange);
    }
    for (const adapter of this.adapters.values()) {
      adapter.setTransitionMuted(true);
      adapter.dispose?.();
    }
    this.adapters.clear();
    this.listeners.clear();
  }
}

let activeCoordinator: AudioOutputCoordinator | null = null;

export function attachAudioOutputCoordinator(coordinator: AudioOutputCoordinator): () => void {
  activeCoordinator?.dispose();
  activeCoordinator = coordinator;
  return () => {
    if (activeCoordinator === coordinator) activeCoordinator = null;
    coordinator.dispose();
  };
}

export function getAudioOutputCoordinator(accountId?: string): AudioOutputCoordinator | null {
  return accountId && activeCoordinator?.accountId === accountId ? activeCoordinator : null;
}

export function equalAudioOutputRoleSettings(left: AudioOutputRoleSettings, right: AudioOutputRoleSettings) {
  return sameSettings(left, right);
}
