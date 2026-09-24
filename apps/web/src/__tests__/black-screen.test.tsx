import { TestMediaStream, installScreenLayout } from "../../test-support/screenMedia";
import "@testing-library/jest-dom";
jest.mock("../lib/voiceCapture", () => ({
  getVoiceCaptureOwner: () => jest.requireActual("../../test-support/voiceCaptureBoundary").captureBoundary(),
}));
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { reconcileScreenSendersForPeer, type ScreenSenderRecord, useVoice } from "../hooks/useVoice";
import ScreenShareViewerWorkspace, { type ViewerStream } from "../components/layout/ScreenShareViewerWorkspace";
import ScreenStreamVideo from "../components/layout/ScreenStreamVideo";

global.MediaStream = TestMediaStream as unknown as typeof MediaStream;

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

const socketHandlers = new Map<string, Set<(data: any) => any>>();
const mockSocket = {
  connected: true,
  on: jest.fn((event: string, handler: (data: any) => any) => {
    if (!socketHandlers.has(event)) socketHandlers.set(event, new Set());
    socketHandlers.get(event)!.add(handler);
    return mockSocket;
  }),
  off: jest.fn((event: string, handler: (data: any) => any) => {
    socketHandlers.get(event)?.delete(handler);
    return mockSocket;
  }),
  emit: jest.fn((event: string, payload?: { muted?: boolean }, acknowledgement?: (result: unknown) => void) => {
    if (typeof acknowledgement !== "function") return;
    if (event === "voice:authorize-join") acknowledgement({ ok: true });
    else if (event === "voice:join") acknowledgement({ ok: true, isMuted: false });
    else if (event === "voice:mute") acknowledgement({ ok: true, isMuted: payload?.muted === true });
  }),
};

jest.mock("../lib/ws", () => ({
  getSocket: jest.fn(() => mockSocket),
}));

type MockTrack = {
  id: string;
  kind: "audio" | "video";
  enabled: boolean;
  readyState: "live" | "ended";
  stop: jest.Mock;
  onended: (() => void) | null;
};

function makeTrack(id: string, kind: "audio" | "video"): MockTrack {
  return {
    id,
    kind,
    enabled: true,
    readyState: "live",
    stop: jest.fn(),
    onended: null,
  };
}

function makeStream(id: string, tracks: MockTrack[], visibleVideo = true) {
  return {
    id,
    active: true,
    getTracks: jest.fn(() => tracks),
    getAudioTracks: jest.fn(() => tracks.filter((track) => track.kind === "audio")),
    getVideoTracks: jest.fn(() => visibleVideo ? tracks.filter((track) => track.kind === "video") : []),
  } as unknown as MediaStream;
}

type MockSender = { track: MockTrack; stream: MediaStream; getParameters: jest.Mock; setParameters: jest.Mock };

class MockPeerConnection {
  signalingState: RTCSignalingState = "stable";
  iceConnectionState: RTCIceConnectionState = "new";
  connectionState: RTCPeerConnectionState = "new";
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  senders: MockSender[] = [];
  onicecandidate: ((event: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onsignalingstatechange: (() => void) | null = null;
  ontrack: ((event: any) => void) | null = null;

  addTrack = jest.fn((track: MockTrack, stream: MediaStream) => {
    let parameters = { encodings: [{ active: true, dtx: "enabled", networkPriority: "low" }], codecs: [], headerExtensions: [], rtcp: {}, transactionId: "screen-test" };
    const sender = { track, stream,
      getParameters: jest.fn(() => JSON.parse(JSON.stringify(parameters))),
      setParameters: jest.fn(async (next) => { parameters = JSON.parse(JSON.stringify(next)); }),
    };
    this.senders.push(sender);
    return sender as unknown as RTCRtpSender;
  });
  removeTrack = jest.fn((sender: RTCRtpSender) => {
    this.senders = this.senders.filter((item) => item !== sender);
  });
  getSenders = jest.fn(() => this.senders as unknown as RTCRtpSender[]);
  createOffer = jest.fn(async () => ({ type: "offer" as const, sdp: `offer-${this.createOffer.mock.calls.length}` }));
  createAnswer = jest.fn(async () => ({ type: "answer" as const, sdp: "answer" }));
  setLocalDescription = jest.fn(async (description: RTCSessionDescriptionInit) => {
    this.localDescription = description;
    this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
    this.onsignalingstatechange?.();
  });
  setRemoteDescription = jest.fn(async (description: RTCSessionDescriptionInit) => {
    this.remoteDescription = description;
    this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
    this.onsignalingstatechange?.();
  });
  addIceCandidate = jest.fn(async () => {});
  close = jest.fn(() => { this.signalingState = "closed"; });
}

let peerConnections: MockPeerConnection[] = [];
let micTrack: MockTrack;
let micStream: MediaStream;
let getDisplayMediaMock: jest.Mock;

function VoiceHarness() {
  const voice = useVoice("server-1", true, "me", "me", "Me");
  return (
    <div>
      <span data-testid="status">{voice.status}</span>
      <span data-testid="remote-screen">{voice.remoteScreenStreams.presenter?.id || "none"}</span>
      <span data-testid="local-screen">{voice.localScreenStream?.id || "none"}</span>
      <span data-testid="share-ids">{voice.screenShares.map((share) => share.shareId).sort().join(",") || "none"}</span>
      <span data-testid="subscription-ids">{[...voice.subscribedShareIds].sort().join(",") || "none"}</span>
      <span data-testid="viewer-ids">{Object.entries(voice.presenterViewerIds)
        .flatMap(([shareId, viewerIds]) => viewerIds.map((viewerId) => `${shareId}:${viewerId}`))
        .sort().join(",") || "none"}</span>
      <span data-testid="remote-screens">{Object.entries(voice.remoteScreenStreams)
        .map(([presenterId, stream]) => `${presenterId}:${stream.id}`).sort().join(",") || "none"}</span>
      <button data-testid="join" onClick={() => voice.join("voice-1")}>join</button>
      <button data-testid="leave" onClick={voice.leave}>leave</button>
      <button data-testid="start" onClick={voice.startScreenShare}>start</button>
      <button data-testid="stop" onClick={voice.stopScreenShare}>stop</button>
      <button data-testid="hide-presenter" onClick={() => voice.setRemoteScreenAudioHidden("share-a", true)}>hide presenter</button>
      <button data-testid="show-presenter" onClick={() => voice.setRemoteScreenAudioHidden("share-a", false)}>show presenter</button>
    </div>
  );
}

function RuntimeAudioHarness() {
  const voice = useVoice("server-1", true, "me", "me", "Me");
  const streams: ViewerStream[] = voice.screenShares
    .filter((share) => share.presenterId !== "me" && voice.subscribedShareIds.includes(share.shareId))
    .map((share) => ({
      shareId: share.shareId,
      presenterId: share.presenterId,
      presenterName: share.presenterId,
      stream: voice.remoteScreenStreams[share.presenterId],
      volume: voice.getStreamVolume(share.shareId),
      muted: voice.isStreamMuted(share.shareId),
      audioAvailable: voice.screenAudioAvailableByShareId[share.shareId] ?? false,
    }));
  return (
    <>
      <div data-testid="runtime-controls">
      <span data-testid="runtime-status">{voice.status}</span>
      <span data-testid="runtime-audio-state-a">{`${voice.isStreamMuted("share-a")}:${voice.getStreamVolume("share-a")}`}</span>
      <span data-testid="runtime-audio-state-c">{`${voice.isStreamMuted("share-c")}:${voice.getStreamVolume("share-c")}`}</span>
      <span data-testid="runtime-audio-state-a2">{`${voice.isStreamMuted("share-a2")}:${voice.getStreamVolume("share-a2")}`}</span>
      <span data-testid="runtime-audio-state-keys">{Object.keys(voice.streamAudioByShareId).sort().join(",") || "none"}</span>
      <button data-testid="runtime-join" onClick={() => voice.join("voice-1")}>join</button>
      <button data-testid="runtime-deafen" onClick={voice.toggleDeafen}>deafen</button>
      <button data-testid="runtime-mute" onClick={voice.toggleMute}>mute</button>
      <button data-testid="runtime-volume-a-20" onClick={() => voice.setStreamVolume("share-a", 0.2)}>A 20%</button>
      <button data-testid="runtime-volume-c-70" onClick={() => voice.setStreamVolume("share-c", 0.7)}>C 70%</button>
      <button data-testid="runtime-volume-a-low" onClick={() => voice.setStreamVolume("share-a", -1)}>A low</button>
      <button data-testid="runtime-volume-a-high" onClick={() => voice.setStreamVolume("share-a", 2)}>A high</button>
      <button data-testid="runtime-mute-a" onClick={() => voice.setStreamMuted("share-a", true)}>mute A</button>
      <button data-testid="runtime-unmute-a" onClick={() => voice.setStreamMuted("share-a", false)}>unmute A</button>
      <button data-testid="runtime-hide-a" onClick={() => voice.setRemoteScreenAudioHidden("share-a", true)}>hide A</button>
      <button data-testid="runtime-show-a" onClick={() => voice.setRemoteScreenAudioHidden("share-a", false)}>show A</button>
      </div>
      <ScreenShareViewerWorkspace
        streams={streams}
        onLeaveStream={voice.leaveScreenShare}
        onVolumeChange={voice.setStreamVolume}
        onMuteChange={voice.setStreamMuted}
        onPresentationChange={(shareId, mode) => voice.setRemoteScreenAudioHidden(shareId, mode === "HIDDEN")}
      >
        <span>chat</span>
      </ScreenShareViewerWorkspace>
    </>
  );
}

async function triggerSocket(event: string, data: any) {
  await act(async () => {
    for (const handler of [...(socketHandlers.get(event) || [])]) await handler(data);
  });
}

async function joinVoice() {
  render(<VoiceHarness />);
  await act(async () => { fireEvent.click(screen.getByTestId("join")); });
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("connected"));
}

async function startShare(shareId: string) {
  await act(async () => { fireEvent.click(screen.getByTestId("start")); });
  await triggerSocket("screen:share-started", {
    shareId,
    channelId: "voice-1",
    presenterId: "me",
  });
  await waitFor(() => expect(screen.getByTestId("local-screen")).not.toHaveTextContent("none"));
}

async function setupRuntimeAudioWorkspace({ combinedScreenMedia = false } = {}) {
  const originalCreateElement = document.createElement.bind(document);
  const audioElements: HTMLAudioElement[] = [];
  const videoElements: HTMLVideoElement[] = [];
  const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName === "audio") audioElements.push(element as HTMLAudioElement);
    if (tagName === "video") videoElements.push(element as HTMLVideoElement);
    return element;
  });
  render(<RuntimeAudioHarness />);
  await act(async () => { fireEvent.click(screen.getByTestId("runtime-join")); });
  await waitFor(() => expect(screen.getByTestId("runtime-status")).toHaveTextContent("connected"));
  await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
  await triggerSocket("screen:share-started", { shareId: "share-c", channelId: "voice-1", presenterId: "presenter-c" });
  await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
  await triggerSocket("screen:viewer-joined", { shareId: "share-c", viewerId: "me" });
  await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });
  await triggerSocket("voice:offer", { fromUserId: "presenter-c", sdp: "offer-c" });

  const micTrackA = makeTrack("runtime-mic-a", "audio");
  const micTrackC = makeTrack("runtime-mic-c", "audio");
  const micStreamA = makeStream("runtime-mic-stream-a", [micTrackA]);
  const micStreamC = makeStream("runtime-mic-stream-c", [micTrackC]);
  const videoTrackA = makeTrack("runtime-video-a", "video");
  const videoTrackC = makeTrack("runtime-video-c", "video");
  const screenAudioTrackA = makeTrack("runtime-screen-audio-a", "audio");
  const screenAudioTrackC = makeTrack("runtime-screen-audio-c", "audio");
  const videoStreamA = makeStream("runtime-video-stream-a", combinedScreenMedia ? [videoTrackA, screenAudioTrackA] : [videoTrackA]);
  const videoStreamC = makeStream("runtime-video-stream-c", combinedScreenMedia ? [videoTrackC, screenAudioTrackC] : [videoTrackC]);
  // The default deliberately separates audio from video; combined mode proves
  // that a visual MediaStream containing audio still has only one audible sink.
  const screenAudioStreamA = combinedScreenMedia
    ? videoStreamA
    : makeStream("runtime-screen-audio-stream-a", [screenAudioTrackA]);
  const screenAudioStreamC = combinedScreenMedia
    ? videoStreamC
    : makeStream("runtime-screen-audio-stream-c", [screenAudioTrackC]);
  await act(async () => {
    peerConnections[0].ontrack?.({ track: micTrackA, streams: [micStreamA] });
    peerConnections[0].ontrack?.({ track: videoTrackA, streams: [videoStreamA] });
    peerConnections[0].ontrack?.({ track: screenAudioTrackA, streams: [screenAudioStreamA] });
    peerConnections[1].ontrack?.({ track: micTrackC, streams: [micStreamC] });
    peerConnections[1].ontrack?.({ track: videoTrackC, streams: [videoStreamC] });
    peerConnections[1].ontrack?.({ track: screenAudioTrackC, streams: [screenAudioStreamC] });
  });
  await waitFor(() => expect(screen.getByTestId("gallery-workspace")).toBeInTheDocument());
  await waitFor(() => expect(videoElements.filter((element) => containsTrack(element, videoTrackA) || containsTrack(element, videoTrackC))).toHaveLength(2));

  return {
    audioElements,
    videoElements,
    createElementSpy,
    micTrackA,
    micTrackC,
    microphoneAudioA: audioElements.find((element) => containsTrack(element, micTrackA))!,
    microphoneAudioC: audioElements.find((element) => containsTrack(element, micTrackC))!,
    screenAudioA: audioElements.find((element) => containsTrack(element, screenAudioTrackA))!,
    screenAudioC: audioElements.find((element) => containsTrack(element, screenAudioTrackC))!,
    screenAudioTrackA,
    screenAudioTrackC,
    videoStreamA,
    videoStreamC,
    screenAudioStreamA,
    screenAudioStreamC,
  };
}

