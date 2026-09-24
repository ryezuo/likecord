"use client";

import UserAvatar from "../ui/UserAvatar";

import { useRef, useState, useCallback, useLayoutEffect } from "react";
import type { Attachment, Message } from "../../hooks/useMessages";
import { attachmentApi } from "../../lib/api";
import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu";
import { contextMenuTrigger } from "../ui/contextMenuTrigger";
import Tooltip from "../ui/Tooltip";
import { PaperclipIcon, GiftIcon, SmileIcon, StickerIcon, GifBadge } from "../ui/icons";
import MessageDeleteModal from "../MessageDeleteModal";
import MediaViewer, { isMediaViewerEligible } from "../media/MediaViewer";
import AppShellHeader from "./AppShellHeader";
import MessageText from "../message/MessageText";
import LinkPreview from "../message/LinkPreview";

interface Props {
  channelName: string;
  connected: boolean;
  socketId: string | undefined;
  activeChannelId: string;
  messages: Message[];
  msgsLoading: boolean;
  hasMore: boolean;
  editingMsgId: string | null;
  editContent: string;
  pendingFiles: File[];
  uploadingIds: string[];
  uploadError: string | null;
  canSendMessages?: boolean;
  canAttachFiles?: boolean;
  canManageMessages?: boolean;
  showSendButton?: boolean;
  debugLog: string[];
  lastPayload: string;
  lastAttCount: number;
  dbg: boolean;
  user: { id: string; username?: string; displayName?: string } | null;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onEditStart: (id: string, content: string) => void;
  onEditChange: (content: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  onSend: (e: React.FormEvent) => void | Promise<void>;
  onPaste: (e: React.ClipboardEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  showHeader?: boolean;
}

const NEAR_BOTTOM_THRESHOLD_PX = 96;

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop <= NEAR_BOTTOM_THRESHOLD_PX;
}

interface MediaViewerState {
  channelId: string;
  messageId: string;
  attachments: Attachment[];
  selectedAttachmentId: string;
  selectedIndex: number;
  trigger: HTMLButtonElement;
}

function attachmentsMatch(first: Attachment[], second: Attachment[]) {
  return first.length === second.length && first.every((attachment, index) => {
    const other = second[index];
    return attachment.id === other.id
      && attachment.fileName === other.fileName
      && attachment.fileSize === other.fileSize
      && attachment.mimeType === other.mimeType;
  });
}

function renderAttachment(att: Attachment, message: Message, onOpen: (message: Message, attachment: Attachment, trigger: HTMLButtonElement) => void) {
  const isImage = att.mimeType?.startsWith("image/");
  const downloadUrl = attachmentApi.downloadUrl(att.id);
  return (
    <div key={att.id} className="att-card">
      {isMediaViewerEligible(att) ? (
        <button type="button" className="att-image-trigger" aria-label={`Open ${att.fileName} in media viewer`}
          onClick={(event) => onOpen(message, att, event.currentTarget)}>
          <img src={downloadUrl} alt={att.fileName} className="att-image" loading="lazy" />
        </button>
      ) : isImage ? (
        <img src={downloadUrl} alt={att.fileName} className="att-image" loading="lazy" />
      ) : (
        <a href={downloadUrl} className="att-file" download>
          <span className="att-file-icon" aria-hidden="true">📎</span>
          <span className="att-file-details">
            <span className="att-file-name">{att.fileName}</span>
            <span className="att-file-meta">{(att.fileSize / 1024).toFixed(0)} KB</span>
          </span>
        </a>
      )}
    </div>
  );
}

export default function ChatArea({
  channelName, connected, socketId, activeChannelId,
  messages, msgsLoading, hasMore,
  editingMsgId, editContent, pendingFiles, uploadingIds, uploadError,
  canSendMessages = true, canAttachFiles = true, canManageMessages = false, showSendButton = false,
  debugLog, lastPayload, lastAttCount, dbg, user,
  onScroll, onEditStart, onEditChange, onEditSave, onEditCancel, onDelete,
  onSend, onPaste, onFileSelect, onRemoveFile,
  showHeader = true,
}: Props) {
  const attachmentsEnabled = canSendMessages && canAttachFiles;
  const debugRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const previousMessagesRef = useRef<Message[]>([]);
  const observedChannelIdRef = useRef<string | null>(null);
  const initialScrollPendingRef = useRef(true);
  const nearBottomRef = useRef(true);
  const historyAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; invoker: HTMLElement; label: string; x: number; y: number } | null>(null);
  const [pendingNewMessages, setPendingNewMessages] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [composerHasText, setComposerHasText] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(null);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  const pendingViewerFocusRef = useRef<{ channelId: string; trigger: HTMLButtonElement } | null>(null);
  const canSubmitComposer = canSendMessages && uploadingIds.length === 0
    && (composerHasText || (attachmentsEnabled && pendingFiles.length > 0));

