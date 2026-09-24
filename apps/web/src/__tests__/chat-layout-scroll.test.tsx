import "@testing-library/jest-dom";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "fs";
import { join } from "path";
import ChatArea from "../components/layout/ChatArea";
import ScreenShareViewerWorkspace from "../components/layout/ScreenShareViewerWorkspace";
import { TestMediaStream } from "../../test-support/screenMedia";

afterEach(cleanup);

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
  user: { id: "me" },
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

function message(id: string, channelId = "channel-1", authorId = "other") {
  return {
    id,
    channelId,
    authorId,
    content: `Message ${id}`,
    createdAt: "2026-08-25T12:00:00.000Z",
    author: { id: authorId, username: authorId, displayName: authorId },
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

function setScrollMetrics(element: HTMLDivElement, scrollHeight: number, scrollTop = 0, clientHeight = 200) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: clientHeight },
    scrollHeight: { configurable: true, value: scrollHeight },
    scrollTop: { configurable: true, writable: true, value: scrollTop },
  });
}

function loadInitialHistory(view: ReturnType<typeof renderChat>, messages: ReturnType<typeof message>[], scrollHeight = 1200) {
  const list = screen.getByTestId("message-list") as HTMLDivElement;
  setScrollMetrics(list, scrollHeight);
  view.update({ messages });
  return list;
}

