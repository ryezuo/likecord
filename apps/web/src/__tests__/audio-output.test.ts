import {
  AudioOutputCoordinator,
  type AudioOutputAdapter,
  type AudioOutputEffectiveState,
  type AudioOutputRole,
} from "../lib/audioOutput";

const EFFECTIVE: AudioOutputEffectiveState = {
  sampleRate: 48000,
  renderQuantumSize: 128,
  baseLatencyMs: 4,
  outputLatencyMs: 8,
  outputTimestamp: null,
  channelCount: 2,
  contextState: "running",
  note: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function settle() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

function adapter(id: string, role: AudioOutputRole, apply = jest.fn(async () => EFFECTIVE)) {
  const transitions: boolean[] = [];
  const value: AudioOutputAdapter = {
    id,
    role,
    setTransitionMuted: (muted) => transitions.push(muted),
    apply,
  };
  return { value, apply, transitions };
}

describe("account-local common audio output coordinator", () => {
  let getUserMedia: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    getUserMedia = jest.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
    class SinkContext { async setSinkId(_deviceId: string) {} }
    window.AudioContext = SinkContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    expect(getUserMedia).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it("sanitizes versioned per-account profiles and stores no device label", async () => {
    localStorage.setItem("likecord.audio-output.v1:account-a", JSON.stringify({
      version: 99,
      deviceId: "device-a",
      deviceLabel: "Private headset label",
      roles: {
        receive: { latencyHint: 2_000, sampleRate: 12, renderSizeHint: 65, channelLayout: "surround" },
        sfx: { latencyHint: "interactive", sampleRate: 48000, renderSizeHint: 256, channelLayout: "stereo" },
      },
    }));
    const owner = new AudioOutputCoordinator("account-a", () => true);
    const other = new AudioOutputCoordinator("account-b", () => true);
    expect(owner.snapshot().profile).toMatchObject({
      version: 1,
      deviceId: "device-a",
      roles: {
        receive: { latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto" },
        sfx: { latencyHint: "interactive", sampleRate: 48000, renderSizeHint: 256, channelLayout: "stereo" },
      },
    });
    expect(other.snapshot().profile.deviceId).toBe("");
    owner.updateRoleSettings("receive", { sampleRate: 44100 });
    expect(localStorage.getItem("likecord.audio-output.v1:account-a")).not.toContain("Private headset label");
    owner.dispose(); other.dispose(); await settle();
  });

  it("falls back truthfully to memory when local profile persistence is unavailable", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked"); });
    const owner = new AudioOutputCoordinator("account-a", () => true);
    owner.updateRoleSettings("receive", { channelLayout: "mono" });
    expect(owner.snapshot()).toMatchObject({ storage: "memory", profile: { roles: { receive: { channelLayout: "mono" } } } });
    expect(setItem).toHaveBeenCalled();
    owner.dispose();
  });

  it("invokes the explicit picker before yielding and applies its device to late CALL/Screen and SFX adapters", async () => {
    const picked = deferred<MediaDeviceInfo>();
    const selectAudioOutput = jest.fn(() => picked.promise);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, selectAudioOutput } });
    const owner = new AudioOutputCoordinator("account-a", () => true);
    const choosing = owner.chooseWithPicker();
    expect(selectAudioOutput).toHaveBeenCalledTimes(1);
    picked.resolve({ deviceId: "headset-1", label: "Headset", kind: "audiooutput" } as MediaDeviceInfo);
    await choosing; await settle();

    const receive = adapter("receive", "receive");
    const sfx = adapter("sfx", "sfx");
    owner.registerAdapter(receive.value); owner.registerAdapter(sfx.value); await settle();
    expect(receive.apply).toHaveBeenLastCalledWith(expect.any(Object), "headset-1");
    expect(sfx.apply).toHaveBeenLastCalledWith(expect.any(Object), "headset-1");
    expect(owner.snapshot()).toMatchObject({ status: "ready", effectiveDeviceId: "headset-1" });
    expect(localStorage.getItem("likecord.audio-output.v1:account-a")).not.toContain("Headset");
    owner.dispose();
  });

  it("uses enumeration only as fallback and applies one listed device to both roles", async () => {
    const enumerateDevices = jest.fn(async () => [
      { kind: "audioinput", deviceId: "mic", label: "Mic" },
      { kind: "audiooutput", deviceId: "speakers", label: "Speakers" },
    ] as MediaDeviceInfo[]);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices } });
    const owner = new AudioOutputCoordinator("account-a", () => true);
    await owner.refreshCapabilities();
    const receive = adapter("receive", "receive"); const sfx = adapter("sfx", "sfx");
    owner.registerAdapter(receive.value); owner.registerAdapter(sfx.value); await settle();
    owner.applyListedDevice("speakers"); await settle();
    expect(receive.apply).toHaveBeenLastCalledWith(expect.any(Object), "speakers");
    expect(sfx.apply).toHaveBeenLastCalledWith(expect.any(Object), "speakers");
    expect(owner.snapshot().devices).toEqual([{ deviceId: "speakers", label: "Speakers" }]);
    owner.dispose();
  });

  it("serializes context changes and converges on the newest role intent", async () => {
    const first = deferred<AudioOutputEffectiveState>();
    const apply = jest.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(EFFECTIVE);
    const receive = adapter("receive", "receive", apply);
    const owner = new AudioOutputCoordinator("account-a", () => true);
    owner.registerAdapter(receive.value); await settle(); apply.mockClear();
    owner.updateRoleSettings("receive", { sampleRate: 44100 }); await Promise.resolve(); await Promise.resolve();
    owner.updateRoleSettings("receive", { sampleRate: 48000 });
    first.resolve(EFFECTIVE); await settle();
    expect(apply.mock.calls.map((call) => call[0].sampleRate)).toEqual([44100, 48000]);
    expect(owner.snapshot()).toMatchObject({ status: "ready", profile: { roles: { receive: { sampleRate: 48000 } } } });
    owner.dispose();
  });

  it("rolls every role back after a partial switch failure and keeps the previous route active", async () => {
    const receive = adapter("receive", "receive");
    const sfxApply = jest.fn(async (_settings, deviceId: string) => {
      if (deviceId === "speakers") throw new DOMException("gone", "NotFoundError");
      return EFFECTIVE;
    });
    const sfx = adapter("sfx", "sfx", sfxApply);
    const enumerateDevices = jest.fn(async () => [{ kind: "audiooutput", deviceId: "speakers", label: "Speakers" }] as MediaDeviceInfo[]);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices } });
    const owner = new AudioOutputCoordinator("account-a", () => true);
    await owner.refreshCapabilities(); owner.registerAdapter(receive.value); owner.registerAdapter(sfx.value); await settle();
    receive.apply.mockClear(); sfxApply.mockClear(); receive.transitions.length = 0; sfx.transitions.length = 0;
    owner.applyListedDevice("speakers"); await settle();
    expect(receive.apply.mock.calls.map((call) => call[1])).toEqual(["speakers", ""]);
    expect(sfxApply.mock.calls.map((call) => call[1])).toEqual(["speakers", ""]);
    expect(owner.snapshot()).toMatchObject({ status: "failed", effectiveDeviceId: "" });
    expect(receive.transitions.at(-1)).toBe(false);
    expect(sfx.transitions.at(-1)).toBe(false);
    owner.dispose();
  });

  it("stays fail-closed when both the requested route and rollback are unavailable", async () => {
    let fail = false;
    const apply = jest.fn(async () => {
      if (fail) throw new DOMException("gone", "NotFoundError");
      return EFFECTIVE;
    });
    const receive = adapter("receive", "receive", apply);
    const owner = new AudioOutputCoordinator("account-a", () => true);
    owner.registerAdapter(receive.value); await settle();
    fail = true;
    owner.updateRoleSettings("receive", { sampleRate: 44100 }); await settle();
    expect(owner.snapshot()).toMatchObject({ status: "device-lost" });
    expect(receive.transitions.at(-1)).toBe(true);
    owner.dispose();
  });
});
