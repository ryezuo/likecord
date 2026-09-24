import {
  configureScreenCaptureAudioTrack, configureScreenAudioCodecPolicy, applyScreenAudioSenderPolicy, readScreenAudioSenderStats,
} from "../lib/screenAudioQuality";

const clean = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2, sampleRate: 48000 };
function capture(settings: MediaTrackSettings = clean, capabilities: MediaTrackCapabilities = {}) {
  return {
    kind: "audio", contentHint: "", getSettings: jest.fn(() => settings),
    getCapabilities: jest.fn(() => capabilities), applyConstraints: jest.fn(async () => {}),
  } as unknown as MediaStreamTrack;
}
type Encoding = RTCRtpEncodingParameters & { dtx?: string; networkPriority?: string };
function transport(encoding: Encoding = { active: true, dtx: "enabled", networkPriority: "low" }) {
  let effective = [encoding];
  let transaction: RTCRtpSendParameters;
  const sender = {
    getParameters: jest.fn(() => {
      transaction = { transactionId: "transaction", encodings: effective.map((e) => ({ ...e })), codecs: [], headerExtensions: [], rtcp: { cname: "retained" } };
      return transaction;
    }),
    setParameters: jest.fn(async (parameters: RTCRtpSendParameters) => {
      expect(parameters).toBe(transaction);
      expect(parameters.rtcp).toEqual({ cname: "retained" });
      effective = parameters.encodings.map((e) => ({ ...e }));
    }),
  };
  return { sender: sender as unknown as RTCRtpSender, get: () => effective[0], empty: () => { effective = []; }, set: (e: Encoding) => { effective = [e]; } };
}

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
    getSupportedConstraints: () => ({ echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: true, sampleRate: true }),
  } });
});

