import {
  VoiceSpeakingAnalysis,
  VOICE_SPEAKING_RELEASE_MS,
  VOICE_SPEAKING_THRESHOLD,
} from "../lib/voiceSpeaking";

interface LevelStream extends MediaStream {
  level: number;
}

function makeTrack() {
  const endedListeners = new Set<EventListenerOrEventListenerObject>();
  const value = {
    kind: "audio",
    enabled: true,
    readyState: "live",
    addEventListener: jest.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (event === "ended") endedListeners.add(listener);
    }),
    removeEventListener: jest.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (event === "ended") endedListeners.delete(listener);
    }),
  };
  return {
    track: value as unknown as MediaStreamTrack,
    end: () => {
      value.readyState = "ended";
      for (const listener of endedListeners) {
        if (typeof listener === "function") listener(new Event("ended"));
        else listener.handleEvent(new Event("ended"));
      }
    },
  };
}

function makeStream(level = 0) {
  return { level } as LevelStream;
}

function makeHarness() {
  let nextFrameId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const sources: Array<{
    stream: LevelStream;
    connect: jest.Mock;
    disconnect: jest.Mock;
  }> = [];
  const analysers: Array<AnalyserNode & { sourceStream?: LevelStream; connect: jest.Mock; disconnect: jest.Mock }> = [];
  const requestFrame = jest.fn((callback: FrameRequestCallback) => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  });
  const cancelFrame = jest.fn((id: number) => { frames.delete(id); });
  const context = {
    state: "running",
    destination: { kind: "destination" },
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    createMediaStreamSource: jest.fn((stream: MediaStream) => {
      const source = {
        stream: stream as LevelStream,
        connect: jest.fn((analyser: AnalyserNode & { sourceStream?: LevelStream }) => {
          analyser.sourceStream = stream as LevelStream;
          return analyser;
        }),
        disconnect: jest.fn(),
      };
      sources.push(source);
      return source;
    }),
    createAnalyser: jest.fn(() => {
      const analyser = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        connect: jest.fn(),
        disconnect: jest.fn(),
        getFloatTimeDomainData: jest.fn((samples: Float32Array) => {
          samples.fill(analyser.sourceStream?.level ?? 0);
        }),
      } as unknown as AnalyserNode & { sourceStream?: LevelStream; connect: jest.Mock; disconnect: jest.Mock };
      analysers.push(analyser);
      return analyser;
    }),
  };
  const createAudioContext = jest.fn(() => context as unknown as AudioContext);
  let currentSpeaking: string[] = [];
  const changes: string[][] = [];
  const analysis = new VoiceSpeakingAnalysis((userIds) => {
    currentSpeaking = userIds;
    changes.push(userIds);
  }, { createAudioContext, requestFrame, cancelFrame });
  const frame = (timestamp: number) => {
    const scheduled = [...frames.entries()];
    frames.clear();
    for (const [, callback] of scheduled) callback(timestamp);
  };
  return {
    analysis,
    context,
    createAudioContext,
    requestFrame,
    cancelFrame,
    sources,
    analysers,
    changes,
    frame,
    speaking: () => currentSpeaking,
  };
}

