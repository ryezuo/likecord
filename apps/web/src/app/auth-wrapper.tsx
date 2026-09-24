"use client";

import { DEFAULT_THEME_ID } from "@likecord/shared";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "../hooks/useAuth";
import { applyRootTheme, isProtectedThemeBootstrapPath } from "../lib/theme";

export function ThemeRouteBoundary() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!isProtectedThemeBootstrapPath(pathname)) applyRootTheme(DEFAULT_THEME_ID);
  }, [pathname]);
  return null;
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider><ThemeRouteBoundary />{children}</AuthProvider>;
}
