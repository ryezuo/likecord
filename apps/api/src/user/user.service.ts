import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      passwordChangeRequired: user.passwordChangeRequired,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ error: { code: "USER_NOT_FOUND", message: "User not found" } });

    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      passwordChangeRequired: updated.passwordChangeRequired,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
