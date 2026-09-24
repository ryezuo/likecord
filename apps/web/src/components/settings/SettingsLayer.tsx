"use client";

import { type ReactNode, useEffect, useRef } from "react";

export interface SettingsNavigationItem {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

export interface SettingsNavigationGroup {
  label: string;
  items: SettingsNavigationItem[];
}

interface Props {
  title: string;
  resourceName?: string;
  resourceType?: string;
  groups: SettingsNavigationGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  footerItems?: SettingsNavigationItem[];
  onFooterAction?: (id: string) => void;
  closeDisabled?: boolean;
  children: ReactNode;
}

const focusableSelector = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function SettingsLayer({
  title,
  resourceName,
  resourceType,
  groups,
  activeId,
  onSelect,
  onClose,
  footerItems = [],
  onFooterAction,
  closeDisabled = false,
  children,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { closeDisabledRef.current = closeDisabled; }, [closeDisabled]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector(".modal-overlay")) return;
      if (event.key === "Escape") {
        if (closeDisabledRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(layerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !layerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeId]);

  return (
    <div ref={layerRef} className="settings-layer" role="dialog" aria-modal="true" aria-label={[title, resourceName].filter(Boolean).join(" — ")}>
      <aside className="settings-layer-sidebar likecord-scrollbar">
        <div className="settings-layer-context">
          <strong>{title}</strong>
          {resourceName && <span className="settings-layer-resource">
            <span>{resourceName}</span>
            {resourceType && <><span aria-hidden="true">·</span><span>{resourceType}</span></>}
          </span>}
        </div>
        <nav aria-label={`${title} navigation`}>
          {groups.map((group) => group.items.length > 0 && (
            <div className="settings-nav-group" key={group.label}>
              <div className="settings-nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button key={item.id} type="button"
                  className={`settings-nav-item ${item.danger ? "danger" : ""} ${activeId === item.id ? "active" : ""}`}
                  aria-current={activeId === item.id ? "page" : undefined}
                  disabled={item.disabled}
                  onClick={() => onSelect(item.id)}>{item.label}</button>
              ))}
            </div>
          ))}
        </nav>
        {footerItems.length > 0 && <div className="settings-layer-footer">
          {footerItems.map((item) => (
            <button key={item.id} type="button"
              className={`settings-nav-item ${item.danger ? "danger" : ""}`}
              disabled={item.disabled}
              onClick={() => onFooterAction?.(item.id)}>{item.label}</button>
          ))}
        </div>}
      </aside>
      <main ref={mainRef} className="settings-layer-main likecord-scrollbar">
        <div className="settings-layer-content">{children}</div>
        <div className="settings-layer-close-wrap">
          <button ref={closeButtonRef} type="button" className="settings-layer-close" aria-label="Close settings"
            disabled={closeDisabled} onClick={onClose}>✕</button>
          <span aria-hidden="true">ESC</span>
        </div>
      </main>
    </div>
  );
}
