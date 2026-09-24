"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ text, children, position = "top" }: Props) {
  const [visible, setVisible] = useState(false);
  const [coordinates, setCoordinates] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    if (position === "top") setCoordinates({ top: bounds.top - 4, left: bounds.left + bounds.width / 2 });
    if (position === "bottom") setCoordinates({ top: bounds.bottom + 4, left: bounds.left + bounds.width / 2 });
    if (position === "left") setCoordinates({ top: bounds.top + bounds.height / 2, left: bounds.left - 4 });
    if (position === "right") setCoordinates({ top: bounds.top + bounds.height / 2, left: bounds.right + 4 });
  }, [position]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition, visible]);

  const show = () => { updatePosition(); setVisible(true); };
  const transform = position === "top"
    ? "translate(-50%, -100%)"
    : position === "bottom"
      ? "translate(-50%, 0)"
      : position === "left"
        ? "translate(-100%, -50%)"
        : "translate(0, -50%)";

  return (
    <span ref={wrapperRef} className="tooltip-wrapper" onMouseEnter={show} onMouseLeave={() => setVisible(false)}
      onFocus={show} onBlur={() => setVisible(false)}>
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <span role="tooltip" className="tooltip-content" style={{ ...coordinates, transform }}>{text}</span>,
        document.body,
      )}
    </span>
  );
}
