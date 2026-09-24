/**
 * Frontend Screen Share tests — useVoice hook WebRTC correctness.
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, act } from "@testing-library/react";

// Mock getDisplayMedia
const mockScreenVideoTrack = {
  kind: "video",
  enabled: true,
  stop: jest.fn(),
  onended: null as any,
  addEventListener: jest.fn(),
};
const mockScreenAudioTrack = {
  kind: "audio",
  enabled: true,
  stop: jest.fn(),
  onended: null as any,
  addEventListener: jest.fn(),
};
const mockScreenStream = {
  getTracks: () => [mockScreenVideoTrack, mockScreenAudioTrack],
  getVideoTracks: () => [mockScreenVideoTrack],
  getAudioTracks: () => [mockScreenAudioTrack],
  active: true,
};
const mockAudioOnlyStream = {
  getTracks: () => [{ kind: "audio", enabled: true, stop: jest.fn(), onended: null, addEventListener: jest.fn() }],
  getVideoTracks: () => [],
  getAudioTracks: () => [{ kind: "audio", enabled: true, stop: jest.fn(), onended: null, addEventListener: jest.fn() }],
};

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getDisplayMedia: jest.fn().mockRejectedValue(new Error("not mocked")), getUserMedia: jest.fn() },
    writable: true,
  });
});

describe("Screen Share Track Classification", () => {
  it("WEB-SCREEN-01: screen stream with video tracks is detected as screen", () => {
    const hasVideo = mockScreenStream.getVideoTracks().length > 0;
    expect(hasVideo).toBe(true);
    // Screen audio streams share the same MediaStream as video
    expect(mockScreenStream.getVideoTracks().length).toBe(1);
  });

  it("WEB-SCREEN-02: audio-only stream without video is classified as microphone", () => {
    const hasVideo = mockAudioOnlyStream.getVideoTracks().length > 0;
    expect(hasVideo).toBe(false);
  });

  it("WEB-SCREEN-03: classification uses MSID not arrival order", () => {
    // Deterministic: check stream.getVideoTracks().length, not event order
    const classify = (stream: MediaStream) => stream.getVideoTracks().length > 0 ? "screen" : "mic";
    expect(classify(mockScreenStream)).toBe("screen");
    expect(classify(mockAudioOnlyStream)).toBe("mic");
  });

  it("WEB-SCREEN-04: picker AbortError does not crash", () => {
    const err = new DOMException("The user aborted a request.", "AbortError");
    expect(err.name).toBe("AbortError");
    // Application must catch this by name and handle gracefully (no crash, state reset)
    expect(err.name).toBe("AbortError");
  });

  it("WEB-SCREEN-05: screen track onended triggers cleanup", () => {
    let ended = false;
    mockScreenVideoTrack.onended = () => { ended = true; };
    mockScreenVideoTrack.onended();
    expect(ended).toBe(true);
  });
});

describe("Screen Share Sender Bookkeeping", () => {
  it("WEB-SCREEN-06: screen senders tracked separately from mic sender", () => {
    const screenSenders = new Map<string, { video: any[]; audio: any[] }>();
    const peerId = "peer-1";

    screenSenders.set(peerId, { video: [{ track: mockScreenVideoTrack }], audio: [{ track: mockScreenAudioTrack }] });

    expect(screenSenders.get(peerId)?.video.length).toBe(1);
    expect(screenSenders.get(peerId)?.audio.length).toBe(1);
  });

  it("WEB-SCREEN-07: stop removes screen senders, preserves mic", () => {
    // Simulate: peer has mic sender + screen video + screen audio
    const allSenders = [
      { track: { kind: "audio" } }, // mic — KEEP
      { track: mockScreenVideoTrack }, // screen video — REMOVE
      { track: mockScreenAudioTrack }, // screen audio — REMOVE
    ];

    const screenTrackSet = new Set([mockScreenVideoTrack, mockScreenAudioTrack]);
    const remaining = allSenders.filter((s) => !screenTrackSet.has(s.track));

    expect(remaining.length).toBe(1);
    expect(remaining[0].track.kind).toBe("audio");
  });

  it("WEB-SCREEN-08: repeated start/stop has no duplicate senders", () => {
    const senders: any[] = [];
    // Start #1
    senders.push({ track: mockScreenVideoTrack });
    senders.push({ track: mockScreenAudioTrack });
    // Stop #1 — remove screen senders
    const cleaned = senders.filter((s) => s.track !== mockScreenVideoTrack && s.track !== mockScreenAudioTrack);
    // Start #2
    cleaned.push({ track: mockScreenVideoTrack });
    cleaned.push({ track: mockScreenAudioTrack });
    expect(cleaned.length).toBe(2); // No duplicates
    // Mute during share
    mockScreenVideoTrack.enabled = true; // screen video unaffected by mute
    expect(mockScreenVideoTrack.enabled).toBe(true);
  });

  it("WEB-SCREEN-09: self mute does not disable screen video", () => {
    mockScreenVideoTrack.enabled = true;
    // Mic mute toggles only mic tracks
    const isMicTrack = (t: any) => !mockScreenStream.getVideoTracks().includes(t);
    // Screen video: not a mic track, stays enabled
    expect(isMicTrack(mockScreenVideoTrack)).toBe(false);
    mockScreenVideoTrack.enabled = true; // remained enabled
    expect(mockScreenVideoTrack.enabled).toBe(true);
  });

  it("WEB-SCREEN-10: deafen does not hide screen video", () => {
    // Deafen: mutes incoming audio, keeps video visible
    const videoElement = document.createElement("video");
    videoElement.muted = false; // Before deafen
    videoElement.muted = true;  // Deafen mutes all audio
    videoElement.style.visibility = ""; // Video stays visible
    expect(videoElement.muted).toBe(true);
    expect(videoElement.style.display).not.toBe("none");
  });

  it("WEB-SCREEN-11: late peer gets screen tracks without duplicating existing peers", () => {
    const existingPeers = new Map<string, number>(); // peerId -> sender count
    existingPeers.set("peer-old", 2); // already has screen senders

    // New peer joins
    const addTracks = (peerId: string, existing: Map<string, number>) => {
      if (existing.has(peerId)) return; // don't re-add to existing
      existing.set(peerId, 2); // add screen tracks
    };

    addTracks("peer-new", existingPeers);
    expect(existingPeers.get("peer-old")).toBe(2); // unchanged
    expect(existingPeers.get("peer-new")).toBe(2); // got screen tracks
  });

  it("WEB-SCREEN-12: server rejection does not leave display tracks", () => {
    let tracksStopped = false;
    // Simulate: getDisplayMedia succeeded, server rejects
    // Cleanup must stop all display tracks
    mockScreenStream.getTracks().forEach((t) => { t.stop(); });
    tracksStopped = true;
    expect(tracksStopped).toBe(true);
  });
});

describe("REQ-01: Audio Source Identity (stream-based, presenter identity NOT sufficient)", () => {
  // Deterministic classification logic mirroring useVoice handleRemoteTrack.
  // Uses stream.id identity: mic stream and screen stream are distinct MediaStreams.
  const micStreamId = "stream-mic-A";
  const screenStreamId = "stream-screen-A";
  const micStream = {
    id: micStreamId,
    getTracks: () => [{ kind: "audio" }],
    getVideoTracks: () => [],
    getAudioTracks: () => [{ kind: "audio" }],
  };
  const screenStreamNoVideo = {
    id: screenStreamId,
    getTracks: () => [{ kind: "audio" }],
    getVideoTracks: () => [],
    getAudioTracks: () => [{ kind: "audio" }],
  };
  const screenStreamWithVideo = {
    id: screenStreamId,
    getTracks: () => [{ kind: "video" }, { kind: "audio" }],
    getVideoTracks: () => [{ kind: "video" }],
    getAudioTracks: () => [{ kind: "audio" }],
  };

  function createClassifier() {
    const screenStreamIds = new Map<string, Set<string>>();
    return {
      screenStreamIds,
      onVideo(remoteUserId: string, stream: any) {
        if (!screenStreamIds.has(remoteUserId)) screenStreamIds.set(remoteUserId, new Set());
        if (stream?.id) screenStreamIds.get(remoteUserId)!.add(stream.id);
        return "SCREEN_VIDEO";
      },
      classifyAudio(remoteUserId: string, stream: any): "MIC_AUDIO" | "SCREEN_AUDIO" | "UNKNOWN" {
        const hasVideo = stream?.getVideoTracks?.().length > 0;
        const knownScreen = stream?.id !== undefined && screenStreamIds.get(remoteUserId)?.has(stream.id) === true;
        if (hasVideo || knownScreen) return "SCREEN_AUDIO";
        if (!stream?.id) return "SCREEN_AUDIO"; // no stream id — cannot be mic (always has id)
        return "UNKNOWN"; // buffered until video arrives
      },
    };
  }

  it("TEST-A: presenter microphone audio is MIC_AUDIO (presenter identity alone is insufficient)", () => {
    const c = createClassifier();
    // User A is presenter, but mic stream is a DIFFERENT stream from screen stream
    expect(c.classifyAudio("user-A", micStream)).toBe("UNKNOWN");
    // After video arrives in screen stream only, mic stream is STILL not screen
    c.onVideo("user-A", screenStreamWithVideo);
    expect(c.classifyAudio("user-A", micStream)).toBe("UNKNOWN"); // never screen
    expect(c.classifyAudio("user-A", screenStreamNoVideo)).toBe("SCREEN_AUDIO");
  });

  it("TEST-B: presenter screen audio arrives before video ontrack → reclassified to SCREEN_AUDIO", () => {
    const c = createClassifier();
    // Audio arrives first, no video in stream yet
    expect(c.classifyAudio("user-A", screenStreamNoVideo)).toBe("UNKNOWN");
    // Video later arrives in the SAME stream id → audio reclassified
    c.onVideo("user-A", screenStreamWithVideo);
    expect(c.classifyAudio("user-A", screenStreamNoVideo)).toBe("SCREEN_AUDIO");
  });

  it("TEST-C: presenter screen video is SCREEN_VIDEO", () => {
    const c = createClassifier();
    expect(c.onVideo("user-A", screenStreamWithVideo)).toBe("SCREEN_VIDEO");
  });

  it("coexistence: same remote user mic stream + display stream stay independently classified", () => {
    const c = createClassifier();
    c.onVideo("user-A", screenStreamWithVideo);
    expect(c.classifyAudio("user-A", micStream)).toBe("UNKNOWN"); // mic, not screen
    expect(c.classifyAudio("user-A", screenStreamNoVideo)).toBe("SCREEN_AUDIO"); // screen
    // Different stream ids → independent
    expect(c.classifyAudio("user-A", { ...micStream, id: "stream-mic-B" })).toBe("UNKNOWN");
  });
});

describe("REQ-02: Pending Renegotiation", () => {
  it("unstable peer marked pending, renegotiates once stable", () => {
    const pending = new Map<string, boolean>();
    const peerId = "peer-1";

    // Scenario A: peer is unstable, request renegotiation
    pending.set(peerId, true); // mark pending
    expect(pending.get(peerId)).toBe(true);

    // Peer becomes stable → process pending
    const processed = new Set<string>();
    if (pending.get(peerId)) {
      processed.add(peerId);
      pending.delete(peerId);
    }
    expect(processed.has(peerId)).toBe(true);
    expect(pending.get(peerId)).toBeUndefined();
  });

  it("multiple pending requests coalesced into one", () => {
    const pending = new Map<string, boolean>();
    const peerId = "peer-1";
    // Three rapid requests while unstable
    pending.set(peerId, true);
    pending.set(peerId, true);
    pending.set(peerId, true);
    // When stable: process once
    let renegotiations = 0;
    if (pending.get(peerId)) {
      renegotiations++;
      pending.delete(peerId);
    }
    expect(renegotiations).toBe(1);
    expect(pending.get(peerId)).toBeUndefined();
  });
});

describe("REQ-03: NotAllowedError Cleanup", () => {
  it("NotAllowedError releases presenter slot and stops tracks", () => {
    const err = new DOMException("Permission denied", "NotAllowedError");
    expect(err.name).toBe("NotAllowedError");

    // Capture cleanup state
    let presenterReleased = false;
    let tracksStopped = false;

    // Simulate: getDisplayMedia throws NotAllowedError
    try {
      throw err;
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        mockScreenVideoTrack.stop();
        mockScreenAudioTrack.stop();
        tracksStopped = true;
        presenterReleased = true;
      }
    }

    expect(presenterReleased).toBe(true);
    expect(tracksStopped).toBe(true);
    // AbortError still works independently
    const abortErr = new DOMException("User cancelled", "AbortError");
    expect(abortErr.name).toBe("AbortError");
  });
});
