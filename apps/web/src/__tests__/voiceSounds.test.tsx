import "@testing-library/jest-dom";
import {
  VoiceSoundsOwner, SOUND_CUES, SOUND_ATTACK_SECONDS, SOUND_VOLUME_RAMP_SECONDS,
  attachVoiceSoundsOwner, testVoiceSound, playJoinSound, cancelVoiceSoundSession, playLeaveSound,
} from "../lib/voiceSounds";
import { AudioOutputCoordinator } from "../lib/audioOutput";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function param() {
  return { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), cancelScheduledValues: jest.fn() };
}
function contextMock(state = "running") {
  const tones: any[] = [];
  const gains: any[] = [];
  const listeners = new Map<string, () => void>();
  const ctx = {
    currentTime: 0, state, destination: {},
    createOscillator: jest.fn(() => {
      const oscillator = { type: "", frequency: param(), connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), stop: jest.fn(), onended: null };
      tones.push(oscillator); return oscillator;
    }),
    createGain: jest.fn(() => { const gain = { gain: param(), connect: jest.fn(), disconnect: jest.fn() }; gains.push(gain); return gain; }),
    addEventListener: jest.fn((event, listener) => listeners.set(event, listener)),
    removeEventListener: jest.fn((event) => listeners.delete(event)),
    setSinkId: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined),
  };
  return { ctx, tones, gains, listeners };
}
let mock: ReturnType<typeof contextMock>;
let owner: VoiceSoundsOwner;
let current = true;
let detach: (() => void) | undefined;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(0);
  current = true;
  mock = contextMock();
  window.AudioContext = jest.fn(() => mock.ctx) as any;
  owner = new VoiceSoundsOwner(() => current, jest.fn(), "test-account");
});
afterEach(() => { detach?.(); detach = undefined; owner.dispose(); jest.useRealTimers(); });
function ready(enabled = true, volume = 70) {
  owner.configure({ ready: true, enabled, volume }); owner.markInteracted();
}
async function settleOutput() {
  for (let index = 0; index < 16; index += 1) await Promise.resolve();
}

