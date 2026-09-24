"use client";

import UserAvatar from "../ui/UserAvatar";

import { useCallback, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { isContextInvokerAvailable } from "../../lib/contextFocus";
import type { VoiceOccupancyMember } from "../../hooks/useVoiceOccupancy";
import type { VoicePersonalMixPreference } from "../../hooks/useVoicePersonalMix";

interface Props {
  member: Pick<VoiceOccupancyMember, "userId" | "username" | "displayName">;
  position: { x: number; y: number };
  preference: VoicePersonalMixPreference;
  onPreferenceChange: (update: Partial<VoicePersonalMixPreference>) => void;
  onClose: () => void;
  returnFocusTo: HTMLElement;
  isSelf: boolean;
  persistenceStatus?: "loading" | "load-error" | "saving" | "save-error" | "saved";
  onRetry?: () => void;
  fallbackFocusTo?: HTMLElement | null;
  roleActions?: ReactNode;
  serverActions?: ReactNode;
  utilityActions?: ReactNode;
  memberStatus?: ReactNode;
  contextPending?: boolean;
}

export default function VoiceParticipantPopover({
  member,
  position,
  preference,
  onPreferenceChange,
  onClose,
  returnFocusTo,
  isSelf,
  persistenceStatus = "saved",
  onRetry,
  fallbackFocusTo, roleActions, serverActions, utilityActions, memberStatus, contextPending = false,
}: Props) {
  const loading = contextPending || persistenceStatus === "loading" || persistenceStatus === "load-error";
  const volumeId = useId();
  const identity = member.displayName || member.username;
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstControlRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fallbackRef = useRef(fallbackFocusTo);
  fallbackRef.current = fallbackFocusTo;

  const adjustPosition = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const bounds = popover.getBoundingClientRect();
    const x = Math.max(8, Math.min(position.x, window.innerWidth - bounds.width - 8));
    const y = Math.max(8, Math.min(position.y, window.innerHeight - bounds.height - 8));
    popover.style.left = `${x}px`;
    popover.style.top = `${y}px`;
  }, [position.x, position.y]);

  // Loading/error copy can resize the menu; reposition without stealing focus.
  useLayoutEffect(adjustPosition);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const restoreFocus = () => {
      const target = [returnFocusTo, fallbackRef.current].find(isContextInvokerAvailable);
      target?.focus({ preventScroll: true });
    };
    const close = () => { restoreFocus(); onCloseRef.current(); };
    const control = firstControlRef.current;
    (control && !control.disabled ? control : popoverRef.current)?.focus();
    const handleMouseDown = (event: MouseEvent) => {
      if (!popover?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !popover?.contains(document.activeElement)) return;
      const controls = Array.from(popover.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)"));
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (index < 0 || (event.shiftKey ? index === 0 : index === controls.length - 1)) {
        event.preventDefault(); close();
      }
    };
    const handleScroll = (event: Event) => { if (!popover?.contains(event.target as Node)) close(); };
    const observer = new MutationObserver(() => {
      if (!isContextInvokerAvailable(returnFocusTo)) close();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);
    return () => {
      observer.disconnect();
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
      if (popover?.contains(document.activeElement) || document.activeElement === document.body) restoreFocus();
    };
  }, [returnFocusTo]);

  return (
    <div
      className="voice-participant-popover"
      ref={popoverRef}
      role="dialog"
      aria-label={`Voice participant: ${identity}`}
      tabIndex={-1}
      style={{ left: position.x, top: position.y }}
    >
      <div className="context-menu-label context-menu-identity avatar-identity"><span className="avatar-identity-image"><UserAvatar userId={member.userId} name={identity} contextOpen /></span>{identity}</div>
      {!isSelf && <>
        {memberStatus}
        {roleActions}
        <div className="member-context-section voice-participant-mix" role="group" aria-label="Voice">
        <div className="voice-participant-volume-heading">
          <label htmlFor={volumeId}>User Volume</label>
          <output htmlFor={volumeId}>{preference.volumePercent}%</output>
        </div>
        <input
          ref={firstControlRef}
          id={volumeId}
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={loading}
          value={preference.volumePercent}
          aria-label={`Volume for ${identity}`}
          aria-valuetext={`${preference.volumePercent} percent`}
          onChange={(event) => onPreferenceChange({ volumePercent: Number(event.target.value) })}
        />
        <label className="voice-participant-local-mute">
          <input
            type="checkbox"
            disabled={loading}
            checked={preference.locallyMuted}
            aria-label={`Mute ${identity} locally`}
            onChange={(event) => onPreferenceChange({ locallyMuted: event.target.checked })}
          />
          Mute locally
        </label>
        {contextPending && <p role="status">Refreshing voice context…</p>}
        {persistenceStatus === "loading" && <p role="status">Loading saved mix…</p>}
        {persistenceStatus === "saving" && <p role="status">Saving…</p>}
        {(persistenceStatus === "load-error" || persistenceStatus === "save-error") && <div role="alert">
          <p>{persistenceStatus === "load-error"
            ? "Could not load saved mix. Call audio stays muted."
            : "Could not save. This mix is only applied here."}</p>
          <button type="button" disabled={contextPending} onClick={onRetry}>Retry</button>
        </div>}
        </div>
        {serverActions}
        {utilityActions}
      </>}
    </div>
  );
}
