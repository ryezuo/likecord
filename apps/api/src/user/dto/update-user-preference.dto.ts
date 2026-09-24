import { THEME_IDS, type ThemeId } from "@likecord/shared/theme";
import { NATIVE_CAPTURE_INTENTS, ECHO_CANCELLATION_INTENTS, type NativeCaptureIntent, type EchoCancellationIntent } from "@likecord/shared/capture-preferences";
import { NOISE_SUPPRESSION_MODES, type NoiseSuppressionMode } from "@likecord/shared/capture-preferences";
import { IsBoolean, IsIn, IsInt, Min, Max, ValidateIf } from "class-validator";

export class UpdateUserPreferenceDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(NOISE_SUPPRESSION_MODES)
  noiseSuppressionMode?: NoiseSuppressionMode;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(200)
  inputGainPercent?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  voiceActivationEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(-80)
  @Max(-10)
  voiceActivationThresholdDbfs?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(ECHO_CANCELLATION_INTENTS)
  echoCancellationIntent?: EchoCancellationIntent;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(NATIVE_CAPTURE_INTENTS)
  noiseSuppressionIntent?: NativeCaptureIntent;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(NATIVE_CAPTURE_INTENTS)
  autoGainControlIntent?: NativeCaptureIntent;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(NATIVE_CAPTURE_INTENTS)
  voiceIsolationIntent?: NativeCaptureIntent;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  showSendButton?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(THEME_IDS)
  theme?: ThemeId;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  soundEffectsEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  soundEffectsVolume?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(200)
  callAndStreamVolume?: number;
}

export class ImportSoundEffectsPreferenceDto {
  @IsBoolean()
  enabled!: boolean;
}
