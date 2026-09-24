import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatArea from "../components/layout/ChatArea";
import { useMessages, type Message } from "../hooks/useMessages";
import { messageApi } from "../lib/api";
import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../lib/api", () => ({
  messageApi: {
    list: jest.fn(),
    send: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  attachmentApi: {
    downloadUrl: (attachmentId: string) => `/api/v1/attachments/${attachmentId}/download`,
  },
}));

const ownMessage: Message = {
  id: "message-own",
  channelId: "channel-1",
  authorId: "user-1",
  content: "A message with enough context",
  createdAt: "2026-08-30T12:00:00.000Z",
  author: { id: "user-1", username: "alice", displayName: "Alice" },
};

const otherMessage: Message = {
  id: "message-other",
  channelId: "channel-1",
  authorId: "user-2",
  content: "Moderated content",
  createdAt: "2026-08-30T12:01:00.000Z",
  author: { id: "user-2", username: "bob", displayName: "Bob" },
};

const baseProps = {
  channelName: "general",
  connected: true,
  socketId: "socket-1",
  activeChannelId: "channel-1",
  messages: [ownMessage],
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
  onDelete: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  onSend: jest.fn(),
  onPaste: jest.fn(),
  onFileSelect: jest.fn(),
  onRemoveFile: jest.fn(),
};

function renderChat(overrides: Partial<React.ComponentProps<typeof ChatArea>> = {}) {
  return render(<ChatArea {...baseProps} {...overrides} />);
}

