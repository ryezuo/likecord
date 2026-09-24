"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const listeners = new Set<() => void>();
let allowed = false;
let dispose: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      const next = !!motion && document.visibilityState === "visible" && document.hasFocus() && !motion.matches;
      if (allowed !== next) { allowed = next; listeners.forEach((notify) => notify()); }
    };
    window.addEventListener("focus", update); window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update); motion?.addEventListener("change", update);
    dispose = () => {
      window.removeEventListener("focus", update); window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update); motion?.removeEventListener("change", update);
      allowed = false;
    };
    update();
  }
  return () => { listeners.delete(listener); if (!listeners.size) { dispose?.(); dispose = undefined; } };
}
const observed = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | undefined;
function observe(element: Element, update: (visible: boolean) => void) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  observer ??= new IntersectionObserver((entries) => {
    entries.forEach((entry) => observed.get(entry.target)?.(entry.isIntersecting && entry.intersectionRatio > 0));
  });
  observed.set(element, update); observer.observe(element);
  return () => {
    observer?.unobserve(element); observed.delete(element);
    if (!observed.size) { observer?.disconnect(); observer = undefined; }
  };
}

export function useAvatarPlayback(ref: RefObject<HTMLElement | null>): boolean {
  const globalAllowed = useSyncExternalStore(subscribe, () => allowed, () => false);
  const [onscreen, setOnscreen] = useState(false);
  useEffect(() => ref.current ? observe(ref.current, setOnscreen) : undefined, [ref]);
  return globalAllowed && onscreen;
}

/** The canonical URL remains the store identity; the server aliases static versions. */
export function avatarPosterUrl(url: string): string {
  return url.replace(/\.webp$/, ".poster.webp");
}
