import { DEFAULT_THEME_ID, THEME_IDS, isThemeId, type ThemeId } from "@likecord/shared";

export const THEME_ROOT_ATTRIBUTE = "data-theme";
export const THEME_LOCAL_STORAGE_KEY = "likecord.theme.bootstrap";

export interface ThemeMetadata {
  label: string;
  rootValue: string;
  selectable: boolean;
  colorScheme: "dark" | "light";
}

export const THEME_REGISTRY = Object.freeze({
  [DEFAULT_THEME_ID]: Object.freeze({
    label: "Likecord Default",
    rootValue: "likecord-default",
    selectable: true,
    colorScheme: "dark",
  }),
  LIKECORD_RETRO_98: Object.freeze({
    label: "Retro 98",
    rootValue: "likecord-retro-98",
    selectable: true,
    colorScheme: "light",
  }),
}) satisfies Readonly<Record<ThemeId, Readonly<ThemeMetadata>>>;

export type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ThemeRoot = Pick<HTMLElement, "getAttribute" | "setAttribute" | "style">;

export function parseThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function themeMetadata(value: unknown): Readonly<ThemeMetadata> {
  return THEME_REGISTRY[parseThemeId(value)];
}

function browserThemeStorage(): ThemeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readThemeMirror(storage: ThemeStorage | null = browserThemeStorage()): ThemeId {
  if (!storage) return DEFAULT_THEME_ID;
  try {
    return parseThemeId(storage.getItem(THEME_LOCAL_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function writeThemeMirror(theme: ThemeId, storage: ThemeStorage | null = browserThemeStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_LOCAL_STORAGE_KEY, parseThemeId(theme));
  } catch {
    // A bootstrap cache must never prevent rendering or durable API ownership.
  }
}

export function clearThemeMirror(storage: ThemeStorage | null = browserThemeStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(THEME_LOCAL_STORAGE_KEY);
  } catch {
    // Storage availability is optional for the theme bootstrap path.
  }
}

export function isProtectedThemeBootstrapPath(pathname: string): boolean {
  return pathname === "/channels" || pathname.startsWith("/channels/")
    || pathname === "/app" || pathname.startsWith("/app/");
}

export function resolveBootstrapTheme(
  pathname = typeof window === "undefined" ? "/" : window.location.pathname,
  storage: ThemeStorage | null = browserThemeStorage(),
): ThemeId {
  return isProtectedThemeBootstrapPath(pathname) ? readThemeMirror(storage) : DEFAULT_THEME_ID;
}

export function applyRootTheme(
  theme: ThemeId,
  root: ThemeRoot | null = typeof document === "undefined" ? null : document.documentElement,
): ThemeId {
  const normalized = parseThemeId(theme);
  const metadata = THEME_REGISTRY[normalized];
  if (root?.getAttribute(THEME_ROOT_ATTRIBUTE) !== metadata.rootValue) {
    root?.setAttribute(THEME_ROOT_ATTRIBUTE, metadata.rootValue);
  }
  if (root && root.style.colorScheme !== metadata.colorScheme) {
    root.style.colorScheme = metadata.colorScheme;
  }
  return normalized;
}

export function resetThemeBootstrap(
  storage: ThemeStorage | null = browserThemeStorage(),
  root: ThemeRoot | null = typeof document === "undefined" ? null : document.documentElement,
): void {
  clearThemeMirror(storage);
  applyRootTheme(DEFAULT_THEME_ID, root);
}

export function getThemeBootstrapScript(): string {
  const themes = Object.fromEntries(THEME_IDS.map((theme) => [theme, {
    rootValue: THEME_REGISTRY[theme].rootValue,
    colorScheme: THEME_REGISTRY[theme].colorScheme,
  }]));
  const config = JSON.stringify({
    defaultTheme: DEFAULT_THEME_ID,
    storageKey: THEME_LOCAL_STORAGE_KEY,
    rootAttribute: THEME_ROOT_ATTRIBUTE,
    themes,
  });

  // This deterministic, data-only script can be covered by a future CSP hash or
  // nonce without weakening policy. It performs no network or preference write.
  return `(()=>{const c=${config};const p=window.location.pathname;const protectedPath=p==="/channels"||p.startsWith("/channels/")||p==="/app"||p.startsWith("/app/");let t=c.defaultTheme;if(protectedPath){try{const cached=window.localStorage.getItem(c.storageKey);if(Object.prototype.hasOwnProperty.call(c.themes,cached))t=cached}catch{}}const m=c.themes[t];const r=document.documentElement;if(r.getAttribute(c.rootAttribute)!==m.rootValue)r.setAttribute(c.rootAttribute,m.rootValue);if(r.style.colorScheme!==m.colorScheme)r.style.colorScheme=m.colorScheme})()`;
}
