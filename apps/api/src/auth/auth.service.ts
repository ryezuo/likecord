import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { AuditLogService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { SessionService } from "../session/session.service";
import { WsSessionRegistryService } from "../ws/ws-session-registry.service";
import {
  CredentialRateLimitError,
  CredentialRateLimitService,
} from "./credential-rate-limit.service";
import { ChangeEmailDto, ChangePasswordDto } from "./dto/account-security.dto";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { canonicalizeEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  sessionId: string;
  sessionVersion: number;
}

interface SanitizableUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  passwordChangeRequired: boolean;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly credentialRateLimit: CredentialRateLimitService,
    private readonly auditLog: AuditLogService,
    private readonly wsSessions: WsSessionRegistryService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const email = canonicalizeEmail(dto.email);
    const existingEmail = await this.prisma.client.user.findUnique({ where: { email } });
    if (existingEmail) throw this.conflict("EMAIL_TAKEN", "Email is already registered");

    const existingUsername = await this.prisma.client.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw this.conflict("USERNAME_TAKEN", "Username is already taken");

    const passwordHash = await hashPassword(dto.password);
    const credential = this.sessions.createRefreshCredential();
    try {
      const created = await this.prisma.client.$transaction(async (tx) => {
        const invite = await tx.invite.findUnique({ where: { code: dto.inviteCode } });
        if (!invite || invite.isRevoked) {
          throw new BadRequestException({ error: { code: "INVALID_INVITE", message: "Invalid or revoked invite code" } });
        }
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new BadRequestException({ error: { code: "INVITE_EXPIRED", message: "Invite code has expired" } });
        }
        if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
          throw new BadRequestException({ error: { code: "INVITE_MAX_USES", message: "Invite code has reached maximum uses" } });
        }

        const user = await tx.user.create({
          data: { email, username: dto.username, displayName: dto.username, passwordHash },
        });
        const session = await this.sessions.createLogicalSession(tx, user.id, credential, userAgent, ipAddress);
        return { user, session };
      });
      return this.authResult(created.user, created.session, credential.rawToken);
    } catch (error) {
      this.mapIdentityConflict(error);
      throw error;
    }
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const email = canonicalizeEmail(dto.email);
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user || !await verifyPassword(user.passwordHash, dto.password)) {
      throw new UnauthorizedException({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }

    const credential = this.sessions.createRefreshCredential();
    const session = await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
      return this.sessions.createLogicalSession(tx, user.id, credential, userAgent, ipAddress);
    });
    return this.authResult(user, session, credential.rawToken);
  }

  async refresh(rawToken: string, userAgent?: string, ipAddress?: string) {
    const { session, credential } = await this.sessions.rotateRefreshCredential(rawToken, userAgent, ipAddress);
    return this.authResult(
      session.user,
      { id: session.id, userId: session.userId, accessVersion: session.accessVersion },
      credential.rawToken,
    );
  }

  async logout(auth: AuthenticatedUser): Promise<void> {
    const revoked = await this.sessions.revokeCurrentSession(auth.sessionId, auth.id);
    if (!revoked) throw this.sessionInvalid();
    this.disconnectRevokedSessions([auth.sessionId]);
  }

  async changePassword(
    auth: AuthenticatedUser,
    dto: ChangePasswordDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const user = await this.currentUser(auth.id);
    await this.verifyCurrentPassword(user.passwordHash, dto.currentPassword, auth.id, ipAddress);
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException({ error: { code: "PASSWORD_UNCHANGED", message: "New password must be different" } });
    }

    await this.reserveMutation(auth.id, ipAddress);
    let committed = false;
    try {
      const passwordHash = await hashPassword(dto.newPassword);
      const credential = this.sessions.createRefreshCredential();
      const result = await this.prisma.client.$transaction(async (tx) => {
        const nextVersion = await this.rotateCurrentSession(tx, auth, credential, userAgent, ipAddress);
        const otherSessionIds = await this.revokeOtherSessions(tx, auth.id, auth.sessionId);
        const updated = await tx.user.update({
          where: { id: auth.id },
          data: { passwordHash, passwordChangeRequired: false },
        });
        await this.auditLog.recordWithClient(tx, {
          actorId: auth.id,
          targetId: auth.id,
          action: "ACCOUNT_PASSWORD_CHANGED",
          details: { otherSessionsRevoked: otherSessionIds.length },
        });
        return { user: updated, nextVersion, otherSessionIds };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      committed = true;
      this.disconnectRevokedSessions(result.otherSessionIds);
      return this.authResult(
        result.user,
        { id: auth.sessionId, userId: auth.id, accessVersion: result.nextVersion },
        credential.rawToken,
      );
    } catch (error) {
      if (!committed) await this.credentialRateLimit.releaseMutationReservation(auth.id, ipAddress);
      throw error;
    }
  }

  async changeEmail(
    auth: AuthenticatedUser,
    dto: ChangeEmailDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const user = await this.currentUser(auth.id);
    if (user.passwordChangeRequired) {
      throw new ConflictException({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Change your password before changing email" } });
    }
    await this.verifyCurrentPassword(user.passwordHash, dto.currentPassword, auth.id, ipAddress);
    const email = canonicalizeEmail(dto.newEmail);
    if (email === user.email) {
      throw new BadRequestException({ error: { code: "EMAIL_UNCHANGED", message: "New email must be different" } });
    }

    await this.reserveMutation(auth.id, ipAddress);
    let committed = false;
    try {
      const credential = this.sessions.createRefreshCredential();
      const result = await this.prisma.client.$transaction(async (tx) => {
        const nextVersion = await this.rotateCurrentSession(tx, auth, credential, userAgent, ipAddress);
        const otherSessionIds = await this.revokeOtherSessions(tx, auth.id, auth.sessionId);
        const updated = await tx.user.update({ where: { id: auth.id }, data: { email } });
        await this.auditLog.recordWithClient(tx, {
          actorId: auth.id,
          targetId: auth.id,
          action: "ACCOUNT_EMAIL_CHANGED",
          details: { otherSessionsRevoked: otherSessionIds.length },
        });
        return { user: updated, nextVersion, otherSessionIds };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      committed = true;
      this.disconnectRevokedSessions(result.otherSessionIds);
      return this.authResult(
        result.user,
        { id: auth.sessionId, userId: auth.id, accessVersion: result.nextVersion },
        credential.rawToken,
      );
    } catch (error) {
      if (!committed) await this.credentialRateLimit.releaseMutationReservation(auth.id, ipAddress);
      if (this.isUniqueConflict(error, "email")) {
        throw this.conflict("EMAIL_TAKEN", "Email is already registered");
      }
      throw error;
    }
  }

  sanitizeUser(user: SanitizableUser) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      passwordChangeRequired: user.passwordChangeRequired,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private authResult(
    user: SanitizableUser,
    session: { id: string; userId: string; accessVersion: number },
    refreshToken: string,
  ) {
    return {
      user: this.sanitizeUser(user),
      accessToken: this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          sid: session.id,
          sv: session.accessVersion,
        },
        { secret: process.env.JWT_ACCESS_SECRET!, expiresIn: this.ACCESS_TOKEN_TTL },
      ),
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
    };
  }

  private async currentUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw this.sessionInvalid();
    return user;
  }

  private async verifyCurrentPassword(
    passwordHash: string,
    currentPassword: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    if (await verifyPassword(passwordHash, currentPassword)) return;
    await this.credentialRateLimit.recordReauthenticationFailure(userId, ipAddress);
    throw new UnauthorizedException({
      error: { code: "CURRENT_PASSWORD_INVALID", message: "Current password is invalid" },
    });
  }

  private async reserveMutation(userId: string, ipAddress?: string): Promise<void> {
    try {
      await this.credentialRateLimit.reserveSuccessfulMutation(userId, ipAddress);
    } catch (error) {
      if (error instanceof CredentialRateLimitError) {
        throw CredentialRateLimitService.toHttpException(error);
      }
      throw error;
    }
  }

  private async rotateCurrentSession(
    tx: Prisma.TransactionClient,
    auth: AuthenticatedUser,
    credential: { tokenHash: string; expiresAt: Date },
    userAgent?: string,
    ipAddress?: string,
  ): Promise<number> {
    const updated = await tx.refreshSession.updateMany({
      where: {
        id: auth.sessionId,
        userId: auth.id,
        accessVersion: auth.sessionVersion,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        tokenHash: credential.tokenHash,
        expiresAt: credential.expiresAt,
        accessVersion: { increment: 1 },
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });
    if (updated.count !== 1) throw this.sessionInvalid();
    return auth.sessionVersion + 1;
  }

  private async revokeOtherSessions(
    tx: Prisma.TransactionClient,
    userId: string,
    currentSessionId: string,
  ): Promise<string[]> {
    const others = await tx.refreshSession.findMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      select: { id: true },
    });
    if (others.length > 0) {
      await tx.refreshSession.updateMany({
        where: { id: { in: others.map(({ id }) => id) }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return others.map(({ id }) => id);
  }

  private disconnectRevokedSessions(sessionIds: string[]): void {
    try {
      this.wsSessions.quarantineSessions(sessionIds);
      this.wsSessions.disconnectSessions(sessionIds);
    } catch {
      throw new ServiceUnavailableException({
        error: { code: "SESSION_RECONCILIATION_FAILED", message: "Credential change requires a new login" },
      });
    }
  }

  private sessionInvalid(): UnauthorizedException {
    return new UnauthorizedException({ error: { code: "SESSION_INVALID", message: "Session is no longer active" } });
  }

  private conflict(code: string, message: string): ConflictException {
    return new ConflictException({ error: { code, message } });
  }

  private isUniqueConflict(error: unknown, field: string): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    const target = error.meta?.target;
    return Array.isArray(target) ? target.includes(field) : String(target || "").includes(field);
  }

  private mapIdentityConflict(error: unknown): void {
    if (this.isUniqueConflict(error, "email")) throw this.conflict("EMAIL_TAKEN", "Email is already registered");
    if (this.isUniqueConflict(error, "username")) throw this.conflict("USERNAME_TAKEN", "Username is already taken");
  }
}