describe("F6.C2A VoiceSpeakingAnalysis", () => {
  it("uses the documented threshold, fast attack, and exact 300 ms release hold without flicker", () => {
    expect(VOICE_SPEAKING_THRESHOLD).toBe(0.035);
    expect(VOICE_SPEAKING_RELEASE_MS).toBe(300);
    const harness = makeHarness();
    const stream = makeStream(VOICE_SPEAKING_THRESHOLD - 0.001);
    const { track } = makeTrack();
    harness.analysis.attach("local", stream, track, false);

    harness.frame(0);
    expect(harness.speaking()).toEqual([]);

    stream.level = VOICE_SPEAKING_THRESHOLD + 0.001;
    harness.frame(16);
    expect(harness.speaking()).toEqual(["local"]);

    stream.level = 0;
    harness.frame(315);
    expect(harness.speaking()).toEqual(["local"]);

    stream.level = VOICE_SPEAKING_THRESHOLD + 0.001;
    harness.frame(316);
    stream.level = 0;
    harness.frame(615);
    expect(harness.speaking()).toEqual(["local"]);
    harness.frame(616);
    expect(harness.speaking()).toEqual([]);
  });

  it("clears and prevents speaking immediately while a microphone is effectively muted", () => {
    const harness = makeHarness();
    const stream = makeStream(0.2);
    const { track } = makeTrack();
    harness.analysis.attach("local", stream, track, false);
    harness.frame(0);
    expect(harness.speaking()).toEqual(["local"]);

    harness.analysis.setEffectiveMuted("local", true);
    expect(harness.speaking()).toEqual([]);
    harness.frame(16);
    expect(harness.speaking()).toEqual([]);
  });

  it("attributes remote activity by stable userId without marking another participant", () => {
    const harness = makeHarness();
    const aliceStream = makeStream(0.2);
    const bobStream = makeStream(0);
    harness.analysis.attach("alice-id", aliceStream, makeTrack().track, false);
    harness.analysis.attach("bob-id", bobStream, makeTrack().track, false);

    harness.frame(0);
    expect(harness.speaking()).toEqual(["alice-id"]);
    aliceStream.level = 0;
    bobStream.level = 0.2;
    harness.frame(300);
    expect(harness.speaking()).toEqual(["bob-id"]);
  });

  it("replaces obsolete analysis and ignores an old track ending after replacement", () => {
    const harness = makeHarness();
    const first = makeTrack();
    const replacement = makeTrack();
    const firstStream = makeStream(0.2);
    const replacementStream = makeStream(0.2);
    harness.analysis.attach("remote-id", firstStream, first.track, false);
    harness.frame(0);
    expect(harness.speaking()).toEqual(["remote-id"]);

    harness.analysis.attach("remote-id", replacementStream, replacement.track, false);
    expect(harness.sources[0].disconnect).toHaveBeenCalledTimes(1);
    expect(harness.speaking()).toEqual([]);
    first.end();
    harness.frame(16);
    expect(harness.speaking()).toEqual(["remote-id"]);

    replacement.end();
    expect(harness.speaking()).toEqual([]);
    expect(harness.sources[1].disconnect).toHaveBeenCalledTimes(1);
  });

  it("uses one AudioContext and one scheduling loop for all call participants with no destination connection", () => {
    const harness = makeHarness();
    harness.analysis.attach("local", makeStream(0.2), makeTrack().track, false);
    harness.analysis.attach("remote", makeStream(0.2), makeTrack().track, false);

    expect(harness.createAudioContext).toHaveBeenCalledTimes(1);
    expect(harness.requestFrame).toHaveBeenCalledTimes(1);
    expect(harness.sources).toHaveLength(2);
    expect(harness.sources.every((source) => source.connect.mock.calls[0][0] !== harness.context.destination)).toBe(true);
    expect(harness.analysers.every((analyser) => analyser.connect.mock.calls.length === 0)).toBe(true);

    harness.frame(0);
    expect(harness.requestFrame).toHaveBeenCalledTimes(2);
  });

  it("detaches participants and disposes the loop, graph, context, and speaking state", () => {
    const harness = makeHarness();
    harness.analysis.attach("local", makeStream(0.2), makeTrack().track, false);
    harness.analysis.attach("remote", makeStream(0.2), makeTrack().track, false);
    harness.frame(0);
    expect(harness.speaking()).toEqual(["local", "remote"]);

    harness.analysis.detach("remote");
    expect(harness.speaking()).toEqual(["local"]);
    harness.analysis.dispose();
    expect(harness.speaking()).toEqual([]);
    expect(harness.context.close).toHaveBeenCalledTimes(1);
    expect(harness.sources.every((source) => source.disconnect.mock.calls.length === 1)).toBe(true);
    expect(harness.cancelFrame).toHaveBeenCalledTimes(1);
  });
});
