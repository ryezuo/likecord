export type CentralLayout = { mode: "GALLERY" } | { mode: "FOCUS"; shareId: string };
export type VisibleTarget = { mode: "CENTRAL"; layout: CentralLayout } | { mode: "DETACHED"; central: CentralLayout };
export type MinimizedPlacement = { mode: "MINIMIZED"; restore: VisibleTarget };
export type RemotePlacement = { mode: "CENTRAL" } | { mode: "DETACHED"; central: CentralLayout }
  | MinimizedPlacement | { mode: "HIDDEN"; show: VisibleTarget | MinimizedPlacement };
export type Geometry = { x: number; y: number; width: number; height: number };
export type SelfMode = "COMPACT" | "COLLAPSED" | "PROMOTED";
export interface ScreenPresentationState {
  order: string[];
  placements: Record<string, RemotePlacement>;
  layout: CentralLayout;
  geometry: Record<string, Geometry>;
  leaving: string[];
  self: { shareId: string; mode: SelfMode; returnLayout?: CentralLayout } | null;
  notice: string | null;
}
export type PresentationAction =
  | { type: "SYNC"; ids: string[]; selfId?: string }
  | { type: "FOCUS" | "DETACH" | "POP_IN" | "MINIMIZE" | "HIDE" | "RESTORE" | "SHOW" | "LEAVE"; id: string }
  | { type: "GALLERY" } | { type: "BACK_TO_CHAT" } | { type: "DISMISS" }
  | { type: "GEOMETRY"; id: string; value: Geometry }
  | { type: "SELF"; mode: SelfMode };
const gallery: CentralLayout = { mode: "GALLERY" };
export const initialPresentation: ScreenPresentationState = { order: [], placements: {}, layout: gallery, geometry: {}, leaving: [], self: null, notice: null };
export const centralIds = (state: ScreenPresentationState) => state.order.filter(id => state.placements[id]?.mode === "CENTRAL" && !state.leaving.includes(id));
export const detachedId = (state: ScreenPresentationState) => state.order.find(id => state.placements[id]?.mode === "DETACHED" && !state.leaving.includes(id));
function validLayout(state: ScreenPresentationState, intent: CentralLayout): CentralLayout {
  return intent.mode === "FOCUS" && centralIds(state).includes(intent.shareId) ? intent : gallery;
}
function visibleTarget(state: ScreenPresentationState, placement: RemotePlacement): VisibleTarget {
  return placement.mode === "DETACHED" ? placement : { mode: "CENTRAL", layout: state.layout };
}
function normalize(state: ScreenPresentationState): ScreenPresentationState {
  if (state.layout.mode === "FOCUS" && !centralIds(state).includes(state.layout.shareId)) {
    const next = centralIds(state)[0];
    return { ...state, layout: next ? { mode: "FOCUS", shareId: next } : gallery };
  }
  return state;
}
function restore(state: ScreenPresentationState, id: string, target: VisibleTarget | MinimizedPlacement): ScreenPresentationState {
  if (target.mode === "MINIMIZED") return { ...state, placements: { ...state.placements, [id]: target } };
  if (target.mode === "DETACHED" && !detachedId(state)) return { ...state, placements: { ...state.placements, [id]: target } };
  const next = { ...state, placements: { ...state.placements, [id]: { mode: "CENTRAL" } as const } };
  return { ...next, layout: target.mode === "CENTRAL" ? validLayout(next, target.layout) : gallery,
    notice: target.mode === "DETACHED" ? "The floating slot is occupied. Restored to Gallery." : null };
}
export function screenPresentationReducer(state: ScreenPresentationState, action: PresentationAction): ScreenPresentationState {
  if (action.type === "SYNC") {
    const ids = [...new Set(action.ids)];
    const self = action.selfId ? state.self?.shareId === action.selfId ? state.self : { shareId: action.selfId, mode: "COMPACT" as const } : null;
    let next = { ...state, order: ids, placements: Object.fromEntries(ids.map(id => [id, state.placements[id] || { mode: "CENTRAL" }])),
      geometry: Object.fromEntries(ids.filter(id => state.geometry[id]).map(id => [id, state.geometry[id]])),
      leaving: state.leaving.filter(id => ids.includes(id)), self };
    if (state.layout.mode === "FOCUS" && !ids.includes(state.layout.shareId)) next.notice = "The focused stream ended. Showing the remaining streams.";
    if (state.self?.mode === "PROMOTED" && self !== state.self) next = { ...next, layout: validLayout(next, state.self.returnLayout || gallery) };
    return normalize(next);
  }
  if (action.type === "DISMISS") return { ...state, notice: null };
  if (action.type === "SELF") {
    if (!state.self || state.self.mode === action.mode) return state;
    return { ...state, layout: action.mode !== "PROMOTED" && state.self.mode === "PROMOTED" ? validLayout(state, state.self.returnLayout || gallery) : state.layout,
      self: { ...state.self, mode: action.mode, returnLayout: action.mode === "PROMOTED" ? state.layout : undefined } };
  }
  if (action.type === "GALLERY" || action.type === "BACK_TO_CHAT") {
    const placements = { ...state.placements };
    if (action.type === "BACK_TO_CHAT") centralIds(state).forEach(id => { placements[id] = { mode: "MINIMIZED", restore: { mode: "CENTRAL", layout: state.layout } }; });
    return { ...state, placements, layout: gallery, self: state.self?.mode === "PROMOTED" ? { ...state.self, mode: "COMPACT", returnLayout: undefined } : state.self };
  }
  const p = state.placements[action.id];
  if (!p || state.leaving.includes(action.id)) return state;
  if (action.type === "GEOMETRY") {
    const v = action.value;
    if (![v.x, v.y, v.width, v.height].every(Number.isFinite) || v.x < 0 || v.y < 0 || v.width <= 0 || v.height <= 0) return state;
    return { ...state, geometry: { ...state.geometry, [action.id]: v } };
  }
  if (action.type === "SHOW") return p.mode === "HIDDEN" ? normalize(restore(state, action.id, p.show)) : state;
  if (action.type === "LEAVE") return normalize({ ...state, leaving: [...state.leaving, action.id] });
  if (p.mode === "HIDDEN") return state;
  if (action.type === "HIDE") return normalize({ ...state, placements: { ...state.placements, [action.id]: { mode: "HIDDEN", show: p.mode === "MINIMIZED" ? p : visibleTarget(state, p) } } });
  if (action.type === "RESTORE") return p.mode === "MINIMIZED" ? normalize(restore(state, action.id, p.restore)) : state;
  if (action.type === "MINIMIZE") return p.mode === "MINIMIZED" ? state : normalize({ ...state, placements: { ...state.placements, [action.id]: { mode: "MINIMIZED", restore: visibleTarget(state, p) } } });
  if (action.type === "FOCUS") {
    if (p.mode !== "CENTRAL") return state;
    return { ...state, layout: { mode: "FOCUS", shareId: action.id }, self: state.self?.mode === "PROMOTED" ? { ...state.self, mode: "COMPACT", returnLayout: undefined } : state.self };
  }
  if (action.type === "DETACH") {
    if (p.mode === "DETACHED") return state;
    if (detachedId(state)) return { ...state, notice: "Pop in the floating stream first." };
    const intent = p.mode === "MINIMIZED" ? p.restore.mode === "CENTRAL" ? p.restore.layout : p.restore.central : state.layout;
    return normalize({ ...state, placements: { ...state.placements, [action.id]: { mode: "DETACHED", central: intent } } });
  }
  return p.mode === "DETACHED" ? restore(state, action.id, { mode: "CENTRAL", layout: p.central }) : state;
}

