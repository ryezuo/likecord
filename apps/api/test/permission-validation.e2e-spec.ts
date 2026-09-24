import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { io as ioClient, type Socket } from "socket.io-client";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ALL_SERVER_PERMISSIONS, DEFAULT_EVERYONE_PERMISSIONS, PermissionService, PERMISSIONS } from "../src/server/guards/permission.service";
import { cleanDatabase } from "./helpers";

interface Session { cookies: string[]; csrf: string }

function csrf(cookies: string[]): string {
  return cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split(";")[0].split("=")[1] ?? "";
}

describe("F.3.5A-R permission propagation and role validation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permissionService: PermissionService;
  let appPort: number;
  let serverId: string;
  let serverBId: string;
  let bSocket: Socket;
  let assignmentEvent: { serverId: string } | undefined;

  const password = "permission-validation-password";
  const userIds: Record<string, string> = {};
  const memberIds: Record<string, string> = {};
  const roleIds: Record<string, string> = {};
  const sessions: Record<string, Session> = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
    await new Promise<void>((resolve) => {
      const httpServer = app.getHttpServer();
      httpServer.listen(0, () => { appPort = httpServer.address().port; resolve(); });
    });

    prisma = app.get(PrismaService);
    permissionService = app.get(PermissionService);
    await cleanDatabase(prisma);

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    for (const name of ["owner-a", "moderator-b", "member-c", "cofounder-d", "peer-e"]) {
      const user = await prisma.client.user.create({
        data: { email: `${name}@validation.test`, username: name, displayName: name, passwordHash },
      });
      userIds[name] = user.id;
      const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: `${name}@validation.test`, password }).expect(201);
      sessions[name] = { cookies: login.headers["set-cookie"], csrf: csrf(login.headers["set-cookie"]) };
    }

    const created = await mutation("owner-a", "post", "/api/v1/servers", { name: "Validation Server" }).expect(201);
    serverId = created.body.id;
    const ownerMember = await prisma.client.member.findUniqueOrThrow({ where: { serverId_userId: { serverId, userId: userIds["owner-a"] } } });
    memberIds["owner-a"] = ownerMember.id;
    for (const name of ["moderator-b", "member-c", "cofounder-d", "peer-e"]) {
      memberIds[name] = (await prisma.client.member.create({ data: { serverId, userId: userIds[name] } })).id;
    }

    const definitions = [
      { key: "admin", name: "Admin", position: 100, permissions: PERMISSIONS.ADMINISTRATOR },
      { key: "owner-role", name: "Owner", position: 90, permissions: 0n },
      { key: "moderator", name: "Moderator", position: 80, permissions: PERMISSIONS.MANAGE_ROLES | PERMISSIONS.MANAGE_CHANNELS },
      { key: "peer", name: "Peer", position: 80, permissions: PERMISSIONS.MANAGE_ROLES },
      { key: "text-mod", name: "Text Mod", position: 20, permissions: PERMISSIONS.MANAGE_MESSAGES },
      { key: "member", name: "Member", position: 10, permissions: PERMISSIONS.BAN_MEMBERS },
      { key: "low", name: "Low", position: 5, permissions: 0n },
    ];
    for (const definition of definitions) {
      const role = await prisma.client.role.create({ data: { serverId, name: definition.name, position: definition.position, permissions: definition.permissions } });
      roleIds[definition.key] = role.id;
    }
    await prisma.client.memberRole.create({ data: { memberId: memberIds["peer-e"], roleId: roleIds.peer } });

    bSocket = await connect(sessions["moderator-b"].cookies);
  }, 30000);

  afterAll(async () => {
    bSocket?.close();
    await cleanDatabase(prisma);
    await app.close();
  });

  function mutation(name: string, method: "post" | "put" | "patch" | "delete", path: string, body?: unknown) {
    const call = request(app.getHttpServer())[method](path)
      .set("Cookie", sessions[name].cookies)
      .set("X-CSRF-Token", sessions[name].csrf);
    return body === undefined ? call : call.send(body);
  }

  function connect(cookies: string[]): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const accessToken = cookies.find((cookie) => cookie.startsWith("access_token="))?.split(";")[0].split("=")[1] ?? "";
      const client = ioClient(`http://localhost:${appPort}`, {
        path: "/api/v1/ws", transports: ["websocket"], forceNew: true, query: { access_token: accessToken },
      });
      const timer = setTimeout(() => { client.close(); reject(new Error("Timed out connecting permission client")); }, 5000);
      client.once("ws:ready", () => { clearTimeout(timer); resolve(client); });
      client.once("connect_error", (error: Error) => { clearTimeout(timer); client.close(); reject(error); });
    });
  }

  function nextPermissionEvent(client: Socket): Promise<{ serverId: string }> {
    return new Promise((resolve, reject) => {
      const handler = (data: { serverId: string }) => { clearTimeout(timer); client.off("permissions:changed", handler); resolve(data); };
      const timer = setTimeout(() => { client.off("permissions:changed", handler); reject(new Error("Timed out waiting for permissions:changed")); }, 5000);
      client.on("permissions:changed", handler);
    });
  }

  it("PERM-UI-01: a newly generated @everyone never receives Administrator", async () => {
    const everyone = await prisma.client.role.findFirstOrThrow({ where: { serverId, isDefault: true } });
    expect(everyone.permissions).toBe(DEFAULT_EVERYONE_PERMISSIONS);
    expect(everyone.permissions & PERMISSIONS.ADMINISTRATOR).toBe(0n);
  });

  it("PERM-UI-02: an ordinary member receives only the actual @everyone baseline", async () => {
    expect(await permissionService.getServerPermissions(serverId, userIds["member-c"])).toBe(DEFAULT_EVERYONE_PERMISSIONS);
  });

  it("PERM-UI-03: a higher role does not inherit permission bits from a lower role", async () => {
    await prisma.client.memberRole.create({ data: { memberId: memberIds["peer-e"], roleId: roleIds.moderator } });
    const effective = await permissionService.getServerPermissions(serverId, userIds["peer-e"]);
    expect(effective & PERMISSIONS.MANAGE_CHANNELS).toBe(PERMISSIONS.MANAGE_CHANNELS);
    expect(effective & PERMISSIONS.BAN_MEMBERS).toBe(0n);
  });

  it("PERM-UI-04: multiple explicitly assigned roles aggregate", async () => {
    await prisma.client.memberRole.createMany({ data: [
      { memberId: memberIds["member-c"], roleId: roleIds["text-mod"] },
      { memberId: memberIds["member-c"], roleId: roleIds.member },
    ] });
    const effective = await permissionService.getServerPermissions(serverId, userIds["member-c"]);
    expect(effective & PERMISSIONS.MANAGE_MESSAGES).toBe(PERMISSIONS.MANAGE_MESSAGES);
    expect(effective & PERMISSIONS.BAN_MEMBERS).toBe(PERMISSIONS.BAN_MEMBERS);
  });

  it("PERM-UI-05: assigning Moderator persists the correct MemberRole", async () => {
    const event = nextPermissionEvent(bSocket);
    await mutation("owner-a", "put", `/api/v1/servers/${serverId}/members/${memberIds["moderator-b"]}/roles/${roleIds.moderator}`, {}).expect(200);
    assignmentEvent = await event;
    expect(await prisma.client.memberRole.findUnique({ where: { memberId_roleId: { memberId: memberIds["moderator-b"], roleId: roleIds.moderator } } })).not.toBeNull();
  });

  it("PERM-UI-06: authoritative effective permissions change immediately after assignment", async () => {
    expect(await permissionService.hasServerPermission(serverId, userIds["moderator-b"], PERMISSIONS.MANAGE_ROLES)).toBe(true);
  });

  it("PERM-UI-07: connected target receives metadata-minimal permission invalidation", () => {
    expect(assignmentEvent).toEqual({ serverId });
  });

  it("PERM-UI-08: removal emits invalidation and immediately removes capability", async () => {
    const event = nextPermissionEvent(bSocket);
    await mutation("owner-a", "delete", `/api/v1/servers/${serverId}/members/${memberIds["moderator-b"]}/roles/${roleIds.moderator}`).expect(200);
    expect(await event).toEqual({ serverId });
    expect(await permissionService.hasServerPermission(serverId, userIds["moderator-b"], PERMISSIONS.MANAGE_ROLES)).toBe(false);
    await mutation("owner-a", "put", `/api/v1/servers/${serverId}/members/${memberIds["moderator-b"]}/roles/${roleIds.moderator}`, {}).expect(200);
  });

  it("PERM-UI-09: editing a role updates affected connected members", async () => {
    const event = nextPermissionEvent(bSocket);
    const nextMask = PERMISSIONS.MANAGE_ROLES | PERMISSIONS.MANAGE_CHANNELS | PERMISSIONS.BAN_MEMBERS;
    await mutation("owner-a", "patch", `/api/v1/servers/${serverId}/roles/${roleIds.moderator}`, { permissions: nextMask.toString() }).expect(200);
    expect(await event).toEqual({ serverId });
    expect(await permissionService.hasServerPermission(serverId, userIds["moderator-b"], PERMISSIONS.BAN_MEMBERS)).toBe(true);
  });

  it("PERM-UI-12: owner has full administration with zero custom roles", async () => {
    await prisma.client.memberRole.deleteMany({ where: { memberId: memberIds["owner-a"] } });
    expect(await permissionService.getServerPermissions(serverId, userIds["owner-a"])).toBe(ALL_SERVER_PERMISSIONS);
  });

  it("PERM-UI-13/14: Owner-named role is ordinary and may be assigned to multiple users", async () => {
    await mutation("owner-a", "put", `/api/v1/servers/${serverId}/members/${memberIds["owner-a"]}/roles/${roleIds["owner-role"]}`, {}).expect(200);
    await mutation("owner-a", "put", `/api/v1/servers/${serverId}/members/${memberIds["cofounder-d"]}/roles/${roleIds["owner-role"]}`, {}).expect(200);
    expect(await prisma.client.memberRole.count({ where: { roleId: roleIds["owner-role"] } })).toBe(2);
    expect(await permissionService.isOwner(serverId, userIds["cofounder-d"])).toBe(false);
    await mutation("cofounder-d", "delete", `/api/v1/servers/${serverId}`).expect(403);
  });

  it("PERM-UI-16/19: owner can persist a complete normalized custom role order", async () => {
    const order = [roleIds.admin, roleIds["owner-role"], roleIds.moderator, roleIds.peer, roleIds["text-mod"], roleIds.member, roleIds.low];
    const response = await mutation("owner-a", "patch", `/api/v1/servers/${serverId}/roles/order`, { roleIds: order }).expect(200);
    expect(response.body.filter((role: { isDefault: boolean }) => !role.isDefault).map((role: { id: string }) => role.id)).toEqual(order);
    expect(response.body.map((role: { position: number }) => role.position)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
  });

  it("PERM-UI-17: @everyone remains fixed at position zero and is rejected from reorder payload", async () => {
    const everyone = await prisma.client.role.findFirstOrThrow({ where: { serverId, isDefault: true } });
    const customIds = (await prisma.client.role.findMany({ where: { serverId, isDefault: false }, orderBy: { position: "desc" } })).map((role) => role.id);
    await mutation("owner-a", "patch", `/api/v1/servers/${serverId}/roles/order`, { roleIds: [...customIds, everyone.id] }).expect(400);
    expect((await prisma.client.role.findUniqueOrThrow({ where: { id: everyone.id } })).position).toBe(0);
  });

  it("PERM-UI-18: non-owner cannot reorder their own or higher protected role", async () => {
    const current = await prisma.client.role.findMany({ where: { serverId, isDefault: false }, orderBy: [{ position: "desc" }, { createdAt: "asc" }, { id: "asc" }] });
    const order = current.map((role) => role.id);
    const moderatorIndex = order.indexOf(roleIds.moderator);
    [order[moderatorIndex], order[moderatorIndex + 1]] = [order[moderatorIndex + 1], order[moderatorIndex]];
    await mutation("moderator-b", "patch", `/api/v1/servers/${serverId}/roles/order`, { roleIds: order }).expect(403);
  });

  it("PERM-UI-20: role order is deterministic after fresh reads", async () => {
    const first = await request(app.getHttpServer()).get(`/api/v1/servers/${serverId}/roles`).set("Cookie", sessions["owner-a"].cookies).expect(200);
    const second = await request(app.getHttpServer()).get(`/api/v1/servers/${serverId}/roles`).set("Cookie", sessions["owner-a"].cookies).expect(200);
    expect(second.body.map((role: { id: string }) => role.id)).toEqual(first.body.map((role: { id: string }) => role.id));
  });

  it("PERM-UI-21: displaySeparately/hoist persists and @everyone stays unhoisted", async () => {
    await mutation("owner-a", "patch", `/api/v1/servers/${serverId}/roles/${roleIds["owner-role"]}`, { isHoisted: true }).expect(200);
    expect((await prisma.client.role.findUniqueOrThrow({ where: { id: roleIds["owner-role"] } })).isHoisted).toBe(true);
    const everyone = await prisma.client.role.findFirstOrThrow({ where: { serverId, isDefault: true } });
    await mutation("owner-a", "patch", `/api/v1/servers/${serverId}/roles/${everyone.id}`, { isHoisted: true }).expect(400);
    expect((await prisma.client.role.findUniqueOrThrow({ where: { id: everyone.id } })).isHoisted).toBe(false);
  });

  it("PERM-UI-26: backend rejects forged higher role assignment", async () => {
    await mutation("moderator-b", "put", `/api/v1/servers/${serverId}/members/${memberIds["member-c"]}/roles/${roleIds.admin}`, {}).expect(403);
  });

  it("PERM-UI-27: non-owner self-escalation remains impossible", async () => {
    await mutation("moderator-b", "put", `/api/v1/servers/${serverId}/members/${memberIds["moderator-b"]}/roles/${roleIds.low}`, {}).expect(403);
  });

  it("PERM-UI-28: cross-server role membership grants no authority", async () => {
    const serverB = await prisma.client.server.create({ data: { name: "Isolated Validation", ownerId: userIds["owner-a"] } });
    serverBId = serverB.id;
    const member = await prisma.client.member.create({ data: { serverId: serverBId, userId: userIds["member-c"] } });
    await prisma.client.role.create({ data: { serverId: serverBId, name: "@everyone", position: 0, permissions: 0n, isDefault: true } });
    await prisma.client.memberRole.create({ data: { memberId: member.id, roleId: roleIds.admin } });
    expect(await permissionService.getServerPermissions(serverBId, userIds["member-c"])).toBe(0n);
  });
});
