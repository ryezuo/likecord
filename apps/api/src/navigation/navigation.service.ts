import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../server/guards/permission.service";

const unavailable = () => new NotFoundException({
  error: { code: "NAVIGATION_TARGET_UNAVAILABLE", message: "The requested server or channel is unavailable" },
});

@Injectable()
export class NavigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  private async assertServerTextAccess(serverId: string, userId: string) {
    if (!await this.permissionService.canAccessServer(serverId, userId)) throw unavailable();
  }

  async resolveServer(serverId: string, userId: string) {
    await this.assertServerTextAccess(serverId, userId);

    const [preference, textChannels] = await Promise.all([
      this.prisma.client.userServerPreference.findUnique({
        where: { userId_serverId: { userId, serverId } },
        select: { lastTextChannelId: true },
      }),
      this.prisma.client.channel.findMany({
        where: { serverId, type: "TEXT" },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      }),
    ]);

    if (preference?.lastTextChannelId) {
      const preferred = textChannels.find((channel) => channel.id === preference.lastTextChannelId);
      if (preferred && await this.permissionService.hasChannelPermission(preferred.id, userId, PERMISSIONS.VIEW_CHANNEL)) {
        return { channelId: preferred.id };
      }
    }

    for (const channel of textChannels) {
      if (await this.permissionService.hasChannelPermission(channel.id, userId, PERMISSIONS.VIEW_CHANNEL)) {
        return { channelId: channel.id };
      }
    }
    return { channelId: null };
  }

  private async findAccessibleTextChannel(serverId: string, channelId: string, userId: string) {
    if (!await this.permissionService.canAccessServer(serverId, userId)) return null;
    const channel = await this.prisma.client.channel.findFirst({
      where: { id: channelId, serverId, type: "TEXT" },
      select: { id: true, name: true, serverId: true, type: true },
    });
    if (!channel || !await this.permissionService.hasChannelPermission(channelId, userId, PERMISSIONS.VIEW_CHANNEL)) {
      return null;
    }
    return channel;
  }

  async validateTextChannel(serverId: string, channelId: string, userId: string) {
    const channel = await this.findAccessibleTextChannel(serverId, channelId, userId);
    if (!channel) throw unavailable();
    return { channel };
  }

  async resolveContinue(userId: string) {
    // Inspect only durable rows, in bounded batches without a first-N cutoff.
    const batchSize = 50;
    for (let skip = 0; ; skip += batchSize) {
      const preferences = await this.prisma.client.userServerPreference.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { serverId: "asc" }],
        select: { serverId: true, lastTextChannelId: true },
        take: batchSize,
        skip,
      });
      for (const preference of preferences) {
        if (!preference.lastTextChannelId) continue;
        const channel = await this.findAccessibleTextChannel(preference.serverId, preference.lastTextChannelId, userId);
        if (!channel) continue;
        const server = await this.prisma.client.server.findUnique({
          where: { id: preference.serverId },
          select: { id: true, name: true },
        });
        if (server) return { destination: { serverId: server.id, serverName: server.name, channelId: channel.id, channelName: channel.name } };
      }
      if (preferences.length < batchSize) return { destination: null };
    }
  }

  async setLastTextChannel(serverId: string, channelId: string, userId: string) {
    await this.validateTextChannel(serverId, channelId, userId);
    return this.prisma.client.userServerPreference.upsert({
      where: { userId_serverId: { userId, serverId } },
      create: { userId, serverId, lastTextChannelId: channelId },
      update: { lastTextChannelId: channelId },
      select: { userId: true, serverId: true, lastTextChannelId: true, updatedAt: true },
    });
  }
}
