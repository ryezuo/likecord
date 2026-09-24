"use client";

import { useEffect, useRef, type Ref } from "react";

type Presentation = "central" | "detached" | "self-preview";

export default function ScreenStreamVideo({ stream, presentation = "central", videoRef }: { stream: MediaStream | null | undefined; presentation?: Presentation; videoRef?: Ref<HTMLVideoElement> }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // A visual projection borrows the existing video tracks; transport and audio
    // retain their original owners, including when native PiP exposes unmute.
    const projection = new MediaStream(stream?.getVideoTracks() || []);
    const reconcile = () => {
      const tracks = stream?.getVideoTracks() || [];
      projection.getTracks().forEach((track) => { if (!tracks.includes(track)) projection.removeTrack(track); });
      tracks.forEach((track) => { if (!projection.getTracks().includes(track)) projection.addTrack(track); });
      video.muted = true;
      video.volume = 0;
    };
    reconcile();
    video.srcObject = stream ? projection : null;
    if (stream) void video.play().catch(() => undefined);
    stream?.addEventListener?.("addtrack", reconcile);
    stream?.addEventListener?.("removetrack", reconcile);
    video.addEventListener("volumechange", reconcile);
    return () => {
      stream?.removeEventListener?.("addtrack", reconcile);
      stream?.removeEventListener?.("removetrack", reconcile);
      video.removeEventListener("volumechange", reconcile);
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  return <video ref={(element) => {
    ref.current = element;
    if (typeof videoRef === "function") videoRef(element);
    else if (videoRef) videoRef.current = element;
  }} className={`screen-stream-video screen-stream-video-${presentation}`} autoPlay playsInline muted />;
}
