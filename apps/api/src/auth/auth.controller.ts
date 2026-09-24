import { Controller, Post, Get, Body, Req, Res, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import * as crypto from "crypto";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Public } from "./guards/public.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RateLimitGuard } from "../rate-limit/rate-limit.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { clearAuthCookies, setAuthCookies } from "./auth-cookies";
import { type AuthenticatedUser } from "./auth.service";

@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @UseGuards(RateLimitGuard)
  @RateLimit("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, req.headers["user-agent"], req.ip);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Public()
  @Post("login")
  @UseGuards(RateLimitGuard)
  @RateLimit("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, req.headers["user-agent"], req.ip);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Public()
  @Post("refresh")
  @UseGuards(RateLimitGuard)
  @RateLimit("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.refresh_token;
    const result = await this.authService.refresh(rawToken, req.headers["user-agent"], req.ip);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, expiresIn: result.expiresIn };
  }

  @Public()
  @Get("debug-cookies")
  async debugCookies(@Req() req: Request) {
    if (process.env.NODE_ENV === "production") return { error: "not available" };
    const rawToken = req.cookies?.refresh_token;
    let sessionInfo: Record<string, unknown> = {
      refreshTokenPresent: !!rawToken,
      refreshTokenLength: rawToken?.length || 0,
    };
    if (rawToken) {
      try {
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const session = await this.authService["prisma"].client.refreshSession.findUnique({
          where: { tokenHash },
          select: { id: true, revokedAt: true, expiresAt: true },
        });
        sessionInfo = {
          ...sessionInfo,
          refreshSessionFound: !!session,
          refreshSessionExpired: session ? session.expiresAt < new Date() : null,
          refreshSessionRevoked: session ? !!session.revokedAt : null,
          refreshCanRotate: session ? !session.revokedAt && session.expiresAt > new Date() : false,
        };
      } catch {
        sessionInfo.sessionCheckError = true;
      }
    }
    return {
      hasAccessToken: !!req.cookies?.access_token,
      hasRefreshToken: !!rawToken,
      hasCsrfToken: !!req.cookies?.csrf_token,
      ...sessionInfo,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user as AuthenticatedUser);
    clearAuthCookies(res);
  }
}