function containsTrack(element: HTMLMediaElement, track: MockTrack) {
  const stream = element.srcObject as MediaStream | null;
  return stream?.getTracks().includes(track as unknown as MediaStreamTrack) === true;
}

function playoutConsumersForTrack(
  track: MockTrack,
  audioElements: HTMLAudioElement[],
  _videoElements: HTMLVideoElement[],
) {
  return audioElements.filter((element) => containsTrack(element, track));
}

function activeScreenSinksForShare(audioElements: HTMLAudioElement[], shareId: string) {
  return audioElements.filter((element) =>
    element.dataset.audioOwner === `SCREEN_AUDIO:${shareId}` && element.srcObject !== null,
  );
}

async function leaveRuntimeShareA(audioElements: HTMLAudioElement[]) {
  const oldSink = activeScreenSinksForShare(audioElements, "share-a")[0];
  const pauseSpy = jest.spyOn(oldSink, "pause");
  const shareSurface = screen.queryByTestId("central-stream-share-a") || screen.queryByTestId("detached-stream-share-a");
  const leaveButton = shareSurface?.querySelector("button[aria-label='Leave stream']");
  if (leaveButton) fireEvent.click(leaveButton);
  await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "me" });
  return { oldSink, pauseSpy };
}

async function rejoinRuntimeShareA(audioElements: HTMLAudioElement[], cycle: number) {
  await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
  const videoTrack = makeTrack(`rejoin-video-a-${cycle}`, "video");
  const videoStream = makeStream(`rejoin-video-stream-a-${cycle}`, [videoTrack]);
  const audioTrack = makeTrack(`rejoin-screen-audio-a-${cycle}`, "audio");
  const audioStream = makeStream(`rejoin-screen-audio-stream-a-${cycle}`, [audioTrack]);
  await act(async () => {
    peerConnections[0].ontrack?.({ track: videoTrack, streams: [videoStream] });
    peerConnections[0].ontrack?.({ track: audioTrack, streams: [audioStream] });
  });
  await waitFor(() => expect(activeScreenSinksForShare(audioElements, "share-a")).toHaveLength(1));
  return {
    audioTrack,
    audioStream,
    videoTrack,
    videoStream,
    sink: audioElements.find((element) => containsTrack(element, audioTrack))!,
  };
}

async function setupLateScreenAudioReclassification() {
  const originalCreateElement = document.createElement.bind(document);
  const audioElements: HTMLAudioElement[] = [];
  const videoElements: HTMLVideoElement[] = [];
  jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName === "audio") audioElements.push(element as HTMLAudioElement);
    if (tagName === "video") videoElements.push(element as HTMLVideoElement);
    return element;
  });
  render(<RuntimeAudioHarness />);
  await act(async () => { fireEvent.click(screen.getByTestId("runtime-join")); });
  await waitFor(() => expect(screen.getByTestId("runtime-status")).toHaveTextContent("connected"));
  await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });

  const microphoneTrack = makeTrack("late-owner-mic-a", "audio");
  const microphoneStream = makeStream("late-owner-mic-stream-a", [microphoneTrack]);
  const screenAudioTrack = makeTrack("late-owner-screen-audio-a", "audio");
  const screenAudioStream = makeStream("late-owner-screen-audio-stream-a", [screenAudioTrack]);
  await act(async () => {
    peerConnections[0].ontrack?.({ track: microphoneTrack, streams: [microphoneStream] });
    peerConnections[0].ontrack?.({ track: screenAudioTrack, streams: [screenAudioStream] });
  });
  const microphoneAudio = audioElements.find((element) => containsTrack(element, microphoneTrack))!;
  const sameScreenAudio = audioElements.find((element) => containsTrack(element, screenAudioTrack))!;
  const ownerBeforeShareIdentity = sameScreenAudio.dataset.audioOwner;

  await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
  await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
  const videoTrack = makeTrack("late-owner-video-a", "video");
  const videoStream = makeStream("late-owner-video-stream-a", [videoTrack]);
  await act(async () => {
    peerConnections[0].ontrack?.({ track: videoTrack, streams: [videoStream] });
  });
  await waitFor(() => expect(screen.getByTestId("gallery-workspace")).toBeInTheDocument());

  return {
    audioElements,
    videoElements,
    microphoneAudio,
    sameScreenAudio,
    screenAudioTrack,
    screenAudioStream,
    ownerBeforeShareIdentity,
  };
}

function detachAndHideOtherRuntimeShares(targetShareId = "share-a") {
  const card = screen.getByTestId(`central-stream-${targetShareId}`);
  fireEvent.click(card.querySelector("button[aria-label^='Detach ']")!);
  for (const other of screen.queryAllByTestId(/^central-stream-/)) {
    if (other.dataset.testid === "central-stream-surface") continue;
    fireEvent.click(other.querySelector(".screen-share-controls-entry")!);
    fireEvent.click(other.querySelector("button[aria-label^='Hide ']")!);
  }
}
function switchRuntimeFloating(presenter: string) {
  const old = screen.getByRole("button", { name: /^Pop in .*stream$/ });
  const oldName = old.getAttribute("aria-label")!.slice(7, -9);
  fireEvent.click(old);
  fireEvent.click(screen.getByRole("button", { name: `Show ${presenter}'s stream` }));
  fireEvent.click(screen.getByRole("button", { name: `Detach ${presenter}'s stream` }));
  fireEvent.click(screen.getByRole("button", { name: `More stream controls for ${oldName}` }));
  fireEvent.click(screen.getByRole("button", { name: `Hide ${oldName}'s stream` }));
}
function popInAndShowRuntimeShares(id: string) {
  fireEvent.doubleClick(screen.getByTestId(`detached-media-${id}`));
  for (const show of screen.queryAllByRole("button", { name: /^Show .*stream$/ })) fireEvent.click(show);
}

async function restartRuntimeShareA(audioElements: HTMLAudioElement[]) {
  await triggerSocket("screen:share-stopped", { shareId: "share-a", presenterId: "presenter-a" });
  await triggerSocket("screen:share-started", { shareId: "share-a2", channelId: "voice-1", presenterId: "presenter-a" });
  await triggerSocket("screen:viewer-joined", { shareId: "share-a2", viewerId: "me" });

  const videoTrack = makeTrack("runtime-video-a2", "video");
  const videoStream = makeStream("runtime-video-stream-a2", [videoTrack]);
  const audioTrack = makeTrack("runtime-screen-audio-a2", "audio");
  const audioStream = makeStream("runtime-screen-audio-stream-a2", [audioTrack]);
  await act(async () => {
    peerConnections[0].ontrack?.({ track: videoTrack, streams: [videoStream] });
    peerConnections[0].ontrack?.({ track: audioTrack, streams: [audioStream] });
  });

  return audioElements.find((element) => containsTrack(element, audioTrack))!;
}