  const syncComposerTextState = useCallback((form: HTMLFormElement) => {
    const input = form.elements.namedItem("content") as HTMLTextAreaElement | null;
    setComposerHasText(Boolean(input?.value.trim()));
  }, []);

  const submitComposer = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    if (!canSubmitComposer) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget;
    const result = onSend(event);
    syncComposerTextState(form);
    if (result && typeof result.then === "function") {
      void result.then(() => syncComposerTextState(form), () => syncComposerTextState(form));
    }
  }, [canSubmitComposer, onSend, syncComposerTextState]);

  const executeDelete = useCallback(async (messageId: string) => {
    if (pendingDeleteIdsRef.current.has(messageId)) return;

    const pending = new Set(pendingDeleteIdsRef.current).add(messageId);
    pendingDeleteIdsRef.current = pending;
    setPendingDeleteIds(pending);
    try {
      await onDelete(messageId);
    } finally {
      const remaining = new Set(pendingDeleteIdsRef.current);
      remaining.delete(messageId);
      pendingDeleteIdsRef.current = remaining;
      setPendingDeleteIds(remaining);
    }
  }, [onDelete]);

  const handleDeleteAction = useCallback((event: React.MouseEvent<HTMLButtonElement>, message: Message) => {
    if (pendingDeleteIdsRef.current.has(message.id)) return;
    setDeleteError(null);

    if (event.shiftKey) {
      void executeDelete(message.id).catch((caught: unknown) => {
        setDeleteError(caught instanceof Error && caught.message
          ? caught.message
          : "The message could not be deleted. Please try again.");
      });
      return;
    }

    setDeleteTarget(message);
  }, [executeDelete]);

  const scrollToLatest = useCallback(() => {
    const element = messageListRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    nearBottomRef.current = true;
    setPendingNewMessages(0);
  }, []);

  useLayoutEffect(() => {
    const element = messageListRef.current;
    if (!element) return;

    if (observedChannelIdRef.current !== activeChannelId) {
      observedChannelIdRef.current = activeChannelId;
      previousMessagesRef.current = [];
      initialScrollPendingRef.current = true;
      historyAnchorRef.current = null;
      nearBottomRef.current = true;
      setPendingNewMessages(0);
    }

    const previousMessages = previousMessagesRef.current;
    const previousIds = new Set(previousMessages.map((message) => message.id));
    const addedMessages = messages.filter((message) => !previousIds.has(message.id));
    const addedLatestMessage = addedMessages.some((message) => messages[messages.length - 1]?.id === message.id);
    const previewStateChanged = addedMessages.length === 0 && messages.some((message) => {
      const previous = previousMessages.find((candidate) => candidate.id === message.id);
      return previous && previous.linkPreview !== message.linkPreview;
    });

    if (initialScrollPendingRef.current) {
      // The channel's first rendered history must start at its newest message. Setting
      // this in a layout effect keeps the initial position out of the painted frame.
      scrollToLatest();
      initialScrollPendingRef.current = false;
    } else if (historyAnchorRef.current && messages.length !== previousMessages.length) {
      // Pagination prepends older messages. Preserve the reader's visual anchor so
      // loading history does not move the message they were reading.
      const anchor = historyAnchorRef.current;
      element.scrollTop = element.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
      historyAnchorRef.current = null;
    } else if (historyAnchorRef.current && !msgsLoading && !hasMore) {
      historyAnchorRef.current = null;
    } else if (addedLatestMessage) {
      const includesOwnMessage = addedMessages.some(
        (message) => message.authorId === user?.id || message.authorId === "pending",
      );

      if (includesOwnMessage || nearBottomRef.current) {
        scrollToLatest();
      } else {
        setPendingNewMessages((count) => count + addedMessages.length);
      }
    } else if (previewStateChanged && nearBottomRef.current) {
      // Stay at latest when an in-place preview changes row height. Readers who
      // scrolled up retain their exact position through the existing owner.
      scrollToLatest();
    }

    previousMessagesRef.current = messages;
  }, [activeChannelId, hasMore, messages, msgsLoading, scrollToLatest, user?.id]);

  const handleMessageListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    nearBottomRef.current = isNearBottom(element);
    if (nearBottomRef.current) setPendingNewMessages(0);

    if (element.scrollTop < 100 && hasMore && !msgsLoading) {
      historyAnchorRef.current = { scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
    }

    onScroll(event);
  }, [hasMore, msgsLoading, onScroll]);

  const openMediaViewer = useCallback((message: Message, attachment: Attachment, trigger: HTMLButtonElement) => {
    const attachments = (message.attachments ?? []).filter(isMediaViewerEligible);
    const selectedIndex = attachments.findIndex((candidate) => candidate.id === attachment.id);
    if (selectedIndex < 0) return;
    pendingViewerFocusRef.current = null;
    setMediaViewer({
      channelId: activeChannelId,
      messageId: message.id,
      attachments,
      selectedAttachmentId: attachment.id,
      selectedIndex,
      trigger,
    });
  }, [activeChannelId]);

  const closeMediaViewer = useCallback(() => {
    setMediaViewer((current) => {
      if (!current) return null;
      pendingViewerFocusRef.current = { channelId: current.channelId, trigger: current.trigger };
      return null;
    });
  }, []);

  const selectMediaViewerIndex = useCallback((nextIndex: number) => {
    setMediaViewer((current) => {
      if (!current) return null;
      const boundedIndex = Math.max(0, Math.min(nextIndex, current.attachments.length - 1));
      const selected = current.attachments[boundedIndex];
      if (!selected || (boundedIndex === current.selectedIndex && selected.id === current.selectedAttachmentId)) return current;
      return { ...current, selectedAttachmentId: selected.id, selectedIndex: boundedIndex };
    });
  }, []);

  useLayoutEffect(() => {
    setMediaViewer((current) => {
      if (!current) return null;
      if (current.channelId !== activeChannelId) {
        pendingViewerFocusRef.current = null;
        return null;
      }

      const sourceMessage = messages.find((message) => message.id === current.messageId);
      if (!sourceMessage) {
        pendingViewerFocusRef.current = { channelId: current.channelId, trigger: current.trigger };
        return null;
      }

      const attachments = (sourceMessage.attachments ?? []).filter(isMediaViewerEligible);
      if (attachments.length === 0) {
        pendingViewerFocusRef.current = { channelId: current.channelId, trigger: current.trigger };
        return null;
      }

      const retainedIndex = attachments.findIndex((attachment) => attachment.id === current.selectedAttachmentId);
      const selectedIndex = retainedIndex >= 0
        ? retainedIndex
        : Math.min(current.selectedIndex, attachments.length - 1);
      const selectedAttachmentId = attachments[selectedIndex].id;
      if (selectedIndex === current.selectedIndex
        && selectedAttachmentId === current.selectedAttachmentId
        && attachmentsMatch(current.attachments, attachments)) return current;
      return { ...current, attachments, selectedAttachmentId, selectedIndex };
    });
  }, [activeChannelId, messages]);

  useLayoutEffect(() => {
    if (mediaViewer || !pendingViewerFocusRef.current) return;
    const pending = pendingViewerFocusRef.current;
    pendingViewerFocusRef.current = null;
    if (pending.channelId !== activeChannelId) return;
    const target = pending.trigger.isConnected ? pending.trigger : messageListRef.current;
    target?.focus({ preventScroll: true });
  }, [activeChannelId, mediaViewer]);

  const handleMessageContext = useCallback((e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, msg: Message) => {
    const trigger = contextMenuTrigger(e);
    if (!trigger) return;
    const isAuthor = msg.authorId === user?.id;
    const items: ContextMenuItem[] = [
      { label: "Copy Message", onClick: () => { if (msg.content) navigator.clipboard.writeText(msg.content); } },
      { label: "Copy Message ID", onClick: () => navigator.clipboard.writeText(msg.id) },
      { label: "", onClick: () => {}, divider: true },
    ];
    if (isAuthor) {
      items.push({ label: "Edit Message", onClick: () => onEditStart(msg.id, msg.content || "") });
    }
    if (!msg._optimistic && (isAuthor || canManageMessages)) {
      items.push({
        label: "Delete Message",
        onClick: (event) => handleDeleteAction(event, msg),
        danger: true,
        disabled: pendingDeleteIdsRef.current.has(msg.id),
      });
    }
    const author = msg.author?.displayName || msg.author?.username || (isAuthor || msg.authorId === "pending" ? "You" : "Unknown");
    setContextMenu({ items, ...trigger, label: `Message actions for ${author}` });
  }, [canManageMessages, handleDeleteAction, user?.id, onEditStart]);

  return (
    <div className="main-content">
      {showHeader && <AppShellHeader title={`# ${channelName}`} connected={connected} socketId={socketId} activeChannelId={activeChannelId} />}

      <div className="message-list" ref={messageListRef} tabIndex={-1} onScroll={handleMessageListScroll} data-testid="message-list">
        {deleteError ? <div className="error-banner message-delete-error" role="alert">{deleteError}</div> : null}
        {msgsLoading && <div className="loading-more">Loading...</div>}
        {!msgsLoading && messages.length === 0 && (
          <div className="empty-channel">
            <div className="empty-channel-icon">#</div>
            <div className="empty-channel-title">Welcome to #{channelName}!</div>
            <div className="empty-channel-sub">This is the start of this channel. No messages yet.</div>
          </div>
        )}
        {messages.map((msg) => {
          const isAuthor = msg.authorId === user?.id || msg.authorId === "pending";
          const canDelete = !msg._optimistic && (msg.authorId === user?.id || canManageMessages);
          const authorName = msg.author?.displayName || msg.author?.username || (isAuthor ? "You" : "Unknown");

          return (
            <div key={msg.id + (msg._optimistic ? "-opt" : "")}
              role="group" tabIndex={0} aria-label={`Message from ${authorName}`} aria-haspopup="menu"
              className={`message ${msg._optimistic ? "optimistic" : ""} ${msg._error ? "error" : ""}`}
              onKeyDown={(e) => { if (e.target === e.currentTarget) handleMessageContext(e, msg); }}
              onContextMenu={(e) => handleMessageContext(e, msg)}>
              <div className="msg-avatar" style={!isAuthor ? { background: "var(--bg-hover)" } : {}}>
                <UserAvatar userId={isAuthor ? user?.id : msg.authorId} name={authorName} interactive />
              </div>
              <div className="msg-body">
                <div className="msg-header">
                  <span className="message-author" style={isAuthor ? { color: "var(--text-link)" } : {}}>
                    {authorName}
                  </span>
                  <span className="message-time">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}
                    {msg.editedAt ? " (edited)" : ""}
                  </span>
                </div>
                <div className="message-content">
                  {editingMsgId === msg.id ? (
                    <div className="edit-form">
                      <input value={editContent} onChange={(e) => onEditChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onEditSave(msg.id); if (e.key === "Escape") onEditCancel(); }} autoFocus />
                      <Tooltip text="Save">
                        <button className="btn btn-primary" onClick={() => onEditSave(msg.id)}>Save</button>
                      </Tooltip>
                      <Tooltip text="Cancel">
                        <button className="btn btn-secondary" onClick={onEditCancel}>Cancel</button>
                      </Tooltip>
                    </div>
                  ) : (
                    <MessageText content={msg.content ?? ""} />
                  )}
                  {editingMsgId !== msg.id && msg.linkPreview ? (
                    <LinkPreview content={msg.content ?? ""} preview={msg.linkPreview} />
                  ) : null}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="msg-attachments">
                      {msg.attachments.map((att) => renderAttachment(att, msg, openMediaViewer))}
                    </div>
                  )}
                </div>
                {editingMsgId !== msg.id && (isAuthor || canDelete) && (
                  <div className="message-actions">
                    {isAuthor && !msg._optimistic ? <button className="message-action" onClick={() => onEditStart(msg.id, msg.content || "")}>Edit</button> : null}
                    {canDelete ? (
                      <button
                        className="message-action message-action-danger"
                        disabled={pendingDeleteIds.has(msg.id)}
                        onClick={(event) => handleDeleteAction(event, msg)}
                      >
                        {pendingDeleteIds.has(msg.id) ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingNewMessages > 0 && (
        <div className="new-message-indicator-row">
          <button type="button" className="new-message-indicator" onClick={scrollToLatest}>
            ↓ {pendingNewMessages} new message{pendingNewMessages === 1 ? "" : "s"}
          </button>
        </div>
      )}

      <div className={`composer ${!canSendMessages ? "composer-disabled" : ""}`} ref={debugRef}
        onPaste={attachmentsEnabled ? onPaste : undefined} data-testid="composer">
        {uploadError && <div className="error-banner attachment-error" role="alert">
          <span>{uploadError}</span>
          <button type="button" className="attachment-error-dismiss" aria-label="Dismiss attachment error" onClick={() => onFileSelect(null as any)}>✕</button>
        </div>}
        <form onSubmit={submitComposer} style={{ margin: 0 }}>
          <div className="composer-inner">
            <Tooltip text={attachmentsEnabled ? "Attach file" : "You cannot attach files while message sending or attachments are unavailable."}>
              <label className={`composer-icon ${!attachmentsEnabled ? "disabled" : ""}`}
                htmlFor={attachmentsEnabled ? "file-input" : undefined} aria-disabled={!attachmentsEnabled}
                aria-label={attachmentsEnabled ? "Attach file" : "You cannot attach files while message sending or attachments are unavailable."}
                style={{ cursor: attachmentsEnabled ? "pointer" : "not-allowed", display: "flex" }}><PaperclipIcon size={20} /></label>
            </Tooltip>
            <input id="file-input" type="file" multiple style={{ display: "none" }}
              disabled={!attachmentsEnabled}
              onChange={(e) => onFileSelect(e.target.files)} />
            <textarea name="content" id="msg-input" rows={1}
              aria-label={`Message #${channelName}`}
              placeholder={canSendMessages ? `Conversar em #${channelName}` : "You do not have permission to send messages in this channel."}
              disabled={!canSendMessages} aria-disabled={!canSendMessages} maxLength={4000} autoComplete="off"
              onChange={(event) => setComposerHasText(Boolean(event.target.value.trim()))}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                if (canSubmitComposer) event.currentTarget.form?.requestSubmit();
              }} />
            {showSendButton && <button type="submit" className="btn btn-secondary composer-send-button" disabled={!canSubmitComposer}>Send</button>}
            <Tooltip text="Gift (placeholder)"><span className="composer-icon" style={{ cursor: "default" }}><GiftIcon size={20} /></span></Tooltip>
            <Tooltip text="GIF"><span className="composer-icon" style={{ cursor: "default", fontSize: "0.75rem", fontWeight: 700 }}>GIF</span></Tooltip>
            <Tooltip text="Sticker (placeholder)"><span className="composer-icon" style={{ cursor: "default" }}><StickerIcon size={20} /></span></Tooltip>
            <Tooltip text="Emoji (placeholder)"><span className="composer-icon" style={{ cursor: "default" }}><SmileIcon size={20} /></span></Tooltip>
          </div>
        </form>

        {pendingFiles.length > 0 && (
          <div className="pending-files">
            {pendingFiles.map((f, i) => (
              <span key={i} className="pending-file">
                <span className="pending-file-name">
                  <span aria-hidden="true">{f.type?.startsWith("image/") ? "🖼" : "📄"}</span> {f.name}
                </span>
                <span className="pending-file-meta">
                  ({(f.size / 1024).toFixed(0)} KB, {f.type || "unknown"})
                </span>
                {uploadingIds.length === 0 && (
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemoveFile(i)}>✕</button>
                )}
              </span>
            ))}
          </div>
        )}

        {dbg && (
          <div className="attach-debug" style={{ marginTop: "0.35rem" }}>
            <div className="attach-debug-header">📎 Attachment Debug</div>
            <div className="attach-debug-body">
              <div style={{ color: "var(--success)" }}>● Debug active</div>
              <div>Pending files: <strong>{pendingFiles.length}</strong></div>
              <div>Uploading: <strong>{uploadingIds.length}</strong></div>
              <div>Last payload: <code style={{ wordBreak: "break-all" }}>{lastPayload || "—"}</code></div>
              <div>Response attachments: <strong>{lastAttCount}</strong></div>
              {debugLog.length > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.25rem 0" }} />}
              {debugLog.map((line, i) => (
                <div key={i} className="debug-line">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu items={contextMenu.items} ariaLabel={contextMenu.label} returnFocusTo={contextMenu.invoker}
          fallbackFocusTo={messageListRef.current} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={() => setContextMenu(null)} />
      )}
      {deleteTarget ? (
        <MessageDeleteModal
          message={deleteTarget}
          currentUser={user}
          fallbackFocusTo={messageListRef.current}
          onDelete={executeDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
      {mediaViewer ? (
        <MediaViewer
          attachment={mediaViewer.attachments[mediaViewer.selectedIndex]}
          currentIndex={mediaViewer.selectedIndex}
          attachmentCount={mediaViewer.attachments.length}
          onPrevious={() => selectMediaViewerIndex(mediaViewer.selectedIndex - 1)}
          onNext={() => selectMediaViewerIndex(mediaViewer.selectedIndex + 1)}
          onClose={closeMediaViewer}
        />
      ) : null}
    </div>
  );
}
