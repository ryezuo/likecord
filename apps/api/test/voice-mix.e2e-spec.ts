import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase, createTestAccessSession, testAccessCookie } from "./helpers";

describe("Account-pair Voice mix (PostgreSQL + authenticated REST)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let listener: string;
  let target: string;
  let other: string;
  let outsider: string;
  let serverId: string;
  let sessionIds: Map<string, string>;
  const base = "/api/v1/users/@me/voice-mix";

  const cookies = (id: string) => [
    testAccessCookie(id, sessionIds.get(id)!, "mix@test.local", "mix"),
    "csrf_token=voice-mix-test-csrf",
  ];
  const get = (id = listener, query = "") => request(app.getHttpServer()).get(base + query).set("Cookie", cookies(id));
  const put = (body: unknown, id = listener, targetId = target) => request(app.getHttpServer())
    .put(`${base}/${targetId}`).set("Cookie", cookies(id)).set("X-CSRF-Token", "voice-mix-test-csrf").send(body);
  const reset = (id = listener, targetId = target) => request(app.getHttpServer())
    .delete(`${base}/${targetId}`).set("Cookie", cookies(id)).set("X-CSRF-Token", "voice-mix-test-csrf");
  const row = (id = listener, targetId = target) => prisma.client.userVoiceMixPreference.findUnique({
    where: { listenerUserId_targetUserId: { listenerUserId: id, targetUserId: targetId } },
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    const users = await Promise.all(["listener", "target", "other", "outsider"].map((name) => prisma.client.user.create({
      data: { email: `${name}@mix.test`, username: name, displayName: name, passwordHash: "unused-test-fixture" },
    })));
    [listener, target, other, outsider] = users.map((user) => user.id);
    sessionIds = new Map(await Promise.all([listener, target, other, outsider].map(async (id) => [
      id,
      await createTestAccessSession(prisma, id),
    ] as const)));
    serverId = (await prisma.client.server.create({ data: { name: "Mix", ownerId: listener } })).id;
    await prisma.client.member.createMany({ data: [listener, target, other].map((userId) => ({ serverId, userId })) });
  });

  afterAll(async () => {
    if (prisma) await cleanDatabase(prisma);
    if (app) await app.close();
  });

  it("requires authentication on every route and CSRF on writes", async () => {
    await request(app.getHttpServer()).get(base).expect(401);
    await request(app.getHttpServer()).put(`${base}/${target}`).send({ volumePercent: 20, muted: false }).expect(401);
    await request(app.getHttpServer()).delete(`${base}/${target}`).expect(401);
    await request(app.getHttpServer()).put(`${base}/${target}`).set("Cookie", cookies(listener))
      .send({ volumePercent: 20, muted: false }).expect(403);
    expect(await row()).toBeNull();
  });

  it("returns [] for missing/default rows and only the authenticated listener's non-default rows", async () => {
    expect((await get().expect(200)).body).toEqual([]);
    await put({ volumePercent: 20, muted: true }).expect(200);
    await put({ volumePercent: 70, muted: false }, other).expect(200);
    await prisma.client.userVoiceMixPreference.create({ data: { listenerUserId: listener, targetUserId: other } });
    expect((await get(listener, `?listenerUserId=${other}&serverId=${randomUUID()}`).expect(200)).body)
      .toEqual([{ targetUserId: target, volumePercent: 20, muted: true }]);
    expect((await get(other).expect(200)).body).toEqual([{ targetUserId: target, volumePercent: 70, muted: false }]);
  });

  it.each([0, 35, 100])("accepts %i percent with either mute value and updates one pair", async (volumePercent) => {
    for (const muted of [true, false]) {
      expect((await put({ volumePercent, muted }).expect(200)).body).toEqual({ targetUserId: target, volumePercent, muted });
      const stored = await row();
      if (volumePercent === 100 && !muted) expect(stored).toBeNull();
      else expect(stored).toMatchObject({ volumePercent, muted, listenerUserId: listener, targetUserId: target });
    }
    expect(await prisma.client.userVoiceMixPreference.count()).toBe(volumePercent === 100 ? 0 : 1);
  });

  it.each([
    { volumePercent: -1, muted: false }, { volumePercent: 101, muted: false },
    { volumePercent: 20.5, muted: false }, { volumePercent: "20", muted: false },
    { volumePercent: null, muted: false }, { muted: false }, { volumePercent: 20 },
    { volumePercent: 20, muted: "false" }, { volumePercent: 20, muted: null },
    { volumePercent: 20, muted: false, listenerUserId: "spoofed" },
    { volumePercent: 20, muted: false, serverId: "widened" },
  ])("rejects invalid/widened payload %j without mutation", async (body) => {
    await put(body).expect(400);
    expect(await row()).toBeNull();
  });

  it("rejects malformed UUID and self including uppercase, on PUT and DELETE", async () => {
    for (const targetId of ["not-a-uuid", listener, listener.toUpperCase()]) {
      await put({ volumePercent: 20, muted: false }, listener, targetId).expect(400);
      await reset(listener, targetId).expect(400);
    }
    expect(await prisma.client.userVoiceMixPreference.count()).toBe(0);
  });

  it("does not distinguish a nonexistent account from an existing non-co-member", async () => {
    const existing = await put({ volumePercent: 20, muted: false }, listener, outsider).expect(404);
    const missing = await put({ volumePercent: 20, muted: false }, listener, randomUUID()).expect(404);
    expect(existing.body).toEqual({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    expect(missing.body).toEqual(existing.body);
    expect(await prisma.client.userVoiceMixPreference.count()).toBe(0);
  });

  it.each(["listener", "target"])("a banned %s is not an eligible co-member", async (banned) => {
    await prisma.client.member.updateMany({ where: { userId: banned === "listener" ? listener : target }, data: { isBanned: true } });
    await put({ volumePercent: 20, muted: false }).expect(404);
  });

  it("PUT and DELETE cannot affect another listener, and reset is idempotent", async () => {
    await put({ volumePercent: 70, muted: true }, other).expect(200);
    await put({ volumePercent: 20, muted: false }).expect(200);
    await put({ volumePercent: 1, muted: false, listenerUserId: other }).expect(400);
    for (let i = 0; i < 2; i++) {
      const response = await reset().expect(204);
      expect(response.text).toBe("");
    }
    expect(await row()).toBeNull();
    expect(await row(other)).toMatchObject({ volumePercent: 70, muted: true });
  });

  it("keeps account-pair state across channels/servers and allows reset after all membership is gone", async () => {
    await put({ volumePercent: 20, muted: true }).expect(200);
    const channel = await prisma.client.channel.create({ data: { serverId, name: "voice", type: "VOICE" } });
    const second = await prisma.client.server.create({ data: { name: "Second", ownerId: listener } });
    await prisma.client.member.createMany({ data: [listener, target].map((userId) => ({ userId, serverId: second.id })) });
    await prisma.client.channel.delete({ where: { id: channel.id } });
    expect(await row()).toMatchObject({ volumePercent: 20, muted: true });
    await prisma.client.server.delete({ where: { id: serverId } });
    await put({ volumePercent: 42, muted: false }).expect(200);
    await prisma.client.server.delete({ where: { id: second.id } });
    expect((await get().expect(200)).body).toEqual([{ targetUserId: target, volumePercent: 42, muted: false }]);
    await put({ volumePercent: 60, muted: false }).expect(404);
    await reset().expect(204);
    await reset().expect(204);
    expect(await row()).toBeNull();
  });

  it("PostgreSQL enforces defaults, pair uniqueness, range, non-self and both foreign keys", async () => {
    const insert = (listenerId: string, targetId: string, volume: number) => prisma.client.$executeRaw`
      INSERT INTO "user_voice_mix_preferences" ("listenerUserId", "targetUserId", "volumePercent", "updatedAt")
      VALUES (${listenerId}::uuid, ${targetId}::uuid, ${volume}, NOW())`;
    await prisma.client.$executeRaw`
      INSERT INTO "user_voice_mix_preferences" ("listenerUserId", "targetUserId", "updatedAt")
      VALUES (${listener}::uuid, ${target}::uuid, NOW())`;
    expect(await row()).toMatchObject({ volumePercent: 100, muted: false, updatedAt: expect.any(Date) });
    await expect(insert(listener, target, 50)).rejects.toMatchObject({ code: "P2010", meta: { code: "23505" } });
    for (const volume of [-1, 101]) {
      await expect(insert(listener, other, volume)).rejects.toMatchObject({ code: "P2010", meta: { code: "23514" } });
    }
    await expect(insert(listener, listener, 50)).rejects.toMatchObject({ code: "P2010", meta: { code: "23514" } });
    await expect(insert(listener, randomUUID(), 50)).rejects.toMatchObject({ code: "P2010", meta: { code: "23503" } });
    await expect(insert(randomUUID(), target, 50)).rejects.toMatchObject({ code: "P2010", meta: { code: "23503" } });
  });

  it.each(["listener", "target"])("PostgreSQL cascades deletion of the %s account", async (deleted) => {
    await prisma.client.userVoiceMixPreference.create({ data: { listenerUserId: other, targetUserId: target, volumePercent: 42 } });
    await prisma.client.user.delete({ where: { id: deleted === "listener" ? other : target } });
    expect(await row(other)).toBeNull();
  });
});
