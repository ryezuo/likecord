import { DEFAULT_CAPTURE_PREFERENCES as defaults } from "@likecord/shared/capture-preferences";
import { VoiceCaptureOwner, MIC_TEST_TIMEOUT_MS, CAPTURE_WORKLET_URL } from "../lib/voiceCapture";
import { CaptureTestStream, deferred, installCaptureGraph, settle } from "../../test-support/captureGraph";

describe("production capture generation owner", () => {
  let graph: ReturnType<typeof installCaptureGraph>; let owner: VoiceCaptureOwner; let account = true; let call = true;
  beforeEach(() => { localStorage.clear(); account = true; call = true; graph = installCaptureGraph(); owner = new VoiceCaptureOwner("account-a", () => account); owner.configure(true, defaults); });
  afterEach(() => { owner.dispose(); jest.useRealTimers(); });
  const start = async () => { const stream = await owner.startCall(() => call, () => undefined); owner.setTransmission(true); await settle(); return stream; };

  it("observation/configuration acquire no media and explicit test owns no peers/playback", async () => {
    owner.snapshot(); owner.configure(true, { ...defaults, inputGainPercent: 50 }); expect(graph.getUserMedia).not.toHaveBeenCalled();
    await owner.startTest(); expect(graph.getUserMedia).toHaveBeenCalledTimes(1); expect(owner.snapshot().mode).toBe("test");
    expect(graph.contexts[0].source.connect).toHaveBeenCalledWith(graph.worklets[0]);
    expect(graph.worklets[0].connect).toHaveBeenCalledWith(graph.contexts[0].output);
    expect(graph.contexts[0].audioWorklet.addModule).toHaveBeenCalledWith(CAPTURE_WORKLET_URL);
    expect(graph.contexts[0].output.stream.getAudioTracks()[0].enabled).toBe(false);
    owner.stopTest(); expect(graph.raw[0].tracks[0].stop).toHaveBeenCalled(); expect(graph.contexts[0].close).toHaveBeenCalled();
  });
  it("timeout stops a test, starting real Voice retires test, Settings exit leaves call intact", async () => {
    jest.useFakeTimers(); await owner.startTest(); jest.advanceTimersByTime(MIC_TEST_TIMEOUT_MS);
    expect(owner.snapshot().mode).toBe("idle"); expect(graph.raw[0].tracks[0].readyState).toBe("ended");
    await owner.startTest(); const stream = await start(); expect(graph.raw[1].tracks[0].readyState).toBe("ended");
    owner.stopTest(); await owner.startTest(); expect(graph.getUserMedia).toHaveBeenCalledTimes(3);
    expect(stream.getAudioTracks()[0].enabled).toBe(true); expect(graph.raw[2].tracks[0].readyState).toBe("live");
  });
  it.each(["self mute", "server mute", "SPEAK revoked", "deafen", "disconnect"])("%s closes before flush and late reset ACK cannot reopen", async () => {
    const stream = await start(); const track = stream.getAudioTracks()[0]; const worklet = graph.worklets[0];
    expect(track.enabled).toBe(true); worklet.autoAck = false;
    owner.setTransmission(false); expect(track.enabled).toBe(false);
    owner.setTransmission(true); const reset = worklet.port.postMessage.mock.calls.map(([m]: any[]) => m).filter((m: any) => m.type === "reset").at(-1);
    owner.setTransmission(false); worklet.port.onmessage({ data: { type: "reset", revision: reset.revision } }); await settle();
    expect(track.enabled).toBe(false);
    worklet.autoAck = true; owner.setTransmission(true); await settle(); expect(track.enabled).toBe(true);
  });
  it.each(["source", "context", "processor"])("%s failure clears readiness and disables sender; no resume callback reopens", async (kind) => {
    const stream = await start();
    if (kind === "source") graph.raw[0].tracks[0].dispatchEvent(new Event("ended"));
    if (kind === "context") { graph.contexts[0].state = "suspended"; graph.contexts[0].dispatchEvent(new Event("statechange")); }
    if (kind === "processor") graph.worklets[0].onprocessorerror();
    expect(stream.getAudioTracks()[0].enabled).toBe(false); expect(owner.snapshot().status).toBe("failed");
    graph.contexts[0].state = "running"; graph.contexts[0].dispatchEvent(new Event("statechange")); owner.setTransmission(true); await settle();
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
  });
  it("account change and obsolete acquisition cannot publish or reopen", async () => {
    const pending = deferred<CaptureTestStream>(); graph.getUserMedia.mockReturnValueOnce(pending.promise);
    const startPending = owner.startCall(() => call, () => undefined).catch(() => null);
    account = false; owner.stop(); const raw = new CaptureTestStream(); pending.resolve(raw); await startPending;
    expect(raw.tracks[0].readyState).toBe("ended"); expect(owner.snapshot().mode).toBe("idle"); expect(graph.contexts).toHaveLength(0);
  });
  it("commits replacement only after all CALL senders converge and retires previous source", async () => {
    const old = await start(); const sender = { replaceTrack: jest.fn(async () => { expect(old.getAudioTracks()[0].enabled).toBe(false); }) };
    const pc = { addTrack: jest.fn(() => sender), connectionState: "connected" } as unknown as RTCPeerConnection;
    await owner.senders.register("peer", pc); await owner.chooseDevice("input-alias"); await settle();
    expect(sender.replaceTrack).toHaveBeenCalledWith(graph.contexts[1].output.stream.tracks[0]);
    expect(graph.raw[0].tracks[0].readyState).toBe("ended"); expect(graph.contexts[1].output.stream.tracks[0].enabled).toBe(true);
  });
  it("retains old valid media after acquisition rejection and supersedes late device result", async () => {
    const old = await start(); graph.getUserMedia.mockRejectedValueOnce(new Error("Device unavailable"));
    await owner.chooseDevice("missing-alias"); expect(old.getAudioTracks()[0].enabled).toBe(true);
    const pending = deferred<CaptureTestStream>(); graph.getUserMedia.mockReturnValueOnce(pending.promise);
    const obsolete = owner.chooseDevice("late-alias"); await owner.chooseDevice("new-alias"); const late = new CaptureTestStream(); pending.resolve(late); await obsolete;
    expect(late.tracks[0].readyState).toBe("ended"); expect(owner.snapshot().deviceId).toBe("new-alias");
  });
  it.each([false, true])("partial replace compensates fail closed (compensation fails=%s)", async (fails) => {
    const old = await start();
    const a = { replaceTrack: jest.fn(async () => undefined) }; const b = { replaceTrack: jest.fn(async () => undefined) };
    await owner.senders.register("a", { addTrack: () => a } as unknown as RTCPeerConnection);
    await owner.senders.register("b", { addTrack: () => b } as unknown as RTCPeerConnection);
    b.replaceTrack.mockRejectedValueOnce(new Error("No replacement"));
    if (fails) a.replaceTrack.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("No compensation"));
    await owner.chooseDevice("input-alias"); await settle();
    expect(old.getAudioTracks()[0].enabled).toBe(!fails); expect(owner.snapshot().status).toBe("failed");
    expect(graph.contexts[1].output.stream.tracks[0].enabled).toBe(false); expect(graph.raw[1].tracks[0].readyState).toBe("ended");
  });
  it("applies complete native intent, reports mismatch, and recovers configuration failure", async () => {
    const stream = await start(); const track = graph.raw[0].tracks[0];
    owner.configure(true, { ...defaults, echoCancellationIntent: "OFF", autoGainControlIntent: "ON" }); await settle();
    owner.configure(true, { ...defaults, echoCancellationIntent: "OFF", autoGainControlIntent: "OFF", noiseSuppressionIntent: "ON" }); await settle();
    expect(track.applyConstraints).toHaveBeenLastCalledWith({ echoCancellation: { exact: false }, autoGainControl: { exact: false }, noiseSuppression: { exact: true } });
    expect(owner.snapshot().evidence?.autoGainControl).toMatchObject({ requested: false, reported: true });
    track.applyConstraints.mockRejectedValueOnce(new Error("Apply failed"));
    owner.configure(true, { ...defaults, autoGainControlIntent: "ON" }); await settle();
    expect(owner.snapshot().status).toBe("failed"); expect(stream.getAudioTracks()[0].enabled).toBe(true);
    track.applyConstraints.mockRejectedValue(new Error("Recovery fails")); owner.configure(true, defaults); await settle();
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
  });
});
