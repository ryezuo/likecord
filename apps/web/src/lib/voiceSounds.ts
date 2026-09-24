"use client";

import {
  audioContextOptions,
  equalAudioOutputRoleSettings,
  type AudioOutputAdapter,
  type AudioOutputCoordinator,
  type AudioOutputEffectiveState,
  type AudioOutputRoleSettings,
} from "./audioOutput";

interface Note { hz: number; duration: number; offset: number }
interface Cue { wave: OscillatorType; peak: number; local: boolean; notes: readonly Note[] }
const note = (hz: number, duration: number, offset = 0): Note => ({ hz, duration, offset });

// Per-cue calibration, not a multiplier of the old exponential decays.
// Envelope sum <= .48 at 100%. Pitches, offsets, durations and audiences are retained.
export const SOUND_CUES = {
  join: { wave: "sine", peak: .17, local: true, notes: [note(523, .15), note(659, .20, .08)] },
  leave: { wave: "sine", peak: .17, local: true, notes: [note(440, .15), note(349, .20, .08)] },
  mute: { wave: "square", peak: .16, local: true, notes: [note(330, .10)] },
  unmute: { wave: "square", peak: .16, local: true, notes: [note(523, .10)] },
  deafen: { wave: "sawtooth", peak: .22, local: true, notes: [note(262, .15), note(262, .10, .10)] },
  undeafen: { wave: "sawtooth", peak: .24, local: true, notes: [note(392, .15), note(523, .10, .10)] },
  userJoined: { wave: "sine", peak: .23, local: false, notes: [note(784, .10)] },
  userLeft: { wave: "sine", peak: .23, local: false, notes: [note(330, .12)] },
  screenShareStarted: { wave: "sine", peak: .17, local: true, notes: [note(587, .10), note(784, .14, .065)] },
  screenViewerJoined: { wave: "sine", peak: .22, local: false, notes: [note(698, .11)] },
  screenViewerLeft: { wave: "sine", peak: .22, local: false, notes: [note(392, .12)] },
} as const satisfies Record<string, Cue>;
export type SoundCue = keyof typeof SOUND_CUES;
export const SOUND_ATTACK_SECONDS = .004;
export const SOUND_VOLUME_RAMP_SECONDS = .01;
export const SOUND_EVENT_EXPIRY_MS = 500;
export const SOUND_REMOTE_COALESCE_MS = 250;

export interface SoundEffectsIntent { ready: boolean; enabled: boolean; volume: number }
type PendingCue = { cue: SoundCue; at: number; generation: number };
type ToneNodes = { oscillator: OscillatorNode; envelope: GainNode; start: number };

/** One account-owned SFX graph. Never connected to media tracks or CALL/Screen sinks. */
export class VoiceSoundsOwner {
  private context: AudioContext | null = null;
  private category: GainNode | null = null;
  private outputGate: GainNode | null = null;
  private intent: SoundEffectsIntent = { ready: false, enabled: false, volume: 0 };
  private interacted = false;
  private disposed = false;
  private resuming = false;
  private generation = 0;
  private pending: PendingCue | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nodes = new Set<ToneNodes>();
  private lastRemoteAt = -Infinity;
  private ramp = { from: 0, to: 0, start: 0, end: 0 };
  private outputSettings: AudioOutputRoleSettings | null = null;
  private outputDeviceId = "";
  private transitionMuted = false;
  private unregisterOutput: (() => void) | null = null;
  private outputApply: Promise<void> | null = null;
  private outputNeedsContext = false;

  private readonly outputAdapter: AudioOutputAdapter = {
    id: "voice-sfx",
    role: "sfx",
    setTransitionMuted: (muted) => this.setTransitionMuted(muted),
    apply: (settings, deviceId) => this.applyOutput(settings, deviceId),
  };

  constructor(
    private readonly isCurrent: () => boolean,
    readonly updateEnabled: (enabled: boolean) => void,
    readonly accountId: string,
    private readonly outputCoordinator?: AudioOutputCoordinator,
  ) {
    if (outputCoordinator) {
      this.transitionMuted = true;
      const profile = outputCoordinator.snapshot().profile;
      this.outputSettings = { ...profile.roles.sfx };
      this.outputDeviceId = profile.deviceId;
      this.unregisterOutput = outputCoordinator.registerAdapter(this.outputAdapter);
    }
  }

  get enabled() { return this.isCurrent() && !this.disposed && this.intent.ready && this.intent.enabled; }
  markInteracted() { if (this.isCurrent()) this.interacted = true; }

