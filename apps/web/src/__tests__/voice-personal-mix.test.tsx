import { act, renderHook } from "@testing-library/react";
import { voiceMixApi, type VoiceMixPreference } from "../lib/api";
import { useVoicePersonalMix, VOICE_MIX_WRITE_DELAY_MS } from "../hooks/useVoicePersonalMix";

jest.mock("../lib/api", () => ({ voiceMixApi: { list: jest.fn(), put: jest.fn(), reset: jest.fn() } }));
const api = jest.mocked(voiceMixApi);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function mount() {
  const hook = renderHook(() => useVoicePersonalMix("listener"));
  await act(async () => {});
  return hook;
}
async function settleSlider() {
  await act(async () => { jest.advanceTimersByTime(VOICE_MIX_WRITE_DELAY_MS); });
}

describe("Durable personal mix owner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    api.list.mockResolvedValue([]);
    api.put.mockResolvedValue({ targetUserId: "target", volumePercent: 20, muted: false });
    api.reset.mockResolvedValue(undefined);
  });
  afterEach(() => { jest.useRealTimers(); });

  it("hydrates volume and local mute, uses defaults for missing targets, and keeps self empty", async () => {
    api.list.mockResolvedValue([
      { targetUserId: "target", volumePercent: 20, muted: true },
      { targetUserId: "listener", volumePercent: 0, muted: true },
    ]);
    const { result } = await mount();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(result.current.isVoicePersonalMixReady()).toBe(true);
    expect(result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 20, locallyMuted: true });
    for (const id of ["missing", "listener"]) {
      expect(result.current.getVoicePersonalMixPreference(id)).toEqual({ volumePercent: 100, locallyMuted: false });
    }
    act(() => result.current.setVoicePersonalMixPreference("listener", { volumePercent: 50 }));
    await settleSlider();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("waits for authenticated mount and prevents stale account hydration/pending writes", async () => {
    const oldLoad = deferred<VoiceMixPreference[]>();
    api.list.mockReturnValueOnce(oldLoad.promise);
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useVoicePersonalMix(id), { initialProps: { id: undefined } as { id?: string } });
    expect(api.list).not.toHaveBeenCalled();
    rerender({ id: "old" });
    rerender({ id: "new" });
    await act(async () => {});
    await act(async () => oldLoad.resolve([{ targetUserId: "target", volumePercent: 20, muted: true }]));
    expect(result.current.getVoicePersonalMixPreference("target").volumePercent).toBe(100);
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 40 }));
    rerender({ id: undefined });
    await settleSlider();
    expect(api.put).not.toHaveBeenCalled();
    expect(result.current.isVoicePersonalMixReady()).toBe(false);
    expect(result.current.getVoicePersonalMixPreference("target").volumePercent).toBe(100);
  });

  it("keeps hydration fail-closed with a recoverable retry, without writing defaults", async () => {
    api.list.mockRejectedValueOnce(new Error("offline"));
    const { result } = await mount();
    expect(result.current.isVoicePersonalMixReady()).toBe(false);
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("load-error");
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 20 }));
    await settleSlider();
    expect(api.put).not.toHaveBeenCalled();
    api.list.mockResolvedValueOnce([{ targetUserId: "target", volumePercent: 15, muted: true }]);
    await act(async () => result.current.retryVoicePersonalMix("target"));
    expect(result.current.isVoicePersonalMixReady()).toBe(true);
    expect(result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 15, locallyMuted: true });
  });

  it("persists observer edits and rehydrates them in a fresh browser/mount; defaults use DELETE", async () => {
    let stored: VoiceMixPreference[] = [];
    api.list.mockImplementation(async () => stored);
    api.put.mockImplementation(async (targetUserId, value) => {
      stored = [{ targetUserId, ...value }];
      return stored[0];
    });
    api.reset.mockImplementation(async () => { stored = []; });
    const first = await mount();
    act(() => first.result.current.setVoicePersonalMixPreference("target", { volumePercent: 20, locallyMuted: true }));
    expect(first.result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 20, locallyMuted: true });
    expect(api.put).not.toHaveBeenCalled();
    await settleSlider();
    first.unmount();
    const second = await mount();
    expect(second.result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 20, locallyMuted: true });
    act(() => second.result.current.setVoicePersonalMixPreference("target", { volumePercent: 100, locallyMuted: false }));
    await settleSlider();
    expect(api.reset).toHaveBeenCalledWith("target", expect.any(AbortSignal));
    second.unmount();
    const third = await mount();
    expect(third.result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 100, locallyMuted: false });
  });

  it.each([0, 38, 100])("preserves %i percent across mute and unmute", async (volumePercent) => {
    const { result } = await mount();
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent }));
    act(() => result.current.setVoicePersonalMixPreference("target", { locallyMuted: true }));
    await settleSlider();
    expect(api.put).toHaveBeenLastCalledWith("target", { volumePercent, muted: true }, expect.any(AbortSignal));
    act(() => result.current.setVoicePersonalMixPreference("target", { locallyMuted: false }));
    expect(result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent, locallyMuted: false });
    await settleSlider();
    if (volumePercent === 100) expect(api.reset).toHaveBeenCalled();
    else expect(api.put).toHaveBeenLastCalledWith("target", { volumePercent, muted: false }, expect.any(AbortSignal));
  });

  it("retains immediate local mix on a failed save/reset and supports retry", async () => {
    api.put.mockRejectedValueOnce(new Error("offline"));
    const { result } = await mount();
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 20 }));
    await settleSlider();
    expect(result.current.getVoicePersonalMixPreference("target").volumePercent).toBe(20);
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("save-error");
    act(() => result.current.retryVoicePersonalMix("target"));
    await settleSlider();
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("saved");
    api.reset.mockRejectedValueOnce(new Error("offline"));
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 100 }));
    await settleSlider();
    expect(result.current.getVoicePersonalMixPreference("target").volumePercent).toBe(100);
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("save-error");
    act(() => result.current.retryVoicePersonalMix("target"));
    await settleSlider();
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("saved");
  });

  it.each([false, true])("coalesces and serializes per target despite old request failure=%s", async (fails) => {
    const oldWrite = deferred<VoiceMixPreference>();
    api.put.mockReturnValueOnce(oldWrite.promise);
    const { result } = await mount();
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 20 }));
    await settleSlider();
    act(() => {
      result.current.setVoicePersonalMixPreference("target", { volumePercent: 30 });
      result.current.setVoicePersonalMixPreference("target", { volumePercent: 40 });
      result.current.setVoicePersonalMixPreference("target", { volumePercent: 70, locallyMuted: true });
    });
    await settleSlider();
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 70, locallyMuted: true });
    await act(async () => {
      if (fails) oldWrite.reject(new Error("old failure"));
      else oldWrite.resolve({ targetUserId: "target", volumePercent: 20, muted: false });
    });
    expect(api.put).toHaveBeenCalledTimes(2);
    expect(api.put).toHaveBeenLastCalledWith("target", { volumePercent: 70, muted: true }, expect.any(AbortSignal));
    expect(result.current.getVoicePersonalMixPreference("target")).toEqual({ volumePercent: 70, locallyMuted: true });
    expect(result.current.getVoicePersonalMixStatus("target")).toBe("saved");
  });

  it("serializes a reset behind a PUT while another target can save independently", async () => {
    const oldWrite = deferred<VoiceMixPreference>();
    api.put.mockReturnValueOnce(oldWrite.promise);
    const { result } = await mount();
    act(() => result.current.setVoicePersonalMixPreference("target", { volumePercent: 20 }));
    await settleSlider();
    act(() => {
      result.current.setVoicePersonalMixPreference("target", { volumePercent: 100 });
      result.current.setVoicePersonalMixPreference("other", { volumePercent: 50 });
    });
    await settleSlider();
    expect(api.reset).not.toHaveBeenCalled();
    expect(api.put).toHaveBeenLastCalledWith("other", { volumePercent: 50, muted: false }, expect.any(AbortSignal));
    await act(async () => oldWrite.resolve({ targetUserId: "target", volumePercent: 20, muted: false }));
    expect(api.reset).toHaveBeenCalledTimes(1);
    expect(result.current.getVoicePersonalMixPreference("target").volumePercent).toBe(100);
  });
});
