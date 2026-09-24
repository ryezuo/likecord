"use client";

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import {
  DEFAULT_AVATAR_CROP,
  avatarCropRect,
  moveAvatarImage,
  zoomAvatarCrop,
  type AvatarCrop,
} from "@likecord/shared";

interface Props {
  previewUrl: string;
  width: number;
  height: number;
  crop: AvatarCrop;
  disabled: boolean;
  onChange: (crop: AvatarCrop) => void;
}

interface ActivePointer { id: number; x: number; y: number }

export default function AvatarCropEditor({ previewUrl, width, height, crop, disabled, onChange }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<ActivePointer | null>(null);
  const currentCrop = useRef(crop);
  currentCrop.current = crop;
  const rectangle = avatarCropRect(width, height, crop);
  const maxZoom = Math.min(4, Math.min(width, height));
  const imageStyle: CSSProperties = {
    width: `${width / rectangle.side * 100}%`,
    height: `${height / rectangle.side * 100}%`,
    left: `${-rectangle.left / rectangle.side * 100}%`,
    top: `${-rectangle.top / rectangle.side * 100}%`,
  };

  const finishPointer = (element = viewport.current) => {
    const active = pointer.current;
    if (active && element?.hasPointerCapture?.(active.id)) element.releasePointerCapture(active.id);
    pointer.current = null;
  };
  useEffect(() => () => finishPointer(), []);
  useEffect(() => { if (disabled) finishPointer(); }, [disabled]);

  const change = (next: AvatarCrop) => {
    currentCrop.current = next;
    onChange(next);
  };
  const nudge = (deltaX: number, deltaY: number, coarse = false) => {
    const activeCrop = currentCrop.current;
    const step = avatarCropRect(width, height, activeCrop).side * (coarse ? 0.1 : 0.01);
    change(moveAvatarImage(width, height, activeCrop, deltaX * step, deltaY * step));
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const delta = direction[event.key];
    if (!delta || disabled) return;
    event.preventDefault();
    nudge(delta[0], delta[1], event.shiftKey);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId || disabled) return;
    const renderedSide = event.currentTarget.getBoundingClientRect().width;
    if (!renderedSide) return;
    const activeCrop = currentCrop.current;
    const sourceSide = avatarCropRect(width, height, activeCrop).side;
    const deltaX = (event.clientX - active.x) * sourceSide / renderedSide;
    const deltaY = (event.clientY - active.y) * sourceSide / renderedSide;
    pointer.current = { id: active.id, x: event.clientX, y: event.clientY };
    change(moveAvatarImage(width, height, activeCrop, deltaX, deltaY));
  };
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id === event.pointerId) finishPointer(event.currentTarget);
  };

  return <div className="avatar-crop-editor">
    <p id="avatar-crop-help" className="user-settings-field-help">Drag the image or use the arrow keys. The circle shows the final avatar crop.</p>
    <div ref={viewport} className="avatar-crop-viewport" role="group" tabIndex={disabled ? -1 : 0}
      aria-label="Crop avatar position" aria-describedby="avatar-crop-help" aria-disabled={disabled || undefined}
      onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
      <img src={previewUrl} alt="" aria-hidden="true" draggable={false} style={imageStyle} />
    </div>
    <div className="avatar-crop-controls">
      <div className="avatar-crop-directions" role="group" aria-label="Move avatar image">
        <button type="button" className="btn btn-secondary btn-icon" aria-label="Move image left" disabled={disabled} onClick={() => nudge(-1, 0, true)}>←</button>
        <button type="button" className="btn btn-secondary btn-icon" aria-label="Move image up" disabled={disabled} onClick={() => nudge(0, -1, true)}>↑</button>
        <button type="button" className="btn btn-secondary btn-icon" aria-label="Move image down" disabled={disabled} onClick={() => nudge(0, 1, true)}>↓</button>
        <button type="button" className="btn btn-secondary btn-icon" aria-label="Move image right" disabled={disabled} onClick={() => nudge(1, 0, true)}>→</button>
      </div>
      <label className="avatar-crop-zoom" htmlFor="avatar-crop-zoom">
        <span>Zoom</span>
        <input id="avatar-crop-zoom" type="range" min={1} max={maxZoom} step={0.01} value={crop.zoom}
          aria-valuetext={`${Math.round(crop.zoom * 100)}%`}
          disabled={disabled || maxZoom <= 1}
          onChange={(event) => change(zoomAvatarCrop(width, height, currentCrop.current, Number(event.target.value)))} />
        <output htmlFor="avatar-crop-zoom">{Math.round(crop.zoom * 100)}%</output>
      </label>
      <button type="button" className="btn btn-secondary avatar-crop-reset" disabled={disabled || (crop.panX === 0 && crop.panY === 0 && crop.zoom === 1)}
        onClick={() => change({ ...DEFAULT_AVATAR_CROP })}>Reset</button>
    </div>
  </div>;
}
