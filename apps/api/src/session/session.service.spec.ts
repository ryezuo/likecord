import { SessionService } from "./session.service";

describe("SessionService", () => {
  it("rotates the refresh credential on the same stable logical session", async () => {
    const session = {
      id: "session-id",
      userId: "user-id",
      tokenHash: "old-hash",
      accessVersion: 4,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-id" },
    };
    const findUnique = jest.fn().mockResolvedValue(session);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new SessionService({ client: { refreshSession: { findUnique, updateMany } } } as never);
    jest.spyOn(service, "hashRefreshToken").mockReturnValue("old-hash");

    const result = await service.rotateRefreshCredential("old-token", "agent", "ip");

    expect(result.session.id).toBe("session-id");
    expect(result.session.accessVersion).toBe(4);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "session-id", tokenHash: "old-hash", revokedAt: null }),
      data: expect.objectContaining({ tokenHash: result.credential.tokenHash, userAgent: "agent", ipAddress: "ip" }),
    }));
  });

  it.each([
    [null, "unknown session"],
    [{ userId: "other", accessVersion: 1, revokedAt: null, expiresAt: new Date(Date.now() + 60_000) }, "cross-user session"],
    [{ userId: "user", accessVersion: 1, revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) }, "revoked session"],
    [{ userId: "user", accessVersion: 2, revokedAt: null, expiresAt: new Date(Date.now() + 60_000) }, "stale access version"],
    [{ userId: "user", accessVersion: 1, revokedAt: null, expiresAt: new Date(Date.now() - 60_000) }, "expired session"],
  ])("rejects %s during access validation (%s)", async (row, _description) => {
    const service = new SessionService({
      client: { refreshSession: { findUnique: jest.fn().mockResolvedValue(row) } },
    } as never);
    await expect(service.validateAccessSession("sid", "user", 1)).resolves.toBe(false);
  });

  it("accepts a matching active logical session", async () => {
    const service = new SessionService({
      client: { refreshSession: { findUnique: jest.fn().mockResolvedValue({
        userId: "user", accessVersion: 1, revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
      }) } },
    } as never);
    await expect(service.validateAccessSession("sid", "user", 1)).resolves.toBe(true);
  });
});
