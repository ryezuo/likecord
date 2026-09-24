import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { VoiceMixService } from "./voice-mix.service";
import { PreferenceService } from "./preference.service";
import { AvatarController } from "./avatar/avatar.controller";
import { AvatarService } from "./avatar/avatar.service";
import { AvatarGuard } from "./avatar/avatar.guard";
import { AvatarGcService } from "./avatar/avatar-gc.service";
import { RateLimitModule } from "../rate-limit/rate-limit.module";

@Module({
  imports: [RateLimitModule],
  controllers: [UserController, AvatarController],
  providers: [UserService, VoiceMixService, PreferenceService, AvatarService, AvatarGuard, AvatarGcService],
  exports: [UserService],
})
export class UserModule {}
