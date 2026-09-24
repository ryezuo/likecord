import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import ChatArea from "../components/layout/ChatArea";
import { useMessages } from "../hooks/useMessages";
import { messageApi } from "../lib/api";

jest.mock("../lib/api", () => ({
  messageApi: { list: jest.fn(), send: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));

const mockMessageApi = messageApi as jest.Mocked<typeof messageApi>;

function chatProps(overrides: Record<string, unknown> = {}) {
  return {
    channelName: "staff",
    connected: true,
    socketId: "socket",
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
    user: { id: "user-1" },
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
    ...overrides,
  };
}

describe("Channel permission-aware runtime UX", () => {
  beforeEach(() => jest.clearAllMocks());

  it("CHPERM-LIFE-13/14: SEND_MESSAGES denial disables normal composer input and restoration reenables it", () => {
    const onSend = jest.fn();
    const view = render(<ChatArea {...chatProps({ canSendMessages: false, canAttachFiles: true, onSend })} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", "You do not have permission to send messages in this channel.");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).not.toHaveBeenCalled();

    view.rerender(<ChatArea {...chatProps({ canSendMessages: true, canAttachFiles: true, onSend })} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Conversar em #staff");
  });

  it("CHPERM-LIFE-16/17/19: ATTACH_FILES denial blocks picker/paste while leaving text submission available", () => {
    const onPaste = jest.fn();
    const onSend = jest.fn((event: React.FormEvent) => event.preventDefault());
    const view = render(<ChatArea {...chatProps({ canSendMessages: true, canAttachFiles: false, onPaste, onSend })} />);

    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(document.getElementById("file-input")).toBeDisabled();
    expect(screen.getByLabelText("You cannot attach files while message sending or attachments are unavailable.")).toHaveAttribute("aria-disabled", "true");
    fireEvent.paste(screen.getByTestId("composer"), {
      clipboardData: { items: [{ kind: "file", type: "image/png", getAsFile: () => new File(["x"], "x.png", { type: "image/png" }) }] },
    });
    expect(onPaste).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Text remains available" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(onSend).toHaveBeenCalledTimes(1);

    view.rerender(<ChatArea {...chatProps({ canSendMessages: true, canAttachFiles: true, onPaste, onSend })} />);
    expect(document.getElementById("file-input")).toBeEnabled();
  });

  it("CHPERM-LIFE-66/67/68: attachment UX requires both independent effective permissions", () => {
    const onPaste = jest.fn();
    const view = render(<ChatArea {...chatProps({ canSendMessages: false, canAttachFiles: true, onPaste })} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(document.getElementById("file-input")).toBeDisabled();
    fireEvent.paste(screen.getByTestId("composer"), {
      clipboardData: { items: [{ kind: "file", type: "image/png", getAsFile: () => new File(["x"], "x.png", { type: "image/png" }) }] },
    });
    expect(onPaste).not.toHaveBeenCalled();

    view.rerender(<ChatArea {...chatProps({ canSendMessages: true, canAttachFiles: true, onPaste })} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(document.getElementById("file-input")).toBeEnabled();

    view.rerender(<ChatArea {...chatProps({ canSendMessages: false, canAttachFiles: false, onPaste })} />);
    view.rerender(<ChatArea {...chatProps({ canSendMessages: true, canAttachFiles: false, onPaste })} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(document.getElementById("file-input")).toBeDisabled();
  });

  it("CHPERM-LIFE-32: READ_MESSAGE_HISTORY revocation clears stale history and ignores an in-flight response", async () => {
    let resolveHistory: ((messages: Array<Record<string, unknown>>) => void) | undefined;
    mockMessageApi.list.mockImplementation(() => new Promise((resolve) => { resolveHistory = resolve; }));
    const { result, rerender } = renderHook(
      ({ canRead }) => useMessages("channel-1", canRead),
      { initialProps: { canRead: true } },
    );
    await waitFor(() => expect(mockMessageApi.list).toHaveBeenCalledWith("channel-1", undefined));

    rerender({ canRead: false });
    expect(result.current.messages).toEqual([]);
    resolveHistory?.([{ id: "stale", channelId: "channel-1", authorId: "user-2", content: "secret", createdAt: new Date().toISOString() }]);
    await Promise.resolve();
    await waitFor(() => expect(result.current.messages).toEqual([]));
  });
});
