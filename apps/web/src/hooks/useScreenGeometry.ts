"use client";

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { clampScreenGeometry, usableScreenBounds, type Geometry } from "../lib/screenPresentation";

type Operation = { id: string; kind: "move" | "resize"; axis?: "x" | "y"; origin: Geometry; draft: Geometry; startX: number; startY: number; pointer?: number; element: HTMLElement };
const same = (a: Geometry | undefined, b: Geometry) => !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function useScreenGeometry(workspaceRef: RefObject<HTMLElement | null>, trayRef: RefObject<HTMLElement | null>,
  id: string | undefined, committed: Geometry | undefined, commit: (id: string, geometry: Geometry) => void) {
  const [bounds, setBounds] = useState<Geometry | null>(null);
  const [draft, setDraft] = useState<Geometry | null>(null);
  const [instruction, setInstruction] = useState<string | null>(null);
  const operation = useRef<Operation | null>(null);
  const latest = useRef({ id, committed, bounds, commit }); latest.current = { id, committed, bounds, commit };
  const initialHeight = useRef(240);
  const remeasure = useRef<(() => void) | null>(null);
  const awaitingInitialMetadata = useRef(false);

  const finish = useCallback((cancel = false, announce = true) => {
    const op = operation.current;
    operation.current = null; setDraft(null);
    if (!op) return;
    if (op.pointer !== undefined && op.element.hasPointerCapture?.(op.pointer)) op.element.releasePointerCapture(op.pointer);
    const current = latest.current;
    const result = clampScreenGeometry(cancel ? op.origin : op.draft, current.bounds, initialHeight.current);
    if (current.id === op.id && result) {
      current.commit(op.id, result);
      setInstruction(announce ? `${cancel ? "Cancelled. " : ""}Floating stream ${Math.round(result.width)} by ${Math.round(result.height)}, position ${Math.round(result.x)}, ${Math.round(result.y)}.` : null);
    } else setInstruction(null);
  }, []);

  useLayoutEffect(() => {
    awaitingInitialMetadata.current = !!id && !latest.current.committed;
    const measure = () => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      const r = workspace.getBoundingClientRect(), v = window.visualViewport;
      const tray = trayRef.current?.getBoundingClientRect();
      const token = getComputedStyle(workspace).getPropertyValue("--space-2").trim();
      const inset = (parseFloat(token) * (token.endsWith("rem") ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1)) || 8;
      const next = usableScreenBounds({ x: r.left, y: r.top, width: r.width, height: r.height },
        { x: v?.offsetLeft || 0, y: v?.offsetTop || 0, width: v?.width ?? window.innerWidth, height: v?.height ?? window.innerHeight },
        tray && tray.height > 0 ? tray.top : undefined, inset);
      const video = workspace.querySelector<HTMLVideoElement>(".screen-share-detached-card video");
      const chrome = workspace.querySelector<HTMLElement>(".screen-share-floating-chrome");
      const card = chrome?.parentElement;
      const style = card ? getComputedStyle(card) : null;
      const horizontal = style ? (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0) + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0) : 16;
      const vertical = style ? (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0) : 16;
      const hasMetadata = !!(video?.videoWidth && video.videoHeight);
      initialHeight.current = (320 - horizontal) / (hasMetadata ? video!.videoWidth / video!.videoHeight : 16 / 9) + (chrome?.offsetHeight || 60) + vertical;
      if (next && id && hasMetadata && awaitingInitialMetadata.current) {
        awaitingInitialMetadata.current = false;
        const current = latest.current;
        const value = clampScreenGeometry(current.committed ? { ...current.committed, height: initialHeight.current } : undefined, next, initialHeight.current);
        if (value) current.commit(id, value);
      }
      setBounds(previous => next && previous && same(previous, next) ? previous : next);
    };
    remeasure.current = measure;
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (workspaceRef.current) observer?.observe(workspaceRef.current);
    if (trayRef.current) observer?.observe(trayRef.current);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure); window.visualViewport?.addEventListener("scroll", measure);
    document.addEventListener("visibilitychange", measure);
    workspaceRef.current?.addEventListener("loadedmetadata", measure, true);
    const workspace = workspaceRef.current;
    return () => {
      remeasure.current = null;
      observer?.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", measure); workspace?.removeEventListener("loadedmetadata", measure, true);
    };
  }, [id, workspaceRef, trayRef]);

  // Renders can move the tray without resizing it (self-preview or status rows).
  useLayoutEffect(() => { remeasure.current?.(); });

  useLayoutEffect(() => {
    if (id) {
      const result = clampScreenGeometry(committed, bounds, initialHeight.current);
      if (result && !same(committed, result)) commit(id, result);
    }
  }, [id, committed, bounds, commit]);

  useLayoutEffect(() => {
    return () => {
      const op = operation.current; operation.current = null;
      if (op?.pointer !== undefined && op.element.hasPointerCapture?.(op.pointer)) op.element.releasePointerCapture(op.pointer);
    };
  }, [id]);
  useLayoutEffect(() => { setDraft(null); setInstruction(null); }, [id]);

  const begin = (kind: Operation["kind"], element: HTMLElement, pointer?: PointerEvent<HTMLElement>, axis?: Operation["axis"]) => {
    if (!id || !bounds) return;
    if (operation.current) finish();
    const origin = clampScreenGeometry(committed, bounds, initialHeight.current);
    if (!origin) return;
    awaitingInitialMetadata.current = false;
    operation.current = { id, kind, axis, origin, draft: origin, element, startX: pointer?.clientX || 0, startY: pointer?.clientY || 0, pointer: pointer?.pointerId };
    if (pointer) { pointer.preventDefault(); element.setPointerCapture?.(pointer.pointerId); }
    setDraft(origin);
    setInstruction(`${kind === "move" ? "Move" : "Resize"}: arrows 10 pixels, Shift+arrows 1. Enter commits, Escape cancels, Home resets.`);
  };
  const pointerDown = (kind: Operation["kind"], axis?: Operation["axis"]) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    begin(kind, event.currentTarget, event, axis);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const op = operation.current;
    if (!op || op.pointer !== event.pointerId) return;
    const dx = event.clientX - op.startX, dy = event.clientY - op.startY;
    const next = clampScreenGeometry(op.kind === "move" ? { ...op.origin, x: op.origin.x + dx, y: op.origin.y + dy }
      : { ...op.origin, width: Math.max(1, op.origin.width + (op.axis === "y" ? 0 : dx)), height: Math.max(1, op.origin.height + (op.axis === "x" ? 0 : dy)) }, latest.current.bounds);
    if (next) { op.draft = next; setDraft(next); }
  };
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const op = operation.current;
    if (!op || op.pointer !== undefined || op.element !== event.currentTarget) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape", "Home"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === "Enter" || event.key === "Escape") { finish(event.key === "Escape"); return; }
    const step = event.shiftKey ? 1 : 10;
    const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    const next = clampScreenGeometry(event.key === "Home" ? undefined : op.kind === "move" ? { ...op.draft, x: op.draft.x + dx, y: op.draft.y + dy }
      : { ...op.draft, width: Math.max(1, op.draft.width + dx), height: Math.max(1, op.draft.height + dy) }, latest.current.bounds, initialHeight.current);
    if (next) { op.draft = next; setDraft(next); }
  };
  return { geometry: clampScreenGeometry(draft || committed, bounds, initialHeight.current), instruction,
    pointerDown, pointerMove, pointerUp: () => finish(), pointerCancel: () => finish(true), lostPointerCapture: () => finish(true),
    beginKeyboard: (kind: Operation["kind"], element: HTMLElement) => begin(kind, element), keyDown, blur: () => finish(false, false) };
}