  configure(intent: SoundEffectsIntent) {
    if (this.disposed) return;
    this.intent = { ...intent, volume: Number.isInteger(intent.volume) ? Math.max(0, Math.min(100, intent.volume)) : 0 };
    this.setCategoryGain(this.enabled && intent.volume > 0 ? this.intent.volume / 100 : 0);
    if (!this.canPlay()) this.cancelSession(true);
  }

  private canPlay() { return this.enabled && this.intent.volume > 0; }

  private setCategoryGain(value: number) {
    if (!this.context || !this.category) return;
    const now = this.context.currentTime;
    const { from, to, start, end } = this.ramp;
    const held = now >= end ? to : from + (to - from) * Math.max(0, (now - start) / (end - start));
    this.category.gain.cancelScheduledValues(now);
    this.category.gain.setValueAtTime(held, now);
    this.category.gain.linearRampToValueAtTime(value, now + SOUND_VOLUME_RAMP_SECONDS);
    this.ramp = { from: held, to: value, start: now, end: now + SOUND_VOLUME_RAMP_SECONDS };
  }

  private onContextStateChange = () => {
    if (this.context?.state !== "running") this.cancelSession();
  };

  private setTransitionMuted(muted: boolean) {
    this.transitionMuted = muted;
    if (!this.context || !this.outputGate) return;
    const now = this.context.currentTime;
    this.outputGate.gain.cancelScheduledValues(now);
    this.outputGate.gain.setValueAtTime(muted ? 0 : 1, now);
  }

  private installContext(context: AudioContext, settings: AudioOutputRoleSettings) {
    this.context = context;
    this.category = context.createGain();
    this.outputGate = context.createGain();
    if (settings.channelLayout !== "auto") {
      this.category.channelCount = settings.channelLayout === "mono" ? 1 : 2;
      this.category.channelCountMode = "explicit";
      this.category.channelInterpretation = "speakers";
    }
    this.category.gain.setValueAtTime(this.intent.volume / 100, context.currentTime);
    this.outputGate.gain.setValueAtTime(this.transitionMuted ? 0 : 1, context.currentTime);
    this.ramp = { from: this.intent.volume / 100, to: this.intent.volume / 100, start: 0, end: 0 };
    this.category.connect(this.outputGate);
    this.outputGate.connect(context.destination);
    context.addEventListener("statechange", this.onContextStateChange);
    this.outputCoordinator?.reportAdapterEffective(this.outputAdapter.id, this.contextEffective());
  }

  private contextEffective(note: string | null = null): AudioOutputEffectiveState {
    const context = this.context as (AudioContext & {
      renderQuantumSize?: number;
      outputLatency?: number;
      getOutputTimestamp?: () => { contextTime: number; performanceTime: number };
    }) | null;
    let timestamp: AudioOutputEffectiveState["outputTimestamp"] = null;
    try {
      const observed = context?.getOutputTimestamp?.();
      if (typeof observed?.contextTime === "number" && typeof observed.performanceTime === "number") timestamp = {
        contextTime: observed.contextTime, performanceTime: observed.performanceTime,
      };
    } catch { /* Optional observation. */ }
    return {
      sampleRate: context && Number.isFinite(context.sampleRate) ? context.sampleRate : null,
      renderQuantumSize: context && Number.isFinite(context.renderQuantumSize) ? context.renderQuantumSize! : null,
      baseLatencyMs: context && Number.isFinite(context.baseLatency) ? context.baseLatency * 1000 : null,
      outputLatencyMs: context && Number.isFinite(context.outputLatency) ? context.outputLatency! * 1000 : null,
      outputTimestamp: timestamp,
      channelCount: this.category?.channelCount ?? null,
      contextState: context?.state ?? "unavailable",
      note,
    };
  }

  private async createConfiguredContext(settings: AudioOutputRoleSettings, deviceId: string) {
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new DOMException("Web Audio unavailable", "NotSupportedError");
    const context = new Constructor(audioContextOptions(settings));
    try {
      if (deviceId) {
        const setSinkId = (context as AudioContext & { setSinkId?: (sinkId: string) => Promise<void> }).setSinkId;
        if (typeof setSinkId !== "function") throw new DOMException("Context output selection unavailable", "NotSupportedError");
        await setSinkId.call(context, deviceId);
      }
      return context;
    } catch (error) {
      await context.close().catch(() => undefined);
      throw error;
    }
  }

