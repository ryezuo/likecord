import { DEFAULT_CAPTURE_PREFERENCES, normalizeCapturePreferences, type CapturePreferences, type NoiseSuppressionMode } from "@likecord/shared/capture-preferences";
import { RnnoiseRuntimeOwner, type RnnoiseLease } from "./rnnoiseRuntime";
import { CallTransportOwner, type CallTransportState } from "./callTransport";
import { CallSenderRegistry, type CallCaptureTrack } from "./callSenders";
import { LocalInputProfile, acquisitionConstraints, desiredConstraints, observeNativeCapture, validateNativeIntent, nativeIntentReported, verifyRnnoiseNativeIsolation, isSuppressionConstraintRejection, type CaptureFormatIntent, type NativeEvidence } from "./nativeCapture";

export const CAPTURE_WORKLET_URL = "/audio/capture.v1.js";
export const MIC_TEST_TIMEOUT_MS = 30000;
export interface CaptureMeter { dbfs: number; gateOpen: boolean; speaking: boolean; at: number }
export interface VoiceCaptureState {
  mode: "idle" | "test" | "call";
  status: "idle" | "applying" | "ready" | "failed";
  error: string | null;
  evidence: NativeEvidence | null;
  meter: CaptureMeter | null;
  deviceId: string;
  effectiveDeviceId: string | null;
  processedFormat: { sampleRate: number; channels: number } | null;
  devices: Array<{ deviceId: string; label: string }>;
  format: CaptureFormatIntent;
  storage: "local" | "memory";
  transmitting: boolean;
  suppression: { requested: NoiseSuppressionMode; effective: NoiseSuppressionMode | null; nativeDisabled: "confirmed" | "limited" | "unknown"; sessionBrowser: boolean };
  transport: CallTransportState;
}

class CaptureGeneration implements CallCaptureTrack {
  readonly track: MediaStreamTrack;
  readonly stream: MediaStream;
  private revision = 0;
  private disposed = false;
  private disposal: Promise<void> | null = null;
  private failed = false;
  private pending: { revision: number; resolve: (ready: boolean) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private opening: Promise<void> | null = null;
  ready = false;
  private readonly onEnded = () => this.fail();
  private readonly onContextState = () => { if (this.context.state !== "running") this.fail(); };

  constructor(
    readonly generation: number,
    readonly raw: MediaStream,
    readonly context: AudioContext,
    readonly channels: number,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly processor: AudioWorkletNode,
    private readonly destination: MediaStreamAudioDestinationNode,
    private readonly current: () => boolean,
    private readonly allowed: () => boolean,
    private readonly onMeter: (meter: CaptureMeter) => void,
    private readonly onFailure: () => void,
    readonly suppressionMode: NoiseSuppressionMode,
    readonly capturedChannels: number,
    private readonly rnnoiseLease: RnnoiseLease | null,
    private readonly meterAllowed: () => boolean,
  ) {
    this.stream = destination.stream;
    this.track = this.stream.getAudioTracks()[0];
    if (!this.track) throw new Error("Capture output unavailable");
    this.track.enabled = false;
    processor.port.onmessage = ({ data }) => {
      if (this.disposed) return;
      if (!this.current()) { this.block(); return; }
      if (data?.type === "failure") { this.fail(); return; }
      if (data?.type === "reset" && this.pending?.revision === data.revision && this.revision === data.revision) {
        const pending = this.pending!; this.pending = null;
        clearTimeout(pending.timer);
        pending.resolve(!this.failed && this.context.state === "running" && this.raw.getAudioTracks().every((t) => t.readyState === "live"));
      }
      if (data?.type === "meter" && data.revision === this.revision && !this.failed && Number.isFinite(data.dbfs)) {
        this.onMeter({ dbfs: data.dbfs, gateOpen: data.gateOpen === true,
          speaking: data.speaking === true && this.track.enabled && this.allowed(), at: Date.now() });
      }
    };
    processor.onprocessorerror = () => this.fail();
    raw.getAudioTracks().forEach((track) => track.addEventListener("ended", this.onEnded));
    context.addEventListener("statechange", this.onContextState);
  }

  configure(preferences: CapturePreferences) {
    this.processor.port.postMessage({ type: "configure", revision: this.revision, preferences });
  }

  block() {
    this.track.enabled = false; // Controller barrier precedes asynchronous processor cleanup.
    const revision = ++this.revision;
    if (this.pending) {
      clearTimeout(this.pending.timer); this.pending.resolve(false); this.pending = null;
    }
    this.processor.port.postMessage({ type: "block", revision });
  }

  async reset(): Promise<boolean> {
    this.block();
    if (this.disposed || this.failed || !this.current() || this.context.state !== "running") return false;
    const revision = this.revision;
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending?.revision !== revision) return;
        this.pending = null; resolve(false); this.fail();
      }, 3000);
      this.pending = { revision, resolve, timer };
      this.processor.port.postMessage({ type: "reset", revision });
    });
  }

  reconcile() {
    if (!this.allowed() || !this.ready || this.failed || !this.current()) {
      this.block();
      if (this.rnnoiseLease && this.ready && !this.failed && this.current() && this.meterAllowed()) void this.reset();
      return;
    }
    if (this.track.enabled || this.opening) return;
    this.opening = (async () => {
      if (await this.reset()) {
        if (this.allowed() && this.current() && this.ready && !this.failed && this.context.state === "running") {
          this.processor.port.postMessage({ type: "allow", revision: this.revision });
          this.track.enabled = true;
        }
      }
    })().finally(() => {
      this.opening = null;
      if (!this.track.enabled && this.allowed() && this.ready && !this.failed && !this.disposed) this.reconcile();
    });
  }

  fail() {
    if (this.disposed || this.failed) return;
    this.failed = true; this.ready = false; this.block(); this.onFailure();
  }

  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.block(); this.disposed = true; this.ready = false;
    this.context.removeEventListener("statechange", this.onContextState);
    this.raw.getTracks().forEach((track) => { track.removeEventListener("ended", this.onEnded); track.stop(); });
    this.stream.getTracks().forEach((track) => track.stop());
    this.processor.port.onmessage = null;
    this.processor.onprocessorerror = null;
    this.source.disconnect();
    if (this.rnnoiseLease) {
      this.disposal = this.rnnoiseLease.release(this.failed).finally(() => { this.processor.disconnect(); this.destination.disconnect(); });
    } else {
      this.processor.port.close(); this.processor.disconnect(); this.destination.disconnect();
      this.disposal = this.context.close().catch(() => undefined);
    }
    return this.disposal;
  }
}

