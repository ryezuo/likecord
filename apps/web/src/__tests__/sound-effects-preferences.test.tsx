import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserPreferencesProvider, useUserPreferences, DEFAULT_USER_PREFERENCES } from "../hooks/useUserPreferences";
import SoundEffectsSettings from "../components/settings/SoundEffectsSettings";
import { isVoiceSoundsEnabled, playJoinSound } from "../lib/voiceSounds";

let mockUser: { id: string } | null = { id: "account-a" };
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockImport = jest.fn();
const mockCapture = jest.fn();
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../lib/api", () => ({ userPreferenceApi: {
  get: (...args: unknown[]) => mockGet(...args), update: (...args: unknown[]) => mockUpdate(...args),
  importSoundEffects: (...args: unknown[]) => mockImport(...args),
} }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let latest: ReturnType<typeof useUserPreferences>;
function Consumer() {
  latest = useUserPreferences();
  return <SoundEffectsSettings />;
}
function tree() { return <UserPreferencesProvider><Consumer /></UserPreferencesProvider>; }
const defaults = { ...DEFAULT_USER_PREFERENCES };
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const effectsSlider = () => screen.getByRole("slider", { name: /Effects volume/ });
const masterSlider = () => screen.getByRole("slider", { name: /Volume de chamadas e transmissões/ });
beforeEach(() => {
  jest.clearAllMocks(); mockUser = { id: "account-a" }; localStorage.clear();
  mockGet.mockResolvedValue(defaults);
  mockUpdate.mockImplementation(async patch => ({ ...defaults, ...patch }));
  mockImport.mockImplementation(async ({ enabled }) => ({ ...defaults, soundEffectsEnabled: enabled }));
  window.AudioContext = jest.fn() as any;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: mockCapture, getDisplayMedia: mockCapture } });
});
afterEach(() => { expect(mockCapture).not.toHaveBeenCalled(); jest.useRealTimers(); });