/** Workspace-relative usable rectangle. A zero area is temporary, never a new mode. */
export function usableScreenBounds(workspace: Geometry, viewport: Geometry, trayTop?: number, inset = 8): Geometry | null {
  const left = Math.max(workspace.x, viewport.x) + inset, top = Math.max(workspace.y, viewport.y) + inset;
  const right = Math.min(workspace.x + workspace.width, viewport.x + viewport.width) - inset;
  const bottom = Math.min(workspace.y + workspace.height, viewport.y + viewport.height, trayTop ?? Infinity) - inset;
  const result = { x: left - workspace.x, y: top - workspace.y, width: right - left, height: bottom - top };
  return Object.values(result).every(Number.isFinite) && result.width > 0 && result.height > 0 ? result : null;
}
export function clampScreenGeometry(value: Geometry | undefined, bounds: Geometry | null, initialHeight = 240): Geometry | null {
  if (!bounds || !Object.values(bounds).every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) return null;
  const finite = value && Object.values(value).every(Number.isFinite) && value.width > 0 && value.height > 0;
  const width = Math.min(bounds.width, Math.max(Math.min(280, bounds.width), finite ? value.width : 320));
  const height = Math.min(bounds.height, Math.max(Math.min(180, bounds.height), finite ? value.height : initialHeight));
  return { width, height, x: finite ? Math.min(bounds.x + bounds.width - width, Math.max(bounds.x, value.x)) : bounds.x + bounds.width - width,
    y: finite ? Math.min(bounds.y + bounds.height - height, Math.max(bounds.y, value.y)) : bounds.y + bounds.height - height };
}
