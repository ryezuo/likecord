"use client";

import {
  audioContextOptions,
  equalAudioOutputRoleSettings,
  type AudioOutputAdapter,
  type AudioOutputCoordinator,
  type AudioOutputEffectiveState,
  type AudioOutputRoleSettings,
} from "./audioOutput";

export const RECEIVE_GAIN_RAMP_SECONDS = 0.01;
export const RECEIVE_LIMITER_WORKLET_URL = "/audio/receive-peak-limiter.v1.js";
export const RECEIVE_LIMITER_PROCESSOR = "likecord-output-peak-limiter-v1";
export const REMOTE_PLAYOUT_TIMEOUT_MS = 3000;

type Classification =
  | { kind: "pending" }
  | { kind: "call"; targetUserId: string }
  | { kind: "screen"; shareId: string };

type CallPolicy = { volume: number; allowed: boolean };
type ScreenPolicy = { volume: number; allowed: boolean };

interface ReceiveRecord {
  key: string;
  track: MediaStreamTrack;
  stream: MediaStream;
  consumer: HTMLAudioElement;
  generation: number;
  classification: Classification;
  ready: boolean;
  ended: () => void;
}

interface SourceNodes {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  destination: "call" | "screen" | null;
  currentGain: number;
}

interface ReceiveGraph {
  context: AudioContext;
  callBus: GainNode;
  screenBus: GainNode;
  master: GainNode;
  limiter: AudioWorkletNode;
  outputGate: GainNode;
  sources: Map<string, SourceNodes>;
  settings: AudioOutputRoleSettings;
  deviceId: string;
}

type SinkContext = AudioContext & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
  renderQuantumSize?: number;
  outputLatency?: number;
  getOutputTimestamp?: () => { contextTime: number; performanceTime: number };
};

function safeSet(param: AudioParam, value: number, context: BaseAudioContext, immediate: boolean) {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
  else param.setValueAtTime(param.value, now);
  if (immediate) param.setValueAtTime(value, now);
  else param.linearRampToValueAtTime(value, now + RECEIVE_GAIN_RAMP_SECONDS);
}

function applyLayout(node: AudioNode, layout: AudioOutputRoleSettings["channelLayout"]) {
  if (layout === "auto") return;
  node.channelCount = layout === "mono" ? 1 : 2;
  node.channelCountMode = "explicit";
  node.channelInterpretation = "speakers";
}

function effectiveState(graph: ReceiveGraph): AudioOutputEffectiveState {
  const context = graph.context as SinkContext;
  let timestamp: AudioOutputEffectiveState["outputTimestamp"] = null;
  try {
    const observed = context.getOutputTimestamp?.();
    if (typeof observed?.contextTime === "number" && typeof observed.performanceTime === "number") timestamp = {
      contextTime: observed.contextTime, performanceTime: observed.performanceTime,
    };
  } catch { /* Optional observation. */ }
  return {
    sampleRate: Number.isFinite(context.sampleRate) ? context.sampleRate : null,
    renderQuantumSize: Number.isFinite(context.renderQuantumSize) ? context.renderQuantumSize! : null,
    baseLatencyMs: Number.isFinite(context.baseLatency) ? context.baseLatency * 1000 : null,
    outputLatencyMs: Number.isFinite(context.outputLatency) ? context.outputLatency! * 1000 : null,
    outputTimestamp: timestamp,
    channelCount: graph.master.channelCount || null,
    contextState: context.state,
    note: graph.settings.renderSizeHint !== "auto" && !Number.isFinite(context.renderQuantumSize)
      ? "The browser accepted the request but does not expose the effective render quantum."
      : null,
  };
}

export function createMutedPlayoutConsumer(track: MediaStreamTrack): { consumer: HTMLAudioElement; stream: MediaStream } {
  const stream = new MediaStream([track]);
  const consumer = document.createElement("audio");
  consumer.muted = true;
  consumer.volume = 0;
  consumer.autoplay = true;
  consumer.style.display = "none";
  consumer.srcObject = stream;
  return { consumer, stream };
}