/** Account-owned capture coordinator. Construction and observation acquire no media. */
export class VoiceCaptureOwner {
  readonly senders: CallSenderRegistry;
  readonly transport: CallTransportOwner;
  readonly profile: LocalInputProfile;
  private preferences: CapturePreferences = { ...DEFAULT_CAPTURE_PREFERENCES };
  private sessionBrowser = false;
  private known = false;
  private committed: CaptureGeneration | null = null;
  private candidates = new Set<CaptureGeneration>();
  private mode: VoiceCaptureState["mode"] = "idle";
  private status: VoiceCaptureState["status"] = "idle";
  private error: string | null = null;
  private evidence: NativeEvidence | null = null;
  private devices: VoiceCaptureState["devices"] = [];
  private effectiveDeviceId: string | null = null;
  private meter: CaptureMeter | null = null;
  private callCurrent: () => boolean = () => false;
  private permit = false;
  private transition = false;
  private request = 0;
  private generation = 0;
  private session = 0;
  private testTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private commitQueue: Promise<void> = Promise.resolve();
  private appliedConstraints: MediaTrackConstraints = {};
  private disposed = false;
  private onCommitted: ((stream: MediaStream) => void) | null = null;
  private readonly rnnoise: RnnoiseRuntimeOwner;
  private rnPrepareQueue: Promise<void> = Promise.resolve();

