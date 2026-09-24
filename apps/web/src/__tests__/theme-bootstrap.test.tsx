import "@testing-library/jest-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render } from "@testing-library/react";
import { THEME_IDS } from "@likecord/shared";
import RootLayout from "../app/layout";
import { ThemeRouteBoundary } from "../app/auth-wrapper";
import {
  THEME_LOCAL_STORAGE_KEY,
  THEME_REGISTRY,
  type ThemeRoot,
  applyRootTheme,
  getThemeBootstrapScript,
  readThemeMirror,
  resetThemeBootstrap,
  resolveBootstrapTheme,
  themeMetadata,
} from "../lib/theme";

let mockPathname = "/channels/@me";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function runBootstrap(pathname: string) {
  window.history.replaceState({}, "", pathname);
  Function("window", "document", getThemeBootstrapScript())(window, document);
}

describe("theme registry and pre-hydration bootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    mockPathname = "/channels/@me";
  });

  it("registers exactly Default and Retro 98 with explicit root and UA metadata", () => {
    expect(THEME_IDS).toEqual(["LIKECORD_DEFAULT", "LIKECORD_RETRO_98"]);
    expect(Object.keys(THEME_REGISTRY)).toEqual(["LIKECORD_DEFAULT", "LIKECORD_RETRO_98"]);
    expect(themeMetadata("LIKECORD_DEFAULT")).toEqual({
      label: "Likecord Default",
      rootValue: "likecord-default",
      selectable: true,
      colorScheme: "dark",
    });
    expect(themeMetadata("LIKECORD_RETRO_98")).toEqual({
      label: "Retro 98",
      rootValue: "likecord-retro-98",
      selectable: true,
      colorScheme: "light",
    });
    expect(themeMetadata("UNKNOWN")).toBe(THEME_REGISTRY.LIKECORD_DEFAULT);
  });

  it("reads valid protected-route mirror data and defaults invalid or missing data", () => {
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_DEFAULT");
    expect(resolveBootstrapTheme("/channels/@me", window.localStorage)).toBe("LIKECORD_DEFAULT");
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_RETRO_98");
    expect(resolveBootstrapTheme("/channels/@me", window.localStorage)).toBe("LIKECORD_RETRO_98");
    expect(readThemeMirror(window.localStorage)).toBe("LIKECORD_RETRO_98");
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "UNKNOWN");
    expect(readThemeMirror(window.localStorage)).toBe("LIKECORD_DEFAULT");
    window.localStorage.removeItem(THEME_LOCAL_STORAGE_KEY);
    expect(readThemeMirror(window.localStorage)).toBe("LIKECORD_DEFAULT");
  });

  it("ignores the authenticated mirror on Login, Register, and Invite routes", () => {
    const storage = { getItem: jest.fn(() => "LIKECORD_RETRO_98"), setItem: jest.fn(), removeItem: jest.fn() };
    for (const path of ["/", "/register", "/invite/example"]) {
      expect(resolveBootstrapTheme(path, storage)).toBe("LIKECORD_DEFAULT");
    }
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("survives unavailable storage and never applies an unknown root value", () => {
    const storage = {
      getItem: jest.fn(() => { throw new Error("disabled"); }),
      setItem: jest.fn(() => { throw new Error("disabled"); }),
      removeItem: jest.fn(() => { throw new Error("disabled"); }),
    };
    expect(resolveBootstrapTheme("/channels/@me", storage)).toBe("LIKECORD_DEFAULT");
    expect(() => resetThemeBootstrap(storage, document.documentElement)).not.toThrow();
    expect(applyRootTheme("UNKNOWN" as never)).toBe("LIKECORD_DEFAULT");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("runs before hydration with a protected mirror and applies matching root and UA metadata", () => {
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_RETRO_98");
    runBootstrap("/channels/@me");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");

    document.documentElement.setAttribute("data-theme", "stale-theme");
    document.documentElement.style.colorScheme = "light";
    runBootstrap("/register");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "UNKNOWN");
    document.documentElement.setAttribute("data-theme", "stale-theme");
    document.documentElement.style.colorScheme = "light";
    runBootstrap("/channels/server/channel");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("does not churn matching root presentation during bootstrap or live reconciliation", () => {
    const setAttribute = jest.fn();
    const setColorScheme = jest.fn();
    let colorScheme = "dark";
    const style = {} as CSSStyleDeclaration;
    Object.defineProperty(style, "colorScheme", {
      configurable: true,
      get: () => colorScheme,
      set: (value: string) => { colorScheme = value; setColorScheme(value); },
    });
    const root = {
      getAttribute: jest.fn(() => "likecord-default"),
      setAttribute,
      style,
    } satisfies ThemeRoot;

    expect(applyRootTheme("LIKECORD_DEFAULT", root)).toBe("LIKECORD_DEFAULT");
    expect(setAttribute).not.toHaveBeenCalled();
    expect(setColorScheme).not.toHaveBeenCalled();

    const windowLike = {
      location: { pathname: "/channels/@me" },
      localStorage: { getItem: jest.fn(() => "LIKECORD_DEFAULT") },
    };
    Function("window", "document", getThemeBootstrapScript())(windowLike, { documentElement: root });
    expect(setAttribute).not.toHaveBeenCalled();
    expect(setColorScheme).not.toHaveBeenCalled();
  });

  it("emits an explicit matching root identity without broad hydration suppression", () => {
    const layout = RootLayout({ children: <main>Likecord</main> }) as React.ReactElement<{
      "data-theme": string;
      style: React.CSSProperties;
      suppressHydrationWarning?: boolean;
      children: React.ReactNode;
    }>;
    expect(layout.props["data-theme"]).toBe("likecord-default");
    expect(layout.props.style.colorScheme).toBe("dark");
    expect(layout.props.suppressHydrationWarning).toBeUndefined();

    runBootstrap("/channels/@me");
    expect(document.documentElement.getAttribute("data-theme")).toBe(layout.props["data-theme"]);
    expect(document.documentElement.style.colorScheme).toBe(layout.props.style.colorScheme);
  });

  it("keeps the current root across protected route changes and resets public routes", () => {
    applyRootTheme("LIKECORD_DEFAULT");
    const root = document.documentElement;
    const setAttribute = jest.spyOn(root, "setAttribute");
    const view = render(<ThemeRouteBoundary />);

    mockPathname = "/channels/server/channel";
    view.rerender(<ThemeRouteBoundary />);
    expect(document.documentElement).toBe(root);
    expect(root).toHaveAttribute("data-theme", "likecord-default");
    expect(root.style.colorScheme).toBe("dark");
    expect(setAttribute).not.toHaveBeenCalled();

    root.setAttribute("data-theme", "stale-theme");
    root.style.colorScheme = "light";
    setAttribute.mockClear();
    mockPathname = "/register";
    view.rerender(<ThemeRouteBoundary />);
    expect(root).toHaveAttribute("data-theme", "likecord-default");
    expect(root.style.colorScheme).toBe("dark");
    expect(setAttribute).toHaveBeenCalledTimes(1);
    setAttribute.mockRestore();
  });

  it("exposes the unchanged default token map under the explicit root identity", () => {
    const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
    expect(css).toMatch(/:root,\s*\[data-theme="likecord-default"\]\s*\{/);
    for (const declaration of [
      "color-scheme: dark",
      "--bg-base: #0B0D12",
      "--bg-primary: #11141B",
      "--bg-secondary: #171B24",
      "--bg-tertiary: #1E232E",
      "--bg-elevated: #272D3A",
      "--brand-primary: #6254CE",
      "--text-primary: #F2F3F7",
      "--focus-ring: var(--text-link)",
    ]) expect(css).toContain(declaration);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (forced-colors: active)");
  });
});