  private async applyOutput(settings: AudioOutputRoleSettings, deviceId: string): Promise<AudioOutputEffectiveState> {
    if (!this.context && !this.outputNeedsContext) {
      this.outputSettings = { ...settings };
      this.outputDeviceId = deviceId;
      return this.contextEffective("Effective effects values appear when the first cue starts.");
    }
    if (this.context && this.outputSettings && equalAudioOutputRoleSettings(this.outputSettings, settings)) {
      if (this.outputDeviceId !== deviceId) {
        const setSinkId = (this.context as AudioContext & { setSinkId?: (sinkId: string) => Promise<void> }).setSinkId;
        if (typeof setSinkId !== "function") throw new DOMException("Context output selection unavailable", "NotSupportedError");
        await setSinkId.call(this.context, deviceId);
      }
      this.outputDeviceId = deviceId;
      return this.contextEffective(settings.renderSizeHint !== "auto" && !("renderQuantumSize" in this.context)
        ? "The browser accepted the request but does not expose the effective render quantum." : null);
    }
    const replacement = await this.createConfiguredContext(settings, deviceId);
    this.releaseContext();
    this.outputSettings = { ...settings };
    this.outputDeviceId = deviceId;
    this.installContext(replacement, settings);
    this.outputNeedsContext = false;
    return this.contextEffective(settings.renderSizeHint !== "auto" && !("renderQuantumSize" in replacement)
      ? "The browser accepted the request but does not expose the effective render quantum." : null);
  }

  private ensureContext(): AudioContext | null {
    if (!this.interacted || !this.canPlay() || typeof window === "undefined") return null;
    try {
      if (!this.context) {
        const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) return null;
        const settings = this.outputSettings;
        const requiresConfiguredContext = settings && (this.outputDeviceId !== ""
          || settings.latencyHint !== "auto" || settings.sampleRate !== null
          || settings.renderSizeHint !== "auto" || settings.channelLayout !== "auto");
        if (this.outputCoordinator && requiresConfiguredContext) {
          if (!this.outputApply) {
            this.outputNeedsContext = true;
            this.outputApply = this.outputCoordinator.retry();
            void this.outputApply.finally(() => { this.outputApply = null; });
          }
          return null;
        }
        const context = new Constructor(settings ? audioContextOptions(settings) : undefined);
        this.installContext(context, settings ?? {
          latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto",
        });
      }
      const context = this.context;
      if (!context) return null;
      if (context.state !== "running") {
        this.cancelSession();
        if (!this.resuming && context.state === "suspended") {
          this.resuming = true;
          // Resume never replays the triggering event or any accumulated events.
          void context.resume().catch(() => undefined).finally(() => { this.resuming = false; });
        }
        return null;
      }
      return context;
    } catch {
      this.releaseContext();
      return null;
    }
  }

  play(cue: SoundCue): boolean {
    const context = this.ensureContext();
    if (!context) return false;
    const event = { cue, at: Date.now(), generation: this.generation };
    if (this.timer !== null) {
      if (!this.pending || SOUND_CUES[cue].local || !SOUND_CUES[this.pending.cue].local) this.pending = event;
      return true;
    }
    if (!SOUND_CUES[cue].local && event.at - this.lastRemoteAt < SOUND_REMOTE_COALESCE_MS) {
      this.pending = event;
      this.timer = setTimeout(() => this.finishCue(), SOUND_REMOTE_COALESCE_MS - (event.at - this.lastRemoteAt));
      return true;
    }
    return this.startCue(event, context);
  }

  private startCue(event: PendingCue, context: AudioContext): boolean {
    if (!this.canPlay() || context.state !== "running" || event.generation !== this.generation || Date.now() - event.at > SOUND_EVENT_EXPIRY_MS) return false;
    const cue: Cue = SOUND_CUES[event.cue];
    if (!cue.local) this.lastRemoteAt = Date.now();
    try {
      const now = context.currentTime;
      for (const note of cue.notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const nodes = { oscillator, envelope, start: now + note.offset };
        this.nodes.add(nodes);
        oscillator.onended = () => this.disconnectTone(nodes);
        oscillator.type = cue.wave;
        const start = now + note.offset;
        oscillator.frequency.setValueAtTime(note.hz, start);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(cue.peak, start + SOUND_ATTACK_SECONDS);
        envelope.gain.setValueAtTime(cue.peak, start + note.duration * .4);
        envelope.gain.linearRampToValueAtTime(0, start + note.duration);
        oscillator.connect(envelope);
        envelope.connect(this.category!);
        oscillator.start(start);
        oscillator.stop(start + note.duration);
      }
      const duration = Math.max(...cue.notes.map((note) => note.offset + note.duration));
      this.timer = setTimeout(() => this.finishCue(), duration * 1000 + 1);
      return true;
    } catch {
      this.cancelSession();
      return false;
    }
  }

  private finishCue() {
    this.timer = null;
    this.stopTones();
    const pending = this.pending;
    this.pending = null;
    if (!pending || !this.context) return;
    // Browser timer delays can only discard stale cues, never extend their life.
    if (Date.now() - pending.at > SOUND_EVENT_EXPIRY_MS || pending.generation !== this.generation) return;
    const wait = !SOUND_CUES[pending.cue].local ? SOUND_REMOTE_COALESCE_MS - (Date.now() - this.lastRemoteAt) : 0;
    if (wait > 0 && this.canPlay() && this.context.state === "running") {
      this.pending = pending;
      this.timer = setTimeout(() => this.finishCue(), wait);
    } else this.startCue(pending, this.context);
  }

  private disconnectTone(nodes: ToneNodes) {
    nodes.oscillator.onended = null;
    nodes.oscillator.disconnect();
    nodes.envelope.disconnect();
    this.nodes.delete(nodes);
  }

  private stopTones() {
    for (const nodes of this.nodes) {
      try { nodes.oscillator.stop(); } catch { /* Already ended. */ }
      this.disconnectTone(nodes);
    }
  }

  cancelSession(fade = false) {
    this.generation++;
    this.pending = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (fade && this.context?.state === "running" && this.nodes.size) {
      // Bound retirement to 10ms; future internal notes are stopped before start.
      for (const nodes of this.nodes) {
        try { nodes.oscillator.stop(nodes.start > this.context.currentTime ? this.context.currentTime : this.context.currentTime + SOUND_VOLUME_RAMP_SECONDS); } catch { /* Ended. */ }
      }
      this.timer = setTimeout(() => this.finishCue(), SOUND_VOLUME_RAMP_SECONDS * 1000 + 1);
    } else this.stopTones();
  }

  private releaseContext() {
    this.cancelSession();
    const context = this.context;
    this.context = null;
    this.category?.disconnect();
    this.category = null;
    this.outputGate?.disconnect();
    this.outputGate = null;
    if (context) {
      context.removeEventListener("statechange", this.onContextStateChange);
      try { void context.close().catch(() => undefined); } catch { /* Already closed. */ }
    }
  }

  dispose() {
    this.disposed = true;
    this.unregisterOutput?.();
    this.unregisterOutput = null;
    this.releaseContext();
  }
}

