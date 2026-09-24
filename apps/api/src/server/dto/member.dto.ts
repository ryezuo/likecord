import { IsString, IsOptional, MaxLength, IsDateString } from "class-validator";

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;
}

export class MuteMemberDto {
  @IsOptional()
  @IsDateString()
  until?: string;
}
