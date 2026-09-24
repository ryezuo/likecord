/* eslint-disable @typescript-eslint/no-explicit-any */
import { UploadService } from "./upload.service";

describe("UploadService F.4 attachment cleanup", () => {
  const attachment = {
    id: "00000000-0000-4000-8000-000000000011",
    messageId: "00000000-0000-4000-8000-000000000012",
    s3Key: "attachments/user/file.txt",
  };

  function setup() {
    const order: string[] = [];
    const client = {
      attachment: {
        findMany: jest.fn().mockResolvedValue([attachment]),
        findUnique: jest.fn().mockResolvedValue({
          ...attachment,
          processed: true,
          message: {
            deletedAt: new Date(),
            channel: { id: "channel", serverId: "server" },
          },
        }),
        deleteMany: jest.fn(async () => {
          order.push("row");
          return { count: 1 };
        }),
      },
      member: { findUnique: jest.fn().mockResolvedValue({ id: "member", isBanned: false }) },
    };
    const permissions = { assertHasChannelPermission: jest.fn().mockResolvedValue(undefined) };
    const storage = {
      delete: jest.fn(async () => { order.push("object"); }),
      createPresignedDownloadUrl: jest.fn(),
    };
    const service = new UploadService({ client } as any, permissions as any, storage as any);
    return { service, client, storage, permissions, order };
  }

  it("deletes the configured object before removing its Attachment row", async () => {
    const { service, client, storage, order } = setup();

    await expect(service.deleteMessageAttachments(attachment.messageId)).resolves.toBe(1);
    expect(storage.delete).toHaveBeenCalledWith(attachment.s3Key);
    expect(client.attachment.deleteMany).toHaveBeenCalledWith({
      where: { id: attachment.id, messageId: attachment.messageId },
    });
    expect(order).toEqual(["object", "row"]);
  });

  it("keeps the retry row discoverable after storage failure and safely retries later", async () => {
    const { service, client, storage } = setup();
    storage.delete.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(service.deleteMessageAttachments(attachment.messageId)).resolves.toBe(0);
    expect(client.attachment.deleteMany).not.toHaveBeenCalled();

    await expect(service.deleteExpired()).resolves.toBe(1);
    expect(client.attachment.findMany).toHaveBeenLastCalledWith({
      where: { message: { deletedAt: { not: null } } },
    });
    expect(storage.delete).toHaveBeenCalledTimes(2);
    expect(client.attachment.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("keeps a retained failed-cleanup Attachment inaccessible through downloads", async () => {
    const { service, permissions, storage } = setup();

    await expect(service.getDownloadInfo(attachment.id, "user")).rejects.toMatchObject({ status: 403 });
    expect(permissions.assertHasChannelPermission).toHaveBeenCalledTimes(2);
    expect(storage.createPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});
