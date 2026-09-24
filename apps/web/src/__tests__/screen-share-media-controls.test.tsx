import "@testing-library/jest-dom";
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestMediaStream, installScreenLayout } from "../../test-support/screenMedia";
import ScreenShareViewerWorkspace, { type ViewerStream } from "../components/layout/ScreenShareViewerWorkspace";
import ScreenStreamVideo from "../components/layout/ScreenStreamVideo";
import UserPanel from "../components/layout/UserPanel";

const track = (id: string, kind = "video") => Object.assign(new EventTarget(), {
  id, kind, readyState: "live", stop: jest.fn(), clone: jest.fn(),
}) as unknown as MediaStreamTrack;
const media = (...tracks: MediaStreamTrack[]) => new TestMediaStream(tracks) as unknown as MediaStream;
const share = (id = "a", stream: MediaStream | null = media(track(id))): ViewerStream => ({
  shareId: id, presenterId: id, presenterName: id === "a" ? "Alice" : "Bob", stream, audioAvailable: true,
});
const settle = async () => { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); }); };
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; };

describe("SSUX1 live media controls", () => {
  let fullscreen: Element | null;
  let pip: Element | null;
  let requestFullscreen: jest.Mock;
  let requestPip: jest.Mock;
  let exitFullscreen: jest.Mock;
  let exitPip: jest.Mock;
  let onLeave: jest.Mock;
  let onVolume: jest.Mock;
  let onMute: jest.Mock;
  let onPresentation: jest.Mock;

  function setBrowserElement(kind: string, element: Element) {
    if (kind === "FULLSCREEN") fullscreen = element;
    else pip = element;
  }

  function workspace(streams = [share()]) {
    return <ScreenShareViewerWorkspace streams={streams} onLeaveStream={onLeave} onPresentationChange={onPresentation}
      onVolumeChange={onVolume} onMuteChange={onMute}><div>Chat</div></ScreenShareViewerWorkspace>;
  }
  const more = () => fireEvent.click(screen.getByRole("button", { name: "More stream controls for Alice" }));
  const enterFullscreen = async () => { fireEvent.click(screen.getByRole("button", { name: "Enter fullscreen for Alice's stream" })); await settle(); };
  const enterPip = async () => { more(); fireEvent.click(screen.getByRole("button", { name: "Open Alice's stream in Picture-in-Picture" })); await settle(); };

  beforeEach(() => {
    fullscreen = null; pip = null;
    installScreenLayout();
    onLeave = jest.fn(); onVolume = jest.fn(); onMute = jest.fn(); onPresentation = jest.fn();
    global.MediaStream = TestMediaStream as unknown as typeof MediaStream;
    jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    jest.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
    jest.spyOn(document, "hasFocus").mockReturnValue(true);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() })) });
    Object.defineProperties(document, {
      fullscreenEnabled: { configurable: true, value: true },
      fullscreenElement: { configurable: true, get: () => fullscreen },
      pictureInPictureEnabled: { configurable: true, value: true },
      pictureInPictureElement: { configurable: true, get: () => pip },
    });
    requestFullscreen = jest.fn(function (this: HTMLElement) {
      setBrowserElement("FULLSCREEN", this); document.dispatchEvent(new Event("fullscreenchange")); return Promise.resolve();
    });
    requestPip = jest.fn(function (this: HTMLVideoElement) {
      setBrowserElement("PIP", this); this.dispatchEvent(new Event("enterpictureinpicture")); return Promise.resolve();
    });
    exitFullscreen = jest.fn(async () => { fullscreen = null; document.dispatchEvent(new Event("fullscreenchange")); });
    exitPip = jest.fn(async () => { const previous = pip; pip = null; previous?.dispatchEvent(new Event("leavepictureinpicture")); });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: requestFullscreen });
    Object.defineProperty(HTMLVideoElement.prototype, "requestPictureInPicture", { configurable: true, value: requestPip });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exitFullscreen });
    Object.defineProperty(document, "exitPictureInPicture", { configurable: true, value: exitPip });
  });
  afterEach(() => { cleanup(); jest.useRealTimers(); jest.restoreAllMocks(); document.documentElement.removeAttribute("data-theme"); });

  it.each(["likecord-default", "likecord-retro-98"])("%s: default 100%%, zero and mute remain independent, with per-share names", (theme) => {
    document.documentElement.dataset.theme = theme;
    const alice = share();
    const view = render(workspace([alice, share("b")]));
    const slider = screen.getByRole("slider", { name: "Volume for Alice's stream" });
    expect(slider).toHaveValue("100"); expect(slider).toHaveAttribute("step", "1");
    expect(screen.getByRole("button", { name: "Mute Alice's stream" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(onVolume).toHaveBeenLastCalledWith("a", 0); expect(onMute).not.toHaveBeenCalled();
    view.rerender(workspace([{ ...alice, volume: 0, muted: true }, share("b")]));
    fireEvent.change(slider, { target: { value: "37" } });
    expect(onVolume).toHaveBeenLastCalledWith("a", 0.37); expect(onMute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Unmute Alice's stream" }));
    expect(onMute).toHaveBeenCalledWith("a", false);
    expect(screen.getByRole("slider", { name: "Volume for Bob's stream" })).toHaveValue("100");
  });

  it("disables unavailable audio, distinguishes connecting, and enables late classified audio", () => {
    const alice = share("a", null);
    const view = render(workspace([{ ...alice, audioAvailable: false }]));
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeDisabled();
    const stream = media(track("video"));
    view.rerender(workspace([{ ...alice, stream, audioAvailable: false }]));
    expect(screen.getByText("No audio track received")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute Alice's stream" })).toBeDisabled();
    view.rerender(workspace([{ ...alice, stream, audioAvailable: true }]));
    expect(screen.getByRole("slider")).toBeEnabled();
    expect(screen.queryByText("No audio track received")).not.toBeInTheDocument();
  });

  it("hides after two idle seconds; persistent entry, focus, pointer interaction and More pin controls", () => {
    jest.useFakeTimers(); render(workspace());
    act(() => { jest.advanceTimersByTime(1999); }); expect(screen.getByRole("slider")).toBeVisible();
    act(() => { jest.advanceTimersByTime(1); }); expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    const entry = screen.getByRole("button", { name: "More stream controls for Alice" });
    expect(entry).toBeVisible();
    act(() => { entry.focus(); jest.advanceTimersByTime(4000); }); expect(screen.getByRole("slider")).toBeVisible();
    fireEvent.click(entry); act(() => { entry.blur(); jest.advanceTimersByTime(4000); });
    expect(screen.getByRole("slider")).toBeVisible();
    fireEvent.keyDown(entry, { key: "Escape" }); expect(entry).toHaveFocus(); expect(entry).toHaveAttribute("aria-expanded", "false");
    act(() => { entry.blur(); }); fireEvent.pointerDown(screen.getByRole("slider"));
    act(() => { jest.advanceTimersByTime(4000); }); expect(screen.getByRole("slider")).toBeVisible();
    fireEvent.pointerUp(window); act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    fireEvent.pointerMove(entry); fireEvent.pointerDown(entry);
    act(() => { jest.advanceTimersByTime(4000); }); expect(screen.getByRole("slider")).toBeVisible();
    fireEvent.pointerCancel(window); act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("keeps controls persistent for non-hover devices and compact detached surfaces", () => {
    jest.useFakeTimers(); (window.matchMedia as jest.Mock).mockReturnValue({ matches: false });
    render(workspace()); act(() => { jest.advanceTimersByTime(10000); }); expect(screen.getByRole("slider")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Detach Alice's stream" }));
    act(() => { jest.advanceTimersByTime(10000); }); expect(screen.getByRole("slider")).toBeVisible();
  });

  it("uses native keyboard controls without Space/Enter restoring the detached workspace", async () => {
    const user = userEvent.setup(); render(workspace());
    fireEvent.click(screen.getByRole("button", { name: "Detach Alice's stream" }));
    const slider = screen.getByRole("slider"); act(() => { slider.focus(); });
    // jsdom/user-event cannot perform native range Home/End; verify event containment here.
    for (const key of ["ArrowLeft", "Home", "End", " ", "Enter"]) fireEvent.keyDown(slider, { key });
    expect(slider).toHaveFocus(); expect(screen.getByTestId("detached-stream-a")).toBeInTheDocument();
    await user.tab(); expect(screen.getByRole("button", { name: "Enter fullscreen for Alice's stream" })).toHaveFocus();
    more(); fireEvent.click(screen.getByRole("button", { name: "Restore Alice's stream workspace" }));
    expect(screen.getByTestId("central-stream-a")).toBeInTheDocument();
  });

  it("fullscreens the actual media container with its controls, follows browser Escape and restores focus", async () => {
    const { container } = render(workspace()); const video = container.querySelector("video")!;
    const trigger = screen.getByRole("button", { name: "Enter fullscreen for Alice's stream" });
    await enterFullscreen();
    expect(fullscreen).toBe(video.parentElement); expect(fullscreen).toContainElement(screen.getByRole("slider"));
    expect(requestFullscreen.mock.instances[0]).toBe(video.parentElement);
    expect(screen.getByRole("button", { name: "Exit fullscreen for Alice's stream" })).toBeEnabled();
    act(() => { fullscreen = null; document.dispatchEvent(new Event("fullscreenchange")); });
    expect(trigger).toHaveFocus(); expect(screen.getByRole("button", { name: "Enter fullscreen for Alice's stream" })).toBeEnabled();
  });

  it("does not infer browser ownership from a resolved promise and reports rejected requests", async () => {
    requestFullscreen.mockResolvedValue(undefined); render(workspace()); await enterFullscreen();
    expect(screen.queryByRole("button", { name: "Exit fullscreen for Alice's stream" })).not.toBeInTheDocument();
    requestFullscreen.mockRejectedValue(new Error("denied")); await enterFullscreen();
    expect(screen.getByRole("status")).toHaveTextContent("Unable to enter fullscreen");
    expect(screen.getByRole("button", { name: "Enter fullscreen for Alice's stream" })).toBeEnabled();
  });

  it("rejects PiP honestly without changing base presentation or audio intent", async () => {
    requestPip.mockRejectedValue(new Error("not allowed")); render(workspace()); await enterPip();
    expect(screen.getByRole("status")).toHaveTextContent("Unable to open Picture-in-Picture");
    expect(screen.getByTestId("central-stream-a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Alice.*Picture/ })).toBeEnabled();
    expect(onMute).not.toHaveBeenCalled(); expect(onLeave).not.toHaveBeenCalled();
  });

  it("does not replace or exit an unrelated fullscreen/PiP owner", async () => {
    const foreign = document.createElement("video"); fullscreen = foreign; render(workspace());
    await enterFullscreen(); expect(requestFullscreen).not.toHaveBeenCalled(); expect(exitFullscreen).not.toHaveBeenCalled();
    fullscreen = null; pip = foreign; await enterPip();
    expect(requestPip).not.toHaveBeenCalled(); expect(exitPip).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Exit the current browser presentation first");
  });

  it("gates unsupported APIs and PiP until the actual video has metadata", () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    Object.defineProperty(document, "pictureInPictureEnabled", { configurable: true, value: false });
    const view = render(workspace()); more();
    expect(screen.queryByRole("button", { name: /fullscreen for/ })).not.toBeInTheDocument();
    expect(screen.getByText("Picture-in-Picture is unavailable in this browser.")).toBeInTheDocument();
    view.unmount(); Object.defineProperty(document, "pictureInPictureEnabled", { configurable: true, value: true });
    jest.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(0);
    const next = render(workspace()); more(); expect(screen.getByRole("button", { name: /Open Alice.*Picture/ })).toBeDisabled();
    jest.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
    fireEvent.loadedMetadata(next.container.querySelector("video")!); expect(screen.getByRole("button", { name: /Open Alice.*Picture/ })).toBeEnabled();
  });

  it("PiP owns the existing video; native pause/unmute cannot create an audible route or capture", async () => {
    const videoTrack = track("video"), audioTrack = track("audio", "audio");
    const source = media(videoTrack, audioTrack); const view = render(workspace([share("a", source)]));
    const video = view.container.querySelector("video")!; const projection = video.srcObject as MediaStream;
    await enterPip(); expect(pip).toBe(video); expect(requestPip.mock.instances[0]).toBe(video);
    expect(projection).not.toBe(source); expect(projection.getTracks()).toEqual([videoTrack]);
    video.muted = false; video.volume = 1; fireEvent.volumeChange(video); fireEvent.pause(video);
    expect(video).toMatchObject({ muted: true, volume: 0 }); expect(projection.getAudioTracks()).toEqual([]);
    expect(view.container.querySelectorAll("video")).toHaveLength(1); expect(onMute).not.toHaveBeenCalled(); expect(onLeave).not.toHaveBeenCalled();
    act(() => { pip = null; video.dispatchEvent(new Event("leavepictureinpicture")); });
    expect(screen.getByRole("button", { name: /Open Alice.*Picture/ })).toHaveFocus();
    view.unmount(); expect(video.srcObject).toBeNull(); expect(videoTrack.stop).not.toHaveBeenCalled(); expect(videoTrack.clone).not.toHaveBeenCalled(); expect(audioTrack.stop).not.toHaveBeenCalled();
  });

  it.each(["FULLSCREEN", "PIP"])("%s must exit before detach remounts the visual surface", async (kind) => {
    const view = render(workspace()); const oldVideo = view.container.querySelector("video")!;
    if (kind === "FULLSCREEN") await enterFullscreen(); else await enterPip();
    const done = deferred(); const exit = kind === "FULLSCREEN" ? exitFullscreen : exitPip;
    exit.mockImplementation(() => done.promise.then(() => { fullscreen = null; pip = null; document.dispatchEvent(new Event("fullscreenchange")); }));
    fireEvent.click(screen.getByRole("button", { name: "Detach Alice's stream" }));
    expect(screen.getByTestId("central-stream-a")).toContainElement(oldVideo); expect(exit).toHaveBeenCalledTimes(1);
    await act(async () => { done.resolve(); }); await settle();
    expect(screen.getByTestId("detached-stream-a")).toBeInTheDocument(); expect(oldVideo.srcObject).toBeNull();
    expect(screen.getByRole("button", { name: "More stream controls for Alice" })).toHaveFocus();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("SSUX2: another share can detach/minimize without exiting A's PiP or replacing its video", async () => {
    const view = render(workspace([share(), share("b")])); await enterPip(); const original = pip;
    fireEvent.click(screen.getByRole("button", { name: "Detach Bob's stream" }));
    expect(pip).toBe(original); expect(exitPip).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "More stream controls for Bob" }));
    fireEvent.click(screen.getByRole("button", { name: "Minimize Bob's stream" }));
    expect(pip).toBe(original); expect(view.container.querySelectorAll("video")).toHaveLength(1);
    expect(exitPip).not.toHaveBeenCalled(); expect(onMute).not.toHaveBeenCalled();
  });

  it("SSUX2: PiP Minimize exits the owned video and focuses its persistent Restore control", async () => {
    const view = render(workspace()); await enterPip();
    fireEvent.click(screen.getByRole("button", { name: "Minimize Alice's stream" })); await settle();
    expect(pip).toBeNull(); expect(exitPip).toHaveBeenCalledTimes(1); expect(view.container.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: "Restore Alice's stream" })).toHaveFocus();
    expect(onPresentation).toHaveBeenLastCalledWith("a", "MINIMIZED"); expect(onMute).not.toHaveBeenCalled();
  });

  it.each(["FULLSCREEN", "PIP"])("SSUX2 %s: Hide guards audio immediately, rejects safely, and completes after external exit", async kind => {
    const alice = share(); const view = render(workspace([alice]));
    if (kind === "FULLSCREEN") { await enterFullscreen(); more(); } else await enterPip();
    const original = view.container.querySelector("video");
    (kind === "FULLSCREEN" ? exitFullscreen : exitPip).mockRejectedValue(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Hide Alice's stream" }));
    expect(onPresentation).toHaveBeenLastCalledWith("a", "HIDDEN"); await settle();
    expect(view.container.querySelector("video")).toBe(original); expect(screen.getByText(/Hiding Alice/)).toBeVisible();
    onPresentation.mockClear(); view.rerender(workspace([{ ...alice, volume: 0.23 }]));
    expect(onPresentation.mock.calls.every(([, mode]) => mode === "HIDDEN")).toBe(true);
    act(() => { fullscreen = null; pip = null; document.dispatchEvent(new Event("fullscreenchange")); original?.dispatchEvent(new Event("leavepictureinpicture")); });
    await settle(); expect(view.container.querySelector("video")).toBeNull();
    expect(screen.getByTestId("stream-row-a")).toHaveTextContent("Hidden · audio off");
    expect(screen.getByRole("button", { name: "Show Alice's stream" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Show Alice's stream" }));
    expect(screen.getByRole("slider")).toHaveValue("23"); expect(onMute).not.toHaveBeenCalled();
  });

  it("SSUX2: terminal loss during a delayed Hide cannot resurrect the row or reopen audio", async () => {
    const view = render(workspace()); await enterPip(); const done = deferred(); exitPip.mockImplementation(() => done.promise);
    fireEvent.click(screen.getByRole("button", { name: "Hide Alice's stream" }));
    expect(onPresentation).toHaveBeenLastCalledWith("a", "HIDDEN");
    view.rerender(workspace([])); onPresentation.mockClear();
    await act(async () => { pip = null; done.resolve(); }); await settle();
    expect(screen.queryByTestId("stream-row-a")).toBeNull(); expect(screen.queryByTestId("central-stream-a")).toBeNull(); expect(onPresentation).not.toHaveBeenCalled();
  });

  it("retains presentation on exit rejection and allows recovery through browser exit", async () => {
    render(workspace()); await enterFullscreen(); exitFullscreen.mockRejectedValue(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Detach Alice's stream" })); await settle();
    expect(screen.getByTestId("central-stream-a")).toBeInTheDocument(); expect(screen.getByRole("status")).toHaveTextContent("Unable to exit browser presentation");
    act(() => { fullscreen = null; document.dispatchEvent(new Event("fullscreenchange")); });
    fireEvent.click(screen.getByRole("button", { name: "Detach Alice's stream" }));
    expect(screen.getByTestId("detached-stream-a")).toBeInTheDocument();
  });

  it.each(["FULLSCREEN", "PIP"])("%s: terminal loss invalidates pending work and exits only the obsolete element", async (kind) => {
    const done = deferred(); const obsolete: HTMLElement[] = [];
    (kind === "FULLSCREEN" ? requestFullscreen : requestPip).mockImplementation(function (this: HTMLElement) { obsolete.push(this); return done.promise.then(() => { setBrowserElement(kind, this); }); });
    const alice = share(); const view = render(workspace([alice]));
    if (kind === "FULLSCREEN") await enterFullscreen(); else await enterPip();
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for browser");
    view.rerender(workspace([])); await act(async () => { done.resolve(); }); await settle();
    expect(fullscreen).toBeNull(); expect(pip).toBeNull(); expect(obsolete[0].isConnected).toBe(false);
    view.rerender(workspace([share("b")])); expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter fullscreen for Bob's stream" })).toBeEnabled();
  });

  it("an obsolete request cannot close a newer owner when React reuses the same video/container", async () => {
    const done = deferred(); requestFullscreen.mockImplementationOnce(() => done.promise);
    const alice = share(); const view = render(workspace([alice]));
    const original = view.container.querySelector("video"); await enterFullscreen();
    view.rerender(workspace([{ ...alice, stream: media(track("replacement")) }]));
    expect(view.container.querySelector("video")).toBe(original);
    await enterFullscreen();
    await act(async () => { done.resolve(); }); await settle();
    expect(fullscreen).toBe(original!.parentElement); expect(exitFullscreen).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Exit fullscreen for Alice's stream" })).toBeEnabled();
  });

  it("Leave exits PiP, exposes honest pending/retry, and disappears only on authoritative removal", async () => {
    const alice = share(); const view = render(workspace([alice])); await enterPip();
    fireEvent.click(screen.getByRole("button", { name: "Leave Alice's stream" })); await settle();
    expect(exitPip).toHaveBeenCalledTimes(1); expect(onLeave).toHaveBeenCalledWith("a");
    expect(screen.getByRole("status")).toHaveTextContent("Leaving Alice's stream");
    fireEvent.click(screen.getByRole("button", { name: "Retry leave" })); expect(onLeave).toHaveBeenCalledTimes(2);
    view.rerender(workspace([{ ...alice }])); expect(screen.getByRole("status")).toBeInTheDocument();
    view.rerender(workspace([])); expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reconciles source track membership without cloning/stopping tracks and clears visual binding on unmount", () => {
    const first = track("first"), second = track("second"), audio = track("audio", "audio");
    const source = media(first, audio); const view = render(<ScreenStreamVideo stream={source} />);
    const video = view.container.querySelector("video")!; const projection = video.srcObject as MediaStream;
    act(() => { source.removeTrack(first); source.addTrack(second); });
    expect(video.srcObject).toBe(projection); expect(projection.getTracks()).toEqual([second]);
    view.unmount(); expect(video.srcObject).toBeNull();
    [first, second, audio].forEach((entry) => { expect(entry.stop).not.toHaveBeenCalled(); expect(entry.clone).not.toHaveBeenCalled(); });
  });

  it("UserPanel uses the existing stopping state, then exposes only the polite local completion result", () => {
    const voice = { isMuted: false, isDeafened: false, serverMuted: false, channelId: "voice", status: "connected",
      screenShareStatus: "stopping" as const, screenShareFeedback: null,
      toggleMute: jest.fn(), toggleDeafen: jest.fn(), leave: jest.fn(), startScreenShare: jest.fn(), stopScreenShare: jest.fn() };
    const props = { user: { id: "me", username: "me", displayName: "Me" }, status: "ONLINE" as const, onSetStatus: jest.fn(), onLogout: jest.fn() };
    const view = render(<UserPanel {...props} voice={voice} />);
    expect(screen.getByRole("button", { name: "Stopping screen share" })).toBeDisabled();
    expect(screen.queryByText("Screen sharing stopped on this device")).not.toBeInTheDocument();
    view.rerender(<UserPanel {...props} voice={{ ...voice, screenShareStatus: "idle", screenShareFeedback: "Screen sharing stopped on this device" }} />);
    const feedback = screen.getByText("Screen sharing stopped on this device");
    expect(feedback).toHaveAttribute("role", "status"); expect(feedback).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Share your screen" })).toBeEnabled();
  });
});
