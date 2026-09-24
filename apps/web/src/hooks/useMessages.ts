"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { messageApi } from "../lib/api";
import { v4 as uuidv4 } from "uuid";
import { linkPreviewContentFingerprint, type LinkPreview, type MessagePreviewUpdatedEvent } from "@likecord/shared/link-preview";
import { selectLinkPreviewCandidate } from "@likecord/shared/link-preview-url";

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content?: string;
  createdAt: string;
  editedAt?: string | null;
  author?: { id: string; username: string; displayName: string };
  attachments?: Attachment[];
  linkPreview?: LinkPreview | null;
  _optimistic?: boolean;
  _error?: boolean;
  _idempotencyKey?: string;
}

function validPreview(message: Message): LinkPreview | undefined {
  const candidate = selectLinkPreviewCandidate(message.content ?? "");
  const preview = message.linkPreview;
  return preview && candidate?.href === preview.sourceUrl ? preview : undefined;
}

function reconcileMessage(previous: Message | undefined, incoming: Message): Message {
  const merged = { ...previous, ...incoming };
  const incomingOwnsPreview = Object.prototype.hasOwnProperty.call(incoming, "linkPreview");
  const contentChanged = previous !== undefined
    && Object.prototype.hasOwnProperty.call(incoming, "content")
    && incoming.content !== previous.content;
  const retained = incomingOwnsPreview
    ? validPreview(merged)
    : contentChanged ? undefined : validPreview({ ...merged, linkPreview: previous?.linkPreview });
  return { ...merged, linkPreview: retained };
}

export function useMessages(channelId: string | null, canReadHistory = true) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelIdRef = useRef(channelId);
  const canReadHistoryRef = useRef(canReadHistory);
  channelIdRef.current = channelId;
  canReadHistoryRef.current = canReadHistory;

  const load = useCallback(async (before?: string) => {
    if (!channelId || !canReadHistory) return;
    setLoading(true);
    try {
      const data = await messageApi.list(channelId, before);
      // A permission invalidation can race an in-flight history request. Never
      // let that completed request restore messages after READ_MESSAGE_HISTORY
      // was revoked or after navigation moved to another Channel.
      if (!canReadHistoryRef.current || channelIdRef.current !== channelId) return;
      if (before) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = data.filter((m) => !existingIds.has(m.id)).map((message) => reconcileMessage(undefined, message));
          return [...newMsgs, ...prev];
        });
      } else {
        setMessages(data.map((message) => reconcileMessage(undefined, message)));
      }
      setHasMore(data.length >= 50);
    } catch { /* ignore */ } finally {
      if (channelIdRef.current === channelId && canReadHistoryRef.current) setLoading(false);
    }
  }, [canReadHistory, channelId]);

  useEffect(() => {
    setMessages([]);
    setHasMore(canReadHistory);
    if (!canReadHistory) setLoading(false);
    if (channelId && canReadHistory) load();
  }, [canReadHistory, channelId, load]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && messages.length > 0) {
      load(messages[0].id);
    }
  }, [loading, hasMore, messages, load]);

  // Upsert helper: remove by idempotencyKey OR server id, then add new
  const upsert = useCallback((newMsg: Message, key?: string) => {
    setMessages((prev) => {
      const previous = prev.find((message) => message.id === newMsg.id || (key && message._idempotencyKey === key));
      const filtered = prev.filter((m) => {
        if (m.id === newMsg.id) return false;         // same server ID
        if (key && m._idempotencyKey === key) return false; // same client key
        return true;
      });
      return [...filtered, reconcileMessage(previous, newMsg)];
    });
  }, []);

  const send = useCallback(async (content: string, attachmentIds?: string[]): Promise<boolean> => {
    if (!channelId) return false;
    const idempotencyKey = uuidv4();
    const optimistic: Message = {
      id: idempotencyKey,
      channelId,
      authorId: "pending",
      content: content || undefined,
      createdAt: new Date().toISOString(),
      _optimistic: true,
      _idempotencyKey: idempotencyKey,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const data = await messageApi.send(channelId, { content: content || undefined, idempotencyKey, attachmentIds });
      const confirmed: Message = { ...data.message, author: undefined, _idempotencyKey: idempotencyKey };
      upsert(confirmed, idempotencyKey);
      return true;
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._idempotencyKey === idempotencyKey ? { ...m, _error: true, _optimistic: false } : m)),
      );
      return false;
    }
  }, [channelId, upsert]);

  const edit = useCallback(async (messageId: string, content: string) => {
    try {
      const data = await messageApi.update(messageId, { content });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? reconcileMessage(m, data.message as Message) : m)),
      );
    } catch { /* ignore */ }
  }, []);

  const remove = useCallback(async (messageId: string) => {
    const data = await messageApi.delete(messageId);
    setMessages((prev) => prev.filter((message) => message.id !== data.messageId));
  }, []);

  const handleWsEvent = useCallback((event: string, data: any) => {
    if (event === "message:created" && data?.message) {
      upsert(data.message, data.message._idempotencyKey);
    } else if (event === "message:updated" && data?.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.message.id ? reconcileMessage(m, data.message) : m)),
      );
    } else if (event === "message:deleted" && data?.messageId) {
      setMessages((prev) => prev.filter((message) => message.id !== data.messageId));
    } else if (event === "message:preview-updated" && data?.messageId) {
      const update = data as MessagePreviewUpdatedEvent;
      setMessages((prev) => prev.map((message) => {
        if (message.id !== update.messageId || message.channelId !== update.channelId) return message;
        const content = message.content ?? "";
        if (linkPreviewContentFingerprint(content) !== update.contentFingerprint) return message;
        const candidate = selectLinkPreviewCandidate(content);
        if (!candidate || !update.linkPreview || candidate.href !== update.linkPreview.sourceUrl) return message;
        return { ...message, linkPreview: update.linkPreview };
      }));
    }
  }, [upsert]);

  return { messages, loading, hasMore, loadMore, send, edit, remove, handleWsEvent };
}
