import type { KeyboardEvent, MouseEvent } from "react";

/** Share only invocation mechanics; each existing consumer still owns its actions. */
export function contextMenuTrigger(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  const keyboard = "key" in event;
  if (keyboard && event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return null;
  event.preventDefault();
  if (keyboard) event.stopPropagation();
  const invoker = event.currentTarget.matches("button, [tabindex]")
    ? event.currentTarget
    : event.currentTarget.querySelector<HTMLElement>("button") ?? event.currentTarget;
  const bounds = invoker.getBoundingClientRect();
  return {
    invoker,
    x: keyboard ? bounds.left + 8 : event.clientX,
    y: keyboard ? bounds.bottom + 4 : event.clientY,
  };
}
