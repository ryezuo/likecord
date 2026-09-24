import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { WsSessionRegistryService } from "../src/ws/ws-session-registry.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";
import { AppModule } from "../src/app.module";
import { cleanDatabase } from "./helpers";
import { hashPassword, verifyPassword } from "../src/auth/password";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { io, Socket } from "socket.io-client";
import type { Test as SupertestRequest } from "supertest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");

interface AuthState {
  access: string;
  refresh: string;
  csrf: string;
  cookies: string[];
  payload: { sub: string; email: string; username: string; sid: string; sv: number };
}

function cookiePair(setCookies: string[], name: string): string {
  const prefix = `${name}=`;
  const found = setCookies.find((value) => value.startsWith(prefix) && value.split(";", 1)[0] !== prefix);
  if (!found) throw new Error(`Missing ${name} cookie`);
  return found.split(";", 1)[0];
}

function tokenValue(pair: string): string {
  return pair.slice(pair.indexOf("=") + 1);
}

function authState(response: { headers: Record<string, string[]> }, existingCsrf?: string): AuthState {
  const setCookies = response.headers["set-cookie"] || [];
  const access = cookiePair(setCookies, "access_token");
  const refresh = cookiePair(setCookies, "refresh_token");
  const csrf = existingCsrf || cookiePair(setCookies, "csrf_token");
  const payload = jwt.decode(tokenValue(access)) as AuthState["payload"];
  return { access, refresh, csrf, cookies: [access, refresh, csrf], payload };
}

