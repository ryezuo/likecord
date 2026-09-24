import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase, createTestAccessSession, testAccessCookie } from "./helpers";

describe("F.5.1 invite entry (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerId: string;
  let serverId: string;
  let passwordHash: string;
  const sessionIds = new Map<string, string>();

  const authCookie = (user: { id: string; email: string; username: string }) => {
    return testAccessCookie(user.id, sessionIds.get(user.id)!, user.email, user.username);
  };

  const createUser = async (suffix: string) => {
    const user = await prisma.client.user.create({ data: {
      email: `${suffix}@invite.test`,
      username: suffix,
      displayName: suffix,
      passwordHash,
    } });
    sessionIds.set(user.id, await createTestAccessSession(prisma, user.id));
    return user;
  };

  const createInvite = async (code: string, data: { maxUses?: number; useCount?: number; isRevoked?: boolean; expiresAt?: Date } = {}) =>
    prisma.client.invite.create({ data: { code, serverId, creatorId: ownerId, ...data } });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    prisma = app.get(PrismaService);
    await cleanDatabase(prisma);
    passwordHash = await argon2.hash("invite-password-9");
    const owner = await createUser("invite_owner");
    ownerId = owner.id;
    const server = await prisma.client.server.create({ data: { name: "Private Garden", ownerId } });
    serverId = server.id;
    await prisma.client.member.create({ data: { serverId, userId: ownerId } });
    await app.init();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it("returns only the anonymous preview allowlist and keeps unavailable invites generic", async () => {
    await createInvite("previewvalid");
    await createInvite("previewrevoked", { isRevoked: true });

    const valid = await request(app.getHttpServer()).get("/api/v1/invites/previewvalid/validate").expect(200);
    expect(valid.body).toEqual({
      inviteStatus: "VALID",
      membershipStatus: "UNAUTHENTICATED",
      serverName: "Private Garden",
    });
    expect(valid.body).not.toHaveProperty("serverId");
    expect(valid.body).not.toHaveProperty("code");

    await request(app.getHttpServer()).get("/api/v1/invites/previewrevoked/validate")
      .expect(200, { inviteStatus: "UNAVAILABLE" });
    await request(app.getHttpServer()).get("/api/v1/invites/does-not-exist/validate")
      .expect(200, { inviteStatus: "UNAVAILABLE" });
  });

  it("returns API-authoritative NOT_MEMBER and ALREADY_MEMBER states", async () => {
    await createInvite("membershipstate");
    const outsider = await createUser("preview_outsider");
    const notMember = await request(app.getHttpServer())
      .get("/api/v1/invites/membershipstate/validate")
      .set("Cookie", authCookie(outsider))
      .expect(200);
    expect(notMember.body).toEqual({
      inviteStatus: "VALID",
      membershipStatus: "NOT_MEMBER",
      serverName: "Private Garden",
    });
    expect(notMember.body.serverId).toBeUndefined();

    const member = await createUser("preview_member");
    await prisma.client.member.create({ data: { serverId, userId: member.id } });
    const already = await request(app.getHttpServer())
      .get("/api/v1/invites/membershipstate/validate")
      .set("Cookie", authCookie(member))
      .expect(200);
    expect(already.body).toMatchObject({ membershipStatus: "ALREADY_MEMBER", serverId, serverName: "Private Garden" });
  });

  it("keeps invite-only registration but creates no membership and consumes no use", async () => {
    await createInvite("registergate");
    const registration = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "registered@invite.test",
        username: "registered_invite",
        password: "registered-password-9",
        inviteCode: "registergate",
      })
      .expect(201);
    const user = await prisma.client.user.findUniqueOrThrow({ where: { id: registration.body.user.id } });
    expect(await prisma.client.member.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: "registergate" } })).useCount).toBe(0);

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "invalid-register@invite.test",
        username: "invalid_register",
        password: "registered-password-9",
        inviteCode: "missing-register-gate",
      })
      .expect(400);
  });

  it("login consumes no invite and explicit acceptance is idempotent", async () => {
    await createInvite("explicitaccept");
    const user = await createUser("explicit_user");
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "invite-password-9" })
      .expect(201);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: "explicitaccept" } })).useCount).toBe(0);

    const first = await request(app.getHttpServer())
      .post("/api/v1/invites/explicitaccept/accept")
      .set("Cookie", authCookie(user))
      .expect(200);
    expect(first.body).toMatchObject({ result: "JOINED", serverId });

    const repeated = await request(app.getHttpServer())
      .post("/api/v1/invites/explicitaccept/accept")
      .set("Cookie", authCookie(user))
      .expect(200);
    expect(repeated.body).toMatchObject({ result: "ALREADY_MEMBER", serverId, memberId: first.body.memberId });
    expect(await prisma.client.member.count({ where: { serverId, userId: user.id } })).toBe(1);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: "explicitaccept" } })).useCount).toBe(1);
  });

  it("converges simultaneous accepts without duplicate membership or use", async () => {
    await createInvite("concurrentone");
    const user = await createUser("concurrent_user");
    const makeAccept = () => request(app.getHttpServer())
      .post("/api/v1/invites/concurrentone/accept")
      .set("Cookie", authCookie(user));
    const responses = await Promise.all([makeAccept(), makeAccept()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    expect(responses.map((response) => response.body.result).sort()).toEqual(["ALREADY_MEMBER", "JOINED"]);
    expect(await prisma.client.member.count({ where: { serverId, userId: user.id } })).toBe(1);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: "concurrentone" } })).useCount).toBe(1);
  });

  it("does not exceed maxUses under simultaneous distinct users", async () => {
    await createInvite("capacityrace", { maxUses: 1 });
    const [firstUser, secondUser] = await Promise.all([createUser("capacity_first"), createUser("capacity_second")]);
    const responses = await Promise.all([firstUser, secondUser].map((user) => request(app.getHttpServer())
      .post("/api/v1/invites/capacityrace/accept")
      .set("Cookie", authCookie(user))));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(await prisma.client.member.count({ where: { serverId, userId: { in: [firstUser.id, secondUser.id] } } })).toBe(1);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: "capacityrace" } })).useCount).toBe(1);
  });

  it.each([
    ["revokedfirst", { isRevoked: true }],
    ["expiredfirst", { expiresAt: new Date(Date.now() - 60_000) }],
    ["exhaustedfirst", { maxUses: 1, useCount: 1 }],
  ])("rejects unavailable first membership transition for %s", async (code, state) => {
    await createInvite(code, state);
    const user = await createUser(`${code}_user`);
    await request(app.getHttpServer()).post(`/api/v1/invites/${code}/accept`)
      .set("Cookie", authCookie(user)).expect(400);
    expect(await prisma.client.member.count({ where: { serverId, userId: user.id } })).toBe(0);
  });

  it("allows an active existing member to open a retained invalid association but denies bans", async () => {
    await createInvite("retainededge", { isRevoked: true });
    const member = await createUser("retained_member");
    await prisma.client.member.create({ data: { serverId, userId: member.id } });
    const preview = await request(app.getHttpServer()).get("/api/v1/invites/retainededge/validate")
      .set("Cookie", authCookie(member)).expect(200);
    expect(preview.body).toMatchObject({ inviteStatus: "UNAVAILABLE", membershipStatus: "ALREADY_MEMBER", serverId });
    const convergence = await request(app.getHttpServer()).post("/api/v1/invites/retainededge/accept")
      .set("Cookie", authCookie(member)).expect(200);
    expect(convergence.body.result).toBe("ALREADY_MEMBER");

    await prisma.client.member.update({
      where: { serverId_userId: { serverId, userId: member.id } },
      data: { isBanned: true },
    });
    await request(app.getHttpServer()).get("/api/v1/invites/retainededge/validate")
      .set("Cookie", authCookie(member)).expect(200, { inviteStatus: "UNAVAILABLE" });
    await request(app.getHttpServer()).post("/api/v1/invites/retainededge/accept")
      .set("Cookie", authCookie(member)).expect(403);
  });

  it("ensures the newest own valid context invite without reusing another creator's invite", async () => {
    await prisma.client.invite.updateMany({ where: { serverId, creatorId: ownerId }, data: { isRevoked: true } });
    const otherCreator = await createUser("ensure_other_creator");
    await prisma.client.invite.create({ data: { code: "othercreator", serverId, creatorId: otherCreator.id } });
    await prisma.client.invite.create({ data: { code: "ensureexpired", serverId, creatorId: ownerId, expiresAt: new Date(Date.now() - 1_000) } });
    const reusable = await prisma.client.invite.create({ data: { code: "ensureown", serverId, creatorId: ownerId, maxUses: 3, useCount: 1 } });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/invites/ensure`)
      .set("Cookie", authCookie({ id: ownerId, email: "invite_owner@invite.test", username: "invite_owner" }))
      .send({})
      .expect(200);

    expect(response.body.id).toBe(reusable.id);
    expect(response.body.code).toBe("ensureown");
  });

  it("creates one default invite when no own valid context invite exists", async () => {
    await prisma.client.invite.updateMany({ where: { serverId, creatorId: ownerId }, data: { isRevoked: true } });
    const before = await prisma.client.invite.count({ where: { serverId, creatorId: ownerId } });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/invites/ensure`)
      .set("Cookie", authCookie({ id: ownerId, email: "invite_owner@invite.test", username: "invite_owner" }))
      .send({})
      .expect(200);
    expect(response.body).toMatchObject({ serverId, creatorId: ownerId, maxUses: null, expiresAt: null, isRevoked: false });
    expect(await prisma.client.invite.count({ where: { serverId, creatorId: ownerId } })).toBe(before + 1);
  });

  it("serializes simultaneous ensure requests to one newly created invite", async () => {
    await prisma.client.invite.updateMany({ where: { serverId, creatorId: ownerId }, data: { isRevoked: true } });
    const cookie = authCookie({ id: ownerId, email: "invite_owner@invite.test", username: "invite_owner" });
    const ensure = () => request(app.getHttpServer()).post(`/api/v1/servers/${serverId}/invites/ensure`).set("Cookie", cookie).send({});
    const [first, second] = await Promise.all([ensure(), ensure()]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(first.body.id).toBe(second.body.id);
    expect(await prisma.client.invite.count({ where: { serverId, creatorId: ownerId, isRevoked: false } })).toBe(1);
  });

  it("requires authentication and CREATE_INVITE for ensure", async () => {
    await request(app.getHttpServer()).post(`/api/v1/servers/${serverId}/invites/ensure`).send({}).expect(401);
    const member = await createUser("ensure_without_permission");
    await prisma.client.member.create({ data: { serverId, userId: member.id } });
    await request(app.getHttpServer()).post(`/api/v1/servers/${serverId}/invites/ensure`)
      .set("Cookie", authCookie(member)).send({}).expect(403);
  });

  it("creates advanced policy and lists newest-first retained history for MANAGE_SERVER", async () => {
    const cookie = authCookie({ id: ownerId, email: "invite_owner@invite.test", username: "invite_owner" });
    const created = await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/invites`)
      .set("Cookie", cookie)
      .send({ expiresInHours: 168, maxUses: 100 })
      .expect(201);
    expect(created.body).toMatchObject({ serverId, creatorId: ownerId, maxUses: 100, useCount: 0, isRevoked: false });
    expect(typeof created.body.createdAt).toBe("string");
    expect(Number.isFinite(Date.parse(created.body.createdAt))).toBe(true);
    expect(typeof created.body.expiresAt).toBe("string");
    expect(Number.isFinite(Date.parse(created.body.expiresAt))).toBe(true);
    const persisted = await prisma.client.invite.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(persisted.expiresAt?.getTime()).toBeGreaterThan(Date.now() + (167 * 3600000));

    await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/invites/${created.body.id}`)
      .set("Cookie", cookie)
      .expect(200, { success: true });

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/invites`)
      .set("Cookie", cookie)
      .expect(200);
    const retained = listed.body.find((invite: { id: string }) => invite.id === created.body.id);
    expect(retained).toMatchObject({ isRevoked: true, maxUses: 100, creator: {
      id: ownerId, username: "invite_owner", displayName: "invite_owner",
    } });
    expect(listed.body[0].id).toBe(created.body.id);
    const createdTimes = listed.body.map((invite: { createdAt: string }) => Date.parse(invite.createdAt));
    expect(createdTimes.every(Number.isFinite)).toBe(true);
    expect(createdTimes).toEqual([...createdTimes].sort((left: number, right: number) => right - left));
  });

  it("preserves CREATE_INVITE creation without granting inventory administration", async () => {
    const user = await createUser("create_only_member");
    const member = await prisma.client.member.create({ data: { serverId, userId: user.id } });
    const role = await prisma.client.role.create({
      data: { serverId, name: "Create Invite Only", position: 1, permissions: 64n },
    });
    await prisma.client.memberRole.create({ data: { memberId: member.id, roleId: role.id } });
    const cookie = authCookie(user);

    await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/invites`)
      .set("Cookie", cookie)
      .send({ maxUses: 5 })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/invites`)
      .set("Cookie", cookie)
      .expect(403);
  });

  it("self-leave is persisted, retry-safe, and forbidden to the owner", async () => {
    const member = await createUser("leave_member");
    await prisma.client.member.create({ data: { serverId, userId: member.id } });
    const leave = () => request(app.getHttpServer()).delete(`/api/v1/servers/${serverId}/members/@me`).set("Cookie", authCookie(member));
    await leave().expect(200, { result: "LEFT", serverId });
    expect(await prisma.client.member.count({ where: { serverId, userId: member.id } })).toBe(0);
    await leave().expect(200, { result: "ALREADY_LEFT", serverId });

    await request(app.getHttpServer()).delete(`/api/v1/servers/${serverId}/members/@me`)
      .set("Cookie", authCookie({ id: ownerId, email: "invite_owner@invite.test", username: "invite_owner" }))
      .expect(403);
    expect(await prisma.client.member.count({ where: { serverId, userId: ownerId } })).toBe(1);
  });
});