describe("Message delete confirmation UX", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["{ContextMenu}", "{Shift>}{F10}{/Shift}"])("F7.3 opens the correct message with %s, preserves actions and restores focus", async (shortcut) => {
    const interaction = userEvent.setup();
    renderChat({ messages: [otherMessage, ownMessage] });
    const row = screen.getByText(ownMessage.content!).closest(".message") as HTMLElement;
    expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await interaction.keyboard(shortcut);
    expect(screen.getByRole("menuitem", { name: "Copy Message" })).toHaveFocus();
    await interaction.keyboard("{End}{ArrowUp}{Enter}");
    expect(baseProps.onEditStart).toHaveBeenCalledTimes(1);
    expect(baseProps.onEditStart).toHaveBeenCalledWith(ownMessage.id, ownMessage.content);
    expect(row).toHaveFocus();
    await interaction.keyboard(shortcut + "{Escape}");
    expect(row).toHaveFocus();
  });

  it("opens without deleting and previews the author and text", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderChat({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete Message" })).toBeInTheDocument();
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("A message with enough context").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tip: hold Shift while clicking Delete to skip this confirmation.")).toBeInTheDocument();
  });

  it("resolves the current user for a newly-created own Message without a hydrated author", async () => {
    renderChat({ messages: [{ ...ownMessage, author: undefined }] });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("dialog", { name: "Delete Message" })).toHaveTextContent("Alice");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Unknown author");
  });

  it("keeps the hydrated author for a foreign Message", async () => {
    renderChat({ messages: [otherMessage], canManageMessages: true });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("dialog", { name: "Delete Message" })).toHaveTextContent("Bob");
  });

  it("shows useful attachment context for an attachment-only Message", async () => {
    renderChat({
      messages: [{
        ...ownMessage,
        content: undefined,
        attachments: [
          { id: "a1", fileName: "report.pdf", fileSize: 100, mimeType: "application/pdf" },
          { id: "a2", fileName: "photo.png", fileSize: 200, mimeType: "image/png" },
        ],
      }],
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("2 attachments")).toBeInTheDocument();
    expect(screen.getAllByText("report.pdf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("photo.png").length).toBeGreaterThanOrEqual(1);
  });

  it("preserves the existing download path and exposes filename wrapping hooks", () => {
    const longName = `${"unbroken".repeat(30)}.pdf`;
    renderChat({
      messages: [{
        ...ownMessage,
        attachments: [{ id: "a-download", fileName: longName, fileSize: 2048, mimeType: "application/pdf" }],
      }],
    });

    const download = screen.getByText(longName).closest("a");
    expect(download).not.toBeNull();
    expect(download).toHaveAttribute("href", "/api/v1/attachments/a-download/download");
    expect(download).toHaveAttribute("download");
    expect(within(download!).getByText(longName)).toHaveClass("att-file-name");
    expect(within(download!).getByText("2 KB")).toHaveClass("att-file-meta");
  });

  it("keeps pending-file removal and attachment-error dismissal accessible", async () => {
    const pendingFile = new File(["pending"], "very-long-pending-file-name.pdf", { type: "application/pdf" });
    const onRemoveFile = jest.fn();
    const onFileSelect = jest.fn();
    renderChat({ pendingFiles: [pendingFile], uploadError: "Upload failed", onRemoveFile, onFileSelect });

    await userEvent.click(screen.getByRole("button", { name: `Remove ${pendingFile.name}` }));
    expect(onRemoveFile).toHaveBeenCalledWith(0);
    expect(document.querySelector(".pending-file-name")).toHaveTextContent(pendingFile.name);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss attachment error" }));
    expect(onFileSelect).toHaveBeenCalledWith(null);
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
  });

  it("retains inline-edit keyboard behavior and explicit action hierarchy", () => {
    const onEditSave = jest.fn();
    const onEditCancel = jest.fn();
    renderChat({ editingMsgId: ownMessage.id, editContent: "Edited message", onEditSave, onEditCancel });

    const input = screen.getByDisplayValue("Edited message");
    expect(input.closest(".edit-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("btn-primary");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("btn-secondary");
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onEditSave).toHaveBeenCalledWith(ownMessage.id);
    expect(onEditCancel).toHaveBeenCalledTimes(1);
  });

  it("gives long attachment filenames a dedicated wrapping container", async () => {
    const longName = `${"unbroken".repeat(30)}.pdf`;
    renderChat({
      messages: [{
        ...ownMessage,
        attachments: [{ id: "a-long", fileName: longName, fileSize: 100, mimeType: "application/pdf" }],
      }],
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    const filename = screen.getAllByText(longName).find((element) => element.tagName === "LI");
    expect(filename).toHaveClass("message-delete-attachment-name");
    expect(filename?.closest(".message-delete-preview")).toBeInTheDocument();
  });

  it("F7.3 W2 contains long preview content separately from the warning and destructive actions", async () => {
    const longText = "Long message text.\n".repeat(80);
    const longName = "long-filename".repeat(40) + ".pdf";
    renderChat({ messages: [{ ...ownMessage, content: longText, attachments: Array.from({ length: 5 }, (_, index) => ({
      id: `attachment-${index}`, fileName: `${index}-${longName}`, fileSize: 100, mimeType: "application/pdf",
    })) }] });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    const content = within(dialog).getByRole("region", { name: "Message preview" });
    expect(content).toHaveClass("message-delete-content");
    expect(content).toHaveAttribute("tabindex", "0");
    expect(content).toHaveTextContent("5 attachments");
    expect(content.querySelector("p")?.textContent).toBe(longText);
    expect(within(content).getAllByRole("listitem")).toHaveLength(5);
    expect(content).not.toContainElement(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(content).not.toContainElement(within(dialog).getByRole("button", { name: "Delete Message" }));
    expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.modal\.message-delete-modal\s*\{[^}]*max-height: calc\(100dvh - 2rem\);[^}]*overflow: hidden;/);
    expect(css).toMatch(/\.message-delete-content\s*\{[^}]*min-height: 0;[^}]*overflow-x: hidden;[^}]*overflow-y: auto;/);
    // Structural assertions only: real geometry is checked in the local browser and later staging.
  });

  it("F7.3 W2 starts on Cancel, contains keyboard focus and returns to the invoking action", async () => {
    const interaction = userEvent.setup();
    renderChat();
    const origin = screen.getByRole("button", { name: "Delete" });
    await interaction.click(origin);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await interaction.tab();
    expect(screen.getByRole("button", { name: "Close delete confirmation" })).toHaveFocus();
    await interaction.tab();
    expect(screen.getByRole("region", { name: "Message preview" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(origin).toHaveFocus();
    expect(baseProps.onDelete).not.toHaveBeenCalled();
  });

  it("F7.3 W2 returns focus to the message list when the invoking message disappears", async () => {
    const view = renderChat();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    view.rerender(<ChatArea {...baseProps} messages={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("message-list")).toHaveFocus();
    expect(baseProps.onDelete).not.toHaveBeenCalled();
  });

  it("Shift+Delete skips the modal and invokes the shared delete operation once", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderChat({ onDelete });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }), { shiftKey: true });

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(onDelete).toHaveBeenCalledWith(ownMessage.id);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks duplicate Shift+Delete while deletion is pending", () => {
    const onDelete = jest.fn(() => new Promise<void>(() => undefined));
    renderChat({ onDelete });
    const deleteAction = screen.getByRole("button", { name: "Delete" });

    fireEvent.click(deleteAction, { shiftKey: true });
    fireEvent.click(deleteAction, { shiftKey: true });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  });

  it("preserves Shift+click deletion through the shared message context menu", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderChat({ onDelete });
    fireEvent.contextMenu(screen.getByText(ownMessage.content!));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Message" }), { shiftKey: true });
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(onDelete).toHaveBeenCalledWith(ownMessage.id);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the existing delete confirmation from keyboard menu activation", async () => {
    const interaction = userEvent.setup();
    renderChat();
    const origin = screen.getByRole("button", { name: "Delete" });
    origin.focus();
    fireEvent.contextMenu(screen.getByText(ownMessage.content!));
    expect(screen.getByRole("menuitem", { name: "Copy Message" })).toHaveFocus();
    await interaction.keyboard("{End}{Enter}");
    expect(baseProps.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete Message" })).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await interaction.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(baseProps.onDelete).not.toHaveBeenCalled();
  });

  it("keeps the Message visible and surfaces a Shift+Delete failure", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockRejectedValue(new Error("Delete failed; try again"));
    renderChat({ onDelete });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }), { shiftKey: true });

    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed; try again");
    expect(screen.getByText("A message with enough context")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("still deletes through normal modal confirmation", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderChat({ onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete Message" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each([
    ["Cancel", () => screen.getByRole("button", { name: "Cancel" })],
    ["close", () => screen.getByRole("button", { name: "Close delete confirmation" })],
  ])("%s preserves the Message and performs no DELETE", async (_label, getControl) => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderChat({ onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(getControl());

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getAllByText("A message with enough context").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking outside preserves the Message", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    const { container } = renderChat({ onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(container.querySelector(".modal-overlay")!);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("A message with enough context")).toBeInTheDocument();
  });

  it("prevents duplicate confirmation while the request is pending", async () => {
    let resolveDelete!: () => void;
    const onDelete = jest.fn(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    renderChat({ onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("button", { name: "Delete Message" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent("Deleting…");
    expect(screen.getByRole("dialog")).toHaveFocus();
    await userEvent.keyboard("{Tab}{Escape}");
    expect(screen.getByRole("dialog")).toHaveFocus();
    resolveDelete();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps useful retryable feedback after an API failure", async () => {
    const onDelete = jest.fn<Promise<void>, [string]>()
      .mockRejectedValueOnce(new Error("Delete failed; try again"))
      .mockResolvedValueOnce(undefined);
    renderChat({ onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete Message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed; try again");
    expect(screen.getAllByText("A message with enough context").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Delete Message" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(2));
  });

  it("shows Delete to the author and MANAGE_MESSAGES users, but not an unrelated user", () => {
    const { rerender } = renderChat({ messages: [otherMessage], user: { id: "user-1" }, canManageMessages: false });
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    rerender(<ChatArea {...baseProps} messages={[otherMessage]} user={{ id: "user-1" }} canManageMessages />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    rerender(<ChatArea {...baseProps} messages={[ownMessage]} user={{ id: "user-1" }} canManageMessages={false} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not render an F.4 tombstone path", () => {
    renderChat();
    expect(screen.queryByText("This message has been deleted")).not.toBeInTheDocument();
  });
});

function MessagesHarness() {
  const { messages, remove, handleWsEvent } = useMessages("channel-1");
  return (
    <div>
      <span data-testid="message-count">{messages.length}</span>
      {messages.map((message) => <span key={message.id}>{message.content}</span>)}
      <button onClick={() => { void remove("message-own").catch(() => undefined); }}>REST delete</button>
      <button onClick={() => handleWsEvent("message:deleted", {
        messageId: "message-own",
        channelId: "channel-1",
      })}>WS delete</button>
    </div>
  );
}

describe("F7.3 W3 deterministic reconciliation evidence (deferred protocol correlation)", () => {
  it.each(["REST-before-WS", "WS-before-REST"])("records sender transitions and stable receiver for %s", async (order) => {
    jest.clearAllMocks();
    (messageApi.list as jest.Mock).mockResolvedValue([]);
    let confirm!: (value: Awaited<ReturnType<typeof messageApi.send>>) => void;
    (messageApi.send as jest.Mock).mockImplementation(() => new Promise((resolve) => { confirm = resolve; }));
    const clients = renderHook(() => ({ sender: useMessages("channel-1"), receiver: useMessages("channel-1") }));
    await act(async () => {}); // Flush the explicitly resolved initial history promises.
    const view = renderChat({ messages: [] });
    const states: Array<{ phase: string; names: string[]; count: number }> = [];
    const observe = (phase: string) => {
      view.rerender(<ChatArea {...baseProps} messages={clients.result.current.sender.messages} />);
      states.push({ phase, names: Array.from(view.container.querySelectorAll(".message-author"), (node) => node.textContent!), count: clients.result.current.sender.messages.length });
    };
    let sending!: Promise<boolean>;
    act(() => { sending = clients.result.current.sender.send(ownMessage.content!); });
    observe("optimistic");
    const optimisticRow = view.container.querySelector(".message");
    const clientKey = clients.result.current.sender.messages[0]._idempotencyKey;
    expect(messageApi.send).toHaveBeenCalledWith("channel-1", expect.objectContaining({ idempotencyKey: clientKey }));
    // Match MessageService.serialize: WS contains the server ID and hydrated author,
    // but no client idempotency key. Do not fabricate a correlation field in this fixture.
    const wsMessage = { ...ownMessage };
    expect(wsMessage).not.toHaveProperty("_idempotencyKey");
    const ws = () => {
      act(() => {
        clients.result.current.sender.handleWsEvent("message:created", { message: wsMessage });
        clients.result.current.receiver.handleWsEvent("message:created", { message: wsMessage });
      });
      observe("WS");
    };
    const rest = async () => {
      await act(async () => { confirm({ message: { ...ownMessage, content: ownMessage.content! }, cached: false }); await sending; });
      observe("REST");
    };
    if (order === "REST-before-WS") { await rest(); ws(); }
    else { ws(); await rest(); }

    // Evidence assertions describe the unresolved baseline, not F7 acceptance.
    expect(states).toEqual(order === "REST-before-WS" ? [
      { phase: "optimistic", names: ["You"], count: 1 },
      { phase: "REST", names: ["You"], count: 1 },
      { phase: "WS", names: ["Alice"], count: 1 },
    ] : [
      { phase: "optimistic", names: ["You"], count: 1 },
      { phase: "WS", names: ["You", "Alice"], count: 2 },
      { phase: "REST", names: ["You"], count: 1 },
    ]);
    expect(view.container.querySelector(".message")).not.toBe(optimisticRow);
    expect(clients.result.current.sender.messages).toHaveLength(1);
    expect(clients.result.current.sender.messages[0]).toMatchObject({ id: ownMessage.id, authorId: ownMessage.authorId });
    const receiver = clients.result.current.receiver.messages;
    view.rerender(<ChatArea {...baseProps} user={{ id: "receiver" }} messages={receiver} />);
    expect(view.container.querySelector(".message-author")).toHaveTextContent("Alice");
    const receiverRow = view.container.querySelector(".message");
    act(() => clients.result.current.receiver.handleWsEvent("message:created", { message: wsMessage }));
    view.rerender(<ChatArea {...baseProps} user={{ id: "receiver" }} messages={clients.result.current.receiver.messages} />);
    expect(clients.result.current.receiver.messages).toHaveLength(1);
    expect(view.container.querySelector(".message")).toBe(receiverRow);
  });
});

describe("Message delete state convergence", () => {
  const listMock = messageApi.list as jest.MockedFunction<typeof messageApi.list>;
  const deleteMock = messageApi.delete as jest.MockedFunction<typeof messageApi.delete>;

  beforeEach(() => {
    jest.clearAllMocks();
    listMock.mockResolvedValue([ownMessage]);
    deleteMock.mockResolvedValue({ messageId: ownMessage.id, channelId: ownMessage.channelId });
  });

  it("removes the Message after REST success", async () => {
    render(<MessagesHarness />);
    await waitFor(() => expect(screen.getByTestId("message-count")).toHaveTextContent("1"));
    await userEvent.click(screen.getByRole("button", { name: "REST delete" }));
    await waitFor(() => expect(screen.getByTestId("message-count")).toHaveTextContent("0"));
  });

  it("removes by messageId on WS and treats a REST plus WS echo idempotently", async () => {
    render(<MessagesHarness />);
    await waitFor(() => expect(screen.getByTestId("message-count")).toHaveTextContent("1"));
    await userEvent.click(screen.getByRole("button", { name: "REST delete" }));
    await userEvent.click(screen.getByRole("button", { name: "WS delete" }));
    expect(screen.getByTestId("message-count")).toHaveTextContent("0");
  });

  it("keeps the Message when REST deletion fails", async () => {
    deleteMock.mockRejectedValueOnce(new Error("HTTP 500"));
    render(<MessagesHarness />);
    await waitFor(() => expect(screen.getByTestId("message-count")).toHaveTextContent("1"));
    await userEvent.click(screen.getByRole("button", { name: "REST delete" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
  });
});
