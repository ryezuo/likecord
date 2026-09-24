import {
  buildOnTrackDiagnostic,
  buildPeerDiagnosticSnapshot,
  buildScreenAudioSinkSummary,
  CallInboundStatsDiagnostics,
  isVoiceDebugEnabled,
  updateIncomingTrackDiagnostic,
  type IncomingTrackDiagnostic,
  type VoiceDiagnosticSemanticOwner,
} from "../lib/voiceDiagnostics";

function makeTrack(id: string, kind: "audio" | "video", enabled = true): MediaStreamTrack {
  return {
    id,
    kind,
    enabled,
    readyState: "live",
  } as unknown as MediaStreamTrack;
}

function makeStream(id: string, tracks: MediaStreamTrack[]): MediaStream {
  return {
    id,
    getTracks: jest.fn(() => tracks),
    getAudioTracks: jest.fn(() => tracks.filter((track) => track.kind === "audio")),
    getVideoTracks: jest.fn(() => tracks.filter((track) => track.kind === "video")),
  } as unknown as MediaStream;
}

function makeSender(track: MediaStreamTrack | null): RTCRtpSender {
  return { track } as RTCRtpSender;
}

function makeReceiver(track: MediaStreamTrack): RTCRtpReceiver {
  return { track } as RTCRtpReceiver;
}

function makeTransceiver(
  mid: string,
  sender: RTCRtpSender,
  receiver: RTCRtpReceiver,
  direction: RTCRtpTransceiverDirection = "sendrecv",
  currentDirection: RTCRtpTransceiverDirection | null = "sendrecv",
): RTCRtpTransceiver {
  return { mid, sender, receiver, direction, currentDirection } as RTCRtpTransceiver;
}

function makePeer(
  senders: RTCRtpSender[] = [],
  receivers: RTCRtpReceiver[] = [],
  transceivers: RTCRtpTransceiver[] = [],
) {
  return {
    signalingState: "stable",
    connectionState: "connected",
    iceConnectionState: "connected",
    getSenders: jest.fn(() => senders),
    getReceivers: jest.fn(() => receivers),
    getTransceivers: jest.fn(() => transceivers),
  } as unknown as RTCPeerConnection;
}

function buildPeer(
  pc: RTCPeerConnection,
  options: {
    micIds?: string[];
    screenOwners?: Array<[string, VoiceDiagnosticSemanticOwner]>;
    appOwnership?: { shareId: string; streamId: string; video: RTCRtpSender[]; audio: RTCRtpSender[] } | null;
    incomingTracks?: IncomingTrackDiagnostic[];
  } = {},
) {
  return buildPeerDiagnosticSnapshot({
    checkpoint: "test",
    pc,
    localUserId: "local-a",
    localSocketId: "socket-a",
    remoteUserId: "remote-b",
    remoteSocketId: null,
    localMicrophoneTrackIds: new Set(options.micIds || []),
    knownScreenTrackOwners: new Map(options.screenOwners || []),
    applicationScreenOwnership: options.appOwnership || null,
    incomingTracks: options.incomingTracks || [],
  });
}

function makeOnTrackDiagnostic() {
  const audio = makeTrack("screen-audio-track", "audio");
  const video = makeTrack("screen-video-track", "video");
  const stream = makeStream("screen-stream", [audio, video]);
  const sender = makeSender(null);
  const receiver = makeReceiver(audio);
  const transceiver = makeTransceiver("mid-audio", sender, receiver, "recvonly", "recvonly");
  const pc = makePeer([], [receiver], [transceiver]);
  const event = { track: audio, streams: [stream], receiver, transceiver } as RTCTrackEvent;
  return {
    audio,
    stream,
    receiver,
    transceiver,
    pc,
    diagnostic: buildOnTrackDiagnostic({
      event,
      pc,
      localUserId: "viewer-b",
      localSocketId: "socket-b",
      remoteUserId: "presenter-a",
      remoteSocketId: null,
      remoteMediaKey: "presenter-a:screen-stream",
    }),
  };
}

