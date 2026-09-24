"use client";

import { useEffect, useRef, useState } from "react";
import { useAvatar } from "../../hooks/useAvatars";
import type { AvatarStore } from "../../lib/avatar-store";
import { avatarPosterUrl, useAvatarPlayback } from "../../lib/avatar-playback";

export default function UserAvatar({ userId, name, avatarUrl, interactive = false, speaking = false, contextOpen = false }:
  { userId?: string; name?: string | null; avatarUrl?: string | null; interactive?: boolean; speaking?: boolean; contextOpen?: boolean }) {
  const { url, store } = useAvatar(userId, avatarUrl);
  const root = useRef<HTMLSpanElement>(null);
  const eligible = useAvatarPlayback(root);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const playing = eligible && (speaking || contextOpen || (interactive && (hovered || focused)));
  const fallback = name?.trim()[0]?.toUpperCase() || "?";
  return <span ref={root} className="user-avatar-content" aria-hidden={interactive && url ? undefined : true}
    role={interactive && url ? "img" : undefined} aria-label={interactive && url ? `${name || "User"} avatar` : undefined}
    tabIndex={interactive && url ? 0 : undefined}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
    {url ? <AvatarImage key={`${userId}:${url}`} url={url} playing={playing} userId={userId!} store={store} fallback={fallback} /> : fallback}
  </span>;
}
function AvatarImage({ url, playing, userId, store, fallback }: { url: string; playing: boolean; userId: string; store: AvatarStore | null; fallback: string }) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [attempt, setAttempt] = useState(0);
  const recovered = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    setFailed(new Set()); setAttempt(0); recovered.current = false;
    return () => { generation.current++; };
  }, [store]);
  const poster = avatarPosterUrl(url);
  const source = playing && !failed.has(url) ? url : poster;
  const onError = () => {
    setFailed((current) => new Set(current).add(source));
    if (recovered.current || !store) return;
    recovered.current = true;
    const current = generation.current;
    void store.recoverImage(userId, url).then((success) => {
      if (success && current === generation.current) { setAttempt(1); setFailed(new Set()); }
    });
  };
  // Plain same-origin image uses auth cookies; no public optimizer/proxy or per-image refresh.
  return failed.has(source) ? <>{fallback}</> : <img key={`${attempt}:${source}`} src={source} alt="" onError={onError} draggable={false} />;
}
