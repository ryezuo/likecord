import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { avatarError } from "./avatar-error";

@Injectable()
export class AvatarGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const id = (req.user as { id?: string })?.id;
    if (!id || !await this.prisma.client.user.findUnique({ where: { id }, select: { id: true } })) throw avatarError(401, "AUTH_REQUIRED");
    if (Object.keys(req.query).length) throw avatarError(400, "AVATAR_INVALID_REQUEST");
    if (req.method === "POST" || req.method === "DELETE") {
      const cookie = req.cookies?.csrf_token;
      const header = req.headers["x-csrf-token"];
      if (typeof cookie !== "string" || !cookie || typeof header !== "string" || !header) throw avatarError(403, "CSRF_TOKEN_MISSING");
      const a = Buffer.from(cookie), b = Buffer.from(header);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw avatarError(403, "CSRF_TOKEN_MISMATCH");
      const allowed = (process.env.APP_ORIGIN || process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "https://localhost"))
        .split(",").map((value) => value.trim()).filter(Boolean);
      let origin = req.headers.origin;
      if (origin === undefined && req.headers.referer) {
        try { origin = new URL(req.headers.referer).origin; } catch { throw avatarError(403, "FORBIDDEN_ORIGIN"); }
      }
      if (!origin || !allowed.includes(origin)) throw avatarError(403, "FORBIDDEN_ORIGIN");
      if (req.headers["content-encoding"] !== undefined) throw avatarError(415, "AVATAR_FORMAT_UNSUPPORTED");
      if (req.method === "POST" && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(req.headers["content-type"] || ""))
        throw avatarError(415, "AVATAR_FORMAT_UNSUPPORTED");
    }
    if (req.method !== "POST" && (req.headers["transfer-encoding"] || Number(req.headers["content-length"] || 0) !== 0))
      throw avatarError(400, "AVATAR_INVALID_REQUEST");
    return true;
  }
}
