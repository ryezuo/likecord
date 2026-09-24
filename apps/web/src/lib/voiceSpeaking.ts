export const VOICE_SPEAKING_THRESHOLD = 0.035;
export const VOICE_SPEAKING_RELEASE_MS = 300;
export const VOICE_SPEAKING_FFT_SIZE = 512;

type FrameRequest = (callback: FrameRequestCallback) => number;
type FrameCancel = (handle: number) => void;

interface SpeakingEntry {
  stream: MediaStream;
  track: MediaStreamTrack;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  samples: Float32Array<ArrayBuffer>;
  effectiveMuted: boolean;
  speaking: boolean;
  lastActiveAt: number;
  onEnded: () => void;
}

export interface VoiceSpeakingAnalysisOptions {
  threshold?: number;
  releaseMs?: number;
  createAudioContext?: () => AudioContext | null;
  requestFrame?: FrameRequest;
  cancelFrame?: FrameCancel;
}

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function createBrowserAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext
    || (window as WebkitAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return new AudioContextConstructor();
}

function requestBrowserFrame(callback: FrameRequestCallback): number {
  return window.requestAnimationFrame(callback);
}

function cancelBrowserFrame(handle: number): void {
  window.cancelAnimationFrame(handle);
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

/**
 * Call-scoped, side-band activity analysis for existing Voice microphone media.
 * It owns one AudioContext and one animation-frame loop for every participant,
 * and never connects its analyser graph to an audible destination.
 */
export class VoiceSpeakingAnalysis {
  private readonly threshold: number;
  private readonly releaseMs: number;
  private readonly createAudioContext: () => AudioContext | null;
  private readonly requestFrame: FrameRequest;
  private readonly cancelFrame: FrameCancel;
  private readonly entries = new Map<string, SpeakingEntry>();
  private context: AudioContext | null = null;
  private frameHandle: number | null = null;
  private lastPublished: string[] = [];

  constructor(
    private readonly onSpeakingChange: (userIds: string[]) => void,
    options: VoiceSpeakingAnalysisOptions = {},
  ) {
    this.threshold = options.threshold ?? VOICE_SPEAKING_THRESHOLD;
    this.releaseMs = options.releaseMs ?? VOICE_SPEAKING_RELEASE_MS;
    this.createAudioContext = options.createAudioContext ?? createBrowserAudioContext;
    this.requestFrame = options.requestFrame ?? requestBrowserFrame;
    this.cancelFrame = options.cancelFrame ?? cancelBrowserFrame;
  }

  attach(userId: string, stream: MediaStream, track: MediaStreamTrack, effectiveMuted: boolean): boolean {
    if (!userId || track.kind !== "audio" || track.readyState === "ended") return false;
    const current = this.entries.get(userId);
    if (current?.stream === stream && current.track === track) {
      this.setEffectiveMuted(userId, effectiveMuted);
      return true;
    }

    if (current) this.detach(userId);
    const context = this.ensureContext();
    if (!context) return false;

    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    try {
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = VOICE_SPEAKING_FFT_SIZE;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      const onEnded = () => this.detach(userId, track);
      if (typeof track.addEventListener === "function") track.addEventListener("ended", onEnded);
      this.entries.set(userId, {
        stream,
        track,
        source,
        analyser,
        samples: new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT)),
        effectiveMuted,
        speaking: false,
        lastActiveAt: Number.NEGATIVE_INFINITY,
        onEnded,
      });
      this.schedule();
      return true;
    } catch {
      try { source?.disconnect(); } catch { /* incomplete graph */ }
      try { analyser?.disconnect(); } catch { /* incomplete graph */ }
      return false;
    }
  }

  setEffectiveMuted(userId: string, effectiveMuted: boolean): void {
    const entry = this.entries.get(userId);
    if (!entry) return;
    entry.effectiveMuted = effectiveMuted;
    if (effectiveMuted && entry.speaking) {
      entry.speaking = false;
      entry.lastActiveAt = Number.NEGATIVE_INFINITY;
      this.publishIfChanged();
    }
  }

  detach(userId: string, expectedTrack?: MediaStreamTrack): void {
    const entry = this.entries.get(userId);
    if (!entry || (expectedTrack && entry.track !== expectedTrack)) return;
    if (typeof entry.track.removeEventListener === "function") {
      entry.track.removeEventListener("ended", entry.onEnded);
    }
    try { entry.source.disconnect(); } catch { /* already disconnected */ }
    try { entry.analyser.disconnect(); } catch { /* already disconnected */ }
    this.entries.delete(userId);
    if (this.entries.size === 0 && this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.publishIfChanged();
  }

  dispose(): void {
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    for (const entry of this.entries.values()) {
      if (typeof entry.track.removeEventListener === "function") {
        entry.track.removeEventListener("ended", entry.onEnded);
      }
      try { entry.source.disconnect(); } catch { /* already disconnected */ }
      try { entry.analyser.disconnect(); } catch { /* already disconnected */ }
    }
    this.entries.clear();
    this.publishIfChanged();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") {
      try { void context.close().catch(() => {}); } catch { /* already closed */ }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      this.context = this.createAudioContext();
      if (this.context?.state === "suspended") {
        void this.context.resume().catch(() => {});
      }
      return this.context;
    } catch {
      this.context = null;
      return null;
    }
  }

  private schedule(): void {
    if (this.entries.size === 0 || this.frameHandle !== null) return;
    this.frameHandle = this.requestFrame((timestamp) => this.sample(timestamp));
  }

  private sample(timestamp: number): void {
    this.frameHandle = null;
    let changed = false;

    for (const [userId, entry] of this.entries) {
      if (entry.track.readyState === "ended") {
        this.detach(userId, entry.track);
        continue;
      }

      const unavailable = entry.effectiveMuted || !entry.track.enabled;
      let active = false;
      if (!unavailable) {
        try {
          entry.analyser.getFloatTimeDomainData(entry.samples);
          let energy = 0;
          for (const sample of entry.samples) energy += sample * sample;
          active = Math.sqrt(energy / entry.samples.length) >= this.threshold;
        } catch {
          active = false;
        }
      }

      if (active) {
        entry.lastActiveAt = timestamp;
        if (!entry.speaking) {
          entry.speaking = true;
          changed = true;
        }
      } else if (entry.speaking && (unavailable || timestamp - entry.lastActiveAt >= this.releaseMs)) {
        entry.speaking = false;
        changed = true;
      }
    }

    if (changed) this.publishIfChanged();
    this.schedule();
  }

  private publishIfChanged(): void {
    const speaking = [...this.entries]
      .filter(([, entry]) => entry.speaking)
      .map(([userId]) => userId)
      .sort();
    if (sameIds(speaking, this.lastPublished)) return;
    this.lastPublished = speaking;
    this.onSpeakingChange(speaking);
  }
}
