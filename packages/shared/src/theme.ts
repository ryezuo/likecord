export const THEME_IDS = ["LIKECORD_DEFAULT", "LIKECORD_RETRO_98"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME_ID = THEME_IDS[0];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
