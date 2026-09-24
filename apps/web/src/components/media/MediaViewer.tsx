"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Attachment } from "../../hooks/useMessages";
import { attachmentApi } from "../../lib/api";
import { CloseIcon } from "../ui/icons";

const MEDIA_VIEWER_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const MAX_SCALE = 4;
const ZOOM_FACTOR = 1.25;
const GEOMETRY_EPSILON = 0.000001;

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; naturalWidth: number; naturalHeight: number }
  | { status: "error" };

type TransformMode = "fit" | "actual" | "manual";

interface TransformState {
  mode: TransformMode;
  scale: number;
  panX: number;
  panY: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface SelectedMediaState {
  attachmentId: string;
  retryVersion: number;
  loadState: LoadState;
  transform: TransformState;
}

interface ActivePointer {
  id: number;
  attachmentId: string;
  x: number;
  y: number;
}

interface Props {
  attachment: Attachment;
  currentIndex: number;
  attachmentCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

const INITIAL_TRANSFORM: TransformState = { mode: "fit", scale: 1, panX: 0, panY: 0 };
const EMPTY_VIEWPORT: ViewportSize = { width: 0, height: 0 };

export function isMediaViewerEligible(attachment: Attachment) {
  return MEDIA_VIEWER_MIME_TYPES.has(attachment.mimeType);
}

export function mediaViewerFitScale(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (![naturalWidth, naturalHeight, viewportWidth, viewportHeight]
    .every((value) => Number.isFinite(value) && value > 0)) return null;
  return Math.min(1, viewportWidth / naturalWidth, viewportHeight / naturalHeight);
}

export function mediaViewerPanBounds(
  naturalWidth: number,
  naturalHeight: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (![naturalWidth, naturalHeight, scale, viewportWidth, viewportHeight]
    .every((value) => Number.isFinite(value) && value > 0)) return { maxPanX: 0, maxPanY: 0 };
  return {
    maxPanX: Math.max(0, (naturalWidth * scale - viewportWidth) / 2),
    maxPanY: Math.max(0, (naturalHeight * scale - viewportHeight) / 2),
  };
}

export function clampMediaViewerPan(
  panX: number,
  panY: number,
  bounds: { maxPanX: number; maxPanY: number },
) {
  const safePanX = Number.isFinite(panX) ? panX : 0;
  const safePanY = Number.isFinite(panY) ? panY : 0;
  return {
    panX: Math.max(-bounds.maxPanX, Math.min(safePanX, bounds.maxPanX)),
    panY: Math.max(-bounds.maxPanY, Math.min(safePanY, bounds.maxPanY)),
  };
}

function createSelectedMediaState(attachmentId: string): SelectedMediaState {
  return {
    attachmentId,
    retryVersion: 0,
    loadState: { status: "loading" },
    transform: { ...INITIAL_TRANSFORM },
  };
}

function clampScale(scale: number, fitScale: number) {
  const safeScale = Number.isFinite(scale) ? scale : fitScale;
  return Math.max(fitScale, Math.min(safeScale, MAX_SCALE));
}

function reconcileTransformForViewport(state: SelectedMediaState, viewport: ViewportSize): SelectedMediaState {
  if (state.loadState.status !== "loaded") return state;
  const { naturalWidth, naturalHeight } = state.loadState;
  const fitScale = mediaViewerFitScale(naturalWidth, naturalHeight, viewport.width, viewport.height);
  if (fitScale === null) return state;

  const scale = state.transform.mode === "fit"
    ? fitScale
    : state.transform.mode === "actual"
      ? 1
      : clampScale(state.transform.scale, fitScale);
  const bounds = mediaViewerPanBounds(naturalWidth, naturalHeight, scale, viewport.width, viewport.height);
  const pan = state.transform.mode === "fit"
    ? { panX: 0, panY: 0 }
    : clampMediaViewerPan(state.transform.panX, state.transform.panY, bounds);
  if (scale === state.transform.scale && pan.panX === state.transform.panX && pan.panY === state.transform.panY) {
    return state;
  }
  return { ...state, transform: { ...state.transform, scale, ...pan } };
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches("input, textarea, select")
    || target.isContentEditable
    || Boolean(target.closest("[contenteditable]:not([contenteditable='false'])"));
}

function safeExitFullscreen() {
  if (typeof document.exitFullscreen !== "function") return;
  try {
    void Promise.resolve(document.exitFullscreen()).catch(() => undefined);
  } catch {
    // The browser remains authoritative through fullscreenElement/fullscreenchange.
  }
}

export default function MediaViewer({
  attachment,
  currentIndex,
  attachmentCount,
  onPrevious,
  onNext,
  onClose,
}: Props) {
  const [mediaState, setMediaState] = useState<SelectedMediaState>(() => createSelectedMediaState(attachment.id));
  const [viewportSize, setViewportSize] = useState<ViewportSize>(EMPTY_VIEWPORT);
  const [dragging, setDragging] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenOwned, setFullscreenOwned] = useState(false);
  const [fullscreenPending, setFullscreenPending] = useState(false);
  const [fullscreenFailure, setFullscreenFailure] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedAttachmentIdRef = useRef(attachment.id);
  const viewportSizeRef = useRef(EMPTY_VIEWPORT);
  const activePointerRef = useRef<ActivePointer | null>(null);
  const mountedRef = useRef(true);
  const fullscreenRequestTokenRef = useRef(0);
  const closeExitRequestedRef = useRef(false);
  const measureViewportRef = useRef<() => void>(() => undefined);
  selectedAttachmentIdRef.current = attachment.id;

