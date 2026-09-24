import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import type { Socket as ServerSocket } from "socket.io";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PERMISSIONS } from "../src/server/guards/permission.service";
import { WsGateway } from "../src/ws/ws.gateway";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("WebSocket Eviction (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let appPort: number;
  let evServerId: string;
  let evServerBId: string;
  let evChannelA: string;
  let evChannelB: string;
  let ownerCookies: string[];
  let ownerToken: string;
  let kickedCookies: string[];
  let kickedToken: string;
  let kickedUserId: string;
  let kickedMemberId: string;
  let kickedMemberBId: string;
  let ownerUserId: string;
  let ownerMemberId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    const httpServer = app.getHttpServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        appPort = httpServer.address().port;
        resolve();
      });
    });

    prisma = app.get(PrismaService);

    await cleanDatabase(prisma);

    const hash = await argon2.hash("opass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const kHash = await argon2.hash("kpass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });

    const owner = await prisma.client.user.create({
      data: { email: "evowner@test.com", username: "evowner", displayName: "Evict Owner", passwordHash: hash },
    });
    ownerUserId = owner.id;

    const kicked = await prisma.client.user.create({
      data: { email: "evkicked@test.com", username: "evkicked", displayName: "Evict Kicked", passwordHash: kHash },
    });
    kickedUserId = kicked.id;

    const svA = await prisma.client.server.create({ data: { name: "Evict-A", ownerId: owner.id } });
    evServerId = svA.id;

    const svB = await prisma.client.server.create({ data: { name: "Evict-B", ownerId: owner.id } });
    evServerBId = svB.id;

    const ownerMemberA = await prisma.client.member.create({ data: { serverId: svA.id, userId: owner.id } });
    ownerMemberId = ownerMemberA.id;
    await prisma.client.member.create({ data: { serverId: svB.id, userId: owner.id } });

    const kmA = await prisma.client.member.create({ data: { serverId: svA.id, userId: kicked.id } });
    kickedMemberId = kmA.id;
    const kmB = await prisma.client.member.create({ data: { serverId: svB.id, userId: kicked.id } });
    kickedMemberBId = kmB.id;

    const everyonePerms = BigInt(0x10 | 0x20 | 0x2000 | 0x1000 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1);
    await prisma.client.role.create({
      data: { serverId: svA.id, name: "@everyone", permissions: everyonePerms, position: 0, isDefault: true, isMentionable: false },
    });
    await prisma.client.role.create({
      data: { serverId: svB.id, name: "@everyone", permissions: everyonePerms, position: 0, isDefault: true, isMentionable: false },
    });

    const chA = await prisma.client.channel.create({ data: { serverId: svA.id, type: "TEXT", name: "evict-a", position: 0 } });
    evChannelA = chA.id;
    const chB = await prisma.client.channel.create({ data: { serverId: svB.id, type: "TEXT", name: "evict-b", position: 0 } });
    evChannelB = chB.id;

    const ownerLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "evowner@test.com", password: "opass" });
    ownerCookies = ownerLogin.headers["set-cookie"];
    ownerToken = extractCsrf(ownerCookies);

    const kickedLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "evkicked@test.com", password: "kpass" });
    kickedCookies = kickedLogin.headers["set-cookie"];
    kickedToken = extractCsrf(kickedCookies);
  }, 15000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const WS_TIMEOUT = 25000;

  function connectClient(cookies?: string[]): Promise<{ client: ClientSocket; cleanup: () => void }> {
    return new Promise((resolve, reject) => {
      const cookieSet = cookies ?? ownerCookies;
      const cookie = cookieSet.find((c: string) => c.startsWith("access_token="));
      const token = cookie ? cookie.split(";")[0].split("=")[1] : "";

      const client = ioClient(`http://localhost:${appPort}`, {
        path: "/api/v1/ws",
        transports: ["websocket"],
        forceNew: true,
        query: { access_token: token },
      });

      const timer = setTimeout(() => { client.close(); reject(new Error("WebSocket readiness timeout")); }, 5000);
      client.on("ws:ready", () => {
        clearTimeout(timer);
        resolve({ client, cleanup: () => { try { client.close(); } catch { /* ok */ } } });
      });
      client.on("connect_error", (error) => { clearTimeout(timer); client.close(); reject(error); });
    });
  }

  function sendMessageAsOwner(channelId: string): Promise<string> {
    return request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ content: `WS evict test ${Date.now()}` })
      .then((r: any) => r.body.message.id);
  }

  function nextEvent<T>(client: ClientSocket, event: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), WS_TIMEOUT);
      client.once(event, (data: T) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  function emitWithAck<T>(client: ClientSocket, event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${event} acknowledgement`)), WS_TIMEOUT);
      client.emit(event, payload, (response: T) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  function getServerSocket(clientId: string): (ServerSocket & { voiceChannel?: string }) | undefined {
    const socketContainer = (app.get(WsGateway).server as unknown as {
      sockets: Map<string, ServerSocket> | { sockets: Map<string, ServerSocket> };
    }).sockets;
    const sockets = socketContainer instanceof Map ? socketContainer : socketContainer.sockets;
    return sockets.get(clientId) as (ServerSocket & { voiceChannel?: string }) | undefined;
  }

  async function createLifecycleServer(name: string) {
    const server = await prisma.client.server.create({ data: { name, ownerId: ownerUserId } });
    await prisma.client.member.create({ data: { serverId: server.id, userId: ownerUserId } });
    await prisma.client.member.create({ data: { serverId: server.id, userId: kickedUserId } });
    await prisma.client.role.create({
      data: {
        serverId: server.id,
        name: "@everyone",
        permissions: PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.CONNECT | PERMISSIONS.SPEAK
          | PERMISSIONS.SEND_MESSAGES | PERMISSIONS.READ_MESSAGE_HISTORY,
        position: 0,
        isDefault: true,
        isMentionable: false,
      },
    });
    const text = await prisma.client.channel.create({ data: { serverId: server.id, type: "TEXT", name: `${name}-text`, position: 0 } });
    const voice = await prisma.client.channel.create({ data: { serverId: server.id, type: "VOICE", name: `${name}-voice`, position: 1 } });
    return { serverId: server.id, textChannelId: text.id, voiceChannelId: voice.id };
  }

  it(
    "WS-EVICT-01: kick evicts user from server WS rooms",
    async () => {
      const { client, cleanup } = await connectClient(kickedCookies);

      const createPromise = new Promise<void>((resolve, reject) => {
        client.on("message:created", (data: any) => {
          try {
            expect(data.message).toBeDefined();
            resolve();
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for message:created")), WS_TIMEOUT);
      });

      client.emit("subscribe", { channelIds: [evChannelA] });
      await new Promise((r) => setTimeout(r, 1000));
      await sendMessageAsOwner(evChannelA);
      await createPromise;

      const serverKickedPromise = new Promise<{ serverId: string }>((resolve, reject) => {
        client.on("server:kicked", (data: any) => {
          try {
            expect(data.serverId).toBe(evServerId);
            resolve(data);
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for server:kicked")), WS_TIMEOUT);
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/servers/${evServerId}/members/${kickedMemberId}`)
        .set("Cookie", ownerCookies)
        .set("X-CSRF-Token", ownerToken);

      await serverKickedPromise;

      // Reconnect: member deleted, so WS connection must not join server/channel rooms
      client.close();
      const { client: client2, cleanup: cleanup2 } = await connectClient(kickedCookies);
      let receivedAfterReconnect = false;
      client2.on("message:created", () => { receivedAfterReconnect = true; });

      client2.emit("subscribe", { channelIds: [evChannelA] });
      await new Promise((r) => setTimeout(r, 1000));
      await sendMessageAsOwner(evChannelA);
      await new Promise((r) => setTimeout(r, 1500));
      expect(receivedAfterReconnect).toBe(false);

      cleanup();
      cleanup2();
    },
    WS_TIMEOUT + 10000,
  );

  it(
    "WS-EVICT-02: ban evicts user from server WS rooms",
    async () => {
      await prisma.client.member.deleteMany({ where: { serverId: evServerId, userId: kickedUserId } });
      const newMember = await prisma.client.member.create({ data: { serverId: evServerId, userId: kickedUserId } });
      kickedMemberId = newMember.id;

      const { client, cleanup } = await connectClient(kickedCookies);

      const serverBannedPromise = new Promise<void>((resolve, reject) => {
        client.on("server:banned", (data: any) => {
          try {
            expect(data.serverId).toBe(evServerId);
            resolve();
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for server:banned")), WS_TIMEOUT);
      });

      client.emit("subscribe", { channelIds: [evChannelA] });
      await new Promise((r) => setTimeout(r, 1000));

      await request(app.getHttpServer())
        .post(`/api/v1/servers/${evServerId}/members/${kickedMemberId}/ban`)
        .set("Cookie", ownerCookies)
        .set("X-CSRF-Token", ownerToken);

      await serverBannedPromise;
      cleanup();
    },
    WS_TIMEOUT + 5000,
  );

  it(
    "WS-EVICT-03: kicked from one server does not affect another server",
    async () => {
      await prisma.client.member.deleteMany({ where: { serverId: evServerId, userId: kickedUserId } });
      const newMember = await prisma.client.member.create({ data: { serverId: evServerId, userId: kickedUserId } });
      kickedMemberId = newMember.id;

      const { client, cleanup } = await connectClient(kickedCookies);

      const serverKickedPromise = new Promise<void>((resolve, reject) => {
        client.on("server:kicked", (data: any) => {
          try {
            expect(data.serverId).toBe(evServerId);
            resolve();
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for server:kicked")), WS_TIMEOUT);
      });

      let bMessages = 0;
      client.on("message:created", (data: any) => {
        if (data.message && data.message.channelId === evChannelB) {
          bMessages++;
        }
      });

      client.emit("subscribe", { channelIds: [evChannelA, evChannelB] });
      await new Promise((r) => setTimeout(r, 1000));

      await request(app.getHttpServer())
        .delete(`/api/v1/servers/${evServerId}/members/${kickedMemberId}`)
        .set("Cookie", ownerCookies)
        .set("X-CSRF-Token", ownerToken);

      await serverKickedPromise;

      await sendMessageAsOwner(evChannelB);
      await new Promise((r) => setTimeout(r, 1500));
      expect(bMessages).toBeGreaterThan(0);

      cleanup();
    },
    WS_TIMEOUT + 10000,
  );

  it(
    "WS-EVICT-04: HTTP-only kick works without crash",
    async () => {
      const noWsHash = await argon2.hash("nowspass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });

      const noWsOwner = await prisma.client.user.create({
        data: { email: "nowsowner@test.com", username: "nowsowner", displayName: "NoWS Owner", passwordHash: noWsHash },
      });
      const victim = await prisma.client.user.create({
        data: { email: "nowsvictim@test.com", username: "nowsvictim", displayName: "NoWS Victim", passwordHash: "x" },
      });

      const noWsServer = await prisma.client.server.create({ data: { name: "NoWS-Server", ownerId: noWsOwner.id } });
      await prisma.client.member.create({ data: { serverId: noWsServer.id, userId: noWsOwner.id } });
      const victimMember = await prisma.client.member.create({ data: { serverId: noWsServer.id, userId: victim.id } });

      await prisma.client.role.create({
        data: { serverId: noWsServer.id, name: "@everyone", permissions: BigInt(0x10 | 0x20 | 0x2000 | 0x1000 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1), position: 0, isDefault: true, isMentionable: false },
      });

      const noWsLogin = await request(app.getHttpServer())
        .post("/api/v1/auth/login").send({ email: "nowsowner@test.com", password: "nowspass" });
      const noWsCookies = noWsLogin.headers["set-cookie"];
      const noWsToken = extractCsrf(noWsCookies);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/servers/${noWsServer.id}/members/${victimMember.id}`)
        .set("Cookie", noWsCookies)
        .set("X-CSRF-Token", noWsToken);

      expect(res.status).toBe(200);
    },
    WS_TIMEOUT,
  );

  it(
    "WS-EVICT-05: self-leave converges every tab and evicts Server, Channel and Voice rooms after commit",
    async () => {
      const ids = await createLifecycleServer("Self-Leave");
      const ownerConnection = await connectClient(ownerCookies);
      const firstConnection = await connectClient(kickedCookies);
      const secondConnection = await connectClient(kickedCookies);
      const clients = [firstConnection.client, secondConnection.client];
      await new Promise((resolve) => setTimeout(resolve, 500));

      const firstRemoved = nextEvent<Record<string, string>>(clients[0], "server:membership-removed");
      const secondRemoved = nextEvent<Record<string, string>>(clients[1], "server:membership-removed");
      const memberLeft = nextEvent<Record<string, string>>(ownerConnection.client, "server:member-left");
      for (const client of clients) {
        client.emit("subscribe", { channelIds: [ids.textChannelId] });
        await expect(emitWithAck<{ ok: boolean }>(client, "voice:join", {
          serverId: ids.serverId,
          channelId: ids.voiceChannelId,
        })).resolves.toMatchObject({ ok: true });
      }

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/servers/${ids.serverId}/members/@me`)
        .set("Cookie", kickedCookies)
        .set("X-CSRF-Token", kickedToken);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ result: "LEFT", serverId: ids.serverId });

      for (const event of await Promise.all([firstRemoved, secondRemoved])) {
        expect(event).toEqual({ serverId: ids.serverId });
        expect(Object.keys(event)).toEqual(["serverId"]);
      }
      await expect(memberLeft).resolves.toEqual({ serverId: ids.serverId });
      await expect(prisma.client.member.findUnique({
        where: { serverId_userId: { serverId: ids.serverId, userId: kickedUserId } },
      })).resolves.toBeNull();

      for (const client of clients) {
        const serverSocket = getServerSocket(client.id);
        expect(serverSocket).toBeDefined();
        expect(serverSocket!.rooms.has(`server:${ids.serverId}`)).toBe(false);
        expect(serverSocket!.rooms.has(`channel:${ids.textChannelId}`)).toBe(false);
        expect(serverSocket!.rooms.has(`voice:${ids.voiceChannelId}`)).toBe(false);
        expect(serverSocket!.voiceChannel).toBeUndefined();
      }

      ownerConnection.cleanup();
      firstConnection.cleanup();
      secondConnection.cleanup();
    },
    WS_TIMEOUT + 15000,
  );

  it(
    "WS-EVICT-06: Server Delete converges owner/member tabs with metadata-minimal eviction after commit",
    async () => {
      const ids = await createLifecycleServer("Delete-Convergence");
      const ownerConnection = await connectClient(ownerCookies);
      const firstConnection = await connectClient(kickedCookies);
      const secondConnection = await connectClient(kickedCookies);
      const clients = [ownerConnection.client, firstConnection.client, secondConnection.client];
      await new Promise((resolve) => setTimeout(resolve, 500));

      const deletedEvents = clients.map((client) => nextEvent<Record<string, string>>(client, "server:deleted"));
      for (const client of clients) client.emit("subscribe", { channelIds: [ids.textChannelId] });
      await expect(emitWithAck<{ ok: boolean }>(firstConnection.client, "voice:join", {
        serverId: ids.serverId,
        channelId: ids.voiceChannelId,
      })).resolves.toMatchObject({ ok: true });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/servers/${ids.serverId}`)
        .set("Cookie", ownerCookies)
        .set("X-CSRF-Token", ownerToken);
      expect(response.status).toBe(200);

      for (const event of await Promise.all(deletedEvents)) {
        expect(event).toEqual({ serverId: ids.serverId });
        expect(Object.keys(event)).toEqual(["serverId"]);
      }
      await expect(prisma.client.server.findUnique({ where: { id: ids.serverId } })).resolves.toBeNull();

      for (const client of clients) {
        const serverSocket = getServerSocket(client.id);
        expect(serverSocket).toBeDefined();
        expect(serverSocket!.rooms.has(`server:${ids.serverId}`)).toBe(false);
        expect(serverSocket!.rooms.has(`channel:${ids.textChannelId}`)).toBe(false);
        expect(serverSocket!.rooms.has(`voice:${ids.voiceChannelId}`)).toBe(false);
      }

      ownerConnection.cleanup();
      firstConnection.cleanup();
      secondConnection.cleanup();
    },
    WS_TIMEOUT + 15000,
  );
});
