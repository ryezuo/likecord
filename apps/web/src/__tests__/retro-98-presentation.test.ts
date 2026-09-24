import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const publicRoot = join(process.cwd(), "public");
const themesRoot = join(publicRoot, "themes");
const globalsPath = join(process.cwd(), "src", "app", "globals.css");
const retroCssPath = join(process.cwd(), "src", "styles", "themes", "retro-98.css");
const layoutPath = join(process.cwd(), "src", "app", "layout.tsx");
const componentsRoot = join(process.cwd(), "src", "components");

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hexVariable(css: string, name: string): string {
  const value = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
  if (!value) throw new Error(`Missing solid color variable ${name}`);
  return value;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
    const [red, green, blue] = channels.map((value) => value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe("Retro 98 presentation and theme-first assets", () => {
  const defaultMark = join(themesRoot, "default", "assets", "brand", "mark.png");
  const compatibilityMark = join(publicRoot, "brand", "likecord-icon.png");
  const retroMark = join(themesRoot, "retro-98", "assets", "brand", "mark.svg");

  it("ships only the two accepted theme marks and preserves the Default compatibility bytes", () => {
    expect(existsSync(defaultMark)).toBe(true);
    expect(existsSync(retroMark)).toBe(true);
    expect(sha256(defaultMark)).toBe("c8c492eacfdcea33f7efc02ecfffca442ee1a6ee8f020a8763fa2cd26eb03949");
    expect(sha256(retroMark)).toBe("749093033e433c75e6cb3134b9e4905065d8f841c723c85948222cd91832c651");
    expect(sha256(defaultMark)).toBe(sha256(compatibilityMark));
    expect(filesUnder(themesRoot).map((path) => relative(publicRoot, path).replaceAll("\\", "/")).sort()).toEqual([
      "themes/default/assets/brand/mark.png",
      "themes/retro-98/assets/brand/mark.svg",
    ]);

    const publicFiles = filesUnder(publicRoot).map((path) => path.toLowerCase().replaceAll("\\", "/"));
    for (const blockedName of [
      "win98-concept-reference.png",
      "winxp-concept-reference.png",
      "retro-theme-asset-board-reference.png",
      "likecord-logo-horizontal-transparent.png",
      "likecord-logo-horizontal-win98.svg",
      "likecord-logo-horizontal-win98.png",
      "likecord-wallpaper-win98.png",
    ]) expect(publicFiles.some((path) => path.endsWith(`/${blockedName}`))).toBe(false);
  });

  it("keeps the accepted Retro mark self-contained and vector-only", () => {
    const svg = readFileSync(retroMark, "utf8");
    expect(svg).toMatch(/^<svg\b/);
    expect(svg).not.toMatch(/<image\b/i);
    expect(svg).not.toMatch(/(?:href|xlink:href)=["'](?:https?:|\/\/|data:|file:)/i);
  });

  it("uses one root-owned in-product mark while public and loading branding stay Default", () => {
    const globals = readFileSync(globalsPath, "utf8");
    const retro = readFileSync(retroCssPath, "utf8");
    const components = filesUnder(componentsRoot)
      .filter((path) => /\.(?:ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(globals).toContain('--brand-in-product-mark: url("/themes/default/assets/brand/mark.png")');
    expect(retro).toContain('--brand-in-product-mark: url("/themes/retro-98/assets/brand/mark.svg")');
    expect(globals).toMatch(/\.home-brand-mark\s*\{[^}]*background: var\(--brand-in-product-mark\)/s);
    expect(globals.match(/url\("\/brand\/likecord-icon\.png"\)/g)).toHaveLength(2);
    expect(components).not.toContain("LIKECORD_RETRO_98");
  });

  it("keeps Retro tokens and bounded chrome under the explicit root scope", () => {
    const globals = readFileSync(globalsPath, "utf8");
    const retro = readFileSync(retroCssPath, "utf8");
    const layout = readFileSync(layoutPath, "utf8");

    expect(layout).toContain('import "../styles/themes/retro-98.css"');
    expect(retro).toContain('[data-theme="likecord-retro-98"]');
    for (const declaration of [
      "color-scheme: light",
      "--bg-base: #008080",
      "--bg-primary: #C0C0C0",
      "--text-primary: #000000",
      "--text-secondary: #242424",
      "--text-muted: #4A4A4A",
      "--text-disabled: #595959",
      "--text-link: #0000EE",
      "--success: #00652A",
      "--warning: #765000",
      "--danger: #A20D1A",
      "--info: #004B9B",
      '--font: "MS Sans Serif", Tahoma, Verdana, Arial, sans-serif',
      "--theme-chrome-bevel-highlight: #FFFFFF",
      "--theme-chrome-bevel-shadow: #808080",
      "--theme-chrome-bevel-dark: #000000",
      "--theme-chrome-titlebar-start: #000080",
      "--theme-chrome-titlebar-end: #1084D0",
      "--theme-control-radius: 0px",
    ]) expect(retro).toContain(declaration);

    expect(globals).not.toContain("MS Sans Serif");
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globals).toContain("@media (forced-colors: active)");
    expect(retro).toContain("@media (forced-colors: active)");
  });

  it("keeps light-theme text, semantic states, and active selection readable", () => {
    const retro = readFileSync(retroCssPath, "utf8");
    const pairs = [
      ["--text-primary", "--bg-tertiary"],
      ["--text-secondary", "--bg-secondary"],
      ["--text-muted", "--bg-primary"],
      ["--text-disabled", "--bg-secondary"],
      ["--text-link", "--bg-tertiary"],
      ["--success", "--bg-tertiary"],
      ["--success", "--bg-active"],
      ["--warning", "--bg-tertiary"],
      ["--danger", "--bg-tertiary"],
      ["--info", "--bg-tertiary"],
      ["--text-on-brand", "--brand-primary"],
    ] as const;

    for (const [foreground, background] of pairs) {
      expect(contrastRatio(hexVariable(retro, foreground), hexVariable(retro, background))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("does not theme-swap browser identity, action icons, status icons, or unused Retro assets", () => {
    const retro = readFileSync(retroCssPath, "utf8");
    const layout = readFileSync(layoutPath, "utf8");
    const assetUrls = Array.from(retro.matchAll(/url\(["']?([^"')]+)["']?\)/g), (match) => match[1]);

    expect(assetUrls).toEqual(["/themes/retro-98/assets/brand/mark.svg"]);
    expect(retro).not.toMatch(/wallpaper|horizontal|\.ico|likecord-app-/i);
    expect(layout).not.toMatch(/\bicons\s*:/);
    expect(layout).not.toMatch(/\bmanifest\s*:/);
  });
});
