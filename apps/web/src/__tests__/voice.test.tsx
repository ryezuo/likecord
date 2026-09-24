import { TestMediaStream } from "../../test-support/screenMedia";
import "@testing-library/jest-dom";
jest.mock("../lib/voiceCapture", () => ({
  getVoiceCaptureOwner: () => jest.requireActual("../../test-support/voiceCaptureBoundary").captureBoundary(),
}));
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useVoice } from "../hooks/useVoice";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import ScreenStreamVideo from "../components/layout/ScreenStreamVideo";
import ScreenSharePresenterCard from "../components/layout/ScreenSharePresenterCard";
import { VoiceSpeakingAnalysis } from "../lib/voiceSpeaking";
import { voiceMixApi, type VoiceMixPreference } from "../lib/api";
import type { VoiceDiagnosticsApi } from "../lib/voiceDiagnostics";

jest.mock("../lib/api", () => ({
  voiceMixApi: { list: jest.fn(), put: jest.fn(), reset: jest.fn() },
}));

jest.mock("../lib/voiceSpeaking", () => ({
  VoiceSpeakingAnalysis: jest.fn().mockImplementation((publish: (userIds: string[]) => void) => ({
    attach: jest.fn(),
    detach: jest.fn(),
    setEffectiveMuted: jest.fn(),
    dispose: jest.fn(),
    publish,
  })),
}));

interface MockSpeakingAnalysis {
  attach: jest.Mock;
  detach: jest.Mock;
  setEffectiveMuted: jest.Mock;
  dispose: jest.Mock;
  publish: (userIds: string[]) => void;
}

function latestSpeakingAnalysis(): MockSpeakingAnalysis | undefined {
  const results = (VoiceSpeakingAnalysis as unknown as jest.Mock).mock.results;
  return results[results.length - 1]?.value as MockSpeakingAnalysis | undefined;
}

// Mock voice sounds to prevent real AudioContext
jest.mock("../lib/voiceSounds", () => ({
  ...jest.requireActual("../lib/voiceSounds"),
  cancelVoiceSoundSession: jest.fn(),
  playJoinSound: jest.fn(),
  playLeaveSound: jest.fn(),
  playMuteSound: jest.fn(),
  playUnmuteSound: jest.fn(),
  playDeafenSound: jest.fn(),
  playUndeafenSound: jest.fn(),
  playUserJoinedSound: jest.fn(),
  playUserLeftSound: jest.fn(),
  playScreenShareStartedSound: jest.fn(),
  playScreenViewerJoinedSound: jest.fn(),
  playScreenViewerLeftSound: jest.fn(),
  markUserInteracted: jest.fn(),
  isVoiceSoundsEnabled: jest.fn(() => true),
  setVoiceSoundsEnabled: jest.fn(),
}));

// Mock the socket
const mockSocket = {
  connected: true,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  close: jest.fn(),
};
function installSuccessfulVoiceAcknowledgements() {
  mockSocket.emit.mockImplementation((event: string, payload?: { muted?: boolean }, acknowledgement?: (result: unknown) => void) => {
    if (typeof acknowledgement !== "function") return;
    if (event === "voice:join") acknowledgement({ ok: true, isMuted: false });
    else if (event === "voice:authorize-join") acknowledgement({ ok: true });
    else if (event === "voice:mute") acknowledgement({ ok: true, isMuted: payload?.muted === true });
  });
}
jest.mock("../lib/ws", () => ({
  getSocket: jest.fn(() => mockSocket),
  connectWs: jest.fn(() => mockSocket),
  disconnectWs: jest.fn(),
}));

// Mock MediaStream and related APIs
const mockAudioTrack = { enabled: true, stop: jest.fn(), kind: "audio" };
const mockScreenVideoTrack: { enabled: boolean; stop: jest.Mock; kind: string; onended: (() => void) | null } = { enabled: true, stop: jest.fn(), kind: "video", onended: null };
const mockScreenAudioTrack = { enabled: true, stop: jest.fn(), kind: "audio" };
const mockStream = {
  getTracks: jest.fn(() => [mockAudioTrack]),
  getAudioTracks: jest.fn(() => [mockAudioTrack]),
};
const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
const mockDisplayStream = {
  getTracks: jest.fn(() => [mockScreenVideoTrack, mockScreenAudioTrack]),
  getVideoTracks: jest.fn(() => [mockScreenVideoTrack]),
  getAudioTracks: jest.fn(() => [mockScreenAudioTrack]),
};
const mockGetDisplayMedia = jest.fn().mockResolvedValue(mockDisplayStream);
Object.defineProperty(global.navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia, getDisplayMedia: mockGetDisplayMedia },
  writable: true,
});

// Mock RTCPeerConnection
let pcIceCandidateCallback: ((e: { candidate: any }) => void) | null = null;
const mockPeerConnection = {
  close: jest.fn(),
  addTrack: jest.fn((track: MediaStreamTrack) => ({ track })),
  setRemoteDescription: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({ sdp: "offer-sdp", type: "offer" }),
  createAnswer: jest.fn().mockResolvedValue({ sdp: "answer-sdp", type: "answer" }),
  setLocalDescription: jest.fn(),
  addIceCandidate: jest.fn(),
  getSenders: jest.fn(() => []),
  getReceivers: jest.fn<RTCRtpReceiver[], []>(() => []),
  set onicecandidate(cb: ((e: { candidate: any }) => void) | null) { pcIceCandidateCallback = cb; },
  get onicecandidate() { return pcIceCandidateCallback; },
  iceConnectionState: "new",
  connectionState: "new",
};
const mockRTCPeerConnection = jest.fn(() => mockPeerConnection);
(global as any).RTCPeerConnection = mockRTCPeerConnection;

(global as any).RTCIceCandidate = jest.fn();
(global as any).RTCSessionDescription = jest.fn();
global.MediaStream = TestMediaStream as unknown as typeof MediaStream;
HTMLAudioElement.prototype.play = jest.fn().mockResolvedValue(undefined);
HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);

// Track audio elements created
let audioElementsCreated: HTMLAudioElement[] = [];
let observeAudioSource: ((audio: HTMLAudioElement) => void) | null = null;
const origCreateElement = document.createElement.bind(document);
jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
  const el = origCreateElement(tagName, options);
  if (tagName === "audio") {
    audioElementsCreated.push(el as HTMLAudioElement);
    if (observeAudioSource) {
      let source: MediaStream | null = null;
      Object.defineProperty(el, "srcObject", {
        get: () => source,
        set: (value: MediaStream | null) => {
          source = value;
          if (value) observeAudioSource?.(el as HTMLAudioElement);
        },
      });
    }
  }
  return el;
});

function VoiceTest({ canConnect = true, canSpeak = true, selectedServer = "server-1", authenticated = true }: { canConnect?: boolean; canSpeak?: boolean; selectedServer?: string; authenticated?: boolean } = {}) {
  const voice = useVoice(
    selectedServer,
    authenticated,
    "my-user-id",
    "myuser",
    "My User",
    (_channelId, capability) => capability === "CONNECT" ? canConnect : canSpeak,
  );
  const personalMixVoice = voice as typeof voice & {
    getVoicePersonalMixPreference?: (targetUserId: string) => { volumePercent: number; locallyMuted: boolean };
    setVoicePersonalMixPreference?: (
      targetUserId: string,
      update: Partial<{ volumePercent: number; locallyMuted: boolean }>,
    ) => void;
  };
  const remotePersonalMix = personalMixVoice.getVoicePersonalMixPreference?.("remote-id");
  const otherPersonalMix = personalMixVoice.getVoicePersonalMixPreference?.("other-id");
  const selfPersonalMix = personalMixVoice.getVoicePersonalMixPreference?.("my-user-id");
  return (
    <div>
      <div data-testid="status">{voice.status}</div>
      <div data-testid="channel">{voice.channelId || "none"}</div>
      <div data-testid="muted">{voice.isMuted ? "true" : "false"}</div>
      <div data-testid="deafened">{voice.isDeafened ? "true" : "false"}</div>
      <div data-testid="error">{voice.error || "none"}</div>
      <div data-testid="members">{voice.members.length}</div>
      <div data-testid="members-list">
        {voice.members.map((m) => `${m.displayName}(${m.userId.slice(0, 6)})`).join(",")}
      </div>
      <div data-testid="speaking-users">{voice.speakingUserIds.join(",") || "none"}</div>
      <div data-testid="remote-personal-mix">
        {remotePersonalMix ? `${remotePersonalMix.volumePercent}:${remotePersonalMix.locallyMuted}` : "unavailable"}
      </div>
      <div data-testid="mix-status">{voice.getVoicePersonalMixStatus("remote-id")}</div>
      <button data-testid="retry-mix-btn" onClick={() => voice.retryVoicePersonalMix("remote-id")}>Retry mix</button>
      <div data-testid="other-personal-mix">
        {otherPersonalMix ? `${otherPersonalMix.volumePercent}:${otherPersonalMix.locallyMuted}` : "unavailable"}
      </div>
      <div data-testid="self-personal-mix">
        {selfPersonalMix ? `${selfPersonalMix.volumePercent}:${selfPersonalMix.locallyMuted}` : "unavailable"}
      </div>
      <div data-testid="screen-shares">{voice.screenShares.map((share) => share.shareId).join(",") || "none"}</div>
      <div data-testid="subscribed-shares">{voice.subscribedShareIds.join(",") || "none"}</div>
      <div data-testid="viewer-ids">{Object.values(voice.presenterViewerIds).flat().join(",") || "none"}</div>
      <div data-testid="presenter-viewers">{JSON.stringify(voice.presenterViewerIds)}</div>
      <div data-testid="local-preview">{voice.localScreenStream ? "shown" : "none"}</div>
      <div data-testid="screen-share-status">{voice.screenShareStatus}</div>
      <div data-testid="stop-feedback">{voice.screenShareFeedback || "none"}</div>
      <div data-testid="stream-notice">{voice.streamNotice || "none"}</div>
      <button data-testid="join-btn" onClick={() => voice.join("voice-1")}>Join</button>
      <button data-testid="leave-btn" onClick={voice.leave}>Leave</button>
      <button data-testid="mute-btn" onClick={voice.toggleMute}>Mute</button>
      <button data-testid="deafen-btn" onClick={voice.toggleDeafen}>Deafen</button>
      <button data-testid="remote-volume-50-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: 50 })}>Remote 50</button>
      <button data-testid="remote-volume-150-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: 150 })}>Remote 150</button>
      <button data-testid="remote-volume-negative-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: -20 })}>Remote negative</button>
      <button data-testid="remote-volume-nan-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: Number.NaN })}>Remote NaN</button>
      <button data-testid="remote-volume-0-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: 0 })}>Remote 0</button>
      <button data-testid="remote-volume-25-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { volumePercent: 25 })}>Remote 25</button>
      <button data-testid="remote-mute-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { locallyMuted: true })}>Mute remote</button>
      <button data-testid="remote-unmute-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("remote-id", { locallyMuted: false })}>Unmute remote</button>
      <button data-testid="self-volume-50-btn" onClick={() => personalMixVoice.setVoicePersonalMixPreference?.("my-user-id", { volumePercent: 50 })}>Self 50</button>
      <button data-testid="clear-error-btn" onClick={voice.clearError}>Clear</button>
      <button data-testid="start-share-btn" onClick={voice.startScreenShare}>Start share</button>
      <button data-testid="stop-share-btn" onClick={voice.stopScreenShare}>Stop share</button>
      <button data-testid="join-share-a-btn" onClick={() => voice.joinScreenShare("share-a")}>Join share A</button>
      <button data-testid="leave-share-a-btn" onClick={() => voice.leaveScreenShare("share-a")}>Leave share A</button>
    </div>
  );
}

