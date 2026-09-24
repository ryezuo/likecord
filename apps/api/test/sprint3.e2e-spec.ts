import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PermissionService } from "../src/server/guards/permission.service";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("Messaging (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permService: PermissionService;
  let serverId: string;
  let channelId: string;
  let ownerId: string;
  let ownerCookies: string[];
  let ownerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");

    prisma = app.get(PrismaService);
    permService = app.get(PermissionService);

    await cleanDatabase(prisma);

    const hash = await argon2.hash("pass123", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const owner = await prisma.client.user.create({
      data: { email: "owner@test.com", username: "owner", displayName: "Owner", passwordHash: hash },
    });
    ownerId = owner.id;

    const sv = await prisma.client.server.create({ data: { name: "Msg Test", ownerId: owner.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });
    await prisma.client.role.create({
      data: { serverId: sv.id, name: "@everyone", permissions: BigInt(0x1000 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1), position: 0, isDefault: true, isMentionable: false },
    });
    const ch = await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "chat", position: 0 } });
    channelId = ch.id;

    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "owner@test.com", password: "pass123" });
    ownerCookies = loginRes.headers["set-cookie"];
    ownerToken = extractCsrf(ownerCookies);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── Message Creation ──

  it("POST /channels/:id/messages - non-member cannot send", async () => {
    const hash = await argon2.hash("xpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "x@test.com", username: "xuser", displayName: "X", passwordHash: hash } });
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "x@test.com", password: "xpass" });
    const c = r.headers["set-cookie"];
    const t = extractCsrf(c);
    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", c).set("X-CSRF-Token", t)
      .send({ content: "hi" })
      .expect(403);
  });

  it("POST /channels/:id/messages - creates message with valid CSRF", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Hello world" })
      .expect(201);
    expect(res.body.message.content).toBe("Hello world");
    expect(res.body.message.authorId).toBe(ownerId);
  });

  it("POST /channels/:id/messages - idempotency prevents duplicates", async () => {
    const key = "unique-key-123";
    const r1 = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Idempotent", idempotencyKey: key })
      .expect(201);
    expect(r1.body.cached).toBe(false);

    const r2 = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Idempotent", idempotencyKey: key })
      .expect(201);
    expect(r2.body.cached).toBe(true);
    expect(r2.body.message.id).toBe(r1.body.message.id);
  });

  // ── Message List ──

  it("GET /channels/:id/messages - non-member cannot list", async () => {
    const hash = await argon2.hash("ypass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "y@test.com", username: "yuser", displayName: "Y", passwordHash: hash } });
    const r = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "y@test.com", password: "ypass" });
    await request(app.getHttpServer())
      .get(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", r.headers["set-cookie"])
      .expect(403);
  });

  it("GET /channels/:id/messages - lists messages", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  // ── Cursor Pagination ──

  it("GET /channels/:id/messages - pagination with before", async () => {
    // Create several messages
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await request(app.getHttpServer())
        .post(`/api/v1/channels/${channelId}/messages`)
        .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
        .send({ content: `Msg ${i}` });
      ids.push(r.body.message.id);
    }

    const res = await request(app.getHttpServer())
      .get(`/api/v1/channels/${channelId}/messages?before=${ids[3]}&limit=2`)
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });

  // ── Message Edit ──

  it("PATCH /messages/:id - only author can edit", async () => {
    const r = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Editable" });
    const msgId = r.body.message.id;
    expect(r.status).toBe(201);

    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Edited!" })
      .expect(200);
    expect(edited.body.message.content).toBe("Edited!");
    expect(edited.body.message.editedAt).not.toBeNull();
  });

  it("PATCH /messages/:id - non-author blocked", async () => {
    const hash = await argon2.hash("zpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "z@test.com", username: "zuser", displayName: "Z", passwordHash: hash } });
    await prisma.client.member.create({ data: { serverId, userId: u.id } });
    const r = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "z@test.com", password: "zpass" });
    const c = r.headers["set-cookie"];
    const t = extractCsrf(c);

    const msg = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "By owner" });

    await request(app.getHttpServer())
      .patch(`/api/v1/messages/${msg.body.message.id}`)
      .set("Cookie", c).set("X-CSRF-Token", t)
      .send({ content: "Hacked" })
      .expect(403);
  });

  // ── Message Delete ──

  it("DELETE /messages/:id - author can delete", async () => {
    const r = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Delete me" });
    const msgId = r.body.message.id;

    const del = await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(del.body).toEqual({ messageId: msgId, channelId });

    const repeated = await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(repeated.body).toEqual({ messageId: msgId, channelId });
  });

  it("DELETE /messages/:id - MANAGE_MESSAGES can delete", async () => {
    const r = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "By owner" });
    const msgId = r.body.message.id;

    // Create a mod user with MANAGE_MESSAGES
    const hash = await argon2.hash("mpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const mod = await prisma.client.user.create({ data: { email: "mod@test.com", username: "moduser", displayName: "Mod", passwordHash: hash } });
    await prisma.client.member.create({ data: { serverId, userId: mod.id } });
    const modRole = await prisma.client.role.create({
      data: { serverId, name: "Mod", permissions: BigInt(0x100), position: 10, isDefault: false, isMentionable: false },
    });
    await prisma.client.memberRole.create({ data: { memberId: (await prisma.client.member.findUnique({ where: { serverId_userId: { serverId, userId: mod.id } } }))!.id, roleId: modRole.id } });

    const r2 = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "mod@test.com", password: "mpass" });
    const c = r2.headers["set-cookie"];
    const t = extractCsrf(c);

    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", c).set("X-CSRF-Token", t)
      .expect(200);
    expect(deleted.body).toEqual({ messageId: msgId, channelId });
  });

  it("DELETE /messages/:id - unrelated member is rejected without changing the Message", async () => {
    // This legacy suite originally granted ADMINISTRATOR to @everyone. Remove
    // that fixture-only bypass so this case represents an ordinary viewer.
    await prisma.client.role.updateMany({
      where: { serverId, isDefault: true },
      data: { permissions: BigInt(0x1000 | 0x400 | 0x200 | 0x80 | 0x40) },
    });
    const hash = await argon2.hash("ordinary-pass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const ordinary = await prisma.client.user.create({
      data: { email: "ordinary@test.com", username: "ordinary", displayName: "Ordinary", passwordHash: hash },
    });
    await prisma.client.member.create({ data: { serverId, userId: ordinary.id } });
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ email: "ordinary@test.com", password: "ordinary-pass" });
    const cookies = login.headers["set-cookie"];
    const token = extractCsrf(cookies);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Must remain" });

    await request(app.getHttpServer())
      .delete(`/api/v1/messages/${created.body.message.id}`)
      .set("Cookie", cookies).set("X-CSRF-Token", token)
      .expect(403);

    const stored = await prisma.client.message.findUnique({ where: { id: created.body.message.id } });
    expect(stored).toMatchObject({ content: "Must remain", deletedAt: null });
  });

  // ── Soft-Deleted Messages ──

  it("DELETE /messages/:id - clears persisted content and excludes the Message from history", async () => {
    const r = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ content: "Secret" });
    const msgId = r.body.message.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .expect(200);

    const stored = await prisma.client.message.findUnique({ where: { id: msgId } });
    expect(stored?.content).toBe("");
    expect(stored?.deletedAt).toBeInstanceOf(Date);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies)
      .expect(200);
    const found = list.body.find((m: any) => m.id === msgId);
    expect(found).toBeUndefined();
  });
});
