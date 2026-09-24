import { screenPresentationReducer as reduce, initialPresentation, centralIds, detachedId, clampScreenGeometry, usableScreenBounds, type PresentationAction } from "../lib/screenPresentation";
const initial = () => reduce(initialPresentation, { type: "SYNC", ids: ["a", "c", "d"], selfId: "self" });
const run = (...actions: PresentationAction[]) => actions.reduce(reduce, initial());
describe("SSUX2 bounded restoration and geometry contracts", () => {
  it("keeps a single non-recursive restore target through repeated hide/minimize/show cycles", () => {
    let state = run({ type: "DETACH", id: "a" });
    for (let i = 0; i < 20; i++) {
      state = reduce(state, { type: "MINIMIZE", id: "a" }); state = reduce(state, { type: "HIDE", id: "a" });
      expect(state.placements.a).toEqual({ mode: "HIDDEN", show: { mode: "MINIMIZED", restore: { mode: "DETACHED", central: { mode: "GALLERY" } } } });
      state = reduce(state, { type: "SHOW", id: "a" }); state = reduce(state, { type: "RESTORE", id: "a" });
      expect(detachedId(state)).toBe("a");
    }
  });
  it("hidden cannot focus/minimize/detach and Show returns the saved destination", () => {
    const state = run({ type: "FOCUS", id: "a" }, { type: "DETACH", id: "a" }, { type: "HIDE", id: "a" });
    for (const type of ["FOCUS", "MINIMIZE", "DETACH"] as const) expect(reduce(state, { type, id: "a" })).toBe(state);
    const next = reduce(state, { type: "SHOW", id: "a" }); expect(detachedId(next)).toBe("a");
    expect(reduce(next, { type: "POP_IN", id: "a" }).layout).toEqual({ mode: "FOCUS", shareId: "a" });
  });
  it("occupied restore preserves geometry and the existing slot; missing Focus returns Gallery", () => {
    const geometry = { x: 12, y: 20, width: 480, height: 250 };
    let state = run({ type: "FOCUS", id: "c" }, { type: "DETACH", id: "a" }, { type: "GEOMETRY", id: "a", value: geometry }, { type: "MINIMIZE", id: "a" }, { type: "DETACH", id: "d" }, { type: "RESTORE", id: "a" });
    expect(state.layout).toEqual({ mode: "GALLERY" }); expect(state.geometry.a).toEqual(geometry); expect(detachedId(state)).toBe("d"); expect(state.notice).toMatch(/occupied/);
    state = run({ type: "FOCUS", id: "c" }, { type: "DETACH", id: "a" }, { type: "SYNC", ids: ["a", "d"] }, { type: "POP_IN", id: "a" });
    expect(state.layout).toEqual({ mode: "GALLERY" });
  });
  it("stable first CENTRAL fallback excludes minimized/hidden/detached and terminal cleanup dominates", () => {
    let state = run({ type: "MINIMIZE", id: "a" }, { type: "FOCUS", id: "c" }, { type: "HIDE", id: "c" });
    expect(state.layout).toEqual({ mode: "FOCUS", shareId: "d" }); expect(centralIds(state)).toEqual(["d"]);
    state = reduce(state, { type: "SYNC", ids: [] });
    for (const type of ["SHOW", "RESTORE", "DETACH", "FOCUS"] as const) state = reduce(state, { type, id: "c" });
    expect(state.placements).toEqual({}); expect(state.geometry).toEqual({}); expect(state.layout).toEqual({ mode: "GALLERY" });
  });
  it("self loss and return invalidate old remote focus; BACK_TO_CHAT preserves collapsed", () => {
    const state = run({ type: "FOCUS", id: "c" }, { type: "SELF", mode: "PROMOTED" }, { type: "HIDE", id: "c" }, { type: "SELF", mode: "COLLAPSED" }, { type: "BACK_TO_CHAT" });
    expect(state.self?.mode).toBe("COLLAPSED"); expect(state.layout).toEqual({ mode: "GALLERY" }); expect(centralIds(state)).toEqual([]);
    expect(run({ type: "SELF", mode: "PROMOTED" }, { type: "SYNC", ids: ["a"] }).self).toBeNull();
  });
  it("intersects viewport/workspace, reserves measured tray, uses workspace coordinates", () => {
    const result = usableScreenBounds({ x: 200, y: 100, width: 900, height: 600 }, { x: 0, y: 0, width: 1000, height: 650 }, 580);
    expect(result).toEqual({ x: 8, y: 8, width: 784, height: 464 });
    expect(usableScreenBounds({ x: 0, y: 0, width: 0, height: 0 }, { x: 0, y: 0, width: 800, height: 600 })).toBeNull();
  });
  it("resets invalid geometry at bottom right; finite oversized/negative positions clamp; tiny bounds win over minimums", () => {
    const bounds = { x: 8, y: 8, width: 784, height: 584 };
    expect(clampScreenGeometry(undefined, bounds, 250)).toEqual({ x: 472, y: 342, width: 320, height: 250 });
    expect(clampScreenGeometry({ x: NaN, y: 0, width: 500, height: 300 }, bounds, 250)).toEqual(clampScreenGeometry(undefined, bounds, 250));
    expect(clampScreenGeometry({ x: -500, y: 9999, width: 9999, height: 2 }, bounds)).toEqual({ x: 8, y: 412, width: 784, height: 180 });
    expect(clampScreenGeometry({ x: 999, y: 999, width: 320, height: 240 }, { x: 8, y: 8, width: 150, height: 60 })).toEqual({ x: 8, y: 8, width: 150, height: 60 });
    expect(clampScreenGeometry({ x: 8, y: 8, width: 300, height: 200 }, null)).toBeNull();
  });
});