beforeEach(() => {
  installScreenLayout();
  jest.clearAllMocks();
  socketHandlers.clear();
  peerConnections = [];
  micTrack = makeTrack("mic-track", "audio");
  micStream = makeStream("mic-stream", [micTrack]);
  getDisplayMediaMock = jest.fn();

  Object.defineProperty(global.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue(micStream),
      getDisplayMedia: (...args: any[]) => getDisplayMediaMock(...args),
    },
  });
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue([]) });
  (global as any).RTCPeerConnection = jest.fn(() => {
    const pc = new MockPeerConnection();
    peerConnections.push(pc);
    return pc;
  });
  (global as any).RTCSessionDescription = class {
    type: RTCSdpType;
    sdp?: string;
    constructor(init: RTCSessionDescriptionInit) {
      this.type = init.type!;
      this.sdp = init.sdp;
    }
  };
  (global as any).RTCIceCandidate = class {};
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("remote screen black regression", () => {
  it("BLACK-00: an unstable peer queues the screen offer and sends it when stable", async () => {
    const video = makeTrack("screen-video", "video");
    const audio = makeTrack("screen-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("display-1", [video, audio]));
    await joinVoice();
    await triggerSocket("voice:user-joined", { userId: "presenter", username: "presenter" });
    const pc = peerConnections[0];
    expect(pc.signalingState).toBe("have-local-offer");

    await startShare("share-1");
    await triggerSocket("screen:viewer-joined", { shareId: "share-1", viewerId: "presenter" });
    expect(pc.addTrack).toHaveBeenCalledWith(video, expect.objectContaining({ id: "display-1" }));
    expect(pc.createOffer).toHaveBeenCalledTimes(1);

    await triggerSocket("voice:answer", { fromUserId: "presenter", sdp: "initial-answer" });
    await waitFor(() => expect(pc.createOffer).toHaveBeenCalledTimes(2));
    expect(mockSocket.emit).toHaveBeenCalledWith("voice:offer", expect.objectContaining({
      toUserId: "presenter",
      sdp: "offer-2",
    }));
  });

  it("BLACK-01: remote video ontrack reaches application screen-stream state", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter", sdp: "initial-offer" });
    const pc = peerConnections[0];
    await triggerSocket("screen:share-started", { shareId: "remote-share", channelId: "voice-1", presenterId: "presenter" });
    await triggerSocket("screen:viewer-joined", { shareId: "remote-share", viewerId: "me" });
    const video = makeTrack("remote-video", "video");
    const remoteDisplay = makeStream("remote-display", [video]);

    await act(async () => {
      pc.ontrack?.({ track: video, streams: [remoteDisplay] });
    });

    expect(screen.getByTestId("remote-screen")).toHaveTextContent("remote-display");
  });

  it("BLACK-02/03: video attaches the correct stream and keeps it across unrelated renders", () => {
    const videoTrack = makeTrack("remote-video", "video");
    const remoteDisplay = makeStream("remote-display", [videoTrack]);
    const { container, rerender } = render(<ScreenStreamVideo stream={remoteDisplay} />);
    const video = container.querySelector("video") as HTMLVideoElement;

    expect(video.srcObject).not.toBe(remoteDisplay);
    expect((video.srcObject as MediaStream).getVideoTracks()).toEqual(remoteDisplay.getVideoTracks());
    expect((video.srcObject as MediaStream).getAudioTracks()).toEqual([]);
    rerender(<ScreenStreamVideo stream={remoteDisplay} />);
    expect(video.srcObject).not.toBe(remoteDisplay);
    expect((video.srcObject as MediaStream).getVideoTracks()).toEqual(remoteDisplay.getVideoTracks());
    expect((video.srcObject as MediaStream).getAudioTracks()).toEqual([]);
  });

  it("BLACK-04: microphone, screen audio, and screen video keep distinct media sources", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter", sdp: "initial-offer" });
    const pc = peerConnections[0];
    const originalCreateElement = document.createElement.bind(document);
    const audioElements: HTMLAudioElement[] = [];
    const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === "audio") audioElements.push(element as HTMLAudioElement);
      return element;
    });

    const remoteMic = makeStream("remote-mic", [makeTrack("remote-mic-track", "audio")]);
    const screenAudioTrack = makeTrack("remote-screen-audio", "audio");
    const remoteScreenAudio = makeStream("remote-display", [screenAudioTrack], false);
    const screenVideoTrack = makeTrack("remote-screen-video", "video");
    const remoteScreenVideo = makeStream("remote-display", [screenVideoTrack, screenAudioTrack]);

    await act(async () => {
      pc.ontrack?.({ track: remoteMic.getAudioTracks()[0], streams: [remoteMic] });
      pc.ontrack?.({ track: screenAudioTrack, streams: [remoteScreenAudio] });
      pc.ontrack?.({ track: screenVideoTrack, streams: [remoteScreenVideo] });
    });

    expect(audioElements).toHaveLength(2);
    expect(audioElements.map((element) => (element.srcObject as MediaStream).getTracks())).toEqual(expect.arrayContaining([
      [remoteMic.getAudioTracks()[0]],
      [screenAudioTrack],
    ]));
    createElementSpy.mockRestore();
  });

  it("BLACK-05: stop then start removes old screen senders and adds a fresh lifecycle", async () => {
    const firstVideo = makeTrack("video-1", "video");
    const firstAudio = makeTrack("audio-1", "audio");
    const secondVideo = makeTrack("video-2", "video");
    const secondAudio = makeTrack("audio-2", "audio");
    getDisplayMediaMock
      .mockResolvedValueOnce(makeStream("display-1", [firstVideo, firstAudio]))
      .mockResolvedValueOnce(makeStream("display-2", [secondVideo, secondAudio]));
    await joinVoice();
    await triggerSocket("voice:user-joined", { userId: "presenter", username: "presenter" });
    const pc = peerConnections[0];
    await triggerSocket("voice:answer", { fromUserId: "presenter", sdp: "initial-answer" });

    await startShare("share-1");
    await triggerSocket("screen:viewer-joined", { shareId: "share-1", viewerId: "presenter" });
    await triggerSocket("voice:answer", { fromUserId: "presenter", sdp: "start-answer" });
    const micSender = pc.senders.find((sender) => sender.track === micTrack);
    const firstVideoSender = pc.senders.find((sender) => sender.track === firstVideo);
    const firstAudioSender = pc.senders.find((sender) => sender.track === firstAudio);

    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    await waitFor(() => expect(pc.removeTrack).toHaveBeenCalledWith(firstVideoSender));
    expect(pc.removeTrack).toHaveBeenCalledWith(firstAudioSender);
    expect(pc.removeTrack).not.toHaveBeenCalledWith(micSender);
    await triggerSocket("screen:share-stopped", { shareId: "share-1", presenterId: "me" });
    await triggerSocket("voice:answer", { fromUserId: "presenter", sdp: "stop-answer" });

    await startShare("share-2");
    await triggerSocket("screen:viewer-joined", { shareId: "share-2", viewerId: "presenter" });
    expect(screen.getByTestId("local-screen")).toHaveTextContent("display-2");
    expect(pc.addTrack).toHaveBeenCalledWith(secondVideo, expect.objectContaining({ id: "display-2" }));
    expect(pc.addTrack).toHaveBeenCalledWith(secondAudio, expect.objectContaining({ id: "display-2" }));
    expect(pc.senders.some((sender) => sender.track === micTrack)).toBe(true);
  });

  it("BLACK-05: remote stop then start replaces the ended stream instead of reusing it", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter", sdp: "initial-offer" });
    const pc = peerConnections[0];
    const firstVideo = makeTrack("remote-video-1", "video");
    const secondVideo = makeTrack("remote-video-2", "video");
    const firstDisplay = makeStream("remote-display-1", [firstVideo]);
    const secondDisplay = makeStream("remote-display-2", [secondVideo]);

    await triggerSocket("screen:share-started", {
      shareId: "remote-share-1", channelId: "voice-1", presenterId: "presenter",
    });
    await triggerSocket("screen:viewer-joined", { shareId: "remote-share-1", viewerId: "me" });
    await act(async () => { pc.ontrack?.({ track: firstVideo, streams: [firstDisplay] }); });
    expect(screen.getByTestId("remote-screen")).toHaveTextContent("remote-display-1");

    await triggerSocket("screen:share-stopped", { shareId: "remote-share-1", presenterId: "presenter" });
    expect(screen.getByTestId("remote-screen")).toHaveTextContent("none");
    await triggerSocket("screen:share-started", {
      shareId: "remote-share-2", channelId: "voice-1", presenterId: "presenter",
    });
    await triggerSocket("screen:viewer-joined", { shareId: "remote-share-2", viewerId: "me" });
    await act(async () => { pc.ontrack?.({ track: secondVideo, streams: [secondDisplay] }); });
    expect(screen.getByTestId("remote-screen")).toHaveTextContent("remote-display-2");
  });

  it("BLACK-06: a peer joining after capture gets mic, screen audio, and screen video in its first offer", async () => {
    const video = makeTrack("late-video", "video");
    const audio = makeTrack("late-audio", "audio");
    const display = makeStream("late-display", [video, audio]);
    getDisplayMediaMock.mockResolvedValue(display);
    await joinVoice();
    await startShare("share-late");
    await triggerSocket("screen:viewer-state", {
      subscribedShareIds: [],
      presenterShares: [{ shareId: "share-late", viewerIds: ["late-peer"] }],
    });

    await triggerSocket("voice:user-joined", { userId: "late-peer", username: "late" });
    const pc = peerConnections[0];
    expect(pc.addTrack).toHaveBeenCalledWith(micTrack, micStream);
    expect(pc.addTrack).toHaveBeenCalledWith(video, display);
    expect(pc.addTrack).toHaveBeenCalledWith(audio, display);
    expect(pc.createOffer).toHaveBeenCalledTimes(1);
  });
});