  const hasCarousel = attachmentCount > 1;
  const canGoPrevious = hasCarousel && currentIndex > 0;
  const canGoNext = hasCarousel && currentIndex < attachmentCount - 1;
  const mediaUrl = attachmentApi.downloadUrl(attachment.id);
  const currentMediaState = mediaState.attachmentId === attachment.id
    ? mediaState
    : createSelectedMediaState(attachment.id);
  const { loadState, retryVersion, transform } = currentMediaState;
  const fitScale = loadState.status === "loaded"
    ? mediaViewerFitScale(
      loadState.naturalWidth,
      loadState.naturalHeight,
      viewportSize.width,
      viewportSize.height,
    )
    : null;
  const transformEnabled = loadState.status === "loaded" && fitScale !== null;
  const panBounds = transformEnabled
    ? mediaViewerPanBounds(
      loadState.naturalWidth,
      loadState.naturalHeight,
      transform.scale,
      viewportSize.width,
      viewportSize.height,
    )
    : { maxPanX: 0, maxPanY: 0 };
  const pannable = transformEnabled
    && (panBounds.maxPanX > GEOMETRY_EPSILON || panBounds.maxPanY > GEOMETRY_EPSILON);
  const canZoomOut = transformEnabled && transform.scale > (fitScale ?? 1) + GEOMETRY_EPSILON;
  const canZoomIn = transformEnabled && transform.scale < MAX_SCALE - GEOMETRY_EPSILON;
  const effectivePercent = transformEnabled ? Math.round(transform.scale * 100) : null;
  const imageStyle: CSSProperties | undefined = transformEnabled ? {
    width: `${loadState.naturalWidth}px`,
    height: `${loadState.naturalHeight}px`,
    transform: `translate(-50%, -50%) translate3d(${transform.panX}px, ${transform.panY}px, 0) scale(${transform.scale})`,
  } : undefined;