function triggerWsEvent(event: string, data: any) {
  mockSocket.on.mock.calls.filter((call: string[]) => call[0] === event).forEach((handler: any[]) => handler[1](data));
}

function makeRemoteAudioMedia(userLabel: string, withVideo = false) {
  const trackValue = {
    id: `${userLabel}-audio-track`,
    kind: "audio",
    enabled: true,
    muted: false,
    readyState: "live",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const track = trackValue as unknown as MediaStreamTrack;
  const videoTracks = withVideo ? [{ id: `${userLabel}-video-track`, kind: "video" }] : [];
  const stream = {
    id: `${userLabel}-stream`,
    getTracks: jest.fn(() => [track, ...videoTracks] as MediaStreamTrack[]),
    getAudioTracks: jest.fn(() => [track]),
    getVideoTracks: jest.fn(() => videoTracks as MediaStreamTrack[]),
  } as unknown as MediaStream;
  return { track, stream, end: () => { trackValue.readyState = "ended"; } };
}

describe("useVoice hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(voiceMixApi.list).mockReset().mockResolvedValue([]);
    jest.mocked(voiceMixApi.put).mockReset().mockResolvedValue({ targetUserId: "remote-id", volumePercent: 25, muted: false });
    jest.mocked(voiceMixApi.reset).mockReset().mockResolvedValue(undefined);
    mockSocket.connected = true;
    mockAudioTrack.enabled = true;
    mockAudioTrack.stop.mockClear();
    mockPeerConnection.close.mockClear();
    mockPeerConnection.addTrack.mockClear();
    mockPeerConnection.getReceivers.mockReset().mockReturnValue([]);
    (mockPeerConnection as typeof mockPeerConnection & { signalingState?: string }).signalingState = undefined;
    mockSocket.emit.mockClear();
    installSuccessfulVoiceAcknowledgements();
    mockGetUserMedia.mockReset();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockGetDisplayMedia.mockResolvedValue(mockDisplayStream);
    mockScreenVideoTrack.onended = null;
    mockScreenVideoTrack.stop.mockClear();
    mockScreenAudioTrack.stop.mockClear();
    audioElementsCreated = [];
    observeAudioSource = null;
  });

  describe("CALL inbound diagnostic hook seam", () => {
    const api = () => (window as Window & { __likecordVoiceDiagnostics?: VoiceDiagnosticsApi }).__likecordVoiceDiagnostics;
    let debugLog: jest.SpyInstance;
    beforeEach(() => {
      jest.useFakeTimers(); window.localStorage.removeItem("debugVoice"); window.history.replaceState({}, "", "/");
      debugLog = jest.spyOn(console, "log").mockImplementation(() => {});
    });
    afterEach(() => { debugLog.mockRestore(); window.history.replaceState({}, "", "/"); jest.useRealTimers(); });
    async function setup(enabled = true) {
      if (enabled) window.history.replaceState({}, "", "/?debugVoice=1");
      const view = render(<VoiceTest />);
      await act(async () => { screen.getByTestId("join-btn").click(); });
      await act(async () => { triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-offer" }); });
      const microphone = makeRemoteAudioMedia("diagnostic-call");
      const getStats = jest.fn().mockResolvedValue(new Map([["private", {
        id: "private", type: "inbound-rtp", kind: "audio", timestamp: 1000, packetsReceived: 20,
      }]]));
      const receiver = { track: microphone.track, getStats } as unknown as RTCRtpReceiver;
      mockPeerConnection.getReceivers.mockReturnValue([receiver]);
      const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
      act(() => pc.ontrack?.({ track: microphone.track, streams: [microphone.stream], receiver } as RTCTrackEvent));
      return { ...view, microphone, receiver, getStats, pc };
    }

    it("T01: default Voice exposes no CALL stats API and never polls", async () => {
      const f = await setup(false);
      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(api()).toBeUndefined();
      expect(f.getStats).not.toHaveBeenCalled();
      f.unmount();
    });

    it("T02/T15: waits for final production CALL classification and excludes Screen/unknown receivers", async () => {
      const f = await setup();
      expect((await api()!.callInboundStats()).receivers).toEqual([]);
      expect(f.getStats).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(60); });
      await act(async () => {
        triggerWsEvent("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "remote-id" });
        triggerWsEvent("screen:viewer-joined", { shareId: "share-a", viewerId: "my-user-id" });
      });
      const screenMedia = makeRemoteAudioMedia("diagnostic-screen", true);
      const screenStats = jest.fn();
      const screenReceiver = { track: screenMedia.track, getStats: screenStats } as unknown as RTCRtpReceiver;
      const unknownReceiver = { track: makeRemoteAudioMedia("unknown").track, getStats: jest.fn() } as unknown as RTCRtpReceiver;
      mockPeerConnection.getReceivers.mockReturnValue([screenReceiver, unknownReceiver, f.receiver]);
      act(() => f.pc.ontrack?.({ track: screenMedia.track, streams: [screenMedia.stream], receiver: screenReceiver } as RTCTrackEvent));
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(f.getStats).not.toHaveBeenCalled(); // Enabling debug alone is not polling.
      const beforeScreen = api()!.snapshot("screen-before-call-stats").shares;
      const signalCount = mockSocket.emit.mock.calls.length;
      const logCount = debugLog.mock.calls.length;
      const snapshot = await api()!.callInboundStats();
      expect(snapshot.receivers).toEqual([expect.objectContaining({ alias: "call-1", status: "ok" })]);
      expect(f.getStats).toHaveBeenCalledTimes(1);
      expect(screenStats).not.toHaveBeenCalled();
      expect(unknownReceiver.getStats).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledTimes(signalCount);
      expect(debugLog).toHaveBeenCalledTimes(logCount);
      expect(api()!.snapshot("screen-after-call-stats").shares).toEqual(beforeScreen);
      await expect(api()!.screenAudioStats!()).resolves.toEqual([]);
      f.unmount();
    });

    it.each([0, 60])("T02: late video revokes CALL ownership (classification wait %i ms)", async classificationWait => {
      const f = await setup();
      await act(async () => { jest.advanceTimersByTime(classificationWait); });
      const before = await api()!.callInboundStats();
      expect(before.receivers).toHaveLength(classificationWait ? 1 : 0);
      f.getStats.mockClear();
      await act(async () => {
        triggerWsEvent("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "remote-id" });
        triggerWsEvent("screen:viewer-joined", { shareId: "share-a", viewerId: "my-user-id" });
      });
      const video = { id: "late-video", kind: "video", readyState: "live" } as MediaStreamTrack;
      act(() => f.pc.ontrack?.({ track: video, streams: [f.microphone.stream] } as RTCTrackEvent));
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect((await api()!.callInboundStats()).receivers).toEqual([]);
      expect(f.getStats).not.toHaveBeenCalled();
      f.unmount();
    });

    it("T11: participant departure prunes diagnostic ownership and excludes late samples", async () => {
      const f = await setup();
      await act(async () => { jest.advanceTimersByTime(60); });
      await api()!.callInboundStats();
      f.getStats.mockClear();
      let resolve!: (value: unknown) => void;
      f.getStats.mockReturnValue(new Promise(done => { resolve = done; }));
      const pending = api()!.callInboundStats();
      await act(async () => { triggerWsEvent("voice:user-left", { userId: "remote-id" }); });
      resolve(new Map());
      expect((await pending).receivers).toEqual([]);
      await api()!.callInboundStats();
      expect(f.getStats).toHaveBeenCalledTimes(1);
      expect(f.microphone.track.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function));
      f.unmount();
    });

    it.each(["leave", "reset", "unmount"])("T12: %s invalidates pending reads and disables stale API use", async action => {
      const f = await setup();
      await act(async () => { jest.advanceTimersByTime(60); });
      const savedApi = api()!;
      let resolve!: (value: unknown) => void;
      f.getStats.mockReturnValue(new Promise(done => { resolve = done; }));
      const pending = savedApi.callInboundStats();
      await act(async () => {
        if (action === "leave") screen.getByTestId("leave-btn").click();
        else if (action === "reset") f.rerender(<VoiceTest authenticated={false} />);
        else f.unmount();
      });
      resolve(new Map());
      expect(await pending).toEqual({ status: "inactive", receivers: [] });
      expect(await savedApi.callInboundStats()).toEqual({ status: "inactive", receivers: [] });
      await act(async () => { jest.advanceTimersByTime(5000); });
      expect(f.getStats).toHaveBeenCalledTimes(1);
      f.unmount();
    });

    it("clear restarts aliases/baselines without changing media", async () => {
      const f = await setup();
      await act(async () => { jest.advanceTimersByTime(60); });
      await api()!.callInboundStats();
      api()!.clear();
      const snapshot = await api()!.callInboundStats();
      expect(snapshot.receivers[0]).toEqual(expect.objectContaining({ alias: "call-1", streams: [expect.objectContaining({ baseline: "new", delta: {} })] }));
      expect(f.microphone.track.readyState).toBe("live");
      f.unmount();
    });
  });

  it("F6-C2B-STATE-01: an unknown remote target uses the default personal mix", async () => {
    await act(async () => { render(<VoiceTest />); });

    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("100:false");
  });

  it("F6-C2B-STATE-02: a targetUserId update does not alter another target", async () => {
    await act(async () => { render(<VoiceTest />); });

    act(() => { screen.getByTestId("remote-volume-50-btn").click(); });

    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("50:false");
    expect(screen.getByTestId("other-personal-mix")).toHaveTextContent("100:false");
  });

  it("F6-C2B-STATE-03: personal volume is clamped to the inclusive 0-100 range", async () => {
    await act(async () => { render(<VoiceTest />); });

    act(() => { screen.getByTestId("remote-volume-150-btn").click(); });
    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("100:false");

    act(() => { screen.getByTestId("remote-volume-negative-btn").click(); });
    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("0:false");
  });

  it("F6-C2B-STATE-04: the listener cannot create a personal mix preference for self", async () => {
    await act(async () => { render(<VoiceTest />); });

    act(() => { screen.getByTestId("self-volume-50-btn").click(); });

    expect(screen.getByTestId("self-personal-mix")).toHaveTextContent("100:false");
  });

  it("F6-C2B-STATE-05: a non-finite volume update preserves the current safe value", async () => {
    await act(async () => { render(<VoiceTest />); });
    act(() => { screen.getByTestId("remote-volume-50-btn").click(); });

    act(() => { screen.getByTestId("remote-volume-nan-btn").click(); });

    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("50:false");
  });

  it("F6-C3-OBSERVER: hydrates and saves outside Voice without media/signaling", async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(voiceMixApi.list).mockResolvedValue([{ targetUserId: "remote-id", volumePercent: 20, muted: true }]);
      await act(async () => { render(<VoiceTest />); });
      expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("20:true");
      act(() => { screen.getByTestId("remote-volume-25-btn").click(); });
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(voiceMixApi.put).toHaveBeenCalledWith("remote-id", { volumePercent: 25, muted: true }, expect.any(AbortSignal));
      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(mockGetDisplayMedia).not.toHaveBeenCalled();
      expect(mockRTCPeerConnection).not.toHaveBeenCalled();
      expect(audioElementsCreated).toHaveLength(0);
      expect(VoiceSpeakingAnalysis).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });

  it.each([{ volumePercent: 20, muted: false }, { volumePercent: 100, muted: true }])(
    "F6-C3-RACE: saved %j applies before any current/new sink can become audible",
    async (saved) => {
      let resolveLoad!: (rows: VoiceMixPreference[]) => void;
      const load = new Promise<VoiceMixPreference[]>((resolve) => { resolveLoad = resolve; });
      jest.mocked(voiceMixApi.list).mockReturnValueOnce(load);
      const atSourceAttachment: Array<{ volume: number; muted: boolean }> = [];
      const atAudibleUnmute: number[] = [];
      const mutedSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "muted")!.set!;
      const mutedSpy = jest.spyOn(HTMLMediaElement.prototype, "muted", "set").mockImplementation(function (this: HTMLAudioElement, value: boolean) {
        mutedSetter.call(this, value);
        if (!value && this.srcObject && this.dataset.audioOwner === "CALL_MIC_AUDIO") atAudibleUnmute.push(this.volume);
      });
      try {
        observeAudioSource = (audio) => { atSourceAttachment.push({ volume: audio.volume, muted: audio.muted }); };
        render(<VoiceTest />);
        await act(async () => { screen.getByTestId("join-btn").click(); });
        await act(async () => { triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" }); });
        const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
        const microphone = makeRemoteAudioMedia("hydration-race");
        act(() => pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent));
        const sink = audioElementsCreated[0];
        expect(sink).toBeDefined();
        expect(sink.muted).toBe(true);
        expect(atSourceAttachment).toEqual([{ volume: 0, muted: true }]);

        // Deafen/undeafen must not bypass the loading guard.
        act(() => { screen.getByTestId("deafen-btn").click(); });
        act(() => { screen.getByTestId("deafen-btn").click(); });
        expect(sink.muted).toBe(true);
        await act(async () => resolveLoad([{ targetUserId: "remote-id", ...saved }]));
        expect(sink.volume).toBe(0);
        expect(sink.muted).toBe(true);
        expect(audioElementsCreated).toHaveLength(1);

        // A later track must also be configured before srcObject/autoplay.
        microphone.end();
        const replacement = makeRemoteAudioMedia("hydration-replacement");
        act(() => pc.ontrack?.({ track: replacement.track, streams: [replacement.stream] } as RTCTrackEvent));
        expect(atSourceAttachment[1]).toEqual({ volume: 0, muted: true });
        expect(audioElementsCreated.filter((audio) => audio.srcObject)).toHaveLength(1);
        expect(mockSocket.emit.mock.calls.some((call: unknown[]) => String(call[0]).includes("mix"))).toBe(false);
        expect(atAudibleUnmute).toEqual([]);
      } finally { mutedSpy.mockRestore(); }
    },
  );

  it("F6-C3-LOAD-FAILURE: current CALL/MIC stays silent until retry; Screen Share stays independent", async () => {
    jest.mocked(voiceMixApi.list).mockRejectedValueOnce(new Error("offline"));
    await act(async () => { render(<VoiceTest />); });
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" }); });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    const microphone = makeRemoteAudioMedia("load-failure-mic");
    const screenMedia = makeRemoteAudioMedia("load-failure-screen", true);
    act(() => {
      pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent);
      pc.ontrack?.({ track: screenMedia.track, streams: [screenMedia.stream] } as RTCTrackEvent);
    });
    const callSink = audioElementsCreated.find((audio) => audio.dataset.audioOwner === "CALL_MIC_AUDIO")!;
    const screenSink = audioElementsCreated.find((audio) => audio.dataset.screenTrackId === screenMedia.track.id)!;
    expect(callSink.muted).toBe(true);
    expect(screenSink.muted).toBe(true);
    expect(screen.getByTestId("mix-status")).toHaveTextContent("load-error");
    jest.mocked(voiceMixApi.list).mockResolvedValueOnce([{ targetUserId: "remote-id", volumePercent: 20, muted: true }]);
    await act(async () => { screen.getByTestId("retry-mix-btn").click(); });
    expect(callSink.volume).toBe(0);
    expect(callSink.muted).toBe(true);
    expect(screenSink.volume).toBe(0);
    expect(screenSink.muted).toBe(true);
    expect(audioElementsCreated).toHaveLength(2);
    expect(VoiceSpeakingAnalysis).toHaveBeenCalledTimes(1);
  });

  // Test 1: join requests microphone
  it("join requests microphone permission", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true }));
  });

  // Test 2: join emits voice:join
  it("PERM-UI-30: voice join signaling remains unchanged", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith("voice:join", expect.objectContaining({ serverId: "server-1", channelId: "voice-1" }), expect.any(Function));
    });
  });

  // Test 3: local user appears in own member list after join
  it("local user appears in own member list after join", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => {
      const list = screen.getByTestId("members-list").textContent;
      expect(list).toContain("My User");
      expect(screen.getByTestId("members")).toHaveTextContent("1");
    });
  });

  // Test 4: voice:state adds remote members with displayName
  it("voice:state adds remote members with displayName", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    await act(async () => {
      triggerWsEvent("voice:state", {
        members: [{ userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false }],
      });
    });
    const list = screen.getByTestId("members-list").textContent;
    expect(list).toContain("Bob");
    expect(screen.getByTestId("members")).toHaveTextContent("2");
  });

  // Test 5: voice:user-joined adds remote member with displayName
  it("voice:user-joined adds remote member with displayName", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "alice-id", username: "alice", displayName: "Alice" });
    });
    const list = screen.getByTestId("members-list").textContent;
    expect(list).toContain("Alice");
  });

  // Test 6: displayName shown instead of raw UUID
  it("shows displayName not raw UUID for members", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => {
      const list = screen.getByTestId("members-list").textContent;
      expect(list).toContain("My User");
      expect(list).not.toContain("my-user-id");
    });

    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "charlie-id", username: "charlie", displayName: "Charlie" });
    });
    const list2 = screen.getByTestId("members-list").textContent;
    expect(list2).toContain("Charlie");
    expect(list2).not.toContain("charlie-id");
  });

  // Test 7: leave stops local tracks
  it("leave stops local audio tracks", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("leave-btn").click(); });
    expect(mockAudioTrack.stop).toHaveBeenCalled();
  });

  // Test 8: mute toggles local audio track enabled state
  it("mute toggles local audio track enabled state", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(mockAudioTrack.enabled).toBe(false);
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
  });

  it("VA1 retains local/remote cue audiences and mute/deafen/leave feedback without changing SFX preference", async () => {
    const sounds = jest.requireMock("../lib/voiceSounds");
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    expect(sounds.playJoinSound).toHaveBeenCalledWith("my-user-id");
    await act(async () => { triggerWsEvent("voice:user-joined", { userId: "my-user-id", username: "me", displayName: "Me" }); });
    expect(sounds.playUserJoinedSound).not.toHaveBeenCalled();
    await act(async () => { triggerWsEvent("voice:user-joined", { userId: "remote-id", username: "other", displayName: "Other" }); });
    expect(sounds.playUserJoinedSound).toHaveBeenCalledWith("my-user-id");
    await act(async () => { triggerWsEvent("voice:user-left", { userId: "remote-id" }); });
    expect(sounds.playUserLeftSound).toHaveBeenCalledWith("my-user-id");
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(sounds.playMuteSound).toHaveBeenCalledWith("my-user-id");
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(sounds.playUnmuteSound).toHaveBeenCalledWith("my-user-id");
    act(() => { screen.getByTestId("deafen-btn").click(); });
    expect(sounds.playDeafenSound).toHaveBeenCalledWith("my-user-id");
    act(() => { screen.getByTestId("deafen-btn").click(); });
    expect(sounds.playUndeafenSound).toHaveBeenCalledWith("my-user-id");
    expect(mockAudioTrack.enabled).toBe(false);
    await act(async () => { screen.getByTestId("leave-btn").click(); });
    expect(sounds.cancelVoiceSoundSession).toHaveBeenCalledWith("my-user-id");
    expect(sounds.playLeaveSound).toHaveBeenCalledWith("my-user-id");
    expect(sounds.setVoiceSoundsEnabled).not.toHaveBeenCalled();
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  });

  it("CHPERM-LIFE-34/35: CONNECT revocation tears down the call once without reconnecting", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    const joinsBeforeRevocation = mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join").length;

    await act(async () => { triggerWsEvent("voice:permission-revoked", { serverId: "server-1", reason: "CONNECT" }); });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("disconnected"));
    expect(screen.getByTestId("channel")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent("Voice access was revoked for this channel");
    expect(mockAudioTrack.stop).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join")).toHaveLength(joinsBeforeRevocation);
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:leave")).toHaveLength(1);
  });

  it("CHPERM-LIFE-36: SPEAK revocation preserves CONNECT and stops microphone sending", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    await act(async () => { triggerWsEvent("voice:speak-permission-revoked", { serverId: "server-1" }); });

    expect(screen.getByTestId("status")).toHaveTextContent("connected");
    expect(screen.getByTestId("channel")).toHaveTextContent("voice-1");
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(mockAudioTrack.enabled).toBe(false);
    expect(mockAudioTrack.stop).not.toHaveBeenCalled();
  });

  it("CHPERM-LIFE-61: denied CONNECT blocks normal rejoin before microphone acquisition", async () => {
    const view = render(<VoiceTest canConnect />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { triggerWsEvent("voice:permission-revoked", { serverId: "server-1", reason: "CONNECT" }); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("disconnected"));

    view.rerender(<VoiceTest canConnect={false} />);
    mockGetUserMedia.mockClear();
    const authorizedJoinCalls = mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:authorize-join").length;
    await act(async () => { screen.getByTestId("join-btn").click(); });

    expect(screen.getByTestId("status")).toHaveTextContent("failed");
    expect(screen.getByTestId("channel")).toHaveTextContent("none");
    expect(mockGetUserMedia).not.toHaveBeenCalled();
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:authorize-join")).toHaveLength(authorizedJoinCalls);
  });

  it("CHPERM-LIFE-63: denied SPEAK prevents normal Unmute and keeps Voice connected", async () => {
    const view = render(<VoiceTest canSpeak />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { triggerWsEvent("voice:speak-permission-revoked", { serverId: "server-1" }); });
    view.rerender(<VoiceTest canSpeak={false} />);
    mockSocket.emit.mockClear();

    await act(async () => { screen.getByTestId("mute-btn").click(); });

    expect(screen.getByTestId("status")).toHaveTextContent("connected");
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(mockAudioTrack.enabled).toBe(false);
    expect(mockSocket.emit.mock.calls.some((call: unknown[]) => call[0] === "voice:mute")).toBe(false);
  });

  it("CHPERM-LIFE-64: rejected Unmute acknowledgement cannot enable the microphone", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(mockAudioTrack.enabled).toBe(false);

    mockSocket.emit.mockImplementation((event: string, payload?: { muted?: boolean }, acknowledgement?: (result: unknown) => void) => {
      if (typeof acknowledgement !== "function") return;
      if (event === "voice:mute" && payload?.muted === false) {
        acknowledgement({ ok: false, code: "MISSING_SPEAK_PERMISSION", message: "You cannot speak in this channel", isMuted: true });
      } else acknowledgement({ ok: true, isMuted: payload?.muted === true });
    });
    await act(async () => { screen.getByTestId("mute-btn").click(); });

    expect(screen.getByTestId("status")).toHaveTextContent("connected");
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(screen.getByTestId("error")).toHaveTextContent("You cannot speak in this channel");
    expect(mockAudioTrack.enabled).toBe(false);
  });

  it("CHPERM-LIFE-65: SPEAK restoration requires a deliberate later Unmute", async () => {
    const view = render(<VoiceTest canSpeak />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { triggerWsEvent("voice:speak-permission-revoked", { serverId: "server-1" }); });
    view.rerender(<VoiceTest canSpeak={false} />);
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(mockAudioTrack.enabled).toBe(false);

    view.rerender(<VoiceTest canSpeak />);

    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(mockAudioTrack.enabled).toBe(false);
    await act(async () => { screen.getByTestId("mute-btn").click(); });

    expect(screen.getByTestId("muted")).toHaveTextContent("false");
    expect(mockAudioTrack.enabled).toBe(true);
  });

  it.each(["deafen", "server-mute", "speak-revoked", "leave"])("VA3A: a late Unmute ACK cannot reopen after %s", async (blocker) => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    let pending: ((value: unknown) => void) | undefined;
    mockSocket.emit.mockImplementation((event: string, payload?: { muted?: boolean }, ack?: (value: unknown) => void) => {
      if (event === "voice:mute" && payload?.muted === false) pending = ack;
    });
    act(() => { screen.getByTestId("mute-btn").click(); });
    expect(pending).toBeDefined();
    await act(async () => {
      if (blocker === "deafen") screen.getByTestId("deafen-btn").click();
      else if (blocker === "leave") screen.getByTestId("leave-btn").click();
      else if (blocker === "server-mute") triggerWsEvent("voice:state-updated", { userId: "my-user-id", channelId: "voice-1", serverMuted: true, isMuted: true });
      else triggerWsEvent("voice:speak-permission-revoked", { serverId: "server-1" });
    });
    await act(async () => { pending!({ ok: true, isMuted: false }); });
    expect(mockAudioTrack.enabled).toBe(false);
  });

  it("VA3A: a late self-state echo cannot reopen after deafen and undeafen", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    act(() => { screen.getByTestId("deafen-btn").click(); });
    act(() => { screen.getByTestId("deafen-btn").click(); });
    await act(async () => { triggerWsEvent("voice:state-updated", {
      userId: "my-user-id", channelId: "voice-1", isMuted: false, isDeafened: false,
    }); });
    expect(mockAudioTrack.enabled).toBe(false);
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
  });

  it("VA3A: initial server mute closes capture and unrelated navigation retains call authorization", async () => {
    mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (value: unknown) => void) => {
      if (event === "voice:authorize-join") ack?.({ ok: true });
      if (event === "voice:join") ack?.({ ok: true, isMuted: true, serverMuted: true });
    });
    const view = render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
    expect(mockAudioTrack.enabled).toBe(false);
    view.unmount();
    installSuccessfulVoiceAcknowledgements();
    const call = render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    expect(mockAudioTrack.enabled).toBe(true);
    call.rerender(<VoiceTest selectedServer="server-2" canConnect={false} canSpeak={false} />);
    expect(mockAudioTrack.enabled).toBe(true);
    await act(async () => { triggerWsEvent("voice:speak-permission-revoked", { serverId: "server-1" }); });
    expect(mockAudioTrack.enabled).toBe(false);
  });

  // Test 9: microphone permission failure shows error
  it("microphone permission failure sets error state", async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Microphone permission denied");
      expect(screen.getByTestId("status")).toHaveTextContent("failed");
    });
  });

  // Test 10: voice:user-joined creates peer connection for existing user
  it("voice:user-joined creates PC and sends offer", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    const createOfferCountBefore = mockPeerConnection.createOffer.mock.calls.length;

    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "dave-id", username: "dave", displayName: "Dave" });
    });

    // Wait for PC creation (async)
    await waitFor(() => {
      expect(mockPeerConnection.addTrack).toHaveBeenCalled();
    });
  });

  // Test 11: voice:offer creates PC and sends answer
  it("voice:offer creates PC and sends answer", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    await act(async () => {
      triggerWsEvent("voice:offer", { fromUserId: "eve-id", sdp: "test-sdp" });
    });

    await waitFor(() => {
      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalled();
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("voice:answer", expect.any(Object));
    });
  });

  // Test 12: remote track creates audio element
  it("remote track creates audio element", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    // Trigger voice:offer to create a PC with ontrack
    await act(async () => {
      triggerWsEvent("voice:offer", { fromUserId: "fay-id", sdp: "test-sdp" });
    });

    // Simulate ontrack by calling the callback directly
    // The ontrack handler is set inside the offer handler; we simulate it
    await waitFor(() => {
      // The PC was created, now simulate a track event
      const createdPCs = (global as any).RTCPeerConnection.mock.results;
      const lastPC = createdPCs[createdPCs.length - 1]?.value;
      if (lastPC && lastPC.ontrack) {
        act(() => {
          lastPC.ontrack({ track: { kind: "audio" }, streams: [new MediaStream()] });
        });
      }
    });

    // Check audio elements created
    const audioElements = audioElementsCreated.filter((el) => el.tagName === "AUDIO");
    expect(audioElements.length).toBeGreaterThanOrEqual(1);
  });

  it("F6-C2B-SINK-01: the CALL consumer stays permanently muted while mix state changes independently", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => {
      triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" });
    });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    await waitFor(() => expect(pc.ontrack).toBeDefined());
    const microphone = makeRemoteAudioMedia("personal-mix-current");
    act(() => pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent));
    const callSink = audioElementsCreated.find((element) => element.dataset.audioOwner === "CALL_MIC_AUDIO");
    expect(callSink).toBeDefined();
    expect(callSink?.volume).toBe(0);
    expect(callSink?.muted).toBe(true);

    act(() => { screen.getByTestId("remote-volume-50-btn").click(); });
    expect(callSink?.volume).toBe(0);
    expect(callSink?.muted).toBe(true);
    expect(screen.getByTestId("muted")).toHaveTextContent("false");

    act(() => { screen.getByTestId("remote-mute-btn").click(); });
    expect(callSink?.muted).toBe(true);
    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("50:true");

    act(() => { screen.getByTestId("remote-unmute-btn").click(); });
    expect(callSink?.muted).toBe(true);
    expect(callSink?.volume).toBe(0);

    act(() => { screen.getByTestId("deafen-btn").click(); });
    expect(callSink?.muted).toBe(true);
    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("50:false");

    act(() => { screen.getByTestId("deafen-btn").click(); });
    expect(callSink?.muted).toBe(true);
    expect(callSink?.volume).toBe(0);
    expect(screen.getByTestId("muted")).toHaveTextContent("true");
  });

  it("F6-C2B-SINK-02: observer preference applies before new and replacement CALL/MIC playback", async () => {
    await act(async () => { render(<VoiceTest />); });

    act(() => {
      screen.getByTestId("remote-volume-25-btn").click();
      screen.getByTestId("remote-mute-btn").click();
    });
    expect(mockGetUserMedia).not.toHaveBeenCalled();
    expect(mockRTCPeerConnection).not.toHaveBeenCalled();
    expect(audioElementsCreated).toHaveLength(0);
    expect(VoiceSpeakingAnalysis).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();

    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => {
      triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" });
    });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    await waitFor(() => expect(pc.ontrack).toBeDefined());
    const firstMicrophone = makeRemoteAudioMedia("personal-mix-first");
    act(() => pc.ontrack?.({ track: firstMicrophone.track, streams: [firstMicrophone.stream] } as RTCTrackEvent));
    const firstSink = audioElementsCreated.find((element) => element.dataset.audioOwner === "CALL_MIC_AUDIO");
    expect(firstSink?.volume).toBe(0);
    expect(firstSink?.muted).toBe(true);
    expect(latestSpeakingAnalysis()?.attach).toHaveBeenCalledWith(
      "remote-id",
      firstMicrophone.stream,
      firstMicrophone.track,
      false,
    );

    firstMicrophone.end();
    const replacementMicrophone = makeRemoteAudioMedia("personal-mix-replacement");
    act(() => pc.ontrack?.({ track: replacementMicrophone.track, streams: [replacementMicrophone.stream] } as RTCTrackEvent));
    const currentCallSinks = audioElementsCreated.filter((element) =>
      element.dataset.audioOwner === "CALL_MIC_AUDIO" && element.srcObject !== null,
    );
    expect(currentCallSinks).toHaveLength(1);
    expect(currentCallSinks[0].volume).toBe(0);
    expect(currentCallSinks[0].muted).toBe(true);
    expect(firstSink?.srcObject).toBeNull();
  });

  it("F6-C2B-SPEAKING-01: zero volume and local mute do not suppress C2A microphone activity", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" }); });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    await waitFor(() => expect(pc.ontrack).toBeDefined());
    const microphone = makeRemoteAudioMedia("personal-mix-speaking");
    act(() => pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent));
    const analysis = latestSpeakingAnalysis();
    const attachCount = analysis?.attach.mock.calls.length;

    act(() => {
      screen.getByTestId("remote-volume-0-btn").click();
      screen.getByTestId("remote-mute-btn").click();
      analysis?.publish(["remote-id"]);
    });

    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("0:true");
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("remote-id");
    expect(analysis?.attach).toHaveBeenCalledTimes(attachCount ?? 0);
    expect(analysis?.detach).not.toHaveBeenCalledWith("remote-id");
    expect(VoiceSpeakingAnalysis).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit.mock.calls.some((call: unknown[]) => String(call[0]).includes("speaking"))).toBe(false);
  });

  it("F6-C2B-SCREEN-01: Voice personal mix leaves Screen Share audio and sink cardinality unchanged", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" }); });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    await waitFor(() => expect(pc.ontrack).toBeDefined());
    const microphone = makeRemoteAudioMedia("personal-mix-microphone");
    const screenMedia = makeRemoteAudioMedia("personal-mix-screen", true);
    act(() => {
      pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent);
      pc.ontrack?.({ track: screenMedia.track, streams: [screenMedia.stream] } as RTCTrackEvent);
      screen.getByTestId("remote-volume-25-btn").click();
      screen.getByTestId("remote-mute-btn").click();
    });

    const callSink = audioElementsCreated.find((element) => element.dataset.audioOwner === "CALL_MIC_AUDIO");
    const screenSink = audioElementsCreated.find((element) => element.dataset.screenTrackId === screenMedia.track.id);
    expect(callSink?.volume).toBe(0);
    expect(callSink?.muted).toBe(true);
    expect(screenSink?.volume).toBe(0);
    expect(screenSink?.muted).toBe(true);
    expect(audioElementsCreated).toHaveLength(2);
    expect(latestSpeakingAnalysis()?.attach.mock.calls.filter((call: unknown[]) => call[0] === "remote-id")).toHaveLength(1);
  });

  it("F6-C2B-RECONNECT-01: fail-closed teardown preserves memory without causing automatic rejoin", async () => {
    await act(async () => { render(<VoiceTest />); });
    act(() => {
      screen.getByTestId("remote-volume-25-btn").click();
      screen.getByTestId("remote-mute-btn").click();
    });
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    const joinCount = mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join").length;

    mockSocket.connected = false;
    await act(async () => { triggerWsEvent("disconnect", "transport close"); });
    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("remote-personal-mix")).toHaveTextContent("25:true");

    mockSocket.connected = true;
    await act(async () => { triggerWsEvent("connect"); });
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join")).toHaveLength(joinCount);
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  });

  it("F6-C2A-INTEGRATION-01: reuses the owned local microphone and publishes no speaking realtime", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    const analysis = latestSpeakingAnalysis();
    expect(VoiceSpeakingAnalysis).toHaveBeenCalledTimes(1);
    expect(analysis?.attach).toHaveBeenCalledWith("my-user-id", mockStream, mockAudioTrack, false);
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit.mock.calls.some((call: unknown[]) => String(call[0]).includes("speaking"))).toBe(false);

    await act(async () => { analysis?.publish(["my-user-id"]); });
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("my-user-id");
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(analysis?.setEffectiveMuted).toHaveBeenCalledWith("my-user-id", true);
  });

  it("F6-C2A-INTEGRATION-02: analyses remote CALL/MIC by userId and excludes Screen Share audio", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => {
      triggerWsEvent("voice:offer", { fromUserId: "remote-id", sdp: "test-sdp" });
    });
    const pc = mockPeerConnection as typeof mockPeerConnection & { ontrack?: (event: RTCTrackEvent) => void };
    await waitFor(() => expect(pc.ontrack).toBeDefined());
    const microphone = makeRemoteAudioMedia("remote-mic");
    act(() => pc.ontrack?.({ track: microphone.track, streams: [microphone.stream] } as RTCTrackEvent));

    const analysis = latestSpeakingAnalysis();
    expect(analysis?.attach).toHaveBeenCalledWith("remote-id", microphone.stream, microphone.track, false);
    await act(async () => { analysis?.publish(["remote-id"]); });
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("remote-id");

    microphone.end();
    const replacement = makeRemoteAudioMedia("remote-mic-replacement");
    act(() => pc.ontrack?.({ track: replacement.track, streams: [replacement.stream] } as RTCTrackEvent));
    expect(analysis?.attach).toHaveBeenLastCalledWith("remote-id", replacement.stream, replacement.track, false);
    expect(analysis?.attach.mock.calls.filter((call: unknown[]) => call[0] === "remote-id")).toHaveLength(2);

    const screenMedia = makeRemoteAudioMedia("remote-screen", true);
    act(() => pc.ontrack?.({ track: screenMedia.track, streams: [screenMedia.stream] } as RTCTrackEvent));
    expect(analysis?.attach.mock.calls.filter((call: unknown[]) => call[0] === "remote-id")).toHaveLength(2);

    await act(async () => {
      triggerWsEvent("voice:state-updated", { userId: "remote-id", isMuted: true });
    });
    expect(analysis?.setEffectiveMuted).toHaveBeenCalledWith("remote-id", true);
    await act(async () => { triggerWsEvent("voice:user-left", { userId: "remote-id" }); });
    expect(analysis?.detach).toHaveBeenCalledWith("remote-id");
  });

  it("F6-C2A-INTEGRATION-03: leave clears speaking and disposes analysis until deliberate rejoin", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    const firstAnalysis = latestSpeakingAnalysis();
    await act(async () => { firstAnalysis?.publish(["my-user-id"]); });
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("my-user-id");

    await act(async () => { screen.getByTestId("leave-btn").click(); });
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("none");
    expect(firstAnalysis?.dispose).toHaveBeenCalledTimes(1);

    await act(async () => { triggerWsEvent("connect"); });
    expect(VoiceSpeakingAnalysis).toHaveBeenCalledTimes(1);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(VoiceSpeakingAnalysis).toHaveBeenCalledTimes(2));
  });

  // Test 13: leave emits voice:leave
  it("leave emits voice:leave on socket", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("leave-btn").click(); });
    expect(mockSocket.emit).toHaveBeenCalledWith("voice:leave", { channelId: "voice-1" });
  });

  // Test 14: mute emits voice:mute
  it("mute emits voice:mute on socket", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("mute-btn").click(); });
    expect(mockSocket.emit).toHaveBeenCalledWith("voice:mute", { channelId: "voice-1", muted: true, serverId: "server-1" }, expect.any(Function));
  });

  // Test 15: clear error works
  it("clear error clears error state", async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Microphone permission denied"));
    await act(async () => { screen.getByTestId("clear-error-btn").click(); });
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  // Test 16: voice:state with self userId does not duplicate
  it("voice:state does not duplicate local user", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));

    await act(async () => {
      // voice:state might include the joining user — should not duplicate
      triggerWsEvent("voice:state", {
        members: [{ userId: "my-user-id", username: "myuser", displayName: "My User", isMuted: false, isDeafened: false }],
      });
    });
    // Should still be 1 (local user only, no duplicate)
    expect(screen.getByTestId("members")).toHaveTextContent("1");
  });

  // Test 17: voice:user-joined with existing userId does not duplicate
  it("voice:user-joined does not duplicate existing user", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "bob-id", username: "bob", displayName: "Bob" });
    });
    expect(screen.getByTestId("members")).toHaveTextContent("2");
    // Second join event should not duplicate
    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "bob-id", username: "bob", displayName: "Bob" });
    });
    expect(screen.getByTestId("members")).toHaveTextContent("2");
  });

  it("F6-C1-RECONNECT-01: socket loss fails Voice and Screen Share closed without auto-rejoin", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    await act(async () => { screen.getByTestId("start-share-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-started", {
        shareId: "own-share",
        channelId: "voice-1",
        presenterId: "my-user-id",
      });
    });
    await waitFor(() => expect(screen.getByTestId("screen-share-status")).toHaveTextContent("live"));
    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "peer-b", username: "peerb", displayName: "Peer B" });
    });
    await waitFor(() => expect(mockPeerConnection.addTrack).toHaveBeenCalled());
    const speakingAnalysis = latestSpeakingAnalysis();
    await act(async () => { speakingAnalysis?.publish(["my-user-id", "peer-b"]); });
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("my-user-id,peer-b");

    const joinCount = mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join").length;
    mockSocket.connected = false;
    await act(async () => { triggerWsEvent("disconnect", "transport close"); });

    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("channel")).toHaveTextContent("none");
    expect(screen.getByTestId("members")).toHaveTextContent("0");
    expect(screen.getByTestId("screen-share-status")).toHaveTextContent("idle");
    expect(screen.getByTestId("local-preview")).toHaveTextContent("none");
    expect(mockAudioTrack.stop).toHaveBeenCalled();
    expect(mockScreenVideoTrack.stop).toHaveBeenCalled();
    expect(mockScreenAudioTrack.stop).toHaveBeenCalled();
    expect(mockPeerConnection.close).toHaveBeenCalled();
    expect(speakingAnalysis?.dispose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("speaking-users")).toHaveTextContent("none");
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:leave")).toHaveLength(0);

    mockSocket.connected = true;
    await act(async () => { triggerWsEvent("connect"); });
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join")).toHaveLength(joinCount);
    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");

    await act(async () => { screen.getByTestId("join-btn").click(); });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "voice:join")).toHaveLength(joinCount + 1);
  });

  it("F6-C1-RECONNECT-02: the initial socket connection cannot tear down an unowned Voice session", async () => {
    render(<VoiceTest />);
    await act(async () => { triggerWsEvent("connect"); });
    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");
    expect(mockAudioTrack.stop).not.toHaveBeenCalled();
    expect(mockSocket.emit.mock.calls.some((call: unknown[]) => call[0] === "voice:leave")).toBe(false);
  });

  it("UI-STREAM-01: multiple active presenters appear as available streams", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [
        { shareId: "share-a", channelId: "voice-1", presenterId: "alice-id" },
        { shareId: "share-b", channelId: "voice-1", presenterId: "bob-id" },
      ] });
    });
    expect(screen.getByTestId("screen-shares")).toHaveTextContent("share-a,share-b");
  });

  it("UI-STREAM-02: authoritative join confirmation watches A but not B", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [
        { shareId: "share-a", channelId: "voice-1", presenterId: "alice-id" },
        { shareId: "share-b", channelId: "voice-1", presenterId: "bob-id" },
      ] });
      screen.getByTestId("join-share-a-btn").click();
    });
    expect(mockSocket.emit).toHaveBeenCalledWith("screen:viewer-join", { shareId: "share-a" });
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("none");
    await act(async () => { triggerWsEvent("screen:viewer-joined", { shareId: "share-a", viewerId: "my-user-id" }); });
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("share-a");
  });

  it("UI-STREAM-03/04: subscriptions coexist and leaving A preserves B", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:viewer-state", { subscribedShareIds: ["share-a", "share-b"], presenterShares: [] });
      triggerWsEvent("screen:viewer-left", { shareId: "share-a", viewerId: "my-user-id" });
    });
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("share-b");
  });

  it("UI-STREAM-05: own live share is not a viewer subscription", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [
        { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" },
      ] });
    });
    expect(screen.getByTestId("screen-shares")).toHaveTextContent("own-share");
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("none");
  });

  it("UI-STREAM-06: server state replaces stale local subscription state", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:viewer-joined", { shareId: "share-a", viewerId: "my-user-id" });
      triggerWsEvent("screen:viewer-state", { subscribedShareIds: [], presenterShares: [] });
    });
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("none");
  });

  it("UI-PREVIEW-01/04: start sharing uses one local display stream for a muted preview", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("start-share-btn").click(); });
    expect(mockSocket.emit).toHaveBeenCalledWith("screen:share-start", { channelId: "voice-1" });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(mockGetDisplayMedia).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("local-preview")).toHaveTextContent("shown");
  });

  it("UX-SHARE-03/04/05: lifecycle state becomes live only after capture and prevents duplicate actions", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("start-share-btn").click(); screen.getByTestId("start-share-btn").click(); });
    expect(screen.getByTestId("screen-share-status")).toHaveTextContent("starting");
    expect(mockSocket.emit.mock.calls.filter((call: unknown[]) => call[0] === "screen:share-start")).toHaveLength(1);
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(screen.getByTestId("screen-share-status")).toHaveTextContent("live"));
    await act(async () => { screen.getByTestId("stop-share-btn").click(); });
    expect(screen.getByTestId("screen-share-status")).toHaveTextContent("idle");
  });

  it("UI-PREVIEW-02: explicit stop removes the local preview", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(screen.getByTestId("local-preview")).toHaveTextContent("shown"));
    await act(async () => { screen.getByTestId("stop-share-btn").click(); });
    expect(screen.getByTestId("local-preview")).toHaveTextContent("none");
  });

  it("SSUX1: duplicate Stop releases capture once, reports local completion for five seconds without server ACK", async () => {
    jest.useFakeTimers();
    const view = render(<VoiceTest />);
    try {
      await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
      await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
      expect(screen.getByTestId("stop-feedback")).toHaveTextContent("none");
      await act(async () => { screen.getByTestId("stop-share-btn").click(); screen.getByTestId("stop-share-btn").click(); });
      expect(mockScreenVideoTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockScreenAudioTrack.stop).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("local-preview")).toHaveTextContent("none");
      expect(screen.getByTestId("stop-feedback")).toHaveTextContent("Screen sharing stopped on this device");
      expect(screen.getByTestId("status")).toHaveTextContent("connected");
      expect(mockAudioTrack.stop).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(4999); });
      expect(screen.getByTestId("stop-feedback")).toHaveTextContent("Screen sharing stopped on this device");
      act(() => { jest.advanceTimersByTime(1); });
      expect(screen.getByTestId("stop-feedback")).toHaveTextContent("none");
    } finally { view.unmount(); jest.useRealTimers(); }
  });

  it("SSUX1: logout/unmount releases live capture without a misleading success message", async () => {
    const view = render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("start-share-btn").click(); });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    expect(screen.getByTestId("screen-share-status")).toHaveTextContent("live");
    view.rerender(<VoiceTest authenticated={false} />);
    expect(screen.getByTestId("stop-feedback")).toHaveTextContent("none");
    await act(async () => { view.unmount(); });
    expect(mockScreenVideoTrack.stop).toHaveBeenCalledTimes(1);
  });

  it("CHPERM-LIFE-37/38/39/51: authoritative STREAM stop is idempotent and preserves Voice/microphone", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(screen.getByTestId("local-preview")).toHaveTextContent("shown"));
    mockScreenVideoTrack.stop.mockClear();
    mockScreenAudioTrack.stop.mockClear();
    mockAudioTrack.stop.mockClear();

    await act(async () => {
      triggerWsEvent("screen:share-stopped", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" });
      triggerWsEvent("screen:share-stopped", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" });
    });

    expect(screen.getByTestId("local-preview")).toHaveTextContent("none");
    expect(screen.getByTestId("screen-share-status")).toHaveTextContent("idle");
    expect(screen.getByTestId("status")).toHaveTextContent("connected");
    expect(screen.getByTestId("channel")).toHaveTextContent("voice-1");
    expect(mockScreenVideoTrack.stop).toHaveBeenCalledTimes(1);
    expect(mockScreenAudioTrack.stop).toHaveBeenCalledTimes(1);
    expect(mockAudioTrack.stop).not.toHaveBeenCalled();
  });

  it("UI-PREVIEW-03: browser-native track end removes the local preview", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(screen.getByTestId("local-preview")).toHaveTextContent("shown"));
    await act(async () => { mockScreenVideoTrack.onended?.(); });
    expect(screen.getByTestId("local-preview")).toHaveTextContent("none");
  });

  it("UI-VIEWER-01/02/03: presenter viewer state is deduplicated and reacts to join and leave", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [{ shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }] });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("viewer-b");
    expect(screen.getByTestId("stream-notice")).toHaveTextContent("joined your stream");
    await act(async () => { triggerWsEvent("screen:viewer-left", { shareId: "own-share", viewerId: "viewer-b" }); });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");
    expect(screen.getByTestId("stream-notice")).toHaveTextContent("left your stream");
  });

  it("B2C-RECONNECT-01: voice disconnect clears the presenter viewer projection until a deliberate rejoin", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("start-share-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-started", {
        shareId: "own-share",
        channelId: "voice-1",
        presenterId: "my-user-id",
      });
    });
    await waitFor(() => expect(screen.getByTestId("screen-share-status")).toHaveTextContent("live"));

    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "viewer-b", username: "viewerb", displayName: "Viewer B" });
    });
    await waitFor(() => expect(mockPeerConnection.addTrack).toHaveBeenCalledTimes(1));
    await act(async () => {
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("viewer-b");
    expect(mockPeerConnection.addTrack).toHaveBeenCalledTimes(3);

    await act(async () => {
      triggerWsEvent("voice:user-left", { userId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");
    expect(mockPeerConnection.close).toHaveBeenCalledTimes(1);

    const trackCountBeforeVoiceRejoin = mockPeerConnection.addTrack.mock.calls.length;
    await act(async () => {
      triggerWsEvent("voice:user-joined", { userId: "viewer-b", username: "viewerb", displayName: "Viewer B" });
    });
    await waitFor(() => expect(mockPeerConnection.addTrack).toHaveBeenCalledTimes(trackCountBeforeVoiceRejoin + 1));
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");

    await act(async () => {
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("viewer-b");
  });

  it.each([
    ["screen:viewer-left before voice:user-left", ["viewer-left", "user-left"]],
    ["voice:user-left before screen:viewer-left", ["user-left", "viewer-left"]],
  ])("B2C-RECONNECT-02: %s is idempotent and preserves unrelated viewer state", async (_label, order) => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", {
        channelId: "voice-1",
        shares: [
          { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" },
          { shareId: "other-own-share", channelId: "voice-1", presenterId: "my-user-id" },
        ],
      });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-c" });
      triggerWsEvent("screen:viewer-joined", { shareId: "other-own-share", viewerId: "viewer-d" });
    });

    await act(async () => {
      for (const event of order) {
        if (event === "viewer-left") {
          triggerWsEvent("screen:viewer-left", { shareId: "own-share", viewerId: "viewer-b" });
        } else {
          triggerWsEvent("voice:user-left", { userId: "viewer-b" });
        }
      }
    });

    expect(JSON.parse(screen.getByTestId("presenter-viewers").textContent || "{}"))
      .toEqual({ "own-share": ["viewer-c"], "other-own-share": ["viewer-d"] });
  });

  it("B2C-RECONNECT-03: viewer-left updates the visual projection before renegotiation completes", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => { screen.getByTestId("start-share-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-started", {
        shareId: "own-share",
        channelId: "voice-1",
        presenterId: "my-user-id",
      });
      triggerWsEvent("voice:user-joined", { userId: "viewer-b", username: "viewerb", displayName: "Viewer B" });
    });
    await waitFor(() => expect(screen.getByTestId("screen-share-status")).toHaveTextContent("live"));
    await act(async () => {
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("viewer-b");

    let resolveOffer: ((offer: { sdp: string; type: string }) => void) | undefined;
    (mockPeerConnection as typeof mockPeerConnection & { signalingState?: string }).signalingState = "stable";
    mockPeerConnection.createOffer.mockImplementationOnce(() => new Promise((resolve) => { resolveOffer = resolve; }));

    await act(async () => {
      triggerWsEvent("screen:viewer-left", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");

    await act(async () => {
      resolveOffer?.({ sdp: "offer-sdp", type: "offer" });
      await Promise.resolve();
    });
  });

  it("UI-VIEWER-04: local voice leave clears viewer subscriptions and live streams", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [{ shareId: "share-a", channelId: "voice-1", presenterId: "alice-id" }] });
      triggerWsEvent("screen:viewer-state", { subscribedShareIds: ["share-a"], presenterShares: [] });
      screen.getByTestId("leave-btn").click();
    });
    expect(screen.getByTestId("screen-shares")).toHaveTextContent("none");
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("none");
  });

  it("UI-VIEWER-05/06: stopped presenter is removed while other subscribed streams remain", async () => {
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-state", { channelId: "voice-1", shares: [
        { shareId: "share-a", channelId: "voice-1", presenterId: "alice-id" },
        { shareId: "share-c", channelId: "voice-1", presenterId: "charlie-id" },
      ] });
      triggerWsEvent("screen:viewer-state", { subscribedShareIds: ["share-a", "share-c"], presenterShares: [] });
      triggerWsEvent("screen:share-stopped", { shareId: "share-a", presenterId: "alice-id" });
    });
    expect(screen.getByTestId("screen-shares")).toHaveTextContent("share-c");
    expect(screen.getByTestId("subscribed-shares")).toHaveTextContent("share-c");
  });

  it("UX-SOUND-01/03: only a successful capture plays the start sound once", async () => {
    const { playScreenShareStartedSound } = jest.requireMock("../lib/voiceSounds");
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
    expect(playScreenShareStartedSound).not.toHaveBeenCalled();
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(playScreenShareStartedSound).toHaveBeenCalledTimes(1));
  });

  it("UX-SOUND-02: cancelling the picker plays no start sound", async () => {
    const { playScreenShareStartedSound } = jest.requireMock("../lib/voiceSounds");
    mockGetDisplayMedia.mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"));
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); screen.getByTestId("start-share-btn").click(); });
    await act(async () => { triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }); });
    await waitFor(() => expect(screen.getByTestId("screen-share-status")).toHaveTextContent("idle"));
    expect(playScreenShareStartedSound).not.toHaveBeenCalled();
  });

  it("UX-SOUND-04/05/06: presenter viewer sounds play once for real transitions only", async () => {
    const { playScreenViewerJoinedSound, playScreenViewerLeftSound } = jest.requireMock("../lib/voiceSounds");
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
      triggerWsEvent("screen:viewer-joined", { shareId: "own-share", viewerId: "viewer-b" });
      triggerWsEvent("screen:viewer-left", { shareId: "own-share", viewerId: "viewer-b" });
      triggerWsEvent("screen:viewer-left", { shareId: "own-share", viewerId: "viewer-b" });
    });
    expect(playScreenViewerJoinedSound).toHaveBeenCalledTimes(1);
    expect(playScreenViewerLeftSound).toHaveBeenCalledTimes(1);
  });

  it("UX-SOUND-07: initial authoritative viewer hydration is silent", async () => {
    const { playScreenViewerJoinedSound } = jest.requireMock("../lib/voiceSounds");
    render(<VoiceTest />);
    await act(async () => { screen.getByTestId("join-btn").click(); });
    await act(async () => {
      triggerWsEvent("screen:share-started", { shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" });
      triggerWsEvent("screen:viewer-state", { subscribedShareIds: [], presenterShares: [{ shareId: "own-share", viewerIds: ["viewer-b"] }] });
    });
    expect(playScreenViewerJoinedSound).not.toHaveBeenCalled();
  });
});

