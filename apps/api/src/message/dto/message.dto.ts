import { IsString, MinLength, MaxLength, IsOptional, IsArray } from "class-validator";

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class UpdateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
