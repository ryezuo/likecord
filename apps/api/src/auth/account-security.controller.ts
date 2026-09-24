import { Body, Controller, Patch, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthenticatedUser, AuthService } from "./auth.service";
import { setAuthCookies } from "./auth-cookies";
import { ChangeEmailDto, ChangePasswordDto } from "./dto/account-security.dto";
import { CredentialMutationGuard } from "./guards/credential-mutation.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("users/@me")
@UseGuards(JwtAuthGuard)
export class AccountSecurityController {
  constructor(private readonly authService: AuthService) {}

  @Patch("email")
  @UseGuards(CredentialMutationGuard)
  async changeEmail(
    @Body() dto: ChangeEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changeEmail(
      req.user as AuthenticatedUser,
      dto,
      req.headers["user-agent"],
      req.ip,
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Patch("password")
  @UseGuards(CredentialMutationGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      req.user as AuthenticatedUser,
      dto,
      req.headers["user-agent"],
      req.ip,
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, user: result.user };
  }
}
