import { Injectable } from "@nestjs/common";
import type { UserPreferenceDto, UpdateUserPreferenceRequest } from "@likecord/shared";
import { DEFAULT_THEME_ID, isThemeId } from "@likecord/shared/theme";
import { DEFAULT_CAPTURE_PREFERENCES, normalizeCapturePreferences, type CapturePreferences } from "@likecord/shared/capture-preferences";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserPreferenceDto } from "./dto/update-user-preference.dto";

export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferenceDto> = Object.freeze({
  ...DEFAULT_CAPTURE_PREFERENCES,
  showSendButton: false,
  theme: DEFAULT_THEME_ID,
  soundEffectsEnabled: null,
  soundEffectsVolume: 70,
  callAndStreamVolume: 100,
});

const preferenceSelect = { showSendButton: true, theme: true, soundEffectsEnabled: true, soundEffectsVolume: true, callAndStreamVolume: true,
  noiseSuppressionMode: true,
  inputGainPercent: true, voiceActivationEnabled: true, voiceActivationThresholdDbfs: true,
  echoCancellationIntent: true, noiseSuppressionIntent: true, autoGainControlIntent: true, voiceIsolationIntent: true,
} as const;

function projectPreference(preference: ({ showSendButton: boolean; theme: string; soundEffectsEnabled: boolean | null; soundEffectsVolume: number; callAndStreamVolume: number } & CapturePreferences) | null): UserPreferenceDto {
  if (!preference) return { ...DEFAULT_USER_PREFERENCES };
  return {
    ...normalizeCapturePreferences(preference),
    showSendButton: preference.showSendButton,
    theme: isThemeId(preference.theme) ? preference.theme : DEFAULT_THEME_ID,
    soundEffectsEnabled: preference.soundEffectsEnabled,
    soundEffectsVolume: preference.soundEffectsVolume,
    callAndStreamVolume: preference.callAndStreamVolume,
  };
}

@Injectable()
export class PreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<UserPreferenceDto> {
    const preference = await this.prisma.client.userPreference.findUnique({
      where: { userId },
      select: preferenceSelect,
    });
    return projectPreference(preference);
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferenceDto): Promise<UserPreferenceDto> {
    const update: UpdateUserPreferenceRequest = {};
    if (dto.noiseSuppressionMode !== undefined) update.noiseSuppressionMode = dto.noiseSuppressionMode;
    if (dto.inputGainPercent !== undefined) update.inputGainPercent = dto.inputGainPercent;
    if (dto.voiceActivationEnabled !== undefined) update.voiceActivationEnabled = dto.voiceActivationEnabled;
    if (dto.voiceActivationThresholdDbfs !== undefined) update.voiceActivationThresholdDbfs = dto.voiceActivationThresholdDbfs;
    if (dto.echoCancellationIntent !== undefined) update.echoCancellationIntent = dto.echoCancellationIntent;
    if (dto.noiseSuppressionIntent !== undefined) update.noiseSuppressionIntent = dto.noiseSuppressionIntent;
    if (dto.autoGainControlIntent !== undefined) update.autoGainControlIntent = dto.autoGainControlIntent;
    if (dto.voiceIsolationIntent !== undefined) update.voiceIsolationIntent = dto.voiceIsolationIntent;
    if (dto.showSendButton !== undefined) update.showSendButton = dto.showSendButton;
    if (dto.theme !== undefined) update.theme = dto.theme;
    if (dto.soundEffectsEnabled !== undefined) update.soundEffectsEnabled = dto.soundEffectsEnabled;
    if (dto.soundEffectsVolume !== undefined) update.soundEffectsVolume = dto.soundEffectsVolume;
    if (dto.callAndStreamVolume !== undefined) update.callAndStreamVolume = dto.callAndStreamVolume;
    if (Object.keys(update).length === 0) return this.getPreferences(userId);

    const preference = await this.prisma.client.userPreference.upsert({
      where: { userId },
      create: { userId, ...update },
      update,
      select: preferenceSelect,
    });
    return projectPreference(preference);
  }

  async importSoundEffectsPreference(userId: string, enabled: boolean): Promise<UserPreferenceDto> {
    // PostgreSQL's conflict row lock serializes this with both imports and
    // ordinary upserts. A theme-only row is still unset; false is never null.
    const rows = await this.prisma.client.$queryRaw<Array<CapturePreferences & {
      showSendButton: boolean; theme: string; soundEffectsEnabled: boolean | null; soundEffectsVolume: number; callAndStreamVolume: number;
    }>>`
      INSERT INTO "user_preferences" ("userId", "soundEffectsEnabled", "updatedAt")
      VALUES (${userId}::uuid, ${enabled}, NOW())
      ON CONFLICT ("userId") DO UPDATE
      SET "soundEffectsEnabled" = COALESCE("user_preferences"."soundEffectsEnabled", EXCLUDED."soundEffectsEnabled"),
          "updatedAt" = CASE WHEN "user_preferences"."soundEffectsEnabled" IS NULL
            THEN EXCLUDED."updatedAt" ELSE "user_preferences"."updatedAt" END
      RETURNING "showSendButton", "theme", "soundEffectsEnabled", "soundEffectsVolume", "callAndStreamVolume",
        "inputGainPercent", "voiceActivationEnabled", "voiceActivationThresholdDbfs", "echoCancellationIntent",
        "noiseSuppressionIntent", "autoGainControlIntent", "voiceIsolationIntent", "noiseSuppressionMode"`;
    return projectPreference(rows[0]);
  }
}
