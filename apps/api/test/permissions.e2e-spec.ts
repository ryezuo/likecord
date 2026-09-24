import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PermissionService, PERMISSIONS } from "../src/server/guards/permission.service";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("Invited user permissions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permService: PermissionService;

  let serverId: string;
  let generalId: string;
  let voiceId: string;
  let secondUserId: string;

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
    permService = app.get(PermissionService);

    // Clean slate
    await cleanDatabase(prisma);

    // Create admin + server
    const ah = await argon2.hash("apass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const admin = await prisma.client.user.create({
      data: { email: "admin@perm.local", username: "perm-admin", displayName: "Admin", passwordHash: ah },
    });
    const sv = await prisma.client.server.create({ data: { name: "PermTest", ownerId: admin.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: admin.id } });
    // @everyone — all base perms that a normal user needs
    await prisma.client.role.create({
      data: {
        serverId: sv.id, name: "@everyone",
        permissions: BigInt(0x400 | 0x800 | 0x1000 | 0x200 | 0x80 | 0x40 | 0x1 | 0x2000),
        position: 0, isDefault: true, isMentionable: false,
      },
    });
    generalId = (await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "general", position: 0 } })).id;
    voiceId = (await prisma.client.channel.create({ data: { serverId: sv.id, type: "VOICE", name: "General", position: 1 } })).id;

    // Create an invite (admin page)
    const inv = await prisma.client.invite.create({
      data: { code: "testabcd", serverId: sv.id, creatorId: admin.id },
    });

    // Simulate registration + invite acceptance:
    // A new user registers and immediately accepts the invite
    const uh = await argon2.hash("ipass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const invited = await prisma.client.user.create({
      data: { email: "invited@perm.local", username: "invited-user", displayName: "Invited", passwordHash: uh },
    });
    // Register: create member (matching what auth.service.ts:60 does)
    const member = await prisma.client.member.create({ data: { serverId: sv.id, userId: invited.id } });
    // Note: no member_role for @everyone is created — this matches the real flow
    secondUserId = invited.id;

    // Login as invited user for HTTP tests
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "invited@perm.local", password: "ipass" });
    const invitedCookies = loginRes.headers["set-cookie"];
    const invitedToken = extractCsrf(invitedCookies);

    // (these are used in the tests below via the shared variables)
    (global as any).__invitedCookies = invitedCookies;
    (global as any).__invitedToken = invitedToken;
  }, 25000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // 1 — can list channels via REST
  it("invited user can list server channels", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", (global as any).__invitedCookies)
      .expect(200);
    const names = res.body.map((c: any) => c.name);
    expect(names).toContain("general");
    expect(names).toContain("General");
  });

  // 2 — can list messages
  it("invited user can list messages in general", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/channels/${generalId}/messages?limit=50`)
      .set("Cookie", (global as any).__invitedCookies)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 3 — can send a message
  it("invited user can send a message in general", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/channels/${generalId}/messages`)
      .set("Cookie", (global as any).__invitedCookies)
      .set("X-CSRF-Token", (global as any).__invitedToken)
      .send({ content: "Hello from invited user" })
      .expect(201);
    expect(res.body.message.content).toBe("Hello from invited user");
  });

  // 4 — VIEW_CHANNEL via @everyone
  it("invited user has VIEW_CHANNEL permission", async () => {
    const has = await permService.hasPermission(serverId, secondUserId, PERMISSIONS.VIEW_CHANNEL);
    expect(has).toBe(true);
  });

  // 5 — SEND_MESSAGES via @everyone
  it("invited user has SEND_MESSAGES permission", async () => {
    const has = await permService.hasPermission(serverId, secondUserId, PERMISSIONS.SEND_MESSAGES);
    expect(has).toBe(true);
  });

  // 6 — CONNECT via @everyone
  it("invited user has CONNECT permission", async () => {
    const has = await permService.hasPermission(serverId, secondUserId, PERMISSIONS.CONNECT);
    expect(has).toBe(true);
  });

  // 7 — SPEAK via @everyone
  it("invited user has SPEAK permission", async () => {
    const has = await permService.hasPermission(serverId, secondUserId, PERMISSIONS.SPEAK);
    expect(has).toBe(true);
  });

  // 8 — VoiceService.validateJoin succeeds
  it("invited user can be validated to join voice channel", async () => {
    const { VoiceService } = await import("../src/voice/voice.service");
    const vs = app.get(VoiceService);
    await expect(vs.validateJoin(serverId, voiceId, secondUserId)).resolves.toBeUndefined();
  });

  // 9 — Effective permissions include @everyone
  it("effective permissions include @everyone perms", async () => {
    const everyone = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });
    const eff = await permService.getEffectivePermissions(serverId, secondUserId);
    expect(eff & everyone!.permissions).toBe(everyone!.permissions);
  });

  // 10 — Second invited user (created without @everyone member_role) gets same permissions
  it("second invited user without member_role gets @everyone permissions", async () => {
    const uh = await argon2.hash("spass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const second = await prisma.client.user.create({
      data: { email: "second@perm.local", username: "second-user", displayName: "Second", passwordHash: uh },
    });
    await prisma.client.member.create({ data: { serverId, userId: second.id } });

    const hasView = await permService.hasPermission(serverId, second.id, PERMISSIONS.VIEW_CHANNEL);
    expect(hasView).toBe(true);
    const hasConnect = await permService.hasPermission(serverId, second.id, PERMISSIONS.CONNECT);
    expect(hasConnect).toBe(true);
    const hasSend = await permService.hasPermission(serverId, second.id, PERMISSIONS.SEND_MESSAGES);
    expect(hasSend).toBe(true);
  });
});
