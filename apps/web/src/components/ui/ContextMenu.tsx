"use client";

import { useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from "react";

export type ContextMenuItem = {
  type: "label";
  label: string;
  emphasis?: boolean;
  decoration?: ReactNode;
} | {
  type?: "action";
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  description?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  checked?: boolean;
  icon?: ReactNode;
};

interface Props {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  ariaLabel?: string;
  returnFocusTo?: HTMLElement | null;
  fallbackFocusTo?: HTMLElement | null;
  /** Optionally bind to a container ref to auto-close on scroll */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export default function ContextMenu({ items, position, onClose, containerRef, ariaLabel, returnFocusTo, fallbackFocusTo }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const restoreOnUnmountRef = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const focusTargetsRef = useRef({ returnFocusTo, fallbackFocusTo });
  focusTargetsRef.current = { returnFocusTo, fallbackFocusTo };

  const restoreFocus = useCallback(() => {
    const { returnFocusTo: trigger, fallbackFocusTo: fallback } = focusTargetsRef.current;
    const target = [trigger, fallback, previousFocusRef.current].find((element) => element?.isConnected && element !== document.body);
    target?.focus({ preventScroll: true });
  }, []);

  const close = useCallback(() => {
    restoreOnUnmountRef.current = false;
    restoreFocus();
    onCloseRef.current();
  }, [restoreFocus]);

  const adjustPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position.x;
    let y = position.y;
    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [position.x, position.y]);

  useLayoutEffect(adjustPosition, [adjustPosition, items]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreOnUnmountRef.current = true;
    (menu?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? menu)?.focus({ preventScroll: true });
    return () => {
      // Context loss may unmount the menu without an explicit dismissal. Do not
      // steal focus if another surface (for example a dialog) already took it.
      if (restoreOnUnmountRef.current && (menu?.contains(document.activeElement) || document.activeElement === document.body)) {
        restoreFocus();
      }
    };
  }, [position.x, position.y, returnFocusTo, restoreFocus]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Restore before the browser's default mouse focus transfer; a clicked
        // control can then take focus, while blank-space dismissal has an origin.
        close();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const menu = menuRef.current;
      if (!menu?.contains(document.activeElement)) return;
      if (e.key === "Tab") {
        // Exit to the invocation point. A subsequent Tab resumes page traversal.
        e.preventDefault();
        close();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const actions = Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const current = actions.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? actions.length - 1
        : e.key === "ArrowDown" ? Math.min(current + 1, actions.length - 1) : Math.max(current - 1, 0);
      actions[next]?.focus({ preventScroll: true });
      actions[next]?.scrollIntoView?.({ block: "nearest" });
    };
    const handleScroll = (event: Event) => {
      // An overflowing role list must be scrollable without dismissing itself.
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const handleResize = () => close();
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    // Capture on document also observes the optional caller's scroll container.
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [close, containerRef]);

  return (
    <div className="context-menu" ref={menuRef} role="menu" aria-label={ariaLabel} tabIndex={-1}>
      {items.map((item, i) => {
        if (item.type === "label") return <div key={i} role="presentation"
          className={`context-menu-label ${item.emphasis ? "context-menu-identity" : ""}${item.decoration ? " avatar-identity" : ""}`}>{item.decoration}{item.label}</div>;
        if (item.divider) return <div key={i} className="context-menu-divider" role="separator" />;
        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`context-menu-item ${item.danger ? "danger" : ""} ${item.disabled ? "disabled" : ""}`}
            onClick={(event) => {
              if (item.disabled) return;
              // Return to the trigger before invoking an action so newly opened
              // dialogs/settings capture the right focus origin, not this item.
              close();
              item.onClick(event);
            }}
            disabled={item.disabled}
            role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={item.checked}
            aria-description={item.description}
            title={item.description}
          >
            {item.checked !== undefined && (
              <span className="context-menu-check" aria-hidden="true">{item.checked ? "☑" : "☐"}</span>
            )}
            {item.icon ? <span className="context-menu-icon" aria-hidden="true">{item.icon}</span> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
