import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsInt,
  IsUUID,
  Matches,
} from "class-validator";

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(["TEXT", "VOICE"])
  type?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  allowedRoleIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  allowedMemberIds?: string[];
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  topic?: string;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  position?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  position?: number;
}

export type PermissionOverwriteTargetType = "ROLE" | "MEMBER";

export class UpsertPermissionOverwriteDto {
  @IsString()
  @Matches(/^\d+$/)
  allow!: string;

  @IsString()
  @Matches(/^\d+$/)
  deny!: string;
}