  constructor(accountId: string, private readonly accountCurrent: () => boolean) {
    this.profile = new LocalInputProfile(accountId, () => this.current());
    this.rnnoise = new RnnoiseRuntimeOwner(() => this.current());
    this.transport = new CallTransportOwner(accountId, () => this.current(), () => this.mode === "call" && this.callCurrent());
    this.senders = new CallSenderRegistry(this.transport);
    this.transport.subscribe(() => this.emit());
  }
  private current() { return !this.disposed && this.accountCurrent(); }
  private processingPreferences(): CapturePreferences { return this.sessionBrowser ? { ...this.preferences, noiseSuppressionMode: "BROWSER" } : this.preferences; }
  private validSession() { return this.current() && (this.mode === "test" || (this.mode === "call" && this.callCurrent())); }
  private allowed() { return this.validSession() && this.mode === "call" && this.permit && this.known && !this.transition; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { this.listeners.forEach((listener) => listener()); }
  snapshot(): VoiceCaptureState {
    const native = this.evidence ? [this.evidence.noiseSuppression.reported, this.evidence.voiceIsolation.reported] : [];
    return { mode: this.mode, status: this.status, error: this.error, evidence: this.evidence,
      meter: this.meter, devices: this.devices, deviceId: this.profile.value.deviceId,
      effectiveDeviceId: this.effectiveDeviceId,
      processedFormat: this.committed ? { sampleRate: this.committed.context.sampleRate, channels: this.committed.channels } : null,
      format: this.profile.format(), storage: this.profile.storage, transmitting: this.committed?.track.enabled === true && this.allowed(),
      transport: this.transport.snapshot(), suppression: { requested: this.preferences.noiseSuppressionMode, effective: this.committed?.ready ? this.committed.suppressionMode : null,
        sessionBrowser: this.sessionBrowser,
        nativeDisabled: native.some(v => v === true) ? "limited" : native.length === 2 && native.every(v => v === false) ? "confirmed" : "unknown" } };
  }

  configure(known: boolean, value: CapturePreferences) {
    if (!this.current()) { this.stop(); return; }
    this.known = known;
    const preferences = normalizeCapturePreferences(value);
    const modeChanged = preferences.noiseSuppressionMode !== this.preferences.noiseSuppressionMode;
    const before = desiredConstraints(this.processingPreferences(), this.profile.value.deviceId, this.profile.format(), this.evidence ?? undefined);
    if (modeChanged) this.sessionBrowser = false;
    const after = desiredConstraints(this.sessionBrowser ? { ...preferences, noiseSuppressionMode: "BROWSER" } : preferences, this.profile.value.deviceId, this.profile.format(), this.evidence ?? undefined);
    const dspChanged = preferences.inputGainPercent !== this.preferences.inputGainPercent
      || preferences.voiceActivationEnabled !== this.preferences.voiceActivationEnabled
      || preferences.voiceActivationThresholdDbfs !== this.preferences.voiceActivationThresholdDbfs;
    this.preferences = preferences;
    if (!known) { this.block(); return; }
    if (modeChanged && this.mode !== "idle") { void this.acquire(); return; }
    if (dspChanged) {
      this.committed?.configure(preferences);
      this.candidates.forEach((candidate) => candidate.configure(preferences));
    }
    if (this.committed && JSON.stringify(before) !== JSON.stringify(after)) void this.applyNative();
  }

  setTransmission(permit: boolean) {
    const changed = this.permit !== permit;
    this.permit = permit;
    if (!permit || !this.allowed()) {
      if (changed || this.committed?.track.enabled) this.block();
      if (changed && this.committed?.suppressionMode === "RNNOISE" && this.committed.ready && this.validSession() && this.known && !this.transition) void this.committed.reset();
    }
    else this.committed?.reconcile();
  }
  block() {
    this.committed?.block();
    this.candidates.forEach((candidate) => candidate.block());
    if (this.meter?.speaking) this.meter = { ...this.meter, speaking: false };
    this.emit();
  }

  async startCall(current: () => boolean, onCommitted: (stream: MediaStream) => void): Promise<MediaStream> {
    this.stop();
    this.mode = "call"; this.callCurrent = current; this.onCommitted = onCommitted;
    if (!await this.acquire()) throw new Error(this.error ?? "A captura de voz não está disponível.");
    return this.committed!.stream;
  }
  async startTest() {
    if (this.mode === "call") return; // Existing meter, never a second microphone.
    this.stop(); this.mode = "test";
    this.testTimer = setTimeout(() => this.stopTest(), MIC_TEST_TIMEOUT_MS);
    await this.acquire();
  }
  stopTest() { if (this.mode === "test") this.stop(); }

  async chooseDevice(deviceId: string) {
    if (!this.current() || !this.known) return;
    this.profile.update(deviceId); this.emit();
    if (this.mode !== "idle") await this.acquire();
  }
  async updateFormat(format: CaptureFormatIntent) {
    if (!this.current() || !this.known) return;
    const channelsChanged = this.profile.format().channelCount !== format.channelCount;
    this.profile.update(this.profile.value.deviceId, format); this.emit();
    if (this.mode !== "idle") {
      if (channelsChanged) await this.acquire();
      else await this.applyNative();
    }
  }
  async retry() {
    this.sessionBrowser = false;
    if (this.mode !== "idle") await this.acquire();
  }

  async useBrowserForSession() {
    if (!this.current() || !this.known || this.preferences.noiseSuppressionMode !== "RNNOISE") return;
    if (this.mode === "idle") {
      // Explicit recovery from a failed cold test starts the same bounded test.
      this.stop(); this.mode = "test";
      this.testTimer = setTimeout(() => this.stopTest(), MIC_TEST_TIMEOUT_MS);
    }
    this.sessionBrowser = true;
    await this.acquire();
  }

  private failed(message: string) { this.status = "failed"; this.error = message; this.emit(); }
  private async prepare(request: number, session: number): Promise<CaptureGeneration> {
    const preferences = this.processingPreferences();
    const current = () => this.validSession() && this.session === session;
    if (!current() || !this.known || !navigator.mediaDevices?.getUserMedia || !window.AudioContext || typeof AudioWorkletNode === "undefined") throw new Error("Captura protegida indisponível. Carregue as preferências e tente novamente.");
    const constraints = acquisitionConstraints(preferences, this.profile.value.deviceId, this.profile.format());
    const raw = await navigator.mediaDevices.getUserMedia({ audio: Object.keys(constraints).length ? constraints : true });
    let context: AudioContext | null = null;
    let rnnoiseLease: RnnoiseLease | null = null;
    try {
      if (!current() || request !== this.request) throw new Error("Captura substituída.");
      const track = raw.getAudioTracks()[0];
      if (!track || track.readyState !== "live") throw new Error("O microfone não está disponível.");
      let evidence = observeNativeCapture(track);
      // Validate saved required choices; source-selection ideals may truthfully be limited.
      validateNativeIntent(desiredConstraints(preferences, this.profile.value.deviceId, this.profile.format()), evidence);
      const suppressed = desiredConstraints(preferences, this.profile.value.deviceId, this.profile.format(), evidence);
      if (JSON.stringify(suppressed) !== JSON.stringify(constraints) && !nativeIntentReported(suppressed, evidence)) {
        validateNativeIntent(suppressed, evidence);
        try { await track.applyConstraints(suppressed); }
        catch (error) {
          // Off is best-effort suppression control, still through the protected DSP.
          // A refused constraint leaves the acquisition configuration intact.
          if (preferences.noiseSuppressionMode !== "OFF" || !isSuppressionConstraintRejection(error)) throw error;
        }
        if (!current() || request !== this.request) throw new Error("Captura substituída.");
        evidence = observeNativeCapture(track);
      }
      const capturedChannels = track.getSettings?.().channelCount ?? 2;
      if (!Number.isInteger(capturedChannels) || capturedChannels < 1 || capturedChannels > 32) throw new Error("Formato de captura não suportado pelo grafo.");
      const suppressionMode = preferences.noiseSuppressionMode;
      const useRnnoise = suppressionMode === "RNNOISE";
      if (useRnnoise) verifyRnnoiseNativeIsolation(evidence);
      if (useRnnoise && ![1,2,4,6].includes(capturedChannels)) throw new Error("Conversão mono RNNoise indisponível neste formato.");
      const channels = useRnnoise ? 1 : capturedChannels;
      if (useRnnoise) rnnoiseLease = await this.rnnoise.acquire(() => current() && request === this.request);
      context = rnnoiseLease?.context ?? new AudioContext();
      if (!context.audioWorklet) throw new Error("O navegador não oferece processamento de captura protegido.");
      if (!useRnnoise) await context.audioWorklet.addModule(CAPTURE_WORKLET_URL);
      if (!current() || request !== this.request) throw new Error("Captura substituída.");
      const source = context.createMediaStreamSource(raw);
      const destination = context.createMediaStreamDestination();
      destination.channelCount = channels;
      destination.channelCountMode = "explicit";
      destination.channelInterpretation = "discrete";
      destination.stream.getAudioTracks().forEach((output) => { output.enabled = false; });
      const processor = rnnoiseLease?.processor ?? new AudioWorkletNode(context, "likecord-capture-v1", {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [channels], channelCount: channels,
        channelCountMode: "explicit", channelInterpretation: "discrete", processorOptions: { channels },
      });
      const candidate: CaptureGeneration = new CaptureGeneration(++this.generation, raw, context, channels, source, processor, destination, current,
        () => this.committed === candidate && this.allowed(),
        (meter) => { if (this.committed === candidate) { this.meter = meter; this.emit(); } },
        () => {
          if (this.committed === candidate) {
            this.block(); this.meter = null;
            if (candidate.suppressionMode === "RNNOISE") {
              void candidate.dispose();
            }
            this.failed("Captura interrompida. A transmissão está silenciosa. Tente novamente.");
            if (this.mode === "test") this.stopTest();
          }
        }, suppressionMode, capturedChannels, rnnoiseLease,
        () => this.committed === candidate && this.validSession() && this.known && !this.transition);
      this.candidates.add(candidate);
      candidate.configure(this.preferences);
      source.connect(processor); processor.connect(destination);
      // Explicit test/join/device action is the only path that can resume capture.
      await context.resume();
      if (!await candidate.reset() || !current() || request !== this.request) {
        this.candidates.delete(candidate); await candidate.dispose(); throw new Error("Captura não ficou pronta.");
      }
      candidate.ready = true;
      return candidate;
    } catch (error) {
      for (const candidate of this.candidates) {
        if (candidate.raw === raw) { this.candidates.delete(candidate); await candidate.dispose(); }
      }
      raw.getTracks().forEach((track) => track.stop());
      if (rnnoiseLease) await rnnoiseLease.release();
      else if (context) await context.close().catch(() => undefined);
      throw error;
    }
  }

  private async acquire(): Promise<boolean> {
    const request = ++this.request;
    const session = this.session;
    this.status = "applying"; this.error = null; this.emit();
    let candidate: CaptureGeneration | null = null;
    const strictTransition = this.processingPreferences().noiseSuppressionMode === "RNNOISE" || this.committed?.suppressionMode === "RNNOISE";
    if (strictTransition) { this.transition = true; this.block(); }
    try {
      const prepare = async () => {
        if (request !== this.request || session !== this.session || !this.validSession()) throw new Error("Captura substituída.");
        if (strictTransition) {
          if (this.committed) await this.committed.dispose();
          for (const previous of this.candidates) { await previous.dispose(); this.candidates.delete(previous); }
        }
        return this.prepare(request, session);
      };
      if (strictTransition) {
        const queued = this.rnPrepareQueue.then(prepare, prepare);
        this.rnPrepareQueue = queued.then(() => undefined, () => undefined);
        candidate = await queued;
      } else candidate = await prepare();
      let success = false;
      const prepared = candidate;
      const commit = async () => {
        const current = () => request === this.request && session === this.session && this.validSession();
        if (!current()) return;
        const old = this.committed;
        this.transition = true; this.block();
        const result = old ? await this.senders.replace(prepared, current) : "committed";
        if (!current()) return;
        if (result === "committed") {
          const preparedEvidence = observeNativeCapture(prepared.raw.getAudioTracks()[0]);
          if (prepared.suppressionMode === "RNNOISE") verifyRnnoiseNativeIsolation(preparedEvidence);
          this.committed = prepared; this.candidates.delete(prepared);
          this.senders.publish(prepared);
          this.evidence = preparedEvidence;
          this.effectiveDeviceId = prepared.raw.getAudioTracks()[0].getSettings().deviceId ?? null;
          this.appliedConstraints = prepared.raw.getAudioTracks()[0].getConstraints();
          this.meter = null; this.transition = false; this.status = "ready"; this.error = null;
          this.onCommitted?.(prepared.stream);
          prepared.reconcile(); old?.dispose(); success = true;
          await this.refreshDevices(); this.emit();
        } else if (result === "compensated" && !strictTransition) {
          this.transition = false; old?.reconcile();
          this.failed("A troca falhou. Todos os peers voltaram à captura anterior; a escolha solicitada foi mantida.");
        } else {
          this.failed("A troca não convergiu. A transmissão permanece silenciosa. Tente novamente.");
        }
      };
      this.commitQueue = this.commitQueue.then(commit, commit);
      await this.commitQueue;
      if (!success) { this.candidates.delete(prepared); prepared.dispose(); }
      return success;
    } catch {
      if (candidate) { this.candidates.delete(candidate); candidate.dispose(); }
      if (request === this.request && session === this.session) {
        this.failed(strictTransition ? "Não foi possível preparar o processamento solicitado. A transmissão permanece silenciosa; tente novamente ou escolha Navegador." : "Não foi possível preparar o microfone solicitado. A intenção foi mantida; a captura anterior continua quando válida.");
        if (!this.committed && this.mode === "test") this.stopTest();
      }
      return false;
    }
  }

  private async applyNative() {
    const session = this.session;
    const desired = desiredConstraints(this.processingPreferences(), this.profile.value.deviceId, this.profile.format(), this.evidence ?? undefined);
    const apply = async () => {
      const graph = this.committed;
      if (!graph || session !== this.session || !this.validSession()) return;
      const current = () => session === this.session && this.committed === graph && this.validSession();
      const track = graph.raw.getAudioTracks()[0];
      const previous = this.appliedConstraints;
      this.transition = true; this.status = "applying"; this.block();
      try {
        validateNativeIntent(desired, observeNativeCapture(track));
        await track.applyConstraints(desired);
        if (!current()) return;
        const channels = track.getSettings().channelCount;
        if (channels !== undefined && channels !== graph.capturedChannels) throw new Error("Capture channel layout changed");
        this.evidence = observeNativeCapture(track);
        if (graph.suppressionMode === "RNNOISE") verifyRnnoiseNativeIsolation(this.evidence);
        this.appliedConstraints = desired;
        if (!await graph.reset() || !current()) throw new Error("Capture reset failed");
        this.transition = false; this.status = "ready"; this.error = null; graph.reconcile(); this.emit();
      } catch {
        if (!current()) return;
        try {
          await track.applyConstraints(previous);
          if (!current() || !await graph.reset()) throw new Error("Recovery unavailable");
          this.evidence = observeNativeCapture(track);
          if (graph.suppressionMode === "RNNOISE") verifyRnnoiseNativeIsolation(this.evidence);
          this.transition = false; graph.reconcile();
          this.failed("O navegador recusou a configuração. A anterior foi restaurada; a intenção solicitada foi mantida.");
        } catch {
          graph.fail(); this.failed("A configuração não pôde ser recuperada. A transmissão permanece silenciosa.");
        }
      }
    };
    this.commitQueue = this.commitQueue.then(apply, apply);
    await this.commitQueue;
  }

  private async refreshDevices() {
    const session = this.session;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (session !== this.session || !this.validSession()) return;
      this.devices = devices.filter((device) => device.kind === "audioinput" && device.deviceId !== "default")
        .map(({ deviceId, label }) => ({ deviceId, label }));
    } catch { /* Enumeration is optional; never acquires permission. */ }
  }

  stop() {
    this.permit = false; this.block();
    this.session++; this.request++;
    this.committed?.dispose(); this.committed = null;
    this.candidates.forEach((candidate) => candidate.dispose()); this.candidates.clear();
    this.senders.clear();
    if (this.testTimer) clearTimeout(this.testTimer);
    this.testTimer = null; this.mode = "idle"; this.status = "idle"; this.sessionBrowser = false;
    this.meter = null; this.transition = false; this.callCurrent = () => false; this.onCommitted = null;
    this.emit();
  }
  dispose() { this.stop(); this.disposed = true; this.rnnoise.dispose(); this.transport.dispose(); this.listeners.clear(); }
}

let activeCapture: VoiceCaptureOwner | null = null;
export function attachVoiceCaptureOwner(owner: VoiceCaptureOwner) {
  activeCapture?.dispose(); activeCapture = owner;
  return () => { if (activeCapture === owner) activeCapture = null; owner.dispose(); };
}
export function getVoiceCaptureOwner() { return activeCapture; }