  const finishPointer = useCallback((element = stageRef.current, updateState = true) => {
    const active = activePointerRef.current;
    if (active && element?.releasePointerCapture) {
      try {
        if (!element.hasPointerCapture || element.hasPointerCapture(active.id)) {
          element.releasePointerCapture(active.id);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
    activePointerRef.current = null;
    if (updateState && mountedRef.current) setDragging(false);
  }, []);

  useLayoutEffect(() => {
    finishPointer();
    setMediaState((current) => current.attachmentId === attachment.id
      ? current
      : createSelectedMediaState(attachment.id));
    setFullscreenFailure(null);
  }, [attachment.id, finishPointer]);

  useLayoutEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let active = true;

    const commitSize = (width: number, height: number) => {
      if (!active) return;
      const next = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        ? { width, height }
        : EMPTY_VIEWPORT;
      viewportSizeRef.current = next;
      setViewportSize((current) => current.width === next.width && current.height === next.height ? current : next);
      setMediaState((current) => reconcileTransformForViewport(current, next));
    };
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      commitSize(rect.width, rect.height);
    };
    measureViewportRef.current = measure;
    measure();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === stage);
        if (entry) commitSize(entry.contentRect.width, entry.contentRect.height);
        else measure();
      });
      observer.observe(stage);
      return () => {
        active = false;
        observer.disconnect();
        measureViewportRef.current = () => undefined;
      };
    }

    window.addEventListener("resize", measure);
    return () => {
      active = false;
      window.removeEventListener("resize", measure);
      measureViewportRef.current = () => undefined;
    };
  }, []);

  useLayoutEffect(() => {
    const container = dialogRef.current;
    if (!container) return;
    const supported = typeof container.requestFullscreen === "function"
      && typeof document.exitFullscreen === "function";
    setFullscreenSupported(supported);

    const syncFullscreenState = () => {
      if (!mountedRef.current) return;
      const owned = document.fullscreenElement === container;
      setFullscreenOwned(owned);
      setFullscreenPending(false);
      if (owned) setFullscreenFailure(null);
      measureViewportRef.current();
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      fullscreenRequestTokenRef.current += 1;
      finishPointer(stageRef.current, false);
      const container = dialogRef.current;
      if (container && document.fullscreenElement === container && !closeExitRequestedRef.current) {
        safeExitFullscreen();
      }
    };
  }, [finishPointer]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const active = document.activeElement as HTMLElement | null;
    if (!active || !dialog.contains(active) || active.matches(":disabled")) {
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [attachment.id, canGoNext, canGoPrevious, fullscreenOwned, fullscreenPending, loadState.status, transformEnabled]);

  const setFit = useCallback(() => {
    finishPointer();
    const viewport = viewportSizeRef.current;
    setMediaState((current) => {
      if (current.attachmentId !== selectedAttachmentIdRef.current || current.loadState.status !== "loaded") return current;
      const nextFitScale = mediaViewerFitScale(
        current.loadState.naturalWidth,
        current.loadState.naturalHeight,
        viewport.width,
        viewport.height,
      );
      if (nextFitScale === null) return current;
      return { ...current, transform: { mode: "fit", scale: nextFitScale, panX: 0, panY: 0 } };
    });
  }, [finishPointer]);

  const setActual = useCallback(() => {
    finishPointer();
    setMediaState((current) => current.attachmentId === selectedAttachmentIdRef.current
      && current.loadState.status === "loaded"
      ? { ...current, transform: { mode: "actual", scale: 1, panX: 0, panY: 0 } }
      : current);
  }, [finishPointer]);

  const zoomBy = useCallback((factor: number) => {
    finishPointer();
    const viewport = viewportSizeRef.current;
    setMediaState((current) => {
      if (current.attachmentId !== selectedAttachmentIdRef.current || current.loadState.status !== "loaded") return current;
      const nextFitScale = mediaViewerFitScale(
        current.loadState.naturalWidth,
        current.loadState.naturalHeight,
        viewport.width,
        viewport.height,
      );
      if (nextFitScale === null) return current;
      const nextScale = clampScale(current.transform.scale * factor, nextFitScale);
      if (Math.abs(nextScale - current.transform.scale) <= GEOMETRY_EPSILON) return current;
      const panRatio = current.transform.scale > 0 ? nextScale / current.transform.scale : 1;
      const bounds = mediaViewerPanBounds(
        current.loadState.naturalWidth,
        current.loadState.naturalHeight,
        nextScale,
        viewport.width,
        viewport.height,
      );
      const pan = clampMediaViewerPan(
        current.transform.panX * panRatio,
        current.transform.panY * panRatio,
        bounds,
      );
      return { ...current, transform: { mode: "manual", scale: nextScale, ...pan } };
    });
  }, [finishPointer]);

  const toggleFullscreen = useCallback(() => {
    const container = dialogRef.current;
    if (!container || fullscreenPending || typeof document.exitFullscreen !== "function"
      || typeof container.requestFullscreen !== "function") return;
    const exiting = document.fullscreenElement === container;
    const token = fullscreenRequestTokenRef.current + 1;
    fullscreenRequestTokenRef.current = token;
    setFullscreenFailure(null);
    setFullscreenPending(true);

    let operation: Promise<void>;
    try {
      operation = Promise.resolve(exiting ? document.exitFullscreen() : container.requestFullscreen());
    } catch {
      setFullscreenPending(false);
      setFullscreenFailure(exiting ? "Unable to exit fullscreen" : "Unable to enter fullscreen");
      return;
    }

    void operation.then(() => {
      if (!mountedRef.current) {
        if (!exiting && document.fullscreenElement === container) safeExitFullscreen();
        return;
      }
      if (fullscreenRequestTokenRef.current === token) setFullscreenPending(false);
    }).catch(() => {
      if (!mountedRef.current || fullscreenRequestTokenRef.current !== token) return;
      setFullscreenPending(false);
      setFullscreenFailure(exiting ? "Unable to exit fullscreen" : "Unable to enter fullscreen");
    });
  }, [fullscreenPending]);

  const closeViewer = useCallback(() => {
    finishPointer();
    const container = dialogRef.current;
    if (container && document.fullscreenElement === container && typeof document.exitFullscreen === "function") {
      closeExitRequestedRef.current = true;
      safeExitFullscreen();
    }
    onClose();
  }, [finishPointer, onClose]);

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
        if (focusable.length === 0) {
          event.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
        return;
      }

      if (isTextEntryTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        const container = dialogRef.current;
        if (container && document.fullscreenElement === container && typeof document.exitFullscreen === "function") {
          toggleFullscreen();
        } else {
          closeViewer();
        }
        return;
      }
      if (event.shiftKey && event.key !== "+" && event.key !== "F") return;

      if (event.key === "ArrowLeft" && hasCarousel) {
        event.preventDefault();
        event.stopPropagation();
        if (canGoPrevious) onPrevious();
      } else if (event.key === "ArrowRight" && hasCarousel) {
        event.preventDefault();
        event.stopPropagation();
        if (canGoNext) onNext();
      } else if ((event.key === "+" || event.key === "=") && canZoomIn) {
        event.preventDefault();
        zoomBy(ZOOM_FACTOR);
      } else if (event.key === "-" && canZoomOut) {
        event.preventDefault();
        zoomBy(1 / ZOOM_FACTOR);
      } else if (event.key === "0" && transformEnabled) {
        event.preventDefault();
        setActual();
      } else if ((event.key === "f" || event.key === "F") && transformEnabled) {
        event.preventDefault();
        setFit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoNext,
    canGoPrevious,
    canZoomIn,
    canZoomOut,
    closeViewer,
    hasCarousel,
    onNext,
    onPrevious,
    setActual,
    setFit,
    toggleFullscreen,
    transformEnabled,
    zoomBy,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pannable || event.button !== 0 || activePointerRef.current) return;
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      return;
    }
    activePointerRef.current = {
      id: event.pointerId,
      attachmentId: attachment.id,
      x: event.clientX,
      y: event.clientY,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activePointerRef.current;
    if (!active || active.id !== event.pointerId || active.attachmentId !== attachment.id) return;
    event.preventDefault();
    const deltaX = event.clientX - active.x;
    const deltaY = event.clientY - active.y;
    activePointerRef.current = { ...active, x: event.clientX, y: event.clientY };
    const viewport = viewportSizeRef.current;
    setMediaState((current) => {
      if (current.attachmentId !== active.attachmentId || current.loadState.status !== "loaded") return current;
      const bounds = mediaViewerPanBounds(
        current.loadState.naturalWidth,
        current.loadState.naturalHeight,
        current.transform.scale,
        viewport.width,
        viewport.height,
      );
      const pan = clampMediaViewerPan(
        current.transform.panX + deltaX,
        current.transform.panY + deltaY,
        bounds,
      );
      if (pan.panX === current.transform.panX && pan.panY === current.transform.panY) return current;
      return { ...current, transform: { ...current.transform, ...pan } };
    });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current?.id === event.pointerId) finishPointer(event.currentTarget);
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current?.id !== event.pointerId) return;
    activePointerRef.current = null;
    setDragging(false);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="media-viewer-layer"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        ref={dialogRef}
        className="media-viewer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Media viewer — ${attachment.fileName}`}
        tabIndex={-1}
      >
        <header className="media-viewer-header">
          <div className="media-viewer-heading">
            <strong className="media-viewer-filename">{attachment.fileName}</strong>
            {hasCarousel ? <span className="media-viewer-position">{currentIndex + 1} of {attachmentCount}</span> : null}
          </div>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon media-viewer-close" aria-label="Close media viewer" onClick={closeViewer}>
            <CloseIcon />
          </button>
        </header>

        <div
          ref={stageRef}
          className={`media-viewer-stage ${pannable ? "is-pannable" : ""} ${dragging ? "is-dragging" : ""}`}
          data-transform-mode={transform.mode}
          data-scale={transformEnabled ? transform.scale : undefined}
          data-pan-x={transformEnabled ? transform.panX : undefined}
          data-pan-y={transformEnabled ? transform.panY : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handleLostPointerCapture}
        >
          <img
            key={`${attachment.id}:${retryVersion}`}
            src={mediaUrl}
            alt={attachment.fileName}
            className={`media-viewer-image ${transformEnabled ? "is-loaded" : ""}`}
            draggable={false}
            style={imageStyle}
            onDragStart={(event) => event.preventDefault()}
            onLoad={(event) => {
              const naturalWidth = event.currentTarget.naturalWidth;
              const naturalHeight = event.currentTarget.naturalHeight;
              setMediaState((current) => {
                if (selectedAttachmentIdRef.current !== attachment.id
                  || current.attachmentId !== attachment.id
                  || current.retryVersion !== retryVersion) return current;
                if (![naturalWidth, naturalHeight].every((value) => Number.isFinite(value) && value > 0)) {
                  return { ...current, loadState: { status: "error" }, transform: { ...INITIAL_TRANSFORM } };
                }
                const next: SelectedMediaState = {
                  ...current,
                  loadState: { status: "loaded", naturalWidth, naturalHeight },
                  transform: { ...INITIAL_TRANSFORM },
                };
                return reconcileTransformForViewport(next, viewportSizeRef.current);
              });
            }}
            onError={() => {
              finishPointer();
              setMediaState((current) => selectedAttachmentIdRef.current === attachment.id
                && current.attachmentId === attachment.id
                && current.retryVersion === retryVersion
                ? { ...current, loadState: { status: "error" }, transform: { ...INITIAL_TRANSFORM } }
                : current);
            }}
          />

          {loadState.status === "loading" ? (
            <div className="media-viewer-status" role="status" aria-live="polite">Loading media…</div>
          ) : null}
          {loadState.status === "error" ? (
            <div className="media-viewer-error" role="alert">
              <span>Media unavailable</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  finishPointer();
                  setMediaState((current) => current.attachmentId === attachment.id
                    ? {
                      ...current,
                      retryVersion: current.retryVersion + 1,
                      loadState: { status: "loading" },
                      transform: { ...INITIAL_TRANSFORM },
                    }
                    : current);
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {hasCarousel ? (
            <>
              <button
                type="button"
                className="btn btn-secondary media-viewer-nav media-viewer-previous"
                aria-label="Previous image"
                disabled={!canGoPrevious}
                onClick={onPrevious}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary media-viewer-nav media-viewer-next"
                aria-label="Next image"
                disabled={!canGoNext}
                onClick={onNext}
              >
                <span aria-hidden="true">›</span>
              </button>
            </>
          ) : null}
        </div>

        <footer className="media-viewer-footer">
          <div className="media-viewer-details" aria-live="polite">
            {loadState.status === "loaded" && loadState.naturalWidth > 0 && loadState.naturalHeight > 0
              ? `${loadState.naturalWidth} × ${loadState.naturalHeight}`
              : attachment.mimeType}
          </div>
          <div className="media-viewer-transform-controls" role="group" aria-label="Image transform controls">
            <button type="button" className="btn btn-secondary btn-icon" aria-label="Zoom out" disabled={!canZoomOut} onClick={() => zoomBy(1 / ZOOM_FACTOR)}>
              <span aria-hidden="true">−</span>
            </button>
            <span className="media-viewer-zoom-level" aria-label="Zoom level">
              {effectivePercent === null ? "—" : `${effectivePercent}%`}
            </span>
            <button type="button" className="btn btn-secondary btn-icon" aria-label="Zoom in" disabled={!canZoomIn} onClick={() => zoomBy(ZOOM_FACTOR)}>
              <span aria-hidden="true">+</span>
            </button>
            <button type="button" className="btn btn-secondary media-viewer-transform-action" disabled={!transformEnabled || transform.mode === "fit"} onClick={setFit}>Fit</button>
            <button type="button" className="btn btn-secondary media-viewer-transform-action" disabled={!transformEnabled || (transform.mode === "actual" && transform.panX === 0 && transform.panY === 0)} onClick={setActual}>100%</button>
            {fullscreenSupported ? (
              <button
                type="button"
                className="btn btn-secondary media-viewer-transform-action"
                aria-label={fullscreenOwned ? "Exit fullscreen" : "Enter fullscreen"}
                aria-pressed={fullscreenOwned}
                disabled={fullscreenPending}
                onClick={toggleFullscreen}
              >
                {fullscreenOwned ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            ) : null}
          </div>
          <div className="media-viewer-actions">
            <a className="btn btn-secondary media-viewer-action" href={mediaUrl} target="_blank" rel="noopener noreferrer">
              Open Original
            </a>
            <a className="btn btn-primary media-viewer-action" href={mediaUrl} download={attachment.fileName}>
              Download
            </a>
          </div>
          {fullscreenFailure ? <span className="media-viewer-fullscreen-status" role="status">{fullscreenFailure}</span> : null}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
