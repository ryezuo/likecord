import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase } from "./helpers";

function csrf(cookies: string[]): string {
  return cookies.find((cookie: string) => cookie.startsWith("csrf_token="))?.split(";")[0].split("=")[1] || "";
}

describe("Navigation preferences (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookies: string[];
  let ownerCsrf: string;
  let otherCookies: string[];
  let otherCsrf: string;
  let ownerId: string;
  let otherId: string;
  let serverAId: string;
  let serverBId: string;
  let firstTextId: string;
  let secondTextId: string;
  let voiceId: string;
  let otherServerTextId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
    prisma = app.get(PrismaService);
    await cleanDatabase(prisma);

    const passwordHash = await argon2.hash("navigation-password", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const [owner, other] = await Promise.all([
      prisma.client.user.create({ data: { email: "navigation-owner@test.local", username: "nav-owner", displayName: "Navigation Owner", passwordHash } }),
      prisma.client.user.create({ data: { email: "navigation-other@test.local", username: "nav-other", displayName: "Navigation Other", passwordHash } }),
    ]);
    ownerId = owner.id;
    otherId = other.id;
    const [serverA, serverB] = await Promise.all([
      prisma.client.server.create({ data: { name: "Navigation A", ownerId } }),
      prisma.client.server.create({ data: { name: "Navigation B", ownerId } }),
    ]);
    serverAId = serverA.id;
    serverBId = serverB.id;

    await prisma.client.member.createMany({ data: [
      { serverId: serverAId, userId: ownerId },
      { serverId: serverAId, userId: otherId },
      { serverId: serverBId, userId: ownerId },
    ] });
    await prisma.client.role.createMany({ data: [
      { serverId: serverAId, name: "@everyone", permissions: BigInt(0x400), position: 0, isDefault: true, isMentionable: false },
      { serverId: serverBId, name: "@everyone", permissions: BigInt(0x400), position: 0, isDefault: true, isMentionable: false },
    ] });
    const [firstText, secondText, voice, otherServerText] = await Promise.all([
      prisma.client.channel.create({ data: { serverId: serverAId, name: "first", type: "TEXT", position: 0 } }),
      prisma.client.channel.create({ data: { serverId: serverAId, name: "second", type: "TEXT", position: 1 } }),
      prisma.client.channel.create({ data: { serverId: serverAId, name: "voice", type: "VOICE", position: 2 } }),
      prisma.client.channel.create({ data: { serverId: serverBId, name: "other-server", type: "TEXT", position: 0 } }),
    ]);
    firstTextId = firstText.id;
    secondTextId = secondText.id;
    voiceId = voice.id;
    otherServerTextId = otherServerText.id;

    const [ownerLogin, otherLogin] = await Promise.all([
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "navigation-owner@test.local", password: "navigation-password" }),
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "navigation-other@test.local", password: "navigation-password" }),
    ]);
    ownerCookies = ownerLogin.headers["set-cookie"];
    ownerCsrf = csrf(ownerCookies);
    otherCookies = otherLogin.headers["set-cookie"];
    otherCsrf = csrf(otherCookies);
  }, 25000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it("PREF-01 persists a preference for the authenticated user/server pair", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/navigation/servers/${serverAId}/preference`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ channelId: secondTextId })
      .expect(200);

    await expect(prisma.client.userServerPreference.findUnique({
      where: { userId_serverId: { userId: ownerId, serverId: serverAId } },
    })).resolves.toMatchObject({ lastTextChannelId: secondTextId });
  });

  it("PREF-02 keeps another user's preference independent in the same server", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/navigation/servers/${serverAId}/preference`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf)
      .send({ channelId: firstTextId })
      .expect(200);

    const preferences = await prisma.client.userServerPreference.findMany({ where: { serverId: serverAId } });
    expect(preferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: ownerId, lastTextChannelId: secondTextId }),
      expect.objectContaining({ userId: otherId, lastTextChannelId: firstTextId }),
    ]));
  });

  it("CHPERM-45 / ROUTING-08: F.2 canonical navigation resolves the persisted accessible Text Channel", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/navigation/servers/${serverAId}`)
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(res.body.channelId).toBe(secondTextId);
  });

  it("PREF-03 rejects non-text channels and preserves the existing preference", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/navigation/servers/${serverAId}/preference`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ channelId: voiceId })
      .expect(404);

    await expect(prisma.client.userServerPreference.findUnique({
      where: { userId_serverId: { userId: ownerId, serverId: serverAId } },
    })).resolves.toMatchObject({ lastTextChannelId: secondTextId });
  });

  it("PREF-04 and ROUTING-10 reject a channel from another server", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/navigation/servers/${serverAId}/preference`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ channelId: otherServerTextId })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/navigation/servers/${serverAId}/channels/${otherServerTextId}`)
      .set("Cookie", ownerCookies)
      .expect(404);
  });

  it("PREF-05 and ROUTING-09 ignore a deleted preferred channel and fall back safely", async () => {
    await prisma.client.channel.delete({ where: { id: secondTextId } });

    const preference = await prisma.client.userServerPreference.findUnique({
      where: { userId_serverId: { userId: ownerId, serverId: serverAId } },
    });
    expect(preference?.lastTextChannelId).toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/navigation/servers/${serverAId}`)
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(res.body.channelId).toBe(firstTextId);
  });

  it("ROUTING-11 does not validate a channel when the user lacks view permission", async () => {
    await prisma.client.role.updateMany({ where: { serverId: serverAId, isDefault: true }, data: { permissions: BigInt(0) } });
    await request(app.getHttpServer())
      .get(`/api/v1/navigation/servers/${serverAId}/channels/${firstTextId}`)
      .set("Cookie", otherCookies)
      .expect(404);
  });

  describe("F7.2 aggregate Continue", () => {
    const older = new Date("2026-09-01T10:00:00Z");
    const newer = new Date("2026-09-02T10:00:00Z");
    const read = (cookies = otherCookies) => request(app.getHttpServer())
      .get("/api/v1/navigation/continue").set("Cookie", cookies);
    const save = (userId: string, serverId: string, lastTextChannelId: string | null, updatedAt = newer) =>
      prisma.client.userServerPreference.create({ data: { userId, serverId, lastTextChannelId, updatedAt } });
    const destinationA = () => ({ destination: { serverId: serverAId, serverName: "Navigation A", channelId: firstTextId, channelName: "first" } });
    const destinationB = () => ({ destination: { serverId: serverBId, serverName: "Navigation B", channelId: otherServerTextId, channelName: "other-server" } });

    beforeEach(async () => {
      await prisma.client.userServerPreference.deleteMany();
      await prisma.client.channelPermissionOverwrite.deleteMany();
      await prisma.client.role.updateMany({ data: { permissions: BigInt(0x400) } });
      for (const serverId of [serverAId, serverBId]) {
        await prisma.client.member.upsert({
          where: { serverId_userId: { serverId, userId: otherId } },
          create: { serverId, userId: otherId },
          update: { isBanned: false },
        });
      }
    });

    it("rejects an unauthenticated read", async () => {
      await request(app.getHttpServer()).get("/api/v1/navigation/continue").expect(401);
    });

    it("returns the newest valid own destination, isolates accounts and disables caching", async () => {
      await save(otherId, serverAId, firstTextId, older);
      await save(otherId, serverBId, otherServerTextId);
      await save(ownerId, serverAId, firstTextId, new Date("2026-09-03T10:00:00Z"));
      const response = await read().expect(200);
      expect(response.body).toEqual(destinationB());
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect((await read(ownerCookies).expect(200)).body).toEqual(destinationA());
      const override = await request(app.getHttpServer())
        .get(`/api/v1/navigation/continue?userId=${ownerId}`).set("Cookie", otherCookies).expect(200);
      expect(override.body).toEqual(destinationB());
    });

    it("returns null without own preferences even with accessible servers and another account's rows", async () => {
      await save(ownerId, serverAId, firstTextId);
      expect((await read().expect(200)).body).toEqual({ destination: null });
    });

    it("breaks timestamp ties by serverId ascending", async () => {
      await save(otherId, serverBId, otherServerTextId);
      await save(otherId, serverAId, firstTextId);
      const expected = serverAId < serverBId ? destinationA() : destinationB();
      expect((await read().expect(200)).body).toEqual(expected);
      expect((await read().expect(200)).body).toEqual(expected);
    });

    it.each(["removed", "banned"])("skips %s membership in the newest preference and returns the older saved destination", async (kind) => {
      await save(otherId, serverAId, firstTextId);
      await save(otherId, serverBId, otherServerTextId, older);
      const where = { serverId_userId: { serverId: serverAId, userId: otherId } };
      if (kind === "removed") await prisma.client.member.delete({ where });
      else await prisma.client.member.update({ where, data: { isBanned: true } });
      expect((await read().expect(200)).body).toEqual(destinationB());
    });

    it.each(["null", "voice", "foreign", "deleted"])("skips a %s saved channel without using the per-server fallback", async (kind) => {
      let channelId: string | null = kind === "voice" ? voiceId : kind === "foreign" ? otherServerTextId : null;
      if (kind === "deleted") {
        const channel = await prisma.client.channel.create({ data: { serverId: serverAId, name: "deleted-private-name", type: "TEXT" } });
        channelId = channel.id;
      }
      await save(otherId, serverAId, channelId);
      await save(otherId, serverBId, otherServerTextId, older);
      if (kind === "deleted") await prisma.client.channel.delete({ where: { id: channelId! } });
      expect((await read().expect(200)).body).toEqual(destinationB());
      await prisma.client.userServerPreference.delete({ where: { userId_serverId: { userId: otherId, serverId: serverBId } } });
      expect((await read().expect(200)).body).toEqual({ destination: null });
      // Explicit server opening still falls back to its visible first channel.
      const explicit = await request(app.getHttpServer()).get(`/api/v1/navigation/servers/${serverAId}`).set("Cookie", otherCookies).expect(200);
      expect(explicit.body).toEqual({ channelId: firstTextId });
    });

    it("uses effective channel permission rules and does not disclose a hidden channel", async () => {
      await save(otherId, serverAId, firstTextId);
      await save(otherId, serverBId, otherServerTextId, older);
      const member = await prisma.client.member.findUniqueOrThrow({ where: { serverId_userId: { serverId: serverAId, userId: otherId } } });
      await prisma.client.channelPermissionOverwrite.create({ data: { channelId: firstTextId, memberId: member.id, allow: 0n, deny: 0x400n } });
      expect((await read().expect(200)).body).toEqual(destinationB());
      await prisma.client.role.updateMany({ where: { serverId: serverBId }, data: { permissions: 0n } });
      expect((await read().expect(200)).body).toEqual({ destination: null });
    });

    it("retains owner access and requires only VIEW_CHANNEL for ordinary members", async () => {
      await save(ownerId, serverAId, firstTextId);
      await save(otherId, serverBId, otherServerTextId);
      await prisma.client.role.updateMany({ where: { serverId: serverAId }, data: { permissions: 0n } });
      expect((await read(ownerCookies).expect(200)).body).toEqual(destinationA());
      expect((await read().expect(200)).body).toEqual(destinationB());
    });

    it("skips a deleted server and retains an older saved destination", async () => {
      const server = await prisma.client.server.create({ data: { name: "deleted-private-server", ownerId } });
      const channel = await prisma.client.channel.create({ data: { serverId: server.id, name: "deleted", type: "TEXT" } });
      await save(ownerId, server.id, channel.id);
      await save(ownerId, serverBId, otherServerTextId, older);
      await prisma.client.server.delete({ where: { id: server.id } });
      expect((await read(ownerCookies).expect(200)).body).toEqual(destinationB());
    });

    it("never writes, repairs or updates preference timestamps during successful or empty GETs", async () => {
      await save(otherId, serverAId, null);
      await save(otherId, serverBId, otherServerTextId, older);
      const before = await prisma.client.userServerPreference.findMany({ orderBy: { serverId: "asc" } });
      expect((await read().expect(200)).body).toEqual(destinationB());
      await prisma.client.role.updateMany({ data: { permissions: 0n } });
      expect((await read().expect(200)).body).toEqual({ destination: null });
      const after = await prisma.client.userServerPreference.findMany({ orderBy: { serverId: "asc" } });
      expect(after).toEqual(before);
    });
  });
});
