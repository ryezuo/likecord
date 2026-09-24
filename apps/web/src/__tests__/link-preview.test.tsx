import "@testing-library/jest-dom";
import React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { linkPreviewContentFingerprint, type LinkPreview } from "@likecord/shared/link-preview";
import ChatArea from "../components/layout/ChatArea";
import { useMessages, type Message } from "../hooks/useMessages";
import { messageApi } from "../lib/api";

jest.mock("../lib/api", () => ({
  messageApi: { list: jest.fn(), send: jest.fn(), update: jest.fn(), delete: jest.fn() },
  attachmentApi: { downloadUrl: (id: string) => "/api/v1/attachments/" + id + "/download" },
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const preview: LinkPreview = {
  sourceUrl: "https://example.com/page#section",
  displayHost: "example.com",
  siteName: "Example",
  title: "A useful example page",
  description: "A compact description that remains subordinate to the authored message.",
};

const baseMessage: Message = {
  id: "message-1",
  channelId: "channel-1",
  authorId: "other",
  content: "Read https://example.com/page#section and https://other.net/path.",
  createdAt: "2026-09-08T12:00:00.000Z",
  author: { id: "other", username: "other", displayName: "Other" },
};

const baseProps: React.ComponentProps<typeof ChatArea> = {
  channelName: "general",
  connected: true,
  socketId: "socket-1",
  activeChannelId: "channel-1",
  messages: [baseMessage],
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

describe("LP.2 Message links and preview presentation", () => {
  it("linkifies every eligible explicit HTTP(S) range while preserving authored punctuation and plain syntax", () => {
    const content = "One https://example.com/a, two HTTP://OTHER.NET/b! www.example.com ftp://example.com [label](https://third.org/c).";
    render(<ChatArea {...baseProps} messages={[{ ...baseMessage, content }]} />);

    const anchors = screen.getAllByRole("link");
    expect(anchors).toHaveLength(3);
    expect(anchors.map((anchor) => anchor.textContent)).toEqual([
      "https://example.com/a", "HTTP://OTHER.NET/b", "https://third.org/c",
    ]);
    for (const anchor of anchors) {
      expect(anchor).toHaveAttribute("target", "_blank");
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
      expect(anchor).toHaveAttribute("referrerpolicy", "no-referrer");
    }
    expect(screen.getByText((_value, node) => node?.classList.contains("message-content") === true))
      .toHaveTextContent(content);
    expect(screen.queryByRole("link", { name: /www\.example/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ftp:/i })).not.toBeInTheDocument();
    expect(screen.getByText(/\[label\]\(/)).toBeInTheDocument();
  });

  it("renders exactly one compact text-only preview for the first candidate with original-link semantics", () => {
    const { container } = render(<ChatArea {...baseProps} messages={[{ ...baseMessage, linkPreview: preview }]} />);
    const card = screen.getByRole("link", { name: "Open link preview: A useful example page (example.com)" });
    expect(card).toHaveAttribute("href", preview.sourceUrl);
    expect(card).toHaveAttribute("target", "_blank");
    expect(card).toHaveAttribute("rel", "noopener noreferrer");
    expect(card).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(card).toHaveTextContent("Example");
    expect(card).toHaveTextContent(preview.title);
    expect(card).toHaveTextContent(preview.description!);
    expect(container.querySelectorAll(".link-preview")).toHaveLength(1);
    expect(card.querySelector("img,source,iframe,video,audio,style,link[rel='preload']")).toBeNull();
    expect(card.getAttribute("style") ?? "").not.toMatch(/url\(/i);
  });

  it("rejects a projected preview that does not match the current first candidate", () => {
    render(<ChatArea {...baseProps} messages={[{
      ...baseMessage,
      linkPreview: { ...preview, sourceUrl: "https://other.net/path" },
    }]} />);
    expect(document.querySelector(".link-preview")).toBeNull();
  });

  it("keeps Attachment rendering independent beside the text-only preview", () => {
    const { container } = render(<ChatArea {...baseProps} messages={[{
      ...baseMessage,
      linkPreview: preview,
      attachments: [{ id: "attachment-1", fileName: "notes.txt", fileSize: 2048, mimeType: "text/plain" }],
    }]} />);
    expect(container.querySelector(".link-preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /notes\.txt/i })).toHaveAttribute("href", "/api/v1/attachments/attachment-1/download");
    expect(container.querySelector(".link-preview img, .link-preview source, .link-preview iframe")).toBeNull();
  });

  it("keeps edit content plain and restores link rendering only outside edit mode", () => {
    const { rerender } = render(<ChatArea {...baseProps} messages={[{ ...baseMessage, linkPreview: preview }]} editingMsgId="message-1" editContent={baseMessage.content!} />);
    expect(screen.getByDisplayValue(baseMessage.content!)).toBeInTheDocument();
    expect(document.querySelector(".message-link")).toBeNull();
    expect(document.querySelector(".link-preview")).toBeNull();

    rerender(<ChatArea {...baseProps} messages={[{ ...baseMessage, linkPreview: preview }]} />);
    expect(document.querySelectorAll(".message-link")).toHaveLength(2);
    expect(document.querySelector(".link-preview")).toBeInTheDocument();
  });

  it("uses one component tree with tokenized Default/Retro, focus, wrapping, forced-color, and reduced-motion hooks", () => {
    const globalCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const retroCss = readFileSync(join(process.cwd(), "src", "styles", "themes", "retro-98.css"), "utf8");
    expect(globalCss).toMatch(/\.link-preview\s*\{[^}]*max-width: 32rem;[^}]*overflow-wrap: anywhere;/s);
    expect(globalCss).toMatch(/\.link-preview\s*\{[^}]*border: 1px solid var\(--border-subtle\)/s);
    expect(globalCss).toMatch(/@media \(forced-colors: active\)[\s\S]*\.link-preview/s);
    expect(globalCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(retroCss).toMatch(/\[data-theme="likecord-retro-98"\] \.link-preview/);
    expect(retroCss).not.toMatch(/DefaultLinkPreview|RetroLinkPreview/);
  });
});

describe("LP.2 realtime Message convergence", () => {
  beforeEach(() => {
    (messageApi.list as jest.Mock).mockResolvedValue([baseMessage]);
  });

  async function readyHook() {
    const hook = renderHook(() => useMessages("channel-1"));
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(1));
    return hook;
  }

  it("applies a matching preview in place without creating, reordering, or refetching Messages", async () => {
    const hook = await readyHook();
    const original = hook.result.current.messages[0];
    act(() => hook.result.current.handleWsEvent("message:preview-updated", {
      messageId: baseMessage.id,
      channelId: baseMessage.channelId,
      contentFingerprint: linkPreviewContentFingerprint(baseMessage.content!),
      linkPreview: preview,
    }));
    expect(hook.result.current.messages).toHaveLength(1);
    expect(hook.result.current.messages[0]).toMatchObject({ id: original.id, linkPreview: preview });
    expect(messageApi.list).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["wrong fingerprint", { contentFingerprint: "lp1:wrong" }],
    ["wrong channel", { channelId: "channel-2" }],
    ["wrong candidate", { linkPreview: { ...preview, sourceUrl: "https://other.net/path" } }],
    ["unknown Message", { messageId: "missing" }],
  ])("ignores %s preview events", async (_label, override) => {
    const hook = await readyHook();
    act(() => hook.result.current.handleWsEvent("message:preview-updated", {
      messageId: baseMessage.id,
      channelId: baseMessage.channelId,
      contentFingerprint: linkPreviewContentFingerprint(baseMessage.content!),
      linkPreview: preview,
      ...override,
    }));
    expect(hook.result.current.messages[0].linkPreview).toBeUndefined();
    expect(hook.result.current.messages).toHaveLength(1);
  });

  it("clears stale preview immediately on authoritative content change and removes it with Message delete", async () => {
    (messageApi.list as jest.Mock).mockResolvedValue([{ ...baseMessage, linkPreview: preview }]);
    const hook = await readyHook();
    act(() => hook.result.current.handleWsEvent("message:updated", {
      message: { ...baseMessage, content: "Now https://other.net/new", editedAt: "2026-09-08T12:01:00.000Z" },
    }));
    expect(hook.result.current.messages[0].linkPreview).toBeUndefined();
    expect(hook.result.current.messages[0].content).toBe("Now https://other.net/new");

    act(() => hook.result.current.handleWsEvent("message:deleted", { messageId: baseMessage.id, channelId: "channel-1" }));
    expect(hook.result.current.messages).toEqual([]);
  });

  it("does not move a scrolled-up reader when preview metadata changes row height", () => {
    const props = { ...baseProps, messages: [baseMessage] };
    const view = render(<ChatArea {...props} />);
    const list = screen.getByTestId("message-list") as HTMLDivElement;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTop: { configurable: true, writable: true, value: 400 },
    });
    fireEvent.scroll(list);
    view.rerender(<ChatArea {...props} messages={[{ ...baseMessage, linkPreview: preview }]} />);
    expect(list.scrollTop).toBe(400);
    expect(screen.queryByRole("button", { name: /new message/i })).not.toBeInTheDocument();
  });

  it("keeps a near-bottom reader at latest after preview row growth", () => {
    const props = { ...baseProps, messages: [baseMessage] };
    const view = render(<ChatArea {...props} />);
    const list = screen.getByTestId("message-list") as HTMLDivElement;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTop: { configurable: true, writable: true, value: 1000 },
    });
    fireEvent.scroll(list);
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 1320 });
    view.rerender(<ChatArea {...props} messages={[{ ...baseMessage, linkPreview: preview }]} />);
    expect(list.scrollTop).toBe(1320);
  });
});
