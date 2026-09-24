"use client";

import ScreenStreamVideo from "./ScreenStreamVideo";
import { ViewerIcon } from "../ui/icons";
import type { SelfMode } from "../../lib/screenPresentation";

interface Props {
  stream: MediaStream | null;
  viewerNames: string[];
  mode?: SelfMode;
  onModeChange?: (mode: SelfMode) => void;
  onStop?: () => void;
  stopping?: boolean;
}

export default function ScreenSharePresenterCard({ stream, viewerNames, mode = "COMPACT", onModeChange, onStop, stopping = false }: Props) {
  const viewerCount = viewerNames.length;

  return (
    <div data-testid="presenter-live-card" data-self-mode={mode} className={`screen-share-presenter-card self-${mode.toLowerCase()}`}>
      <div className="screen-share-presenter-header">
        <span className="screen-share-presenter-title">Your screen</span>
        <div className="screen-share-presenter-tools">
          <span data-testid="presenter-live-indicator" className="screen-share-live-indicator">● LIVE</span>
          <details className="screen-share-viewer-menu">
            <summary className="screen-share-viewer-summary" aria-label={`${viewerCount} viewer${viewerCount === 1 ? "" : "s"} watching`}>
              <ViewerIcon size={15} /> {viewerCount}
            </summary>
            <div data-testid="presenter-viewer-list" className="screen-share-viewer-list">
              <strong>Watching</strong>
              {viewerCount > 0 ? <ul className="screen-share-viewer-names">{viewerNames.map((name) => <li key={name}>{name}</li>)}</ul> : <div className="screen-share-viewer-empty">No viewers yet</div>}
            </div>
          </details>
        </div>
      </div>
      <div className="screen-share-self-actions">
        {onStop && <button type="button" className="screen-share-leave-button" disabled={stopping} onClick={onStop}>{stopping ? "Stopping screen share" : "Stop Sharing"}</button>}
        {onModeChange && <>
          <button type="button" className="screen-share-icon-button" onClick={() => onModeChange(mode === "COLLAPSED" ? "COMPACT" : "COLLAPSED")}>{mode === "COLLAPSED" ? "Show preview" : "Hide preview"}</button>
          <button type="button" className="screen-share-icon-button" onClick={() => onModeChange(mode === "PROMOTED" ? "COMPACT" : "PROMOTED")}>{mode === "PROMOTED" ? "Compact preview" : "Expand preview"}</button>
        </>}
      </div>
      {mode !== "COLLAPSED" && <div className="screen-share-presenter-media" onDoubleClick={() => onModeChange?.(mode === "PROMOTED" ? "COMPACT" : "PROMOTED")}>
        {stream ? <ScreenStreamVideo stream={stream} presentation="self-preview" /> : <span className="screen-share-waiting">Waiting for screen stream...</span>}
      </div>}
    </div>
  );
}
