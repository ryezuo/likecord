"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Message } from "../hooks/useMessages";

interface Props {
  message: Message;
  currentUser: { id: string; username?: string; displayName?: string } | null;
  onDelete: (messageId: string) => Promise<void>;
  onClose: () => void;
  fallbackFocusTo?: HTMLElement | null;
}

export function resolveMessageAuthorName(
  message: Message,
  currentUser: Props["currentUser"],
) {
  if (message.author) {
    return message.author.displayName || message.author.username;
  }

  if (message.authorId === currentUser?.id) {
    return currentUser.displayName || currentUser.username || "Unknown author";
  }

  return "Unknown author";
}

export default function MessageDeleteModal({ message, currentUser, onDelete, onClose, fallbackFocusTo }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef(fallbackFocusTo);
  fallbackRef.current = fallbackFocusTo;

  useLayoutEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus({ preventScroll: true });
    return () => {
      const target = origin?.isConnected ? origin : fallbackRef.current;
      target?.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    if (pending) dialogRef.current?.focus({ preventScroll: true });
    else if (document.activeElement === dialogRef.current) cancelRef.current?.focus({ preventScroll: true });
  }, [pending]);
  useLayoutEffect(() => { errorRef.current?.scrollIntoView?.({ block: "nearest" }); }, [error]);
  const authorName = resolveMessageAuthorName(message, currentUser);
  const attachmentNames = message.attachments?.map((attachment) => attachment.fileName) ?? [];

  const confirmDelete = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onDelete(message.id);
      onClose();
    } catch (caught: unknown) {
      setError(caught instanceof Error && caught.message
        ? caught.message
        : "The message could not be deleted. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { if (!pending) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className="modal confirm-modal message-delete-modal" role="dialog" aria-modal="true"
        aria-labelledby="message-delete-title" aria-describedby="message-delete-warning" onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (!pending) onClose();
          } else if (event.key === "Tab") {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']"));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (pending || !first) {
              event.preventDefault();
              dialogRef.current?.focus();
            } else if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}>
        <div className="message-delete-heading">
          <h3 id="message-delete-title">Delete Message</h3>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close delete confirmation" disabled={pending} onClick={onClose}>✕</button>
        </div>
        <p id="message-delete-warning" className="message-delete-warning">This action cannot be undone.</p>
        <div className="message-delete-content" role="region" aria-label="Message preview" tabIndex={0}>
          <div className="message-delete-preview">
            <strong>{authorName}</strong>
            {message.content ? <p>{message.content}</p> : null}
            {attachmentNames.length > 0 ? (
              <div className="message-delete-attachments">
                <span>{attachmentNames.length} attachment{attachmentNames.length === 1 ? "" : "s"}</span>
                <ul>{attachmentNames.map((name, index) => (
                  <li className="message-delete-attachment-name" key={`${name}-${index}`}>{name}</li>
                ))}</ul>
              </div>
            ) : null}
          </div>
          <p className="message-delete-shortcut-hint">
            Tip: hold Shift while clicking Delete to skip this confirmation.
          </p>
          {error ? <div ref={errorRef} className="error-banner" role="alert">{error}</div> : null}
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-danger" disabled={pending} onClick={confirmDelete}>
            {pending ? "Deleting…" : "Delete Message"}
          </button>
          <button className="btn btn-secondary" ref={cancelRef} type="button" disabled={pending} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