describe("Screen media capture fidelity", () => {
  it.each(["", "music", "speech", "speech-recognition"])("leaves browser contentHint %j untouched and reads effective settings", async (contentHint) => {
    const track = capture();
    const setContentHint = jest.fn();
    Object.defineProperty(track, "contentHint", { get: () => contentHint, set: setContentHint });
    const result = await configureScreenCaptureAudioTrack(track);
    expect(setContentHint).not.toHaveBeenCalled();
    expect(result.contentHint).toBe(contentHint);
    expect(track.applyConstraints).toHaveBeenCalledWith({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 }, sampleRate: { ideal: 48000 } });
    expect(result.effective).toEqual(clean);
    expect(result.status).toBe("SCREEN_AUDIO_TRANSPARENT_CAPTURE_VERIFIED");
    expect(track.getSettings).toHaveBeenCalledTimes(1);
  });
  it("reports ignored speech controls as unsupported, never as verified", async () => {
    const result = await configureScreenCaptureAudioTrack(capture({ ...clean, echoCancellation: true }));
    expect(result.status).toBe("SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNSUPPORTED");
    expect(result.effective.echoCancellation).toBe(true);
  });
  it("does not manufacture effective values or stereo when the browser omits settings", async () => {
    const result = await configureScreenCaptureAudioTrack(capture({}));
    expect(result.status).toBe("SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNVERIFIED");
    expect(result.effective.channelCount).toBeNull();
  });
  it("accepts genuine source/browser mono and a different sample rate without synthesizing channels", async () => {
    const track = capture({ ...clean, channelCount: 1, sampleRate: 44100 }, { channelCount: { min: 1, max: 1 }, sampleRate: { min: 44100, max: 44100 } });
    const result = await configureScreenCaptureAudioTrack(track);
    expect(track.applyConstraints).toHaveBeenCalledWith({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
    expect(result.effective.channelCount).toBe(1);
    expect(result.effective.sampleRate).toBe(44100);
  });
  it("bounds retry and retains previously accepted speech constraints", async () => {
    const track = capture();
    (track.applyConstraints as jest.Mock).mockRejectedValueOnce(new DOMException("optional", "OverconstrainedError"));
    await configureScreenCaptureAudioTrack(track);
    expect(track.applyConstraints).toHaveBeenCalledTimes(4);
    expect(track.applyConstraints).toHaveBeenLastCalledWith({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  });
  it("handles rejected constraints and a forced AEC capability without throwing", async () => {
    const track = capture({ ...clean, echoCancellation: true }, { echoCancellation: [true] });
    (track.applyConstraints as jest.Mock).mockRejectedValue(new DOMException("no", "OverconstrainedError"));
    await expect(configureScreenCaptureAudioTrack(track)).resolves.toMatchObject({ status: "SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNSUPPORTED", errors: expect.any(Array) });
  });
  it("handles absent optional APIs and unsupported contentHint", async () => {
    const track = { kind: "audio" } as MediaStreamTrack;
    await expect(configureScreenCaptureAudioTrack(track)).resolves.toMatchObject({ contentHint: null, status: "SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNVERIFIED" });
  });
});

describe("Screen media RTP policy", () => {
  it("samples only audio counters and codec fields, excluding transport credentials and addresses", async () => {
    const stats = new Map([
      ["audio", { type: "outbound-rtp", kind: "audio", id: "audio", timestamp: 10000, bytesSent: 80000, targetBitrate: 64000, codecId: "opus", remoteId: "remote" }],
      ["opus", { mimeType: "audio/opus", clockRate: 48000, channels: 2, sdpFmtpLine: "minptime=10;useinbandfec=1" }],
      ["remote", { packetsLost: 0, jitter: 0.001, roundTripTime: 0.01 }],
      ["candidate", { address: "excluded", usernameFragment: "excluded" }],
    ]);
    const result = await readScreenAudioSenderStats({ getStats: async () => stats } as unknown as RTCRtpSender);
    expect(result.audio).toHaveLength(1);
    expect(result.audio[0]).toMatchObject({ timestamp: 10000, bytesSent: 80000, targetBitrate: 64000, codec: { mimeType: "audio/opus" }, remote: { packetsLost: 0 } });
    expect(JSON.stringify(result)).not.toContain("excluded");
  });
  it("preserves browser transactions, caps at 64 kbps and verifies priority/DTX independently", async () => {
    const t = transport(); const report = jest.fn();
    await applyScreenAudioSenderPolicy(t.sender, () => true, report);
    expect(t.get()).toEqual({ active: true, maxBitrate: 64000, priority: "high", networkPriority: "high", dtx: "disabled" });
    expect(t.get()).not.toHaveProperty("minBitrate");
    expect(report).toHaveBeenCalledWith("sender", expect.objectContaining({ outcomes: { maxBitrate: "verified", priority: "verified", networkPriority: "verified", dtx: "verified" } }));
  });
  it("does not invent absent DTX or network priority fields", async () => {
    const t = transport({ active: true }); const report = jest.fn();
    await applyScreenAudioSenderPolicy(t.sender, () => true, report);
    expect(t.get()).toEqual({ active: true, maxBitrate: 64000, priority: "high" });
    expect(report.mock.calls[0][1].outcomes).toMatchObject({ dtx: "unsupported", networkPriority: "unsupported" });
  });
  it("a priority rejection cannot veto the bitrate ceiling or kill sharing", async () => {
    const t = transport(); const report = jest.fn();
    (t.sender.setParameters as jest.Mock).mockRejectedValueOnce(new DOMException("no", "InvalidModificationError"));
    await expect(applyScreenAudioSenderPolicy(t.sender, () => true, report)).resolves.toBeUndefined();
    expect(report.mock.calls[0][1].outcomes.maxBitrate).toBe("rejected:InvalidModificationError");
    expect(t.get().dtx).toBe("disabled");
    const second = transport();
    const original = (second.sender.setParameters as jest.Mock).getMockImplementation()!;
    (second.sender.setParameters as jest.Mock).mockImplementation(async (p: RTCRtpSendParameters) => {
      if (p.encodings[0].priority === "high") throw new DOMException("no", "InvalidModificationError");
      await original(p);
    });
    await applyScreenAudioSenderPolicy(second.sender, () => true, jest.fn());
    expect(second.get().maxBitrate).toBe(64000);
    expect(second.get().dtx).toBe("disabled");
  });
  it("reports silently ignored parameters as unsupported", async () => {
    const t = transport(); const report = jest.fn();
    (t.sender.setParameters as jest.Mock).mockResolvedValue(undefined);
    await applyScreenAudioSenderPolicy(t.sender, () => true, report);
    expect(report.mock.calls[0][1].outcomes.maxBitrate).toBe("unsupported");
  });
  it("waits for negotiated encodings instead of creating unrelated parameters", async () => {
    const t = transport(); const report = jest.fn(); t.empty();
    await applyScreenAudioSenderPolicy(t.sender, () => true, report);
    expect(t.sender.setParameters).not.toHaveBeenCalled();
    expect(report.mock.calls[0][1].outcomes.maxBitrate).toBe("pending-negotiation");
    t.set({ active: true });
    await applyScreenAudioSenderPolicy(t.sender, () => true, report);
    expect(t.get().maxBitrate).toBe(64000);
  });
  it("does not apply stale queued work or report an obsolete share", async () => {
    const t = transport(); const report = jest.fn(); let current = true;
    (t.sender.setParameters as jest.Mock).mockImplementation(async () => { current = false; });
    await Promise.all([applyScreenAudioSenderPolicy(t.sender, () => current, report), applyScreenAudioSenderPolicy(t.sender, () => current, report)]);
    expect(t.sender.setParameters).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });
  it("prefers only actual browser Opus capability objects and leaves fmtp untouched", () => {
    const opus = { mimeType: "audio/opus", clockRate: 48000, channels: 2, sdpFmtpLine: "minptime=10;useinbandfec=1" };
    const pcmu = { mimeType: "audio/PCMU", clockRate: 8000 };
    const previous = global.RTCRtpSender;
    Object.defineProperty(global, "RTCRtpSender", { configurable: true, writable: true, value: { getCapabilities: () => ({ codecs: [pcmu, opus] }) } });
    try {
      const setCodecPreferences = jest.fn();
      expect(configureScreenAudioCodecPolicy({ setCodecPreferences } as unknown as RTCRtpTransceiver).status).toBe("preferred");
      expect(setCodecPreferences.mock.calls[0][0][0]).toBe(opus);
      expect(opus.sdpFmtpLine).toBe("minptime=10;useinbandfec=1");
      setCodecPreferences.mockImplementation(() => { throw new DOMException("no", "InvalidModificationError"); });
      expect(configureScreenAudioCodecPolicy({ setCodecPreferences } as unknown as RTCRtpTransceiver).status).toBe("rejected");
    } finally { global.RTCRtpSender = previous; }
  });
});
