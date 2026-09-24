import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateVoiceMixDto } from "./dto/update-voice-mix.dto";

const preferenceSelect = { targetUserId: true, volumePercent: true, muted: true } as const;

@Injectable()
export class VoiceMixService {
  constructor(private readonly prisma: PrismaService) {}

  getPreferences(listenerUserId: string) {
    return this.prisma.client.userVoiceMixPreference.findMany({
      where: { listenerUserId, OR: [{ volumePercent: { not: 100 } }, { muted: true }] },
      select: preferenceSelect,
      orderBy: { targetUserId: "asc" },
    });
  }

  private nonSelfTarget(listenerUserId: string, targetUserId: string) {
    const target = targetUserId.toLowerCase();
    if (listenerUserId.toLowerCase() === target) {
      throw new BadRequestException({ error: { code: "VOICE_MIX_SELF", message: "Cannot set a personal mix for yourself" } });
    }
    return target;
  }

  async setPreference(listenerUserId: string, targetUserId: string, dto: UpdateVoiceMixDto) {
    const target = this.nonSelfTarget(listenerUserId, targetUserId);
    // The relationship query also establishes account existence, without disclosing it.
    const sharedMember = await this.prisma.client.member.findFirst({
      where: {
        userId: target,
        isBanned: false,
        server: { members: { some: { userId: listenerUserId, isBanned: false } } },
      },
      select: { id: true },
    });
    if (!sharedMember) {
      throw new NotFoundException({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    }

    if (dto.volumePercent === 100 && !dto.muted) {
      await this.resetPreference(listenerUserId, target);
      return { targetUserId: target, volumePercent: 100, muted: false };
    }
    return this.prisma.client.userVoiceMixPreference.upsert({
      where: { listenerUserId_targetUserId: { listenerUserId, targetUserId: target } },
      create: { listenerUserId, targetUserId: target, volumePercent: dto.volumePercent, muted: dto.muted },
      update: { volumePercent: dto.volumePercent, muted: dto.muted },
      select: preferenceSelect,
    });
  }

  async resetPreference(listenerUserId: string, targetUserId: string) {
    const target = this.nonSelfTarget(listenerUserId, targetUserId);
    // Ownership alone authorizes reset, including after membership/account loss.
    await this.prisma.client.userVoiceMixPreference.deleteMany({ where: { listenerUserId, targetUserId: target } });
  }
}
