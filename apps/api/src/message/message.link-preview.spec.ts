/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageService } from "./message.service";
import { MessageModule } from "./message.module";
import { LinkPreviewModule } from "../link-preview/link-preview.module";

describe("MessageService LP.2 lifecycle integration", () => {
  const channelId = "00000000-0000-4000-8000-000000000010";
  const serverId = "00000000-0000-4000-8000-000000000011";
  const userId = "00000000-0000-4000-8000-000000000012";
  const messageId = "00000000-0000-4000-8000-000000000013";

  function setup() {
    const order: string[] = [];
    const stored = {
      id: messageId,
      channelId,
      authorId: userId,
      content: "See https://example.com/page",
      createdAt: new Date("2026-09-08T12:00:00.000Z"),
      editedAt: null,
      deletedAt: null,
      author: { id: userId, username: "alice", displayName: "Alice", avatarUrl: null },
      attachments: [],
    };
    const client = {
      channel: { findUnique: jest.fn().mockResolvedValue({ id: channelId, type: "TEXT", serverId }) },
      member: { findUnique: jest.fn().mockResolvedValue({ id: "member", isBanned: false }) },
      message: {
        findUnique: jest.fn().mockResolvedValue({ ...stored, channel: { serverId } }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async () => { order.push("persist"); return stored; }),
        update: jest.fn(async ({ data }: any) => { order.push("persist"); return { ...stored, ...data }; }),
      },
    };
    const permissions = { assertHasChannelPermission: jest.fn().mockResolvedValue(undefined) };
    const gateway = { emitToChannel: jest.fn(() => order.push("ordinary-event")) };
    const upload = { deleteMessageAttachments: jest.fn() };
    const previews = {
      schedule: jest.fn(() => order.push("preview-scheduled")),
      cachedForMessages: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new MessageService(
      { client } as any,
      permissions as any,
      gateway as any,
      upload as any,
      previews as any,
    );
    return { service, client, permissions, gateway, previews, order, stored };
  }

  it("persists and emits an ordinary create before scheduling best-effort preview work", async () => {
    const { service, previews, order } = setup();
    await expect(service.create(channelId, userId, { content: "See https://example.com/page" }))
      .resolves.toMatchObject({ message: { id: messageId }, cached: false });

    expect(order).toEqual(["persist", "ordinary-event", "preview-scheduled"]);
    expect(previews.schedule).toHaveBeenCalledWith({
      id: messageId,
      channelId,
      serverId,
      accountId: userId,
      content: "See https://example.com/page",
    });
  });

  it("activates the dedicated-secret module through Message wiring without a public preview controller", () => {
    expect(Reflect.getMetadata("imports", MessageModule)).toContain(LinkPreviewModule);
    expect(Reflect.getMetadata("controllers", LinkPreviewModule) ?? []).toEqual([]);
  });

  it("does not schedule rejected or idempotency-cached creates", async () => {
    const denied = setup();
    denied.permissions.assertHasChannelPermission.mockRejectedValueOnce(new Error("forbidden"));
    await expect(denied.service.create(channelId, userId, { content: "https://example.com" })).rejects.toThrow("forbidden");
    expect(denied.previews.schedule).not.toHaveBeenCalled();
    expect(denied.client.message.create).not.toHaveBeenCalled();

    const cached = setup();
    cached.client.message.findUnique.mockResolvedValueOnce(cached.stored);
    await expect(cached.service.create(channelId, userId, {
      content: "https://example.com",
      idempotencyKey: "client-key",
    })).resolves.toMatchObject({ cached: true });
    expect(cached.previews.schedule).not.toHaveBeenCalled();
  });

  it.each([
    "Changed https://other.example.net/path",
    "No URL remains",
    "Same https://example.com/page candidate with edited copy",
  ])("emits an authoritative edit before scheduling only the current content: %s", async (content) => {
    const { service, previews, order } = setup();
    await service.update(messageId, userId, { content });
    expect(order).toEqual(["persist", "ordinary-event", "preview-scheduled"]);
    expect(previews.schedule).toHaveBeenCalledWith(expect.objectContaining({ content }));
  });

  it("does not schedule an unauthorized edit", async () => {
    const { service, permissions, client, previews } = setup();
    permissions.assertHasChannelPermission.mockRejectedValueOnce(new Error("forbidden"));
    await expect(service.update(messageId, userId, { content: "https://other.example.net" })).rejects.toThrow("forbidden");
    expect(client.message.update).not.toHaveBeenCalled();
    expect(previews.schedule).not.toHaveBeenCalled();
  });

  it("enriches history from the cache seam only and degrades on cache failure", async () => {
    const first = setup();
    first.client.message.findMany.mockResolvedValue([first.stored]);
    const preview = { sourceUrl: "https://example.com/page", displayHost: "example.com", title: "Example" };
    first.previews.cachedForMessages.mockResolvedValue(new Map([[messageId, preview]]));
    await expect(first.service.list(channelId, userId, {})).resolves.toEqual([
      expect.objectContaining({ id: messageId, linkPreview: preview }),
    ]);

    const failed = setup();
    failed.client.message.findMany.mockResolvedValue([failed.stored]);
    failed.previews.cachedForMessages.mockResolvedValue(new Map());
    await expect(failed.service.list(channelId, userId, {})).resolves.toEqual([
      expect.not.objectContaining({ linkPreview: expect.anything() }),
    ]);
    expect(failed.previews.schedule).not.toHaveBeenCalled();
  });
});