beforeEach(() => {
  window.localStorage.removeItem("debugVoice");
  window.history.replaceState({}, "", "/");
});

describe("opt-in CALL inbound stats", () => {
  const numericFields = ["timestamp", "packetsReceived", "packetsLost", "jitter", "bytesReceived",
    "concealedSamples", "concealmentEvents", "silentConcealedSamples", "packetsDiscarded",
    "insertedSamplesForDeceleration", "removedSamplesForAcceleration", "jitterBufferDelay",
    "jitterBufferEmittedCount", "jitterBufferMinimumDelay", "jitterBufferTargetDelay",
    "totalSamplesReceived", "totalSamplesDuration", "totalProcessingDelay", "audioLevel"];
  function fixture() {
    const track = Object.assign(new EventTarget(), { kind: "audio", readyState: "live" });
    const getStats = jest.fn();
    const receiver = { track, getStats } as unknown as RTCRtpReceiver;
    let active = true;
    let receivers = [receiver];
    const diagnostics = new CallInboundStatsDiagnostics(() => active, () => receivers);
    const report = (values: Record<string, unknown> = {}, extra: Record<string, unknown>[] = []) =>
      new Map([["native-id", { id: "native-id", type: "inbound-rtp", kind: "audio", ...values }],
        ...extra.map((entry, index) => [`extra-${index}`, entry] as const)]);
    getStats.mockResolvedValue(report({ timestamp: 1000, packetsReceived: 10 }));
    return { track, receiver, getStats, diagnostics, report,
      setActive: (value: boolean) => { active = value; },
      setReceivers: (value: RTCRtpReceiver[]) => { receivers = value; } };
  }

  it("T01: creates no polling/timers and makes no reads when disabled", async () => {
    jest.useFakeTimers();
    try {
      const f = fixture();
      f.setActive(false);
      await expect(f.diagnostics.capture()).resolves.toEqual({ status: "inactive", receivers: [] });
      jest.advanceTimersByTime(60000);
      expect(f.getStats).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
      f.setActive(true);
      jest.advanceTimersByTime(60000);
      expect(f.getStats).not.toHaveBeenCalled();
      await f.diagnostics.capture();
      jest.advanceTimersByTime(60000);
      expect(f.getStats).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
      f.diagnostics.dispose();
    } finally { jest.useRealTimers(); }
  });

  it("T03/T04/T13: projects only finite whitelisted numbers, with distinct local receiver aliases", async () => {
    const f = fixture();
    const values = Object.fromEntries(numericFields.map((field, index) => [field, index + 1]));
    const sensitive = ["ssrc", "mid", "trackIdentifier", "candidate", "localId", "remoteId", "ip", "address", "port", "url", "sdp", "deviceId", "userId", "email", "token"];
    f.getStats.mockResolvedValue(f.report({ ...values, ...Object.fromEntries(sensitive.map(key => [key, "PRIVATE"])) }, [
      { id: "video", type: "inbound-rtp", kind: "video", packetsReceived: 999 },
      { id: "sent", type: "outbound-rtp", kind: "audio", bytesSent: 999 },
      { id: "remote", type: "remote-inbound-rtp", kind: "audio", packetsLost: 999 },
    ]));
    const other = { track: Object.assign(new EventTarget(), { kind: "audio", readyState: "live" }), getStats: f.getStats } as unknown as RTCRtpReceiver;
    f.setReceivers([f.receiver, other, f.receiver]);
    const snapshot = await f.diagnostics.capture();
    expect(snapshot.receivers.map(row => row.alias)).toEqual(["call-1", "call-2"]);
    expect(f.getStats).toHaveBeenCalledTimes(2);
    expect(snapshot.receivers[0].streams).toEqual([{ alias: "rtp-1", baseline: "new", current: values, delta: {} }]);
    for (const field of sensitive) expect(JSON.stringify(snapshot)).not.toContain(`"${field}"`);
    expect(JSON.stringify(snapshot)).not.toContain("PRIVATE");
    expect(JSON.stringify(snapshot)).not.toContain("native-id");
    f.diagnostics.dispose();
  });

  it("T05: missing, nonnumeric and nonfinite values stay absent; reported zero stays zero", async () => {
    const f = fixture();
    f.getStats.mockResolvedValue(f.report({ packetsReceived: 0, packetsLost: null, jitter: NaN, audioLevel: Infinity, bytesReceived: "50" }));
    expect((await f.diagnostics.capture()).receivers[0].streams[0].current).toEqual({ packetsReceived: 0 });
    f.diagnostics.dispose();
  });

  it("T06/T07/T08: computes interval counters and jitter-buffer average, preserving current gauges", async () => {
    const f = fixture();
    f.getStats.mockResolvedValueOnce(f.report({ timestamp: 1000, packetsReceived: 10, packetsLost: 0, bytesReceived: 200,
      jitter: 0.01, audioLevel: 0.2, jitterBufferDelay: 10, jitterBufferEmittedCount: 100, concealedSamples: 5 }))
      .mockResolvedValueOnce(f.report({ timestamp: 2000, packetsReceived: 30, packetsLost: 2, bytesReceived: 500,
        jitter: 0.03, audioLevel: 0.4, jitterBufferDelay: 14, jitterBufferEmittedCount: 300, concealedSamples: 8 }));
    const first = await f.diagnostics.capture();
    first.receivers[0].streams[0].current.packetsReceived = 100000; // Cannot corrupt the private baseline.
    const next = (await f.diagnostics.capture()).receivers[0];
    expect(next.alias).toBe("call-1");
    expect(next.streams[0]).toEqual(expect.objectContaining({ baseline: "continued", intervalMs: 1000,
      delta: { packetsReceived: 20, packetsLost: 2, bytesReceived: 300, jitterBufferDelay: 4, jitterBufferEmittedCount: 200, concealedSamples: 3 },
      averageJitterBufferDelayDelta: 0.02 }));
    expect(next.streams[0].current).toEqual(expect.objectContaining({ jitter: 0.03, audioLevel: 0.4 }));
    for (const gauge of ["jitter", "audioLevel", "timestamp"]) expect(next.streams[0].delta).not.toHaveProperty(gauge);
    f.diagnostics.dispose();
  });

  it("T09: zero or unavailable emitted delta never supplies an average", async () => {
    const f = fixture();
    f.getStats.mockResolvedValue(f.report({ jitterBufferDelay: 10, jitterBufferEmittedCount: 100 }));
    await f.diagnostics.capture();
    expect((await f.diagnostics.capture()).receivers[0].streams[0]).not.toHaveProperty("averageJitterBufferDelayDelta");
    f.getStats.mockResolvedValue(f.report({ jitterBufferDelay: 20 }));
    expect((await f.diagnostics.capture()).receivers[0].streams[0]).not.toHaveProperty("averageJitterBufferDelayDelta");
    f.diagnostics.dispose();
  });

  it("T05/T06: all available counters delta; a missing observation breaks that field's baseline", async () => {
    const f = fixture();
    const values = Object.fromEntries(numericFields.map(field => [field, 10]));
    f.getStats.mockResolvedValue(f.report(values));
    await f.diagnostics.capture();
    f.getStats.mockResolvedValue(f.report(Object.fromEntries(numericFields.map(field => [field, 20]))));
    const delta = (await f.diagnostics.capture()).receivers[0].streams[0].delta;
    expect(delta).toEqual(Object.fromEntries(numericFields.filter(field => !["timestamp", "jitter", "audioLevel"].includes(field)).map(field => [field, 10])));
    f.getStats.mockResolvedValue(f.report({ timestamp: 30 }));
    await f.diagnostics.capture();
    f.getStats.mockResolvedValue(f.report({ timestamp: 40, packetsReceived: 80 }));
    expect((await f.diagnostics.capture()).receivers[0].streams[0].delta).toEqual({});
    f.diagnostics.dispose();
  });

  it("T10/T11: replacing a receiver's track discards its old alias and counters", async () => {
    const f = fixture();
    await f.diagnostics.capture();
    Object.assign(f.receiver, { track: Object.assign(new EventTarget(), { kind: "audio", readyState: "live" }) });
    const next = (await f.diagnostics.capture()).receivers[0];
    expect(next.alias).toBe("call-2");
    expect(next.streams[0]).toEqual(expect.objectContaining({ baseline: "new", delta: {} }));
    f.diagnostics.dispose();
  });

  it.each([{ packetsReceived: 1 }, { timestamp: 500 }, { timestamp: 1000 }])(
    "T10: counter reset or non-increasing clock resets the whole interval (%j)", async change => {
      const f = fixture();
      await f.diagnostics.capture();
      f.getStats.mockResolvedValue(f.report({ timestamp: 2000, packetsReceived: 20, ...change }));
      const reset = (await f.diagnostics.capture()).receivers[0].streams[0];
      expect(reset).toEqual(expect.objectContaining({ baseline: "reset", delta: {} }));
      expect(reset).not.toHaveProperty("intervalMs");
      f.getStats.mockResolvedValue(f.report({ timestamp: 3000, packetsReceived: 30 }));
      expect((await f.diagnostics.capture()).receivers[0].streams[0].delta.packetsReceived).toBe(30 - reset.current.packetsReceived!);
      f.diagnostics.dispose();
    });

  it.each([{ id: "replacement" }, { ssrc: 42 }, { trackIdentifier: "replacement-track" }])(
    "T10: native stream identity change starts a new private baseline (%j)", async identity => {
      const f = fixture();
      await f.diagnostics.capture();
      f.getStats.mockResolvedValue(f.report({ timestamp: 2000, packetsReceived: 100, ...identity }));
      const next = (await f.diagnostics.capture()).receivers[0];
      expect(next.alias).toBe("call-1");
      expect(next.streams[0]).toEqual(expect.objectContaining({ alias: "rtp-2", baseline: "new", delta: {} }));
      f.diagnostics.dispose();
    });

  it("T10: separate inbound rows and disappearing rows never share baselines", async () => {
    const f = fixture();
    const second = { id: "second", type: "inbound-rtp", mediaType: "audio", timestamp: 1000, packetsReceived: 500 };
    f.getStats.mockResolvedValue(f.report({ timestamp: 1000, packetsReceived: 10 }, [second]));
    expect((await f.diagnostics.capture()).receivers[0].streams.map(row => row.alias)).toEqual(["rtp-1", "rtp-2"]);
    f.getStats.mockResolvedValue(f.report({ timestamp: 2000, packetsReceived: 20 }));
    await f.diagnostics.capture();
    f.getStats.mockResolvedValue(f.report({ timestamp: 3000, packetsReceived: 30 }, [{ ...second, timestamp: 3000, packetsReceived: 800 }]));
    const rows = (await f.diagnostics.capture()).receivers[0].streams;
    expect(rows[0].delta.packetsReceived).toBe(10);
    expect(rows[1]).toEqual(expect.objectContaining({ alias: "rtp-3", baseline: "new", delta: {} }));
    f.diagnostics.dispose();
  });

  it("T11: removal and ended release references/listeners and late results", async () => {
    const f = fixture();
    const remove = jest.spyOn(f.track, "removeEventListener");
    await f.diagnostics.capture();
    f.setReceivers([]);
    f.diagnostics.prune();
    expect(remove).toHaveBeenCalledWith("ended", expect.any(Function));
    f.setReceivers([f.receiver]);
    expect((await f.diagnostics.capture()).receivers[0].alias).toBe("call-2");
    let resolve!: (value: unknown) => void;
    f.getStats.mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = f.diagnostics.capture();
    f.track.readyState = "ended";
    f.track.dispatchEvent(new Event("ended"));
    resolve(f.report());
    expect((await pending).receivers).toEqual([]);
    f.diagnostics.dispose();
  });

  it.each(["clear", "dispose", "disable"] as const)("T12: %s invalidates in-flight samples", async action => {
    const f = fixture();
    let resolve!: (value: unknown) => void;
    f.getStats.mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = f.diagnostics.capture();
    expect(f.diagnostics.capture()).toBe(pending); // No overlapping getStats calls.
    if (action === "disable") f.setActive(false);
    else f.diagnostics[action]();
    resolve(f.report());
    expect(await pending).toEqual({ status: "inactive", receivers: [] });
    if (action !== "clear") await expect(f.diagnostics.capture()).resolves.toEqual({ status: "inactive", receivers: [] });
    expect(f.getStats).toHaveBeenCalledTimes(1);
    f.diagnostics.dispose();
  });

  it("T14: reads metadata only, never invokes media mutation or returns browser errors", async () => {
    const f = fixture();
    const mutations = { setParameters: jest.fn(), replaceTrack: jest.fn(), stop: jest.fn(), connect: jest.fn(), disconnect: jest.fn() };
    Object.assign(f.receiver, mutations);
    Object.assign(f.track, mutations);
    await f.diagnostics.capture();
    f.getStats.mockRejectedValueOnce(new Error("PRIVATE address, sdp, token"));
    const failure = await f.diagnostics.capture();
    expect(failure.receivers).toEqual([{ alias: "call-1", status: "unavailable", streams: [] }]);
    expect(JSON.stringify(failure)).not.toContain("PRIVATE");
    expect((await f.diagnostics.capture()).receivers[0].streams[0]).toEqual(expect.objectContaining({ baseline: "new", delta: {} }));
    f.diagnostics.dispose();
    for (const spy of Object.values(mutations)) expect(spy).not.toHaveBeenCalled();
  });
});

