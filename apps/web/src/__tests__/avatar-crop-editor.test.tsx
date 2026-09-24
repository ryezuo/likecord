import "@testing-library/jest-dom";
import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { avatarCropRect, DEFAULT_AVATAR_CROP, serializeAvatarCrop, type AvatarCrop } from "@likecord/shared";
import AvatarCropEditor from "../components/settings/AvatarCropEditor";

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

function Harness({ width = 90, height = 60, initial = DEFAULT_AVATAR_CROP }: { width?: number; height?: number; initial?: AvatarCrop }) {
  const [crop, setCrop] = useState<AvatarCrop>({ ...initial });
  return <>
    <AvatarCropEditor previewUrl="blob:static" width={width} height={height} crop={crop} disabled={false} onChange={setCrop} />
    <output data-testid="crop-state">{serializeAvatarCrop(crop)}</output>
  </>;
}

const state = () => JSON.parse(screen.getByTestId("crop-state").textContent || "{}") as AvatarCrop;

describe("Avatar Crop & Position editor", () => {
  beforeAll(() => { Object.defineProperty(window, "PointerEvent", { configurable: true, value: TestPointerEvent }); });
  it("maps the shared canonical rectangle directly into a circular static preview", () => {
    const { container } = render(<Harness />);
    const viewport = screen.getByLabelText("Crop avatar position");
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).toHaveAttribute("aria-describedby", "avatar-crop-help");
    expect(container.querySelector(".avatar-crop-viewport img")).toHaveStyle({ width: "150%", height: "100%", left: "-25%", top: "0%" });
    expect(screen.getByLabelText("Zoom")).toHaveAttribute("min", "1");
    expect(screen.getByLabelText("Zoom")).toHaveAttribute("max", "4");
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("supports pointer drag, edge clamp and pointer cancellation", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Crop avatar position") as HTMLDivElement;
    const capture = jest.fn(), release = jest.fn();
    Object.defineProperties(viewport, {
      setPointerCapture: { value: capture },
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: release },
      getBoundingClientRect: { value: () => ({ width: 200, height: 200, left: 0, top: 0, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }) },
    });
    fireEvent.pointerDown(viewport, { pointerId: 7, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(viewport, { pointerId: 7, clientX: 120, clientY: 100 });
    expect(state().panX).toBeLessThan(0);
    fireEvent.pointerMove(viewport, { pointerId: 7, clientX: 10000, clientY: 100 });
    expect(state().panX).toBe(-1);
    fireEvent.pointerCancel(viewport, { pointerId: 7 });
    expect(capture).toHaveBeenCalledWith(7); expect(release).toHaveBeenCalledWith(7);
  });

  it("supports fine/coarse arrow movement and labelled directional controls", () => {
    render(<Harness />);
    const viewport = screen.getByLabelText("Crop avatar position");
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    const fine = state().panX;
    expect(fine).toBeLessThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true });
    expect(Math.abs(state().panX)).toBeGreaterThan(Math.abs(fine));
    fireEvent.click(screen.getByRole("button", { name: "Move image left" }));
    expect(state().panX).toBeGreaterThan(-1);
    for (const name of ["Move image left", "Move image up", "Move image down", "Move image right"])
      expect(screen.getByRole("button", { name })).toBeEnabled();
  });

  it("preserves the source center while zooming and Reset restores V1 geometry", () => {
    render(<Harness />);
    const before = avatarCropRect(90, 60, state());
    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "2" } });
    const after = avatarCropRect(90, 60, state());
    expect(after.left + after.side / 2).toBeCloseTo(before.left + before.side / 2, 0);
    expect(after.top + after.side / 2).toBeCloseTo(before.top + before.side / 2, 0);
    expect(screen.getByText("200%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(state()).toEqual(DEFAULT_AVATAR_CROP);
    expect(avatarCropRect(90, 60, state())).toEqual({ left: 15, top: 0, side: 60, outputSide: 60 });
  });

  it("applies the tiny-image zoom ceiling without upscaling", () => {
    render(<Harness width={2} height={3} />);
    expect(screen.getByLabelText("Zoom")).toHaveAttribute("max", "2");
    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "2" } });
    expect(avatarCropRect(2, 3, state())).toEqual({ left: 0, top: 0, side: 1, outputSide: 1 });
  });
});
