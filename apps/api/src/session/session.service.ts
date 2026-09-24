import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface RefreshCredential {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ActiveSessionIdentity {
  id: string;
  userId: string;
  accessVersion: number;
}

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshCredential(now = Date.now()): RefreshCredential {
    const rawToken = crypto.randomBytes(64).toString("hex");
    return {
      rawToken,
      tokenHash: this.hashRefreshToken(rawToken),
      expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
    };
  }

  async createLogicalSession(
    client: Prisma.TransactionClient,
    userId: string,
    credential: RefreshCredential,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<ActiveSessionIdentity> {
    return client.refreshSession.create({
      data: {
        userId,
        tokenHash: credential.tokenHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt: credential.expiresAt,
      },
      select: { id: true, userId: true, accessVersion: true },
    });
  }

  async rotateRefreshCredential(rawToken: string, userAgent?: string, ipAddress?: string) {
    if (!rawToken) throw this.refreshFailure("REFRESH_COOKIE_MISSING");

    const tokenHash = this.hashRefreshToken(rawToken);
    const now = new Date();
    const session = await this.prisma.client.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) throw this.refreshFailure("REFRESH_SESSION_NOT_FOUND");
    if (session.revokedAt) throw this.refreshFailure("REFRESH_SESSION_REVOKED");
    if (session.expiresAt <= now) throw this.refreshFailure("REFRESH_SESSION_EXPIRED");

    const next = this.createRefreshCredential();
    const rotated = await this.prisma.client.refreshSession.updateMany({
      where: {
        id: session.id,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        tokenHash: next.tokenHash,
        expiresAt: next.expiresAt,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });
    if (rotated.count !== 1) throw this.refreshFailure("REFRESH_SESSION_REUSED");

    return { session, credential: next };
  }

  async validateAccessSession(
    sessionId: string,
    userId: string,
    accessVersion: number,
  ): Promise<boolean> {
    const session = await this.prisma.client.refreshSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, accessVersion: true, expiresAt: true, revokedAt: true },
    });
    return !!session
      && session.userId === userId
      && session.accessVersion === accessVersion
      && session.revokedAt === null
      && session.expiresAt > new Date();
  }

  async revokeCurrentSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.client.refreshSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private refreshFailure(code: string): UnauthorizedException {
    return new UnauthorizedException({
      error: {
        code,
        message: process.env.NODE_ENV === "production" ? "Session expired" : code,
      },
    });
  }
}
