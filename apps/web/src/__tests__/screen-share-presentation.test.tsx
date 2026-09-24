import { TestMediaStream, installScreenLayout } from "../../test-support/screenMedia";
import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import ScreenShareViewerWorkspace, { type ViewerStream, type SelfShare } from "../components/layout/ScreenShareViewerWorkspace";
import { isScreenAudioMuted } from "../hooks/useVoice";

const videoTrack = Object.assign(new EventTarget(), { kind: "video", id: "borrowed", readyState: "live", stop: jest.fn(), clone: jest.fn() }) as unknown as MediaStreamTrack;
const source = new TestMediaStream([videoTrack]) as unknown as MediaStream;
const streams: ViewerStream[] = ["Alice", "Casey", "Devon", "Erin"].map((name, index) => ({ shareId: String(index), presenterId: name, presenterName: name, stream: source, audioAvailable: true, volume: 0.37, muted: false }));
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name, exact: true }));
function action(verb: string, name = "Alice") {
  if (verb === "Minimize" || verb === "Hide") click(`More stream controls for ${name}`);
  click(`${verb} ${name}'s stream`);
}
function setup(initial = streams, selfShare?: SelfShare) {
  const leave = jest.fn(), policy = jest.fn(), mute = jest.fn(), volume = jest.fn();
  const ui = (items = initial, self = selfShare, route = "Chat", theme = "likecord-default") => <div data-theme={theme}><ScreenShareViewerWorkspace streams={items} selfShare={self} onLeaveStream={leave} onPresentationChange={policy} onMuteChange={mute} onVolumeChange={volume}><div data-testid="chat-content">{route}</div></ScreenShareViewerWorkspace></div>;
  return { ...render(ui()), ui, leave, policy, mute, volume };
}
beforeEach(() => {
  global.MediaStream = TestMediaStream as unknown as typeof MediaStream;
  installScreenLayout();
  jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  jest.spyOn(document, "hasFocus").mockReturnValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe("SSUX2 independent presentation and inherited media ownership", () => {
  it("retains the HIDDEN guard independently from manual mute", () => {
    expect(isScreenAudioMuted(false, false)).toBe(false);
    expect(isScreenAudioMuted(true, false)).toBe(true);
    expect(isScreenAudioMuted(false, true)).toBe(true);
    expect(isScreenAudioMuted(true, true)).toBe(true);
  });
  it("Gallery/Focus preserve each actual video, four subscriptions and compact secondary controls", () => {
    const view = setup(); const videos = [...view.container.querySelectorAll("video")];
    expect(screen.getByTestId("gallery-workspace")).toHaveClass("stream-count-4");
    fireEvent.doubleClick(screen.getByTestId("grid-media-1"));
    expect(screen.getByTestId("central-stream-1")).toHaveClass("screen-share-focus-primary-card");
    expect(view.container.querySelectorAll(".screen-share-focus-secondary-card")).toHaveLength(3);
    fireEvent.doubleClick(screen.getByTestId("focus-secondary-media-0"));
    expect(screen.getByTestId("central-stream-0")).toHaveClass("screen-share-focus-primary-card");
    click("Grid view");
    expect([...view.container.querySelectorAll("video")]).toEqual(videos);
    expect(view.leave).not.toHaveBeenCalled();
    videos.forEach(video => { expect(video).toMatchObject({ muted: true, volume: 0 }); expect((video.srcObject as MediaStream).getTracks()).toEqual([videoTrack]); });
  });
  it("one CENTRAL uses the main surface, with contain media variant", () => {
    setup([streams[0]]);
    expect(screen.getByTestId("viewer-presentation-workspace")).toHaveClass("main-content");
    expect(screen.getByTestId("central-stream-surface")).toHaveClass("single-stream");
    expect(screen.getByTestId("central-stream-0").querySelector("video")).toHaveClass("screen-stream-video-central");
  });
  it("detaching C preserves A Focus, other placement/audio, and blocks a second slot", () => {
    const view = setup(); action("Focus"); action("Detach", "Casey");
    expect(screen.getByTestId("central-stream-0")).toHaveClass("screen-share-focus-primary-card");
    expect(screen.getByRole("button", { name: "Detach Devon's stream" })).toBeDisabled();
    expect(screen.getByText(/Pop in the floating stream first/)).toBeVisible();
    expect(screen.getByTestId("detached-stream-1").querySelector("video")).toHaveClass("screen-stream-video-detached");
    expect(view.policy).toHaveBeenLastCalledWith("3", "CENTRAL");
    expect(view.policy).toHaveBeenCalledWith("1", "DETACHED");
    expect(view.policy.mock.calls.some(([, mode]) => mode === "HIDDEN")).toBe(false);
    expect(view.mute).not.toHaveBeenCalled(); expect(view.leave).not.toHaveBeenCalled();
  });
  it("Back to chat minimizes only CENTRAL, retaining detached/minimized/hidden state", () => {
    const view = setup(); action("Detach"); action("Minimize", "Casey"); action("Hide", "Devon");
    click("Back to chat");
    expect(screen.getByTestId("chat-content")).toBeVisible();
    expect(screen.getByTestId("detached-stream-0")).toBeVisible();
    expect(screen.getByTestId("stream-row-1")).toHaveTextContent("Minimized");
    expect(screen.getByTestId("stream-row-2")).toHaveTextContent("Hidden · audio off");
    expect(screen.getByTestId("stream-row-3")).toHaveTextContent("Minimized");
    expect(view.container.querySelectorAll("video")).toHaveLength(1);
    expect(view.policy).toHaveBeenCalledWith("3", "MINIMIZED");
    expect(view.policy.mock.calls.filter(([id, mode]) => id !== "2" && mode === "HIDDEN")).toEqual([]);
  });
  it("minimize removes video, keeps preferences, and its tray controls are actionable", () => {
    const view = setup([streams[0]]); action("Minimize");
    expect(view.container.querySelector("video")).toBeNull();
    expect(screen.getByTestId("stream-row-0")).toHaveTextContent("Minimized · audio on");
    click("Mute Alice's stream"); expect(view.mute).toHaveBeenCalledWith("0", true);
    click("More for Alice");
    const hide = screen.getByRole("button", { name: "Hide Alice's stream" });
    act(() => hide.focus()); fireEvent.keyDown(hide, { key: "Escape" });
    expect(screen.getByRole("button", { name: "More for Alice" })).toHaveFocus();
    click("Restore Alice's stream"); expect(screen.getByRole("slider")).toHaveValue("37");
    expect(videoTrack.stop).not.toHaveBeenCalled(); expect(videoTrack.clone).not.toHaveBeenCalled();
  });
  it("HIDDEN from MINIMIZED Show returns the row; Restore separately restores the old Focus", () => {
    const view = setup(); action("Focus"); action("Minimize"); click("More for Alice"); click("Hide Alice's stream");
    expect(screen.getByTestId("stream-row-0")).toHaveTextContent("Hidden · audio off");
    expect(within(screen.getByTestId("stream-row-0")).queryByRole("button", { name: /Mute|Detach|Focus|Restore/ })).toBeNull();
    click("Show Alice's stream"); expect(screen.getByTestId("stream-row-0")).toHaveTextContent("Minimized");
    click("Restore Alice's stream"); expect(screen.getByTestId("central-stream-0")).toHaveClass("screen-share-focus-primary-card");
    expect(view.leave).not.toHaveBeenCalled();
  });
  it("occupied detached restore falls back to Gallery without evicting the occupant", () => {
    setup(); action("Detach"); action("Minimize"); action("Detach", "Casey"); click("Restore Alice's stream");
    expect(screen.getByTestId("detached-stream-1")).toBeVisible();
    expect(screen.getByTestId("central-stream-0")).toHaveClass("screen-share-grid-card");
    expect(screen.getByRole("status")).toHaveTextContent("floating slot is occupied");
  });
  it("focused source removal chooses first surviving CENTRAL and terminal loss removes tray geometry", () => {
    const view = setup(); action("Hide"); action("Focus", "Devon");
    view.rerender(view.ui([streams[0], streams[1], streams[3]]));
    expect(screen.getByTestId("central-stream-1")).toHaveClass("screen-share-focus-primary-card");
    action("Detach", "Casey");
    view.rerender(view.ui([streams[0], streams[3]]));
    expect(screen.queryByTestId("detached-stream-1")).toBeNull();
    view.rerender(view.ui([])); expect(view.container.querySelector("video")).toBeNull(); expect(screen.getByTestId("chat-content")).toBeVisible();
  });
  it("Leave stays pending until authoritative removal and same-id rejoin starts CENTRAL", () => {
    const view = setup([streams[0]]); action("Minimize"); click("More for Alice"); click("Leave Alice's stream");
    expect(view.leave).toHaveBeenCalledWith("0"); expect(screen.getByTestId("stream-row-0")).toHaveTextContent("Leaving");
    expect(screen.queryByRole("button", { name: "Restore Alice's stream" })).toBeNull();
    view.rerender(view.ui([])); view.rerender(view.ui([streams[0]]));
    expect(screen.getByTestId("central-stream-0")).toBeVisible();
  });
  it("navigation/Settings/theme rerenders preserve geometry and all placements", () => {
    const view = setup(); action("Detach"); action("Minimize", "Casey"); action("Hide", "Devon");
    const floating = screen.getByTestId("detached-stream-0"), video = floating.querySelector("video"), rect = floating.getAttribute("style");
    for (const route of ["Home", "Settings", "Channel two"]) view.rerender(view.ui(streams, undefined, route, "likecord-retro-98"));
    expect(screen.getByTestId("detached-stream-0")).toBe(floating); expect(floating.querySelector("video")).toBe(video); expect(floating.getAttribute("style")).toBe(rect);
    expect(screen.getByTestId("stream-row-1")).toHaveTextContent("Minimized"); expect(screen.getByTestId("stream-row-2")).toHaveTextContent("Hidden");
    click("Pop in Alice's stream"); action("Detach"); expect(screen.getByTestId("detached-stream-0").getAttribute("style")).toBe(rect);
  });
  it("keyboard Move/Resize use 10/1 pixels, Enter commit, Escape revert, Home reset, without global shortcuts", () => {
    setup([streams[0]]); action("Detach");
    const card = screen.getByTestId("detached-stream-0"); const originalX = parseFloat(card.style.left), originalWidth = parseFloat(card.style.width);
    const move = screen.getByRole("button", { name: "Move floating stream" });
    click("Move floating stream"); fireEvent.keyDown(move, { key: "ArrowLeft" }); fireEvent.keyDown(move, { key: "ArrowLeft", shiftKey: true });
    expect(parseFloat(card.style.left)).toBe(originalX - 11); fireEvent.keyDown(move, { key: "Enter" });
    click("Move floating stream"); fireEvent.keyDown(move, { key: "ArrowLeft" }); fireEvent.keyDown(move, { key: "Escape" }); expect(parseFloat(card.style.left)).toBe(originalX - 11);
    const resize = screen.getByRole("button", { name: "Resize floating stream" }); click("Resize floating stream"); fireEvent.keyDown(resize, { key: "ArrowRight" }); fireEvent.keyDown(resize, { key: "Enter" }); expect(parseFloat(card.style.width)).toBe(originalWidth + 10);
    click("Move floating stream"); fireEvent.keyDown(move, { key: "Home" }); fireEvent.keyDown(move, { key: "Enter" }); expect(parseFloat(card.style.left)).toBe(originalX); expect(parseFloat(card.style.width)).toBe(originalWidth);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" }); expect(parseFloat(card.style.left)).toBe(originalX);
  });
  it("pointer capture moves/resizes only from handles, cancels safely, and clamps to changed/zero bounds", () => {
    class Pointer extends MouseEvent { pointerId: number; constructor(type: string, options: PointerEventInit) { super(type, options); this.pointerId = options.pointerId || 1; } }
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: Pointer });
    const capture = jest.fn(), release = jest.fn();
    Object.defineProperties(HTMLElement.prototype, { setPointerCapture: { configurable: true, value: capture }, releasePointerCapture: { configurable: true, value: release }, hasPointerCapture: { configurable: true, value: () => true } });
    const view = setup([streams[0]]); action("Detach");
    const card = screen.getByTestId("detached-stream-0"), handle = screen.getByRole("group", { name: "Drag Alice's floating stream" });
    const originalX = parseFloat(card.style.left);
    fireEvent.pointerDown(card.querySelector("video")!, { button: 0, pointerId: 1, clientX: 500, clientY: 350 }); expect(capture).not.toHaveBeenCalled();
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 500, clientY: 350 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 300 }); expect(parseFloat(card.style.left)).toBe(originalX - 100);
    fireEvent.pointerCancel(handle, { pointerId: 1 }); expect(parseFloat(card.style.left)).toBe(originalX); expect(release).toHaveBeenCalledWith(1);
    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 500, clientY: 350 }); fireEvent.pointerMove(handle, { pointerId: 2, clientX: 450, clientY: 330 }); fireEvent.pointerUp(handle, { pointerId: 2 });
    expect(parseFloat(card.style.left)).toBe(originalX - 50);
    const resize = screen.getByRole("separator", { name: "Resize Alice's floating frame" });
    fireEvent.pointerDown(resize, { button: 0, pointerId: 3, clientX: 700, clientY: 500 }); fireEvent.pointerMove(resize, { pointerId: 3, clientX: 800, clientY: 550 }); fireEvent.pointerUp(resize, { pointerId: 3 }); expect(parseFloat(card.style.width)).toBe(420);
    const video = card.querySelector("video"), cornerHeight = parseFloat(card.style.height);
    const right = screen.getByRole("separator", { name: "Resize Alice's floating frame width" });
    fireEvent.pointerDown(right, { button: 0, pointerId: 5, clientX: 800, clientY: 400 });
    fireEvent.pointerMove(right, { pointerId: 5, clientX: 750, clientY: 480 }); fireEvent.pointerUp(right, { pointerId: 5 });
    expect(card.style.width).toBe("370px"); expect(parseFloat(card.style.height)).toBe(cornerHeight);
    const bottom = screen.getByRole("separator", { name: "Resize Alice's floating frame height" });
    fireEvent.pointerDown(bottom, { button: 0, pointerId: 6, clientX: 600, clientY: 500 });
    fireEvent.pointerMove(bottom, { pointerId: 6, clientX: 680, clientY: 470 });
    expect(card.style.width).toBe("370px"); expect(parseFloat(card.style.height)).toBe(cornerHeight - 30);
    fireEvent.pointerCancel(bottom, { pointerId: 6 }); expect(parseFloat(card.style.height)).toBe(cornerHeight);
    expect(release).toHaveBeenCalledWith(6);
    fireEvent.pointerDown(bottom, { button: 0, pointerId: 7, clientX: 600, clientY: 500 });
    fireEvent.pointerMove(bottom, { pointerId: 7, clientX: 680, clientY: 470 }); fireEvent.pointerUp(bottom, { pointerId: 7 });
    expect(card.style.width).toBe("370px"); expect(parseFloat(card.style.height)).toBe(cornerHeight - 30);
    expect(card.querySelector("video")).toBe(video); expect(view.leave).not.toHaveBeenCalled();
    expect(view.mute).not.toHaveBeenCalled(); expect(view.volume).not.toHaveBeenCalled();
    const workspace = screen.getByTestId("viewer-presentation-workspace"), read = jest.fn();
    Object.defineProperty(workspace, "getBoundingClientRect", { configurable: true, value: read });
    read.mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 180, bottom: 120, width: 180, height: 120, toJSON() {} }); fireEvent.resize(window);
    expect(card.style.width).toBe("164px"); expect(card.style.height).toBe("104px"); expect(card.style.left).toBe("8px");
    read.mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} }); fireEvent.resize(window); expect(card.style.visibility).toBe("hidden");
    read.mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} }); fireEvent.resize(window);
    expect(card.style.visibility).toBe(""); expect(card.style.width).toBe("280px"); expect(screen.getByTestId("detached-stream-0")).toBe(card);
    fireEvent.pointerDown(handle, { button: 0, pointerId: 4 }); view.rerender(view.ui([])); expect(release).toHaveBeenCalledWith(4);
  });

  it("self collapse/promote/compact is local, restores remote Focus, and Stop stays available", () => {
    const stop = jest.fn(); const self = { shareId: "self", stream: source, viewerNames: ["Viewer"], onStop: stop };
    const view = setup(streams, self); action("Focus", "Casey");
    const preview = screen.getByTestId("presenter-live-card").querySelector("video")!;
    expect(preview).toMatchObject({ muted: true, volume: 0 }); expect((preview.srcObject as MediaStream).getVideoTracks()).toEqual([videoTrack]);
    click("Hide preview"); expect(screen.getByTestId("presenter-live-card").querySelector("video")).toBeNull();
    action("Focus"); expect(screen.getByTestId("presenter-live-card")).toHaveAttribute("data-self-mode", "COLLAPSED");
    click("Show preview"); click("Expand preview"); expect(screen.getByTestId("self-primary")).toContainElement(screen.getByTestId("presenter-live-card"));
    expect(view.container.querySelectorAll(".screen-share-focus-secondary-card")).toHaveLength(4);
    click("Compact preview"); expect(screen.getByTestId("central-stream-0")).toHaveClass("screen-share-focus-primary-card");
    click("Expand preview"); action("Focus", "Casey"); expect(screen.getByTestId("presenter-live-card")).toHaveAttribute("data-self-mode", "COMPACT");
    click("Stop Sharing"); expect(stop).toHaveBeenCalledTimes(1); expect(view.leave).not.toHaveBeenCalled();
    view.rerender(view.ui(streams, { ...self, stopping: true })); expect(screen.getByRole("button", { name: "Stopping screen share" })).toBeDisabled();
    expect(screen.getByLabelText("1 viewer watching")).toBeInTheDocument();
  });
});
