import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";
import { RateLimitModule } from "../rate-limit/rate-limit.module";
import { RefreshCleanupService } from "./refresh-cleanup.service";
import { AccountSecurityController } from "./account-security.controller";
import { CredentialMutationGuard } from "./guards/credential-mutation.guard";
import { CredentialRateLimitService } from "./credential-rate-limit.service";
import { SessionModule } from "../session/session.module";
import { WsModule } from "../ws/ws.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}),
    RateLimitModule,
    SessionModule,
    WsModule,
  ],
  controllers: [AuthController, AccountSecurityController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RefreshCleanupService,
    CredentialMutationGuard,
    CredentialRateLimitService,
  ],
  exports: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
