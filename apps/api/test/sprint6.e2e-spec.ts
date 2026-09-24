import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { VoiceService } from "../src/voice/voice.service";
import { PermissionService } from "../src/server/guards/permission.service";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("Voice (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let voiceService: VoiceService;
  let permService: PermissionService;
  let serverId: string;
  let voiceChannelId: string;
  let textChannelId: string;
  let ownerId: string;
  let ownerCookies: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);
    voiceService = app.get(VoiceService);
    permService = app.get(PermissionService);

    await cleanDatabase(prisma);

    const hash = await argon2.hash("pass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const owner = await prisma.client.user.create({
      data: { email: "vowner@test.com", username: "vowner", displayName: "Owner", passwordHash: hash },
    });
    ownerId = owner.id;

    const sv = await prisma.client.server.create({ data: { name: "VoiceTest", ownerId: owner.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });
    // @everyone with CONNECT + VIEW_CHANNEL + SPEAK + READ + SEND + VIEW_SERVER
    await prisma.client.role.create({
      data: { serverId: sv.id, name: "@everyone", permissions: BigInt(0x400 | 0x800 | 0x1000 | 0x80 | 0x40 | 0x1 | 0x200), position: 0, isDefault: true },
    });
    voiceChannelId = (await prisma.client.channel.create({ data: { serverId: sv.id, type: "VOICE", name: "General", position: 0 } })).id;
    textChannelId = (await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "chat", position: 1 } })).id;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "vowner@test.com", password: "pass" });
    ownerCookies = loginRes.headers["set-cookie"];
  }, 20000);

  // Clean all voice state from Redis after each test
  afterEach(async () => {
    const client = (voiceService as any).redis.getClient();
    if (client) {
      try {
        const keys = await client.keys("voice:*");
        for (const k of keys) { try { await client.del(k); } catch { /* */ } }
      } catch { /* */ }
    }
  });

  afterAll(async () => {
    // Clean up any voice state left in Redis
    try { await voiceService.leave(voiceChannelId, ownerId); } catch { /* ok */ }
    await cleanDatabase(prisma);
    await app.close();
  });

  // Test 1: non-member cannot join voice
  it("non-member cannot join voice", async () => {
    const nonMemberId = crypto.randomUUID();
    await expect(voiceService.validateJoin(serverId, voiceChannelId, nonMemberId)).rejects.toThrow();
  });

  // Test 2: member without CONNECT cannot join
  it("member without CONNECT cannot join", async () => {
    const hash = await argon2.hash("ypass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "y@y.com", username: "yuser", displayName: "Y", passwordHash: hash } });

    // Create a separate server where @everyone does NOT have CONNECT
    const restrictedSv = await prisma.client.server.create({ data: { name: "Restricted", ownerId } });
    await prisma.client.role.create({
      data: { serverId: restrictedSv.id, name: "@everyone",
        permissions: BigInt(0x40 | 0x80 | 0x200 | 0x400), // VIEW_CHANNEL+SEND_MSG+ATTACH+CREATE_INVITE, no ADMIN(0x1) no CONNECT(0x800)
        position: 0, isDefault: true, isMentionable: false },
    });
    await prisma.client.member.create({ data: { serverId: restrictedSv.id, userId: u.id } });
    const restrictedVoice = await prisma.client.channel.create({
      data: { serverId: restrictedSv.id, type: "VOICE", name: "VC", position: 0 },
    });

    // Check hasPermission directly first
    const hasConnect = await permService.hasPermission(restrictedSv.id, u.id, BigInt(0x800));
    expect(hasConnect).toBe(false);

    await expect(
      voiceService.validateJoin(restrictedSv.id, restrictedVoice.id, u.id)
    ).rejects.toThrow();
  });

  // Test 3: text channel cannot be joined as voice
  it("text channel cannot be joined as voice", async () => {
    await expect(voiceService.validateJoin(serverId, textChannelId, ownerId)).rejects.toThrow();
  });

  // Test 4: Ice servers endpoint returns data
  it("GET /voice/ice-servers returns servers", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/voice/ice-servers")
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].urls).toBeDefined();
  });

  // Test 5: unauthenticated cannot access ice-servers
  it("unauthenticated cannot access ice-servers", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/voice/ice-servers")
      .expect(401);
  });

  // Test 6: join stores voice state in Redis and leave clears it
  it("join stores and leave clears voice state", async () => {
    // Ensure clean state
    await voiceService.leave(voiceChannelId, ownerId);

    await voiceService.join(serverId, voiceChannelId, ownerId);
    let users = await voiceService.getUsers(voiceChannelId);
    expect(users.length).toBe(1);
    expect(users[0].userId).toBe(ownerId);
    expect(users[0].channelId).toBe(voiceChannelId);

    await voiceService.leave(voiceChannelId, ownerId);
    users = await voiceService.getUsers(voiceChannelId);
    expect(users.length).toBe(0);
  });

  // Test 7: disconnect clears voice state
  it("disconnect clears voice state", async () => {
    await voiceService.join(serverId, voiceChannelId, ownerId);
    let users = await voiceService.getUsers(voiceChannelId);
    expect(users.length).toBe(1);

    await voiceService.handleDisconnect(ownerId);
    users = await voiceService.getUsers(voiceChannelId);
    expect(users.length).toBe(0);
  });

  // Test 8: max 8 users is enforced
  it("max 8 users is enforced", async () => {
    const client = (voiceService as any).redis.getClient();
    const everyoneRole = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });
    const fakeUserIds = Array.from({ length: 8 }, () => crypto.randomUUID());
    let extraId: string | undefined;

    try {
      for (const uid of fakeUserIds) {
        const h = await argon2.hash("fakepass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
        await prisma.client.user.create({
          data: { id: uid, email: `${uid}@fake.com`, username: `fake-${uid.slice(0, 4)}`, displayName: "Fake", passwordHash: h },
        });
        const mem = await prisma.client.member.create({ data: { serverId, userId: uid } });
        if (everyoneRole) {
          await prisma.client.memberRole.create({ data: { memberId: mem.id, roleId: everyoneRole.id } });
        }
        const entry = JSON.stringify({
          userId: uid, channelId: voiceChannelId, serverId,
          isMuted: false, isDeafened: false, joinedAt: Date.now(),
        });
        await client.set(`voice:${voiceChannelId}:${uid}`, entry);
        await client.sadd(`voice:channel:${voiceChannelId}:members`, uid);
      }

      extraId = crypto.randomUUID();
      const eh = await argon2.hash("extrapass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
      await prisma.client.user.create({
        data: { id: extraId, email: `${extraId}@extra.com`, username: `extra-${extraId.slice(0, 4)}`, displayName: "Extra", passwordHash: eh },
      });
      const extraMem = await prisma.client.member.create({ data: { serverId, userId: extraId } });
      if (everyoneRole) {
        await prisma.client.memberRole.create({ data: { memberId: extraMem.id, roleId: everyoneRole.id } });
      }

      try {
        await voiceService.validateJoin(serverId, voiceChannelId, extraId);
        fail("Expected validateJoin to throw");
      } catch (e: any) {
        expect(e.response?.error?.code).toBe("CHANNEL_FULL");
      }
    } finally {
      const allIds = extraId ? [...fakeUserIds, extraId] : fakeUserIds;
      for (const uid of allIds) {
        try { await client.del(`voice:${voiceChannelId}:${uid}`); } catch { /* */ }
        try { await client.srem(`voice:channel:${voiceChannelId}:members`, uid); } catch { /* */ }
      }
    }
  });

  // Test 9: signaling events are isolated per voice channel
  it("voice state is isolated per channel", async () => {
    // Create a second voice channel
    const ch2 = await prisma.client.channel.create({
      data: { serverId, type: "VOICE", name: "Channel2", position: 2 },
    });

    // Join owner to channel ch2 (not voiceChannelId)
    await voiceService.join(serverId, ch2.id, ownerId);

    // Owner should only be visible in ch2
    const usersCh2 = await voiceService.getUsers(ch2.id);
    expect(usersCh2.length).toBe(1);
    expect(usersCh2[0].userId).toBe(ownerId);

    // Owner should NOT be visible in voiceChannelId
    const usersCh1 = await voiceService.getUsers(voiceChannelId);
    expect(usersCh1.length).toBe(0);

    // Clean up
    await voiceService.leave(ch2.id, ownerId);

    // Create a third user and verify isolation
    const hash = await argon2.hash("zpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u3 = await prisma.client.user.create({ data: { email: "z@z.com", username: "zuser", displayName: "Z", passwordHash: hash } });
    const u3mem = await prisma.client.member.create({ data: { serverId, userId: u3.id } });
    const everyoneRole2 = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });
    if (everyoneRole2) {
      await prisma.client.memberRole.create({ data: { memberId: u3mem.id, roleId: everyoneRole2.id } });
    }

    // Join two users to different channels
    await voiceService.join(serverId, voiceChannelId, u3.id);
    await voiceService.join(serverId, ch2.id, ownerId);

    const ch1Users = await voiceService.getUsers(voiceChannelId);
    const ch2Users = await voiceService.getUsers(ch2.id);

    expect(ch1Users.length).toBe(1); // only zuser in ch1
    expect(ch2Users.length).toBe(1); // only owner in ch2
    expect(ch1Users[0].userId).toBe(u3.id);
    expect(ch2Users[0].userId).toBe(ownerId);

    // Clean up
    await voiceService.leave(voiceChannelId, u3.id);
    await voiceService.leave(ch2.id, ownerId);
  });
});
