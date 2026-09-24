import { DEFAULT_CAPTURE_PREFERENCES as defaults } from "@likecord/shared/capture-preferences";
import { AUTO_CAPTURE_FORMAT, LocalInputProfile, SYSTEM_DEFAULT_INPUT, acquisitionConstraints, desiredConstraints, observeNativeCapture, validateNativeIntent, verifyRnnoiseNativeIsolation } from "../lib/nativeCapture";

function track(capabilities: object, settings: object = {}, constraints: object = {}) {
  return { getCapabilities: () => capabilities, getSettings: () => settings, getConstraints: () => constraints } as MediaStreamTrack;
}
const media = { getSupportedConstraints: () => ({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }) } as MediaDevices;

describe("native capture evidence and local intent", () => {
  beforeEach(() => localStorage.clear());
  it.each(["OFF", "RNNOISE"] as const)("%s requests native suppression-off only for a mutable domain", (mode) => {
    const preferences = { ...defaults, noiseSuppressionMode: mode, noiseSuppressionIntent: "ON" as const };
    for (const domain of [[false], [true], []]) {
      const evidence = observeNativeCapture(track({ noiseSuppression: domain }), media);
      expect(desiredConstraints(preferences, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT, evidence)).toEqual({});
      expect(evidence.noiseSuppression.reported).toBeNull();
    }
    const mutable = observeNativeCapture(track({ noiseSuppression: [true, false] }, { noiseSuppression: true }), media);
    expect(desiredConstraints(preferences, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT, mutable)).toEqual({ noiseSuppression: { exact: false } });
    expect(preferences.noiseSuppressionIntent).toBe("ON");
  });
  it("omits every Auto constraint and preserves explicit false and independent AGC", () => {
    expect(desiredConstraints(defaults, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT)).toEqual({});
    const desired = desiredConstraints({ ...defaults, inputGainPercent: 200, voiceActivationEnabled: true, echoCancellationIntent: "OFF", autoGainControlIntent: "ON" }, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT);
    expect(desired).toEqual({ echoCancellation: { exact: false }, autoGainControl: { exact: true } });
    expect(desiredConstraints({ ...defaults, noiseSuppressionIntent: "ON" }, "input-alias", { ...AUTO_CAPTURE_FORMAT, sampleRate: 32000, sampleSize: 20 }))
      .toEqual({ deviceId: { exact: "input-alias" }, noiseSuppression: { exact: true }, sampleRate: { exact: 32000 }, sampleSize: { exact: 20 } });
  });
  it("separates missing, recognized-only, singleton, boolean and AEC extra domains", () => {
    const evidence = observeNativeCapture(track({ echoCancellation: [true, false, "all", "remote-only"], noiseSuppression: [true], autoGainControl: [false, true] }), media);
    expect(evidence.voiceIsolation.state).toBe("unavailable"); expect(evidence.voiceIsolation.reported).toBeNull();
    expect(evidence.sampleRate.state).toBe("unavailable"); expect(evidence.noiseSuppression.state).toBe("fixed");
    expect(evidence.autoGainControl.state).toBe("configurable"); expect(evidence.echoCancellation.domain).toContain("remote-only");
    const desired = desiredConstraints({ ...defaults, echoCancellationIntent: "REMOTE_ONLY" }, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT);
    expect(desired.echoCancellation).toEqual({ exact: "remote-only" });
    expect(() => validateNativeIntent(desired, evidence)).not.toThrow();
    const replacement = observeNativeCapture(track({ echoCancellation: [true, false] }), media);
    expect(() => validateNativeIntent(desired, replacement)).toThrow();
  });
  it("keeps requested and reported mismatch instead of copying reported to intent", () => {
    const evidence = observeNativeCapture(track({ autoGainControl: [true, false] }, { autoGainControl: true }, { autoGainControl: { exact: false } }), media);
    expect(evidence.autoGainControl).toMatchObject({ requested: false, reported: true, state: "configurable" });
    expect(observeNativeCapture(track({}), { getSupportedConstraints: () => ({ autoGainControl: false }) } as MediaDevices).autoGainControl.state).toBe("unavailable");
  });
  it("separates an unsupported name from absent or failed support evidence", () => {
    const unsupported = observeNativeCapture(track({}), { getSupportedConstraints: () => ({}) } as MediaDevices);
    expect(unsupported.voiceIsolation.recognized).toBe(false);
    expect(() => verifyRnnoiseNativeIsolation(unsupported)).not.toThrow();
    for (const missing of [{}, { getSupportedConstraints: () => { throw new Error("unavailable"); } }]) {
      const unknown = observeNativeCapture(track({}), missing as MediaDevices);
      expect(unknown.voiceIsolation.recognized).toBeNull();
      expect(() => verifyRnnoiseNativeIsolation(unknown)).toThrow();
    }
  });
  it.each([false, true, null])("RNNoise uses actual readback, not a singleton false capability (reported=%s)", reported => {
    const known = observeNativeCapture(track({ noiseSuppression: [false] }, reported === null ? {} : { noiseSuppression: reported }), media);
    if (reported === false) expect(() => verifyRnnoiseNativeIsolation(known)).not.toThrow();
    else expect(() => verifyRnnoiseNativeIsolation(known)).toThrow();
  });
  it("acquisition preserves Auto, explicit AEC/AGC and format while using optional isolation selection", () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getSupportedConstraints: () => ({ noiseSuppression: true, voiceIsolation: true }) } });
    try {
      expect(acquisitionConstraints(defaults, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT)).toEqual({});
      expect(acquisitionConstraints({ ...defaults, noiseSuppressionMode: "RNNOISE", echoCancellationIntent: "ON", autoGainControlIntent: "OFF" }, SYSTEM_DEFAULT_INPUT, { ...AUTO_CAPTURE_FORMAT, channelCount: 2 })).toEqual({ noiseSuppression: { ideal: false }, voiceIsolation: { ideal: false }, echoCancellation: { exact: true }, autoGainControl: { exact: false }, channelCount: { exact: 2 } });
      expect(acquisitionConstraints({ ...defaults, voiceIsolationIntent: "OFF" }, SYSTEM_DEFAULT_INPUT, AUTO_CAPTURE_FORMAT)).toEqual({ voiceIsolation: { ideal: false } });
    } finally { if (original) Object.defineProperty(navigator, "mediaDevices", original); else Reflect.deleteProperty(navigator, "mediaDevices"); }
  });
  it("stores only local device/format intent per account and input role", () => {
    let current = true;
    const a = new LocalInputProfile("account-a", () => current);
    a.update("input-alias", { ...AUTO_CAPTURE_FORMAT, channelCount: 4, sampleRate: 32000, latency: 0.015 });
    a.update(SYSTEM_DEFAULT_INPUT);
    expect(a.format()).toEqual(AUTO_CAPTURE_FORMAT);
    a.update("input-alias"); expect(a.format().channelCount).toBe(4);
    expect(new LocalInputProfile("account-a", () => true).format().sampleRate).toBe(32000);
    expect(new LocalInputProfile("account-b", () => true).value.deviceId).toBe(SYSTEM_DEFAULT_INPUT);
    current = false; a.update("obsolete"); expect(a.value.deviceId).toBe("input-alias");
    const serialized = localStorage.getItem("likecord:input:v1:account-a")!;
    expect(serialized).not.toMatch(/label|groupId|capabilities|permission|settings/);
  });
  it("retains session intent when storage cannot be written", () => {
    const mock = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    const profile = new LocalInputProfile("account", () => true);
    profile.update("input-alias"); expect(profile.value.deviceId).toBe("input-alias"); expect(profile.storage).toBe("memory");
    mock.mockRestore();
  });
});
