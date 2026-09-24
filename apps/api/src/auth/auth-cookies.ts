import { Response } from "express";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_MS,
    expires: new Date(Date.now() + ACCESS_MAX_AGE_MS),
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE_MS,
    expires: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  });
  clearLegacyCookiePaths(res, "access_token");
  clearLegacyCookiePaths(res, "refresh_token");
}

export function clearAuthCookies(res: Response): void {
  for (const name of ["access_token", "refresh_token"]) {
    res.clearCookie(name, { path: "/" });
    clearLegacyCookiePaths(res, name);
  }
}

function clearLegacyCookiePaths(res: Response, name: string): void {
  res.clearCookie(name, { path: "/api/v1/" });
  res.clearCookie(name, { path: "/api/v1/auth/refresh" });
}
