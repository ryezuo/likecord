import "@testing-library/jest-dom";
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ChatArea from "../components/layout/ChatArea";
import {
  clampMediaViewerPan,
  isMediaViewerEligible,
  mediaViewerFitScale,
  mediaViewerPanBounds,
} from "../components/media/MediaViewer";
import type { Attachment, Message } from "../hooks/useMessages";

const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
const originalPointerEvent = Object.getOwnPropertyDescriptor(window, "PointerEvent");
const originalRequestFullscreen = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "requestFullscreen");
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, "exitFullscreen");
const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");

interface ResizeObserverRecord {
  observer: TestResizeObserver;
  callback: ResizeObserverCallback;
  targets: Set<Element>;
}

const resizeObserverRecords: ResizeObserverRecord[] = [];

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

class TestResizeObserver {
  readonly record: ResizeObserverRecord;

  constructor(callback: ResizeObserverCallback) {
    this.record = { observer: this, callback, targets: new Set() };
    resizeObserverRecords.push(this.record);
  }

  observe(target: Element) { this.record.targets.add(target); }
  unobserve(target: Element) { this.record.targets.delete(target); }
  disconnect() { this.record.targets.clear(); }
}

function restoreProperty(target: object, name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else Reflect.deleteProperty(target, name);
}

function installResizeObserver() {
  resizeObserverRecords.length = 0;
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: TestResizeObserver });
}

function mediaStage() {
  return viewer().querySelector(".media-viewer-stage") as HTMLDivElement;
}

function resizeMediaViewport(width: number, height: number) {
  const stage = mediaStage();
  Object.defineProperty(stage, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({}) }),
  });
  act(() => {
    for (const record of resizeObserverRecords) {
      if (!record.targets.has(stage)) continue;
      record.callback(
        [{ target: stage, contentRect: { width, height } } as unknown as ResizeObserverEntry],
        record.observer as unknown as ResizeObserver,
      );
    }
  });
}

function loadViewerImage(naturalWidth: number, naturalHeight: number) {
  const image = within(viewer()).getByRole("img") as HTMLImageElement;
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: naturalWidth },
    naturalHeight: { configurable: true, value: naturalHeight },
  });
  fireEvent.load(image);
  return image;
}

function installPointerCapture(stage = mediaStage()) {
  const captured = new Set<number>();
  const setPointerCapture = jest.fn((pointerId: number) => captured.add(pointerId));
  const releasePointerCapture = jest.fn((pointerId: number) => captured.delete(pointerId));
  const hasPointerCapture = jest.fn((pointerId: number) => captured.has(pointerId));
  Object.defineProperties(stage, {
    setPointerCapture: { configurable: true, value: setPointerCapture },
    releasePointerCapture: { configurable: true, value: releasePointerCapture },
    hasPointerCapture: { configurable: true, value: hasPointerCapture },
  });
  return { setPointerCapture, releasePointerCapture, hasPointerCapture };
}

function installFullscreen(request: () => Promise<void> = () => Promise.resolve()) {
  let fullscreenElement: Element | null = null;
  const requestFullscreen = jest.fn(request);
  const exitFullscreen = jest.fn(() => Promise.resolve());
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: requestFullscreen });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exitFullscreen });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
  return {
    requestFullscreen,
    exitFullscreen,
    setElement(element: Element | null) {
      fullscreenElement = element;
      fireEvent(document, new Event("fullscreenchange"));
    },
  };
}

afterEach(() => {
  cleanup();
  resizeObserverRecords.length = 0;
  restoreProperty(globalThis, "ResizeObserver", originalResizeObserver);
  restoreProperty(window, "PointerEvent", originalPointerEvent);
  restoreProperty(HTMLElement.prototype, "requestFullscreen", originalRequestFullscreen);
  restoreProperty(document, "exitFullscreen", originalExitFullscreen);
  restoreProperty(document, "fullscreenElement", originalFullscreenElement);
});

type ChatProps = React.ComponentProps<typeof ChatArea>;

