import { Controller, Get, Patch, Put, Delete, HttpCode, Param, Body, Req, UseGuards, ValidationPipe } from "@nestjs/common";
import { Request } from "express";
import { UserService } from "./user.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VoiceMixService } from "./voice-mix.service";
import { UpdateVoiceMixDto } from "./dto/update-voice-mix.dto";
import { PreferenceService } from "./preference.service";
import { UpdateUserPreferenceDto, ImportSoundEffectsPreferenceDto } from "./dto/update-user-preference.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly voiceMixService: VoiceMixService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get("@me/preferences")
  getPreferences(@Req() req: Request) {
    return this.preferenceService.getPreferences((req.user as { id: string }).id);
  }

  @Patch("@me/preferences")
  updatePreferences(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: UpdateUserPreferenceDto,
  ) {
    return this.preferenceService.updatePreferences((req.user as { id: string }).id, dto);
  }

  @Put("@me/preferences/sound-effects/import")
  importSoundEffectsPreference(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: ImportSoundEffectsPreferenceDto,
  ) {
    return this.preferenceService.importSoundEffectsPreference((req.user as { id: string }).id, dto.enabled);
  }

  @Get("@me/voice-mix")
  getVoiceMix(@Req() req: Request) {
    return this.voiceMixService.getPreferences((req.user as { id: string }).id);
  }

  @Put("@me/voice-mix/:targetUserId")
  setVoiceMix(
    @Req() req: Request,
    @Param("targetUserId") targetUserId: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: UpdateVoiceMixDto,
  ) {
    return this.voiceMixService.setPreference((req.user as { id: string }).id, targetUserId, dto);
  }

  @Delete("@me/voice-mix/:targetUserId")
  @HttpCode(204)
  resetVoiceMix(@Req() req: Request, @Param("targetUserId") targetUserId: string) {
    return this.voiceMixService.resetPreference((req.user as { id: string }).id, targetUserId);
  }

  @Get("@me")
  async getMe(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.userService.getMe(user.id);
  }

  @Patch("@me")
  async updateProfile(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: UpdateProfileDto,
  ) {
    const user = req.user as { id: string };
    return this.userService.updateProfile(user.id, dto);
  }
}