describe("hidden screen audio playback", () => {
  it("AUDIO-REAL-01: minimizing two subscribed streams preserves permanently muted consumers", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    detachAndHideOtherRuntimeShares("share-a");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:1");
    expect(screen.getByTestId("runtime-audio-state-c")).toHaveTextContent("false:1");
  });

  it("AUDIO-REAL-02: switching the detached target reconciles both actual elements without Join or Leave", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    detachAndHideOtherRuntimeShares("share-a");
    mockSocket.emit.mockClear();
    switchRuntimeFloating("presenter-c");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
    expect(mockSocket.emit.mock.calls.filter(([event]) => event === "screen:viewer-join" || event === "screen:viewer-leave")).toHaveLength(0);
  });

  it("AUDIO-REAL-03: restoring the workspace restores previously HIDDEN actual elements", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    detachAndHideOtherRuntimeShares("share-a");
    expect(runtime.screenAudioC.muted).toBe(true);
    popInAndShowRuntimeShares("share-a");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
  });

  it("AUDIO-REAL-04: audio before video is rebound to a HIDDEN share on the same actual element", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const audioElements: HTMLAudioElement[] = [];
    jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === "audio") audioElements.push(element as HTMLAudioElement);
      return element;
    });
    render(<RuntimeAudioHarness />);
    await act(async () => { fireEvent.click(screen.getByTestId("runtime-join")); });
    await waitFor(() => expect(screen.getByTestId("runtime-status")).toHaveTextContent("connected"));
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });

    const microphoneTrack = makeTrack("late-mic-a", "audio");
    const microphoneStream = makeStream("late-mic-stream-a", [microphoneTrack]);
    const earlyScreenTrack = makeTrack("early-screen-audio-a", "audio");
    const earlyScreenStream = makeStream("early-screen-audio-stream-a", [earlyScreenTrack]);
    await act(async () => {
      peerConnections[0].ontrack?.({ track: microphoneTrack, streams: [microphoneStream] });
      peerConnections[0].ontrack?.({ track: earlyScreenTrack, streams: [earlyScreenStream] });
    });
    const sameElement = audioElements.find((element) => containsTrack(element, earlyScreenTrack))!;
    expect(sameElement.muted).toBe(true);

    fireEvent.click(screen.getByTestId("runtime-hide-a"));
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
    fireEvent.click(screen.getByTestId("runtime-hide-a"));
    expect(audioElements.find((element) => containsTrack(element, earlyScreenTrack))).toBe(sameElement);
    expect(sameElement.dataset.screenShareId).toBe("share-a");
    expect(sameElement.muted).toBe(true);

    const lateVideoTrack = makeTrack("late-video-a", "video");
    const lateVideoStream = makeStream("late-video-stream-a", [lateVideoTrack]);
    await act(async () => {
      peerConnections[0].ontrack?.({ track: lateVideoTrack, streams: [lateVideoStream] });
    });
    fireEvent.click(screen.getByTestId("runtime-hide-a"));
    expect(audioElements).toHaveLength(2);
    expect(sameElement.muted).toBe(true);
  });

  it("AUDIO-REAL-05: distinct audio and video MediaStreams still bind to the correct share", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    detachAndHideOtherRuntimeShares("share-a");
    expect(runtime.screenAudioA.dataset.screenShareId).toBe("share-a");
    expect(runtime.screenAudioC.dataset.screenShareId).toBe("share-c");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
  });

  it("AUDIO-REAL-06: a restarted share from the same presenter ignores stale A1 policy", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    fireEvent.click(screen.getByTestId("runtime-mute-a"));
    const screenAudioA2 = await restartRuntimeShareA(runtime.audioElements);
    expect(screen.getByTestId("runtime-audio-state-keys")).not.toHaveTextContent("share-a,");
    expect(screen.getByTestId("runtime-audio-state-keys")).toHaveTextContent("share-a2");
    expect(screen.getByTestId("runtime-audio-state-a2")).toHaveTextContent("false:1");
    expect(screenAudioA2.dataset.screenShareId).toBe("share-a2");
    expect(screenAudioA2.muted).toBe(true);
    expect(screenAudioA2.volume).toBe(0);
    fireEvent.click(screen.getByTestId("runtime-hide-a"));
    expect(screenAudioA2.muted).toBe(true);
    expect(screenAudioA2.volume).toBe(0);
  });

  it("AUDIO-REAL-07: presentation transitions create no duplicate screen-audio playback elements", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const initialAudioElements = [...runtime.audioElements];
    detachAndHideOtherRuntimeShares("share-a");
    switchRuntimeFloating("presenter-c");
    popInAndShowRuntimeShares("share-c");
    expect(runtime.audioElements).toEqual(initialAudioElements);
    expect(new Set(runtime.audioElements).size).toBe(4);
  });

  it("AUDIO-DEAF-01: Deafen leaves Screen Share policy untouched while consumers stay muted", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:1");
    expect(screen.getByTestId("runtime-audio-state-c")).toHaveTextContent("false:1");
  });

  it("AUDIO-DEAF-02: Deafen still mutes remote call microphone playback", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.microphoneAudioA.muted).toBe(true);
    expect(runtime.microphoneAudioC.muted).toBe(true);
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.microphoneAudioA.muted).toBe(true);
    expect(runtime.microphoneAudioC.muted).toBe(true);
  });

  it("AUDIO-DEAF-03: HIDDEN remains silent independently across Deafen transitions", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    detachAndHideOtherRuntimeShares("share-a");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioC.muted).toBe(true);
  });

  it("AUDIO-DEAF-04: Deafen does not modify visible Screen Share mute or volume", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    const before = { muted: runtime.screenAudioA.muted, volume: runtime.screenAudioA.volume };
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect({ muted: runtime.screenAudioA.muted, volume: runtime.screenAudioA.volume }).toEqual(before);
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect({ muted: runtime.screenAudioA.muted, volume: runtime.screenAudioA.volume }).toEqual(before);
  });

  it("AUDIO-DEAF-05: selfMute remains microphone-only and leaves Screen Share audio unchanged", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const before = [
      { muted: runtime.screenAudioA.muted, volume: runtime.screenAudioA.volume },
      { muted: runtime.screenAudioC.muted, volume: runtime.screenAudioC.volume },
    ];
    fireEvent.click(screen.getByTestId("runtime-mute"));
    expect(micTrack.enabled).toBe(false);
    expect([
      { muted: runtime.screenAudioA.muted, volume: runtime.screenAudioA.volume },
      { muted: runtime.screenAudioC.muted, volume: runtime.screenAudioC.volume },
    ]).toEqual(before);
  });

  it("AUDIO-STATE-01: two shares keep independent local mute and volume state", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    fireEvent.click(screen.getByTestId("runtime-mute-a"));
    fireEvent.click(screen.getByTestId("runtime-volume-c-70"));
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("true:0.2");
    expect(screen.getByTestId("runtime-audio-state-c")).toHaveTextContent("false:0.7");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioA.volume).toBe(0);
    expect(runtime.screenAudioC.muted).toBe(true);
    expect(runtime.screenAudioC.volume).toBe(0);
  });

  it("AUDIO-STATE-02: changing A volume does not affect C", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    expect(runtime.screenAudioA.volume).toBe(0);
    expect(runtime.screenAudioC.volume).toBe(0);
    expect(screen.getByTestId("runtime-audio-state-c")).toHaveTextContent("false:1");
  });

  it("AUDIO-STATE-03: HIDDEN silences A without destroying its stored state", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    detachAndHideOtherRuntimeShares("share-c");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioA.volume).toBe(0);
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:0.2");
  });

  it("AUDIO-STATE-04: returning HIDDEN A to visible restores its stored state", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    detachAndHideOtherRuntimeShares("share-c");
    expect(runtime.screenAudioA.muted).toBe(true);
    popInAndShowRuntimeShares("share-c");
    expect(runtime.screenAudioA.muted).toBe(true);
    expect(runtime.screenAudioA.volume).toBe(0);
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:0.2");
  });

  it("AUDIO-STATE-05: share end removes A1 settings and A2 starts with defaults", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    fireEvent.click(screen.getByTestId("runtime-mute-a"));
    const screenAudioA2 = await restartRuntimeShareA(runtime.audioElements);
    expect(screen.getByTestId("runtime-audio-state-keys")).not.toHaveTextContent("share-a,");
    expect(screen.getByTestId("runtime-audio-state-keys")).toHaveTextContent("share-a2");
    expect(screen.getByTestId("runtime-audio-state-a2")).toHaveTextContent("false:1");
    expect(screenAudioA2.muted).toBe(true);
    expect(screenAudioA2.volume).toBe(0);
  });

  it("AUDIO-STATE-06: volume is clamped to the local [0, 1] range", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-low"));
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:0");
    expect(runtime.screenAudioA.volume).toBe(0);
    fireEvent.click(screen.getByTestId("runtime-volume-a-high"));
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:1");
    expect(runtime.screenAudioA.volume).toBe(0);
  });

  it("AUDIO-STATE-07: local stream settings emit no WS event and cause no renegotiation", async () => {
    await setupRuntimeAudioWorkspace();
    const offerCounts = peerConnections.map((pc) => pc.createOffer.mock.calls.length);
    mockSocket.emit.mockClear();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    fireEvent.click(screen.getByTestId("runtime-mute-a"));
    fireEvent.click(screen.getByTestId("runtime-volume-c-70"));
    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(peerConnections.map((pc) => pc.createOffer.mock.calls.length)).toEqual(offerCounts);
  });
});

