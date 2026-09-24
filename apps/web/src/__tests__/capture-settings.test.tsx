import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { UserPreferencesProvider, useUserPreferences, DEFAULT_USER_PREFERENCES } from "../hooks/useUserPreferences";
import CaptureSettings from "../components/settings/CaptureSettings";
import { getVoiceCaptureOwner } from "../lib/voiceCapture";
import { installCaptureGraph, settle, deferred } from "../../test-support/captureGraph";

let mockUser: { id: string } | null = { id: "account-a" };
const mockGet = jest.fn(); const mockUpdate = jest.fn();
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../lib/api", () => ({ userPreferenceApi: { get: (...args: unknown[]) => mockGet(...args), update: (...args: unknown[]) => mockUpdate(...args) } }));
let latest: ReturnType<typeof useUserPreferences>;
function Consumer({ show = true }: { show?: boolean }) { latest = useUserPreferences(); return show ? <CaptureSettings /> : null; }
const tree = (show = true) => <UserPreferencesProvider><Consumer show={show} /></UserPreferencesProvider>;
const flush = () => act(async () => { await settle(); });
let graph: ReturnType<typeof installCaptureGraph>;
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); mockUser = { id: "account-a" }; graph = installCaptureGraph();
  mockGet.mockResolvedValue({ ...DEFAULT_USER_PREFERENCES });
  mockUpdate.mockImplementation(async (patch) => ({ ...DEFAULT_USER_PREFERENCES, ...patch }));
});
afterEach(() => { jest.useRealTimers(); });

it("opens as observer with Browser default, labels real domains and loads no RNNoise", async () => {
  render(tree()); await flush();
  expect(graph.getUserMedia).not.toHaveBeenCalled(); expect(graph.contexts).toHaveLength(0);
  expect(screen.getByRole("combobox", { name: "Automatic Gain Control" })).toBeDisabled();
  expect(screen.getByRole("combobox", {name:"Supressão de ruído"})).toHaveValue("BROWSER");
  expect(screen.getByRole("option", {name:"RNNoise"})).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Testar microfone" })); await settle(); });
  expect(graph.getUserMedia).toHaveBeenCalledTimes(1);
  const agc = screen.getByRole("combobox", { name: "Automatic Gain Control" }); expect(agc).toBeEnabled();
  await act(async () => { fireEvent.change(agc, { target: { value: "OFF" } }); await settle(); });
  expect(graph.raw[0].tracks[0].applyConstraints).toHaveBeenCalledWith({ autoGainControl: { exact: false } });
  expect(screen.getByText(/valor reportado é diferente/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Avançado — captura"));
  expect(screen.getByRole("spinbutton", { name: "Capture sample rate (Hz)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Parar teste" }));
  expect(graph.raw[0].tracks[0].readyState).toBe("ended");
});

it("Settings section exit stops only local test; active call continues", async () => {
  const view = render(tree()); await flush();
  await act(async () => { latest.startMicTest(); await settle(); });
  view.rerender(tree(false)); expect(graph.raw[0].tracks[0].readyState).toBe("ended");
  view.rerender(tree());
  await act(async () => { await getVoiceCaptureOwner()!.startCall(() => true, () => undefined); });
  const callTrack = graph.raw[1].tracks[0];
  expect(screen.queryByRole("button", { name: "Testar microfone" })).not.toBeInTheDocument();
  view.rerender(tree(false)); expect(callTrack.readyState).toBe("live");
});

it("coalesces typed input writes, keeps unsaved quiet intent and explicitly retries", async () => {
  jest.useFakeTimers(); render(tree()); await flush();
  mockUpdate.mockRejectedValueOnce(new Error("offline"));
  act(() => { latest.updateCapture({ inputGainPercent: 20 }); latest.updateCapture({ inputGainPercent: 0, voiceActivationEnabled: false, autoGainControlIntent: "OFF" }); });
  expect(latest.preferences.inputGainPercent).toBe(0); expect(mockUpdate).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(200); await settle(); });
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith({ inputGainPercent: 0, voiceActivationEnabled: false, autoGainControlIntent: "OFF" }, expect.any(AbortSignal));
  expect(screen.getByRole("alert")).toHaveTextContent("Unsaved"); expect(latest.preferences.inputGainPercent).toBe(0);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); await settle(); });
  expect(latest.capture.mutationStatus).toBe("saved"); expect(latest.preferences.inputGainPercent).toBe(0);
  expect(graph.getUserMedia).not.toHaveBeenCalled();
});

