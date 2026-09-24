"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import ScreenShareMedia from "./ScreenShareMedia";
import ScreenSharePresenterCard from "./ScreenSharePresenterCard";
import { useScreenBrowserPresentation } from "../../hooks/useScreenBrowserPresentation";
import { useScreenGeometry } from "../../hooks/useScreenGeometry";
import { centralIds, detachedId, initialPresentation, screenPresentationReducer, type Geometry, type PresentationAction, type RemotePlacement, type SelfMode } from "../../lib/screenPresentation";

export type PresentationMode = RemotePlacement["mode"];
export interface ViewerStream {
  shareId: string; presenterId: string; presenterName: string;
  volume?: number; muted?: boolean; audioAvailable?: boolean; stream: MediaStream | null | undefined;
}
export interface SelfShare { shareId: string; stream: MediaStream | null; viewerNames: string[]; onStop: () => void; stopping?: boolean }
interface Props {
  streams: ViewerStream[];
  onLeaveStream: (shareId: string) => void;
  onPresentationChange: (shareId: string, mode: PresentationMode) => void;
  onVolumeChange?: (shareId: string, volume: number) => void;
  onMuteChange?: (shareId: string, muted: boolean) => void;
  selfShare?: SelfShare;
  children: React.ReactNode;
}

export default function ScreenShareViewerWorkspace({ streams, onLeaveStream, onPresentationChange, onVolumeChange, onMuteChange, selfShare, children }: Props) {
  const workspaceRef = useRef<HTMLDivElement>(null), trayRef = useRef<HTMLDivElement>(null);
  const browser = useScreenBrowserPresentation(workspaceRef);
  const [state, dispatch] = useReducer(screenPresentationReducer, undefined, () => screenPresentationReducer(initialPresentation, { type: "SYNC", ids: streams.map(s => s.shareId), selfId: selfShare?.shareId }));
  const latest = useRef({ streams, state }); latest.current = { streams, state };
  const [hiding, setHiding] = useState<string[]>([]);
  const hidingRef = useRef(new Set<string>());
  const focusNext = useRef<string | null>(null);
  const focusedShare = useRef<string | null>(null);
  const [rowMore, setRowMore] = useState<string | null>(null);
  const idsKey = JSON.stringify(streams.map(s => s.shareId));
  useLayoutEffect(() => {
    const ids: string[] = JSON.parse(idsKey);
    if (focusedShare.current && !ids.includes(focusedShare.current)) {
      focusNext.current = ids[0] || "workspace";
      focusedShare.current = null;
    }
    dispatch({ type: "SYNC", ids, selfId: selfShare?.shareId });
    hidingRef.current.forEach(id => { if (!ids.includes(id)) hidingRef.current.delete(id); });
    setHiding(previous => previous.filter(id => ids.includes(id)));
    setRowMore(previous => previous && ids.includes(previous) ? previous : null);
  }, [idsKey, selfShare?.shareId]);

  useEffect(() => {
    streams.forEach(stream => onPresentationChange(stream.shareId, hidingRef.current.has(stream.shareId) || state.leaving.includes(stream.shareId)
      ? "HIDDEN" : state.placements[stream.shareId]?.mode || "CENTRAL"));
  }, [streams, state.placements, state.leaving, hiding, onPresentationChange]);

  const completeHide = useCallback((id: string) => {
    if (!hidingRef.current.delete(id)) return;
    if (latest.current.streams.some(s => s.shareId === id)) { dispatch({ type: "HIDE", id }); focusNext.current = id; }
    setHiding(previous => previous.filter(value => value !== id));
  }, []);
  useEffect(() => {
    hiding.forEach(id => {
      if (browser.owner?.shareId !== id && browser.pendingShareId !== id) completeHide(id);
    });
  }, [browser.owner, browser.pendingShareId, hiding, completeHide]);

  const transition = (action: PresentationAction, affected: string[] = []) => {
    if ("id" in action && hidingRef.current.has(action.id)) return;
    browser.beforePresentationChange(() => {
      if ("id" in action && !latest.current.streams.some(s => s.shareId === action.id)) return;
      if ("id" in action) focusNext.current = action.id;
      else if (action.type === "SELF") focusNext.current = "self";
      else if (action.type === "BACK_TO_CHAT") focusNext.current = centralIds(latest.current.state)[0] || null;
      dispatch(action);
    }, affected);
  };
  const hide = (id: string) => {
    if (!latest.current.state.placements[id] || latest.current.state.placements[id].mode === "HIDDEN") return;
    hidingRef.current.add(id); setHiding([...hidingRef.current]);
    onPresentationChange(id, "HIDDEN"); // Transaction guard closes before awaiting browser exit.
    browser.beforePresentationChange(() => completeHide(id), [id]);
  };
  const leave = (id: string) => browser.beforePresentationChange(() => {
    if (!latest.current.streams.some(s => s.shareId === id)) return;
    hidingRef.current.delete(id); setHiding(previous => previous.filter(value => value !== id));
    onPresentationChange(id, "HIDDEN"); dispatch({ type: "LEAVE", id }); focusNext.current = id; onLeaveStream(id);
  }, [id]);

  useLayoutEffect(() => {
    const id = focusNext.current;
    if (!id || !document.hasFocus()) return;
    focusNext.current = null;
    const root = workspaceRef.current;
    const shareRegion = [...(root?.querySelectorAll<HTMLElement>("[data-placement-share]") || [])].find(node => node.dataset.placementShare === id);
    const target = id === "self" ? root?.querySelector<HTMLElement>(".screen-share-self-actions button")
      : shareRegion?.querySelector<HTMLElement>("[data-restore-control]") || shareRegion?.querySelector<HTMLElement>(".screen-share-controls-entry") || shareRegion?.querySelector<HTMLElement>("button");
    (target || root?.querySelector<HTMLElement>("[data-restore-control], .screen-share-controls-entry") || document.querySelector<HTMLElement>(".user-panel-btn.screen-share-control:not(:disabled)") || root)?.focus({ preventScroll: true });
  });

  const central = streams.filter(s => state.placements[s.shareId]?.mode === "CENTRAL" && !state.leaving.includes(s.shareId));
  const floatingId = detachedId(state);
  const floating = streams.find(s => s.shareId === floatingId);
  const commitGeometry = useCallback((id: string, value: Geometry) => dispatch({ type: "GEOMETRY", id, value }), []);
  const geometry = useScreenGeometry(workspaceRef, trayRef, floating?.shareId, floating ? state.geometry[floating.shareId] : undefined, commitGeometry);
  const self = selfShare && state.self?.shareId === selfShare.shareId ? state.self : null;
  const promoted = self?.mode === "PROMOTED";
  const focusedId = state.layout.mode === "FOCUS" ? state.layout.shareId : null;
  const focusMode = promoted || !!focusedId;
  const rows = streams.filter(s => ["MINIMIZED", "HIDDEN"].includes(state.placements[s.shareId]?.mode) || state.leaving.includes(s.shareId));
  const button = (label: string, onClick: () => void, disabled = false, title?: string) => <button type="button" className="screen-share-icon-button" aria-label={label} title={title} disabled={disabled} onClick={onClick}>{label.includes("'s stream") ? label.split(" ")[0] : label}</button>;
  const actions = (stream: ViewerStream) => <>
    {button(`Minimize ${stream.presenterName}'s stream`, () => transition({ type: "MINIMIZE", id: stream.shareId }, [stream.shareId]), hiding.includes(stream.shareId))}
    {button(`Hide ${stream.presenterName}'s stream`, () => hide(stream.shareId))}
  </>;
  const selfCard = selfShare && self ? <ScreenSharePresenterCard stream={selfShare.stream} viewerNames={selfShare.viewerNames} mode={self.mode}
    onModeChange={(mode: SelfMode) => transition({ type: "SELF", mode })} onStop={selfShare.onStop} stopping={selfShare.stopping} /> : null;
  const media = (stream: ViewerStream, detached = false, compact = false) => <ScreenShareMedia shareId={stream.shareId} presenterName={stream.presenterName}
    stream={stream.stream} presentation={detached ? "detached" : "central"} compact={compact} volume={stream.volume ?? 1} muted={stream.muted ?? false}
    audioAvailable={stream.audioAvailable ?? false} onVolumeChange={onVolumeChange} onMuteChange={onMuteChange} onLeave={() => leave(stream.shareId)}
    browser={browser} presentationActions={actions(stream)} onRestore={detached ? () => transition({ type: "POP_IN", id: stream.shareId }, [stream.shareId]) : undefined} />;

  return <div ref={workspaceRef} tabIndex={-1} aria-label="Stream and chat workspace" className="main-content screen-share-presentation-workspace" data-testid="viewer-presentation-workspace" data-self-preview={!!self && !promoted}
    onFocusCapture={event => { focusedShare.current = (event.target as HTMLElement).closest<HTMLElement>("[data-placement-share]")?.dataset.placementShare || null; }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedShare.current = null; }}>
    {central.length > 0 || promoted ? <div className={`screen-share-central-grid ${central.length === 1 && !promoted ? "single-stream" : ""} ${focusMode ? "focus-mode" : "grid-mode"}`} data-testid="central-stream-surface">
      <div className="screen-share-workspace-toolbar"><span>{central.length} live stream{central.length === 1 ? "" : "s"} · {focusMode ? "Focus" : "Gallery"}</span>
        <span className="screen-share-stream-actions">{focusMode && button("Grid view", () => transition({ type: "GALLERY" }))}
          {button("Back to chat", () => transition({ type: "BACK_TO_CHAT" }, central.map(s => s.shareId)))}</span></div>
      {floating && <span className="screen-share-slot-help">Pop in the floating stream first to detach another.</span>}
      <div className={`screen-share-gallery-grid stream-count-${Math.min(central.length, 4)} ${focusMode ? "screen-share-independent-focus" : ""}`} data-testid="gallery-workspace"
        style={focusMode ? { gridTemplateRows: `repeat(${Math.max(1, central.length - (promoted ? 0 : 1))}, max-content) minmax(0, 1fr)` } : undefined}>
        {promoted && <div className="screen-share-self-primary" data-testid="self-primary">{selfCard}</div>}
        {central.map(stream => {
          const primary = !promoted && focusedId === stream.shareId;
          const kind = primary ? "focus-primary" : focusMode ? "focus-secondary" : "grid";
          return <section key={stream.shareId} aria-label={`${stream.presenterName}'s stream ${state.order.indexOf(stream.shareId) + 1}`} data-placement-share={stream.shareId} data-testid={`central-stream-${stream.shareId}`} className={`screen-share-central-card screen-share-${kind}-card`}>
            <header className="screen-share-stream-header"><span className="screen-share-presenter-meta"><strong className="screen-share-presenter-name">{stream.presenterName}</strong><span className="screen-share-live-indicator">● LIVE</span></span>
              <span className="screen-share-stream-actions">
                {button(`Detach ${stream.presenterName}'s stream`, () => transition({ type: "DETACH", id: stream.shareId }, [stream.shareId]), !!floatingId || hiding.includes(stream.shareId), floatingId ? "Pop in the floating stream first" : undefined)}
                {button(`Focus ${stream.presenterName}'s stream`, () => transition({ type: "FOCUS", id: stream.shareId }), hiding.includes(stream.shareId))}
                <button type="button" className="screen-share-leave-button" aria-label="Leave stream" onClick={() => leave(stream.shareId)}>Leave</button>
              </span></header>
            <div className="screen-share-central-media" data-testid={`${kind}-media-${stream.shareId}`} onDoubleClick={() => transition(primary ? { type: "GALLERY" } : { type: "FOCUS", id: stream.shareId })}>
              {media(stream, false, focusMode && !primary)}
            </div>
          </section>;
        })}
      </div>
    </div> : children}

    {floating && <section aria-label={`${floating.presenterName}'s floating stream ${state.order.indexOf(floating.shareId) + 1}`} data-placement-share={floating.shareId} data-testid={`detached-stream-${floating.shareId}`} className="screen-share-detached-card screen-share-movable"
      style={geometry.geometry ? { left: geometry.geometry.x, top: geometry.geometry.y, width: geometry.geometry.width, height: geometry.geometry.height } : { visibility: "hidden" }}>
      <div className="screen-share-floating-chrome">
        <header className="screen-share-stream-header">
          <span role="group" aria-label={`Drag ${floating.presenterName}'s floating stream`} className="screen-share-drag-handle"
            onPointerDown={geometry.pointerDown("move")} onPointerMove={geometry.pointerMove} onPointerUp={geometry.pointerUp} onPointerCancel={geometry.pointerCancel} onLostPointerCapture={geometry.lostPointerCapture}>
            <strong>{floating.presenterName}</strong> <span className="screen-share-live-indicator">● LIVE</span>
          </span>
          <button type="button" data-restore-control aria-label={`Pop in ${floating.presenterName}'s stream`} disabled={hiding.includes(floating.shareId)} className="screen-share-icon-button" onClick={() => transition({ type: "POP_IN", id: floating.shareId }, [floating.shareId])}>Pop in</button>
        </header>
        <div className="screen-share-floating-actions">
          <button type="button" aria-label="Move floating stream" className="screen-share-icon-button" onClick={event => geometry.beginKeyboard("move", event.currentTarget)} onKeyDown={geometry.keyDown} onBlur={geometry.blur}>Move</button>
          <button type="button" aria-label="Resize floating stream" className="screen-share-icon-button" onClick={event => geometry.beginKeyboard("resize", event.currentTarget)} onKeyDown={geometry.keyDown} onBlur={geometry.blur}>Resize</button>
          <button type="button" className="screen-share-leave-button" aria-label="Leave stream" onClick={() => leave(floating.shareId)}>Leave</button>
        </div>
      </div>
      <div className="screen-share-detached-media" data-testid={`detached-media-${floating.shareId}`} onDoubleClick={() => transition({ type: "POP_IN", id: floating.shareId }, [floating.shareId])}>{media(floating, true, true)}</div>
      <span className="screen-share-resize-handle" role="separator" aria-label={`Resize ${floating.presenterName}'s floating frame`}
        onPointerDown={geometry.pointerDown("resize")} onPointerMove={geometry.pointerMove} onPointerUp={geometry.pointerUp} onPointerCancel={geometry.pointerCancel} onLostPointerCapture={geometry.lostPointerCapture} />
      <span className="screen-share-resize-edge screen-share-resize-edge-right" role="separator" aria-orientation="vertical" aria-label={`Resize ${floating.presenterName}'s floating frame width`}
        onPointerDown={geometry.pointerDown("resize", "x")} onPointerMove={geometry.pointerMove} onPointerUp={geometry.pointerUp} onPointerCancel={geometry.pointerCancel} onLostPointerCapture={geometry.lostPointerCapture} />
      <span className="screen-share-resize-edge screen-share-resize-edge-bottom" role="separator" aria-orientation="horizontal" aria-label={`Resize ${floating.presenterName}'s floating frame height`}
        onPointerDown={geometry.pointerDown("resize", "y")} onPointerMove={geometry.pointerMove} onPointerUp={geometry.pointerUp} onPointerCancel={geometry.pointerCancel} onLostPointerCapture={geometry.lostPointerCapture} />
    </section>}
    {geometry.instruction && floating && <div role="status" className="screen-share-geometry-status">{geometry.instruction}</div>}
    {self && !promoted && <div className="screen-share-self-preview-slot" data-testid="self-preview-slot">{selfCard}</div>}

    <div ref={trayRef} className={`screen-share-tray ${rows.length ? "has-rows" : ""}`} aria-label="Minimized and hidden streams" role="region">
      {rows.map(stream => {
        const p = state.placements[stream.shareId], pending = state.leaving.includes(stream.shareId);
        return <div key={stream.shareId} role="group" aria-label={`${stream.presenterName}'s stream ${state.order.indexOf(stream.shareId) + 1}`} data-placement-share={stream.shareId} className="screen-share-tray-row" data-testid={`stream-row-${stream.shareId}`}>
          <strong>{stream.presenterName}</strong>
          {pending ? <><span role="status">Leaving {stream.presenterName}&apos;s stream…</span>{button("Retry leave", () => onLeaveStream(stream.shareId))}</>
            : p.mode === "HIDDEN" ? <><span>Hidden · audio off</span><button type="button" data-restore-control aria-label={`Show ${stream.presenterName}'s stream`} className="screen-share-icon-button" onClick={() => transition({ type: "SHOW", id: stream.shareId })}>Show</button>{button(`Leave ${stream.presenterName}'s stream`, () => leave(stream.shareId))}</>
              : <><span>LIVE · Minimized · {!stream.audioAvailable ? "no audio" : stream.muted || stream.volume === 0 ? "muted" : "audio on"}</span>
                <button type="button" className="screen-share-icon-button" aria-label={`${stream.muted ? "Unmute" : "Mute"} ${stream.presenterName}'s stream`} aria-pressed={stream.muted ?? false} disabled={!stream.audioAvailable || !onMuteChange} onClick={() => onMuteChange?.(stream.shareId, !stream.muted)}>{stream.muted ? "Unmute" : "Mute"}</button>
                <button type="button" data-restore-control aria-label={`Restore ${stream.presenterName}'s stream`} className="screen-share-icon-button" onClick={() => transition({ type: "RESTORE", id: stream.shareId })}>Restore</button>
                <button type="button" data-row-more aria-label={`More for ${stream.presenterName}`} className="screen-share-icon-button" aria-expanded={rowMore === stream.shareId} onClick={() => setRowMore(rowMore === stream.shareId ? null : stream.shareId)}>More</button>
                {rowMore === stream.shareId && <span className="screen-share-row-more" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.parentElement?.querySelector<HTMLElement>("[data-row-more]")?.focus(); setRowMore(null); } }}>
                  <label>Volume <input className="screen-share-volume" type="range" min="0" max="100" step="1" aria-label={`Volume for ${stream.presenterName}'s stream`} aria-valuetext={`${Math.round((stream.volume ?? 1) * 100)}%`} value={Math.round((stream.volume ?? 1) * 100)} disabled={!stream.audioAvailable || !onVolumeChange} onChange={event => onVolumeChange?.(stream.shareId, Number(event.target.value) / 100)} /></label>
                  {!stream.audioAvailable && <span>No audio track received</span>}
                  {button(`Hide ${stream.presenterName}'s stream`, () => hide(stream.shareId))}{button(`Leave ${stream.presenterName}'s stream`, () => leave(stream.shareId))}
                </span>}
              </>}
        </div>;
      })}
    </div>
    {hiding.map(id => streams.find(s => s.shareId === id)).filter((s): s is ViewerStream => !!s).map(stream => <div key={stream.shareId} role="status" className="screen-share-transaction-status">Hiding {stream.presenterName}&apos;s stream; audio off. {button("Retry hide", () => hide(stream.shareId))}</div>)}
    {state.notice && <div role="status" className="screen-share-transaction-status">{state.notice} {button("Dismiss notice", () => dispatch({ type: "DISMISS" }))}</div>}
  </div>;
}