describe("Screen Share runtime cardinality diagnostics", () => {
  it("DIAG-SEND-01: diagnostic snapshot enumerates actual getSenders()", () => {
    const mic = makeTrack("mic", "audio", false);
    const video = makeTrack("display-video", "video");
    const audio = makeTrack("display-audio", "audio");
    const pc = makePeer([makeSender(mic), makeSender(video), makeSender(audio)]);

    const snapshot = buildPeer(pc, {
      micIds: [mic.id],
      screenOwners: [[video.id, "SCREEN_VIDEO(share-a)"], [audio.id, "SCREEN_AUDIO(share-a)"]],
    });

    expect(pc.getSenders).toHaveBeenCalledTimes(1);
    expect(snapshot.senders.map((sender) => [sender.trackId, sender.semanticOwner])).toEqual([
      ["mic", "MIC"],
      ["display-video", "SCREEN_VIDEO(share-a)"],
      ["display-audio", "SCREEN_AUDIO(share-a)"],
    ]);
    expect(snapshot.senders[0].trackEnabled).toBe(false);
  });

  it("DIAG-SEND-02: snapshot enumerates transceivers with MID and currentDirection", () => {
    const sent = makeTrack("sent-screen-audio", "audio");
    const received = makeTrack("received-audio", "audio");
    const transceiver = makeTransceiver("4", makeSender(sent), makeReceiver(received), "sendrecv", "sendonly");
    const pc = makePeer([transceiver.sender], [transceiver.receiver], [transceiver]);

    const snapshot = buildPeer(pc, { screenOwners: [[sent.id, "SCREEN_AUDIO(share-a)"]] });

    expect(snapshot.transceivers).toEqual([expect.objectContaining({
      index: 0,
      mid: "4",
      direction: "sendrecv",
      currentDirection: "sendonly",
      senderTrackId: "sent-screen-audio",
      receiverTrackId: "received-audio",
    })]);
  });

  it("DIAG-SEND-03: application ownership is compared with actual screen senders", () => {
    const audio = makeTrack("duplicated-screen-audio", "audio");
    const senderA = makeSender(audio);
    const senderB = makeSender(audio);
    const pc = makePeer([senderA, senderB]);

    const snapshot = buildPeer(pc, {
      screenOwners: [[audio.id, "SCREEN_AUDIO(share-a)"]],
      appOwnership: { shareId: "share-a", streamId: "display-a", video: [], audio: [senderA] },
    });

    expect(snapshot.actualScreenAudioSenderCount).toBe(2);
    expect(snapshot.applicationScreenAudioSenderCount).toBe(1);
    expect(snapshot.screenAudioSenderCountMismatch).toBe(true);
  });

  it("DIAG-SEND-04: diagnostics are gated off by default and can be enabled explicitly", () => {
    expect(isVoiceDebugEnabled()).toBe(false);
    window.localStorage.setItem("debugVoice", "true");
    expect(isVoiceDebugEnabled()).toBe(true);
    window.localStorage.removeItem("debugVoice");
    window.history.replaceState({}, "", "/?debugVoice=1");
    expect(isVoiceDebugEnabled()).toBe(true);
  });

  it("DIAG-RECV-01: ontrack diagnostics include track, receiver, MID, and stream identities", () => {
    const { diagnostic } = makeOnTrackDiagnostic();

    expect(diagnostic).toEqual(expect.objectContaining({
      localUserId: "viewer-b",
      localSocketId: "socket-b",
      remoteUserId: "presenter-a",
      trackKind: "audio",
      trackId: "screen-audio-track",
      trackReadyState: "live",
      transceiverMid: "mid-audio",
      semanticOwner: "PENDING/UNKNOWN",
      remoteMediaKey: "presenter-a:screen-stream",
    }));
    expect(diagnostic.receiverId).toMatch(/^receiver-/);
    expect(diagnostic.transceiverId).toMatch(/^transceiver-/);
    expect(diagnostic.streams).toEqual([{
      id: "screen-stream",
      audioTrackIds: ["screen-audio-track"],
      videoTrackIds: ["screen-video-track"],
    }]);
  });

  it("DIAG-RECV-02: receiver snapshot correlates actual receiver and transceiver ownership", () => {
    const runtime = makeOnTrackDiagnostic();
    const owned = updateIncomingTrackDiagnostic(runtime.diagnostic, {
      semanticOwner: "SCREEN_AUDIO(share-a)",
      shareId: "share-a",
    });

    const snapshot = buildPeer(runtime.pc, { incomingTracks: [owned] });

    expect(snapshot.receivers).toEqual([expect.objectContaining({
      trackId: "screen-audio-track",
      trackReadyState: "live",
      semanticOwner: "SCREEN_AUDIO(share-a)",
      shareId: "share-a",
    })]);
    expect(snapshot.transceivers[0]).toEqual(expect.objectContaining({ mid: "mid-audio", currentDirection: "recvonly" }));
  });

  it("DIAG-RECV-03: final CALL and SCREEN semantic ownership includes sink identity", () => {
    const runtime = makeOnTrackDiagnostic();
    const element = document.createElement("audio");
    element.dataset.audioOwner = "CALL_MIC_AUDIO";
    element.srcObject = runtime.stream;
    const callOwned = updateIncomingTrackDiagnostic(runtime.diagnostic, {
      semanticOwner: "CALL_MIC_AUDIO",
      remoteMediaKey: "presenter-a:screen-stream",
      audioElement: element,
    });
    element.dataset.audioOwner = "SCREEN_AUDIO:share-a";
    const screenOwned = updateIncomingTrackDiagnostic(callOwned, {
      semanticOwner: "SCREEN_AUDIO(share-a)",
      shareId: "share-a",
      audioElement: element,
    });

    expect(callOwned.semanticOwner).toBe("CALL_MIC_AUDIO");
    expect(screenOwned).toEqual(expect.objectContaining({
      semanticOwner: "SCREEN_AUDIO(share-a)",
      shareId: "share-a",
      audioElementOwnershipKey: "SCREEN_AUDIO:share-a",
      audioElementSrcObjectStreamId: "screen-stream",
    }));
  });

  it("DIAG-RECV-04: per-share summary separates receiver, ownership, element, and audible counts", () => {
    const runtime = makeOnTrackDiagnostic();
    const second = { ...runtime.diagnostic, diagnosticKey: `${runtime.diagnostic.diagnosticKey}:2`, trackId: "screen-audio-track-2" };
    const incomingTracks = [runtime.diagnostic, second].map((diagnostic) => updateIncomingTrackDiagnostic(diagnostic, {
      semanticOwner: "SCREEN_AUDIO(share-a)",
      shareId: "share-a",
    }));
    const audible = document.createElement("audio");
    audible.dataset.audioOwner = "SCREEN_AUDIO:share-a";
    audible.srcObject = runtime.stream;
    Object.defineProperty(audible, "paused", { configurable: true, value: false });
    const hidden = document.createElement("audio");
    hidden.dataset.audioOwner = "SCREEN_AUDIO:share-a";
    hidden.srcObject = makeStream("second-stream", [makeTrack("screen-audio-track-2", "audio")]);
    hidden.muted = true;
    Object.defineProperty(hidden, "paused", { configurable: true, value: false });

    const summary = buildScreenAudioSinkSummary({
      shareId: "share-a",
      hidden: false,
      incomingTracks,
      screenAudioElements: new Map([["presenter-a:screen-stream", audible], ["presenter-a:second-stream", hidden]]),
      screenAudioShareIds: new Map([["presenter-a:screen-stream", "share-a"], ["presenter-a:second-stream", "share-a"]]),
    });

    expect(summary).toEqual(expect.objectContaining({
      screenAudioReceiverTracksCount: 2,
      screenAudioOwnershipEntriesCount: 2,
      dedicatedScreenAudioElementsCount: 2,
      audibleScreenAudioElementsCount: 1,
    }));
  });

  it("DIAG-RECV-05: muted visual video is never counted as an audible screen sink", () => {
    const runtime = makeOnTrackDiagnostic();
    const audio = document.createElement("audio");
    audio.srcObject = runtime.stream;
    audio.dataset.audioOwner = "SCREEN_AUDIO:share-a";
    Object.defineProperty(audio, "paused", { configurable: true, value: false });
    const visual = document.createElement("video");
    visual.srcObject = runtime.stream;
    visual.muted = true;

    const summary = buildScreenAudioSinkSummary({
      shareId: "share-a",
      hidden: false,
      incomingTracks: [updateIncomingTrackDiagnostic(runtime.diagnostic, {
        semanticOwner: "SCREEN_AUDIO(share-a)",
        shareId: "share-a",
      })],
      screenAudioElements: new Map([["screen", audio]]),
      screenAudioShareIds: new Map([["screen", "share-a"]]),
    });

    expect(visual.muted).toBe(true);
    expect(summary.dedicatedScreenAudioElementsCount).toBe(1);
    expect(summary.audibleScreenAudioElementsCount).toBe(1);
  });

  it("DIAG-RECV-06: snapshot helpers observe but never alter media playback", () => {
    const runtime = makeOnTrackDiagnostic();
    const audio = document.createElement("audio");
    audio.srcObject = runtime.stream;
    audio.dataset.audioOwner = "SCREEN_AUDIO:share-a";
    audio.muted = false;
    audio.volume = 0.4;
    const play = jest.spyOn(audio, "play");
    const pause = jest.spyOn(audio, "pause");

    buildPeer(runtime.pc, { incomingTracks: [runtime.diagnostic] });
    buildScreenAudioSinkSummary({
      shareId: "share-a",
      hidden: false,
      incomingTracks: [runtime.diagnostic],
      screenAudioElements: new Map([["screen", audio]]),
      screenAudioShareIds: new Map([["screen", "share-a"]]),
    });

    expect(play).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(audio.srcObject).toBe(runtime.stream);
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(0.4);
    expect(audio.dataset.audioOwner).toBe("SCREEN_AUDIO:share-a");
  });
});
