"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type Kind = "FULLSCREEN" | "PIP";
type Surface = { container: HTMLElement; video: HTMLVideoElement };
type Owner = Surface & { shareId: string; kind: Kind; trigger: HTMLElement | null };

/** Browser presentation only. Never owns media, subscription or playback policy. */
export function useScreenBrowserPresentation(fallbackRef: RefObject<HTMLElement | null>) {
  const surfaces = useRef(new Map<string, Surface>());
  const active = useRef<Owner | null>(null);
  const pending = useRef<Owner | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const focusAfterChange = useRef<string | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ shareId: string; message: string } | null>(null);

  const isOwned = useCallback((entry: Owner) => entry.kind === "FULLSCREEN"
    ? document.fullscreenElement === entry.container
    : document.pictureInPictureElement === entry.video, []);

  const exitExact = useCallback((entry: Owner): Promise<void> => {
    if (!isOwned(entry)) return Promise.resolve();
    try {
      return Promise.resolve(entry.kind === "FULLSCREEN" ? document.exitFullscreen() : document.exitPictureInPicture());
    } catch (error) { return Promise.reject(error); }
  }, [isOwned]);

  const sync = useCallback(() => {
    if (!mounted.current) return;
    const previous = active.current;
    let next: Owner | null = null;
    for (const [shareId, surface] of surfaces.current) {
      const kind = document.fullscreenElement === surface.container ? "FULLSCREEN"
        : document.pictureInPictureElement === surface.video ? "PIP" : null;
      if (kind) {
        const requested = pending.current;
        next = { ...surface, shareId, kind, trigger: requested?.shareId === shareId ? requested.trigger : previous?.trigger || null };
        break;
      }
    }
    active.current = next;
    setOwner(next);
    if (previous && !next && !document.fullscreenElement && !document.pictureInPictureElement
      && document.hasFocus() && previous.trigger?.isConnected) {
      previous.trigger.focus({ preventScroll: true });
    }
  }, []);

  const register = useCallback((shareId: string, surface: Surface) => {
    surfaces.current.set(shareId, surface);
    // PiP events are listened on the real video as well as fullscreen on Document.
    surface.video.addEventListener("enterpictureinpicture", sync);
    surface.video.addEventListener("leavepictureinpicture", sync);
    return () => {
      surface.video.removeEventListener("enterpictureinpicture", sync);
      surface.video.removeEventListener("leavepictureinpicture", sync);
      if (surfaces.current.get(shareId) !== surface) return;
      surfaces.current.delete(shareId);
      const entry = active.current?.shareId === shareId ? active.current : pending.current?.shareId === shareId ? pending.current : null;
      if (entry) {
        if (document.activeElement === document.body || entry.container.contains(document.activeElement)) focusAfterChange.current = shareId;
        generation.current++;
        active.current = null;
        pending.current = null;
        // Terminal/remount cleanup wins over a denied exit: the visual binding
        // is cleared by ScreenStreamVideo and a late request exits only this owner.
        void exitExact(entry).catch(() => undefined);
        if (mounted.current) { setOwner(null); setPendingShareId(null); }
      }
      if (mounted.current) setFeedback((value) => value?.shareId === shareId ? null : value);
    };
  }, [exitExact, sync]);

  // After a remount/terminal removal, the original browser trigger may no longer
  // exist. Restore focus to the surviving controls, or to the chat workspace.
  useEffect(() => {
    const shareId = focusAfterChange.current;
    if (!shareId) return;
    focusAfterChange.current = null;
    if (!document.hasFocus() || document.fullscreenElement || document.pictureInPictureElement) return;
    const entry = surfaces.current.get(shareId)?.container.querySelector<HTMLElement>(".screen-share-controls-entry");
    const root = fallbackRef.current;
    const row = [...(root?.querySelectorAll<HTMLElement>("[data-placement-share]") || [])].find(element => element.dataset.placementShare === shareId);
    const restored = row?.querySelector<HTMLElement>("[data-restore-control]");
    (entry || restored || root?.querySelector<HTMLElement>("[data-restore-control], .screen-share-controls-entry")
      || document.querySelector<HTMLElement>(".user-panel-btn.screen-share-control:not(:disabled)") || root)?.focus({ preventScroll: true });
  });

  useEffect(() => {
    mounted.current = true;
    document.addEventListener("fullscreenchange", sync);
    return () => {
      mounted.current = false;
      generation.current++;
      document.removeEventListener("fullscreenchange", sync);
      const entry = active.current || pending.current;
      active.current = null;
      pending.current = null;
      if (entry) void exitExact(entry).catch(() => undefined);
    };
  }, [exitExact, sync]);

  const request = useCallback((shareId: string, kind: Kind, trigger: HTMLElement) => {
    const surface = surfaces.current.get(shareId);
    if (!surface || pending.current) return;
    if (document.fullscreenElement || document.pictureInPictureElement) {
      setFeedback({ shareId, message: "Exit the current browser presentation first." });
      return;
    }
    const entry: Owner = { ...surface, shareId, kind, trigger };
    const token = ++generation.current;
    pending.current = entry;
    setPendingShareId(shareId);
    setFeedback(null);
    let operation: Promise<unknown>;
    try {
      // Invoke before awaiting anything: both APIs depend on user activation.
      operation = kind === "FULLSCREEN" ? surface.container.requestFullscreen() : surface.video.requestPictureInPicture();
    } catch (error) { operation = Promise.reject(error); }
    void Promise.resolve(operation).then(async () => {
      if (!mounted.current || token !== generation.current || surfaces.current.get(shareId) !== surface) {
        // React may reuse this DOM element for a newer stream generation. A
        // retired promise must not close a newer owner of that same element.
        const current = active.current || pending.current;
        if (!current || !isOwned(current)) await exitExact(entry).catch(() => undefined);
        return;
      }
      sync(); // The actual browser element is authoritative, never this promise.
    }).catch(() => {
      if (mounted.current && token === generation.current) {
        setFeedback({ shareId, message: kind === "FULLSCREEN" ? "Unable to enter fullscreen. Try again." : "Unable to open Picture-in-Picture. Try again." });
      }
    }).finally(() => {
      if (mounted.current && token === generation.current) { pending.current = null; setPendingShareId(null); }
    });
  }, [exitExact, isOwned, sync]);

  const exit = useCallback(async () => {
    if (pending.current) return false;
    const entry = active.current;
    if (!entry) return true;
    const token = ++generation.current;
    pending.current = entry;
    setPendingShareId(entry.shareId);
    setFeedback(null);
    try {
      await exitExact(entry);
      if (!mounted.current || token !== generation.current) return false;
      sync();
      if (isOwned(entry)) throw new Error("Browser presentation still active");
      return true;
    } catch {
      if (mounted.current && token === generation.current) setFeedback({ shareId: entry.shareId, message: "Unable to exit browser presentation. Exit it in the browser, then try again." });
      return false;
    } finally {
      if (mounted.current && token === generation.current) { pending.current = null; setPendingShareId(null); }
    }
  }, [exitExact, isOwned, sync]);

  const beforePresentationChange = useCallback((action: () => void, affectedShareIds?: string[]) => {
    const affects = (shareId: string) => !affectedShareIds || affectedShareIds.includes(shareId);
    if (pending.current && affects(pending.current.shareId)) return;
    if (!active.current || !affects(active.current.shareId)) { action(); return; }
    const shareId = active.current.shareId;
    void exit().then((exited) => {
      if (exited && mounted.current) { focusAfterChange.current = shareId; action(); }
    });
  }, [exit]);

  return { owner, pendingShareId, feedback, register, request, exit, beforePresentationChange,
    dismissFeedback: () => setFeedback(null) };
}

export type ScreenBrowserPresentation = ReturnType<typeof useScreenBrowserPresentation>;
