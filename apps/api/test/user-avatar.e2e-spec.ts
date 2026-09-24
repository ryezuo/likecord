import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "crypto";
import sharp from "sharp";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";
import { StorageService } from "../src/storage/storage.service";
import { AvatarService } from "../src/user/avatar/avatar.service";
import { configureAvatarTransport } from "../src/user/avatar/avatar-transport";
import { createAvatarObject, parseAvatarUrl, avatarPosterKey } from "../src/storage/avatar-object";
import { gifFixture, animatedWebp } from "../src/user/avatar/avatar-animation.fixtures";
import { inspectAvatarAnimation } from "@likecord/shared/src/avatar-animation";
import { WsGateway } from "../src/ws/ws.gateway";
import { cleanDatabase, createTestAccessSession, testAccessCookie } from "./helpers";

describe("USER_AVATAR_01 API / PostgreSQL / Redis", () => {
  let app: INestApplication, prisma: PrismaService, redis: RedisService, storage: StorageService, avatars: AvatarService;
  let id: string, other: string, root: string, png: Buffer;
  let sessionIds: Map<string, string>;
  let oldDir: string | undefined, oldDriver: string | undefined;
  const base = "/api/v1/users/@me/avatar";
  const cookie = (userId = id) => `${testAccessCookie(userId, sessionIds.get(userId)!)}; csrf_token=avatar-test`;
  const upload = (userId = id) => request(app.getHttpServer()).post(base).set("Cookie", cookie(userId)).set("X-CSRF-Token", "avatar-test")
    .set("Origin", "https://localhost").set("Content-Type", "image/png");
  const remove = () => request(app.getHttpServer()).delete(base).set("Cookie", cookie()).set("X-CSRF-Token", "avatar-test").set("Origin", "https://localhost");
  const get = (url: string, userId = id) => request(app.getHttpServer()).get(url).set("Cookie", cookie(userId));
  beforeAll(async () => {
    oldDir = process.env.UPLOAD_DIR; oldDriver = process.env.STORAGE_DRIVER;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "likecord-avatar-e2e-"));
    process.env.UPLOAD_DIR = root; process.env.STORAGE_DRIVER = "local";
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ bodyParser: false }); configureAvatarTransport(app);
    app.setGlobalPrefix("api/v1"); app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService); redis = app.get(RedisService); storage = app.get(StorageService); avatars = app.get(AvatarService);
    png = await sharp({ create: { width: 32, height: 20, channels: 4, background: "red" } }).png().toBuffer();
  });
  beforeEach(async () => {
    await cleanDatabase(prisma);
    [id, other] = await Promise.all(["one", "two"].map(async (name) => (await prisma.client.user.create({
      data: { email: `${name}@avatar.test`, username: `avatar-${name}`, displayName: name, passwordHash: "unused-test-fixture" },
    })).id));
    sessionIds = new Map(await Promise.all([id, other].map(async (userId) => [
      userId,
      await createTestAccessSession(prisma, userId),
    ] as const)));
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    for (const userId of [id, other]) for (const bucket of ["mutation", "metadata", "image"]) await redis.getClient().del(`rl:avatar-${bucket}:${userId}`);
  });
  afterAll(async () => {
    if (prisma) await cleanDatabase(prisma); if (app) await app.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
    if (oldDir === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = oldDir;
    if (oldDriver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = oldDriver;
  });
  it("rejects unauthenticated reads/mutations and deleted requesters with no-store", async () => {
    for (const response of [
      await request(app.getHttpServer()).post(base).set("Content-Type", "image/png").send(png),
      await request(app.getHttpServer()).delete(base),
      await request(app.getHttpServer()).get(`/api/v1/users/${id}/avatar`),
      await request(app.getHttpServer()).get(createAvatarObject(id, new Date()).url).set("If-None-Match", "*"),
    ]) { expect(response.status).toBe(401); expect(response.headers["cache-control"]).toBe("no-store"); expect(response.body.error.code).toBe("AUTH_REQUIRED"); }
    const stale = cookie(); await prisma.client.user.delete({ where: { id } });
    await request(app.getHttpServer()).get(`/api/v1/users/${other}/avatar`).set("Cookie", stale).expect(401);
  });
  it("strict CSRF rejects missing/mismatching tokens and origins before upload", async () => {
    await upload().unset("Cookie").set("Cookie", cookie().split(";")[0]).send(png).expect(403);
    await upload().unset("X-CSRF-Token").send(png).expect(403);
    await upload().set("X-CSRF-Token", "wrong").send(png).expect(403);
    await upload().set("Origin", "https://localhost.evil.test").send(png).expect(403);
    await upload().unset("Origin").send(png).expect(403);
    await upload().unset("Origin").set("Referer", "https://localhost/settings").send(png).expect(200);
  });
  it("rejects target/key/version overrides, JSON, multipart, compression and cross-user mutation paths", async () => {
    for (const field of ["userId", "key", "version"]) await upload().query({ [field]: other }).send(png).expect(400);
    await upload().set("Content-Type", "application/json").send(JSON.stringify({ userId: other })).expect(415);
    await upload().set("Content-Type", "multipart/form-data; boundary=x").send(png).expect(415);
    await upload().set("Content-Encoding", "gzip").send(png).expect(415);
    await remove().send({ userId: other }).expect(400);
    await request(app.getHttpServer()).post(`/api/v1/users/${other}/avatar`).set("Cookie", cookie()).set("X-CSRF-Token", "avatar-test").send(png).expect(404);
    expect((await prisma.client.user.findUniqueOrThrow({ where: { id: other } })).avatarUrl).toBeNull();
  });
  it("applies the bounded crop header to original bytes and rejects invalid headers before normalization", async () => {
    const block = async (background: string) => sharp({ create: { width: 30, height: 30, channels: 3, background } }).png().toBuffer();
    const source = await sharp({ create: { width: 90, height: 30, channels: 3, background: "red" } })
      .composite([{ input: await block("green"), left: 30, top: 0 }, { input: await block("blue"), left: 60, top: 0 }]).png().toBuffer();
    const replaced = await upload().set("X-Avatar-Crop", '{"v":1,"panX":1,"panY":0,"zoom":1}').send(source).expect(200);
    const image = await get(replaced.body.avatarUrl).expect(200);
    const means = (await sharp(image.body).stats()).channels.map((channel) => channel.mean);
    expect(means[2]).toBeGreaterThan(220); expect(means[0]).toBeLessThan(30); expect(means[1]).toBeLessThan(30);

    const normalize = jest.spyOn(avatars, "replace");
    const invalid = await upload().set("X-Avatar-Crop", '{"v":1,"panX":2,"panY":0,"zoom":1}').send(source).expect(400);
    expect(invalid.body.error.code).toBe("AVATAR_INVALID_CROP");
    expect(normalize).not.toHaveBeenCalled();
    await upload().set("X-Avatar-Crop", [
      '{"v":1,"panX":0,"panY":0,"zoom":1}',
      '{"v":1,"panX":0,"panY":0,"zoom":1}',
    ]).send(source).expect(400);
  });
  it("first/replace/remove serves only current authenticated version with correct cache headers", async () => {
    const first = await upload().send(png).expect(200);
    expect(first.body).toEqual({ userId: id, avatarUrl: expect.any(String) }); expect(first.headers["cache-control"]).toBe("no-store");
    const meta = await get(`/api/v1/users/${id}/avatar`, other).expect(200); expect(meta.body).toEqual(first.body);
    const image = await get(first.body.avatarUrl, other).expect(200);
    expect(image.headers).toMatchObject({ "content-type": "image/webp", "x-content-type-options": "nosniff", "cache-control": "private, no-cache" });
    await get(first.body.avatarUrl).set("If-None-Match", image.headers.etag).expect(304);
    const candidate = createAvatarObject(id, await avatars.databaseTime());
    await storage.putAvatar(candidate.key, await sharp(png).webp().toBuffer()); await get(candidate.url).expect(404);
    const second = await upload().send(png).expect(200); expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
    await get(first.body.avatarUrl).set("If-None-Match", image.headers.etag).expect(404);
    await remove().expect(200); await get(second.body.avatarUrl).set("If-None-Match", "*").expect(404);
    expect((await get(`/api/v1/users/${id}/avatar`).expect(200)).body).toEqual({ userId: id, avatarUrl: null });
    await remove().expect(200);
  });
  it("uploads GIF/WebP pairs and protects poster authorization, ETag, legacy alias and replacement lifecycle", async () => {
    const first = await upload().send(png).expect(200);
    const staticMain = await get(first.body.avatarUrl).expect(200);
    const posterUrl = (url: string) => url.replace(".webp", ".poster.webp");
    const staticPoster = await get(posterUrl(first.body.avatarUrl)).expect(200);
    expect(staticPoster.body).toEqual(staticMain.body); expect(staticPoster.headers.etag).not.toBe(staticMain.headers.etag);
    for (const [format, input] of [["gif", gifFixture()], ["webp", await animatedWebp()]] as const) {
      const result = await upload().set("Content-Type", `image/${format}`).send(input).expect(200);
      const object = parseAvatarUrl(id, result.body.avatarUrl)!;
      expect(await storage.readAvatar(avatarPosterKey(object))).not.toBeNull();
      const main = await get(result.body.avatarUrl).expect(200), poster = await get(posterUrl(result.body.avatarUrl), other).expect(200);
      expect(inspectAvatarAnimation(main.body)?.frames).toBe(3); expect(inspectAvatarAnimation(poster.body)).toBeNull();
      expect(poster.headers).toMatchObject({ "content-type": "image/webp", "content-disposition": 'inline; filename="poster.webp"', "x-content-type-options": "nosniff", "cache-control": "private, no-cache" });
      await get(posterUrl(result.body.avatarUrl)).set("If-None-Match", poster.headers.etag).expect(304);
      await request(app.getHttpServer()).get(posterUrl(result.body.avatarUrl)).set("If-None-Match", poster.headers.etag).expect(401);
      await storage.deleteAvatar(avatarPosterKey(object));
      await get(posterUrl(result.body.avatarUrl)).expect(404);
      const next = await upload().send(png).expect(200);
      await get(posterUrl(result.body.avatarUrl)).set("If-None-Match", poster.headers.etag).expect(404);
      await get(posterUrl(next.body.avatarUrl)).expect(200);
    }
    await remove().expect(200);
    await get(posterUrl(first.body.avatarUrl)).expect(404);
  });
  it("rechecks poster reference after storage I/O and rejects candidate/invalid poster renditions", async () => {
    const result = await upload().set("Content-Type", "image/gif").send(gifFixture()).expect(200);
    const candidate = createAvatarObject(id, await avatars.databaseTime());
    await get(candidate.url.replace(".webp", ".poster.webp")).expect(404);
    const original = storage.readAvatar.bind(storage);
    jest.spyOn(storage, "readAvatar").mockImplementationOnce(async (key) => {
      const data = await original(key); await prisma.client.user.update({ where: { id }, data: { avatarUrl: null } }); return data;
    });
    await get(result.body.avatarUrl.replace(".webp", ".poster.webp")).expect(404);
  });
  it("rejects invalid UUID/unknown target and maps storage outage to JSON 503 no-store", async () => {
    await get("/api/v1/users/invalid/avatar").expect(400); await get(`/api/v1/users/${randomUUID()}/avatar`).expect(404);
    const response = await upload().send(png).expect(200);
    jest.spyOn(storage, "readAvatar").mockRejectedValueOnce(new Error("private filesystem path"));
    const failed = await get(response.body.avatarUrl).expect(503);
    expect(failed.body.error.code).toBe("STORAGE_ERROR"); expect(failed.headers["content-type"]).toMatch(/application\/json/);
    expect(failed.headers["cache-control"]).toBe("no-store"); expect(JSON.stringify(failed.body)).not.toContain("filesystem");
  });
  it.each([["mutation", 10, 600], ["metadata", 600, 60], ["image", 2400, 60]] as const)("exercises real Redis %s account bucket at its boundary", async (bucket, limit, ttl) => {
    const avatar = createAvatarObject(id, new Date());
    const key = `rl:avatar-${bucket}:${id}`;
    await redis.getClient().set(key, limit - 1, "EX", ttl);
    const send = (userId = id) => bucket === "mutation" ? upload(userId).send(png)
      : get(bucket === "metadata" ? `/api/v1/users/${id}/avatar` : avatar.url, userId);
    const first = await send(); expect(first.status).toBe(bucket === "image" ? 404 : 200);
    const exceeded = await send(); expect(exceeded.status).toBe(429); expect(exceeded.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(exceeded.headers["retry-after"]).toBeDefined();
    expect((await send(other)).status).toBe(bucket === "image" ? 404 : 200);
  });
  it("same-user and global admission reject immediately while another upload is admitted", async () => {
    const first = avatars.acquire(id), second = avatars.acquire("reserved");
    try { await upload().send(png).expect(409); await upload(other).send(png).expect(503); }
    finally { first(); second(); }
    await upload().send(png).expect(200);
  });
  it("emits only after real commit, and null -> null emits no event", async () => {
    const emit = jest.spyOn(app.get(WsGateway), "emitAvatarUpdated").mockImplementation(async (userId) => {
      expect((await prisma.client.user.findUniqueOrThrow({ where: { id: userId } })).avatarUrl).not.toBeNull();
    });
    await remove().expect(200); expect(emit).not.toHaveBeenCalled();
    await upload().send(png).expect(200); expect(emit).toHaveBeenCalledWith(id);
  });
  it("PostgreSQL User-row lock orders replace/replace, replace/remove and profile PATCH interleaving", async () => {
    const a = createAvatarObject(id, await avatars.databaseTime()), b = createAvatarObject(id, await avatars.databaseTime());
    const bytes = await sharp(png).webp().toBuffer(); await storage.putAvatar(a.key, bytes); await storage.putAvatar(b.key, bytes);
    let locked!: () => void, unlock!: () => void;
    const acquired = new Promise<void>((resolve) => { locked = resolve; });
    const release = new Promise<void>((resolve) => { unlock = resolve; });
    const holder = prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
      locked(); await release;
      await tx.user.update({ where: { id }, data: { avatarUrl: a.url } });
    });
    await acquired;
    let completed = false;
    const replacing = avatars["mutate"](id, b).then((result) => { completed = true; return result; });
    // Observe the real PostgreSQL lock waiter; timing alone is not evidence of serialization.
    const waitForLocks = async (count: number) => { for (let attempt = 0; attempt < 100; attempt++) {
      const waiters = await prisma.client.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`;
      if (Number(waiters[0].count) >= count) return;
      if (attempt === 99) { unlock(); throw new Error("No PostgreSQL row-lock waiter observed"); }
      await new Promise((resolve) => setTimeout(resolve, 10));
    } };
    await waitForLocks(1);
    const removing = avatars.remove(id);
    await waitForLocks(2);
    const patching = request(app.getHttpServer()).patch("/api/v1/users/@me").set("Cookie", cookie()).set("X-CSRF-Token", "avatar-test").send({ bio: "profile survives" }).then((value) => value);
    await waitForLocks(3);
    expect(completed).toBe(false); unlock(); await holder;
    const winner = await replacing; expect(winner.previous?.url).toBe(a.url);
    const [removed, profile] = await Promise.all([removing, patching]);
    expect(removed.previous?.url).toBe(b.url); expect(profile.status).toBe(200);
    expect(await prisma.client.user.findUniqueOrThrow({ where: { id } })).toMatchObject({ avatarUrl: null, bio: "profile survives" });
  });
});
