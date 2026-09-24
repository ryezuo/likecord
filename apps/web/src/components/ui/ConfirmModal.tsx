"use client";

import { useEffect, useRef } from "react";
import { isContextInvokerAvailable } from "../../lib/contextFocus";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  pendingLabel?: string;
  danger?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** Opt-in focus ownership for the invoking member row. */
  returnFocusTo?: HTMLElement;
  fallbackFocusTo?: HTMLElement | null;
}

export default function ConfirmModal({
  title, message, confirmLabel = "Confirm", pendingLabel, danger = false, pending = false, error, onConfirm, onCancel,
  returnFocusTo, fallbackFocusTo,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const latest = useRef({ pending, onCancel, fallbackFocusTo });
  latest.current = { pending, onCancel, fallbackFocusTo };

  useEffect(() => {
    if (!returnFocusTo) return;
    cancelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && !latest.current.pending) {
        event.preventDefault();
        latest.current.onCancel();
      } else if (event.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (buttons.length === 0) {
          event.preventDefault();
          dialogRef.current?.focus();
        } else if (event.shiftKey && (document.activeElement === buttons[0] || !buttons.includes(document.activeElement as HTMLButtonElement))) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && (document.activeElement === buttons[buttons.length - 1] || !buttons.includes(document.activeElement as HTMLButtonElement))) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      const target = isContextInvokerAvailable(returnFocusTo) ? returnFocusTo : latest.current.fallbackFocusTo;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);

  useEffect(() => {
    if (!returnFocusTo) return;
    if (pending) dialogRef.current?.focus();
    else if (document.activeElement === dialogRef.current) cancelRef.current?.focus();
  }, [pending, returnFocusTo]);

  return (
    <div className="modal-overlay" onClick={() => { if (!pending) onCancel(); }}>
      <div ref={dialogRef} tabIndex={-1} className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-modal-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <div className="confirm-actions">
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={pending} onClick={onConfirm}>
            {pending ? pendingLabel ?? `${confirmLabel}…` : confirmLabel}
          </button>
          <button className="btn btn-secondary" ref={cancelRef} disabled={pending} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