it("does not create output before account hydration or interaction", () => {
  owner.play("join"); owner.markInteracted(); owner.play("join");
  expect(window.AudioContext).not.toHaveBeenCalled();
  owner.configure({ ready: true, enabled: true, volume: 70 });
  expect(mock.tones).toHaveLength(0);
  owner.play("join"); expect(mock.tones).toHaveLength(2);
});
it("keeps an explicitly selected SFX context lazy and applies the common sink before a later cue", async () => {
  owner.dispose();
  localStorage.setItem("likecord.audio-output.v1:test-account", JSON.stringify({
    version: 1,
    deviceId: "headphones",
    roles: {
      receive: { latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto" },
      sfx: { latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto" },
    },
  }));
  const output = new AudioOutputCoordinator("test-account", () => true);
  owner = new VoiceSoundsOwner(() => true, jest.fn(), "test-account", output);
  await settleOutput();
  expect(window.AudioContext).not.toHaveBeenCalled();

  ready();
  expect(owner.play("join")).toBe(false);
  await settleOutput();
  expect(window.AudioContext).toHaveBeenCalledTimes(1);
  expect(mock.ctx.setSinkId).toHaveBeenCalledWith("headphones");
  expect(mock.tones).toHaveLength(0);
  expect(owner.play("join")).toBe(true);
  expect(mock.tones).toHaveLength(2);
  output.dispose();
});
it.each([[false, 70], [true, 0]])("disabled/zero never create audio or backlog (%s/%s)", (enabled, volume) => {
  ready(enabled as boolean, volume as number);
  for (let i = 0; i < 20; i++) owner.play("join");
  expect(window.AudioContext).not.toHaveBeenCalled();
  ready(); jest.runAllTimers(); expect(mock.tones).toHaveLength(0);
});
it("keeps the eleven pitches, durations, waves and note offsets", () => {
  const inventory = [
    ["join", "sine", [[523, .15, 0], [659, .2, .08]]],
    ["leave", "sine", [[440, .15, 0], [349, .2, .08]]],
    ["mute", "square", [[330, .1, 0]]], ["unmute", "square", [[523, .1, 0]]],
    ["deafen", "sawtooth", [[262, .15, 0], [262, .1, .1]]],
    ["undeafen", "sawtooth", [[392, .15, 0], [523, .1, .1]]],
    ["userJoined", "sine", [[784, .1, 0]]], ["userLeft", "sine", [[330, .12, 0]]],
    ["screenShareStarted", "sine", [[587, .1, 0], [784, .14, .065]]],
    ["screenViewerJoined", "sine", [[698, .11, 0]]], ["screenViewerLeft", "sine", [[392, .12, 0]]],
  ];
  expect(Object.keys(SOUND_CUES)).toHaveLength(11);
  for (const [key, wave, notes] of inventory) {
    const cue = SOUND_CUES[key as keyof typeof SOUND_CUES];
    expect(cue.wave).toBe(wave);
    expect(cue.notes.map(n => [n.hz, n.duration, n.offset])).toEqual(notes);
    expect(cue.peak * cue.notes.length).toBeLessThanOrEqual(.8);
  }
});
it("applies category gain exactly once and ramps continuous slider edits from held gain", () => {
  ready(); owner.play("join");
  const category = mock.gains[0];
  const outputGate = mock.gains[1];
  expect(category.connect).toHaveBeenCalledTimes(1);
  expect(category.connect).toHaveBeenCalledWith(outputGate);
  expect(outputGate.connect).toHaveBeenCalledWith(mock.ctx.destination);
  expect(category.gain.setValueAtTime).toHaveBeenCalledWith(.7, 0);
  for (const envelope of mock.gains.slice(2)) {
    expect(envelope.connect).toHaveBeenCalledWith(category);
    expect(envelope.gain.linearRampToValueAtTime).toHaveBeenCalledWith(.17, expect.any(Number));
  }
  owner.configure({ ready: true, enabled: true, volume: 20 });
  mock.ctx.currentTime = .005;
  owner.configure({ ready: true, enabled: true, volume: 0 });
  expect(category.gain.setValueAtTime).toHaveBeenLastCalledWith(expect.closeTo(.45), .005);
  expect(category.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, .015);
});
it("has smooth zero endpoints, 4ms attack and an audible body for all cues", () => {
  ready();
  for (const key of Object.keys(SOUND_CUES) as Array<keyof typeof SOUND_CUES>) {
    owner.cancelSession();
    const before = mock.gains.length;
    owner.play(key); jest.advanceTimersByTime(251);
    const cue = SOUND_CUES[key];
    const envelopes = mock.gains.slice(before === 0 ? 2 : before);
    cue.notes.forEach((note, i) => {
      expect(envelopes[i].gain.setValueAtTime).toHaveBeenCalledWith(0, note.offset);
      expect(envelopes[i].gain.linearRampToValueAtTime).toHaveBeenCalledWith(cue.peak, note.offset + SOUND_ATTACK_SECONDS);
      expect(envelopes[i].gain.setValueAtTime).toHaveBeenCalledWith(cue.peak, note.offset + note.duration * .4);
      expect(envelopes[i].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, note.offset + note.duration);
    });
  }
});
it("Test sound shares the mounted owner and respects disabled/zero", () => {
  detach = attachVoiceSoundsOwner(owner);
  ready(false); expect(testVoiceSound()).toBe(false);
  ready(true, 0); expect(testVoiceSound()).toBe(false);
  ready(); expect(testVoiceSound()).toBe(true);
  expect(mock.tones.map(t => t.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523, 659]);
  expect(window.AudioContext).toHaveBeenCalledTimes(1);
});
it("retains one complete cue plus only the latest pending event, prioritizing local actions", () => {
  ready(); owner.play("join");
  for (let i = 0; i < 30; i++) owner.play("userJoined");
  owner.play("mute"); owner.play("userLeft");
  expect(mock.tones).toHaveLength(2);
  jest.advanceTimersByTime(282);
  expect(mock.tones).toHaveLength(3);
  expect(mock.tones[2].frequency.setValueAtTime).toHaveBeenCalledWith(330, 0);
  expect(mock.tones[2].type).toBe("square");
  jest.runAllTimers(); expect(mock.tones).toHaveLength(3);
});
it("coalesces remote events within 250ms and discards expired delayed events", () => {
  ready(); owner.play("userJoined"); jest.advanceTimersByTime(110);
  owner.play("userLeft"); owner.play("screenViewerLeft");
  jest.advanceTimersByTime(139); expect(mock.tones).toHaveLength(1);
  jest.advanceTimersByTime(1); expect(mock.tones).toHaveLength(2);
  owner.play("mute"); jest.setSystemTime(1000); jest.runAllTimers();
  expect(mock.tones).toHaveLength(2);
});
it("disable cancels pending notes immediately, retires active audio in 10ms and never replays", () => {
  ready(); owner.play("join"); owner.play("mute");
  mock.ctx.currentTime = .075;
  owner.configure({ ready: true, enabled: false, volume: 70 });
  expect(mock.tones[1].stop).toHaveBeenLastCalledWith(.075);
  expect(mock.tones[0].stop).toHaveBeenLastCalledWith(.075 + SOUND_VOLUME_RAMP_SECONDS);
  jest.runAllTimers();
  mock.tones.forEach(t => expect(t.disconnect).toHaveBeenCalled());
  ready(); jest.runAllTimers(); expect(mock.tones).toHaveLength(2);
});
it.each(["resolve", "reject"])("resume %s never replays stale or queued sounds", async outcome => {
  const resume = deferred(); mock.ctx.state = "suspended"; mock.ctx.resume.mockReturnValue(resume.promise);
  ready(); owner.play("join"); owner.play("mute");
  expect(mock.ctx.resume).toHaveBeenCalledTimes(1);
  owner.cancelSession(); current = false;
  if (outcome === "resolve") resume.resolve(); else resume.reject(new Error("blocked"));
  await Promise.resolve(); await Promise.resolve();
  mock.ctx.state = "running"; jest.runAllTimers(); expect(mock.tones).toHaveLength(0);
});
it("suspension cancels active nodes and drops backlog, fresh action can recover", () => {
  ready(); owner.play("join"); owner.play("mute");
  mock.ctx.state = "suspended"; mock.listeners.get("statechange")!();
  mock.ctx.state = "running"; jest.runAllTimers(); expect(mock.tones).toHaveLength(2);
  owner.play("mute"); expect(mock.tones).toHaveLength(3);
});
it("account identity blocks callbacks immediately; dispose cleans nodes, timers, listener and context", () => {
  ready(); owner.play("join"); owner.play("mute"); current = false;
  expect(owner.play("leave")).toBe(false);
  owner.dispose(); jest.runAllTimers();
  expect(mock.tones).toHaveLength(2);
  expect(mock.ctx.close).toHaveBeenCalledTimes(1);
  expect(mock.listeners.size).toBe(0); expect(jest.getTimerCount()).toBe(0);
  mock.gains.forEach(g => expect(g.disconnect).toHaveBeenCalled());
});
it("session cancellation discards old events but preserves a new same-account local leave", () => {
  detach = attachVoiceSoundsOwner(owner); ready(); playJoinSound("test-account");
  cancelVoiceSoundSession("test-account"); playLeaveSound("test-account"); jest.runAllTimers();
  expect(mock.tones.map(t => t.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523, 659, 440, 349]);
});
it("handles unavailable output and node construction failures without unhandled rejection", () => {
  ready(); mock.ctx.createOscillator.mockImplementationOnce(() => { throw new Error("no output"); });
  expect(owner.play("join")).toBe(false); owner.dispose();
  window.AudioContext = undefined as any;
  owner = new VoiceSoundsOwner(() => true, jest.fn(), "test-account"); ready();
  expect(owner.play("join")).toBe(false);
});

it("late callbacks from another account cannot use or cancel the newly installed owner", () => {
  detach = attachVoiceSoundsOwner(owner); ready();
  playJoinSound("old-account");
  expect(mock.tones).toHaveLength(0);
  playJoinSound("test-account");
  cancelVoiceSoundSession("old-account");
  expect(mock.tones[0].disconnect).not.toHaveBeenCalled();
  expect(mock.tones).toHaveLength(2);
});
