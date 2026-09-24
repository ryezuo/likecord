import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

describe("CSRF + Sprint 2 (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let serverId: string;
  let serverOwnerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");

    prisma = app.get(PrismaService);

    await cleanDatabase(prisma);

    // Create test admin user
    const hash = await argon2.hash("adminpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const admin = await prisma.client.user.create({
      data: { email: "admin@test.com", username: "adminuser", displayName: "Admin", passwordHash: hash },
    });
    serverOwnerId = admin.id;

    await app.init();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  async function loginAs(email: string, password: string): Promise<{ cookies: string[]; csrfToken: string }> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });
    const cookies = res.headers["set-cookie"];
    const csrfCookie = cookies.find((c: string) => c.startsWith("csrf_token="));
    const csrfToken = csrfCookie ? csrfCookie.split(";")[0].split("=")[1] : "";
    return { cookies, csrfToken };
  }

  function withCsrf(req: any, cookies: string[], csrfToken: string): any {
    req = req.set("Cookie", cookies);
    if (csrfToken) req = req.set("X-CSRF-Token", csrfToken);
    return req;
  }

  // ── CSRF Tests ──

  describe("CSRF Protection", () => {
    it("should set csrf_token cookie on first request", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/health");
      const cookies = res.headers["set-cookie"] || [];
      expect(cookies.some((c: string) => c.startsWith("csrf_token="))).toBe(true);
    });

    it("should reject state-changing request without X-CSRF-Token", async () => {
      const { cookies } = await loginAs("admin@test.com", "adminpass");
      const res = await request(app.getHttpServer())
        .patch("/api/v1/users/@me")
        .set("Cookie", cookies)
        .send({ displayName: "Test" });
      expect(res.status).toBe(403);
    });

    it("should accept state-changing request with valid X-CSRF-Token", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      const res = await request(app.getHttpServer())
        .patch("/api/v1/users/@me")
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ displayName: "AdminUpdated" });
      expect(res.status).toBe(200);
    });

    it("should reject request with mismatched CSRF token", async () => {
      const { cookies } = await loginAs("admin@test.com", "adminpass");
      const res = await request(app.getHttpServer())
        .patch("/api/v1/users/@me")
        .set("Cookie", cookies)
        .set("X-CSRF-Token", "invalid-token-value")
        .send({ displayName: "ShouldFail" });
      expect(res.status).toBe(403);
    });
  });

  // ── Server CRUD ──

  describe("Server CRUD", () => {
    let createRes: any;

    it("POST /servers - creates server with owner membership, @everyone role, and default channels", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      createRes = await request(app.getHttpServer())
        .post("/api/v1/servers")
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Test Server" })
        .expect(201);

      serverId = createRes.body.id;
      expect(createRes.body.name).toBe("Test Server");
      expect(createRes.body.ownerId).toBe(serverOwnerId);

      // Verify @everyone role exists
      const everyone = await prisma.client.role.findFirst({
        where: { serverId, isDefault: true },
      });
      expect(everyone).toBeDefined();
      expect(everyone!.name).toBe("@everyone");

      // Verify default channels exist
      const channels = await prisma.client.channel.findMany({ where: { serverId } });
      expect(channels.length).toBe(2);
      expect(channels.some((c) => c.name === "general" && c.type === "TEXT")).toBe(true);
      expect(channels.some((c) => c.name === "General" && c.type === "VOICE")).toBe(true);

      // Verify membership
      const member = await prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId: serverOwnerId } },
      });
      expect(member).toBeDefined();
    });

    it("GET /servers/:id - non-member cannot access", async () => {
      // Create another user with no membership
      const hash = await argon2.hash("testpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const otherUser = await prisma.client.user.create({
        data: { email: "other@test.com", username: "otheruser", displayName: "Other", passwordHash: hash },
      });
      const { cookies } = await loginAs("other@test.com", "testpass");

      await request(app.getHttpServer())
        .get(`/api/v1/servers/${serverId}`)
        .set("Cookie", cookies)
        .expect(404);
    });

    it("GET /servers/:id - member can access", async () => {
      const { cookies } = await loginAs("admin@test.com", "adminpass");
      await request(app.getHttpServer())
        .get(`/api/v1/servers/${serverId}`)
        .set("Cookie", cookies)
        .expect(200);
    });

    it("GET /users/@me/servers - lists user's servers", async () => {
      const { cookies } = await loginAs("admin@test.com", "adminpass");
      const res = await request(app.getHttpServer())
        .get("/api/v1/users/@me/servers")
        .set("Cookie", cookies)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s.id === serverId)).toBe(true);
    });
  });

  // ── Members ──

  describe("Member management", () => {
    let otherMemberId: string;
    let otherUserId: string;

    beforeAll(async () => {
      const hash = await argon2.hash("memberpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const u = await prisma.client.user.create({
        data: { email: "member@test.com", username: "memberuser", displayName: "Member", passwordHash: hash },
      });
      otherUserId = u.id;
      const m = await prisma.client.member.create({
        data: { serverId, userId: u.id },
      });
      otherMemberId = m.id;
    });

    it("PATCH /members/:id - cannot kick owner", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");
      const ownerMember = await prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId: serverOwnerId } },
      });
      await request(app.getHttpServer())
        .delete(`/api/v1/servers/${serverId}/members/${ownerMember!.id}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(403);
    });

    it("DELETE /members/:id - owner can kick other member", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");
      await request(app.getHttpServer())
        .delete(`/api/v1/servers/${serverId}/members/${otherMemberId}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      const m = await prisma.client.member.findUnique({ where: { id: otherMemberId } });
      expect(m).toBeNull();
    });
  });

  // ── Roles ──

  describe("Role CRUD", () => {
    let createdRoleId: string;
    let lowerRoleId: string;

    it("POST /roles - creates role with MANAGE_ROLES", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      const res = await request(app.getHttpServer())
        .post(`/api/v1/servers/${serverId}/roles`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Moderator", permissions: "4", position: 1 })
        .expect(201);

      createdRoleId = res.body.id;
      expect(res.body.name).toBe("Moderator");
      expect(res.body.isDefault).toBe(false);
    });

    it("@everyone role cannot be deleted", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");
      const everyone = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });

      await request(app.getHttpServer())
        .delete(`/api/v1/servers/${serverId}/roles/${everyone!.id}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(400);
    });

    it("@everyone role cannot be assigned", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");
      const everyone = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });
      const adminMember = await prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId: serverOwnerId } },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/servers/${serverId}/members/${adminMember!.id}/roles/${everyone!.id}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(400);
    });

    it("PUT member role - assigns role", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");
      const hash = await argon2.hash("rolepass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const u = await prisma.client.user.create({ data: { email: "role@test.com", username: "roleuser", displayName: "Role", passwordHash: hash } });
      const m = await prisma.client.member.create({ data: { serverId, userId: u.id } });

      await request(app.getHttpServer())
        .put(`/api/v1/servers/${serverId}/members/${m.id}/roles/${createdRoleId}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      const mr = await prisma.client.memberRole.findUnique({
        where: { memberId_roleId: { memberId: m.id, roleId: createdRoleId } },
      });
      expect(mr).toBeDefined();
    });

    it("role hierarchy blocks lower user from modifying higher role", async () => {
      const hash = await argon2.hash("lowpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const lowUser = await prisma.client.user.create({ data: { email: "low@test.com", username: "lowuser", displayName: "Low", passwordHash: hash } });
      await prisma.client.member.create({ data: { serverId, userId: lowUser.id } });

      const { cookies: lowCookies, csrfToken: lowToken } = await loginAs("low@test.com", "lowpass");
      await request(app.getHttpServer())
        .patch(`/api/v1/servers/${serverId}/roles/${createdRoleId}`)
        .set("Cookie", lowCookies)
        .set("X-CSRF-Token", lowToken)
        .send({ name: "Hacked" })
        .expect(403);
    });

    it("lists roles correctly", async () => {
      const { cookies } = await loginAs("admin@test.com", "adminpass");
      const res = await request(app.getHttpServer())
        .get(`/api/v1/servers/${serverId}/roles`)
        .set("Cookie", cookies)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      // Permissions should be strings
      for (const r of res.body) {
        expect(typeof r.permissions).toBe("string");
      }
    });
  });

  // ── Invites ──

  describe("Invites", () => {
    let inviteCode: string;

    it("POST /invites - creates invite code", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      const res = await request(app.getHttpServer())
        .post(`/api/v1/servers/${serverId}/invites`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({})
        .expect(201);

      inviteCode = res.body.code;
      expect(inviteCode).toBeDefined();
      expect(inviteCode.length).toBe(8);
    });

    it("GET /invites/:code/validate - validates valid invite", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/invites/${inviteCode}/validate`)
        .expect(200);
      expect(res.body).toEqual({ inviteStatus: "VALID", membershipStatus: "UNAUTHENTICATED", serverName: "Test Server" });
      expect(res.body.serverId).toBeUndefined();
    });

    it("GET /invites/:code/validate - rejects invalid code", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/invites/badcode/validate")
        .expect(200, { inviteStatus: "UNAVAILABLE" });
    });

    it("POST /invites/:code/accept - accepts invite and creates membership", async () => {
      const hash = await argon2.hash("invitepass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const u = await prisma.client.user.create({ data: { email: "invite@test.com", username: "inviteuser", displayName: "Invite", passwordHash: hash } });
      const { cookies, csrfToken } = await loginAs("invite@test.com", "invitepass");

      const res = await request(app.getHttpServer())
        .post(`/api/v1/invites/${inviteCode}/accept`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      expect(res.body.serverId).toBe(serverId);
      expect(res.body.result).toBe("JOINED");

      const member = await prisma.client.member.findUnique({
        where: { serverId_userId: { serverId, userId: u.id } },
      });
      expect(member).toBeDefined();
    });

    it("POST /invites/:code/accept - converges duplicate membership", async () => {
      const hash = await argon2.hash("dupepass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const u = await prisma.client.user.create({ data: { email: "dupe@test.com", username: "dupeuser", displayName: "Dupe", passwordHash: hash } });
      const { cookies, csrfToken } = await loginAs("dupe@test.com", "dupepass");

      // First accept
      await request(app.getHttpServer())
        .post(`/api/v1/invites/${inviteCode}/accept`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      // Second accept is an idempotent success
      const repeated = await request(app.getHttpServer())
        .post(`/api/v1/invites/${inviteCode}/accept`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);
      expect(repeated.body.result).toBe("ALREADY_MEMBER");
    });
  });

  // ── Categories & Channels ──

  describe("Categories & Channels", () => {
    let categoryId: string;
    let channelId: string;

    it("POST /categories - creates category", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      const res = await request(app.getHttpServer())
        .post(`/api/v1/servers/${serverId}/categories`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Info" })
        .expect(201);

      categoryId = res.body.id;
      expect(res.body.name).toBe("Info");
    });

    it("POST /channels - creates channel in category", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      const res = await request(app.getHttpServer())
        .post(`/api/v1/servers/${serverId}/channels`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Welcome", type: "TEXT", categoryId })
        .expect(201);

      channelId = res.body.id;
      expect(res.body.name).toBe("welcome");
      expect(res.body.categoryId).toBe(categoryId);
    });

    it("non-admin cannot create channels", async () => {
      const hash = await argon2.hash("nopermpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      const u = await prisma.client.user.create({ data: { email: "noperm@test.com", username: "nopermuser", displayName: "NoPerm", passwordHash: hash } });
      // NOT a member of the server — will fail permission check
      const { cookies, csrfToken } = await loginAs("noperm@test.com", "nopermpass");

      await request(app.getHttpServer())
        .post(`/api/v1/servers/${serverId}/channels`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "ShouldNotExist", type: "TEXT" })
        .expect(404); // non-member → server not found
    });

    it("DELETE /categories - uncategorizes channels", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${categoryId}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      const ch = await prisma.client.channel.findUnique({ where: { id: channelId } });
      expect(ch!.categoryId).toBeNull();
    });

    it("DELETE /channels - deletes channel", async () => {
      const { cookies, csrfToken } = await loginAs("admin@test.com", "adminpass");

      await request(app.getHttpServer())
        .delete(`/api/v1/channels/${channelId}`)
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .expect(200);

      const ch = await prisma.client.channel.findUnique({ where: { id: channelId } });
      expect(ch).toBeNull();
    });
  });
});
