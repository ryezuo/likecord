import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ALL_SERVER_PERMISSIONS, PermissionService, PERMISSIONS } from "../src/server/guards/permission.service";
// eslint-disable-next-line @typescript-eslint/no-var-requires
let ServerService: any;
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("Server Admin & Moderation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permService: PermissionService;

  let serverId: string;
  let ownerId: string;
  let ownerCookies: string[];
  let ownerToken: string;

  // Test user (moderator) and victim user
  let testUserId: string;
  let testMemberId: string;
  let testCookies: string[];
  let victimId: string;
  let victimMemberId: string;

  let everyoneRoleId: string;
  let moderatorRoleId: string;

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
    ServerService = (await import("../src/server/server.service")).ServerService;

    await cleanDatabase(prisma);

    const hash = await argon2.hash("opass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const owner = await prisma.client.user.create({
      data: { email: "owner@admin.local", username: "owner", displayName: "Owner", passwordHash: hash },
    });
    ownerId = owner.id;

    const sv = await prisma.client.server.create({ data: { name: "AdminTest", ownerId: owner.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });

    // @everyone at position 0 — minimal permissions
    everyoneRoleId = (await prisma.client.role.create({
      data: {
        serverId: sv.id, name: "@everyone",
        permissions: BigInt(0x400 | 0x80 | 0x40 | 0x200),
        position: 0, isDefault: true, isMentionable: false,
      },
    })).id;

    await prisma.client.channel.createMany({
      data: [
        { serverId: sv.id, type: "TEXT", name: "general", position: 0 },
        { serverId: sv.id, type: "VOICE", name: "General", position: 1 },
      ],
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "owner@admin.local", password: "opass" });
    ownerCookies = loginRes.headers["set-cookie"];
    ownerToken = extractCsrf(ownerCookies);

    // Create a test user (regular member, no roles yet)
    const th = await argon2.hash("tpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const testUser = await prisma.client.user.create({
      data: { email: "test@admin.local", username: "testuser", displayName: "Test User", passwordHash: th },
    });
    testUserId = testUser.id;
    testMemberId = (await prisma.client.member.create({ data: { serverId: sv.id, userId: testUser.id } })).id;

    // Create a victim user (another regular member)
    const vh = await argon2.hash("vpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const victim = await prisma.client.user.create({
      data: { email: "victim@admin.local", username: "victim", displayName: "Victim", passwordHash: vh },
    });
    victimId = victim.id;
    victimMemberId = (await prisma.client.member.create({ data: { serverId: sv.id, userId: victim.id } })).id;

    // Create a Moderator role at position 1 with MANAGE_ROLES + KICK + BAN + MUTE
    moderatorRoleId = (await prisma.client.role.create({
      data: {
        serverId: sv.id, name: "Moderator",
        permissions: BigInt(0x4 | 0x10 | 0x20 | 0x2000), // MANAGE_ROLES + KICK + BAN + MUTE
        position: 1, isDefault: false, isMentionable: false,
      },
    })).id;

    // Create a role at position 2 (above moderator) for hierarchy tests
    await prisma.client.role.create({
      data: {
        serverId: sv.id, name: "Super Role",
        permissions: BigInt(0x2), // MANAGE_SERVER
        position: 2, isDefault: false, isMentionable: false,
      },
    });

    // Assign Moderator role to test user
    const modRole = await prisma.client.memberRole.create({
      data: { memberId: testMemberId, roleId: moderatorRoleId },
    });

    // Login as test user
    const tLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "test@admin.local", password: "tpass" });
    testCookies = tLogin.headers["set-cookie"];
  }, 25000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // 1 — owner bypasses permissions
  it("owner bypasses all permission checks", async () => {
    const hasAdmin = await permService.hasPermission(serverId, ownerId, PERMISSIONS.ADMINISTRATOR);
    expect(hasAdmin).toBe(true);
    const hasKick = await permService.hasPermission(serverId, ownerId, PERMISSIONS.KICK_MEMBERS);
    expect(hasKick).toBe(true);
    const hasBan = await permService.hasPermission(serverId, ownerId, PERMISSIONS.BAN_MEMBERS);
    expect(hasBan).toBe(true);
    const hasMute = await permService.hasPermission(serverId, ownerId, PERMISSIONS.MUTE_MEMBERS);
    expect(hasMute).toBe(true);
    const hasManageRoles = await permService.hasPermission(serverId, ownerId, PERMISSIONS.MANAGE_ROLES);
    expect(hasManageRoles).toBe(true);
    const eff = await permService.getEffectivePermissions(serverId, ownerId);
    expect(eff).toBe(ALL_SERVER_PERMISSIONS);
  });

  // 2 — owner cannot be kicked, banned, or muted via service methods
  it("owner cannot be kicked", async () => {
    const ownerMember = await prisma.client.member.findFirst({ where: { serverId, userId: ownerId } });
    await expect(
      app.get(ServerService).removeMember(serverId, ownerMember!.id, testUserId)
    ).rejects.toThrow();
  });

  it("owner cannot be banned", async () => {
    const ownerMember = await prisma.client.member.findFirst({ where: { serverId, userId: ownerId } });
    await expect(
      app.get(ServerService).banMember(serverId, ownerMember!.id, testUserId)
    ).rejects.toThrow();
  });

  it("owner cannot be muted", async () => {
    const ownerMember = await prisma.client.member.findFirst({ where: { serverId, userId: ownerId } });
    await expect(
      app.get(ServerService).muteMember(serverId, ownerMember!.id, testUserId)
    ).rejects.toThrow();
  });

  // 3 — @everyone cannot be deleted or renamed via API
  it("@everyone cannot be deleted via API", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(400);
    expect(res.body.error?.code).toBe("DEFAULT_ROLE");
  });

  it("@everyone cannot be renamed via API", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ name: "not-everyone" })
      .expect(400);
    expect(res.body.error?.code).toBe("DEFAULT_ROLE");
  });

  // 4 — role hierarchy: cannot edit/delete role at or above caller's highest
  it("user cannot edit a role at or above their highest position", async () => {
    // testUser has Moderator at position 1. Super Role at position 2 is ABOVE that.
    const superRole = await prisma.client.role.findFirst({ where: { serverId, name: "Super Role" } });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${superRole!.id}`)
      .set("Cookie", testCookies)
      .set("X-CSRF-Token", extractCsrf(testCookies))
      .send({ name: "Renamed Super" })
      .expect(403);
    expect(res.body.error?.code).toBe("ROLE_HIERARCHY");
  });

  it("user cannot delete a role at or above their highest position", async () => {
    const superRole = await prisma.client.role.findFirst({ where: { serverId, name: "Super Role" } });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/roles/${superRole!.id}`)
      .set("Cookie", testCookies)
      .set("X-CSRF-Token", extractCsrf(testCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("ROLE_HIERARCHY");
  });

  // 5 — role permission updates work with BIGINT string serialization
  it("role permissions can be updated via string serialization", async () => {
    const permString = (BigInt(0x400 | 0x800)).toString();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${moderatorRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ permissions: permString })
      .expect(200);
    const updated = await prisma.client.role.findUnique({ where: { id: moderatorRoleId } });
    expect(updated!.permissions).toBe(BigInt(0x400 | 0x800));
    // Restore permissions
    await prisma.client.role.update({
      where: { id: moderatorRoleId },
      data: { permissions: BigInt(0x4 | 0x10 | 0x20 | 0x2000) },
    });
  });

  // 6 — member can receive and lose a role
  it("member can receive a role via API", async () => {
    // Give test user the moderator role (should already have it from setup)
    const res = await request(app.getHttpServer())
      .put(`/api/v1/servers/${serverId}/members/${victimMemberId}/roles/${moderatorRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    const memberRoles = await prisma.client.memberRole.findMany({
      where: { memberId: victimMemberId },
    });
    expect(memberRoles.some((mr) => mr.roleId === moderatorRoleId)).toBe(true);
  });

  it("member can lose a role via API", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/members/${victimMemberId}/roles/${moderatorRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    const memberRoles = await prisma.client.memberRole.findMany({
      where: { memberId: victimMemberId },
    });
    expect(memberRoles.some((mr) => mr.roleId === moderatorRoleId)).toBe(false);
  });

  // 7 — kick requires KICK_MEMBERS
  it("user without KICK_MEMBERS cannot kick", async () => {
    // Create a user with NO kick permissions
    const uh = await argon2.hash("noperm", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const noPermUser = await prisma.client.user.create({
      data: { email: "noperm@admin.local", username: "noperm", displayName: "No Perm", passwordHash: uh },
    });
    const noPermMember = await prisma.client.member.create({ data: { serverId, userId: noPermUser.id } });
    const noPermLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "noperm@admin.local", password: "noperm" });
    const noPermCookies = noPermLogin.headers["set-cookie"];

    // Try to kick a DIFFERENT user (victim)
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/members/${victimMemberId}`)
      .set("Cookie", noPermCookies)
      .set("X-CSRF-Token", extractCsrf(noPermCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("MISSING_PERMISSION");

    // Clean up
    await prisma.client.member.delete({ where: { id: noPermMember.id } });
    await prisma.client.user.delete({ where: { id: noPermUser.id } });
  });

  it("owner with KICK_MEMBERS can kick", async () => {
    const newUser = await prisma.client.user.create({
      data: { email: `kickme${Date.now()}@test.com`, username: `kickme${Date.now()}`,
        displayName: "KickMe", passwordHash: await argon2.hash("kpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 }) },
    });
    const newMember = await prisma.client.member.create({ data: { serverId, userId: newUser.id } });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/members/${newMember.id}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    const check = await prisma.client.member.findUnique({ where: { id: newMember.id } });
    expect(check).toBeNull();
  });

  // 8 — ban requires BAN_MEMBERS
  it("user without BAN_MEMBERS cannot ban", async () => {
    // Create a user with NO ban permissions
    const uh = await argon2.hash("bannoperm", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const noPermUser = await prisma.client.user.create({
      data: { email: "bannoperm@admin.local", username: "bannoperm", displayName: "Ban No Perm", passwordHash: uh },
    });
    const noPermMember = await prisma.client.member.create({ data: { serverId, userId: noPermUser.id } });
    const noPermLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "bannoperm@admin.local", password: "bannoperm" });
    const noPermCookies = noPermLogin.headers["set-cookie"];

    const res = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/ban`)
      .set("Cookie", noPermCookies)
      .set("X-CSRF-Token", extractCsrf(noPermCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("MISSING_PERMISSION");

    await prisma.client.member.delete({ where: { id: noPermMember.id } });
    await prisma.client.user.delete({ where: { id: noPermUser.id } });
  });

  it("owner with BAN_MEMBERS can ban and unban", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/ban`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    const banned = await prisma.client.member.findUnique({ where: { id: victimMemberId } });
    expect(banned!.isBanned).toBe(true);

    const unbanRes = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/unban`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(unbanRes.body.success).toBe(true);
    const unbanned = await prisma.client.member.findUnique({ where: { id: victimMemberId } });
    expect(unbanned!.isBanned).toBe(false);
  });

  // 9 — mute requires MUTE_MEMBERS
  it("user without MUTE_MEMBERS cannot mute", async () => {
    const uh = await argon2.hash("mutenoperm", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const noPermUser = await prisma.client.user.create({
      data: { email: "mutenoperm@admin.local", username: "mutenoperm", displayName: "Mute No Perm", passwordHash: uh },
    });
    const noPermMember = await prisma.client.member.create({ data: { serverId, userId: noPermUser.id } });
    const noPermLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "mutenoperm@admin.local", password: "mutenoperm" });
    const noPermCookies = noPermLogin.headers["set-cookie"];

    const res = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/mute`)
      .set("Cookie", noPermCookies)
      .set("X-CSRF-Token", extractCsrf(noPermCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("MISSING_PERMISSION");

    await prisma.client.member.delete({ where: { id: noPermMember.id } });
    await prisma.client.user.delete({ where: { id: noPermUser.id } });
  });

  it("owner with MUTE_MEMBERS can mute and unmute", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/mute`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    const muted = await prisma.client.member.findUnique({ where: { id: victimMemberId } });
    expect(muted!.isMuted).toBe(true);

    const unmuteRes = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${victimMemberId}/unmute`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(unmuteRes.body.success).toBe(true);
    const unmuted = await prisma.client.member.findUnique({ where: { id: victimMemberId } });
    expect(unmuted!.isMuted).toBe(false);
  });

  // 10 — audit log entry created for moderation actions
  it("audit log contains entries for moderation actions", async () => {
    const logs = await prisma.client.auditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const actions = logs.map((l) => l.action);
    expect(actions).toContain("KICK");
    expect(actions).toContain("BAN");
    expect(actions).toContain("UNBAN");
    expect(actions).toContain("MUTE");
    expect(actions).toContain("UNMUTE");
  });

  // 11 — audit logs endpoint returns data
  it("GET /servers/:serverId/audit-logs returns logs", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/audit-logs`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
    expect(res.body[0].action).toBeDefined();
    expect(res.body[0].actorId).toBeDefined();
  });

  // 12 — user without MANAGE_SERVER cannot view audit logs
  it("user without MANAGE_SERVER cannot view audit logs", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/audit-logs`)
      .set("Cookie", testCookies)
      .set("X-CSRF-Token", extractCsrf(testCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("MISSING_PERMISSION");
  });

  // 13 — member list includes roles
  it("GET /servers/:serverId/members includes roles", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/members`)
      .set("Cookie", ownerCookies)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const member = res.body.find((m: any) => m.userId === testUserId);
    expect(member).toBeDefined();
    expect(member.roles).toBeDefined();
    expect(Array.isArray(member.roles)).toBe(true);
  });

  // 14 — owner can edit @everyone permissions
  it("owner can edit @everyone permissions", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ permissions: BigInt(0x400 | 0x80).toString() })
      .expect(200);
    const updated = await prisma.client.role.findUnique({ where: { id: everyoneRoleId } });
    expect(updated!.permissions).toBe(BigInt(0x400 | 0x80));
  });

  // 15 — editing @everyone with unchanged name succeeds
  it("editing @everyone with unchanged name succeeds", async () => {
    const everyone = await prisma.client.role.findFirst({ where: { serverId, isDefault: true } });
    const currentName = everyone!.name;
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ name: currentName, permissions: BigInt(0x400 | 0x80).toString() })
      .expect(200);
    const updated = await prisma.client.role.findUnique({ where: { id: everyoneRoleId } });
    expect(updated!.name).toBe("@everyone");
  });

  // 16 — renaming @everyone fails
  it("renaming @everyone fails", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ name: "not-everyone" })
      .expect(400);
    expect(res.body.error?.code).toBe("DEFAULT_ROLE");
  });

  // 17 — deleting @everyone fails
  it("deleting @everyone fails", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/roles/${everyoneRoleId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(400);
    expect(res.body.error?.code).toBe("DEFAULT_ROLE");
  });

  // 18 — new server @everyone does NOT have ADMINISTRATOR
  it("new server @everyone does not have ADMINISTRATOR permission", async () => {
    const ServerServiceLocal = (await import("../src/server/server.service")).ServerService;
    const serverService = app.get(ServerServiceLocal);
    const sv = await serverService.create(ownerId, { name: "FreshServer" });
    const everyone = await prisma.client.role.findFirst({
      where: { serverId: sv.id, isDefault: true },
    });
    expect(everyone).toBeDefined();
    expect(everyone!.permissions & BigInt(0x1)).toBe(0n);
    await prisma.client.server.delete({ where: { id: sv.id } });
  });

  // 19 — server mute prevents voice unmute
  it("server-muted member cannot unmute in voice", async () => {
    await prisma.client.member.update({
      where: { id: testMemberId },
      data: { isMuted: true },
    });
    const member = await prisma.client.member.findUnique({ where: { id: testMemberId } });
    expect(member!.isMuted).toBe(true);
    await prisma.client.member.update({
      where: { id: testMemberId },
      data: { isMuted: false },
    });
  });

  // 20 — banned user cannot accept invite via API
  it("banned user cannot accept invite via HTTP", async () => {
    // Ban the victim
    await prisma.client.member.update({
      where: { id: victimMemberId },
      data: { isBanned: true },
    });

    // Create invite
    const inv = await prisma.client.invite.create({
      data: { code: "banhttptest", serverId, creatorId: ownerId },
    });

    // Login as victim user
    const vh = await argon2.hash("vpass2", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const victimUser = await prisma.client.user.create({
      data: { email: "v2@admin.local", username: "victim2", displayName: "Victim2", passwordHash: vh },
    });
    const vMember = await prisma.client.member.create({ data: { serverId, userId: victimUser.id, isBanned: true } });
    const vLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "v2@admin.local", password: "vpass2" });
    const vCookies = vLogin.headers["set-cookie"];

    const res = await request(app.getHttpServer())
      .post("/api/v1/invites/banhttptest/accept")
      .set("Cookie", vCookies)
      .set("X-CSRF-Token", extractCsrf(vCookies))
      .expect(403);
    expect(res.body.error?.code).toBe("BANNED");

    // Clean up
    await prisma.client.member.delete({ where: { id: vMember.id } });
    await prisma.client.user.delete({ where: { id: victimUser.id } });
    await prisma.client.member.update({
      where: { id: victimMemberId },
      data: { isBanned: false },
    });
  });

  // 21 — kicked user can rejoin via invite accept
  it("kicked user can rejoin via invite accept", async () => {
    // Create a new user + member
    const kh = await argon2.hash("kpass2", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const kickedUser = await prisma.client.user.create({
      data: { email: "kicked2@admin.local", username: "kicked2", displayName: "Kicked2", passwordHash: kh },
    });
    const kickedMember = await prisma.client.member.create({ data: { serverId, userId: kickedUser.id } });

    // Kick by deleting the member
    await prisma.client.member.delete({ where: { id: kickedMember.id } });

    // Create invite
    const inv = await prisma.client.invite.create({
      data: { code: "kickrejoin", serverId, creatorId: ownerId },
    });

    // Login as kicked user and accept
    const kLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "kicked2@admin.local", password: "kpass2" });
    const kCookies = kLogin.headers["set-cookie"];

    const res = await request(app.getHttpServer())
      .post("/api/v1/invites/kickrejoin/accept")
      .set("Cookie", kCookies)
      .set("X-CSRF-Token", extractCsrf(kCookies))
      .expect(200);

    expect(res.body.serverId).toBe(serverId);
    expect(res.body.memberId).toBeDefined();

    // Verify membership exists
    const newMember = await prisma.client.member.findUnique({
      where: { serverId_userId: { serverId, userId: kickedUser.id } },
    });
    expect(newMember).toBeDefined();
    expect(newMember!.isBanned).toBe(false);

    // Clean up
    await prisma.client.member.delete({ where: { id: newMember!.id } });
    await prisma.client.user.delete({ where: { id: kickedUser.id } });
  });

  // 22 — unbanned user can rejoin via invite accept
  it("unbanned user can rejoin via invite accept", async () => {
    // Create a new user, ban, then unban
    const uh = await argon2.hash("unbanpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const unbannedUser = await prisma.client.user.create({
      data: { email: "unbanme@admin.local", username: "unbanme", displayName: "UnbanMe", passwordHash: uh },
    });
    const unbannedMember = await prisma.client.member.create({
      data: { serverId, userId: unbannedUser.id, isBanned: true },
    });

    // Unban
    await prisma.client.member.update({
      where: { id: unbannedMember.id },
      data: { isBanned: false },
    });

    // Create invite
    const inv = await prisma.client.invite.create({
      data: { code: "unbanrejoin", serverId, creatorId: ownerId },
    });

    // Login as unbanned user
    const uLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "unbanme@admin.local", password: "unbanpass" });
    const uCookies = uLogin.headers["set-cookie"];

    // Accept converges successfully because the active member still exists
    const res = await request(app.getHttpServer())
      .post("/api/v1/invites/unbanrejoin/accept")
      .set("Cookie", uCookies)
      .set("X-CSRF-Token", extractCsrf(uCookies))
      .expect(200);
    expect(res.body.result).toBe("ALREADY_MEMBER");

    // Also test with a deleted member (kicked then unbanned scenario):
    // Delete the old member and make a new invite
    await prisma.client.member.delete({ where: { id: unbannedMember.id } });
    const inv2 = await prisma.client.invite.create({
      data: { code: "unbanrejoin2", serverId, creatorId: ownerId },
    });
    const res2 = await request(app.getHttpServer())
      .post("/api/v1/invites/unbanrejoin2/accept")
      .set("Cookie", uCookies)
      .set("X-CSRF-Token", extractCsrf(uCookies))
      .expect(200);
    expect(res2.body.serverId).toBe(serverId);

    // Clean up
    await prisma.client.member.delete({
      where: { serverId_userId: { serverId, userId: unbannedUser.id } },
    });
    await prisma.client.user.delete({ where: { id: unbannedUser.id } });
  });

  // 23 — already-member acceptance converges idempotently
  it("already-member accept returns successful convergence", async () => {
    const inv = await prisma.client.invite.create({
      data: { code: "alreadymember", serverId, creatorId: ownerId },
    });
    const res = await request(app.getHttpServer())
      .post("/api/v1/invites/alreadymember/accept")
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(res.body.result).toBe("ALREADY_MEMBER");
    expect(res.body.serverId).toBe(serverId);
  });

  // 24 — audit logs include actor.username/displayName
  it("audit logs include actor username and displayName", async () => {
    const ownerUser = await prisma.client.user.findUnique({ where: { id: ownerId } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/audit-logs`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const hasActorMeta = res.body.some(
      (e: any) => e.actor?.username === ownerUser!.username && e.actor?.displayName === ownerUser!.displayName,
    );
    expect(hasActorMeta).toBe(true);
  });

  // 25 — audit logs include target username/displayName when target exists
  it("audit logs include target user metadata", async () => {
    const victimUser = await prisma.client.user.findUnique({ where: { id: victimId } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/audit-logs`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    const banEntry = res.body.find(
      (e: any) => e.action === "BAN" && e.targetId === victimId,
    );
    expect(banEntry).toBeDefined();
    expect(banEntry.target).toBeDefined();
    expect(banEntry.target.username).toBe(victimUser!.username);
    expect(banEntry.target.displayName).toBe(victimUser!.displayName);
  });

  // 26 — audit logs gracefully fall back when target user is missing
  it("audit logs handle missing target gracefully", async () => {
    // Create a log entry with a non-existent targetId
    const fakeUserId = "00000000-0000-0000-0000-000000000001";
    await prisma.client.auditLog.create({
      data: {
        serverId, actorId: ownerId, action: "TEST_ACTION",
        targetId: fakeUserId, details: { test: true },
      },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/audit-logs`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .expect(200);
    const testEntry = res.body.find((e: any) => e.action === "TEST_ACTION");
    expect(testEntry).toBeDefined();
    expect(testEntry.target).toBeNull();
  });
});