describe("chat layout and scroll lifecycle", () => {
  it("keeps the empty-channel composer rendered and accessible", () => {
    renderChat();

    expect(screen.getByTestId("composer")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Message #general" })).toHaveAttribute("placeholder", "Conversar em #general");
  });

  it("constrains the application and makes a long message region scroll instead of expanding the root", () => {
    const view = renderChat();
    const manyMessages = Array.from({ length: 75 }, (_, index) => message(`message-${index}`));
    const list = loadInitialHistory(view, manyMessages, 6000);
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    expect(screen.getByTestId("composer")).toBeVisible();
    expect(css).toMatch(/\.app-layout\s*\{[^}]*height: 100dvh;[^}]*min-height: 0;[^}]*overflow: hidden;/s);
    expect(css).toMatch(/\.main-content\s*\{[^}]*min-height: 0;[^}]*overflow: hidden;/s);
    expect(css).toMatch(/\.message-list\s*\{[^}]*min-height: 0;[^}]*overflow-x: hidden;[^}]*overflow-y: auto;/s);
    expect(css).toMatch(/\.app-layout \*[^}]*\{[^}]*scrollbar-color: var\(--scrollbar-thumb\) transparent;[^}]*scrollbar-width: thin;/s);
    expect(css).toMatch(/\.app-layout \*::-webkit-scrollbar-button[^}]*\{[^}]*display: none;[^}]*width: 0;[^}]*height: 0;/s);
    expect(css).toMatch(/\.app-layout \*::-webkit-scrollbar-corner[^}]*\{[^}]*background: transparent;/s);
    expect(css).toMatch(/\.composer\s*\{[^}]*flex: 0 0 auto;/s);
  });

  it("opens existing channel history at the latest message", () => {
    const view = renderChat();
    const list = loadInitialHistory(view, [message("one"), message("two")], 1200);

    expect(list.scrollTop).toBe(1200);
  });

  it("auto-scrolls an incoming message when the reader is near the bottom", () => {
    const initialMessages = [message("one"), message("two")];
    const view = renderChat();
    const list = loadInitialHistory(view, initialMessages, 1200);
    setScrollMetrics(list, 1200, 920);
    fireEvent.scroll(list);

    setScrollMetrics(list, 1250, 920);
    view.update({ messages: [...initialMessages, message("three")] });

    expect(list.scrollTop).toBe(1250);
    expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();
  });

  it("keeps a scrolled-up reader in place, counts new messages, and returns to latest on request", () => {
    const initialMessages = [message("one"), message("two")];
    const view = renderChat();
    const list = loadInitialHistory(view, initialMessages, 1200);
    setScrollMetrics(list, 1200, 500);
    fireEvent.scroll(list);

    setScrollMetrics(list, 1250, 500);
    const firstIncoming = [...initialMessages, message("three")];
    view.update({ messages: firstIncoming });
    expect(list.scrollTop).toBe(500);
    expect(screen.getByRole("button", { name: "↓ 1 new message" })).toBeVisible();

    setScrollMetrics(list, 1300, 500);
    view.update({ messages: [...firstIncoming, message("four")] });
    expect(screen.getByRole("button", { name: "↓ 2 new messages" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "↓ 2 new messages" }));
    expect(list.scrollTop).toBe(1300);
    expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();
  });

  it("brings an author to their own optimistic message even when they were reading history", () => {
    const initialMessages = [message("one"), message("two")];
    const view = renderChat();
    const list = loadInitialHistory(view, initialMessages, 1200);
    setScrollMetrics(list, 1200, 400);
    fireEvent.scroll(list);

    setScrollMetrics(list, 1250, 400);
    view.update({ messages: [...initialMessages, message("mine", "channel-1", "pending")] });

    expect(list.scrollTop).toBe(1250);
  });

  it("preserves the reading anchor when loading older history", () => {
    const currentHistory = [message("three"), message("four")];
    const onScroll = jest.fn();
    const view = renderChat({ hasMore: true, onScroll });
    const list = loadInitialHistory(view, currentHistory, 1200);
    setScrollMetrics(list, 1200, 50);
    fireEvent.scroll(list);

    setScrollMetrics(list, 1400, 50);
    view.update({ messages: [message("one"), message("two"), ...currentHistory] });

    expect(onScroll).toHaveBeenCalled();
    expect(list.scrollTop).toBe(250);
  });

  it("resets the pending count and starts the newly selected channel at its latest message", () => {
    const firstChannelMessages = [message("one"), message("two")];
    const view = renderChat();
    const list = loadInitialHistory(view, firstChannelMessages, 1200);
    setScrollMetrics(list, 1200, 400);
    fireEvent.scroll(list);
    setScrollMetrics(list, 1250, 400);
    view.update({ messages: [...firstChannelMessages, message("three")] });
    expect(screen.getByRole("button", { name: "↓ 1 new message" })).toBeVisible();

    view.update({ activeChannelId: "channel-2", channelName: "random", messages: [] });
    expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();

    setScrollMetrics(list, 1400);
    view.update({ messages: [message("next", "channel-2")] });
    expect(list.scrollTop).toBe(1400);
  });

  it("keeps the composer available after returning from the Screen Share presentation workspace", () => {
    // jsdom lacks the browser MediaStream used by Screen's video-only projection.
    global.MediaStream = TestMediaStream as unknown as typeof MediaStream;
    const pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const props = { ...baseProps, messages: [message("one")] };
    const onPresentationChange = jest.fn();
    const view = render(
      <ScreenShareViewerWorkspace streams={[]} onLeaveStream={jest.fn()} onPresentationChange={onPresentationChange}>
        <ChatArea {...props} />
      </ScreenShareViewerWorkspace>,
    );

    view.rerender(
      <ScreenShareViewerWorkspace streams={[{ shareId: "share-1", presenterId: "other", presenterName: "Other", stream: null }]} onLeaveStream={jest.fn()} onPresentationChange={onPresentationChange}>
        <ChatArea {...props} />
      </ScreenShareViewerWorkspace>,
    );
    view.rerender(
      <ScreenShareViewerWorkspace streams={[]} onLeaveStream={jest.fn()} onPresentationChange={onPresentationChange}>
        <ChatArea {...props} />
      </ScreenShareViewerWorkspace>,
    );

    expect(screen.getByTestId("composer")).toBeVisible();
    pause.mockRestore();
  });

  it("preserves the default compact Composer without a visible Send control", () => {
    renderChat({ showSendButton: false });

    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(screen.getByTestId("composer").querySelector("button[type='submit']")).not.toBeInTheDocument();
  });

  it("shows a compact Send button only when enabled and uses the canonical form submit path", () => {
    const onSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    renderChat({ showSendButton: true, onSend });
    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Send" });

    expect(sendButton).toBeDisabled();
    fireEvent.change(input, { target: { value: "Hello from the button" } });
    expect(sendButton).toBeEnabled();
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("keeps Enter on the same submit path and Shift+Enter as a newline", async () => {
    const interaction = userEvent.setup();
    const onSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    const first = renderChat({ showSendButton: true, onSend });
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Send with Enter" } });
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    expect(onSend).toHaveBeenCalledTimes(1);

    first.unmount();
    const shiftSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    renderChat({ showSendButton: true, onSend: shiftSend });
    const multilineInput = screen.getByRole("textbox");
    await interaction.type(multilineInput, "Line one{Shift>}{Enter}{/Shift}Line two");
    expect(multilineInput).toHaveValue("Line one\nLine two");
    expect(shiftSend).not.toHaveBeenCalled();
  });

  it("shares permission, invalid, upload, and attachment eligibility between Enter and the button", () => {
    const deniedSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    const denied = renderChat({ showSendButton: true, canSendMessages: false, onSend: deniedSend });
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.submit(screen.getByTestId("composer").querySelector("form")!);
    expect(deniedSend).not.toHaveBeenCalled();

    denied.unmount();
    const attachmentSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    const file = new File(["content"], "note.txt", { type: "text/plain" });
    const attached = renderChat({ showSendButton: true, pendingFiles: [file], onSend: attachmentSend });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(attachmentSend).toHaveBeenCalledTimes(1);

    attached.update({ uploadingIds: ["attachment-1"] });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