it("hydrates defaults without writes or capture and exposes a functional control with percentage", async () => {
  const pending = deferred<typeof defaults>(); mockGet.mockReturnValue(pending.promise);
  render(tree()); expect(effectsSlider()).toBeDisabled(); expect(masterSlider()).toBeDisabled();
  expect(isVoiceSoundsEnabled(mockUser?.id)).toBe(false); playJoinSound(mockUser?.id); expect(window.AudioContext).not.toHaveBeenCalled();
  await act(async () => pending.resolve(defaults));
  expect(screen.getByRole("checkbox", { name: /Enable sound effects/ })).toBeChecked(); expect(effectsSlider()).toHaveValue("70"); expect(masterSlider()).toHaveValue("100");
  expect(screen.getByText("70%")).toBeInTheDocument(); expect(mockUpdate).not.toHaveBeenCalled();
  expect(window.AudioContext).not.toHaveBeenCalled();
});
it("legacy false stays silent during load and volume-only save, with explicit import and no competing writes", async () => {
  localStorage.setItem("voiceSoundsEnabled", "false"); render(tree()); await flush();
  expect(screen.getByRole("checkbox", { name: /Enable sound effects/ })).not.toBeChecked(); expect(isVoiceSoundsEnabled(mockUser?.id)).toBe(false);
  fireEvent.change(effectsSlider(), { target: { value: "9" } });
  fireEvent.pointerUp(effectsSlider()); await flush();
  expect(mockUpdate).toHaveBeenCalledWith({ soundEffectsVolume: 9 }, expect.any(AbortSignal));
  expect(screen.getByRole("checkbox", { name: /Enable sound effects/ })).not.toBeChecked();
  expect(localStorage.getItem("voiceSoundsEnabled")).toBe("false");
  mockImport.mockResolvedValue({ ...defaults, soundEffectsEnabled: false, soundEffectsVolume: 9 });
  fireEvent.click(screen.getByRole("button", { name: "Keep browser sound setting" })); await flush();
  expect(mockImport).toHaveBeenCalledWith({ enabled: false }, expect.any(AbortSignal));
  expect(effectsSlider()).toHaveValue("9"); expect(screen.getByRole("checkbox", { name: /Enable sound effects/ })).not.toBeChecked();
  expect(localStorage.getItem("voiceSoundsEnabled")).toBeNull();
});
it.each([false, true])("server enabled choice %s overrides legacy without import or write-on-read", async enabled => {
  localStorage.setItem("voiceSoundsEnabled", String(!enabled));
  mockGet.mockResolvedValue({ ...defaults, soundEffectsEnabled: enabled, soundEffectsVolume: 4 });
  render(tree()); await flush();
  expect(latest.soundEffects.enabled).toBe(enabled); expect(latest.soundEffects.volume).toBe(4);
  expect(screen.queryByRole("button", { name: "Keep browser sound setting" })).not.toBeInTheDocument();
  expect(mockImport).not.toHaveBeenCalled(); expect(mockUpdate).not.toHaveBeenCalled();
  expect(localStorage.getItem("voiceSoundsEnabled")).toBeNull();
});
it("import failure keeps candidate and Retry, late server choice wins import without resetting low volume", async () => {
  localStorage.setItem("voiceSoundsEnabled", "false");
  mockImport.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ...defaults, soundEffectsEnabled: true, soundEffectsVolume: 3 });
  render(tree()); await flush(); fireEvent.click(screen.getByRole("button", { name: "Keep browser sound setting" })); await flush();
  expect(screen.getByRole("alert")).toHaveTextContent("Unsaved"); expect(latest.soundEffects.enabled).toBe(false);
  expect(localStorage.getItem("voiceSoundsEnabled")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); await flush();
  expect(latest.soundEffects.enabled).toBe(true); expect(latest.soundEffects.volume).toBe(3);
  expect(localStorage.getItem("voiceSoundsEnabled")).toBeNull();
});
it("coalesces slider changes at 200ms and commits on keyboard/interaction end", async () => {
  jest.useFakeTimers(); render(tree()); await flush();
  fireEvent.change(effectsSlider(), { target: { value: "50" } });
  fireEvent.change(effectsSlider(), { target: { value: "20" } });
  expect(latest.soundEffects.volume).toBe(20); expect(mockUpdate).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(199)); expect(mockUpdate).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1)); expect(mockUpdate).toHaveBeenCalledTimes(1);
  fireEvent.change(effectsSlider(), { target: { value: "0" } });
  fireEvent.keyUp(effectsSlider(), { key: "ArrowLeft" }); await flush();
  expect(mockUpdate).toHaveBeenLastCalledWith({ soundEffectsVolume: 0 }, expect.any(AbortSignal));
  expect(screen.getByRole("button", { name: "Test sound" })).toBeDisabled();
});
it("serializes SFX with appearance and protects newer intent from old successful responses", async () => {
  const first = deferred<typeof defaults>(); const second = deferred<typeof defaults>();
  mockUpdate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(tree()); await flush();
  act(() => latest.updateTheme("LIKECORD_RETRO_98")); await flush();
  act(() => { latest.updateSoundEffectsVolume(0); latest.commitSoundEffects(); }); await flush();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  await act(async () => first.resolve({ ...defaults, theme: "LIKECORD_RETRO_98" }));
  expect(latest.soundEffects.volume).toBe(0); expect(mockUpdate).toHaveBeenCalledTimes(2);
  act(() => latest.updateSoundEffectsEnabled(false));
  mockUpdate.mockResolvedValue({ ...defaults, theme: "LIKECORD_RETRO_98", soundEffectsVolume: 0, soundEffectsEnabled: false });
  await act(async () => second.resolve({ ...defaults, theme: "LIKECORD_RETRO_98", soundEffectsVolume: 0, soundEffectsEnabled: true }));
  expect(latest.soundEffects.enabled).toBe(false); expect(latest.soundEffects.volume).toBe(0);
  expect(latest.preferences.theme).toBe("LIKECORD_RETRO_98");
});
it("failed SFX save keeps disabled/zero intention; appearance retains its rollback and Retry remains possible", async () => {
  mockUpdate.mockRejectedValue(new Error("offline")); render(tree()); await flush();
  act(() => { latest.updateSoundEffectsEnabled(false); latest.updateSoundEffectsVolume(0); latest.commitSoundEffects(); }); await flush();
  expect(latest.soundEffects).toMatchObject({ enabled: false, volume: 0, mutationStatus: "error" });
  act(() => latest.updateTheme("LIKECORD_RETRO_98")); await flush();
  expect(latest.preferences.theme).toBe("LIKECORD_DEFAULT");
  expect(latest.soundEffects).toMatchObject({ enabled: false, volume: 0 });
  mockUpdate.mockResolvedValue({ ...defaults, soundEffectsEnabled: false, soundEffectsVolume: 0 });
  act(() => latest.retrySoundEffects()); await flush();
  expect(latest.soundEffects.mutationStatus).toBe("saved");
});
it("known current-account low/disabled values survive a compatible failed hydration retry", async () => {
  mockGet.mockResolvedValueOnce({ ...defaults, soundEffectsEnabled: false, soundEffectsVolume: 5 }).mockRejectedValueOnce(new Error("offline"));
  render(tree()); await flush(); act(() => latest.retry()); await flush();
  expect(latest.status).toBe("error"); expect(latest.soundEffects).toMatchObject({ ready: true, enabled: false, volume: 5 });
});
it("hydration retry interrupts an in-flight save without losing quiet intention or its Retry action", async () => {
  const old = deferred<typeof defaults>(); mockUpdate.mockReturnValueOnce(old.promise);
  render(tree()); await flush(); act(() => latest.updateSoundEffectsEnabled(false)); await flush();
  act(() => latest.retry()); await flush();
  expect(latest.soundEffects).toMatchObject({ enabled: false, mutationStatus: "error" });
  await act(async () => old.resolve({ ...defaults, soundEffectsEnabled: true }));
  expect(latest.soundEffects.enabled).toBe(false);
  act(() => latest.retrySoundEffects()); await flush();
  expect(latest.soundEffects).toMatchObject({ enabled: false, mutationStatus: "saved" });
});
it("account switch rejects previous GET/PATCH results before effects and does not auto-import legacy for any account", async () => {
  const oldSave = deferred<typeof defaults>(); const newLoad = deferred<typeof defaults>();
  localStorage.setItem("voiceSoundsEnabled", "false");
  const view = render(tree()); await flush();
  mockUpdate.mockReturnValue(oldSave.promise);
  act(() => latest.updateSoundEffectsEnabled(false)); await flush();
  mockGet.mockReturnValue(newLoad.promise); mockUser = { id: "account-b" }; view.rerender(tree());
  expect(latest.soundEffects.ready).toBe(false); expect(isVoiceSoundsEnabled(mockUser?.id)).toBe(false);
  await act(async () => oldSave.resolve({ ...defaults, soundEffectsEnabled: true, soundEffectsVolume: 100 }));
  expect(latest.soundEffects.ready).toBe(false); expect(localStorage.getItem("voiceSoundsEnabled")).toBe("false");
  await act(async () => newLoad.resolve(defaults));
  expect(latest.soundEffects.enabled).toBe(false); expect(mockImport).not.toHaveBeenCalled();
  mockUser = null; view.rerender(tree()); expect(isVoiceSoundsEnabled(mockUser?.id)).toBe(false);
});
it("an older account GET never hydrates the new account", async () => {
  const oldLoad = deferred<typeof defaults>(); const newLoad = deferred<typeof defaults>();
  mockGet.mockReturnValueOnce(oldLoad.promise).mockReturnValueOnce(newLoad.promise);
  const view = render(tree()); mockUser = { id: "account-b" }; view.rerender(tree());
  await act(async () => newLoad.resolve({ ...defaults, soundEffectsEnabled: false, soundEffectsVolume: 1 }));
  await act(async () => oldLoad.resolve({ ...defaults, soundEffectsEnabled: true, soundEffectsVolume: 100 }));
  expect(latest.soundEffects).toMatchObject({ ready: true, enabled: false, volume: 1 });
});
it("fresh load failure only disables SFX and retries without audio acquisition", async () => {
  mockGet.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(defaults);
  render(tree()); await flush(); expect(screen.getByRole("alert")).toHaveTextContent("stay silent");
  expect(effectsSlider()).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(effectsSlider()).toBeEnabled());
  expect(window.AudioContext).not.toHaveBeenCalled(); expect(mockUpdate).not.toHaveBeenCalled();
});