describe("single Screen Share audio sink ownership", () => {
  it("SSUX1: controls use classified audio independent of visual tracks and preserve mute/volume across Leave/Rejoin", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const slider = screen.getByRole("slider", { name: "Volume for presenter-a's stream" });
    expect(runtime.videoStreamA.getAudioTracks()).toEqual([]);
    expect(slider).toBeEnabled();
    fireEvent.change(slider, { target: { value: "37" } });
    fireEvent.click(screen.getByRole("button", { name: "Mute presenter-a's stream" }));
    fireEvent.change(slider, { target: { value: "62" } });
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("true:0.62");
    await leaveRuntimeShareA(runtime.audioElements);
    await rejoinRuntimeShareA(runtime.audioElements, 1);
    expect(screen.getByRole("slider", { name: "Volume for presenter-a's stream" })).toHaveValue("62");
    expect(screen.getByRole("button", { name: "Unmute presenter-a's stream" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("runtime-audio-state-c")).toHaveTextContent("false:1");
  });

  it("SSUX1: late classified audio enables the slider; ended audio disables it without stopping media", async () => {
    render(<RuntimeAudioHarness />);
    await act(async () => { fireEvent.click(screen.getByTestId("runtime-join")); });
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer" });
    const mic = makeTrack("late-mic", "audio"), video = makeTrack("late-video", "video");
    await act(async () => {
      peerConnections[0].ontrack?.({ track: mic, streams: [makeStream("mic", [mic])] });
      peerConnections[0].ontrack?.({ track: video, streams: [makeStream("video", [video])] });
    });
    const slider = screen.getByRole("slider"); expect(slider).toBeDisabled();
    const audio = Object.assign(new EventTarget(), makeTrack("late-audio", "audio"));
    await act(async () => { peerConnections[0].ontrack?.({ track: audio, streams: [makeStream("audio", [audio])] }); });
    expect(slider).toBeEnabled();
    act(() => { audio.readyState = "ended"; audio.dispatchEvent(new Event("ended")); });
    expect(slider).toBeDisabled(); expect(audio.stop).not.toHaveBeenCalled(); expect(video.stop).not.toHaveBeenCalled();
  });

  it("SINK-AUDIT-01 / SSUX1: combined receive media projects the same video track with no audio track", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    const matchingVideos = runtime.videoElements.filter((element) => (element.srcObject as MediaStream | null)?.getVideoTracks().includes(runtime.videoStreamA.getVideoTracks()[0]));
    expect(matchingVideos).toHaveLength(1);
    expect(matchingVideos[0].srcObject).not.toBe(runtime.videoStreamA);
    expect((matchingVideos[0].srcObject as MediaStream).getVideoTracks()).toEqual(runtime.videoStreamA.getVideoTracks());
    expect((matchingVideos[0].srcObject as MediaStream).getAudioTracks()).toEqual([]);
    expect(matchingVideos[0].muted).toBe(true);
  });

  it("SINK-AUDIT-02: a reclassified Screen Share track has SCREEN ownership only, never call and screen ownership", async () => {
    const runtime = await setupLateScreenAudioReclassification();
    expect(runtime.ownerBeforeShareIdentity).toBe("CALL_MIC_AUDIO");
    expect(runtime.sameScreenAudio.dataset.audioOwner).toBe("SCREEN_AUDIO:share-a");
    expect(runtime.sameScreenAudio.dataset.screenTrackId).toBe(runtime.screenAudioTrack.id);
    expect(runtime.audioElements.filter((element) =>
      containsTrack(element, runtime.screenAudioTrack) && element.dataset.audioOwner === "CALL_MIC_AUDIO",
    )).toHaveLength(0);
    expect(runtime.audioElements.filter((element) => containsTrack(element, runtime.screenAudioTrack))).toEqual([runtime.sameScreenAudio]);
  });

  it("SINK-AUDIT-03: a representative combined Screen Share track has one muted playout consumer", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    const matchingElements = [...runtime.audioElements, ...runtime.videoElements]
      .filter((element) => containsTrack(element, runtime.screenAudioTrackA));
    expect(matchingElements).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
  });

  it("SINK-FIX-01: every remote Screen Share visual renderer is non-audible", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    expect(runtime.videoElements).toHaveLength(2);
    runtime.videoElements.forEach((video) => {
      expect(video.muted).toBe(true);
      expect(video.playsInline).toBe(true);
    });
  });

  it("SINK-FIX-02: one Screen Share audio track has exactly one dedicated muted consumer", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    expect(runtime.screenAudioA.dataset.audioOwner).toBe("SCREEN_AUDIO:share-a");
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
  });

  it("SINK-FIX-03: audio-before-video reclassification atomically removes call playback ownership", async () => {
    const runtime = await setupLateScreenAudioReclassification();
    expect(runtime.ownerBeforeShareIdentity).toBe("CALL_MIC_AUDIO");
    expect(runtime.sameScreenAudio.dataset.audioOwner).toBe("SCREEN_AUDIO:share-a");
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.microphoneAudio.muted).toBe(true);
    expect(runtime.sameScreenAudio.muted).toBe(true);
    expect(playoutConsumersForTrack(runtime.screenAudioTrack, runtime.audioElements, runtime.videoElements)).toEqual([runtime.sameScreenAudio]);
  });

  it("SINK-FIX-04: separate audio and video MediaStreams still produce one Screen Share audio sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    expect(runtime.videoElements.filter((element) => containsTrack(element, runtime.screenAudioTrackA))).toHaveLength(0);
    expect(runtime.audioElements.filter((element) => containsTrack(element, runtime.screenAudioTrackA))).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
  });

  it("SINK-FIX-05: CENTRAL to FOCUS to DETACHED creates no additional playout consumer", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    const initialAudioElements = [...runtime.audioElements];
    const expectSingleConsumerA = () =>
      expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
    expectSingleConsumerA();
    fireEvent.doubleClick(screen.getByTestId("grid-media-share-a"));
    expectSingleConsumerA();
    detachAndHideOtherRuntimeShares("share-a");
    expectSingleConsumerA();
    expect(runtime.audioElements).toEqual(initialAudioElements);
  });

  it("SINK-FIX-06: A1 stop and A2 start never reuse stale A1 sink ownership", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const oldA1Sink = runtime.screenAudioA;
    const newA2Sink = await restartRuntimeShareA(runtime.audioElements);
    expect(oldA1Sink.srcObject).toBeNull();
    expect(newA2Sink).not.toBe(oldA1Sink);
    expect(newA2Sink.dataset.audioOwner).toBe("SCREEN_AUDIO:share-a2");
    expect(runtime.audioElements.filter((element) => element.dataset.audioOwner === "SCREEN_AUDIO:share-a2")).toEqual([newA2Sink]);
  });

  it("SINGLE-SINK-01: A DETACHED and C HIDDEN preserve one muted consumer per track", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    detachAndHideOtherRuntimeShares("share-a");
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackC, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioC]);
    expect(runtime.screenAudioC.muted).toBe(true);
  });

  it("SINGLE-SINK-02: switching detached target retains one muted consumer per track", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    detachAndHideOtherRuntimeShares("share-a");
    switchRuntimeFloating("presenter-c");
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackC, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioC]);
  });

  it("SINGLE-SINK-03: restoring retains both dedicated muted consumers without a second path", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    detachAndHideOtherRuntimeShares("share-a");
    popInAndShowRuntimeShares("share-a");
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackC, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioC]);
  });

  it("SINGLE-SINK-04: Deafen changes call audio only while visible and HIDDEN screen sinks remain presentation-controlled", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    detachAndHideOtherRuntimeShares("share-a");
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.microphoneAudioA.muted).toBe(true);
    expect(runtime.microphoneAudioC.muted).toBe(true);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioA]);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackC, runtime.audioElements, runtime.videoElements)).toEqual([runtime.screenAudioC]);
  });

  it("SINGLE-SINK-05: repeated presentation transitions never increase consumer count", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    const assertAtMostOneSinkPerTrack = () => {
      expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements).length).toBeLessThanOrEqual(1);
      expect(playoutConsumersForTrack(runtime.screenAudioTrackC, runtime.audioElements, runtime.videoElements).length).toBeLessThanOrEqual(1);
      expect(runtime.audioElements).toHaveLength(4);
    };
    assertAtMostOneSinkPerTrack();
    detachAndHideOtherRuntimeShares("share-a");
    assertAtMostOneSinkPerTrack();
    popInAndShowRuntimeShares("share-a");
    assertAtMostOneSinkPerTrack();
    fireEvent.doubleClick(screen.getByTestId("grid-media-share-a"));
    fireEvent.doubleClick(screen.getByTestId("focus-secondary-media-share-c"));
    assertAtMostOneSinkPerTrack();
    detachAndHideOtherRuntimeShares("share-a");
    assertAtMostOneSinkPerTrack();
    switchRuntimeFloating("presenter-c");
    assertAtMostOneSinkPerTrack();
  });

  it("SINGLE-SINK-06: actual visual video elements remain muted through visual transitions", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    const expectEveryCreatedVideoMuted = () => runtime.videoElements.forEach((video) => expect(video.muted).toBe(true));
    expectEveryCreatedVideoMuted();
    fireEvent.doubleClick(screen.getByTestId("grid-media-share-a"));
    expectEveryCreatedVideoMuted();
    detachAndHideOtherRuntimeShares("share-a");
    expectEveryCreatedVideoMuted();
    switchRuntimeFloating("presenter-c");
    expectEveryCreatedVideoMuted();
    popInAndShowRuntimeShares("share-c");
    expectEveryCreatedVideoMuted();
  });
});

