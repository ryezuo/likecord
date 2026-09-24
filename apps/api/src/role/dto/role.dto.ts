import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  color?: number;

  @IsOptional()
  @IsString()
  permissions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isHoisted?: boolean;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  color?: number;

  @IsOptional()
  @IsString()
  permissions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isHoisted?: boolean;
}

export class ReorderRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  roleIds!: string[];
}
