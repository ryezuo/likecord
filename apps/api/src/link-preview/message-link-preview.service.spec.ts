/* eslint-disable @typescript-eslint/no-explicit-any */
import { linkPreviewContentFingerprint } from "@likecord/shared/link-preview";
import { LinkPreviewProjectionService } from "./link-preview.projection";
import { MessageLinkPreviewService } from "./message-link-preview.service";

const messageId = "00000000-0000-4000-8000-000000000020";
const channelId = "00000000-0000-4000-8000-000000000021";
const serverId = "00000000-0000-4000-8000-000000000022";
const accountId = "00000000-0000-4000-8000-000000000023";
const content = "Before https://example.com/page#section after";
const metadata = { title: "Example title", description: "Example description", siteName: "Example", displayHost: "example.com" };

async function flush() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("MessageLinkPreviewService", () => {
  function setup(current: any = { channelId, content, deletedAt: null }) {
    const prisma = { client: { message: { findUnique: jest.fn().mockResolvedValue(current) } } };
    const gateway = { emitToChannel: jest.fn() };
    const previews = { preview: jest.fn().mockResolvedValue(metadata) };
    const projection = { readMany: jest.fn().mockResolvedValue([metadata]) };
    const service = new MessageLinkPreviewService(prisma as any, gateway as any, previews as any, projection as any);
    return { service, prisma, gateway, previews, projection };
  }

  it("emits one bounded safe payload only after the authoritative Message re-read", async () => {
    const { service, prisma, gateway, previews } = setup();
    service.schedule({ id: messageId, channelId, serverId, accountId, content });
    expect(gateway.emitToChannel).not.toHaveBeenCalled();
    await flush();

    expect(previews.preview).toHaveBeenCalledWith(serverId, accountId, "https://example.com/page#section");
    expect(prisma.client.message.findUnique).toHaveBeenCalledWith({
      where: { id: messageId },
      select: { channelId: true, content: true, deletedAt: true },
    });
    expect(gateway.emitToChannel).toHaveBeenCalledWith(channelId, "message:preview-updated", {
      messageId,
      channelId,
      contentFingerprint: linkPreviewContentFingerprint(content),
      linkPreview: { sourceUrl: "https://example.com/page#section", ...metadata },
    });
    expect(Object.keys(gateway.emitToChannel.mock.calls[0][2]).sort()).toEqual([
      "channelId", "contentFingerprint", "linkPreview", "messageId",
    ]);
    expect(JSON.stringify(gateway.emitToChannel.mock.calls[0][2])).not.toMatch(/resolvedIp|redirect|headers|cache|status|image/i);
  });

  it.each([
    ["missing", null],
    ["deleted", { channelId, content, deletedAt: new Date() }],
    ["moved", { channelId: "other-channel", content, deletedAt: null }],
    ["edited", { channelId, content: "Changed https://other.example.net", deletedAt: null }],
    ["removed", { channelId, content: "No URL", deletedAt: null }],
  ])("drops a completed result when Message state is %s", async (_label, current) => {
    const { service, gateway } = setup(current);
    service.schedule({ id: messageId, channelId, serverId, accountId, content });
    await flush();
    expect(gateway.emitToChannel).not.toHaveBeenCalled();
  });

  it("does not re-read or emit for URL removal, unavailable metadata, or fetch failure", async () => {
    const removed = setup();
    removed.service.schedule({ id: messageId, channelId, serverId, accountId, content: "No URL" });
    await flush();
    expect(removed.previews.preview).not.toHaveBeenCalled();

    const unavailable = setup();
    unavailable.previews.preview.mockResolvedValue(null);
    unavailable.service.schedule({ id: messageId, channelId, serverId, accountId, content });
    await flush();
    expect(unavailable.prisma.client.message.findUnique).not.toHaveBeenCalled();
    expect(unavailable.gateway.emitToChannel).not.toHaveBeenCalled();

    const failed = setup();
    failed.previews.preview.mockRejectedValue(new Error("infrastructure detail"));
    expect(() => failed.service.schedule({ id: messageId, channelId, serverId, accountId, content })).not.toThrow();
    await flush();
    expect(failed.gateway.emitToChannel).not.toHaveBeenCalled();
  });

  it("projects only matching positive cache metadata and degrades silently", async () => {
    const { service, projection } = setup();
    const messages = [
      { id: messageId, channelId, content },
      { id: "message-2", channelId, content: "No URL" },
    ];
    projection.readMany.mockResolvedValue([metadata, null]);
    await expect(service.cachedForMessages(serverId, messages)).resolves.toEqual(new Map([
      [messageId, { sourceUrl: "https://example.com/page#section", ...metadata }],
    ]));

    projection.readMany.mockRejectedValue(new Error("redis unavailable"));
    await expect(service.cachedForMessages(serverId, messages)).resolves.toEqual(new Map());
  });
});

describe("LinkPreviewProjectionService", () => {
  it("deduplicates a bounded history page and performs cache-only reads", async () => {
    const cache = {
      key: jest.fn((_serverId: string, fetchUrl: string) => "key:" + fetchUrl),
      read: jest.fn().mockResolvedValue({ metadata }),
    };
    const service = new LinkPreviewProjectionService(cache as any);
    await expect(service.readMany(serverId, [
      "https://example.com/page#one",
      "https://example.com/page#two",
      "invalid",
    ])).resolves.toEqual([metadata, metadata, null]);
    expect(cache.key).toHaveBeenCalledTimes(1);
    expect(cache.read).toHaveBeenCalledTimes(1);
    expect(cache).not.toHaveProperty("preview");
  });
});
