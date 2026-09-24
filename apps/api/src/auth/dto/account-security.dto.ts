import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { canonicalizeEmailValue } from "../email";

export class ChangeEmailDto {
  @Transform(({ value }) => canonicalizeEmailValue(value))
  @IsEmail()
  newEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
