import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";
import { Transform } from "class-transformer";
import { canonicalizeEmailValue } from "../email";

export class RegisterDto {
  @Transform(({ value }) => canonicalizeEmailValue(value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: "Username must contain only letters, numbers, and underscores" })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  inviteCode!: string;
}

export class LoginDto {
  @Transform(({ value }) => canonicalizeEmailValue(value))
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
