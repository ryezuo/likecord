import { Controller, Get, UseGuards } from "@nestjs/common";
import { VoiceService } from "./voice.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("voice")
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get("ice-servers")
  async getIceServers() {
    return this.voiceService.getIceServers();
  }
}
