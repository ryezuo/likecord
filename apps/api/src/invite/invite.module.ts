import { Module } from "@nestjs/common";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
