import "./polyfill";
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { ServerModule } from "./server/server.module";
import { ChannelModule } from "./channel/channel.module";
import { RoleModule } from "./role/role.module";
import { InviteModule } from "./invite/invite.module";
import { MessageModule } from "./message/message.module";
import { UploadModule } from "./upload/upload.module";
import { StorageModule } from "./storage/storage.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { AuditModule } from "./audit/audit.module";
import { PresenceModule } from "./presence/presence.module";
import { VoiceModule } from "./voice/voice.module";
import { WsModule } from "./ws/ws.module";
import { NavigationModule } from "./navigation/navigation.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { BigIntInterceptor } from "./interceptors/bigint.interceptor";
import { CsrfMiddleware } from "./csrf/csrf.middleware";
import { UuidParamGuard } from "./validation/uuid-param.guard";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UserModule,
    ServerModule,
    ChannelModule,
    RoleModule,
    InviteModule,
    MessageModule,
    UploadModule,
    StorageModule,
    PresenceModule,
    VoiceModule,
    WsModule,
    NavigationModule,
    RateLimitModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UuidParamGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes("*");
  }
}