const baseProps: ChatProps = {
  channelName: "general",
  connected: true,
  socketId: "socket-1",
  activeChannelId: "channel-1",
  messages: [],
  msgsLoading: false,
  hasMore: false,
  editingMsgId: null,
  editContent: "",
  pendingFiles: [],
  uploadingIds: [],
  uploadError: null,
  debugLog: [],
  lastPayload: "",
  lastAttCount: 0,
  dbg: false,
  user: { id: "user-1", username: "alice", displayName: "Alice" },
  onScroll: jest.fn(),
  onEditStart: jest.fn(),
  onEditChange: jest.fn(),
  onEditSave: jest.fn(),
  onEditCancel: jest.fn(),
  onDelete: jest.fn(),
  onSend: jest.fn(),
  onPaste: jest.fn(),
  onFileSelect: jest.fn(),
  onRemoveFile: jest.fn(),
};

function attachment(id: string, mimeType: string, fileName = `${id}.png`): Attachment {
  return { id, mimeType, fileName, fileSize: 2048 };
}

function message(id: string, attachments: Attachment[], channelId = "channel-1"): Message {
  return {
    id,
    channelId,
    authorId: "user-2",
    content: `Message ${id}`,
    createdAt: "2026-09-08T12:00:00.000Z",
    author: { id: "user-2", username: "bob", displayName: "Bob" },
    attachments,
  };
}

function renderChat(overrides: Partial<ChatProps> = {}) {
  const props = { ...baseProps, ...overrides };
  const view = render(<ChatArea {...props} />);
  return {
    ...view,
    update(next: Partial<ChatProps>) {
      Object.assign(props, next);
      view.rerender(<ChatArea {...props} />);
    },
  };
}

function openButton(fileName: string) {
  return screen.getByRole("button", { name: `Open ${fileName} in media viewer` });
}

function viewer() {
  return screen.getByRole("dialog", { name: /Media viewer/ });
}

describe("MEDIA_VIEWER_01 geometry", () => {
  it("MV-ZOOM calculates bounded Fit values without invalid geometry", () => {
    expect(mediaViewerFitScale(1600, 800, 800, 600)).toBe(0.5);
    expect(mediaViewerFitScale(400, 300, 800, 600)).toBe(1);
    expect(mediaViewerFitScale(0, 300, 800, 600)).toBeNull();
    expect(mediaViewerFitScale(400, Number.POSITIVE_INFINITY, 800, 600)).toBeNull();
  });

  it("MV-PAN calculates independent overflow bounds and clamps unsafe values", () => {
    expect(mediaViewerPanBounds(1600, 400, 1, 800, 600)).toEqual({ maxPanX: 400, maxPanY: 0 });
    expect(mediaViewerPanBounds(1600, 1200, 1, 800, 600)).toEqual({ maxPanX: 400, maxPanY: 300 });
    expect(clampMediaViewerPan(900, -900, { maxPanX: 400, maxPanY: 300 })).toEqual({ panX: 400, panY: -300 });
    expect(clampMediaViewerPan(Number.NaN, Number.POSITIVE_INFINITY, { maxPanX: 400, maxPanY: 300 }))
      .toEqual({ panX: 0, panY: 0 });
  });
});