describe("Screen Share audio sink Leave and rejoin lifecycle", () => {
  it("REJOIN-CLEAN-01: authoritative Leave changes A from one consumer to zero active consumers", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([runtime.screenAudioA]);
    await leaveRuntimeShareA(runtime.audioElements);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(0);
    expect(playoutConsumersForTrack(runtime.screenAudioTrackA, runtime.audioElements, runtime.videoElements)).toHaveLength(0);
  });

  it("REJOIN-CLEAN-02: Leave pauses, releases, and removes the old element from active ownership", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const { oldSink, pauseSpy } = await leaveRuntimeShareA(runtime.audioElements);
    expect(pauseSpy).toHaveBeenCalled();
    expect(oldSink.srcObject).toBeNull();
    expect(oldSink.dataset.audioOwner).toBe("RELEASED_SCREEN_AUDIO:share-a");
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(0);
  });

  it("REJOIN-CLEAN-03: the old media key cannot continue or resurrect playback after Leave", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const initialElementCount = runtime.audioElements.length;
    const { oldSink } = await leaveRuntimeShareA(runtime.audioElements);
    await act(async () => {
      peerConnections[0].ontrack?.({ track: runtime.screenAudioTrackA, streams: [runtime.screenAudioStreamA] });
    });
    expect(runtime.audioElements).toHaveLength(initialElementCount);
    expect(oldSink.srcObject).toBeNull();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(0);
  });

  it("REJOIN-CLEAN-04: Leave also releases temporary pending CALL ownership for A", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const audioElements: HTMLAudioElement[] = [];
    jest.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === "audio") audioElements.push(element as HTMLAudioElement);
      return element;
    });
    render(<RuntimeAudioHarness />);
    await act(async () => { fireEvent.click(screen.getByTestId("runtime-join")); });
    await waitFor(() => expect(screen.getByTestId("runtime-status")).toHaveTextContent("connected"));
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });
    const micTrackA = makeTrack("pending-clean-mic-a", "audio");
    const micStreamA = makeStream("pending-clean-mic-stream-a", [micTrackA]);
    const pendingTrack = makeTrack("pending-clean-screen-a", "audio");
    const pendingStream = makeStream("pending-clean-screen-stream-a", [pendingTrack]);
    await act(async () => {
      peerConnections[0].ontrack?.({ track: micTrackA, streams: [micStreamA] });
      peerConnections[0].ontrack?.({ track: pendingTrack, streams: [pendingStream] });
    });
    const pendingElement = audioElements.find((element) => containsTrack(element, pendingTrack))!;
    expect(pendingElement.dataset.audioOwner).toBe("CALL_MIC_AUDIO");
    const pauseSpy = jest.spyOn(pendingElement, "pause");
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "me" });
    expect(pauseSpy).toHaveBeenCalled();
    expect(pendingElement.srcObject).toBeNull();
    expect(pendingElement.dataset.audioOwner).toBe("RELEASED_SCREEN_AUDIO:share-a");
  });

  it("REJOIN-CLEAN-05: leaving A preserves unrelated subscribed C and A's local preference", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    await leaveRuntimeShareA(runtime.audioElements);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-c")).toEqual([runtime.screenAudioC]);
    expect(containsTrack(runtime.screenAudioC, runtime.screenAudioTrackC)).toBe(true);
    expect(screen.getByTestId("runtime-audio-state-a")).toHaveTextContent("false:0.2");
  });

  it("REJOIN-IDEMP-01: Leave then Join of the same active share creates exactly one fresh sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    const { oldSink } = await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([rejoined.sink]);
    expect(rejoined.sink).not.toBe(oldSink);
    expect(rejoined.sink.volume).toBe(0);
    expect(oldSink.srcObject).toBeNull();
  });

  it("REJOIN-IDEMP-02: three Leave and Join cycles alternate active sink count strictly between zero and one", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await leaveRuntimeShareA(runtime.audioElements);
      expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(0);
      await rejoinRuntimeShareA(runtime.audioElements, cycle);
      expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
    }
  });

  it("REJOIN-IDEMP-03: rejoin has one muted consumer and no active pre-Leave consumer", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const { oldSink } = await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    expect(playoutConsumersForTrack(rejoined.audioTrack, runtime.audioElements, runtime.videoElements)).toEqual([rejoined.sink]);
    expect(oldSink.srcObject).toBeNull();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
  });

  it("REJOIN-IDEMP-04: stale old media events cannot resurrect the old sink or disturb the new sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const { oldSink } = await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    const elementCountAfterRejoin = runtime.audioElements.length;
    await act(async () => {
      peerConnections[0].ontrack?.({ track: runtime.screenAudioTrackA, streams: [runtime.screenAudioStreamA] });
      peerConnections[0].ontrack?.({ track: runtime.videoStreamA.getVideoTracks()[0], streams: [runtime.videoStreamA] });
    });
    expect(runtime.audioElements).toHaveLength(elementCountAfterRejoin);
    expect(oldSink.srcObject).toBeNull();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([rejoined.sink]);
  });

  it("REJOIN-IDEMP-05: A1 end followed by A2 cannot inherit stale A1 sink ownership", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const oldA1Sink = runtime.screenAudioA;
    const newA2Sink = await restartRuntimeShareA(runtime.audioElements);
    expect(oldA1Sink.srcObject).toBeNull();
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(0);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a2")).toEqual([newA2Sink]);
  });

  it("REJOIN-IDEMP-06: C remains the same valid sink through repeated A Leave and Join cycles", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await leaveRuntimeShareA(runtime.audioElements);
      expect(activeScreenSinksForShare(runtime.audioElements, "share-c")).toEqual([runtime.screenAudioC]);
      await rejoinRuntimeShareA(runtime.audioElements, cycle);
      expect(activeScreenSinksForShare(runtime.audioElements, "share-c")).toEqual([runtime.screenAudioC]);
    }
  });

  it("REJOIN-HIDDEN-01: after rejoin HIDDEN A's actual sole sink is muted with no stale audible sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    const { oldSink } = await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    detachAndHideOtherRuntimeShares("share-c");
    expect(rejoined.sink.muted).toBe(true);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([rejoined.sink]);
    expect(oldSink.srcObject).toBeNull();
    expect(playoutConsumersForTrack(rejoined.audioTrack, runtime.audioElements, runtime.videoElements)).toEqual([rejoined.sink]);
  });

  it("REJOIN-HIDDEN-02: detach switch after rejoin mutes C and unmutes A's sole sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    detachAndHideOtherRuntimeShares("share-c");
    switchRuntimeFloating("presenter-a");
    expect(runtime.screenAudioC.muted).toBe(true);
    expect(rejoined.sink.muted).toBe(true);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([rejoined.sink]);
  });

  it("REJOIN-HIDDEN-03: restore after rejoin preserves volume and creates no duplicate sink", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    fireEvent.click(screen.getByTestId("runtime-volume-a-20"));
    await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    detachAndHideOtherRuntimeShares("share-c");
    popInAndShowRuntimeShares("share-c");
    expect(rejoined.sink.muted).toBe(true);
    expect(rejoined.sink.volume).toBe(0);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toEqual([rejoined.sink]);
  });

  it("REJOIN-HIDDEN-04: presentation transitions after multiple rejoin cycles keep one-sink ownership", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    for (let cycle = 1; cycle <= 2; cycle += 1) {
      await leaveRuntimeShareA(runtime.audioElements);
      await rejoinRuntimeShareA(runtime.audioElements, cycle);
    }
    detachAndHideOtherRuntimeShares("share-c");
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
    switchRuntimeFloating("presenter-a");
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
    popInAndShowRuntimeShares("share-a");
    expect(activeScreenSinksForShare(runtime.audioElements, "share-a")).toHaveLength(1);
    expect(activeScreenSinksForShare(runtime.audioElements, "share-c")).toHaveLength(1);
  });

  it("REJOIN-HIDDEN-05: Deafen remains independent from Screen Share playback after rejoin", async () => {
    const runtime = await setupRuntimeAudioWorkspace();
    await leaveRuntimeShareA(runtime.audioElements);
    const rejoined = await rejoinRuntimeShareA(runtime.audioElements, 1);
    detachAndHideOtherRuntimeShares("share-c");
    const before = { aMuted: rejoined.sink.muted, cMuted: runtime.screenAudioC.muted };
    fireEvent.click(screen.getByTestId("runtime-deafen"));
    expect(runtime.microphoneAudioA.muted).toBe(true);
    expect(runtime.microphoneAudioC.muted).toBe(true);
    expect({ aMuted: rejoined.sink.muted, cMuted: runtime.screenAudioC.muted }).toEqual(before);
  });

  it("REJOIN-HIDDEN-06: visual Screen Share videos remain muted through Leave, rejoin, and presentation transitions", async () => {
    const runtime = await setupRuntimeAudioWorkspace({ combinedScreenMedia: true });
    await leaveRuntimeShareA(runtime.audioElements);
    await rejoinRuntimeShareA(runtime.audioElements, 1);
    detachAndHideOtherRuntimeShares("share-c");
    switchRuntimeFloating("presenter-a");
    popInAndShowRuntimeShares("share-a");
    runtime.videoElements.forEach((video) => expect(video.muted).toBe(true));
  });
});

describe("selective screen transport", () => {
  async function connectPeer(userId: string) {
    await triggerSocket("voice:user-joined", { userId, username: userId });
    const pc = peerConnections[peerConnections.length - 1];
    await triggerSocket("voice:answer", { fromUserId: userId, sdp: `${userId}-initial-answer` });
    return pc;
  }

  function screenTracks(pc: MockPeerConnection) {
    return pc.senders.map((sender) => sender.track).filter((track) => track !== micTrack);
  }

  it("SELECTIVE-01: existing unsubscribed voice peer retains mic and receives no display senders", async () => {
    const video = makeTrack("selective-01-video", "video");
    const audio = makeTrack("selective-01-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-01-display", [video, audio]));
    await joinVoice();
    const pc = await connectPeer("viewer-b");

    await startShare("share-a");

    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(pc.addTrack).not.toHaveBeenCalledWith(video, expect.anything());
    expect(pc.addTrack).not.toHaveBeenCalledWith(audio, expect.anything());
  });

  it("SELECTIVE-02: late unsubscribed voice peer gets microphone only", async () => {
    const video = makeTrack("selective-02-video", "video");
    const audio = makeTrack("selective-02-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-02-display", [video, audio]));
    await joinVoice();
    await startShare("share-a");

    const pc = await connectPeer("viewer-b");

    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(screenTracks(pc)).toHaveLength(0);
  });

  it("SELECTIVE-03: authoritative Join adds video/audio only to B and renegotiates once", async () => {
    const video = makeTrack("selective-03-video", "video");
    const audio = makeTrack("selective-03-audio", "audio");
    const display = makeStream("selective-03-display", [video, audio]);
    getDisplayMediaMock.mockResolvedValue(display);
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startShare("share-a");

    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });

    expect(pc.addTrack).toHaveBeenCalledWith(video, display);
    expect(pc.addTrack).toHaveBeenCalledWith(audio, display);
    expect(pc.senders.some((sender) => sender.track === micTrack)).toBe(true);
    expect(pc.createOffer).toHaveBeenCalledTimes(2);
  });

  it("SELECTIVE-04: authoritative Leave removes display senders, preserves mic, and renegotiates", async () => {
    const video = makeTrack("selective-04-video", "video");
    const audio = makeTrack("selective-04-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-04-display", [video, audio]));
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startShare("share-a");
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });
    const screenSenders = pc.senders.filter((sender) => sender.track !== micTrack);
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "join-answer" });

    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });

    expect(pc.removeTrack).toHaveBeenCalledWith(screenSenders[0]);
    expect(pc.removeTrack).toHaveBeenCalledWith(screenSenders[1]);
    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(pc.createOffer).toHaveBeenCalledTimes(3);
  });

  it("SELECTIVE-05: duplicate authoritative Join creates no duplicate senders or offer", async () => {
    const video = makeTrack("selective-05-video", "video");
    const audio = makeTrack("selective-05-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-05-display", [video, audio]));
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startShare("share-a");

    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });

    expect(pc.addTrack.mock.calls.filter(([track]) => track === video)).toHaveLength(1);
    expect(pc.addTrack.mock.calls.filter(([track]) => track === audio)).toHaveLength(1);
    expect(pc.createOffer).toHaveBeenCalledTimes(2);
  });

  it("SELECTIVE-06: duplicate authoritative Leave is safe and microphone remains", async () => {
    const video = makeTrack("selective-06-video", "video");
    const audio = makeTrack("selective-06-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-06-display", [video, audio]));
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startShare("share-a");
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "join-answer" });

    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });

    expect(pc.removeTrack).toHaveBeenCalledTimes(2);
    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(pc.createOffer).toHaveBeenCalledTimes(3);
  });

  it("SELECTIVE-07: B and C receive transport independently as their choices change", async () => {
    const video = makeTrack("selective-07-video", "video");
    const audio = makeTrack("selective-07-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-07-display", [video, audio]));
    await joinVoice();
    const pcB = await connectPeer("viewer-b");
    const pcC = await connectPeer("viewer-c");
    await startShare("share-a");

    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-b" });
    expect(screenTracks(pcB)).toEqual(expect.arrayContaining([video, audio]));
    expect(screenTracks(pcC)).toHaveLength(0);

    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-c" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });
    expect(screenTracks(pcB)).toHaveLength(0);
    expect(screenTracks(pcC)).toEqual(expect.arrayContaining([video, audio]));
    expect(pcB.senders.some((sender) => sender.track === micTrack)).toBe(true);
    expect(pcC.senders.some((sender) => sender.track === micTrack)).toBe(true);
  });

  it("SELECTIVE-08: leaving presenter A transport preserves presenter C transport", () => {
    const pcA = new MockPeerConnection();
    const pcC = new MockPeerConnection();
    const micA = makeTrack("selective-08-mic-a", "audio");
    const micC = makeTrack("selective-08-mic-c", "audio");
    const videoA = makeTrack("selective-08-video-a", "video");
    const videoC = makeTrack("selective-08-video-c", "video");
    const displayA = makeStream("selective-08-display-a", [videoA]);
    const displayC = makeStream("selective-08-display-c", [videoC]);
    pcA.addTrack(micA, makeStream("selective-08-mic-stream-a", [micA]));
    pcC.addTrack(micC, makeStream("selective-08-mic-stream-c", [micC]));
    const sendersA = new Map<string, ScreenSenderRecord>();
    const sendersC = new Map<string, ScreenSenderRecord>();

    reconcileScreenSendersForPeer(sendersA, "viewer-b", pcA as unknown as RTCPeerConnection, "share-a", displayA, true);
    reconcileScreenSendersForPeer(sendersC, "viewer-b", pcC as unknown as RTCPeerConnection, "share-c", displayC, true);
    reconcileScreenSendersForPeer(sendersA, "viewer-b", pcA as unknown as RTCPeerConnection, "share-a", displayA, false);

    expect(pcA.senders.map((sender) => sender.track)).toEqual([micA]);
    expect(pcC.senders.map((sender) => sender.track)).toEqual([micC, videoC]);
    expect(sendersA.has("viewer-b")).toBe(false);
    expect(sendersC.get("viewer-b")?.shareId).toBe("share-c");
  });

  it("SELECTIVE-09: authoritative subscription before peer creation enters the initial offer once", async () => {
    const video = makeTrack("selective-09-video", "video");
    const audio = makeTrack("selective-09-audio", "audio");
    const display = makeStream("selective-09-display", [video, audio]);
    getDisplayMediaMock.mockResolvedValue(display);
    await joinVoice();
    await startShare("share-a");
    await triggerSocket("screen:viewer-state", {
      subscribedShareIds: [],
      presenterShares: [{ shareId: "share-a", viewerIds: ["viewer-b"] }],
    });

    await triggerSocket("voice:user-joined", { userId: "viewer-b", username: "viewer-b" });
    const pc = peerConnections[0];

    expect(pc.addTrack.mock.calls.filter(([track]) => track === video)).toHaveLength(1);
    expect(pc.addTrack.mock.calls.filter(([track]) => track === audio)).toHaveLength(1);
    expect(pc.createOffer).toHaveBeenCalledTimes(1);
  });

  it("SELECTIVE-10: authoritative unsubscribed state removes stale display senders but preserves mic", async () => {
    const video = makeTrack("selective-10-video", "video");
    const audio = makeTrack("selective-10-audio", "audio");
    getDisplayMediaMock.mockResolvedValue(makeStream("selective-10-display", [video, audio]));
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startShare("share-a");
    await triggerSocket("screen:viewer-state", {
      subscribedShareIds: [],
      presenterShares: [{ shareId: "share-a", viewerIds: ["viewer-b"] }],
    });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "state-join-answer" });

    await triggerSocket("screen:viewer-state", {
      subscribedShareIds: [],
      presenterShares: [{ shareId: "share-a", viewerIds: [] }],
    });

    expect(screenTracks(pc)).toHaveLength(0);
    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(pc.removeTrack).toHaveBeenCalledTimes(2);
  });
});

