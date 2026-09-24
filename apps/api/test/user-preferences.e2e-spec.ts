import { DEFAULT_CAPTURE_PREFERENCES } from "@likecord/shared/capture-preferences";
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

describe("Typed user preferences (PostgreSQL + authenticated REST)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;
  let otherUserId: string;
  let sessionIds: Map<string, string>;
  const base = "/api/v1/users/@me/preferences";
  const csrf = "user-preferences-test-csrf";

  const cookies = (id: string) => [
    testAccessCookie(id, sessionIds.get(id)!, "preferences@test.local", "preferences"),
    `csrf_token=${csrf}`,
  ];
  const get = (id = userId, query = "") => request(app.getHttpServer()).get(base + query).set("Cookie", cookies(id));
  const patch = (body: unknown, id = userId) => request(app.getHttpServer()).patch(base)
    .set("Cookie", cookies(id)).set("X-CSRF-Token", csrf).send(body);
  const row = (id = userId) => prisma.client.userPreference.findUnique({ where: { userId: id } });
  const importSound = (body: unknown, id = userId) => request(app.getHttpServer()).put(`${base}/sound-effects/import`)
    .set("Cookie", cookies(id)).set("X-CSRF-Token", csrf).send(body);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
    // Keep one listener for concurrent Supertest requests; per-request ownership
    // otherwise closes the shared ephemeral server while peers are still reading.
    await app.listen(0, "127.0.0.1");
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    const users = await Promise.all(["owner", "other"].map((name) => prisma.client.user.create({
      data: { email: `${name}@preferences.test`, username: `preferences-${name}`, displayName: name, passwordHash: "unused-test-fixture" },
    })));
    [userId, otherUserId] = users.map((user) => user.id);
    sessionIds = new Map(await Promise.all([userId, otherUserId].map(async (id) => [
      id,
      await createTestAccessSession(prisma, id),
    ] as const)));
  });

  afterAll(async () => {
    if (prisma) await cleanDatabase(prisma);
    if (app) await app.close();
  });

  it("rejects unauthenticated GET and PATCH", async () => {
    await request(app.getHttpServer()).get(base).expect(401);
    await request(app.getHttpServer()).patch(base).send({ showSendButton: true }).expect(401);
    expect(await prisma.client.userPreference.count()).toBe(0);
  });

  it("VA3A persists typed capture defaults/zero/false independently of all existing preferences", async () => {
    await patch({ showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: false, soundEffectsVolume: 12, callAndStreamVolume: 17 }).expect(200);
    const intended = { inputGainPercent: 0, voiceActivationEnabled: false, voiceActivationThresholdDbfs: -80,
      echoCancellationIntent: "REMOTE_ONLY", noiseSuppressionIntent: "OFF", autoGainControlIntent: "ON", voiceIsolationIntent: "AUTO" };
    expect((await patch(intended).expect(200)).body).toEqual({ ...intended, noiseSuppressionMode: "BROWSER", showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: false, soundEffectsVolume: 12, callAndStreamVolume: 17 });
    await importSound({ enabled: true }).expect(200);
    expect((await get().expect(200)).body).toMatchObject(intended);
    expect((await get(otherUserId).expect(200)).body).toMatchObject(DEFAULT_CAPTURE_PREFERENCES);
    const before = (await row())!.updatedAt;
    await patch({}).expect(200); expect((await row())!.updatedAt).toEqual(before);
    await patch({ inputGainPercent: 200, voiceActivationThresholdDbfs: -10, voiceActivationEnabled: true }).expect(200);
  });

  it.each([
    { noiseSuppressionMode: null }, { noiseSuppressionMode: "rnnoise" }, { noiseSuppressionMode: true }, { noiseSuppressionMode: "AUTO" },
    { inputGainPercent: -1 }, { inputGainPercent: 201 }, { inputGainPercent: 1.5 }, { inputGainPercent: "100" }, { inputGainPercent: null },
    { voiceActivationThresholdDbfs: -81 }, { voiceActivationThresholdDbfs: -9 }, { voiceActivationThresholdDbfs: -50.5 }, { voiceActivationThresholdDbfs: null },
    { voiceActivationEnabled: 0 }, { voiceActivationEnabled: "false" }, { voiceActivationEnabled: null },
    { echoCancellationIntent: "remote-only" }, { echoCancellationIntent: true }, { noiseSuppressionIntent: "ALL" },
    { autoGainControlIntent: false }, { voiceIsolationIntent: "UNKNOWN" }, { voiceIsolationIntent: null },
    { deviceId: "input-alias" }, { groupId: "group-alias" }, { sampleRate: 48000 }, { capabilities: {} },
  ])("VA3A rejects invalid or physical server fields %j", async (body) => {
    await patch(body).expect(400); expect(await row()).toBeNull();
  });

  it("VA3B persists strict suppression per account without changing native intents or legacy import", async () => {
    expect((await get().expect(200)).body.noiseSuppressionMode).toBe("BROWSER");
    await patch({ noiseSuppressionIntent: "ON", voiceIsolationIntent: "ON", inputGainPercent: 73, theme: "LIKECORD_RETRO_98" }).expect(200);
    for (const noiseSuppressionMode of ["OFF", "RNNOISE", "BROWSER", "RNNOISE"]) {
      expect((await patch({ noiseSuppressionMode }).expect(200)).body).toMatchObject({ noiseSuppressionMode, noiseSuppressionIntent: "ON", voiceIsolationIntent: "ON", inputGainPercent: 73, theme: "LIKECORD_RETRO_98" });
    }
    expect((await importSound({ enabled: false }).expect(200)).body.noiseSuppressionMode).toBe("RNNOISE");
    expect((await get().expect(200)).body.noiseSuppressionMode).toBe("RNNOISE");
    expect((await get(otherUserId).expect(200)).body.noiseSuppressionMode).toBe("BROWSER");
    const before = (await row())!.updatedAt;
    await patch({}).expect(200);expect((await row())!.updatedAt).toEqual(before);
    await patch({ maxBitrateKbps: 96 }).expect(400);
  });

  it("VA3A SQL constraints enforce numeric ranges and enum domain", async () => {
    await patch({ inputGainPercent: 0 }).expect(200);
    await expect(prisma.client.$executeRaw`UPDATE "user_preferences" SET "inputGainPercent" = 201 WHERE "userId" = ${userId}::uuid`).rejects.toThrow();
    await expect(prisma.client.$executeRaw`UPDATE "user_preferences" SET "voiceActivationThresholdDbfs" = -81 WHERE "userId" = ${userId}::uuid`).rejects.toThrow();
    await expect(prisma.client.$executeRaw`UPDATE "user_preferences" SET "autoGainControlIntent" = 'ALL' WHERE "userId" = ${userId}::uuid`).rejects.toThrow();
  });

  it("returns the full default projection without creating a row", async () => {
    expect((await get().expect(200)).body).toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: false, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(await row()).toBeNull();
  });

  it("returns durable values without leaking persistence metadata", async () => {
    await prisma.client.userPreference.create({ data: { userId, showSendButton: true, theme: "LIKECORD_RETRO_98" } });
    expect((await get().expect(200)).body).toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
  });

  it("PATCH lazily creates and repeatedly upserts only the authenticated user's preference", async () => {
    await prisma.client.userPreference.create({ data: { userId: otherUserId, showSendButton: false } });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await patch({ showSendButton: true }).expect(200)).body)
        .toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    }
    expect(await row()).toMatchObject({ userId, showSendButton: true, updatedAt: expect.any(Date) });
    expect(await row(otherUserId)).toMatchObject({ userId: otherUserId, showSendButton: false });
    expect(await prisma.client.userPreference.count()).toBe(2);
  });

  it("empty PATCH returns effective state without creating or overwriting a row", async () => {
    expect((await patch({}).expect(200)).body).toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: false, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(await row()).toBeNull();
    await prisma.client.userPreference.create({ data: { userId, showSendButton: true } });
    expect((await patch({}).expect(200)).body).toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(await row()).toMatchObject({ showSendButton: true });
  });

  it.each(["true", 1, null, {}, []])("rejects invalid showSendButton value %j", async (value) => {
    await patch({ showSendButton: value }).expect(400);
    expect(await row()).toBeNull();
  });

  it("accepts both shared durable ThemeIds and preserves the other preference", async () => {
    await prisma.client.userPreference.create({ data: { userId, showSendButton: true } });
    for (const theme of ["LIKECORD_RETRO_98", "LIKECORD_DEFAULT"]) {
      expect((await patch({ theme }).expect(200)).body)
        .toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: true, theme, soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
      expect(await row()).toMatchObject({ showSendButton: true, theme });
    }

    for (const theme of ["dark", "WIN98", "", null, 1, {}, []]) {
      await patch({ theme }).expect(400);
    }
    expect(await row()).toMatchObject({ showSendButton: true, theme: "LIKECORD_DEFAULT" });
  });

  it("rejects unknown or cross-user fields and ignores query targeting", async () => {
    await patch({ showSendButton: true, userId: otherUserId }).expect(400);
    await patch({ showSendButton: true, theme: "dark" }).expect(400);
    await prisma.client.userPreference.create({ data: { userId: otherUserId, showSendButton: true } });
    expect((await get(userId, `?userId=${otherUserId}&targetUserId=${randomUUID()}`).expect(200)).body)
      .toEqual({ ...DEFAULT_CAPTURE_PREFERENCES, showSendButton: false, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 });
    expect(await row()).toBeNull();
    expect(await row(otherUserId)).toMatchObject({ showSendButton: true });
  });

  it("handles concurrent first writes without exposing the unique ownership race", async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => patch({ showSendButton: true })));
    expect(responses.map((response) => response.status)).toEqual(Array(8).fill(200));
    expect(responses.every((response) => response.body.showSendButton === true)).toBe(true);
    expect(await prisma.client.userPreference.count({ where: { userId } })).toBe(1);
  });

  it("enforces the database default, unique user ownership, foreign key, and account cascade", async () => {
    await prisma.client.$executeRaw`
      INSERT INTO "user_preferences" ("userId", "updatedAt") VALUES (${userId}::uuid, NOW())`;
    expect(await row()).toMatchObject({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    await prisma.client.$executeRaw`
      UPDATE "user_preferences" SET "theme" = 'LIKECORD_RETRO_98' WHERE "userId" = ${userId}::uuid`;
    expect(await row()).toMatchObject({ showSendButton: false, theme: "LIKECORD_RETRO_98" });
    await expect(prisma.client.$executeRaw`
      UPDATE "user_preferences" SET "theme" = 'UNKNOWN' WHERE "userId" = ${userId}::uuid`)
      .rejects.toBeDefined();
    await expect(prisma.client.userPreference.create({ data: { userId, showSendButton: true } }))
      .rejects.toMatchObject({ code: "P2002" });
    await expect(prisma.client.userPreference.create({ data: { userId: randomUUID() } }))
      .rejects.toMatchObject({ code: "P2003" });
    await prisma.client.user.delete({ where: { id: userId } });
    expect(await row()).toBeNull();
  });

  it("preserves false/zero and unrelated fields, including volume-only on a theme row", async () => {
    await patch({ theme: "LIKECORD_RETRO_98", showSendButton: true }).expect(200);
    expect((await patch({ soundEffectsVolume: 0 }).expect(200)).body).toEqual({
      ...DEFAULT_CAPTURE_PREFERENCES,
      showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: null, soundEffectsVolume: 0, callAndStreamVolume: 100,
    });
    expect((await patch({ soundEffectsEnabled: false }).expect(200)).body).toEqual({
      ...DEFAULT_CAPTURE_PREFERENCES,
      showSendButton: true, theme: "LIKECORD_RETRO_98", soundEffectsEnabled: false, soundEffectsVolume: 0, callAndStreamVolume: 100,
    });
    await patch({ showSendButton: false }).expect(200);
    expect(await row()).toMatchObject({ soundEffectsEnabled: false, soundEffectsVolume: 0, theme: "LIKECORD_RETRO_98" });
    expect(await row(otherUserId)).toBeNull();
  });

  it.each([-1, 101, .5, "70", null, true, {}, []])("rejects invalid SFX volume %j", async value => {
    await patch({ soundEffectsVolume: value }).expect(400);
    expect(await row()).toBeNull();
  });
  it.each(["false", 0, null, {}, []])("rejects invalid SFX enabled %j", async value => {
    await patch({ soundEffectsEnabled: value }).expect(400);
    await importSound({ enabled: value }).expect(400);
    expect(await row()).toBeNull();
  });
  it("rejects unknown/device/target fields and requires authenticated CSRF-protected import", async () => {
    for (const body of [{}, { enabled: false, userId: otherUserId }, { enabled: false, volume: 10 }, { enabled: true, deviceId: "physical" }]) {
      await importSound(body).expect(400);
    }
    await patch({ soundEffectsVolume: 50, deviceId: "physical" }).expect(400);
    await request(app.getHttpServer()).put(`${base}/sound-effects/import`).send({ enabled: false }).expect(401);
    await request(app.getHttpServer()).put(`${base}/sound-effects/import`).set("Cookie", cookies(userId)).send({ enabled: false }).expect(403);
    expect(await row()).toBeNull();
  });
  it("atomically imports false into a theme-only row and preserves low volume and other preferences", async () => {
    await patch({ theme: "LIKECORD_RETRO_98", showSendButton: true, soundEffectsVolume: 9 }).expect(200);
    expect((await importSound({ enabled: false }).expect(200)).body).toEqual({
      ...DEFAULT_CAPTURE_PREFERENCES,
      theme: "LIKECORD_RETRO_98", showSendButton: true, soundEffectsVolume: 9, soundEffectsEnabled: false, callAndStreamVolume: 100,
    });
    expect(await row(otherUserId)).toBeNull();
    const before = await row();
    expect((await importSound({ enabled: true }).expect(200)).body.soundEffectsEnabled).toBe(false);
    expect((await row())!.updatedAt).toEqual(before!.updatedAt);
  });
  it.each([false, true])("existing server choice %s wins over late legacy import", async enabled => {
    await patch({ soundEffectsEnabled: enabled, soundEffectsVolume: 7 }).expect(200);
    expect((await importSound({ enabled: !enabled }).expect(200)).body).toMatchObject({ soundEffectsEnabled: enabled, soundEffectsVolume: 7 });
  });
  it("concurrent first imports from devices converge on the first stored choice", async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => importSound({ enabled: i % 2 === 0 })));
    const final = await row();
    expect(responses.every(response => response.status === 200 && response.body.soundEffectsEnabled === final!.soundEffectsEnabled)).toBe(true);
    expect(await prisma.client.userPreference.count()).toBe(1);
  });
  it.each([false, true])("normal write %s wins when racing an opposite import", async enabled => {
    const responses = await Promise.all([importSound({ enabled: !enabled }), patch({ soundEffectsEnabled: enabled })]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    expect(await row()).toMatchObject({ soundEffectsEnabled: enabled });
    expect((await importSound({ enabled: !enabled }).expect(200)).body.soundEffectsEnabled).toBe(enabled);
  });
  it("PostgreSQL enforces SFX range and null/70 defaults without filling enabled intent", async () => {
    await prisma.client.$executeRaw`INSERT INTO "user_preferences" ("userId", "updatedAt") VALUES (${userId}::uuid, NOW())`;
    expect(await row()).toMatchObject({ soundEffectsEnabled: null, soundEffectsVolume: 70 });
    for (const volume of [-1, 101]) {
      await expect(prisma.client.$executeRaw`UPDATE "user_preferences" SET "soundEffectsVolume" = ${volume} WHERE "userId" = ${userId}::uuid`).rejects.toBeDefined();
    }
    for (const volume of [0, 100]) {
      await prisma.client.$executeRaw`UPDATE "user_preferences" SET "soundEffectsVolume" = ${volume} WHERE "userId" = ${userId}::uuid`;
      expect(await row()).toMatchObject({ soundEffectsEnabled: null, soundEffectsVolume: volume });
    }
  });

  it.each([0, 100, 200])("persists CALL and Screen master boundary %s without changing SFX or appearance", async callAndStreamVolume => {
    await patch({ theme: "LIKECORD_RETRO_98", soundEffectsEnabled: false, soundEffectsVolume: 7 }).expect(200);
    expect((await patch({ callAndStreamVolume }).expect(200)).body).toEqual({
      ...DEFAULT_CAPTURE_PREFERENCES,
      showSendButton: false,
      theme: "LIKECORD_RETRO_98",
      soundEffectsEnabled: false,
      soundEffectsVolume: 7,
      callAndStreamVolume,
    });
    expect(await row()).toMatchObject({ callAndStreamVolume, soundEffectsEnabled: false, soundEffectsVolume: 7 });
  });

  it.each([-1, 201, .5, "100", null, true, {}, []])("rejects invalid CALL and Screen master %j", async value => {
    await patch({ callAndStreamVolume: value }).expect(400);
    expect(await row()).toBeNull();
  });

  it("PostgreSQL enforces CALL and Screen master range and default", async () => {
    await prisma.client.$executeRaw`INSERT INTO "user_preferences" ("userId", "updatedAt") VALUES (${userId}::uuid, NOW())`;
    expect(await row()).toMatchObject({ callAndStreamVolume: 100 });
    for (const volume of [-1, 201]) {
      await expect(prisma.client.$executeRaw`UPDATE "user_preferences" SET "callAndStreamVolume" = ${volume} WHERE "userId" = ${userId}::uuid`).rejects.toBeDefined();
    }
    for (const volume of [0, 200]) {
      await prisma.client.$executeRaw`UPDATE "user_preferences" SET "callAndStreamVolume" = ${volume} WHERE "userId" = ${userId}::uuid`;
      expect(await row()).toMatchObject({ callAndStreamVolume: volume });
    }
  });
});

// VA.1 uses the same PostgreSQL/auth harness; these checks cannot be proven by a double.
