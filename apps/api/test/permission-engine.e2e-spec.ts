import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  ALL_SERVER_PERMISSIONS,
  PermissionService,
  PERMISSIONS,
} from "../src/server/guards/permission.service";
import { cleanDatabase } from "./helpers";

interface Session {
  cookies: string[];
  csrf: string;
}

function extractCsrf(cookies: string[]): string {
  return cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split(";")[0].split("=")[1] ?? "";
}

describe("F.3.5A canonical permission engine (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permissions: PermissionService;

  let serverId: string;
  let serverBId: string;
  let restrictedServerId: string;
  let channelId: string;

  const userIds: Record<string, string> = {};
  const memberIds: Record<string, string> = {};
  const roleIds: Record<string, string> = {};
  const sessions: Record<string, Session> = {};
  let createdRoleMetadata: Record<string, { id: string; createdAt: Date }> = {};

  const password = "permission-engine-password";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);
    permissions = app.get(PermissionService);
    await cleanDatabase(prisma);

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 2,
    });
    const names = ["owner", "admin", "high", "peer-a", "peer-b", "low", "multi", "ordinary", "banned", "outsider"];
    for (const name of names) {
      const user = await prisma.client.user.create({
        data: {
          email: `${name}@permission.test`,
          username: `perm-${name}`,
          displayName: name,
          passwordHash,
        },
      });
      userIds[name] = user.id;
    }

    const server = await prisma.client.server.create({
      data: { name: "Permission Engine", ownerId: userIds.owner },
    });
    serverId = server.id;

    for (const name of names.filter((name) => name !== "outsider")) {
      const member = await prisma.client.member.create({
        data: { serverId, userId: userIds[name], isBanned: name === "banned" },
      });
      memberIds[name] = member.id;
    }

    const everyone = await prisma.client.role.create({
      data: {
        serverId,
        name: "@everyone",
        permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.READ_MESSAGE_HISTORY,
        position: 0,
        isDefault: true,
      },
    });
    roleIds.everyone = everyone.id;

    const roleDefinitions = [
      { key: "admin", name: "Admin", position: 100, permissions: PERMISSIONS.ADMINISTRATOR },
      {
        key: "high",
        name: "High Moderator",
        position: 80,
        permissions:
          PERMISSIONS.MANAGE_ROLES |
          PERMISSIONS.KICK_MEMBERS |
          PERMISSIONS.BAN_MEMBERS |
          PERMISSIONS.MANAGE_CHANNELS |
          PERMISSIONS.CREATE_INVITE |
          PERMISSIONS.SEND_MESSAGES |
          PERMISSIONS.ATTACH_FILES,
      },
      { key: "peer-a", name: "Peer A", position: 60, permissions: PERMISSIONS.MANAGE_ROLES | PERMISSIONS.KICK_MEMBERS | PERMISSIONS.BAN_MEMBERS },
      { key: "peer-b", name: "Peer B", position: 60, permissions: PERMISSIONS.MANAGE_ROLES },
      { key: "target", name: "Target Role", position: 40, permissions: PERMISSIONS.SEND_MESSAGES },
      { key: "union-b", name: "Union B", position: 30, permissions: PERMISSIONS.CREATE_INVITE },
      { key: "union-a", name: "Union A", position: 20, permissions: PERMISSIONS.ATTACH_FILES },
      { key: "ephemeral", name: "Ephemeral", position: 15, permissions: PERMISSIONS.ATTACH_FILES },
      { key: "low", name: "Low", position: 10, permissions: PERMISSIONS.SEND_MESSAGES },
      { key: "ordinary", name: "Ordinary", position: 5, permissions: 0n },
    ];

    const createdRoles: Record<string, { id: string; createdAt: Date }> = {};
    for (const definition of roleDefinitions) {
      const role = await prisma.client.role.create({
        data: {
          serverId,
          name: definition.name,
          position: definition.position,
          permissions: definition.permissions,
        },
      });
      roleIds[definition.key] = role.id;
      createdRoles[definition.key] = { id: role.id, createdAt: role.createdAt };
    }

    for (const [memberName, roleNames] of Object.entries({
      admin: ["admin"],
      high: ["high"],
      "peer-a": ["peer-a"],
      "peer-b": ["peer-b"],
      low: ["low"],
      multi: ["ordinary", "union-a", "union-b"],
      ordinary: ["ordinary"],
      banned: ["low"],
    })) {
      for (const roleName of roleNames) {
        await prisma.client.memberRole.create({
          data: { memberId: memberIds[memberName], roleId: roleIds[roleName] },
        });
      }
    }

    channelId = (await prisma.client.channel.create({
      data: { serverId, name: "general", type: "TEXT", position: 0 },
    })).id;

    const serverB = await prisma.client.server.create({
      data: { name: "Isolated Server", ownerId: userIds.owner },
    });
    serverBId = serverB.id;
    const memberB = await prisma.client.member.create({
      data: { serverId: serverBId, userId: userIds.ordinary },
    });
    await prisma.client.role.create({
      data: { serverId: serverBId, name: "@everyone", position: 0, permissions: 0n, isDefault: true },
    });
    // The schema cannot express same-server integrity for this join. The engine must ignore it.
    await prisma.client.memberRole.create({ data: { memberId: memberB.id, roleId: roleIds.admin } });

    const restrictedServer = await prisma.client.server.create({
      data: { name: "No View", ownerId: userIds.owner },
    });
    restrictedServerId = restrictedServer.id;
    await prisma.client.member.create({ data: { serverId: restrictedServerId, userId: userIds.ordinary } });
    await prisma.client.role.create({
      data: { serverId: restrictedServerId, name: "@everyone", position: 0, permissions: 0n, isDefault: true },
    });
    await prisma.client.channel.create({
      data: { serverId: restrictedServerId, name: "hidden", type: "TEXT", position: 0 },
    });

    for (const name of ["owner", "admin", "high", "peer-a", "low", "ordinary", "banned", "outsider"]) {
      const login = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: `${name}@permission.test`, password })
        .expect(201);
      sessions[name] = { cookies: login.headers["set-cookie"], csrf: extractCsrf(login.headers["set-cookie"]) };
    }

    // Retain actual creation metadata for deterministic tie assertions.
    createdRoleMetadata = createdRoles;
  }, 30000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  function mutation(name: string, method: "post" | "put" | "patch" | "delete", path: string, body?: unknown) {
    const call = request(app.getHttpServer())[method](path)
      .set("Cookie", sessions[name].cookies)
      .set("X-CSRF-Token", sessions[name].csrf);
    return body === undefined ? call : call.send(body);
  }

  it("PERM-01: server owner has every effective server permission", async () => {
    expect(await permissions.getServerPermissions(serverId, userIds.owner)).toBe(ALL_SERVER_PERMISSIONS);
  });

  it("PERM-02: owner authorization does not rely on an Admin role", async () => {
    await prisma.client.memberRole.deleteMany({ where: { memberId: memberIds.owner } });
    expect(await permissions.hasServerPermission(serverId, userIds.owner, PERMISSIONS.MANAGE_SERVER)).toBe(true);
    await mutation("owner", "patch", `/api/v1/servers/${serverId}`, { description: "owner-authorized" }).expect(200);
  });

  it("PERM-03: @everyone permissions apply without a MemberRole row", async () => {
    const effective = await permissions.getServerPermissions(serverId, userIds.ordinary);
    expect(effective & PERMISSIONS.VIEW_CHANNEL).toBe(PERMISSIONS.VIEW_CHANNEL);
    expect(effective & PERMISSIONS.READ_MESSAGE_HISTORY).toBe(PERMISSIONS.READ_MESSAGE_HISTORY);
  });

  it("PERM-04: multiple assigned roles aggregate by union", async () => {
    const effective = await permissions.getServerPermissions(serverId, userIds.multi);
    expect(effective & PERMISSIONS.ATTACH_FILES).toBe(PERMISSIONS.ATTACH_FILES);
    expect(effective & PERMISSIONS.CREATE_INVITE).toBe(PERMISSIONS.CREATE_INVITE);
  });

  it("PERM-05: role ordering does not invent missing permissions", async () => {
    const effective = await permissions.getServerPermissions(serverId, userIds.multi);
    expect(effective & PERMISSIONS.MANAGE_SERVER).toBe(0n);
    expect(effective & PERMISSIONS.BAN_MEMBERS).toBe(0n);
  });

  it("PERM-06: Administrator expands to the complete server catalog", async () => {
    expect(await permissions.getServerPermissions(serverId, userIds.admin)).toBe(ALL_SERVER_PERMISSIONS);
  });

  it("PERM-07: an ordinary role cannot bypass checks", async () => {
    expect(await permissions.hasServerPermission(serverId, userIds.ordinary, PERMISSIONS.MANAGE_CHANNELS)).toBe(false);
    await mutation("ordinary", "post", `/api/v1/servers/${serverId}/channels`, { name: "not-allowed" }).expect(403);
  });

  it("PERM-08: a manager cannot modify a higher role", async () => {
    await mutation("high", "patch", `/api/v1/servers/${serverId}/roles/${roleIds.admin}`, { name: "Compromised" }).expect(403);
  });

  it("PERM-09: equal-position roles are mutually protected", async () => {
    await mutation("peer-a", "patch", `/api/v1/servers/${serverId}/roles/${roleIds["peer-b"]}`, { name: "Peer Compromised" }).expect(403);
  });

  it("PERM-10: a manager cannot assign an equal-or-higher role", async () => {
    await mutation("high", "put", `/api/v1/servers/${serverId}/members/${memberIds.low}/roles/${roleIds.admin}`, {}).expect(403);
  });

  it("PERM-11: create, edit, and self-assignment escalation paths are blocked", async () => {
    await mutation("high", "post", `/api/v1/servers/${serverId}/roles`, {
      name: "Escalated Create",
      position: 70,
      permissions: PERMISSIONS.ADMINISTRATOR.toString(),
    }).expect(403);
    await mutation("high", "post", `/api/v1/servers/${serverId}/roles`, {
      name: "Equal Create",
      position: 80,
      permissions: "0",
    }).expect(403);
    await mutation("high", "patch", `/api/v1/servers/${serverId}/roles/${roleIds.target}`, {
      permissions: (PERMISSIONS.SEND_MESSAGES | PERMISSIONS.ADMINISTRATOR).toString(),
    }).expect(403);
    await mutation("high", "put", `/api/v1/servers/${serverId}/members/${memberIds.high}/roles/${roleIds.target}`, {}).expect(403);
  });

  it("PERM-12: non-owners cannot administratively affect the server owner", async () => {
    await mutation("high", "put", `/api/v1/servers/${serverId}/members/${memberIds.owner}/roles/${roleIds.target}`, {}).expect(403);
    await mutation("high", "delete", `/api/v1/servers/${serverId}/members/${memberIds.owner}`).expect(403);
  });

  it("PERM-13: KICK_MEMBERS cannot target a higher-ranked member", async () => {
    await mutation("high", "delete", `/api/v1/servers/${serverId}/members/${memberIds.admin}`).expect(403);
  });

  it("PERM-14: BAN_MEMBERS cannot target a higher-ranked member", async () => {
    await mutation("high", "post", `/api/v1/servers/${serverId}/members/${memberIds.admin}/ban`, {}).expect(403);
  });

  it("PERM-15: a higher authorized moderator can manage a lower member and role", async () => {
    await mutation("high", "patch", `/api/v1/servers/${serverId}/roles/${roleIds.target}`, { name: "Managed Target" }).expect(200);
    await mutation("high", "patch", `/api/v1/servers/${serverId}/members/${memberIds.low}`, { nickname: "managed" }).expect(200);
    await mutation("high", "put", `/api/v1/servers/${serverId}/members/${memberIds.low}/roles/${roleIds.target}`, {}).expect(200);
  });

  it("PERM-16: role removal immediately recomputes permissions", async () => {
    await mutation("high", "put", `/api/v1/servers/${serverId}/members/${memberIds.low}/roles/${roleIds.ephemeral}`, {}).expect(200);
    expect(await permissions.hasServerPermission(serverId, userIds.low, PERMISSIONS.ATTACH_FILES)).toBe(true);
    await mutation("high", "delete", `/api/v1/servers/${serverId}/members/${memberIds.low}/roles/${roleIds.ephemeral}`).expect(200);
    expect(await permissions.hasServerPermission(serverId, userIds.low, PERMISSIONS.ATTACH_FILES)).toBe(false);
  });

  it("PERM-17: equal-position highest-role resolution is deterministic", async () => {
    await prisma.client.memberRole.createMany({
      data: [
        { memberId: memberIds.multi, roleId: roleIds["peer-a"] },
        { memberId: memberIds.multi, roleId: roleIds["peer-b"] },
      ],
      skipDuplicates: true,
    });
    const expected = [createdRoleMetadata["peer-a"], createdRoleMetadata["peer-b"]].sort((left, right) => {
      const created = left.createdAt.getTime() - right.createdAt.getTime();
      return created || left.id.localeCompare(right.id);
    })[0].id;
    expect((await permissions.getHighestRole(serverId, userIds.multi))?.id).toBe(expected);
    expect((await permissions.getHighestRole(serverId, userIds.multi))?.id).toBe(expected);
  });

  it("PERM-18: a cross-server MemberRole link grants no authority", async () => {
    expect(await permissions.getServerPermissions(serverBId, userIds.ordinary)).toBe(0n);
    expect(await permissions.hasServerPermission(serverBId, userIds.ordinary, PERMISSIONS.ADMINISTRATOR)).toBe(false);
  });

  it("PERM-19: non-members receive no server authorization", async () => {
    expect(await permissions.getServerPermissions(serverId, userIds.outsider)).toBe(0n);
    await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}`)
      .set("Cookie", sessions.outsider.cookies)
      .expect(404);
  });

  it("PERM-20: banned members receive no permissions or server access", async () => {
    expect(await permissions.getServerPermissions(serverId, userIds.banned)).toBe(0n);
    await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", sessions.banned.cookies)
      .expect(404);
  });

  it("PERM-21: channel creation remains permission-authoritative", async () => {
    await mutation("high", "post", `/api/v1/servers/${serverId}/channels`, { name: "authorized-create" }).expect(201);
    await mutation("low", "post", `/api/v1/servers/${serverId}/channels`, { name: "unauthorized-create" }).expect(403);
  });

  it("PERM-22: channel listing remains permission-authoritative without a server VIEW_CHANNEL pre-gate", async () => {
    const visibleList = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", sessions.low.cookies)
      .expect(200);
    expect(visibleList.body.some((channel: { id: string }) => channel.id === channelId)).toBe(true);
    const restrictedList = await request(app.getHttpServer())
      .get(`/api/v1/servers/${restrictedServerId}/channels`)
      .set("Cookie", sessions.ordinary.cookies)
      .expect(200);
    expect(restrictedList.body).toEqual([]);
  });

  it("PERM-25: fresh requests derive permissions from database state, not client state", async () => {
    const before = await request(app.getHttpServer())
      .get("/api/v1/users/@me/servers")
      .set("Cookie", sessions.high.cookies)
      .expect(200);
    const listed = before.body.find((server: { id: string }) => server.id === serverId);
    expect(BigInt(listed.effectivePermissions) & PERMISSIONS.MANAGE_CHANNELS).toBe(PERMISSIONS.MANAGE_CHANNELS);

    await prisma.client.memberRole.delete({
      where: { memberId_roleId: { memberId: memberIds.high, roleId: roleIds.high } },
    });
    expect(await permissions.hasServerPermission(serverId, userIds.high, PERMISSIONS.MANAGE_CHANNELS)).toBe(false);
    await mutation("high", "post", `/api/v1/servers/${serverId}/channels`, { name: "stale-client-state" }).expect(403);
  });
});
