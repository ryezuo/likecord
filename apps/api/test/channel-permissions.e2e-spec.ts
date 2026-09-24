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
import {
  PermissionService,
  PERMISSIONS,
  CHANNEL_OVERRIDE_PERMISSION_MASK,
} from "../src/server/guards/permission.service";
import { VoiceService } from "../src/voice/voice.service";
import { RedisService } from "../src/redis/redis.service";
import { ChannelService } from "../src/channel/channel.service";
import { cleanDatabase } from "./helpers";

function csrf(cookies: string[]): string {
  return cookies.find((cookie) => cookie.startsWith("csrf_token="))?.split(";")[0].split("=")[1] || "";
}

describe("F.3.5B.1 Channel and Category permission engine (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permissions: PermissionService;
  let voice: VoiceService;
  let redis: RedisService;
  let channelsService: ChannelService;
  let port: number;
  let sequence = 0;

  const ids: Record<string, string> = {};
  let ownerCookies: string[];
  let ownerCsrf: string;
  let memberCookies: string[];
  let memberCsrf: string;

  const nextName = (prefix: string) => `${prefix}-${++sequence}`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
    await new Promise<void>((resolve) => {
      app.getHttpServer().listen(0, () => {
        port = app.getHttpServer().address().port;
        resolve();
      });
    });

    prisma = app.get(PrismaService);
    permissions = app.get(PermissionService);
    voice = app.get(VoiceService);
    redis = app.get(RedisService);
    channelsService = app.get(ChannelService);
    await cleanDatabase(prisma);

    const passwordHash = await argon2.hash("channel-permission-password", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 2,
    });
    for (const key of ["owner", "member", "admin", "fakeOwner", "outsider", "secondOwner", "secondMember"]) {
      const user = await prisma.client.user.create({
        data: {
          email: `${key.toLowerCase()}-chperm@test.local`,
          username: `${key.toLowerCase()}-chperm`,
          displayName: key,
          passwordHash,
        },
      });
      ids[`${key}User`] = user.id;
    }
    const server = await prisma.client.server.create({ data: { name: "CHPERM A", ownerId: ids.ownerUser } });
    const secondServer = await prisma.client.server.create({ data: { name: "CHPERM B", ownerId: ids.secondOwnerUser } });
    ids.server = server.id;
    ids.secondServer = secondServer.id;

    for (const key of ["owner", "member", "admin", "fakeOwner"]) {
      const member = await prisma.client.member.create({ data: { serverId: ids.server, userId: ids[`${key}User`] } });
      ids[`${key}Member`] = member.id;
    }
    for (const key of ["secondOwner", "secondMember"]) {
      const member = await prisma.client.member.create({ data: { serverId: ids.secondServer, userId: ids[`${key}User`] } });
      ids[`${key}Member`] = member.id;
    }

    const everyone = await prisma.client.role.create({
      data: { serverId: ids.server, name: "@everyone", position: 0, permissions: 0n, isDefault: true },
    });
    const secondEveryone = await prisma.client.role.create({
      data: { serverId: ids.secondServer, name: "@everyone", position: 0, permissions: 0n, isDefault: true },
    });
    const roleA = await prisma.client.role.create({ data: { serverId: ids.server, name: "Role A", position: 100, permissions: 0n } });
    const roleB = await prisma.client.role.create({ data: { serverId: ids.server, name: "Role B", position: 1, permissions: 0n } });
    const unassigned = await prisma.client.role.create({ data: { serverId: ids.server, name: "Unassigned", position: 999, permissions: 0n } });
    const admin = await prisma.client.role.create({ data: { serverId: ids.server, name: "Admin", position: 2, permissions: PERMISSIONS.ADMINISTRATOR } });
    const namedOwner = await prisma.client.role.create({ data: { serverId: ids.server, name: "Owner", position: 500, permissions: 0n } });
    ids.everyoneRole = everyone.id;
    ids.secondEveryoneRole = secondEveryone.id;
    ids.roleA = roleA.id;
    ids.roleB = roleB.id;
    ids.unassignedRole = unassigned.id;
    ids.adminRole = admin.id;
    ids.namedOwnerRole = namedOwner.id;
    await prisma.client.memberRole.createMany({ data: [
      { memberId: ids.memberMember, roleId: roleA.id },
      { memberId: ids.memberMember, roleId: roleB.id },
      { memberId: ids.adminMember, roleId: admin.id },
      { memberId: ids.fakeOwnerMember, roleId: namedOwner.id },
    ] });

    const [ownerLogin, memberLogin] = await Promise.all([
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "owner-chperm@test.local", password: "channel-permission-password" }),
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "member-chperm@test.local", password: "channel-permission-password" }),
    ]);
    ownerCookies = ownerLogin.headers["set-cookie"];
    ownerCsrf = csrf(ownerCookies);
    memberCookies = memberLogin.headers["set-cookie"];
    memberCsrf = csrf(memberCookies);
  }, 30000);

  beforeEach(async () => {
    await prisma.client.attachment.deleteMany();
    await prisma.client.message.deleteMany();
    await prisma.client.userServerPreference.deleteMany();
    await prisma.client.categoryPermissionOverwrite.deleteMany();
    await prisma.client.channelPermissionOverwrite.deleteMany();
    await prisma.client.channel.deleteMany({ where: { serverId: ids.server } });
    await prisma.client.channelCategory.deleteMany({ where: { serverId: ids.server } });
    await prisma.client.role.update({ where: { id: ids.everyoneRole }, data: { permissions: 0n } });
    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: 0n, position: 100 } });
    await prisma.client.role.update({ where: { id: ids.roleB }, data: { permissions: 0n, position: 1 } });
    await prisma.client.role.update({ where: { id: ids.unassignedRole }, data: { permissions: 0n, position: 999 } });
    await prisma.client.role.update({ where: { id: ids.namedOwnerRole }, data: { permissions: 0n, position: 500 } });
    const client = (redis as any).getClient();
    if (client) await client.flushdb();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  async function setBase(mask: bigint) {
    await prisma.client.role.update({ where: { id: ids.everyoneRole }, data: { permissions: mask } });
  }

  async function makeChannel(type: "TEXT" | "VOICE" = "TEXT", categoryId?: string, synced = !!categoryId) {
    return prisma.client.channel.create({
      data: {
        serverId: ids.server,
        name: nextName(type.toLowerCase()),
        type,
        categoryId: categoryId ?? null,
        permissionsSynced: categoryId ? synced : false,
      },
    });
  }

  async function makeCategory() {
    return prisma.client.channelCategory.create({ data: { serverId: ids.server, name: nextName("category") } });
  }

  async function channelOverwrite(channelId: string, target: "everyone" | "roleA" | "roleB" | "unassigned" | "member", allow: bigint, deny: bigint) {
    const data = target === "member"
      ? { channelId, memberId: ids.memberMember, allow, deny }
      : { channelId, roleId: ids[target === "everyone" ? "everyoneRole" : `${target}Role`] ?? ids[target], allow, deny };
    return prisma.client.channelPermissionOverwrite.create({ data });
  }

  async function categoryOverwrite(categoryId: string, allow: bigint, deny: bigint) {
    return prisma.client.categoryPermissionOverwrite.create({
      data: { categoryId, roleId: ids.everyoneRole, allow, deny },
    });
  }

  function ownerMutation(method: "post" | "put" | "patch" | "delete", path: string, body?: unknown) {
    const call = request(app.getHttpServer())[method](path).set("Cookie", ownerCookies).set("X-CSRF-Token", ownerCsrf);
    return body === undefined ? call : call.send(body);
  }

  function memberMutation(method: "post" | "put" | "patch" | "delete", path: string, body?: unknown) {
    const call = request(app.getHttpServer())[method](path).set("Cookie", memberCookies).set("X-CSRF-Token", memberCsrf);
    return body === undefined ? call : call.send(body);
  }

  function connect(cookies = memberCookies): Promise<Socket> {
    const access = cookies.find((cookie) => cookie.startsWith("access_token="))?.split(";")[0].split("=")[1] || "";
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, {
        path: "/api/v1/ws",
        transports: ["websocket"],
        forceNew: true,
        query: { access_token: access },
      });
      const timer = setTimeout(() => { socket.close(); reject(new Error("Websocket connection timeout")); }, 5000);
      socket.once("ws:ready", () => { clearTimeout(timer); resolve(socket); });
      socket.once("connect_error", (error) => { clearTimeout(timer); socket.close(); reject(error); });
    });
  }

  function nextEvent<T>(socket: Socket, event: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), 4000);
      socket.once(event, (data: T) => { clearTimeout(timer); resolve(data); });
    });
  }

  function emitWithAck<T>(socket: Socket, event: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event} acknowledgement`)), 4000);
      socket.emit(event, data, (response: T) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  it("CHPERM-01: base @everyone access survives a neutral overwrite", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, 0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-02: @everyone Channel DENY removes base access", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
  });

  it("CHPERM-03: @everyone Channel ALLOW grants an absent applicable permission", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", PERMISSIONS.VIEW_CHANNEL, 0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-04: Role overwrite requires explicit assignment", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "unassigned", PERMISSIONS.VIEW_CHANNEL, 0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
  });

  it("CHPERM-05: Role position alone has no overwrite effect", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "unassigned", 0n, PERMISSIONS.VIEW_CHANNEL);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-06: multiple Role DENYs aggregate", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "roleA", 0n, PERMISSIONS.VIEW_CHANNEL);
    await channelOverwrite(channel.id, "roleB", 0n, PERMISSIONS.SEND_MESSAGES);
    const result = await permissions.getChannelPermissions(channel.id, ids.memberUser);
    expect(result & (PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES)).toBe(0n);
  });

  it("CHPERM-07: multiple Role ALLOWs aggregate", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "roleA", PERMISSIONS.VIEW_CHANNEL, 0n);
    await channelOverwrite(channel.id, "roleB", PERMISSIONS.SEND_MESSAGES, 0n);
    const result = await permissions.getChannelPermissions(channel.id, ids.memberUser);
    expect(result & (PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES)).toBe(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES);
  });

  it("CHPERM-08: aggregated Role ALLOW wins over Role DENY", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "roleA", 0n, PERMISSIONS.VIEW_CHANNEL);
    await channelOverwrite(channel.id, "roleB", PERMISSIONS.VIEW_CHANNEL, 0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-09: Member DENY overrides Role ALLOW", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "roleA", PERMISSIONS.VIEW_CHANNEL, 0n);
    await channelOverwrite(channel.id, "member", 0n, PERMISSIONS.VIEW_CHANNEL);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
  });

  it("CHPERM-10: Member ALLOW overrides Role DENY", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "roleA", 0n, PERMISSIONS.VIEW_CHANNEL);
    await channelOverwrite(channel.id, "member", PERMISSIONS.VIEW_CHANNEL, 0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-11: owner bypasses every Channel overwrite", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, CHANNEL_OVERRIDE_PERMISSION_MASK);
    expect(await permissions.getChannelPermissions(channel.id, ids.ownerUser)).toBeGreaterThan(0n);
    expect(await permissions.hasChannelPermission(channel.id, ids.ownerUser, PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.STREAM)).toBe(true);
  });

  it("CHPERM-12: Administrator bypasses every Channel overwrite", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, CHANNEL_OVERRIDE_PERMISSION_MASK);
    expect(await permissions.hasChannelPermission(channel.id, ids.adminUser, PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.STREAM)).toBe(true);
  });

  it("CHPERM-13: an ordinary Role named Owner has no bypass", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    expect(await permissions.hasChannelPermission(channel.id, ids.fakeOwnerUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
  });

  it("CHPERM-14: cross-server Role overwrite target is rejected", async () => {
    const channel = await makeChannel();
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.secondEveryoneRole}`, { allow: "0", deny: "0" }).expect(400);
  });

  it("CHPERM-15: cross-server Member overwrite target is rejected", async () => {
    const channel = await makeChannel();
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.secondMemberMember}`, { allow: "0", deny: "0" }).expect(400);
  });

  it("CHPERM-16: overlapping allow and deny bits are rejected", async () => {
    const channel = await makeChannel();
    const view = PERMISSIONS.VIEW_CHANNEL.toString();
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: view, deny: view }).expect(400);
  });

  it("CHPERM-17: unsupported and unknown overwrite bits are rejected", async () => {
    const channel = await makeChannel();
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: PERMISSIONS.ADMINISTRATOR.toString(), deny: "0" }).expect(400);
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: (1n << 60n).toString(), deny: "0" }).expect(400);
  });

  it("CHPERM-18: hidden Channel is absent from the list", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    const result = await request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200);
    expect(result.body.find((item: { id: string }) => item.id === channel.id)).toBeUndefined();
  });

  it("CHPERM-19: hidden Channel UUID direct access is denied", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    await request(app.getHttpServer()).get(`/api/v1/channels/${channel.id}`).set("Cookie", memberCookies).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/navigation/servers/${ids.server}/channels/${channel.id}`).set("Cookie", memberCookies).expect(404);
  });

  it("CHPERM-20: hidden Channel metadata is absent from permission invalidation events", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const channel = await makeChannel();
    const socket = await connect();
    const event = nextEvent<Record<string, unknown>>(socket, "permissions:changed");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() }).expect(200);
    expect(await event).toEqual({ serverId: ids.server });
    socket.close();
  });

  it("CHPERM-21: base VIEW off plus explicit ALLOW exposes only that Channel", async () => {
    const allowed = await makeChannel();
    const neutral = await makeChannel();
    await channelOverwrite(allowed.id, "everyone", PERMISSIONS.VIEW_CHANNEL, 0n);
    const result = await request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200);
    expect(result.body.map((item: { id: string }) => item.id)).toEqual([allowed.id]);
    expect(result.body.some((item: { id: string }) => item.id === neutral.id)).toBe(false);
  });

  it("CHPERM-22: base VIEW on plus one DENY hides only the denied Channel", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const denied = await makeChannel();
    const visible = await makeChannel();
    await channelOverwrite(denied.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    const result = await request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200);
    expect(result.body.map((item: { id: string }) => item.id)).toEqual([visible.id]);
  });

  it("CHPERM-23: Category creation persists", async () => {
    const result = await ownerMutation("post", `/api/v1/servers/${ids.server}/categories`, { name: "Persisted Category" }).expect(201);
    await expect(prisma.client.channelCategory.findUnique({ where: { id: result.body.id } })).resolves.toMatchObject({ name: "Persisted Category", serverId: ids.server });
  });

  it("CHPERM-24: a new child Channel defaults to synced permissions", async () => {
    const category = await makeCategory();
    const result = await ownerMutation("post", `/api/v1/servers/${ids.server}/channels`, { name: nextName("child"), categoryId: category.id }).expect(201);
    expect(result.body.permissionsSynced).toBe(true);
  });

  it("CHPERM-25: a synced Channel resolves the Category overwrite set", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    await categoryOverwrite(category.id, PERMISSIONS.VIEW_CHANNEL, 0n);
    const snapshot = await permissions.getChannelPermissionSnapshot(channel.id, ids.memberUser);
    expect(snapshot).toMatchObject({ overwriteSource: "CATEGORY", overwriteSourceId: category.id, permissionsSynced: true });
    expect(snapshot!.permissions & PERMISSIONS.VIEW_CHANNEL).toBe(PERMISSIONS.VIEW_CHANNEL);
  });

  it("CHPERM-26: Category overwrite changes immediately affect synced children", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
    await ownerMutation("put", `/api/v1/categories/${category.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: PERMISSIONS.VIEW_CHANNEL.toString(), deny: "0" }).expect(200);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-27: an unsynced Channel ignores later Category changes", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, false);
    await channelOverwrite(channel.id, "everyone", PERMISSIONS.VIEW_CHANNEL, 0n);
    await categoryOverwrite(category.id, 0n, PERMISSIONS.VIEW_CHANNEL);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
  });

  it("CHPERM-28: SYNCED to UNSYNCED copies current Category state", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    await categoryOverwrite(category.id, PERMISSIONS.VIEW_CHANNEL, 0n);
    await ownerMutation("post", `/api/v1/channels/${channel.id}/permissions/unsync`, {}).expect(201);
    const stored = await prisma.client.channel.findUnique({ where: { id: channel.id }, include: { permissionOverwrites: true } });
    expect(stored?.permissionsSynced).toBe(false);
    expect(stored?.permissionOverwrites).toHaveLength(1);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
    const independentAllow = PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES;
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, {
      allow: independentAllow.toString(),
      deny: "0",
    }).expect(200);
    await ownerMutation("post", `/api/v1/channels/${channel.id}/permissions/unsync`, {}).expect(201);
    const stillIndependent = await prisma.client.channelPermissionOverwrite.findFirst({
      where: { channelId: channel.id, roleId: ids.everyoneRole },
    });
    expect(stillIndependent?.allow).toBe(independentAllow);
  });

  it("CHPERM-29: UNSYNCED to SYNCED switches source deterministically", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, false);
    await channelOverwrite(channel.id, "everyone", PERMISSIONS.VIEW_CHANNEL, 0n);
    await categoryOverwrite(category.id, 0n, PERMISSIONS.VIEW_CHANNEL);
    await ownerMutation("post", `/api/v1/channels/${channel.id}/permissions/sync`, {}).expect(201);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
    await expect(prisma.client.channelPermissionOverwrite.count({ where: { channelId: channel.id } })).resolves.toBe(0);
  });

  it("CHPERM-30: an uncategorized Channel uses its local source", async () => {
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", PERMISSIONS.VIEW_CHANNEL, 0n);
    await expect(permissions.getOverwriteSource(channel.id)).resolves.toEqual({ type: "CHANNEL", id: channel.id, permissionsSynced: false });
  });

  it("CHPERM-31: deleting a Category preserves child Channels", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    await ownerMutation("delete", `/api/v1/categories/${category.id}`).expect(200);
    await expect(prisma.client.channel.findUnique({ where: { id: channel.id } })).resolves.toMatchObject({ categoryId: null, permissionsSynced: false });
  });

  it("CHPERM-32: Category deletion leaves a deterministic independent permission state", async () => {
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    await categoryOverwrite(category.id, PERMISSIONS.VIEW_CHANNEL, 0n);
    await ownerMutation("delete", `/api/v1/categories/${category.id}`).expect(200);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(true);
    await expect(prisma.client.channelPermissionOverwrite.count({ where: { channelId: channel.id } })).resolves.toBe(1);
  });

  it("CHPERM-33: Text history requires effective VIEW_CHANNEL and READ_MESSAGE_HISTORY", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.READ_MESSAGE_HISTORY);
    const noHistory = await makeChannel();
    await channelOverwrite(noHistory.id, "everyone", 0n, PERMISSIONS.READ_MESSAGE_HISTORY);
    await request(app.getHttpServer()).get(`/api/v1/channels/${noHistory.id}/messages`).set("Cookie", memberCookies).expect(403);
    const hidden = await makeChannel();
    await channelOverwrite(hidden.id, "everyone", 0n, PERMISSIONS.VIEW_CHANNEL);
    await request(app.getHttpServer()).get(`/api/v1/channels/${hidden.id}/messages`).set("Cookie", memberCookies).expect(403);
  });

  it("CHPERM-34: Text send requires effective SEND_MESSAGES", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.SEND_MESSAGES);
    await request(app.getHttpServer()).post(`/api/v1/channels/${channel.id}/messages`).set("Cookie", memberCookies).set("X-CSRF-Token", csrf(memberCookies)).send({ content: "blocked" }).expect(403);
  });

  it("CHPERM-35: attachment preparation respects ATTACH_FILES", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES | PERMISSIONS.ATTACH_FILES);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.ATTACH_FILES);
    await request(app.getHttpServer()).post(`/api/v1/channels/${channel.id}/attachments/prepare`).set("Cookie", memberCookies).set("X-CSRF-Token", csrf(memberCookies)).send({ fileName: "safe.txt", mimeType: "text/plain", fileSize: 4 }).expect(403);
  });

  it("CHPERM-LIFE-19: ATTACH_FILES denial does not prevent an otherwise-authorized text message", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES | PERMISSIONS.ATTACH_FILES);
    const channel = await makeChannel();
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.ATTACH_FILES);
    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channel.id}/messages`)
      .set("Cookie", memberCookies)
      .set("X-CSRF-Token", memberCsrf)
      .send({ content: "text remains allowed" })
      .expect(201);
  });

  it("CHPERM-36: Voice join requires effective CONNECT", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.CONNECT);
    await expect(voice.validateJoin(ids.server, channel.id, ids.memberUser)).rejects.toThrow();
  });

  it("CHPERM-37: Screen Share start requires effective STREAM on the active Voice Channel", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.STREAM);
    const channel = await makeChannel("VOICE");
    await channelOverwrite(channel.id, "everyone", 0n, PERMISSIONS.STREAM);
    await expect(voice.validateStream(channel.id, ids.memberUser)).rejects.toThrow();
  });

  it("CHPERM-38: revoking CONNECT evicts active Voice membership", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK | PERMISSIONS.STREAM);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joined = nextEvent(socket, "voice:state");
    socket.emit("voice:join", { serverId: ids.server, channelId: channel.id });
    await joined;
    const revoked = nextEvent<{ serverId: string; reason: string }>(socket, "voice:permission-revoked");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, { allow: "0", deny: PERMISSIONS.CONNECT.toString() }).expect(200);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.CONNECT)).toBe(false);
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toBeNull();
    expect(await revoked).toEqual({ serverId: ids.server, reason: "CONNECT" });
    socket.close();
  }, 15000);

  it("F6-C1-OCC-01: occupancy snapshot includes only permitted Voice Channels and rejects foreign Server scope", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const visible = await makeChannel("VOICE");
    const hidden = await makeChannel("VOICE");
    await channelOverwrite(hidden.id, "member", 0n, PERMISSIONS.VIEW_CHANNEL);
    await voice.join(ids.server, visible.id, ids.ownerUser);
    await voice.join(ids.server, hidden.id, ids.adminUser);
    const observer = await connect();

    try {
      const snapshot = await emitWithAck<{
        serverId: string;
        channels: Array<{ channelId: string; members: Array<{ userId: string; username: string }> }>;
      }>(observer, "voice:occupancy:get", { serverId: ids.server });
      expect(snapshot.serverId).toBe(ids.server);
      expect(snapshot.channels).toHaveLength(1);
      expect(snapshot.channels[0]).toMatchObject({
        channelId: visible.id,
        members: [{ userId: ids.ownerUser, username: "owner-chperm" }],
      });
      expect(JSON.stringify(snapshot)).not.toContain(hidden.id);
      expect(JSON.stringify(snapshot)).not.toContain(ids.adminUser);

      const foreign = await emitWithAck<unknown>(observer, "voice:occupancy:get", { serverId: ids.secondServer });
      expect(foreign).toEqual({ serverId: ids.secondServer, channels: [] });
    } finally {
      observer.close();
      await voice.leave(visible.id, ids.ownerUser);
      await voice.leave(hidden.id, ids.adminUser);
    }
  }, 15000);

  it("F6-C1-OCC-02: join, leave, disconnect and permission loss converge through minimal invalidation", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    const observer = await connect();
    const occupant = await connect(ownerCookies);

    try {
      const joinedInvalidation = nextEvent<{ serverId: string }>(observer, "voice:occupancy-changed");
      await emitWithAck(occupant, "voice:join", { serverId: ids.server, channelId: channel.id });
      await expect(joinedInvalidation).resolves.toEqual({ serverId: ids.server });

      const joinedSnapshot = await emitWithAck<{
        serverId: string;
        channels: Array<{ channelId: string; members: Array<{ userId: string }> }>;
      }>(observer, "voice:occupancy:get", { serverId: ids.server });
      expect(joinedSnapshot.channels).toEqual([{
        channelId: channel.id,
        members: [expect.objectContaining({ userId: ids.ownerUser })],
      }]);

      const leftInvalidation = nextEvent<{ serverId: string }>(observer, "voice:occupancy-changed");
      occupant.emit("voice:leave", { channelId: channel.id });
      await expect(leftInvalidation).resolves.toEqual({ serverId: ids.server });

      const rejoinedInvalidation = nextEvent<{ serverId: string }>(observer, "voice:occupancy-changed");
      await emitWithAck(occupant, "voice:join", { serverId: ids.server, channelId: channel.id });
      await rejoinedInvalidation;
      const disconnectedInvalidation = nextEvent<{ serverId: string }>(observer, "voice:occupancy-changed");
      occupant.close();
      await expect(disconnectedInvalidation).resolves.toEqual({ serverId: ids.server });

      await voice.join(ids.server, channel.id, ids.ownerUser);
      const permissionInvalidation = nextEvent<{ serverId: string }>(observer, "voice:occupancy-changed");
      await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, {
        allow: "0",
        deny: PERMISSIONS.VIEW_CHANNEL.toString(),
      }).expect(200);
      await expect(permissionInvalidation).resolves.toEqual({ serverId: ids.server });
      await expect(emitWithAck<{ serverId: string; channels: unknown[] }>(
        observer,
        "voice:occupancy:get",
        { serverId: ids.server },
      )).resolves.toEqual({ serverId: ids.server, channels: [] });
    } finally {
      observer.close();
      occupant.close();
      await voice.leave(channel.id, ids.ownerUser);
    }
  }, 20000);

  it("CHPERM-39: revoking STREAM stops an active Screen Share", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK | PERMISSIONS.STREAM);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joined = nextEvent(socket, "voice:state");
    socket.emit("voice:join", { serverId: ids.server, channelId: channel.id });
    await joined;
    const started = nextEvent<{ shareId: string }>(socket, "screen:share-started");
    socket.emit("screen:share-start", { channelId: channel.id });
    const share = await started;
    const stopped = nextEvent<{ shareId: string }>(socket, "screen:share-stopped");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, { allow: "0", deny: PERMISSIONS.STREAM.toString() }).expect(200);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.STREAM)).toBe(false);
    await expect(voice.getScreenShare(share.shareId)).resolves.toBeNull();
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ channelId: channel.id });
    expect((await stopped).shareId).toBe(share.shareId);
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-36: revoking SPEAK keeps CONNECT while muting the active sender", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joined = nextEvent(socket, "voice:state");
    socket.emit("voice:join", { serverId: ids.server, channelId: channel.id });
    await joined;

    const revoked = nextEvent<{ serverId: string }>(socket, "voice:speak-permission-revoked");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, {
      allow: "0",
      deny: PERMISSIONS.SPEAK.toString(),
    }).expect(200);

    expect(await revoked).toEqual({ serverId: ids.server });
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.CONNECT)).toBe(true);
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({
      channelId: channel.id,
      isMuted: true,
    });
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-61: CONNECT denial remains authoritative after eviction and blocks normal rejoin", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joinedEvent = nextEvent(socket, "voice:state");
    const joined = await emitWithAck<{ ok: boolean }>(socket, "voice:join", { serverId: ids.server, channelId: channel.id });
    expect(joined.ok).toBe(true);
    await joinedEvent;

    const revoked = nextEvent<{ reason: string }>(socket, "voice:permission-revoked");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, {
      allow: "0",
      deny: PERMISSIONS.CONNECT.toString(),
    }).expect(200);
    await expect(revoked).resolves.toMatchObject({ reason: "CONNECT" });

    const rejoin = await emitWithAck<{ ok: boolean; code?: string }>(socket, "voice:join", {
      serverId: ids.server,
      channelId: channel.id,
    });
    expect(rejoin).toMatchObject({ ok: false, code: "MISSING_PERMISSION" });
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toBeNull();
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-62: forged repeated joins cannot recreate denied Voice membership", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT);
    const channel = await makeChannel("VOICE");
    await channelOverwrite(channel.id, "member", 0n, PERMISSIONS.CONNECT);
    const socket = await connect();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await emitWithAck<{ ok: boolean; code?: string }>(socket, "voice:join", {
        serverId: ids.server,
        channelId: channel.id,
      });
      expect(response).toMatchObject({ ok: false, code: "MISSING_PERMISSION" });
    }

    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toBeNull();
    await expect(voice.getUsers(channel.id)).resolves.toEqual([]);
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-63: SPEAK denial prevents normal Unmute while CONNECT remains allowed", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joinedEvent = nextEvent(socket, "voice:state");
    await emitWithAck(socket, "voice:join", { serverId: ids.server, channelId: channel.id });
    await joinedEvent;
    const revoked = nextEvent(socket, "voice:speak-permission-revoked");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, {
      allow: "0",
      deny: PERMISSIONS.SPEAK.toString(),
    }).expect(200);
    await revoked;

    const unmute = await emitWithAck<{ ok: boolean; code?: string; isMuted?: boolean }>(socket, "voice:mute", {
      channelId: channel.id,
      muted: false,
      serverId: ids.server,
    });
    expect(unmute).toMatchObject({ ok: false, code: "MISSING_SPEAK_PERMISSION", isMuted: true });
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ isMuted: true });
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.CONNECT)).toBe(true);
    socket.close();
  }, 15000);

  it("VA3A initial server mute is included before capture transmission can open", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    await prisma.client.member.update({ where: { id: ids.memberMember }, data: { isMuted: true } });
    const socket = await connect();
    try {
      const joined = await emitWithAck(socket, "voice:join", { serverId: ids.server, channelId: channel.id });
      expect(joined).toMatchObject({ ok: true, isMuted: true, serverMuted: true });
      await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ isMuted: true });
    } finally {
      socket.close();
      await prisma.client.member.update({ where: { id: ids.memberMember }, data: { isMuted: false } });
    }
  }, 15000);

  it("CHPERM-LIFE-64: forged Voice state mutations cannot bypass SPEAK denial", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT);
    const channel = await makeChannel("VOICE");
    const socket = await connect();
    const joinedEvent = nextEvent(socket, "voice:state");
    const joined = await emitWithAck<{ ok: boolean; isMuted?: boolean }>(socket, "voice:join", {
      serverId: ids.server,
      channelId: channel.id,
    });
    expect(joined).toMatchObject({ ok: true, isMuted: true });
    await joinedEvent;

    for (const forgedServerId of [undefined, ids.secondServer]) {
      const response = await emitWithAck<{ ok: boolean; code?: string }>(socket, "voice:mute", {
        channelId: channel.id,
        muted: false,
        ...(forgedServerId ? { serverId: forgedServerId } : {}),
      });
      expect(response).toMatchObject({ ok: false, code: "MISSING_SPEAK_PERMISSION" });
    }
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ isMuted: true });
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-65: restoring SPEAK keeps the microphone muted until deliberate Unmute", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    await channelOverwrite(channel.id, "member", 0n, PERMISSIONS.SPEAK);
    const socket = await connect();
    const joinedEvent = nextEvent(socket, "voice:state");
    const joined = await emitWithAck<{ ok: boolean; isMuted?: boolean }>(socket, "voice:join", {
      serverId: ids.server,
      channelId: channel.id,
    });
    expect(joined).toMatchObject({ ok: true, isMuted: true });
    await joinedEvent;

    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`, {
      allow: "0",
      deny: "0",
    }).expect(200);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.SPEAK)).toBe(true);
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ isMuted: true });

    const unmute = await emitWithAck<{ ok: boolean; isMuted?: boolean }>(socket, "voice:mute", {
      channelId: channel.id,
      muted: false,
      serverId: ids.server,
    });
    expect(unmute).toEqual({ ok: true, isMuted: false });
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toMatchObject({ isMuted: false });
    socket.close();
  }, 15000);

  it("CHPERM-41: permissions:changed contains serverId only", async () => {
    const channel = await makeChannel();
    const socket = await connect();
    const event = nextEvent(socket, "permissions:changed");
    await ownerMutation("put", `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`, { allow: PERMISSIONS.VIEW_CHANNEL.toString(), deny: "0" }).expect(200);
    expect(await event).toEqual({ serverId: ids.server });
    socket.close();
  });

  it("CHPERM-42: channels:changed remains metadata-safe", async () => {
    const socket = await connect();
    const event = nextEvent(socket, "channels:changed");
    await ownerMutation("post", `/api/v1/servers/${ids.server}/categories`, { name: "Safe Event Category" }).expect(201);
    expect(await event).toEqual({ serverId: ids.server });
    socket.close();
  });

  it("CHPERM-46: F.3.5A Role permission changes retain the metadata-minimal invalidation", async () => {
    const socket = await connect();
    const event = nextEvent(socket, "permissions:changed");
    await ownerMutation("patch", `/api/v1/servers/${ids.server}/roles/${ids.roleA}`, { permissions: PERMISSIONS.VIEW_CHANNEL.toString() }).expect(200);
    expect(await event).toEqual({ serverId: ids.server });
    socket.close();
  });

  it("CHPERM-47: normal Voice flow remains authorized", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK);
    const channel = await makeChannel("VOICE");
    await expect(voice.validateJoin(ids.server, channel.id, ids.memberUser)).resolves.toBeUndefined();
  });

  it("CHPERM-48: normal Screen Share flow remains authorized", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.STREAM);
    const channel = await makeChannel("VOICE");
    await expect(voice.validateStream(channel.id, ids.memberUser)).resolves.toBeUndefined();
    const share = await voice.createScreenShare(channel.id, ids.memberUser, "socket-normal", "stream-normal");
    expect(share).toMatchObject({ channelId: channel.id, presenterUserId: ids.memberUser });
    await voice.removeScreenShare(share!.shareId);
  });

  it("CHPERM-LIFE-51/52: unrelated overwrite mutation preserves active Voice and Screen Share", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK | PERMISSIONS.STREAM);
    const voiceChannel = await makeChannel("VOICE");
    const unrelatedText = await makeChannel("TEXT");
    const socket = await connect();
    const joined = nextEvent(socket, "voice:state");
    socket.emit("voice:join", { serverId: ids.server, channelId: voiceChannel.id });
    await joined;
    const started = nextEvent<{ shareId: string }>(socket, "screen:share-started");
    socket.emit("screen:share-start", { channelId: voiceChannel.id });
    const share = await started;

    await ownerMutation("put", `/api/v1/channels/${unrelatedText.id}/permissions/ROLE/${ids.everyoneRole}`, {
      allow: "0",
      deny: PERMISSIONS.VIEW_CHANNEL.toString(),
    }).expect(200);

    await expect(voice.getVoiceState(voiceChannel.id, ids.memberUser)).resolves.toMatchObject({ channelId: voiceChannel.id });
    await expect(voice.getScreenShare(share.shareId)).resolves.toMatchObject({ channelId: voiceChannel.id });
    socket.close();
  }, 15000);

  it("CHPERM-50: Category and Channel permission operations preserve server isolation", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS);
    const channel = await makeChannel();
    const foreignCategory = await prisma.client.channelCategory.create({ data: { serverId: ids.secondServer, name: nextName("foreign") } });
    await ownerMutation("patch", `/api/v1/channels/${channel.id}`, { categoryId: foreignCategory.id }).expect(404);
    await expect(prisma.client.channel.findUnique({ where: { id: channel.id } })).resolves.toMatchObject({ categoryId: null });
  });

  it("CHPERM-ADM-01: MANAGE_CHANNELS cannot directly administer Channel overwrites", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);

    expect(response.body.error?.code).toBe("MISSING_PERMISSION");
    await expect(prisma.client.channelPermissionOverwrite.count({ where: { channelId: channel.id } })).resolves.toBe(0);
  });

  it("CHPERM-ADM-02: MANAGE_ROLES can administer eligible lower Role and @everyone overwrites", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES | PERMISSIONS.SEND_MESSAGES },
    });
    const channel = await makeChannel();

    await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
      { allow: PERMISSIONS.SEND_MESSAGES.toString(), deny: "0" },
    ).expect(200);
    await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.everyoneRole}`,
      { allow: PERMISSIONS.VIEW_CHANNEL.toString(), deny: "0" },
    ).expect(200);

    await expect(prisma.client.channelPermissionOverwrite.count({ where: { channelId: channel.id } })).resolves.toBe(2);
  });

  it("CHPERM-ADM-03: an equal Role overwrite target is protected", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleA}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);

    expect(response.body.error?.code).toBe("ROLE_HIERARCHY");
  });

  it("CHPERM-ADM-04: a higher Role overwrite target is protected", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.unassignedRole}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);

    expect(response.body.error?.code).toBe("ROLE_HIERARCHY");
  });

  it("CHPERM-ADM-05: MEMBER overwrite administration preserves self, hierarchy, and real-owner protection", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.ownerMember}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);

    expect(response.body.error?.code).toBe("OWNER_PROTECTED");
    const self = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.memberMember}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);
    expect(self.body.error?.code).toBe("ROLE_HIERARCHY");
    const higher = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/MEMBER/${ids.fakeOwnerMember}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(403);
    expect(higher.body.error?.code).toBe("ROLE_HIERARCHY");
  });

  it("CHPERM-ADM-06: an ordinary Role named Owner has no intrinsic owner semantics", async () => {
    await Promise.all([
      prisma.client.role.update({
        where: { id: ids.roleA },
        data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
      }),
      prisma.client.role.update({ where: { id: ids.namedOwnerRole }, data: { position: 50 } }),
    ]);
    const channel = await makeChannel();

    await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.namedOwnerRole}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(200);

    await expect(prisma.client.channelPermissionOverwrite.findFirst({
      where: { channelId: channel.id, roleId: ids.namedOwnerRole },
    })).resolves.toMatchObject({ deny: PERMISSIONS.VIEW_CHANNEL });
  });

  it("CHPERM-ADM-07: Channel overwrite ALLOW cannot bypass the permission-grant ceiling", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
      { allow: PERMISSIONS.SEND_MESSAGES.toString(), deny: "0" },
    ).expect(403);

    expect(response.body.error?.code).toBe("PERMISSION_ESCALATION");
    await ownerMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
      { allow: "0", deny: PERMISSIONS.SEND_MESSAGES.toString() },
    ).expect(200);
    const removedDeny = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
      { allow: "0", deny: "0" },
    ).expect(403);
    expect(removedDeny.body.error?.code).toBe("PERMISSION_ESCALATION");
    const deletedDeny = await memberMutation(
      "delete",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.roleB}`,
    ).expect(403);
    expect(deletedDeny.body.error?.code).toBe("PERMISSION_ESCALATION");
  });

  it("CHPERM-ADM-08: Category overwrite ALLOW cannot bypass the permission-grant ceiling", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const category = await makeCategory();

    const response = await memberMutation(
      "put",
      `/api/v1/categories/${category.id}/permissions/ROLE/${ids.roleB}`,
      { allow: PERMISSIONS.SEND_MESSAGES.toString(), deny: "0" },
    ).expect(403);

    expect(response.body.error?.code).toBe("PERMISSION_ESCALATION");
  });

  it("CHPERM-ADM-09: a forged cross-server overwrite target remains rejected", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_ROLES },
    });
    const channel = await makeChannel();

    const response = await memberMutation(
      "put",
      `/api/v1/channels/${channel.id}/permissions/ROLE/${ids.secondEveryoneRole}`,
      { allow: PERMISSIONS.VIEW_CHANNEL.toString(), deny: "0" },
    ).expect(400);

    expect(response.body.error?.code).toBe("CROSS_SERVER_OVERWRITE_TARGET");
  });

  it("CHPERM-ADM-10: ordinary users receive no Category metadata when zero child Channels are visible", async () => {
    const category = await makeCategory();
    await makeChannel("TEXT", category.id, true);

    const ordinary = await request(app.getHttpServer())
      .get(`/api/v1/servers/${ids.server}/categories`)
      .set("Cookie", memberCookies)
      .expect(200);
    expect(ordinary.body).toEqual([]);
    await request(app.getHttpServer())
      .get(`/api/v1/categories/${category.id}/permissions`)
      .set("Cookie", memberCookies)
      .expect(403);

    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: PERMISSIONS.MANAGE_CHANNELS } });
    const structuralAdmin = await request(app.getHttpServer())
      .get(`/api/v1/servers/${ids.server}/categories`)
      .set("Cookie", memberCookies)
      .expect(200);
    expect(structuralAdmin.body.map((item: { id: string }) => item.id)).toContain(category.id);

    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: PERMISSIONS.MANAGE_ROLES } });
    const permissionAdmin = await request(app.getHttpServer())
      .get(`/api/v1/servers/${ids.server}/categories`)
      .set("Cookie", memberCookies)
      .expect(200);
    expect(permissionAdmin.body.map((item: { id: string }) => item.id)).toContain(category.id);
  });

  it("CHPERM-ADM-11: a Category appears when at least one child Channel is visible", async () => {
    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: PERMISSIONS.VIEW_CHANNEL } });
    const category = await makeCategory();
    await makeChannel("TEXT", category.id, true);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/servers/${ids.server}/categories`)
      .set("Cookie", memberCookies)
      .expect(200);

    expect(response.body.map((item: { id: string }) => item.id)).toContain(category.id);
  });

  it("CHPERM-ADM-12: a visible Category does not expose its hidden sibling Channel", async () => {
    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: PERMISSIONS.VIEW_CHANNEL } });
    const category = await makeCategory();
    const visible = await makeChannel("TEXT", category.id, false);
    const hidden = await makeChannel("TEXT", category.id, false);
    await channelOverwrite(hidden.id, "roleA", 0n, PERMISSIONS.VIEW_CHANNEL);

    const [categories, channels] = await Promise.all([
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/categories`).set("Cookie", memberCookies).expect(200),
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200),
    ]);

    expect(categories.body.map((item: { id: string }) => item.id)).toContain(category.id);
    expect(channels.body.map((item: { id: string }) => item.id)).toContain(visible.id);
    expect(channels.body.map((item: { id: string }) => item.id)).not.toContain(hidden.id);
  });

  it("CHPERM-ADM-13: Category permission changes invalidate minimally without leaking hidden child metadata", async () => {
    await prisma.client.role.update({ where: { id: ids.roleA }, data: { permissions: PERMISSIONS.VIEW_CHANNEL } });
    const category = await makeCategory();
    const channel = await makeChannel("TEXT", category.id, true);
    const socket = await connect();
    const event = nextEvent<{ serverId: string }>(socket, "permissions:changed");

    await ownerMutation(
      "put",
      `/api/v1/categories/${category.id}/permissions/ROLE/${ids.roleA}`,
      { allow: "0", deny: PERMISSIONS.VIEW_CHANNEL.toString() },
    ).expect(200);

    expect(await event).toEqual({ serverId: ids.server });
    const [categories, channels] = await Promise.all([
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/categories`).set("Cookie", memberCookies).expect(200),
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200),
    ]);
    expect(categories.body.map((item: { id: string }) => item.id)).not.toContain(category.id);
    expect(channels.body.map((item: { id: string }) => item.id)).not.toContain(channel.id);
    socket.close();
  });

  it("CHPERM-ADM-14: Channel move and sync cannot bypass the permission-management boundary", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS },
    });
    const source = await makeCategory();
    const destination = await makeCategory();
    const safeMove = await makeChannel("TEXT", source.id, false);

    await memberMutation("patch", `/api/v1/channels/${safeMove.id}`, { categoryId: destination.id }).expect(200);
    await memberMutation("patch", `/api/v1/channels/${safeMove.id}`, { categoryId: null }).expect(200);
    await expect(prisma.client.channel.findUnique({ where: { id: safeMove.id } })).resolves.toMatchObject({
      categoryId: null,
      permissionsSynced: false,
    });

    const synced = await makeChannel("TEXT", source.id, true);
    await memberMutation("patch", `/api/v1/channels/${synced.id}`, { categoryId: destination.id }).expect(403);
    await memberMutation("post", `/api/v1/channels/${synced.id}/permissions/unsync`, {}).expect(403);
    const independent = await makeChannel("TEXT", source.id, false);
    await memberMutation("post", `/api/v1/channels/${independent.id}/permissions/sync`, {}).expect(403);

    await Promise.all([
      prisma.client.role.update({
        where: { id: ids.roleA },
        data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS | PERMISSIONS.MANAGE_ROLES },
      }),
      prisma.client.categoryPermissionOverwrite.create({
        data: { categoryId: destination.id, roleId: ids.roleB, allow: PERMISSIONS.SEND_MESSAGES, deny: 0n },
      }),
    ]);
    const escalation = await memberMutation(
      "patch",
      `/api/v1/channels/${synced.id}`,
      { categoryId: destination.id },
    ).expect(403);
    expect(escalation.body.error?.code).toBe("PERMISSION_ESCALATION");
    await expect(prisma.client.channel.findUnique({ where: { id: synced.id } })).resolves.toMatchObject({
      categoryId: source.id,
      permissionsSynced: true,
    });
  });

  it("CHPERM-ADM-15: a structural permission-source transition reconciles VIEW, CONNECT, and STREAM revocation", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: {
        permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK | PERMISSIONS.STREAM,
      },
    });
    const source = await makeCategory();
    const destination = await makeCategory();
    await prisma.client.categoryPermissionOverwrite.create({
      data: {
        categoryId: destination.id,
        roleId: ids.roleA,
        allow: 0n,
        deny: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.STREAM,
      },
    });
    const channel = await makeChannel("VOICE", source.id, true);
    const socket = await connect();
    const joined = nextEvent(socket, "voice:state");
    socket.emit("voice:join", { serverId: ids.server, channelId: channel.id });
    await joined;
    const started = nextEvent<{ shareId: string }>(socket, "screen:share-started");
    socket.emit("screen:share-start", { channelId: channel.id });
    const share = await started;

    const structureChanged = nextEvent<{ serverId: string }>(socket, "channels:changed");
    const shareStopped = nextEvent<{ shareId: string }>(socket, "screen:share-stopped");
    const voiceRevoked = nextEvent<{ serverId: string; reason: string }>(socket, "voice:permission-revoked");
    await ownerMutation("patch", `/api/v1/channels/${channel.id}`, { categoryId: destination.id }).expect(200);

    expect(await structureChanged).toEqual({ serverId: ids.server });
    expect((await shareStopped).shareId).toBe(share.shareId);
    expect(await voiceRevoked).toEqual({ serverId: ids.server, reason: "CONNECT" });
    await expect(voice.getVoiceState(channel.id, ids.memberUser)).resolves.toBeNull();
    await expect(voice.getScreenShare(share.shareId)).resolves.toBeNull();
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.VIEW_CHANNEL)).toBe(false);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.CONNECT)).toBe(false);
    expect(await permissions.hasChannelPermission(channel.id, ids.memberUser, PERMISSIONS.STREAM)).toBe(false);
    const visible = await request(app.getHttpServer())
      .get(`/api/v1/servers/${ids.server}/channels`)
      .set("Cookie", memberCookies)
      .expect(200);
    expect(visible.body.map((item: { id: string }) => item.id)).not.toContain(channel.id);
    socket.close();
  }, 15000);

  it("CHPERM-LIFE-20/21: Private Channel creation requires structural and permission authority", async () => {
    await prisma.client.role.update({
      where: { id: ids.roleA },
      data: { permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.MANAGE_CHANNELS },
    });
    const name = nextName("structural-private");
    const response = await memberMutation("post", `/api/v1/servers/${ids.server}/channels`, {
      name,
      type: "TEXT",
      isPrivate: true,
      allowedRoleIds: [ids.roleB],
      allowedMemberIds: [],
    }).expect(403);

    expect(response.body.error?.code).toBe("MISSING_PERMISSION");
    await expect(prisma.client.channel.count({ where: { serverId: ids.server, name } })).resolves.toBe(0);
  });

  it("CHPERM-LIFE-22/23/24/25/26/27/28/29: Private Channel is committed atomically with a coherent local source", async () => {
    await setBase(PERMISSIONS.VIEW_CHANNEL);
    const category = await makeCategory();
    const unauthorizedLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "fakeowner-chperm@test.local", password: "channel-permission-password" });
    const unauthorizedCookies: string[] = unauthorizedLogin.headers["set-cookie"];
    const unauthorizedSocket = await connect(unauthorizedCookies);
    const authorizedSocket = await connect(memberCookies);
    const unauthorizedEvent = nextEvent<{ serverId: string }>(unauthorizedSocket, "channels:changed");
    const authorizedEvent = nextEvent<{ serverId: string }>(authorizedSocket, "channels:changed");

    const response = await ownerMutation("post", `/api/v1/servers/${ids.server}/channels`, {
      name: nextName("private-staff"),
      type: "TEXT",
      categoryId: category.id,
      isPrivate: true,
      allowedRoleIds: [ids.unassignedRole],
      allowedMemberIds: [ids.memberMember],
    }).expect(201);
    const channelId = response.body.id as string;

    expect(await unauthorizedEvent).toEqual({ serverId: ids.server });
    expect(await authorizedEvent).toEqual({ serverId: ids.server });
    const stored = await prisma.client.channel.findUnique({
      where: { id: channelId },
      include: { permissionOverwrites: { orderBy: { id: "asc" } } },
    });
    expect(stored).toMatchObject({ categoryId: category.id, permissionsSynced: false });
    expect(stored?.permissionOverwrites).toHaveLength(3);
    expect(stored?.permissionOverwrites).toEqual(expect.arrayContaining([
      expect.objectContaining({ roleId: ids.everyoneRole, allow: 0n, deny: PERMISSIONS.VIEW_CHANNEL }),
      expect.objectContaining({ roleId: ids.unassignedRole, allow: PERMISSIONS.VIEW_CHANNEL, deny: 0n }),
      expect.objectContaining({ memberId: ids.memberMember, allow: PERMISSIONS.VIEW_CHANNEL, deny: 0n }),
    ]));
    await expect(permissions.getOverwriteSource(channelId)).resolves.toEqual({
      type: "CHANNEL",
      id: channelId,
      permissionsSynced: false,
    });

    const [authorizedList, unauthorizedList] = await Promise.all([
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", memberCookies).expect(200),
      request(app.getHttpServer()).get(`/api/v1/servers/${ids.server}/channels`).set("Cookie", unauthorizedCookies).expect(200),
    ]);
    expect(authorizedList.body.map((item: { id: string }) => item.id)).toContain(channelId);
    expect(unauthorizedList.body.map((item: { id: string }) => item.id)).not.toContain(channelId);
    await request(app.getHttpServer()).get(`/api/v1/channels/${channelId}`).set("Cookie", unauthorizedCookies).expect(404);
    unauthorizedSocket.close();
    authorizedSocket.close();
  }, 15000);

  it("CHPERM-LIFE-30/45/59: invalid private targets leave no orphan Channel or overwrite", async () => {
    const rollbackName = nextName("private-rollback");
    await expect(channelsService.createChannel(ids.server, ids.ownerUser, {
      name: rollbackName,
      type: "TEXT",
      isPrivate: true,
      // Service-level coverage deliberately bypasses DTO ArrayUnique so the
      // overwrite insert fails after the Channel insert inside the transaction.
      allowedRoleIds: [ids.roleB, ids.roleB],
      allowedMemberIds: [],
    })).rejects.toBeDefined();
    await expect(prisma.client.channel.count({ where: { serverId: ids.server, name: rollbackName } })).resolves.toBe(0);
    await expect(prisma.client.channelPermissionOverwrite.count({
      where: { channel: { serverId: ids.server, name: rollbackName } },
    })).resolves.toBe(0);

    const crossServerName = nextName("private-cross-server");
    const response = await ownerMutation("post", `/api/v1/servers/${ids.server}/channels`, {
      name: crossServerName,
      type: "TEXT",
      isPrivate: true,
      allowedRoleIds: [ids.secondEveryoneRole],
      allowedMemberIds: [],
    }).expect(400);

    expect(response.body.error?.code).toBe("CROSS_SERVER_OVERWRITE_TARGET");
    await expect(prisma.client.channel.count({ where: { serverId: ids.server, name: crossServerName } })).resolves.toBe(0);
    await expect(prisma.client.channelPermissionOverwrite.count({
      where: { channel: { serverId: ids.server, name: crossServerName } },
    })).resolves.toBe(0);
  });
});
