import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class UpdateVoiceMixDto {
  @IsInt()
  @Min(0)
  @Max(100)
  volumePercent!: number;

  @IsBoolean()
  muted!: boolean;
}
