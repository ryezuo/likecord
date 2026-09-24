/** Browser graph doubles for capture integration tests. */
export function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export async function settle() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
export class CaptureTestTrack extends EventTarget {
  kind = "audio"; enabled = true; readyState = "live"; id = "track-alias";
  constraints: MediaTrackConstraints = {};
  capabilities = { echoCancellation: [true, false, "all", "remote-only"], noiseSuppression: [true, false], autoGainControl: [true, false], voiceIsolation: [true, false], channelCount: { min: 1, max: 2 }, sampleRate: { min: 16000, max: 96000 }, sampleSize: { min: 16, max: 32 }, latency: { min: 0, max: 0.1 } };
  settings = { channelCount: 1, sampleRate: 48000, autoGainControl: true };
  stop = jest.fn(() => { this.readyState = "ended"; });
  getCapabilities = jest.fn(() => this.capabilities);
  getSettings = jest.fn(() => this.settings);
  getConstraints = jest.fn(() => this.constraints);
  applyConstraints = jest.fn(async (constraints: MediaTrackConstraints) => { this.constraints = constraints; });
}
export class CaptureTestStream {
  constructor(readonly tracks: CaptureTestTrack[] = [new CaptureTestTrack()]) {}
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks; }
}
export function installCaptureGraph() {
  const contexts: any[] = []; const worklets: any[] = [];
  const node = () => ({ connect: jest.fn(), disconnect: jest.fn() });
  class Context extends EventTarget {
    currentTime = 0; sampleRate = 48000; state = "running"; destination = node();
    source = node(); output = { ...node(), stream: new CaptureTestStream() };
    audioWorklet = { addModule: jest.fn(async () => undefined) };
    createMediaStreamSource = jest.fn(() => { this.source = node(); return this.source; });
    createMediaStreamDestination = jest.fn(() => { this.output = { ...node(), stream: new CaptureTestStream() }; return this.output; });
    resume = jest.fn(async () => { this.state = "running"; });
    suspend = jest.fn(async () => { this.state = "suspended"; });
    close = jest.fn(async () => { this.state = "closed"; });
    constructor() { super(); contexts.push(this); }
  }
  class Worklet {
    connect = jest.fn(); disconnect = jest.fn(); autoAck = true;
    onprocessorerror: (() => void) | null = null;
    port = { onmessage: null as ((event: { data: unknown }) => void) | null,
      postMessage: jest.fn((data: { type: string; revision: number }) => {
        if (data.type === "reset" && this.autoAck) Promise.resolve().then(() => this.port.onmessage?.({ data: { type: "reset", revision: data.revision } }));
        if (data.type === "retire" && this.autoAck) Promise.resolve().then(() => this.port.onmessage?.({ data: { type: "retired", revision: data.revision, state: 0, scratch: 0 } }));
      }), close: jest.fn() };
    constructor() { worklets.push(this); }
  }
  window.AudioContext = Context as unknown as typeof AudioContext;
  global.AudioWorkletNode = Worklet as unknown as typeof AudioWorkletNode;
  global.MediaStream = CaptureTestStream as unknown as typeof MediaStream;
  const raw: CaptureTestStream[] = [];
  const getUserMedia = jest.fn(async () => { const stream = new CaptureTestStream(); raw.push(stream); return stream; });
  const getSupportedConstraints = () => Object.fromEntries(["echoCancellation", "noiseSuppression", "autoGainControl", "voiceIsolation", "channelCount", "sampleRate", "sampleSize", "latency"].map((key) => [key, true]));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, getSupportedConstraints, enumerateDevices: jest.fn(async () => []) } });
  return { contexts, worklets, raw, getUserMedia };
}
