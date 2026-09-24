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
import { cleanDatabase } from "./helpers";

function csrf(cookies: string[]): string {
  return cookies.find((cookie: string) => cookie.startsWith("csrf_token="))?.split(";")[0].split("=")[1] || "";
}

describe("Channel lifecycle realtime synchronization (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let appPort: number;
  let serverId: string;
  let ownerCookies: string[];
  let ownerCsrf: string;
  let observerCookies: string[];
  let restrictedCookies: string[];
  let outsiderCookies: string[];

  const WS_TIMEOUT = 5000;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
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

    const passwordHash = await argon2.hash("channel-realtime-password", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const [owner, observer, restricted] = await Promise.all([
      prisma.client.user.create({ data: { email: "channel-owner@test.local", username: "channel-owner", displayName: "Channel Owner", passwordHash } }),
      prisma.client.user.create({ data: { email: "channel-observer@test.local", username: "channel-observer", displayName: "Channel Observer", passwordHash } }),
      prisma.client.user.create({ data: { email: "channel-restricted@test.local", username: "channel-restricted", displayName: "Channel Restricted", passwordHash } }),
    ]);
    await prisma.client.user.create({
      data: { email: "channel-outsider@test.local", username: "channel-outsider", displayName: "Channel Outsider", passwordHash },
    });
    const server = await prisma.client.server.create({ data: { name: "Channel Realtime", ownerId: owner.id } });
    serverId = server.id;

    const [observerMember] = await Promise.all([
      prisma.client.member.create({ data: { serverId, userId: observer.id } }),
      prisma.client.member.create({ data: { serverId, userId: owner.id } }),
      prisma.client.member.create({ data: { serverId, userId: restricted.id } }),
    ]);
    await prisma.client.role.create({
      data: { serverId, name: "@everyone", permissions: BigInt(0), position: 0, isDefault: true, isMentionable: false },
    });
    const observerRole = await prisma.client.role.create({
      data: { serverId, name: "Channel Viewer", permissions: BigInt(0x400), position: 1, isDefault: false, isMentionable: false },
    });
    await prisma.client.memberRole.create({ data: { memberId: observerMember.id, roleId: observerRole.id } });
    await prisma.client.channel.create({ data: { serverId, type: "TEXT", name: "general", position: 0 } });

    const [ownerLogin, observerLogin, restrictedLogin, outsiderLogin] = await Promise.all([
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "channel-owner@test.local", password: "channel-realtime-password" }),
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "channel-observer@test.local", password: "channel-realtime-password" }),
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "channel-restricted@test.local", password: "channel-realtime-password" }),
      request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "channel-outsider@test.local", password: "channel-realtime-password" }),
    ]);
    ownerCookies = ownerLogin.headers["set-cookie"];
    ownerCsrf = csrf(ownerCookies);
    observerCookies = observerLogin.headers["set-cookie"];
    restrictedCookies = restrictedLogin.headers["set-cookie"];
    outsiderCookies = outsiderLogin.headers["set-cookie"];
  }, 25000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  function connect(cookies: string[]): Promise<{ client: Socket; cleanup: () => void; readyPayload: Record<string, never> }> {
    return new Promise((resolve, reject) => {
      const accessCookie = cookies.find((cookie: string) => cookie.startsWith("access_token="));
      const accessToken = accessCookie?.split(";")[0].split("=")[1] || "";
      const client = ioClient(`http://localhost:${appPort}`, {
        path: "/api/v1/ws",
        transports: ["websocket"],
        forceNew: true,
        query: { access_token: accessToken },
      });
      const timer = setTimeout(() => {
        client.close();
        reject(new Error("Timed out connecting websocket client"));
      }, WS_TIMEOUT);
      client.once("ws:ready", (readyPayload: Record<string, never>) => {
        clearTimeout(timer);
        resolve({ client, readyPayload, cleanup: () => { try { client.close(); } catch { /* best effort */ } } });
      });
      client.once("connect_error", (error: Error) => {
        clearTimeout(timer);
        client.close();
        reject(error);
      });
    });
  }

  function rejectedConnection(accessToken?: string): Promise<{ error: { code: string; message: string }; receivedReady: boolean }> {
    return new Promise((resolve, reject) => {
      let authError: { code: string; message: string } | undefined;
      let receivedReady = false;
      const client = ioClient(`http://localhost:${appPort}`, {
        path: "/api/v1/ws",
        transports: ["websocket"],
        forceNew: true,
        query: accessToken ? { access_token: accessToken } : {},
      });
      const timer = setTimeout(() => {
        client.close();
        reject(new Error("Timed out waiting for websocket authentication rejection"));
      }, WS_TIMEOUT);
      client.on("ws:ready", () => { receivedReady = true; });
      client.on("error", (error: { code: string; message: string }) => { authError = error; });
      client.once("disconnect", () => {
        clearTimeout(timer);
        client.close();
        if (!authError) {
          reject(new Error("Websocket disconnected without an authentication error"));
          return;
        }
        resolve({ error: authError, receivedReady });
      });
      client.once("connect_error", (error: Error) => {
        clearTimeout(timer);
        client.close();
        reject(error);
      });
    });
  }

  function nextInvalidation(client: Socket): Promise<{ serverId: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.off("channels:changed", handler);
        reject(new Error("Timed out waiting for channels:changed"));
      }, WS_TIMEOUT);
      const handler = (data: { serverId: string }) => {
        clearTimeout(timer);
        client.off("channels:changed", handler);
        resolve(data);
      };
      client.on("channels:changed", handler);
    });
  }

  function expectNoInvalidation(client: Socket, waitMs = 350): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (data: unknown) => {
        client.off("channels:changed", handler);
        reject(new Error(`Unexpected channels:changed: ${JSON.stringify(data)}`));
      };
      client.on("channels:changed", handler);
      setTimeout(() => {
        client.off("channels:changed", handler);
        resolve();
      }, waitMs);
    });
  }

  function createChannel(name: string, type: "TEXT" | "VOICE" = "TEXT") {
    return request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ name, type });
  }

  it("CHANNEL-RT-01/02/04: observer receives metadata-free invalidations for Text and Voice creates", async () => {
    const { client, cleanup, readyPayload } = await connect(observerCookies);
    expect(readyPayload).toEqual({});

    const textEvent = nextInvalidation(client);
    const textCreate = await createChannel("realtime-text", "TEXT").expect(201);
    expect(await textEvent).toEqual({ serverId });

    const voiceEvent = nextInvalidation(client);
    const voiceCreate = await createChannel("realtime-voice", "VOICE").expect(201);
    expect(await voiceEvent).toEqual({ serverId });

    const list = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", observerCookies)
      .expect(200);
    expect(list.body.filter((channel: { id: string }) => channel.id === textCreate.body.id)).toHaveLength(1);
    expect(list.body.filter((channel: { id: string }) => channel.id === voiceCreate.body.id)).toHaveLength(1);
    cleanup();
  }, WS_TIMEOUT + 5000);

  it("CHANNEL-RT-READY-01/02: missing and invalid authentication never receive application readiness", async () => {
    const missing = await rejectedConnection();
    expect(missing).toEqual({
      error: { code: "AUTH_REQUIRED", message: "Missing access token" },
      receivedReady: false,
    });

    const invalid = await rejectedConnection("invalid-token");
    expect(invalid).toEqual({
      error: { code: "AUTH_FAILED", message: "Invalid token" },
      receivedReady: false,
    });
  }, WS_TIMEOUT + 5000);

  it("CHANNEL-RT-12/14: existing channel update and delete endpoints invalidate connected observers", async () => {
    const { client, cleanup } = await connect(observerCookies);
    const createEvent = nextInvalidation(client);
    const channel = await createChannel("lifecycle-target").expect(201);
    expect(await createEvent).toEqual({ serverId });

    const updateEvent = nextInvalidation(client);
    await request(app.getHttpServer())
      .patch(`/api/v1/channels/${channel.body.id}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ name: "lifecycle-renamed" })
      .expect(200);
    expect(await updateEvent).toEqual({ serverId });

    const deleteEvent = nextInvalidation(client);
    await request(app.getHttpServer())
      .delete(`/api/v1/channels/${channel.body.id}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .expect(200);
    expect(await deleteEvent).toEqual({ serverId });
    cleanup();
  }, WS_TIMEOUT + 5000);

  it("CHANNEL-RT-05/06/07: non-members receive nothing, no-view members receive an empty filtered list, and failed creates emit nothing", async () => {
    const [{ client: outsider, cleanup: cleanOutsider }, { client: restricted, cleanup: cleanRestricted }] = await Promise.all([
      connect(outsiderCookies),
      connect(restrictedCookies),
    ]);

    const outsiderSilence = expectNoInvalidation(outsider);
    const restrictedEvent = nextInvalidation(restricted);
    await createChannel("permission-safe").expect(201);
    await outsiderSilence;
    expect(await restrictedEvent).toEqual({ serverId });

    const restrictedList = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", restrictedCookies)
      .expect(200);
    expect(restrictedList.body).toEqual([]);

    const observer = await connect(observerCookies);
    const noEvent = expectNoInvalidation(observer.client);
    await createChannel("permission-safe").expect(400);
    await noEvent;

    observer.cleanup();
    cleanOutsider();
    cleanRestricted();
  }, WS_TIMEOUT + 5000);

  it("CHANNEL-RT-08/09/21: sequential lifecycle changes converge and a reconnected socket rejoins the server room", async () => {
    const first = await connect(observerCookies);
    expect(first.readyPayload).toEqual({});
    first.client.close();
    const { client, cleanup, readyPayload } = await connect(observerCookies);
    expect(readyPayload).toEqual({});

    const firstEvent = nextInvalidation(client);
    expect((await createChannel("sequential-one")).status).toBe(201);
    expect(await firstEvent).toEqual({ serverId });
    const secondEvent = nextInvalidation(client);
    expect((await createChannel("sequential-two")).status).toBe(201);
    expect(await secondEvent).toEqual({ serverId });

    const rapid = await createChannel("rapid-lifecycle").expect(201);
    const updateEvent = nextInvalidation(client);
    await request(app.getHttpServer())
      .patch(`/api/v1/channels/${rapid.body.id}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .send({ name: "rapid-lifecycle-renamed" })
      .expect(200);
    await updateEvent;
    const deleteEvent = nextInvalidation(client);
    await request(app.getHttpServer())
      .delete(`/api/v1/channels/${rapid.body.id}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerCsrf)
      .expect(200);
    await deleteEvent;

    const list = await request(app.getHttpServer())
      .get(`/api/v1/servers/${serverId}/channels`)
      .set("Cookie", observerCookies)
      .expect(200);
    expect(list.body.filter((channel: { id: string }) => channel.id === rapid.body.id)).toHaveLength(0);
    cleanup();
  }, WS_TIMEOUT + 10000);
});