describe("screen share lifecycle regression", () => {
  async function connectPeer(userId: string) {
    await triggerSocket("voice:user-joined", { userId, username: userId });
    const pc = peerConnections[peerConnections.length - 1];
    await triggerSocket("voice:answer", { fromUserId: userId, sdp: `${userId}-initial-answer` });
    return pc;
  }

  function nonMicTracks(pc: MockPeerConnection) {
    return pc.senders.map((sender) => sender.track).filter((track) => track !== micTrack);
  }

  async function startLocalShareWithViewer(shareId: string, viewerId: string, stream: MediaStream) {
    getDisplayMediaMock.mockResolvedValueOnce(stream);
    await startShare(shareId);
    await triggerSocket("screen:viewer-joined", { shareId, viewerId });
  }

  function mediaAudio(id: string) {
    const track = Object.assign(makeTrack(id, "audio"), {
      contentHint: "",
      getCapabilities: () => ({ echoCancellation: [true, false], noiseSuppression: [true, false], autoGainControl: [true, false], channelCount: { min: 1, max: 2 }, sampleRate: { min: 48000, max: 48000 } }),
      getSettings: () => ({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2, sampleRate: 48000 }),
      applyConstraints: jest.fn(async () => {}),
    });
    Object.defineProperty(track, "contentHint", {
      configurable: true,
      get: () => "",
      set: () => { throw new Error("Screen contentHint must remain untouched"); },
    });
    return track;
  }

  it("AUDIO-FIDELITY: actual capture, all viewers, rejoin and restart receive independent Screen policies", async () => {
    const video = makeTrack("quality-video", "video"); const audio = mediaAudio("quality-audio");
    const setContentHint = jest.spyOn(audio, "contentHint", "set");
    await joinVoice();
    const b = await connectPeer("viewer-b");
    await startLocalShareWithViewer("quality-a1", "viewer-b", makeStream("quality-display-a1", [video, audio]));
    expect(getDisplayMediaMock).toHaveBeenCalledWith({ video: true, audio: {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      channelCount: { ideal: 2 }, sampleRate: { ideal: 48000 },
    } });
    expect(setContentHint).not.toHaveBeenCalled();
    expect(audio.applyConstraints).toHaveBeenCalledWith(expect.objectContaining({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }));
    expect(micTrack).not.toHaveProperty("contentHint");
    const assertPolicy = (pc: MockPeerConnection, track: MockTrack) => {
      const sender = pc.senders.find((entry) => entry.track === track)!;
      expect(sender.getParameters().encodings[0]).toMatchObject({ maxBitrate: 64000, priority: "high", networkPriority: "high", dtx: "disabled" });
      expect(pc.senders.find((entry) => entry.track === micTrack)!.setParameters).not.toHaveBeenCalled();
      expect(pc.senders.find((entry) => entry.track.kind === "video")!.setParameters).not.toHaveBeenCalled();
      return sender;
    };
    const first = assertPolicy(b, audio);
    const c = await connectPeer("viewer-c");
    await triggerSocket("screen:viewer-joined", { shareId: "quality-a1", viewerId: "viewer-c" });
    assertPolicy(c, audio);
    await triggerSocket("screen:viewer-left", { shareId: "quality-a1", viewerId: "viewer-b" });
    const oldCalls = first.setParameters.mock.calls.length;
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "leave-answer" });
    await triggerSocket("screen:viewer-joined", { shareId: "quality-a1", viewerId: "viewer-b" });
    expect(assertPolicy(b, audio)).not.toBe(first);
    expect(first.setParameters).toHaveBeenCalledTimes(oldCalls);
    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    await triggerSocket("screen:share-stopped", { shareId: "quality-a1", presenterId: "me" });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "stop-answer" });
    const next = mediaAudio("quality-audio-a2");
    const setNextContentHint = jest.spyOn(next, "contentHint", "set");
    await startLocalShareWithViewer("quality-a2", "viewer-b", makeStream("quality-display-a2", [makeTrack("quality-video-a2", "video"), next]));
    expect(setNextContentHint).not.toHaveBeenCalled();
    expect(assertPolicy(b, next)).not.toBe(first);
    expect(audio.stop).toHaveBeenCalledTimes(1);
    expect(c.senders).toHaveLength(1);
  });

  it("AUDIO-FIDELITY: optional capture and sender rejection preserve live sharing and report diagnostics", async () => {
    localStorage.setItem("debugVoice", "true");
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      const audio = mediaAudio("reject-audio");
      audio.applyConstraints.mockRejectedValue(new DOMException("unsupported", "OverconstrainedError"));
      await joinVoice(); const pc = await connectPeer("viewer-b");
      const addTrack = pc.addTrack.getMockImplementation()!;
      pc.addTrack.mockImplementation((track, stream) => {
        const sender = addTrack(track, stream);
        if (track === audio) (sender.setParameters as jest.Mock).mockRejectedValue(new DOMException("unsupported", "InvalidModificationError"));
        return sender;
      });
      await startLocalShareWithViewer("quality-error", "viewer-b", makeStream("quality-error-display", [makeTrack("reject-video", "video"), audio]));
      expect(screen.getByTestId("status")).toHaveTextContent("connected");
      expect(screen.getByTestId("local-screen")).toHaveTextContent("quality-error-display");
      expect(audio.stop).not.toHaveBeenCalled();
      expect(pc.senders.find((entry) => entry.track === micTrack)!.setParameters).not.toHaveBeenCalled();
      expect(log.mock.calls.some((call) => call[0] === "[VoiceDiag]" && call[1]?.type === "screen-audio-quality" && call[1]?.data?.evidence?.outcomes?.maxBitrate === "rejected:InvalidModificationError")).toBe(true);
    } finally { localStorage.removeItem("debugVoice"); log.mockRestore(); }
  });

  it("AUDIO-FIDELITY: late tuning completion after disconnect stops capture without publishing", async () => {
    const audio = mediaAudio("delayed-audio"); const video = makeTrack("delayed-video", "video");
    let finish!: () => void;
    audio.applyConstraints.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    await joinVoice();
    getDisplayMediaMock.mockResolvedValueOnce(makeStream("delayed-display", [video, audio]));
    await act(async () => { fireEvent.click(screen.getByTestId("start")); });
    await triggerSocket("screen:share-started", { shareId: "delayed", channelId: "voice-1", presenterId: "me" });
    await act(async () => { fireEvent.click(screen.getByTestId("leave")); finish(); });
    expect(screen.getByTestId("local-screen")).toHaveTextContent("none");
    expect(audio.stop).toHaveBeenCalledTimes(1);
    expect(video.stop).toHaveBeenCalledTimes(1);
  });

  it("LIFE-VIEW-01: viewer leaves voice while subscribed and presenter transport is cleaned", async () => {
    const video = makeTrack("life-view-01-video", "video");
    const audio = makeTrack("life-view-01-audio", "audio");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a", "viewer-b", makeStream("life-view-01-display", [video, audio]));
    expect(nonMicTracks(pc)).toEqual(expect.arrayContaining([video, audio]));

    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("voice:user-left", { userId: "viewer-b" });

    expect(nonMicTracks(pc)).toHaveLength(0);
    expect(pc.close).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");
    expect(screen.getByTestId("local-screen")).toHaveTextContent("life-view-01-display");
  });

  it("LIFE-VIEW-02: owning viewer socket disconnect removes its viewer state exactly once", async () => {
    const video = makeTrack("life-view-02-video", "video");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a", "viewer-b", makeStream("life-view-02-display", [video]));

    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a", viewerId: "viewer-b" });
    await triggerSocket("voice:user-left", { userId: "viewer-b" });

    expect(pc.removeTrack).toHaveBeenCalledTimes(1);
    expect(pc.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");
  });

  it("LIFE-VIEW-03: unrelated same-user socket disconnect preserves the active viewer", async () => {
    const video = makeTrack("life-view-03-video", "video");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a", "viewer-b", makeStream("life-view-03-display", [video]));

    await triggerSocket("screen:viewer-state", {
      subscribedShareIds: [],
      presenterShares: [{ shareId: "share-a", viewerIds: ["viewer-b"] }],
    });

    expect(nonMicTracks(pc)).toEqual([video]);
    expect(pc.close).not.toHaveBeenCalled();
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("share-a:viewer-b");
  });

  it("LIFE-PRES-01: normal stop cleans all viewers while preserving microphone transport", async () => {
    const video = makeTrack("life-pres-01-video", "video");
    const audio = makeTrack("life-pres-01-audio", "audio");
    await joinVoice();
    const pcB = await connectPeer("viewer-b");
    const pcC = await connectPeer("viewer-c");
    await startLocalShareWithViewer("share-a", "viewer-b", makeStream("life-pres-01-display", [video, audio]));
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "viewer-c" });

    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    await triggerSocket("screen:share-stopped", { shareId: "share-a", presenterId: "me" });

    expect(nonMicTracks(pcB)).toHaveLength(0);
    expect(nonMicTracks(pcC)).toHaveLength(0);
    expect(pcB.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(pcC.senders.map((sender) => sender.track)).toEqual([micTrack]);
    expect(video.stop).toHaveBeenCalledTimes(1);
    expect(audio.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("local-screen")).toHaveTextContent("none");
    expect(screen.getByTestId("share-ids")).toHaveTextContent("none");
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("none");
  });

  it("LIFE-PRES-02: presenter leaving voice clears local capture, peers, and share state", async () => {
    const video = makeTrack("life-pres-02-video", "video");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a", "viewer-b", makeStream("life-pres-02-display", [video]));

    await act(async () => { fireEvent.click(screen.getByTestId("leave")); });

    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("local-screen")).toHaveTextContent("none");
    expect(screen.getByTestId("share-ids")).toHaveTextContent("none");
    expect(pc.close).toHaveBeenCalledTimes(1);
    expect(video.stop).toHaveBeenCalledTimes(1);
  });

  it("LIFE-PRES-03: presenter socket disconnect clears remote media and subscription state", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "initial-offer" });
    const pc = peerConnections[0];
    const video = makeTrack("life-pres-03-video", "video");
    const display = makeStream("life-pres-03-display", [video]);
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
    await act(async () => { pc.ontrack?.({ track: video, streams: [display] }); });

    await triggerSocket("screen:share-stopped", { shareId: "share-a", presenterId: "presenter-a" });
    await triggerSocket("voice:user-left", { userId: "presenter-a" });

    expect(screen.getByTestId("share-ids")).toHaveTextContent("none");
    expect(screen.getByTestId("subscription-ids")).toHaveTextContent("none");
    expect(screen.getByTestId("remote-screens")).toHaveTextContent("none");
    expect(pc.close).toHaveBeenCalledTimes(1);
  });

  it("LIFE-PRES-04: presenter starts a clean new share and stale A1 cleanup cannot remove A2", async () => {
    const firstVideo = makeTrack("life-pres-04-video-a1", "video");
    const secondVideo = makeTrack("life-pres-04-video-a2", "video");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a1", "viewer-b", makeStream("life-pres-04-display-a1", [firstVideo]));
    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    await triggerSocket("screen:share-stopped", { shareId: "share-a1", presenterId: "me" });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "a1-stop-answer" });

    await startLocalShareWithViewer("share-a2", "viewer-b", makeStream("life-pres-04-display-a2", [secondVideo]));
    await triggerSocket("screen:share-stopped", { shareId: "share-a1", presenterId: "me" });

    expect(screen.getByTestId("local-screen")).toHaveTextContent("life-pres-04-display-a2");
    expect(screen.getByTestId("share-ids")).toHaveTextContent("share-a2");
    expect(pc.senders.some((sender) => sender.track === secondVideo)).toBe(true);
    expect(secondVideo.stop).not.toHaveBeenCalled();
    expect(pc.addTrack.mock.calls.filter(([track]) => track === secondVideo)).toHaveLength(1);
  });

  it("LIFE-MULTI-01: stopping A preserves C share, subscription, and media", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });
    await triggerSocket("voice:offer", { fromUserId: "presenter-c", sdp: "offer-c" });
    const pcA = peerConnections[0];
    const pcC = peerConnections[1];
    const videoA = makeTrack("life-multi-01-video-a", "video");
    const videoC = makeTrack("life-multi-01-video-c", "video");
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:share-started", { shareId: "share-c", channelId: "voice-1", presenterId: "presenter-c" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-c", viewerId: "me" });
    await act(async () => {
      pcA.ontrack?.({ track: videoA, streams: [makeStream("display-a", [videoA])] });
      pcC.ontrack?.({ track: videoC, streams: [makeStream("display-c", [videoC])] });
    });

    await triggerSocket("screen:share-stopped", { shareId: "share-a", presenterId: "presenter-a" });

    expect(screen.getByTestId("share-ids")).toHaveTextContent("share-c");
    expect(screen.getByTestId("subscription-ids")).toHaveTextContent("share-c");
    expect(screen.getByTestId("remote-screens")).toHaveTextContent("presenter-c:display-c");
    expect(screen.getByTestId("remote-screens")).not.toHaveTextContent("presenter-a:display-a");
  });

  it("LIFE-MULTI-02: disconnecting A preserves C share, subscription, and peer", async () => {
    await joinVoice();
    await triggerSocket("voice:offer", { fromUserId: "presenter-a", sdp: "offer-a" });
    await triggerSocket("voice:offer", { fromUserId: "presenter-c", sdp: "offer-c" });
    const pcA = peerConnections[0];
    const pcC = peerConnections[1];
    await triggerSocket("screen:share-started", { shareId: "share-a", channelId: "voice-1", presenterId: "presenter-a" });
    await triggerSocket("screen:share-started", { shareId: "share-c", channelId: "voice-1", presenterId: "presenter-c" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a", viewerId: "me" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-c", viewerId: "me" });

    await triggerSocket("voice:user-left", { userId: "presenter-a" });

    expect(pcA.close).toHaveBeenCalledTimes(1);
    expect(pcC.close).not.toHaveBeenCalled();
    expect(screen.getByTestId("share-ids")).toHaveTextContent("share-c");
    expect(screen.getByTestId("subscription-ids")).toHaveTextContent("share-c");
  });

  it("LIFE-MULTI-03: viewer cleanup for A does not affect C transport", () => {
    const pcA = new MockPeerConnection();
    const pcC = new MockPeerConnection();
    const videoA = makeTrack("life-multi-03-video-a", "video");
    const videoC = makeTrack("life-multi-03-video-c", "video");
    const sendersA = new Map<string, ScreenSenderRecord>();
    const sendersC = new Map<string, ScreenSenderRecord>();
    reconcileScreenSendersForPeer(sendersA, "viewer-b", pcA as unknown as RTCPeerConnection, "share-a", makeStream("display-a", [videoA]), true);
    reconcileScreenSendersForPeer(sendersC, "viewer-b", pcC as unknown as RTCPeerConnection, "share-c", makeStream("display-c", [videoC]), true);

    reconcileScreenSendersForPeer(sendersA, "viewer-b", pcA as unknown as RTCPeerConnection, "share-a", null, false);

    expect(pcA.senders).toHaveLength(0);
    expect(pcC.senders.map((sender) => sender.track)).toEqual([videoC]);
    expect(sendersA.has("viewer-b")).toBe(false);
    expect(sendersC.get("viewer-b")?.shareId).toBe("share-c");
  });

  it("LIFE-MULTI-04: repeated join, leave, stop, and restart stays duplicate-free", async () => {
    const firstVideo = makeTrack("life-multi-04-video-a1", "video");
    const secondVideo = makeTrack("life-multi-04-video-a2", "video");
    await joinVoice();
    const pc = await connectPeer("viewer-b");
    await startLocalShareWithViewer("share-a1", "viewer-b", makeStream("life-multi-04-display-a1", [firstVideo]));
    await triggerSocket("screen:viewer-joined", { shareId: "share-a1", viewerId: "viewer-b" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a1", viewerId: "viewer-b" });
    await triggerSocket("screen:viewer-left", { shareId: "share-a1", viewerId: "viewer-b" });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "leave-answer" });
    await triggerSocket("screen:viewer-joined", { shareId: "share-a1", viewerId: "viewer-b" });
    await act(async () => { fireEvent.click(screen.getByTestId("stop")); });
    await triggerSocket("screen:share-stopped", { shareId: "share-a1", presenterId: "me" });
    await triggerSocket("voice:answer", { fromUserId: "viewer-b", sdp: "stop-answer" });
    await startLocalShareWithViewer("share-a2", "viewer-b", makeStream("life-multi-04-display-a2", [secondVideo]));
    await triggerSocket("screen:viewer-joined", { shareId: "share-a2", viewerId: "viewer-b" });

    expect(pc.addTrack.mock.calls.filter(([track]) => track === firstVideo)).toHaveLength(2);
    expect(pc.addTrack.mock.calls.filter(([track]) => track === secondVideo)).toHaveLength(1);
    expect(pc.senders.filter((sender) => sender.track === secondVideo)).toHaveLength(1);
    expect(pc.senders.filter((sender) => sender.track === micTrack)).toHaveLength(1);
    expect(screen.getByTestId("share-ids")).toHaveTextContent("share-a2");
    expect(screen.getByTestId("viewer-ids")).toHaveTextContent("share-a2:viewer-b");
  });
});