async function boundedPlay(consumer: HTMLAudioElement, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      consumer.play(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new DOMException("Remote playout timed out", "TimeoutError")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/** Owns only received CALL and Screen playback. It never receives capture or SFX nodes. */
export class VoicePlaybackOwner {
  private records = new Map<string, ReceiveRecord>();
  private callPolicies = new Map<string, CallPolicy>();
  private screenPolicies = new Map<string, ScreenPolicy>();
  private graph: ReceiveGraph | null = null;
  private graphPromise: Promise<ReceiveGraph> | null = null;
  private settings: AudioOutputRoleSettings;
  private deviceId: string;
  private transitionMuted = true;
  private master = { ready: false, percent: 100 };
  private disposed = false;
  private generation = 0;
  private unregister: (() => void) | null = null;

  private readonly adapter: AudioOutputAdapter = {
    id: "voice-receive",
    role: "receive",
    setTransitionMuted: (muted) => this.setTransitionMuted(muted),
    setMaster: (ready, percent) => this.setMaster(ready, percent),
    apply: (settings, deviceId) => this.applyOutput(settings, deviceId),
    dispose: () => this.dispose(),
  };

  constructor(private readonly coordinator: AudioOutputCoordinator) {
    const profile = coordinator.snapshot().profile;
    this.settings = { ...profile.roles.receive };
    this.deviceId = profile.deviceId;
    this.unregister = coordinator.registerAdapter(this.adapter);
  }

  attachTrack(key: string, track: MediaStreamTrack): { consumer: HTMLAudioElement; ready: Promise<boolean> } {
    this.release(key);
    const { consumer, stream } = createMutedPlayoutConsumer(track);
    const generation = ++this.generation;
    const ended = () => this.release(key);
    track.addEventListener?.("ended", ended, { once: true });
    const record: ReceiveRecord = {
      key, track, stream, consumer, generation, classification: { kind: "pending" }, ready: false, ended,
    };
    this.records.set(key, record);
    const ready = this.prepare(record);
    return { consumer, ready };
  }

  private async prepare(record: ReceiveRecord): Promise<boolean> {
    try {
      await Promise.all([this.ensureGraph(), boundedPlay(record.consumer, REMOTE_PLAYOUT_TIMEOUT_MS)]);
      if (this.disposed || this.records.get(record.key) !== record || record.track.readyState === "ended") {
        this.releaseRecord(record);
        return false;
      }
      record.ready = true;
      this.connectRecord(record);
      return true;
    } catch (error) {
      if (this.records.get(record.key) === record) this.records.delete(record.key);
      this.releaseRecord(record);
      this.coordinator.reportAdapterFailure(this.adapter.id, error);
      return false;
    }
  }

  classifyCall(key: string, targetUserId: string) {
    const record = this.records.get(key);
    if (!record) return;
    if (record.classification.kind !== "call" || record.classification.targetUserId !== targetUserId) this.flushLimiter();
    record.classification = { kind: "call", targetUserId };
    this.connectRecord(record);
  }

  classifyScreen(key: string, shareId: string) {
    const record = this.records.get(key);
    if (!record) return;
    if (record.classification.kind !== "screen" || record.classification.shareId !== shareId) this.flushLimiter();
    record.classification = { kind: "screen", shareId };
    this.connectRecord(record);
  }

  keepPending(key: string) {
    const record = this.records.get(key);
    if (!record) return;
    if (record.classification.kind !== "pending") this.flushLimiter();
    record.classification = { kind: "pending" };
    this.connectRecord(record);
  }

  setCallPolicy(targetUserId: string, policy: CallPolicy) {
    this.callPolicies.set(targetUserId, { volume: Math.max(0, Math.min(1, policy.volume)), allowed: policy.allowed });
    for (const record of this.records.values()) {
      if (record.classification.kind === "call" && record.classification.targetUserId === targetUserId) this.applyRecordGain(record);
    }
  }

  setAllCallsAllowed(allowed: boolean) {
    for (const [targetUserId, policy] of this.callPolicies) this.setCallPolicy(targetUserId, { ...policy, allowed });
  }

  setScreenPolicy(shareId: string, policy: ScreenPolicy) {
    this.screenPolicies.set(shareId, { volume: Math.max(0, Math.min(1, policy.volume)), allowed: policy.allowed });
    for (const record of this.records.values()) {
      if (record.classification.kind === "screen" && record.classification.shareId === shareId) this.applyRecordGain(record);
    }
  }

  clearScreenPolicy(shareId: string) {
    this.screenPolicies.delete(shareId);
    for (const record of this.records.values()) {
      if (record.classification.kind === "screen" && record.classification.shareId === shareId) this.applyRecordGain(record);
    }
  }

  release(key: string) {
    const record = this.records.get(key);
    if (!record) return;
    this.records.delete(key);
    this.releaseRecord(record);
  }

  releaseTarget(targetUserId: string) {
    for (const record of [...this.records.values()]) {
      if (record.classification.kind === "call" && record.classification.targetUserId === targetUserId) this.release(record.key);
    }
    this.callPolicies.delete(targetUserId);
  }

  releaseShare(shareId: string) {
    for (const record of [...this.records.values()]) {
      if (record.classification.kind === "screen" && record.classification.shareId === shareId) this.release(record.key);
    }
    this.screenPolicies.delete(shareId);
  }

  private releaseRecord(record: ReceiveRecord) {
    this.flushLimiter();
    record.track.removeEventListener?.("ended", record.ended);
    const nodes = this.graph?.sources.get(record.key);
    if (nodes) {
      safeSet(nodes.gain.gain, 0, this.graph!.context, true);
      nodes.source.disconnect();
      nodes.gain.disconnect();
      this.graph!.sources.delete(record.key);
    }
    record.consumer.pause();
    record.consumer.srcObject = null;
    record.consumer.remove();
  }

  private connectRecord(record: ReceiveRecord) {
    const graph = this.graph;
    if (!graph || !record.ready) return;
    let nodes = graph.sources.get(record.key);
    if (!nodes) {
      const source = graph.context.createMediaStreamSource(record.stream);
      const gain = graph.context.createGain();
      gain.gain.setValueAtTime(0, graph.context.currentTime);
      source.connect(gain);
      nodes = { source, gain, destination: null, currentGain: 0 };
      graph.sources.set(record.key, nodes);
    }
    nodes.gain.disconnect();
    nodes.destination = null;
    if (record.classification.kind === "call") {
      nodes.gain.connect(graph.callBus);
      nodes.destination = "call";
    } else if (record.classification.kind === "screen") {
      nodes.gain.connect(graph.screenBus);
      nodes.destination = "screen";
    }
    this.applyRecordGain(record);
  }

  private applyRecordGain(record: ReceiveRecord) {
    const graph = this.graph;
    const nodes = graph?.sources.get(record.key);
    if (!graph || !nodes) return;
    let value = 0;
    let mandatoryMute = true;
    if (record.classification.kind === "call") {
      const policy = this.callPolicies.get(record.classification.targetUserId);
      if (policy) { value = policy.allowed ? policy.volume : 0; mandatoryMute = !policy.allowed; }
    } else if (record.classification.kind === "screen") {
      const policy = this.screenPolicies.get(record.classification.shareId);
      if (policy) { value = policy.allowed ? policy.volume : 0; mandatoryMute = !policy.allowed; }
    }
    if (mandatoryMute || value === 0) this.flushLimiter();
    safeSet(nodes.gain.gain, value, graph.context, mandatoryMute);
    nodes.currentGain = value;
  }

  private setMaster(ready: boolean, percent: number) {
    this.master = { ready, percent };
    if (!this.graph) return;
    const value = ready ? percent / 100 : 0;
    if (!ready || value === 0) this.flushLimiter();
    safeSet(this.graph.master.gain, value, this.graph.context, !ready || value === 0);
  }

  private setTransitionMuted(muted: boolean) {
    this.transitionMuted = muted;
    if (!this.graph) return;
    if (muted) this.flushLimiter();
    safeSet(this.graph.outputGate.gain, muted ? 0 : 1, this.graph.context, muted);
  }

  private flushLimiter() {
    try { this.graph?.limiter.port.postMessage({ type: "flush" }); } catch { /* Disposed worklet. */ }
  }

  private ensureGraph(): Promise<ReceiveGraph> {
    if (this.graph) return Promise.resolve(this.graph);
    if (!this.graphPromise) {
      this.graphPromise = this.initializeGraph().finally(() => { this.graphPromise = null; });
    }
    return this.graphPromise;
  }

  private async initializeGraph() {
    const graph = await this.createGraph(this.settings, this.deviceId);
    if (this.disposed) {
      await graph.context.close().catch(() => undefined);
      throw new DOMException("Playback owner was disposed", "AbortError");
    }
    this.graph = graph;
    this.setMaster(this.master.ready, this.master.percent);
    this.setTransitionMuted(this.transitionMuted);
    for (const record of this.records.values()) this.connectRecord(record);
    this.coordinator.reportAdapterEffective(this.adapter.id, effectiveState(graph));
    return graph;
  }

  private async createGraph(settings: AudioOutputRoleSettings, deviceId: string): Promise<ReceiveGraph> {
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new DOMException("Web Audio unavailable", "NotSupportedError");
    const context = new Constructor(audioContextOptions(settings));
    try {
      if (!context.audioWorklet) throw new DOMException("AudioWorklet unavailable", "NotSupportedError");
      await context.audioWorklet.addModule(RECEIVE_LIMITER_WORKLET_URL);
      if (deviceId) {
        const setSinkId = (context as SinkContext).setSinkId;
        if (typeof setSinkId !== "function") throw new DOMException("Context output selection unavailable", "NotSupportedError");
        await setSinkId.call(context, deviceId);
      }
      const callBus = context.createGain();
      const screenBus = context.createGain();
      const master = context.createGain();
      const limiter = new AudioWorkletNode(context, RECEIVE_LIMITER_PROCESSOR, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [settings.channelLayout === "mono" ? 1 : 2],
      });
      const outputGate = context.createGain();
      applyLayout(callBus, settings.channelLayout);
      applyLayout(screenBus, settings.channelLayout);
      applyLayout(master, settings.channelLayout);
      callBus.connect(master);
      screenBus.connect(master);
      master.connect(limiter);
      limiter.connect(outputGate);
      outputGate.connect(context.destination);
      master.gain.setValueAtTime(0, context.currentTime);
      outputGate.gain.setValueAtTime(0, context.currentTime);
      return { context, callBus, screenBus, master, limiter, outputGate, sources: new Map(), settings: { ...settings }, deviceId };
    } catch (error) {
      await context.close().catch(() => undefined);
      throw error;
    }
  }

  private async applyOutput(settings: AudioOutputRoleSettings, deviceId: string): Promise<AudioOutputEffectiveState> {
    this.settings = { ...settings };
    this.deviceId = deviceId;
    if (!this.graph && this.records.size === 0) {
      return {
        sampleRate: null, renderQuantumSize: null, baseLatencyMs: null, outputLatencyMs: null,
        outputTimestamp: null, channelCount: null, contextState: "unavailable",
        note: "Effective receive values appear when CALL or Screen audio starts.",
      };
    }
    if (!this.graph) return effectiveState(await this.ensureGraph());
    if (equalAudioOutputRoleSettings(this.graph.settings, settings)) {
      if (this.graph.deviceId !== deviceId) {
        const setSinkId = (this.graph.context as SinkContext).setSinkId;
        if (typeof setSinkId !== "function") throw new DOMException("Context output selection unavailable", "NotSupportedError");
        await setSinkId.call(this.graph.context, deviceId);
        this.graph.deviceId = deviceId;
      }
      return effectiveState(this.graph);
    }
    const replacement = await this.createGraph(settings, deviceId);
    const previous = this.graph;
    this.graph = replacement;
    this.setMaster(this.master.ready, this.master.percent);
    this.setTransitionMuted(true);
    for (const record of this.records.values()) this.connectRecord(record);
    this.closeGraph(previous);
    return effectiveState(replacement);
  }

  private closeGraph(graph: ReceiveGraph | null) {
    if (!graph) return;
    try { graph.limiter.port.postMessage({ type: "flush" }); } catch { /* Already closed. */ }
    for (const nodes of graph.sources.values()) {
      nodes.source.disconnect();
      nodes.gain.disconnect();
    }
    graph.callBus.disconnect();
    graph.screenBus.disconnect();
    graph.master.disconnect();
    graph.limiter.disconnect();
    graph.outputGate.disconnect();
    void graph.context.close().catch(() => undefined);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.unregister?.();
    this.unregister = null;
    for (const record of [...this.records.values()]) this.release(record.key);
    this.closeGraph(this.graph);
    this.graph = null;
    this.callPolicies.clear();
    this.screenPolicies.clear();
  }
}
