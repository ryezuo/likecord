import { Injectable, Logger } from "@nestjs/common";
import {
  linkPreviewContentFingerprint,
  type LinkPreview,
  type MessagePreviewUpdatedEvent,
} from "@likecord/shared/link-preview";
import { selectLinkPreviewCandidate } from "@likecord/shared/link-preview-url";
import { PrismaService } from "../prisma/prisma.service";
import { WsGateway } from "../ws/ws.gateway";
import { LinkPreviewProjectionService } from "./link-preview.projection";
import { LinkPreviewService } from "./link-preview.service";

interface PreviewMessageState {
  id: string;
  channelId: string;
  content: string;
}

interface PreviewMutationState extends PreviewMessageState {
  serverId: string;
  accountId: string;
}

@Injectable()
export class MessageLinkPreviewService {
  private readonly logger = new Logger(MessageLinkPreviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WsGateway,
    private readonly previews: LinkPreviewService,
    private readonly projection: LinkPreviewProjectionService,
  ) {}

  schedule(message: PreviewMutationState): void {
    const candidate = selectLinkPreviewCandidate(message.content);
    if (!candidate) return;
    const contentFingerprint = linkPreviewContentFingerprint(message.content);

    void this.resolveAndEmit(message, candidate.href, candidate.fetchUrl, contentFingerprint)
      .catch(() => this.logger.warn(`Link Preview enhancement failed for Message ${message.id}`));
  }

  async cachedForMessages(serverId: string, messages: readonly PreviewMessageState[]): Promise<Map<string, LinkPreview>> {
    const candidates = messages.map((message) => selectLinkPreviewCandidate(message.content));
    try {
      const metadata = await this.projection.readMany(serverId, candidates.map((candidate) => candidate?.href ?? ""));
      const result = new Map<string, LinkPreview>();
      messages.forEach((message, index) => {
        const candidate = candidates[index];
        const preview = metadata[index];
        if (candidate && preview) result.set(message.id, { sourceUrl: candidate.href, ...preview });
      });
      return result;
    } catch {
      return new Map();
    }
  }

  private async resolveAndEmit(
    message: PreviewMutationState,
    sourceUrl: string,
    fetchUrl: string,
    contentFingerprint: string,
  ): Promise<void> {
    const metadata = await this.previews.preview(message.serverId, message.accountId, sourceUrl);
    if (!metadata) return;

    const current = await this.prisma.client.message.findUnique({
      where: { id: message.id },
      select: { channelId: true, content: true, deletedAt: true },
    });
    if (!current || current.deletedAt || current.channelId !== message.channelId) return;
    if (current.content !== message.content) return;
    if (linkPreviewContentFingerprint(current.content) !== contentFingerprint) return;
    const currentCandidate = selectLinkPreviewCandidate(current.content);
    if (!currentCandidate || currentCandidate.href !== sourceUrl || currentCandidate.fetchUrl !== fetchUrl) return;

    const event: MessagePreviewUpdatedEvent = {
      messageId: message.id,
      channelId: message.channelId,
      contentFingerprint,
      linkPreview: { sourceUrl, ...metadata },
    };
    this.wsGateway.emitToChannel(message.channelId, "message:preview-updated", event);
  }
}
