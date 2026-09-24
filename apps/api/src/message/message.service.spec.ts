/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageService } from "./message.service";

describe("MessageService F.4 delete lifecycle", () => {
  const messageId = "00000000-0000-4000-8000-000000000001";
  const channelId = "00000000-0000-4000-8000-000000000002";
  const authorId = "00000000-0000-4000-8000-000000000003";
  const moderatorId = "00000000-0000-4000-8000-000000000004";

  function setup(overrides: { deletedAt?: Date | null; updateError?: Error } = {}) {
    const order: string[] = [];
    const updateMany = jest.fn(async () => {
      if (overrides.updateError) throw overrides.updateError;
      order.push("commit");
      return { count: 1 };
    });
    const client = {
      message: {
        findUnique: jest.fn().mockResolvedValue({
          id: messageId,
          channelId,
          authorId,
          deletedAt: overrides.deletedAt ?? null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        message: { updateMany },
      })),
      channel: { findUnique: jest.fn() },
      member: { findUnique: jest.fn() },
    };
    const permissions = {
      assertHasChannelPermission: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = {
      emitToChannel: jest.fn(() => order.push("event")),
    };
    const upload = {
      deleteMessageAttachments: jest.fn(async () => {
        order.push("storage");
        return 0;
      }),
    };
    const service = new MessageService(
      { client } as any,
      permissions as any,
      gateway as any,
      upload as any,
    );
    return { service, client, permissions, gateway, upload, updateMany, order };
  }

  it("atomically clears content, emits after commit, then starts attachment cleanup", async () => {
    const { service, permissions, gateway, upload, updateMany, order } = setup();

    await expect(service.delete(messageId, authorId)).resolves.toEqual({ messageId, channelId });

    expect(permissions.assertHasChannelPermission).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: messageId, deletedAt: null },
      data: { deletedAt: expect.any(Date), content: "" },
    });
    expect(gateway.emitToChannel).toHaveBeenCalledWith(channelId, "message:deleted", { messageId, channelId });
    expect(upload.deleteMessageAttachments).toHaveBeenCalledWith(messageId);
    expect(order).toEqual(["commit", "event", "storage"]);
  });

  it("requires MANAGE_MESSAGES in addition to VIEW_CHANNEL for another author's message", async () => {
    const { service, permissions } = setup();
    await service.delete(messageId, moderatorId);
    expect(permissions.assertHasChannelPermission).toHaveBeenCalledTimes(2);
    expect(permissions.assertHasChannelPermission.mock.calls.map((call) => call[2])).toEqual([
      1n << 10n,
      1n << 8n,
    ]);
  });

  it("does not require SEND_MESSAGES when the author deletes an existing message", async () => {
    const { service, permissions } = setup();
    await service.delete(messageId, authorId);
    expect(permissions.assertHasChannelPermission.mock.calls.map((call) => call[2])).toEqual([1n << 10n]);
  });

  it("rejects before DB, realtime, or storage work when authorization fails", async () => {
    const { service, client, permissions, gateway, upload } = setup();
    permissions.assertHasChannelPermission.mockRejectedValueOnce(new Error("forbidden"));

    await expect(service.delete(messageId, moderatorId)).rejects.toThrow("forbidden");
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(gateway.emitToChannel).not.toHaveBeenCalled();
    expect(upload.deleteMessageAttachments).not.toHaveBeenCalled();
  });

  it("returns the idempotent response without a second transition or event and retries cleanup", async () => {
    const { service, client, gateway, upload } = setup({ deletedAt: new Date() });

    await expect(service.delete(messageId, authorId)).resolves.toEqual({ messageId, channelId });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(gateway.emitToChannel).not.toHaveBeenCalled();
    expect(upload.deleteMessageAttachments).toHaveBeenCalledWith(messageId);
  });

  it("does not emit or touch storage when the Message transaction fails", async () => {
    const { service, gateway, upload } = setup({ updateError: new Error("database failed") });

    await expect(service.delete(messageId, authorId)).rejects.toThrow("database failed");
    expect(gateway.emitToChannel).not.toHaveBeenCalled();
    expect(upload.deleteMessageAttachments).not.toHaveBeenCalled();
  });

  it("excludes deleted Messages from every normal history query", async () => {
    const { service, client } = setup();
    client.channel.findUnique.mockResolvedValue({ id: channelId, type: "TEXT", serverId: "server" });
    client.member.findUnique.mockResolvedValue({ id: "member", isBanned: false });

    await service.list(channelId, authorId, { before: messageId, limit: 25 });

    expect(client.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { channelId, deletedAt: null, id: { lt: messageId } },
    }));
  });
});