describe("Screen Share sidebar UI", () => {
  const baseVoice: any = {
    channelId: "voice-1", members: [
      { userId: "alice-id", username: "alice", displayName: "Alice", isMuted: false, isDeafened: false },
      { userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false },
    ], speakingUserIds: [], status: "connected", isMuted: false, isDeafened: false, serverMuted: false, error: null,
    isScreenSharing: false, screenShareStatus: "idle", screenPresenterId: "alice-id", screenShares: [], subscribedShareIds: [],
    presenterViewerIds: {}, localScreenStream: null,
    remoteScreenStreams: {}, streamNotice: null, join: jest.fn(), leave: jest.fn(), toggleMute: jest.fn(),
    toggleDeafen: jest.fn(), clearError: jest.fn(), startScreenShare: jest.fn(), stopScreenShare: jest.fn(),
    joinScreenShare: jest.fn(), leaveScreenShare: jest.fn(),
    setVoiceSoundsEnabled: jest.fn(), voiceSoundsEnabled: true, debugEvents: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderSidebar(voice: any, voiceOccupancy: any[] = []) {
    return render(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{ id: "voice-1", name: "General", type: "VOICE", categoryId: null, position: 0 }]}
      activeChannelId={null} voice={voice} voiceOccupancy={voiceOccupancy} user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);
  }

  it("F6-C1-SIDEBAR-01: an observer sees permitted Voice occupants without joining", () => {
    mockGetUserMedia.mockClear();
    (global as any).RTCPeerConnection.mockClear();
    renderSidebar(
      { ...baseVoice, channelId: null, members: [], speakingUserIds: ["bob-id"], screenShares: [], subscribedShareIds: [] },
      [{ channelId: "voice-1", members: [{
        userId: "bob-id", username: "bob", displayName: "Bob", isMuted: true, isDeafened: false,
      }] }],
    );

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByTestId("voice-status-mic-off")).toBeInTheDocument();
    expect(screen.queryByText("🔇")).not.toBeInTheDocument();
    expect(mockGetUserMedia).not.toHaveBeenCalled();
    expect((global as any).RTCPeerConnection).not.toHaveBeenCalled();
    expect(baseVoice.join).not.toHaveBeenCalled();
    expect(VoiceSpeakingAnalysis).not.toHaveBeenCalled();
    expect(screen.getByRole("listitem", { name: "Bob, muted" })).not.toHaveClass("speaking");
  });

  it("F6-C2A-UI-01: same-call speaking adds a stable ring and accessible non-live label", () => {
    const view = renderSidebar(
      { ...baseVoice, speakingUserIds: ["bob-id"], screenShares: [], subscribedShareIds: [] },
      [{ channelId: "voice-1", members: [
        { userId: "alice-id", username: "alice", displayName: "Alice", isMuted: false, isDeafened: false },
        { userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false },
      ] }],
    );

    const before = screen.getAllByRole("listitem").map((row) => row.textContent);
    const bob = screen.getByRole("listitem", { name: "Bob, speaking" });
    expect(bob).toHaveClass("speaking");
    expect(bob.querySelector(".voice-member-avatar")).toHaveClass("is-speaking");
    expect(bob.querySelector('[data-testid="voice-status-speaking"]')).toBeInTheDocument();
    expect(bob).not.toHaveAttribute("aria-live");

    view.rerender(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{ id: "voice-1", name: "General", type: "VOICE", categoryId: null, position: 0 }]}
      activeChannelId={null} voice={{ ...baseVoice, speakingUserIds: ["alice-id"] }}
      voiceOccupancy={[{ channelId: "voice-1", members: [
        { userId: "alice-id", username: "alice", displayName: "Alice", isMuted: false, isDeafened: false },
        { userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false },
      ] }]}
      user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);
    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(before);
    expect(screen.getByRole("listitem", { name: "Alice, speaking" })).toHaveClass("speaking");
    expect(screen.getByRole("listitem", { name: "Bob, not speaking" })).not.toHaveClass("speaking");
  });

  it("F6-C2A-UI-02: effective mute suppresses stale speaking and the active ring is static", () => {
    renderSidebar(
      {
        ...baseVoice,
        speakingUserIds: ["bob-id"],
        members: baseVoice.members.map((member: { userId: string }) => member.userId === "bob-id"
          ? { ...member, isMuted: true }
          : member),
      },
      [{ channelId: "voice-1", members: [{
        userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false,
      }] }],
    );
    expect(screen.getByRole("listitem", { name: "Bob, muted" })).not.toHaveClass("speaking");
    expect(screen.queryByTestId("voice-status-speaking")).not.toBeInTheDocument();

    const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(styles).toMatch(/\.voice-member-avatar\.is-speaking\s*\{\s*box-shadow:\s*0 0 0 2px var\(--success\);\s*\}/);
    expect(styles).not.toMatch(/voice-speaking-pulse/);
  });

  it("F6-C2P-UI-01: status icons communicate mute and deafen without emoji", () => {
    const { rerender } = renderSidebar(
      { ...baseVoice, members: [{ ...baseVoice.members[1], isMuted: true }], screenShares: [], subscribedShareIds: [] },
      [{ channelId: "voice-1", members: [{ userId: "bob-id", username: "bob", displayName: "Bob", isMuted: true, isDeafened: false }] }],
    );
    expect(screen.getByRole("listitem", { name: "Bob, muted" })).toBeInTheDocument();
    expect(screen.getByTestId("voice-status-mic-off")).toBeInTheDocument();
    expect(screen.queryByTestId("voice-status-headphones-off")).not.toBeInTheDocument();

    rerender(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{ id: "voice-1", name: "General", type: "VOICE", categoryId: null, position: 0 }]}
      activeChannelId={null} voice={{ ...baseVoice, members: [{ ...baseVoice.members[1], isMuted: true, isDeafened: true } ] }}
      voiceOccupancy={[{ channelId: "voice-1", members: [{ userId: "bob-id", username: "bob", displayName: "Bob", isMuted: true, isDeafened: true }] }]}
      user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);
    expect(screen.getByRole("listitem", { name: "Bob, muted and deafened" })).toBeInTheDocument();
    expect(screen.getByTestId("voice-status-mic-off")).toBeInTheDocument();
    expect(screen.getByTestId("voice-status-headphones-off")).toBeInTheDocument();
    expect(screen.queryByText("🎤")).not.toBeInTheDocument();
    expect(screen.queryByText("🔇")).not.toBeInTheDocument();
  });

  it("F6-C1-SIDEBAR-02: observer occupancy is the deduplicated participant projection", () => {
    renderSidebar(
      { ...baseVoice, screenShares: [], subscribedShareIds: [] },
      [{ channelId: "voice-1", members: [{
        userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false,
      }] }],
    );
    expect(screen.getAllByText("Bob")).toHaveLength(1);
  });

  it("VI5A-A11Y-01: Voice controls expose names and toggle state without changing Screen Share", () => {
    const { rerender } = renderSidebar({ ...baseVoice, screenShares: [], subscribedShareIds: [] });

    expect(screen.getByRole("button", { name: "Mute microphone" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Deafen audio" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Leave voice" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Share your screen" })).toHaveAttribute("title", "Share your screen");

    rerender(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{ id: "voice-1", name: "General", type: "VOICE", categoryId: null, position: 0 }]}
      activeChannelId={null} voice={{ ...baseVoice, isMuted: true, isDeafened: true, screenShares: [], subscribedShareIds: [] }}
      user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);
    expect(screen.getByRole("button", { name: "Mute microphone" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Deafen audio" })).toHaveAttribute("aria-pressed", "true");
  });

  it("F6-C1-SIDEBAR-03: occupancy for a Channel absent from the filtered sidebar never renders", () => {
    renderSidebar(
      { ...baseVoice, channelId: null, members: [], screenShares: [], subscribedShareIds: [] },
      [{ channelId: "voice-hidden", members: [{
        userId: "hidden-id", username: "hidden", displayName: "Hidden User", isMuted: false, isDeafened: false,
      }] }],
    );
    expect(screen.queryByText("Hidden User")).not.toBeInTheDocument();
  });

  it("CHPERM-LIFE-61: Voice Join control is unavailable when effective CONNECT is denied", () => {
    const voice = { ...baseVoice, channelId: null, members: [], join: jest.fn() };
    render(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{
        id: "voice-denied", name: "Denied", type: "VOICE", categoryId: null, position: 0,
        effectivePermissions: (1n << 10n).toString(),
      }]}
      activeChannelId={null} voice={voice} user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);

    const join = screen.getByRole("button", { name: "Denied: Connect permission denied" });
    expect(join).toBeDisabled();
    join.click();
    expect(voice.join).not.toHaveBeenCalled();
  });

  it("UI-STREAM-01: sidebar shows every active live stream", () => {
    renderSidebar({ ...baseVoice, screenShares: [
      { shareId: "share-a", channelId: "voice-1", presenterId: "alice-id" },
      { shareId: "share-b", channelId: "voice-1", presenterId: "bob-id" },
    ], subscribedShareIds: [] });
    expect(screen.getByRole("region", { name: "Live streams" })).toHaveClass("live-streams-section");
    expect(screen.getByTestId("live-stream-share-a")).toHaveClass("live-stream-item");
    expect(screen.getByTestId("live-stream-share-a")).toHaveTextContent("Alice");
    expect(screen.getByTestId("live-stream-share-b")).toHaveTextContent("Bob");
    expect(screen.getByTestId("stream-action-share-a")).toHaveClass("live-stream-action");
  });

  it("UI-STREAM-05: sidebar offers no Join Stream action for the presenter’s own share", () => {
    renderSidebar({ ...baseVoice, screenShares: [{ shareId: "own-share", channelId: "voice-1", presenterId: "my-user-id" }], subscribedShareIds: [], presenterViewerIds: { "own-share": ["alice-id"] } });
    expect(screen.getByTestId("live-stream-own-share")).toHaveClass("is-own");
    expect(screen.getByTestId("live-stream-own-share")).toHaveTextContent("Your screen");
    expect(screen.queryByTestId("stream-action-own-share")).not.toBeInTheDocument();
    expect(screen.getByTestId("stream-viewers-own-share")).toHaveTextContent("1 watching: Alice");
  });

  it("UX-SHARE-01/02: canonical idle SVG control is labelled and duplicate Share Screen text is absent", () => {
    renderSidebar({ ...baseVoice, screenShares: [], subscribedShareIds: [] });
    const control = screen.getByRole("button", { name: "Share your screen" });
    expect(control).toHaveAttribute("title", "Share your screen");
    expect(control).toHaveAttribute("aria-busy", "false");
    expect(control.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText("Share Screen")).not.toBeInTheDocument();
  });

  it("UX-SHARE-03/04/05: live control is explicit and pending controls are disabled", () => {
    const { rerender } = renderSidebar({ ...baseVoice, screenShareStatus: "live", screenShares: [], subscribedShareIds: [] });
    expect(screen.getByRole("button", { name: "Stop sharing" })).toHaveClass("live");
    expect(screen.getByRole("button", { name: "Stop sharing" })).toHaveTextContent("LIVE");
    rerender(<ChannelSidebar
      serverName="Test Server" textChannels={[]} voiceChannels={[{ id: "voice-1", name: "General", type: "VOICE", categoryId: null, position: 0 }]}
      activeChannelId={null} voice={{ ...baseVoice, screenShareStatus: "starting", screenShares: [], subscribedShareIds: [] }} user={{ id: "my-user-id", username: "me", displayName: "Me" }} userStatus="ONLINE" isOwner={false}
      canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()}
    />);
    const pendingControl = screen.getByRole("button", { name: "Starting screen share" });
    expect(pendingControl).toHaveClass("pending");
    expect(pendingControl).toHaveAttribute("aria-busy", "true");
    expect(pendingControl).toBeDisabled();
  });
});

describe("Screen Share presenter preview", () => {
  it("UI-PREVIEW-04: preview video is muted and plays inline", () => {
    const { container } = render(<ScreenStreamVideo stream={mockDisplayStream as unknown as MediaStream} />);
    const video = container.querySelector("video") as HTMLVideoElement;

    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
  });
});

describe("Screen Share presenter card", () => {
  it("UX-PRES-01/02/03/04/05: shows a LIVE local stream with authoritative viewer names", () => {
    const { container } = render(<ScreenSharePresenterCard stream={mockDisplayStream as unknown as MediaStream} viewerNames={["Alice", "Bob"]} />);
    expect(screen.getByTestId("presenter-live-card")).toHaveTextContent("Your screen");
    expect(screen.getByTestId("presenter-live-indicator")).toHaveTextContent("LIVE");
    expect(screen.getByLabelText("2 viewers watching")).toHaveClass("screen-share-viewer-summary");
    expect(screen.getByLabelText("2 viewers watching")).toHaveTextContent("2");
    expect(screen.getByTestId("presenter-viewer-list")).toHaveTextContent("Alice");
    expect(screen.getByTestId("presenter-viewer-list")).toHaveTextContent("Bob");
    expect(container.querySelector("video")?.muted).toBe(true);
  });
});
