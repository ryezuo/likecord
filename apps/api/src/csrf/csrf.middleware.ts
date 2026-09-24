import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
const isSecure = () => true;

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private allowedOrigins: string[];

  constructor() {
    const origin = process.env.CORS_ORIGIN;
    this.allowedOrigins = origin ? origin.split(",").map((o) => o.trim()) : [];
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (!req.cookies?.csrf_token) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: "lax",
        secure: isSecure(),
        path: "/",
      });
    }

    if (SAFE_METHODS.includes(req.method)) return next();

    if (process.env.NODE_ENV === "production") {
      const origin = req.headers["origin"] as string | undefined;
      const referer = req.headers["referer"] as string | undefined;
      if (!this.isAllowedOrigin(origin, referer)) {
        res.status(403).json({
          error: { code: "FORBIDDEN_ORIGIN", message: "Request origin is not allowed" },
        });
        return;
      }
    }

    const url = (req.originalUrl || req.url).toLowerCase();

    // Register, login, refresh, and logout are exempt (cookie-based auth)
    if (url.endsWith("/auth/register") || url.endsWith("/auth/login") ||
        url.endsWith("/auth/refresh") || url.endsWith("/auth/logout")) {
      return next();
    }

    // All other unsafe routes require CSRF validation
    const cookieToken = req.cookies?.csrf_token as string | undefined;
    const headerToken = req.headers["x-csrf-token"] as string | undefined;

    if (!cookieToken) {
      // CSRF cookie was just set on this request; let it pass for the next request
      return next();
    }

    if (!headerToken) {
      res.status(403).json({
        error: { code: "CSRF_TOKEN_MISSING", message: "Missing X-CSRF-Token header" },
      });
      return;
    }

    const buf1 = Buffer.from(headerToken);
    const buf2 = Buffer.from(cookieToken);
    if (buf1.length !== buf2.length || !crypto.timingSafeEqual(buf1, buf2)) {
      res.status(403).json({
        error: { code: "CSRF_TOKEN_MISMATCH", message: "Invalid CSRF token" },
      });
      return;
    }

    next();
  }

  private isAllowedOrigin(origin?: string, referer?: string): boolean {
    if (process.env.NODE_ENV !== "production") return true;
    if (!origin && !referer) return true;
    const check = (url: string) => this.allowedOrigins.some((o) => url.startsWith(o));
    if (origin && check(origin)) return true;
    if (referer && check(referer)) return true;
    return false;
  }
}
