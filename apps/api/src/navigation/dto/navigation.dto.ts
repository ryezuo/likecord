import { IsUUID } from "class-validator";

export class UpdateLastTextChannelDto {
  @IsUUID()
  channelId!: string;
}
