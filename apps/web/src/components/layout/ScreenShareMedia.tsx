"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ScreenBrowserPresentation } from "../../hooks/useScreenBrowserPresentation";
import ScreenStreamVideo from "./ScreenStreamVideo";

interface Props {
  shareId: string;
  presenterName: string;
  stream: MediaStream | null | undefined;
  presentation: "central" | "detached";
  compact?: boolean;
  volume: number;
  muted: boolean;
  audioAvailable: boolean;
  onVolumeChange?: (shareId: string, volume: number) => void;
  onMuteChange?: (shareId: string, muted: boolean) => void;
  onLeave: () => void;
  onRestore?: () => void;
  presentationActions?: ReactNode;
  browser: ScreenBrowserPresentation;
}

export default function ScreenShareMedia({ shareId, presenterName, stream, presentation, compact = false,
  volume, muted, audioAvailable, onVolumeChange, onMuteChange, onLeave, onRestore, presentationActions, browser }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const entryRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [visible, setVisible] = useState(true);
  const [more, setMore] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [activity, setActivity] = useState(0);
  const [hover, setHover] = useState(false);
  const [constrained, setConstrained] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const register = browser.register;
  const owned = browser.owner?.shareId === shareId ? browser.owner.kind : null;
  const pending = browser.pendingShareId === shareId;
  const feedback = browser.feedback?.shareId === shareId ? browser.feedback.message : null;
  const fullscreenSupported = surfaceReady && document.fullscreenEnabled !== false
    && typeof document.exitFullscreen === "function" && typeof containerRef.current?.requestFullscreen === "function";
  const pipSupported = surfaceReady && document.pictureInPictureEnabled === true
    && typeof document.exitPictureInPicture === "function" && typeof videoRef.current?.requestPictureInPicture === "function"
    && !videoRef.current.disablePictureInPicture;
  const blocked = browser.pendingShareId !== null || (browser.owner !== null && !owned);
  const persistent = !hover || compact || constrained;
  const controlsVisible = visible || persistent || focused || interacting || more || pending || !!feedback;
  const availability = audioAvailable ? null : stream ? "No audio track received" : "Connecting";
  const percent = Math.round(Math.max(0, Math.min(1, volume)) * 100);
  const reveal = () => { setVisible(true); setActivity((value) => value + 1); };

  useEffect(() => {
    const query = window.matchMedia?.("(hover: hover) and (pointer: fine) and (min-width: 801px) and (min-height: 601px)");
    if (!query) return;
    const update = () => setHover(query.matches);
    update(); query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setConstrained(entry.contentRect.width < 360 || entry.contentRect.height < 220);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    setSurfaceReady(true);
    const unregister = register(shareId, { container, video });
    const update = () => setVideoReady(video.readyState > 0 && !!(video.srcObject as MediaStream | null)?.getVideoTracks().some((track) => track.readyState !== "ended"));
    update();
    video.addEventListener("loadedmetadata", update);
    video.addEventListener("emptied", update);
    return () => {
      unregister();
      video.removeEventListener("loadedmetadata", update);
      video.removeEventListener("emptied", update);
    };
  }, [register, shareId, stream]);

  useEffect(() => {
    if (persistent || focused || interacting || more || pending || feedback) return;
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [activity, persistent, focused, interacting, more, pending, feedback]);

  useEffect(() => {
    if (!interacting) return;
    const end = () => { setInteracting(false); setActivity((value) => value + 1); };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => { window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, [interacting]);

  return (
    <div ref={containerRef} className={`screen-share-media-surface ${controlsVisible ? "controls-visible" : "controls-hidden"}`}
      role="group" aria-label={`${presenterName}'s live stream`} data-share-id={shareId}
      onPointerMove={reveal} onPointerEnter={reveal}
      onFocusCapture={() => { setFocused(true); reveal(); }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <ScreenStreamVideo stream={stream} presentation={presentation} videoRef={videoRef} />
      {!stream && <span className="screen-share-waiting">Waiting for screen stream...</span>}
      <div className="screen-share-media-controls" onPointerDown={() => setInteracting(true)} onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && more && !document.fullscreenElement) {
            event.stopPropagation(); setMore(false); entryRef.current?.focus();
          }
        }}>
        <div id={`${id}-strip`} className="screen-share-control-strip" hidden={!controlsVisible}>
          <button type="button" className="screen-share-icon-button" disabled={!audioAvailable || !onMuteChange}
            aria-label={`${muted ? "Unmute" : "Mute"} ${presenterName}'s stream`} aria-pressed={muted}
            aria-describedby={availability ? `${id}-audio` : undefined} onClick={() => onMuteChange?.(shareId, !muted)}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <input className="screen-share-volume" type="range" min="0" max="100" step="1" value={percent}
            aria-label={`Volume for ${presenterName}'s stream`} aria-valuetext={`${percent}%`}
            aria-describedby={availability ? `${id}-audio` : undefined} disabled={!audioAvailable || !onVolumeChange}
            onPointerDown={() => setInteracting(true)}
            onChange={(event) => onVolumeChange?.(shareId, Number(event.target.value) / 100)} />
          <output className="screen-share-volume-value" aria-hidden="true">{percent}%</output>
          {fullscreenSupported && <button type="button" className="screen-share-icon-button" disabled={blocked || pending || owned === "PIP"}
            aria-label={`${owned === "FULLSCREEN" ? "Exit" : "Enter"} fullscreen for ${presenterName}'s stream`}
            onClick={(event) => owned === "FULLSCREEN" ? void browser.exit() : browser.request(shareId, "FULLSCREEN", event.currentTarget)}>
            {owned === "FULLSCREEN" ? "Exit fullscreen" : "Fullscreen"}
          </button>}
        </div>
        <button ref={entryRef} type="button" className="screen-share-icon-button screen-share-controls-entry"
          aria-label={`More stream controls for ${presenterName}`} aria-expanded={more} aria-controls={`${id}-more`}
          onClick={() => { reveal(); setMore((value) => !value); }}>More</button>
        {more && <div id={`${id}-more`} className="screen-share-more-controls">
          {pipSupported ? <button type="button" className="screen-share-icon-button" disabled={blocked || pending || owned === "FULLSCREEN" || (!owned && !videoReady)}
            aria-label={`${owned === "PIP" ? "Close" : "Open"} ${presenterName}'s stream in Picture-in-Picture`}
            onClick={(event) => owned === "PIP" ? void browser.exit() : browser.request(shareId, "PIP", event.currentTarget)}>
            {owned === "PIP" ? "Close Picture-in-Picture" : "Picture-in-Picture"}
          </button> : <p>Picture-in-Picture is unavailable in this browser.</p>}
          {pipSupported && !videoReady && !owned && <p>Waiting for video before Picture-in-Picture.</p>}
          {!fullscreenSupported && <p>Fullscreen is unavailable in this browser.</p>}
          {owned && <p>{owned === "PIP" ? "Video is in Picture-in-Picture. Audio controls stay here." : "Press Escape to exit fullscreen."}</p>}
          {onRestore && <button type="button" className="screen-share-icon-button" onClick={onRestore}>Restore {presenterName}&apos;s stream workspace</button>}
          {presentationActions}
          <button type="button" className="screen-share-leave-button" aria-label={`Leave ${presenterName}'s stream`} onClick={onLeave}>Leave Stream</button>
        </div>}
        {availability && controlsVisible && <span id={`${id}-audio`} className="screen-share-audio-availability">{availability}</span>}
        {pending && <span role="status" className="screen-share-control-feedback">Waiting for browser presentation…</span>}
        {feedback && <div role="status" className="screen-share-control-feedback">{feedback} <button type="button" className="screen-share-icon-button" onClick={browser.dismissFeedback}>Dismiss</button></div>}
      </div>
    </div>
  );
}
