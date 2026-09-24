import { initialPresentation, screenPresentationReducer as reduce, type PresentationAction } from "../lib/screenPresentation";
import { AudioOutputCoordinator } from "../lib/audioOutput";
import { RECEIVE_LIMITER_WORKLET_URL, VoicePlaybackOwner } from "../lib/voicePlayback";

function parameter() {
  return {
    value: 0,
    cancelScheduledValues: jest.fn(),
    setValueAtTime: jest.fn(function (this: { value: number }, value: number) { this.value = value; }),
    linearRampToValueAtTime: jest.fn(function (this: { value: number }, value: number) { this.value = value; }),
  };
}

function node() {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    channelCount: 2,
    channelCountMode: "max",
    channelInterpretation: "speakers",
  };
}

function remoteTrack(id: string): MediaStreamTrack & { listeners: Map<string, () => void> } {
  const listeners = new Map<string, () => void>();
  return {
    id,
    kind: "audio",
    readyState: "live",
    listeners,
    addEventListener: jest.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") listeners.set(event, listener as () => void);
    }),
    removeEventListener: jest.fn((event: string) => listeners.delete(event)),
  } as unknown as MediaStreamTrack & { listeners: Map<string, () => void> };
}

async function settle() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

describe("received Web Audio playback owner", () => {
  let contexts: any[];
  let worklets: any[];
  let coordinator: AudioOutputCoordinator;
  let owner: VoicePlaybackOwner;
  let track: MediaStreamTrack & { listeners: Map<string, () => void> };

  beforeEach(async () => {
    localStorage.clear();
    contexts = []; worklets = [];
    class TestMediaStream {
      readonly tracks: MediaStreamTrack[];
      constructor(tracks: MediaStreamTrack[] = []) { this.tracks = tracks; }
      getTracks() { return this.tracks; }
    }
    global.MediaStream = TestMediaStream as unknown as typeof MediaStream;
    class TestAudioWorkletNode {
      connect = jest.fn();
      disconnect = jest.fn();
      port = { postMessage: jest.fn() };
      constructor(_context: AudioContext, _name: string) { worklets.push(this); }
    }
    global.AudioWorkletNode = TestAudioWorkletNode as unknown as typeof AudioWorkletNode;
    class TestAudioContext {
      currentTime = 0;
      sampleRate = 48000;
      baseLatency = 0.004;
      state: AudioContextState = "running";
      destination = node();
      gains: any[] = [];
      sources: any[] = [];
      audioWorklet = { addModule: jest.fn(async () => undefined) };
      close = jest.fn(async () => undefined);
      setSinkId = jest.fn(async () => undefined);
      createGain = jest.fn(() => {
        const gain = { ...node(), gain: parameter() };
        this.gains.push(gain); return gain;
      });
      createMediaStreamSource = jest.fn((stream: MediaStream) => {
        const source = { ...node(), stream };
        this.sources.push(source); return source;
      });
      constructor() { contexts.push(this); }
    }
    window.AudioContext = TestAudioContext as unknown as typeof AudioContext;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {} });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
    jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    track = remoteTrack("remote-track");
    coordinator = new AudioOutputCoordinator("account-a", () => true);
    coordinator.configureMaster(true, 100);
    owner = new VoicePlaybackOwner(coordinator);
    await settle();
  });

  afterEach(() => {
    owner.dispose(); coordinator.dispose(); jest.restoreAllMocks();
  });

  it("creates one permanently muted track-only consumer before graph playback", async () => {
    const attached = owner.attachTrack("media-1", track);
    expect(attached.consumer).toMatchObject({ muted: true, volume: 0, autoplay: true });
    expect((attached.consumer.srcObject as unknown as { getTracks(): MediaStreamTrack[] }).getTracks()).toEqual([track]);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(await attached.ready).toBe(true);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].audioWorklet.addModule).toHaveBeenCalledWith(RECEIVE_LIMITER_WORKLET_URL);
    expect(attached.consumer).toMatchObject({ muted: true, volume: 0 });
  });

  it("keeps pending sources at zero, then routes one source to CALL or Screen without parallel playback", async () => {
    const attached = owner.attachTrack("media-1", track);
    await attached.ready;
    const context = contexts[0];
    expect(context.sources).toHaveLength(1);
    expect(context.gains[4].connect).not.toHaveBeenCalled();
    owner.setCallPolicy("remote-a", { volume: 0.5, allowed: true });
    owner.classifyCall("media-1", "remote-a");
    expect(context.gains[4].connect).toHaveBeenLastCalledWith(context.gains[0]);
    expect(context.gains[4].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.5, 0.01);

    owner.setScreenPolicy("share-a", { volume: 0.25, allowed: true });
    owner.classifyScreen("media-1", "share-a");
    expect(context.sources).toHaveLength(1);
    expect(context.gains[4].disconnect).toHaveBeenCalled();
    expect(context.gains[4].connect).toHaveBeenLastCalledWith(context.gains[1]);
    expect(context.gains[4].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.25, 0.01);
  });

  it("applies personal/share gain before one master and flushes lookahead on mandatory mute", async () => {
    const attached = owner.attachTrack("media-1", track); await attached.ready;
    const context = contexts[0]; const limiter = worklets[0];
    owner.setCallPolicy("remote-a", { volume: 0.4, allowed: true }); owner.classifyCall("media-1", "remote-a");
    coordinator.configureMaster(true, 200);
    expect(context.gains[4].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.4, 0.01);
    expect(context.gains[2].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(2, 0.01);

    limiter.port.postMessage.mockClear();
    owner.setCallPolicy("remote-a", { volume: 0.4, allowed: false });
    expect(context.gains[4].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(limiter.port.postMessage).toHaveBeenCalledWith({ type: "flush" });
    expect(attached.consumer).toMatchObject({ muted: true, volume: 0 });
  });

  it("keeps simultaneous CALL and Screen policies independent across mandatory mute transitions", async () => {
    const screenTrack = remoteTrack("screen-track");
    const call = owner.attachTrack("call-media", track);
    const screen = owner.attachTrack("screen-media", screenTrack);
    await Promise.all([call.ready, screen.ready]);
    const context = contexts[0];

    owner.setCallPolicy("remote-a", { volume: 0.4, allowed: true });
    owner.classifyCall("call-media", "remote-a");
    owner.setScreenPolicy("share-a", { volume: 0.7, allowed: true });
    owner.classifyScreen("screen-media", "share-a");
    const callGain = context.gains[4].gain;
    const screenGain = context.gains[5].gain;
    expect(callGain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.4, 0.01);
    expect(screenGain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.7, 0.01);

    owner.setAllCallsAllowed(false);
    expect(callGain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(screenGain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.7, 0.01);

    owner.setScreenPolicy("share-a", { volume: 0.7, allowed: false });
    expect(screenGain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(call.consumer).toMatchObject({ muted: true, volume: 0 });
    expect(screen.consumer).toMatchObject({ muted: true, volume: 0 });
  });

  it("clearing a Screen policy fails closed and release retires every owned resource", async () => {
    const attached = owner.attachTrack("media-1", track); await attached.ready;
    const context = contexts[0]; const limiter = worklets[0];
    owner.setScreenPolicy("share-a", { volume: 1, allowed: true }); owner.classifyScreen("media-1", "share-a");
    limiter.port.postMessage.mockClear();
    owner.clearScreenPolicy("share-a");
    expect(context.gains[4].gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(limiter.port.postMessage).toHaveBeenCalledWith({ type: "flush" });
    owner.release("media-1");
    expect(context.sources[0].disconnect).toHaveBeenCalled();
    expect(attached.consumer.srcObject).toBeNull();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("SSUX2: minimized retains Screen gain; hidden gates only that share, preserving CALL/master and one route", async () => {
    const call = owner.attachTrack("call-media", track), screenA = owner.attachTrack("screen-a", remoteTrack("a")), screenC = owner.attachTrack("screen-c", remoteTrack("c"));
    await Promise.all([call.ready, screenA.ready, screenC.ready]);
    owner.classifyScreen("screen-a", "a"); owner.classifyScreen("screen-c", "c"); coordinator.configureMaster(true, 150);
    let state = reduce(initialPresentation, { type: "SYNC", ids: ["a", "c"] });
    const context = contexts[0], sourceCount = context.sources.length;
    const gainA = context.gains[5], gainC = context.gains[6];
    const apply = (action: PresentationAction) => {
      state = reduce(state, action);
      owner.setScreenPolicy("a", { volume: 0.37, allowed: state.placements.a.mode !== "HIDDEN" });
      owner.setScreenPolicy("c", { volume: 0.7, allowed: state.placements.c.mode !== "HIDDEN" });
    };
    apply({ type: "MINIMIZE", id: "a" }); expect(gainA.gain.value).toBe(0.37); expect(gainC.gain.value).toBe(0.7);
    apply({ type: "HIDE", id: "a" }); expect(gainA.gain.value).toBe(0); expect(gainC.gain.value).toBe(0.7);
    apply({ type: "SHOW", id: "a" }); expect(state.placements.a.mode).toBe("MINIMIZED"); expect(gainA.gain.value).toBe(0.37);
    apply({ type: "BACK_TO_CHAT" }); expect(gainC.gain.value).toBe(0.7); expect(context.sources).toHaveLength(sourceCount);
    expect(gainA.connect).toHaveBeenCalledWith(context.gains[1]); expect(context.gains[1].connect).toHaveBeenCalledTimes(1); expect(context.gains[2].gain.value).toBe(1.5);
    expect(screenA.consumer).toMatchObject({ muted: true, volume: 0 }); expect(screenC.consumer).toMatchObject({ muted: true, volume: 0 });
  });

  it("SSUX1: Screen 0/partial/100% applies before exactly one shared master gain", async () => {
    const attached = owner.attachTrack("screen-media", track); await attached.ready;
    owner.classifyScreen("screen-media", "share-a");
    coordinator.configureMaster(true, 150);
    const context = contexts[0];
    for (const volume of [0, 0.37, 1]) {
      owner.setScreenPolicy("share-a", { volume, allowed: true });
      expect(context.gains[4].gain.value).toBe(volume);
      expect(context.gains[2].gain.value).toBe(1.5);
      expect(context.gains[4].connect).toHaveBeenLastCalledWith(context.gains[1]);
      expect(context.gains[1].connect).toHaveBeenCalledTimes(1);
      expect(context.gains[1].connect).toHaveBeenCalledWith(context.gains[2]);
      expect(attached.consumer).toMatchObject({ muted: true, volume: 0 });
    }
    owner.setScreenPolicy("share-a", { volume: 0.37, allowed: false });
    expect(context.gains[4].gain.value).toBe(0);
    owner.setScreenPolicy("share-a", { volume: 0.37, allowed: true });
    expect(context.gains[4].gain.value).toBe(0.37);
  });
});
