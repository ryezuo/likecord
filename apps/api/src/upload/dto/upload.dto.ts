import { IsString, IsOptional, MaxLength, IsNumber, Max } from "class-validator";

export class PrepareUploadDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  @Max(104857600)
  fileSize!: number;
}