describe("MEDIA_VIEWER_01 MV.1", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])("MV-MIME opens the exact eligible MIME %s", async (mimeType) => {
    const media = attachment("eligible", mimeType, `eligible-${mimeType.split("/")[1]}`);
    renderChat({ messages: [message("message-1", [media])] });

    expect(isMediaViewerEligible(media)).toBe(true);
    await userEvent.click(openButton(media.fileName));
    expect(viewer()).toHaveAccessibleName(`Media viewer — ${media.fileName}`);
    expect(within(viewer()).getByRole("img", { name: media.fileName })).toHaveAttribute(
      "src",
      "/api/v1/attachments/eligible/download",
    );
  });

  it("MV-MIME preserves non-eligible image and file behavior with canonical download URLs", () => {
    const svg = attachment("vector", "image/svg+xml", "diagram.svg");
    const pdf = attachment("document", "application/pdf", "report.pdf");
    renderChat({ messages: [message("message-1", [svg, pdf])] });

    expect(isMediaViewerEligible(svg)).toBe(false);
    expect(screen.queryByRole("button", { name: /diagram\.svg/ })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "diagram.svg" })).toHaveAttribute(
      "src",
      "/api/v1/attachments/vector/download",
    );
    expect(screen.getByRole("link", { name: /report\.pdf/ })).toHaveAttribute(
      "href",
      "/api/v1/attachments/document/download",
    );
    expect(screen.getByRole("link", { name: /report\.pdf/ })).toHaveAttribute("download");
  });

  it("MV-OPEN/CAROUSEL opens the activated attachment and stays within its source Message", async () => {
    const firstMessage = message("message-1", [
      attachment("first", "image/png", "first.png"),
      attachment("file", "text/plain", "notes.txt"),
      attachment("second", "image/jpeg", "second.jpg"),
      attachment("third", "image/webp", "third.webp"),
    ]);
    const otherMessage = message("message-2", [attachment("other", "image/gif", "other.gif")]);
    renderChat({ messages: [firstMessage, otherMessage] });

    await userEvent.click(openButton("second.jpg"));
    expect(screen.getAllByRole("dialog", { name: /Media viewer/ })).toHaveLength(1);
    expect(within(viewer()).getByText("2 of 3")).toBeInTheDocument();
    expect(within(viewer()).getByRole("img", { name: "second.jpg" })).toBeInTheDocument();

    await userEvent.click(within(viewer()).getByRole("button", { name: "Next image" }));
    expect(within(viewer()).getByRole("img", { name: "third.webp" })).toBeInTheDocument();
    expect(within(viewer()).getByRole("button", { name: "Next image" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(viewer()).getByRole("img", { name: "third.webp" })).toBeInTheDocument();
    expect(within(viewer()).queryByRole("img", { name: "other.gif" })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(within(viewer()).getByRole("img", { name: "second.jpg" })).toBeInTheDocument();
  });

  it("MV-FOCUS supports native keyboard open, traps enabled controls, and returns to the exact trigger after navigation", async () => {
    const interaction = userEvent.setup();
    renderChat({ messages: [message("message-1", [
      attachment("first", "image/png", "first.png"),
      attachment("second", "image/png", "second.png"),
    ])] });
    const trigger = openButton("first.png");
    trigger.focus();
    await interaction.keyboard("{Enter}");

    const close = within(viewer()).getByRole("button", { name: "Close media viewer" });
    const previous = within(viewer()).getByRole("button", { name: "Previous image" });
    expect(close).toHaveFocus();
    expect(previous).toBeDisabled();

    await interaction.tab();
    expect(within(viewer()).getByRole("button", { name: "Next image" })).toHaveFocus();
    await interaction.tab();
    expect(within(viewer()).getByRole("link", { name: "Open Original" })).toHaveFocus();
    await interaction.tab();
    expect(within(viewer()).getByRole("link", { name: "Download" })).toHaveFocus();
    await interaction.tab();
    expect(close).toHaveFocus();
    await interaction.tab({ shift: true });
    expect(within(viewer()).getByRole("link", { name: "Download" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await userEvent.click(within(viewer()).getByRole("button", { name: "Close media viewer" }));
    expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("MV-CLOSE closes on Escape and MV-SINGLE exposes no carousel controls", async () => {
    const media = attachment("only", "image/gif", "animation.gif");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));

    expect(within(viewer()).queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(within(viewer()).queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(viewer()).getByRole("img", { name: "animation.gif" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument();
  });

  it("MV-ORIGINAL/DOWNLOAD use the authorized route and preserve filename intent", async () => {
    const media = attachment("photo-id", "image/png", "holiday photo.png");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));

    const original = within(viewer()).getByRole("link", { name: "Open Original" });
    const download = within(viewer()).getByRole("link", { name: "Download" });
    expect(original).toHaveAttribute("href", "/api/v1/attachments/photo-id/download");
    expect(original).toHaveAttribute("target", "_blank");
    expect(original).toHaveAttribute("rel", "noopener noreferrer");
    expect(download).toHaveAttribute("href", "/api/v1/attachments/photo-id/download");
    expect(download).toHaveAttribute("download", media.fileName);
  });

  it("MV-GIF/ERROR uses a native image, transitions load/error, retries only the selection, and keeps navigation usable", async () => {
    renderChat({ messages: [message("message-1", [
      attachment("gif", "image/gif", "motion.gif"),
      attachment("webp", "image/webp", "motion.webp"),
    ])] });
    await userEvent.click(openButton("motion.gif"));

    const dialog = viewer();
    const failedImage = within(dialog).getByRole("img", { name: "motion.gif" }) as HTMLImageElement;
    expect(failedImage.tagName).toBe("IMG");
    expect(failedImage).not.toHaveAttribute("controls");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Loading media…");
    fireEvent.error(failedImage);
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Media unavailable");
    expect(within(dialog).getByRole("button", { name: "Next image" })).toBeEnabled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Retry" }));
    const retriedImage = within(dialog).getByRole("img", { name: "motion.gif" });
    expect(retriedImage).not.toBe(failedImage);
    expect(retriedImage).toHaveAttribute("src", failedImage.getAttribute("src"));
    expect(within(dialog).getByRole("status")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Next image" }));
    const nextImage = within(dialog).getByRole("img", { name: "motion.webp" }) as HTMLImageElement;
    expect(nextImage.tagName).toBe("IMG");
    expect(within(dialog).getByRole("status")).toBeInTheDocument();
    fireEvent.load(failedImage);
    expect(within(dialog).getByRole("status")).toBeInTheDocument();

    Object.defineProperties(nextImage, {
      naturalWidth: { configurable: true, value: 640 },
      naturalHeight: { configurable: true, value: 480 },
    });
    fireEvent.load(nextImage);
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
    expect(within(dialog).getByText("640 × 480")).toBeInTheDocument();
  });

  it("MV-LIFECYCLE preserves selection on unrelated rerenders and reconciles current attachment removal by bounded index", async () => {
    const original = message("message-1", [
      attachment("first", "image/png", "first.png"),
      attachment("second", "image/png", "second.png"),
      attachment("third", "image/png", "third.png"),
    ]);
    const view = renderChat({ messages: [original] });
    await userEvent.click(openButton("second.png"));
    const selectedImage = within(viewer()).getByRole("img", { name: "second.png" });

    view.update({ messages: [original, message("unrelated", [])] });
    expect(within(viewer()).getByRole("img", { name: "second.png" })).toBe(selectedImage);

    view.update({ messages: [{ ...original, attachments: [original.attachments![0], original.attachments![2]] }] });
    expect(within(viewer()).getByRole("img", { name: "third.png" })).toBeInTheDocument();
    expect(within(viewer()).getByText("2 of 2")).toBeInTheDocument();
    expect(within(viewer()).getByRole("button", { name: "Next image" })).toBeDisabled();

    view.update({ messages: [{ ...original, attachments: [attachment("notes", "text/plain", "notes.txt")] }] });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument());
    expect(screen.getByTestId("message-list")).toHaveFocus();
  });

  it("MV-LIFECYCLE closes for source disappearance, uses same-Channel fallback without scrolling, and never focuses a new Channel", async () => {
    const origin = message("message-1", [attachment("origin", "image/png", "origin.png")]);
    const view = renderChat({ messages: [origin] });
    const list = screen.getByTestId("message-list") as HTMLDivElement;
    Object.defineProperty(list, "scrollTop", { configurable: true, writable: true, value: 320 });
    await userEvent.click(openButton("origin.png"));

    view.update({ messages: [] });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument());
    expect(list).toHaveFocus();
    expect(list.scrollTop).toBe(320);

    const channelTwoMedia = attachment("channel-two", "image/png", "channel-two.png");
    view.update({ messages: [origin] });
    await userEvent.click(openButton("origin.png"));
    view.update({ activeChannelId: "channel-2", channelName: "random", messages: [message("message-2", [channelTwoMedia], "channel-2")] });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument());
    expect(screen.getByTestId("message-list")).not.toHaveFocus();
    expect(openButton("channel-two.png")).not.toHaveFocus();
  });

  it("MV-LIFECYCLE keeps Chat DOM, scroll, draft, and callbacks stable while the viewer opens and closes", async () => {
    const onScroll = jest.fn();
    renderChat({ messages: [message("message-1", [attachment("photo", "image/png", "photo.png")])], onScroll });
    const list = screen.getByTestId("message-list") as HTMLDivElement;
    const composer = screen.getByRole("textbox", { name: "Message #general" });
    Object.defineProperty(list, "scrollTop", { configurable: true, writable: true, value: 240 });
    fireEvent.change(composer, { target: { value: "Draft survives" } });

    await userEvent.click(openButton("photo.png"));
    expect(screen.getByTestId("message-list")).toBe(list);
    expect(screen.getByRole("textbox", { name: "Message #general" })).toBe(composer);
    await userEvent.click(within(viewer()).getByRole("button", { name: "Close media viewer" }));

    expect(screen.getByTestId("message-list")).toBe(list);
    expect(list.scrollTop).toBe(240);
    expect(composer).toHaveValue("Draft survives");
    expect(onScroll).not.toHaveBeenCalled();
  });
});

describe("MEDIA_VIEWER_01 MV.2 transforms and hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installResizeObserver();
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: TestPointerEvent });
  });

  it("MV-ZOOM keeps transforms disabled until valid load geometry, then implements Fit/actual/manual bounds and shortcuts", async () => {
    const media = attachment("large", "image/png", "large.png");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));

    const dialog = viewer();
    expect(within(dialog).getByRole("button", { name: "Zoom in" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Fit" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "100%" })).toBeDisabled();
    expect(within(dialog).getByLabelText("Zoom level")).toHaveTextContent("—");

    resizeMediaViewport(800, 600);
    const image = loadViewerImage(1600, 800);
    expect(mediaStage()).toHaveAttribute("data-transform-mode", "fit");
    expect(mediaStage()).toHaveAttribute("data-scale", "0.5");
    expect(within(dialog).getByLabelText("Zoom level")).toHaveTextContent("50%");
    expect(image.style.width).toBe("1600px");
    expect(image.style.height).toBe("800px");
    expect(image.style.transform).toContain("scale(0.5)");

    fireEvent.click(within(dialog).getByRole("button", { name: "Zoom in" }));
    expect(mediaStage()).toHaveAttribute("data-transform-mode", "manual");
    expect(mediaStage()).toHaveAttribute("data-scale", "0.625");
    expect(within(dialog).getByLabelText("Zoom level")).toHaveTextContent("63%");
    fireEvent.keyDown(document, { key: "=" });
    expect(mediaStage()).toHaveAttribute("data-scale", "0.78125");

    fireEvent.keyDown(document, { key: "0" });
    expect(mediaStage()).toHaveAttribute("data-transform-mode", "actual");
    expect(mediaStage()).toHaveAttribute("data-scale", "1");
    expect(mediaStage()).toHaveAttribute("data-pan-x", "0");
    expect(mediaStage()).toHaveAttribute("data-pan-y", "0");
    fireEvent.keyDown(document, { key: "F", shiftKey: true });
    expect(mediaStage()).toHaveAttribute("data-transform-mode", "fit");
    expect(mediaStage()).toHaveAttribute("data-scale", "0.5");

    for (let index = 0; index < 20; index += 1) fireEvent.keyDown(document, { key: "+", repeat: true });
    expect(mediaStage()).toHaveAttribute("data-scale", "4");
    expect(within(dialog).getByLabelText("Zoom level")).toHaveTextContent("400%");
    expect(within(dialog).getByRole("button", { name: "Zoom in" })).toBeDisabled();
    for (let index = 0; index < 20; index += 1) fireEvent.keyDown(document, { key: "-", repeat: true });
    expect(mediaStage()).toHaveAttribute("data-scale", "0.5");
    expect(within(dialog).getByRole("button", { name: "Zoom out" })).toBeDisabled();

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    Object.defineProperty(editable, "isContentEditable", { configurable: true, value: true });
    editable.tabIndex = 0;
    dialog.append(editable);
    editable.focus();
    fireEvent.keyDown(editable, { key: "+" });
    expect(mediaStage()).toHaveAttribute("data-scale", "0.5");
    fireEvent.keyDown(document, { key: "+", ctrlKey: true });
    expect(mediaStage()).toHaveAttribute("data-scale", "0.5");
  });

  it("MV-ZOOM never enlarges a small image in Fit and preserves the real image element across transforms", async () => {
    const media = attachment("small", "image/jpeg", "small.jpg");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    resizeMediaViewport(800, 600);
    const image = loadViewerImage(400, 300);

    expect(mediaStage()).toHaveAttribute("data-scale", "1");
    expect(mediaStage()).not.toHaveClass("is-pannable");
    expect(within(viewer()).getByRole("button", { name: "Zoom out" })).toBeDisabled();
    fireEvent.click(within(viewer()).getByRole("button", { name: "Zoom in" }));
    expect(within(viewer()).getByRole("img", { name: media.fileName })).toBe(image);
    expect(mediaStage()).toHaveAttribute("data-scale", "1.25");
    fireEvent.click(within(viewer()).getByRole("button", { name: "Fit" }));
    expect(within(viewer()).getByRole("img", { name: media.fileName })).toBe(image);
    expect(mediaStage()).toHaveAttribute("data-scale", "1");
  });

  it("MV-PAN captures one primary pointer, clamps both axes, cancels coherently, and reclamps on resize", async () => {
    const media = attachment("pan", "image/png", "pan.png");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    resizeMediaViewport(800, 600);
    loadViewerImage(1600, 800);
    fireEvent.click(within(viewer()).getByRole("button", { name: "100%" }));

    const stage = mediaStage();
    const capture = installPointerCapture(stage);
    expect(stage).toHaveClass("is-pannable");
    fireEvent.pointerDown(stage, { button: 1, pointerId: 3, clientX: 100, clientY: 100 });
    expect(capture.setPointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerDown(stage, { button: 0, pointerId: 7, clientX: 100, clientY: 100 });
    expect(capture.setPointerCapture).toHaveBeenCalledWith(7);
    expect(stage).toHaveClass("is-dragging");
    fireEvent.pointerMove(stage, { pointerId: 8, clientX: 1000, clientY: 1000 });
    expect(stage).toHaveAttribute("data-pan-x", "0");
    fireEvent.pointerMove(stage, { pointerId: 7, clientX: 1000, clientY: 1000 });
    expect(stage).toHaveAttribute("data-pan-x", "400");
    expect(stage).toHaveAttribute("data-pan-y", "100");

    resizeMediaViewport(1200, 900);
    expect(stage).toHaveAttribute("data-transform-mode", "actual");
    expect(stage).toHaveAttribute("data-scale", "1");
    expect(stage).toHaveAttribute("data-pan-x", "200");
    expect(stage).toHaveAttribute("data-pan-y", "0");
    fireEvent.pointerCancel(stage, { pointerId: 7 });
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(stage).not.toHaveClass("is-dragging");

    fireEvent.click(within(viewer()).getByRole("button", { name: "Fit" }));
    expect(stage).toHaveAttribute("data-scale", "0.75");
    expect(stage).toHaveAttribute("data-pan-x", "0");
    expect(stage).toHaveAttribute("data-pan-y", "0");
    expect(stage).not.toHaveClass("is-pannable");

    fireEvent.click(within(viewer()).getByRole("button", { name: "Zoom in" }));
    expect(stage).toHaveAttribute("data-scale", "0.9375");
    resizeMediaViewport(1600, 900);
    expect(stage).toHaveAttribute("data-transform-mode", "manual");
    expect(stage).toHaveAttribute("data-scale", "1");
    expect(within(viewer()).getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });

  it("MV-PAN keeps a non-overflow axis centered and clears lost capture and image-change drag state", async () => {
    const first = attachment("wide", "image/png", "wide.png");
    const second = attachment("next", "image/png", "next.png");
    renderChat({ messages: [message("message-1", [first, second])] });
    await userEvent.click(openButton(first.fileName));
    resizeMediaViewport(800, 600);
    loadViewerImage(1600, 400);
    fireEvent.click(within(viewer()).getByRole("button", { name: "100%" }));
    const stage = mediaStage();
    installPointerCapture(stage);
    fireEvent.pointerDown(stage, { button: 0, pointerId: 4, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(stage, { pointerId: 4, clientX: -1000, clientY: 1000 });
    expect(stage).toHaveAttribute("data-pan-x", "-400");
    expect(stage).toHaveAttribute("data-pan-y", "0");
    fireEvent.lostPointerCapture(stage, { pointerId: 4 });
    expect(stage).not.toHaveClass("is-dragging");

    fireEvent.pointerDown(stage, { button: 0, pointerId: 5, clientX: 10, clientY: 10 });
    fireEvent.click(within(viewer()).getByRole("button", { name: "Next image" }));
    expect(mediaStage()).not.toHaveClass("is-dragging");
    expect(mediaStage()).toHaveAttribute("data-transform-mode", "fit");
    expect(mediaStage()).not.toHaveAttribute("data-scale");
    expect(within(viewer()).getByRole("button", { name: "Zoom in" })).toBeDisabled();
    loadViewerImage(400, 300);
    expect(mediaStage()).toHaveAttribute("data-scale", "1");
    expect(mediaStage()).toHaveAttribute("data-pan-x", "0");
  });

  it("MV-ERROR keeps invalid geometry and Retry safe and ignores callbacks from an earlier retry", async () => {
    const media = attachment("retry", "image/webp", "retry.webp");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    resizeMediaViewport(800, 600);
    const firstImage = within(viewer()).getByRole("img", { name: media.fileName }) as HTMLImageElement;
    Object.defineProperties(firstImage, {
      naturalWidth: { configurable: true, value: 0 },
      naturalHeight: { configurable: true, value: 0 },
    });
    fireEvent.load(firstImage);
    expect(within(viewer()).getByRole("alert")).toHaveTextContent("Media unavailable");
    expect(within(viewer()).getByRole("button", { name: "Zoom in" })).toBeDisabled();

    fireEvent.click(within(viewer()).getByRole("button", { name: "Retry" }));
    const secondImage = within(viewer()).getByRole("img", { name: media.fileName }) as HTMLImageElement;
    fireEvent.error(secondImage);
    fireEvent.click(within(viewer()).getByRole("button", { name: "Retry" }));
    const thirdImage = within(viewer()).getByRole("img", { name: media.fileName }) as HTMLImageElement;
    Object.defineProperties(firstImage, {
      naturalWidth: { configurable: true, value: 1600 },
      naturalHeight: { configurable: true, value: 800 },
    });
    fireEvent.load(firstImage);
    expect(within(viewer()).getByRole("status", { name: "" })).toHaveTextContent("Loading media…");
    Object.defineProperties(thirdImage, {
      naturalWidth: { configurable: true, value: 800 },
      naturalHeight: { configurable: true, value: 600 },
    });
    fireEvent.load(thirdImage);
    expect(mediaStage()).toHaveAttribute("data-scale", "1");
  });

  it("MV-FOCUS includes newly enabled transform controls and recovers when the focused control becomes unavailable", async () => {
    const media = attachment("focus", "image/png", "focus.png");
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    resizeMediaViewport(800, 600);
    const image = loadViewerImage(1600, 800);
    const dialog = viewer();
    const close = within(dialog).getByRole("button", { name: "Close media viewer" });
    const zoomIn = within(dialog).getByRole("button", { name: "Zoom in" });

    close.focus();
    await userEvent.tab();
    expect(zoomIn).toHaveFocus();
    zoomIn.focus();
    fireEvent.error(image);
    expect(close).toHaveFocus();
    expect(within(dialog).getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  it("MV-FULLSCREEN omits unsupported UI and uses fullscreenchange, not Promise resolution, as state authority", async () => {
    const media = attachment("fullscreen", "image/png", "fullscreen.png");
    const unsupported = renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    expect(within(viewer()).queryByRole("button", { name: "Enter fullscreen" })).not.toBeInTheDocument();
    unsupported.unmount();

    const fullscreen = installFullscreen();
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    const dialog = viewer();
    const enter = within(dialog).getByRole("button", { name: "Enter fullscreen" });
    expect(enter).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(enter);
    expect(fullscreen.requestFullscreen).toHaveBeenCalledTimes(1);
    await act(async () => { await Promise.resolve(); });
    expect(within(dialog).getByRole("button", { name: "Enter fullscreen" })).toHaveAttribute("aria-pressed", "false");

    fullscreen.setElement(dialog);
    expect(within(dialog).getByRole("button", { name: "Exit fullscreen" })).toHaveAttribute("aria-pressed", "true");
    fullscreen.setElement(null);
    expect(within(dialog).getByRole("button", { name: "Enter fullscreen" })).toHaveAttribute("aria-pressed", "false");
    expect(viewer()).toBeInTheDocument();
  });

  it("MV-FULLSCREEN announces rejection and handles Escape as exit-then-close without cascading", async () => {
    const fullscreen = installFullscreen(() => Promise.reject(new Error("denied")));
    const media = attachment("fullscreen", "image/png", "fullscreen.png");
    renderChat({ messages: [message("message-1", [media])] });
    const trigger = openButton(media.fileName);
    await userEvent.click(trigger);
    fireEvent.click(within(viewer()).getByRole("button", { name: "Enter fullscreen" }));
    expect((await within(viewer()).findByText("Unable to enter fullscreen")).closest('[role="status"]')).not.toBeNull();
    expect(viewer()).toBeInTheDocument();

    const dialog = viewer();
    fullscreen.setElement(dialog);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(fullscreen.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(viewer()).toBeInTheDocument();
    fullscreen.setElement(null);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("MV-FULLSCREEN exits late ownership after close during a pending request and never exits another owner's fullscreen", async () => {
    let resolveRequest: (() => void) | undefined;
    const fullscreen = installFullscreen(() => new Promise<void>((resolve) => { resolveRequest = resolve; }));
    const media = attachment("fullscreen", "image/png", "fullscreen.png");
    const first = renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    const detachedDialog = viewer();
    fireEvent.click(within(detachedDialog).getByRole("button", { name: "Enter fullscreen" }));
    fireEvent.click(within(detachedDialog).getByRole("button", { name: "Close media viewer" }));
    expect(screen.queryByRole("dialog", { name: /Media viewer/ })).not.toBeInTheDocument();
    fullscreen.setElement(detachedDialog);
    await act(async () => {
      resolveRequest?.();
      await Promise.resolve();
    });
    expect(fullscreen.exitFullscreen).toHaveBeenCalledTimes(1);
    first.unmount();

    const otherOwner = document.createElement("div");
    fullscreen.setElement(otherOwner);
    renderChat({ messages: [message("message-1", [media])] });
    await userEvent.click(openButton(media.fileName));
    fireEvent.click(within(viewer()).getByRole("button", { name: "Close media viewer" }));
    expect(fullscreen.exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("MV-THEME keeps controls reachable with scoped motion, forced-colors, pannable, and fullscreen styles", () => {
    const globals = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const retro = readFileSync(join(process.cwd(), "src", "styles", "themes", "retro-98.css"), "utf8");
    const component = readFileSync(join(process.cwd(), "src", "components", "media", "MediaViewer.tsx"), "utf8");

    expect(globals).toMatch(/\.media-viewer-dialog:fullscreen\s*\{[^}]*width: 100%;[^}]*height: 100%;/s);
    expect(globals).toMatch(/\.media-viewer-stage\.is-pannable\s*\{[^}]*cursor: grab;[^}]*touch-action: none;/s);
    expect(globals).toMatch(/\.media-viewer-footer\s*\{[^}]*flex-wrap: wrap;/s);
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globals).toMatch(/@media \(forced-colors: active\)[\s\S]*\.media-viewer-transform-controls \.btn:disabled/);
    expect(retro).toContain('[data-theme="likecord-retro-98"] .media-viewer-zoom-level');
    expect(retro).toMatch(/@media \(forced-colors: active\)[\s\S]*\.media-viewer-dialog/);
    expect(component).not.toContain("likecord-retro-98");
  });
});