let owner: VoiceSoundsOwner | null = null;
export function attachVoiceSoundsOwner(next: VoiceSoundsOwner): () => void {
  owner?.dispose();
  owner = next;
  return () => { if (owner === next) owner = null; next.dispose(); };
}
function forAccount(accountId?: string) { return accountId && owner?.accountId === accountId ? owner : null; }
export function markUserInteracted(accountId?: string) { forAccount(accountId)?.markInteracted(); }
export function isVoiceSoundsEnabled(accountId?: string) { return forAccount(accountId)?.enabled ?? false; }
export function setVoiceSoundsEnabled(enabled: boolean, accountId?: string) { forAccount(accountId)?.updateEnabled(enabled); }
export function cancelVoiceSoundSession(accountId?: string) { forAccount(accountId)?.cancelSession(); }
export function testVoiceSound() { owner?.markInteracted(); return owner?.play("join") ?? false; }
export function playJoinSound(accountId?: string) { forAccount(accountId)?.play("join"); }
export function playLeaveSound(accountId?: string) { forAccount(accountId)?.play("leave"); }
export function playMuteSound(accountId?: string) { forAccount(accountId)?.play("mute"); }
export function playUnmuteSound(accountId?: string) { forAccount(accountId)?.play("unmute"); }
export function playDeafenSound(accountId?: string) { forAccount(accountId)?.play("deafen"); }
export function playUndeafenSound(accountId?: string) { forAccount(accountId)?.play("undeafen"); }
export function playUserJoinedSound(accountId?: string) { forAccount(accountId)?.play("userJoined"); }
export function playUserLeftSound(accountId?: string) { forAccount(accountId)?.play("userLeft"); }
export function playScreenShareStartedSound(accountId?: string) { forAccount(accountId)?.play("screenShareStarted"); }
export function playScreenViewerJoinedSound(accountId?: string) { forAccount(accountId)?.play("screenViewerJoined"); }
export function playScreenViewerLeftSound(accountId?: string) { forAccount(accountId)?.play("screenViewerLeft"); }