it("preserves unsaved RNNoise intent without allocating and isolates it on account change", async () => {
  const view = render(tree()); await flush();
  mockUpdate.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { latest.updateCapture({ noiseSuppressionMode: "RNNOISE" }); latest.commitCapture(); await settle(); });
  expect(latest.preferences.noiseSuppressionMode).toBe("RNNOISE");
  expect(latest.capture.mutationStatus).toBe("error");
  expect(screen.getByRole("alert")).toHaveTextContent("Unsaved");
  expect(graph.contexts).toHaveLength(0);
  expect(graph.getUserMedia).not.toHaveBeenCalled();
  await act(async () => { latest.commitCapture(); await settle(); });
  expect(latest.capture.mutationStatus).toBe("saved");
  expect(mockUpdate).toHaveBeenLastCalledWith({ noiseSuppressionMode: "RNNOISE" }, expect.any(AbortSignal));
  mockUser = { id: "account-b" }; view.rerender(tree()); await flush();
  expect(latest.preferences.noiseSuppressionMode).toBe("BROWSER");
  expect(graph.contexts).toHaveLength(0);
});

it("explicit Browser session recovery preserves saved RNNoise and does not write preferences", async () => {
  mockGet.mockResolvedValue({ ...DEFAULT_USER_PREFERENCES, noiseSuppressionMode: "RNNOISE" });
  render(tree()); await flush();
  await act(async () => { latest.startMicTest(); await settle(); });
  expect(screen.getByRole("button", { name: "Usar Navegador nesta sessão" })).toBeInTheDocument();
  expect(graph.contexts).toHaveLength(0); // Unknown native readback rejected before RN allocation.
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Usar Navegador nesta sessão" })); await settle(); });
  expect(latest.preferences.noiseSuppressionMode).toBe("RNNOISE");
  expect(latest.capture.state?.suppression).toMatchObject({ requested: "RNNOISE", effective: "BROWSER", sessionBrowser: true });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox", { name: "Browser Noise Suppression" })).toBeEnabled();
  await act(async () => { latest.stopMicTest(); await settle(); });
  expect(latest.capture.state?.suppression.sessionBrowser).toBe(false);
  expect(latest.preferences.noiseSuppressionMode).toBe("RNNOISE");
});

it("isolates account changes synchronously and ignores old write/hydration responses", async () => {
  const view = render(tree()); await flush();
  const pending = deferred<typeof DEFAULT_USER_PREFERENCES>(); mockUpdate.mockReturnValueOnce(pending.promise);
  await act(async () => { latest.updateCapture({ inputGainPercent: 0 }); latest.commitCapture(); await settle(); });
  await act(async () => { latest.startMicTest(); await settle(); });
  mockUser = { id: "account-b" }; view.rerender(tree());
  expect(latest.capture.ready).toBe(false); expect(graph.raw[0].tracks[0].readyState).toBe("ended"); await flush();
  await act(async () => pending.resolve({ ...DEFAULT_USER_PREFERENCES, inputGainPercent: 0 }));
  expect(latest.preferences.inputGainPercent).toBe(100); expect(latest.capture.mutationStatus).toBe("idle");
});

it("a stale save cannot override a newer threshold or independent sound/master/theme", async () => {
  render(tree()); await flush(); const pending = deferred<typeof DEFAULT_USER_PREFERENCES>(); mockUpdate.mockReturnValueOnce(pending.promise);
  await act(async () => { latest.updateCapture({ voiceActivationThresholdDbfs: -40 }); latest.commitCapture(); await settle(); });
  act(() => latest.updateCapture({ voiceActivationThresholdDbfs: -65, inputGainPercent: 0 }));
  await act(async () => pending.resolve({ ...DEFAULT_USER_PREFERENCES, voiceActivationThresholdDbfs: -40, callAndStreamVolume: 200, soundEffectsVolume: 100, theme: "LIKECORD_RETRO_98" }));
  await flush(); expect(latest.preferences).toMatchObject({ voiceActivationThresholdDbfs: -65, inputGainPercent: 0, callAndStreamVolume: 100, soundEffectsVolume: 70, theme: "LIKECORD_DEFAULT" });
});