it("coalesces the account master independently at 200ms and accepts the 0..200 boundaries", async () => {
  jest.useFakeTimers(); render(tree()); await flush();
  fireEvent.change(masterSlider(), { target: { value: "150" } });
  fireEvent.change(masterSlider(), { target: { value: "200" } });
  expect(latest.playback.masterPercent).toBe(200);
  expect(mockUpdate).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(200));
  expect(mockUpdate).toHaveBeenLastCalledWith({ callAndStreamVolume: 200 }, expect.any(AbortSignal));

  fireEvent.change(masterSlider(), { target: { value: "0" } });
  fireEvent.pointerUp(masterSlider()); await flush();
  expect(latest.playback.masterPercent).toBe(0);
  expect(mockUpdate).toHaveBeenLastCalledWith({ callAndStreamVolume: 0 }, expect.any(AbortSignal));
  expect(latest.soundEffects.volume).toBe(70);
});

it("keeps an unsaved master intention after failure and retries it without capture", async () => {
  mockUpdate.mockRejectedValueOnce(new Error("offline")); render(tree()); await flush();
  act(() => { latest.updateCallAndStreamVolume(175); latest.commitCallAndStreamVolume(); }); await flush();
  expect(latest.playback).toMatchObject({ ready: true, masterPercent: 175, mutationStatus: "error" });
  mockUpdate.mockResolvedValue({ ...defaults, callAndStreamVolume: 175 });
  act(() => latest.retryCallAndStreamVolume()); await flush();
  expect(latest.playback).toMatchObject({ masterPercent: 175, mutationStatus: "saved" });
});