describe("ACCOUNT_SECURITY_01 AS.1 (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let wsSessions: WsSessionRegistryService;
  let baseUrl: string;
  let inviteCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    wsSessions = app.get(WsSessionRegistryService);
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : address}`;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.getClient().flushdb();
    const admin = await prisma.client.user.create({
      data: {
        email: "admin@example.com",
        username: "admin",
        displayName: "Admin",
        passwordHash: await hashPassword("admin-password"),
      },
    });
    const server = await prisma.client.server.create({ data: { name: "Security", ownerId: admin.id } });
    const invite = await prisma.client.invite.create({
      data: { code: crypto.randomBytes(8).toString("hex"), serverId: server.id, creatorId: admin.id },
    });
    inviteCode = invite.code;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.getClient().flushdb();
    await app.close();
  });

  async function register(
    email = "user@example.com",
    username = "securityuser",
    password = "current-password",
  ): Promise<AuthState> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, username, password, inviteCode })
      .expect(201);
    return authState(response);
  }

  async function login(email = "user@example.com", password = "current-password"): Promise<AuthState> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(201);
    return authState(response);
  }

  function mutation(requestBuilder: SupertestRequest, state: AuthState) {
    return requestBuilder
      .set("Cookie", state.cookies)
      .set("X-CSRF-Token", tokenValue(state.csrf))
      .set("Origin", "https://localhost");
  }

  it("canonicalizes register/login and binds access JWTs to a durable logical session", async () => {
    const registered = await register("  Mixed.Case@Example.COM  ");
    expect(registered.payload).toMatchObject({ email: "mixed.case@example.com", sv: 1 });
    expect(registered.payload.sid).toMatch(/^[0-9a-f-]{36}$/);
    expect(await prisma.client.user.findUnique({ where: { email: "mixed.case@example.com" } })).not.toBeNull();
    expect(await prisma.client.refreshSession.findUnique({ where: { id: registered.payload.sid } }))
      .toMatchObject({ userId: registered.payload.sub, accessVersion: 1, revokedAt: null });

    const loggedIn = await login("  MIXED.CASE@EXAMPLE.COM  ");
    expect(loggedIn.payload.email).toBe("mixed.case@example.com");
    expect(loggedIn.payload.sid).not.toBe(registered.payload.sid);
  });

  it("uses database uniqueness as final authority for concurrent canonical-equivalent registrations", async () => {
    const attempts = await Promise.all([
      request(app.getHttpServer()).post("/api/v1/auth/register")
        .send({ email: "Race@Example.COM", username: "raceone", password: "current-password", inviteCode }),
      request(app.getHttpServer()).post("/api/v1/auth/register")
        .send({ email: " race@example.com ", username: "racetwo", password: "current-password", inviteCode }),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.client.user.count({ where: { email: "race@example.com" } })).toBe(1);
  });

  it("authorizes only active matching sessions and rejects revoked, unknown, expired, and invalid JWTs", async () => {
    const active = await register();
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", active.access).expect(200);

    await prisma.client.refreshSession.update({
      where: { id: active.payload.sid },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", active.access).expect(401);

    const claims = { sub: active.payload.sub, email: active.payload.email, username: active.payload.username, sv: 1 };
    const unknown = jwt.sign({ ...claims, sid: crypto.randomUUID() }, process.env.JWT_ACCESS_SECRET!, { expiresIn: 900 });
    const expired = jwt.sign({ ...claims, sid: active.payload.sid }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 });
    const invalid = jwt.sign({ ...claims, sid: active.payload.sid }, "wrong-secret", { expiresIn: 900 });
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", `access_token=${unknown}`).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", `access_token=${expired}`).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", `access_token=${invalid}`).expect(401);
  });

  it("rotates refresh credentials without replacing or revoking the logical session", async () => {
    const first = await register();
    const before = await prisma.client.refreshSession.findUniqueOrThrow({ where: { id: first.payload.sid } });
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", [first.refresh, first.csrf])
      .expect(201);
    const rotated = authState(response, first.csrf);
    const after = await prisma.client.refreshSession.findUniqueOrThrow({ where: { id: first.payload.sid } });
    expect(rotated.payload.sid).toBe(first.payload.sid);
    expect(rotated.payload.sv).toBe(first.payload.sv);
    expect(after.tokenHash).not.toBe(before.tokenHash);
    expect(after.revokedAt).toBeNull();
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", [first.refresh, first.csrf]).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", rotated.access).expect(200);
  });

  it("logout revokes access, refresh, and only the current logical session", async () => {
    const current = await register();
    const other = await login();
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", current.cookies)
      .expect(204);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", [current.refresh, current.csrf]).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", other.access).expect(200);
    expect(await prisma.client.refreshSession.findUniqueOrThrow({ where: { id: other.payload.sid } }))
      .toMatchObject({ revokedAt: null });
  });

  it("enforces the strict credential CSRF cookie/header and exact-origin boundary", async () => {
    const state = await register();
    const route = "/api/v1/users/@me/password";
    const body = { currentPassword: "wrong-password", newPassword: "different-password" };
    const csrfValue = tokenValue(state.csrf);

    await request(app.getHttpServer()).patch(route).set("Cookie", state.access).set("X-CSRF-Token", csrfValue)
      .set("Origin", "https://localhost").send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", [state.access, state.csrf])
      .set("Origin", "https://localhost").send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", state.access).set("X-CSRF-Token", csrfValue)
      .set("Origin", "https://localhost").send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", [state.access, state.csrf])
      .set("X-CSRF-Token", "mismatch").set("Origin", "https://localhost").send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", state.cookies)
      .set("X-CSRF-Token", csrfValue).send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", state.cookies)
      .set("X-CSRF-Token", csrfValue).set("Origin", "https://localhost.attacker.test").send(body).expect(403);
    await request(app.getHttpServer()).patch(route).set("Cookie", state.cookies)
      .set("X-CSRF-Token", csrfValue).set("Origin", "not a URL").send(body).expect(403);

    await request(app.getHttpServer()).patch(route).set("Cookie", state.cookies)
      .set("X-CSRF-Token", csrfValue).set("Origin", "https://localhost").send(body).expect(401);
    await request(app.getHttpServer()).patch(route).set("Cookie", state.cookies)
      .set("X-CSRF-Token", csrfValue).set("Referer", "https://localhost/settings").send(body).expect(401);
  });

  it("changes password transactionally, clears the flag, rotates current auth, revokes others, and audits without secrets", async () => {
    const current = await register();
    const other = await login();
    await prisma.client.user.update({ where: { id: current.payload.sub }, data: { passwordChangeRequired: true } });
    const forcedProjection = await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(200);
    expect(forcedProjection.body.passwordChangeRequired).toBe(true);
    const oldHash = (await prisma.client.user.findUniqueOrThrow({ where: { id: current.payload.sub } })).passwordHash;

    const response = await mutation(
      request(app.getHttpServer()).patch("/api/v1/users/@me/password"),
      current,
    ).send({ currentPassword: "current-password", newPassword: "new-valid-password" }).expect(200);
    const retained = authState(response, current.csrf);

    expect(response.body).toMatchObject({ success: true, user: { passwordChangeRequired: false } });
    expect(retained.payload.sid).toBe(current.payload.sid);
    expect(retained.payload.sv).toBe(current.payload.sv + 1);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", retained.access).expect(200);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", other.access).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", [other.refresh, other.csrf]).expect(401);

    const updated = await prisma.client.user.findUniqueOrThrow({ where: { id: current.payload.sub } });
    expect(updated.passwordChangeRequired).toBe(false);
    expect(updated.passwordHash).not.toBe(oldHash);
    await expect(verifyPassword(updated.passwordHash, "new-valid-password")).resolves.toBe(true);
    await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "current-password" }).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "new-valid-password" }).expect(201);

    const audit = await prisma.client.auditLog.findFirstOrThrow({ where: { action: "ACCOUNT_PASSWORD_CHANGED" } });
    const serialized = JSON.stringify(audit.details);
    expect(serialized).not.toContain("current-password");
    expect(serialized).not.toContain("new-valid-password");
    expect(serialized).not.toContain(updated.passwordHash);
    expect(await redis.getClient().keys("rl:credential-mutation:*")).toHaveLength(1);
    expect(await redis.getClient().keys("rl:credential-reauth:*")).toHaveLength(0);
  });

  it("requires current password and preserves the existing 8..128 new-password policy", async () => {
    const current = await register();
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "wrong-password", newEmail: "next@example.com" }).expect(401);
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), current)
      .send({ currentPassword: "current-password", newPassword: "short" }).expect(400);
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), current)
      .send({ currentPassword: "current-password", newPassword: "x".repeat(129) }).expect(400);
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), current)
      .send({ currentPassword: "current-password", newPassword: "current-password" }).expect(400);
    expect((await prisma.client.user.findUniqueOrThrow({ where: { id: current.payload.sub } })).email)
      .toBe("user@example.com");
  });

  it("changes email canonically, reconciles claims, revokes other sessions, and emits no mail side effect", async () => {
    const current = await register();
    const other = await login();
    const response = await mutation(
      request(app.getHttpServer()).patch("/api/v1/users/@me/email"),
      current,
    ).send({ currentPassword: "current-password", newEmail: "  New.Identity@Example.COM " }).expect(200);
    const retained = authState(response, current.csrf);

    expect(response.body.user).toMatchObject({ email: "new.identity@example.com", passwordChangeRequired: false });
    expect(retained.payload).toMatchObject({ sid: current.payload.sid, sv: 2, email: "new.identity@example.com" });
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", retained.access).expect(200);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", other.access).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", [other.refresh, other.csrf]).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "  NEW.IDENTITY@EXAMPLE.COM ", password: "current-password" }).expect(201);
    await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "current-password" }).expect(401);

    const audit = await prisma.client.auditLog.findFirstOrThrow({ where: { action: "ACCOUNT_EMAIL_CHANGED" } });
    expect(JSON.stringify(audit.details)).not.toContain("example.com");
    expect(await prisma.client.user.count()).toBe(2);
  });

  it("blocks forced-password email change and maps same, invalid, and duplicate canonical email safely", async () => {
    const current = await register();
    await prisma.client.user.update({ where: { id: current.payload.sub }, data: { passwordChangeRequired: true } });
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: "other@example.com" }).expect(409);
    await prisma.client.user.update({ where: { id: current.payload.sub }, data: { passwordChangeRequired: false } });

    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: " USER@EXAMPLE.COM " }).expect(400);
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: "not-an-email" }).expect(400);
    await prisma.client.user.create({
      data: { email: "taken@example.com", username: "taken", displayName: "Taken", passwordHash: await hashPassword("taken-password") },
    });
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: " TAKEN@EXAMPLE.COM " }).expect(409);

    expect((await prisma.client.user.findUniqueOrThrow({ where: { id: current.payload.sub } })).email).toBe("user@example.com");
    expect(await prisma.client.auditLog.count({ where: { actorId: current.payload.sub } })).toBe(0);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(200);
  });

  it("keeps reauthentication failures separate, account-scoped, and fail closed", async () => {
    const first = await register();
    const secondInvite = await prisma.client.invite.create({
      data: {
        code: crypto.randomBytes(8).toString("hex"),
        serverId: (await prisma.client.server.findFirstOrThrow()).id,
        creatorId: (await prisma.client.user.findUniqueOrThrow({ where: { email: "admin@example.com" } })).id,
      },
    });
    inviteCode = secondInvite.code;
    const second = await register("second@example.com", "seconduser", "second-password");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), first)
        .send({ currentPassword: "wrong-password", newPassword: "another-password" }).expect(401);
    }
    const limited = await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), first)
      .send({ currentPassword: "wrong-password", newPassword: "another-password" }).expect(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), second)
      .send({ currentPassword: "wrong-password", newPassword: "another-password" }).expect(401);

    const reauthKeys = await redis.getClient().keys("rl:credential-reauth:*");
    const mutationKeys = await redis.getClient().keys("rl:credential-mutation:*");
    expect(reauthKeys).toHaveLength(2);
    expect(mutationKeys).toHaveLength(0);

    const evalSpy = jest.spyOn(redis.getClient(), "eval").mockRejectedValueOnce(new Error("redis unavailable"));
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), second)
      .send({ currentPassword: "second-password", newEmail: "safe@example.com" }).expect(503);
    evalSpy.mockRestore();
    expect((await prisma.client.user.findUniqueOrThrow({ where: { id: second.payload.sub } })).email)
      .toBe("second@example.com");
  });

  it("enforces the separate five-per-hour successful credential mutation limit", async () => {
    let current = await register();
    for (let index = 0; index < 5; index += 1) {
      const response = await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
        .send({ currentPassword: "current-password", newEmail: `mutation-${index}@example.com` }).expect(200);
      current = authState(response, current.csrf);
    }
    const limited = await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: "mutation-6@example.com" }).expect(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    expect((await prisma.client.user.findUniqueOrThrow({ where: { id: current.payload.sub } })).email)
      .toBe("mutation-4@example.com");
    expect(await redis.getClient().keys("rl:credential-mutation:*")).toHaveLength(1);
    expect(await redis.getClient().keys("rl:credential-reauth:*")).toHaveLength(0);
  });

  it("rolls back session and audit changes on a database uniqueness failure", async () => {
    const current = await register();
    const other = await login();
    await prisma.client.user.create({
      data: { email: "taken@example.com", username: "taken", displayName: "Taken", passwordHash: await hashPassword("taken-password") },
    });

    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/email"), current)
      .send({ currentPassword: "current-password", newEmail: "TAKEN@EXAMPLE.COM" }).expect(409);
    expect(await prisma.client.auditLog.count({ where: { actorId: current.payload.sub } })).toBe(0);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(200);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", other.access).expect(200);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh")
      .set("Cookie", [current.refresh, current.csrf]).expect(201);
  });

  it("fails closed after durable mutation when socket reconciliation cannot complete", async () => {
    const current = await register();
    const other = await login();
    const disconnectSpy = jest.spyOn(wsSessions, "disconnectSessions").mockImplementationOnce(() => {
      throw new Error("socket transport unavailable");
    });
    await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), current)
      .send({ currentPassword: "current-password", newPassword: "post-commit-password" }).expect(503);
    disconnectSpy.mockRestore();

    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", current.access).expect(401);
    await request(app.getHttpServer()).get("/api/v1/users/@me").set("Cookie", other.access).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("Cookie", [other.refresh, other.csrf]).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "post-commit-password" }).expect(201);
    expect(await prisma.client.auditLog.count({ where: { action: "ACCOUNT_PASSWORD_CHANGED" } })).toBe(1);
  });

  it("preserves same-session sockets on refresh/change and disconnects revoked or logged-out sessions", async () => {
    let current = await register();
    const other = await login();
    const currentSocket = await connectSocket(tokenValue(current.access));
    const otherSocket = await connectSocket(tokenValue(other.access));
    expect(wsSessions.count(current.payload.sid)).toBe(1);
    expect(wsSessions.count(other.payload.sid)).toBe(1);

    const refreshResponse = await request(app.getHttpServer()).post("/api/v1/auth/refresh")
      .set("Cookie", [current.refresh, current.csrf]).expect(201);
    current = authState(refreshResponse, current.csrf);
    expect(currentSocket.connected).toBe(true);
    expect(wsSessions.count(current.payload.sid)).toBe(1);

    const otherDisconnected = new Promise<void>((resolve) => otherSocket.once("disconnect", () => resolve()));
    const changeResponse = await mutation(request(app.getHttpServer()).patch("/api/v1/users/@me/password"), current)
      .send({ currentPassword: "current-password", newPassword: "socket-password" }).expect(200);
    current = authState(changeResponse, current.csrf);
    await otherDisconnected;
    expect(currentSocket.connected).toBe(true);
    expect(otherSocket.connected).toBe(false);

    const currentDisconnected = new Promise<void>((resolve) => currentSocket.once("disconnect", () => resolve()));
    await request(app.getHttpServer()).post("/api/v1/auth/logout").set("Cookie", current.cookies).expect(204);
    await currentDisconnected;
    expect(currentSocket.connected).toBe(false);
    currentSocket.close();
    otherSocket.close();
  });

  async function connectSocket(accessToken: string): Promise<Socket> {
    const socket = io(baseUrl, {
      path: "/api/v1/ws",
      transports: ["websocket"],
      reconnection: false,
      query: { access_token: accessToken },
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket ready timeout")), 5_000);
      socket.once("ws:ready", () => { clearTimeout(timer); resolve(); });
      socket.once("connect_error", (error) => { clearTimeout(timer); reject(error); });
    });
    return socket;
  }
});
