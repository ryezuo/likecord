import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import {
  CredentialRateLimitError,
  CredentialRateLimitService,
} from "../credential-rate-limit.service";

@Injectable()
export class CredentialMutationGuard implements CanActivate {
  constructor(private readonly rateLimit: CredentialRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const user = req.user as { id?: string } | undefined;
    if (!user?.id) throw this.error(401, "AUTH_REQUIRED", "Authentication required");
    if (Object.keys(req.query).length !== 0) throw this.error(400, "CREDENTIAL_REQUEST_INVALID", "Invalid credential request");

    const cookie = req.cookies?.csrf_token;
    const header = req.headers["x-csrf-token"];
    if (typeof cookie !== "string" || !cookie || typeof header !== "string" || !header) {
      throw this.error(403, "CSRF_TOKEN_MISSING", "CSRF token is required");
    }
    const cookieBuffer = Buffer.from(cookie);
    const headerBuffer = Buffer.from(header);
    if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
      throw this.error(403, "CSRF_TOKEN_MISMATCH", "Invalid CSRF token");
    }

    const requestOrigin = this.requestOrigin(req);
    if (!requestOrigin || !this.allowedOrigins().has(requestOrigin)) {
      throw this.error(403, "FORBIDDEN_ORIGIN", "Request origin is not allowed");
    }

    try {
      await this.rateLimit.assertAdmission(user.id, req.ip);
    } catch (error) {
      if (error instanceof CredentialRateLimitError) {
        res.setHeader("Retry-After", error.retryAfter);
        throw CredentialRateLimitService.toHttpException(error);
      }
      throw error;
    }
    return true;
  }

  private requestOrigin(req: Request): string | null {
    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (typeof origin !== "string") return null;
      try {
        const parsed = new URL(origin);
        return parsed.origin === origin ? parsed.origin : null;
      } catch {
        return null;
      }
    }
    const referer = req.headers.referer;
    if (typeof referer !== "string") return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private allowedOrigins(): Set<string> {
    const configured = process.env.APP_ORIGIN || process.env.CORS_ORIGIN
      || (process.env.NODE_ENV === "production" ? "" : "https://localhost");
    const result = new Set<string>();
    for (const value of configured.split(",").map((item) => item.trim()).filter(Boolean)) {
      try {
        const parsed = new URL(value);
        if (parsed.origin === value) result.add(parsed.origin);
      } catch {
        // Invalid configured origins cannot authorize credential mutations.
      }
    }
    return result;
  }

  private error(status: number, code: string, message: string): HttpException {
    return new HttpException({ error: { code, message } }, status);
  }
}
