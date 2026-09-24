import type { Request, Response } from "express";
import { UserService } from "../user/user.service";
import { AccountSecurityController } from "./account-security.controller";
import { AuthService, type AuthenticatedUser } from "./auth.service";

const storedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "garden@example.test",
  username: "garden",
  displayName: "Garden",
  avatarUrl: null,
  bio: null,
  passwordChangeRequired: true,
  createdAt: new Date("2026-09-07T12:00:00.000Z"),
};

describe("Account Security authenticated-user response projection", () => {
  it("exposes passwordChangeRequired through the shared sanitized Auth response", () => {
    const service = new AuthService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    expect(service.sanitizeUser(storedUser)).toMatchObject({
      id: storedUser.id,
      email: storedUser.email,
      passwordChangeRequired: true,
    });
  });

  it("exposes passwordChangeRequired through GET /users/@me ownership", async () => {
    const findUnique = jest.fn().mockResolvedValue(storedUser);
    const service = new UserService({ client: { user: { findUnique } } } as never);
    await expect(service.getMe(storedUser.id)).resolves.toMatchObject({
      id: storedUser.id,
      passwordChangeRequired: true,
    });
  });

  it("returns the authoritative cleared user with the successful password mutation", async () => {
    const projected = { ...storedUser, passwordChangeRequired: false, createdAt: storedUser.createdAt.toISOString() };
    const changePassword = jest.fn().mockResolvedValue({
      user: projected,
      accessToken: "access",
      refreshToken: "refresh",
    });
    const controller = new AccountSecurityController({ changePassword } as never);
    const response = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
    const auth: AuthenticatedUser = {
      id: storedUser.id,
      email: storedUser.email,
      username: storedUser.username,
      sessionId: "22222222-2222-4222-8222-222222222222",
      sessionVersion: 1,
    };
    const request = {
      user: auth,
      headers: { "user-agent": "test" },
      ip: "127.0.0.1",
    } as unknown as Request;

    await expect(controller.changePassword(
      { currentPassword: "current-password", newPassword: "new-valid-password" },
      request,
      response,
    )).resolves.toEqual({ success: true, user: projected });
    expect(changePassword).toHaveBeenCalledWith(
      auth,
      { currentPassword: "current-password", newPassword: "new-valid-password" },
      "test",
      "127.0.0.1",
    );
    expect(response.cookie).toHaveBeenCalledTimes(2);
  });
});
