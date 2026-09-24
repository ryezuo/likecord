import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { io as ioClient } from "socket.io-client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("WebSocket Messaging (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let appPort: number;
  let channelA: string;
  let channelB: string;
  let ownerCookies: string[];
  let ownerToken: string;

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

    const hash = await argon2.hash("pass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const owner = await prisma.client.user.create({
      data: { email: "w@test.com", username: "wuser", displayName: "W", passwordHash: hash },
    });

    const sv = await prisma.client.server.create({ data: { name: "WSTest", ownerId: owner.id } });
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });
    await prisma.client.role.create({
      data: { serverId: sv.id, name: "@everyone", permissions: BigInt(0x1000 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1), position: 0, isDefault: true, isMentionable: false },
    });

    const chA = await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "chat-a", position: 0 } });
    channelA = chA.id;
    const chB = await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "chat-b", position: 1 } });
    channelB = chB.id;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "w@test.com", password: "pass" });
    ownerCookies = loginRes.headers["set-cookie"];
    ownerToken = extractCsrf(ownerCookies);
  }, 15000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const WS_TIMEOUT = 25000;

  function connectClient(withAuth = true): Promise<{ client: any; cleanup: () => void }> {
    return new Promise((resolve, reject) => {
      const cookie = withAuth ? ownerCookies.find((c: string) => c.startsWith("access_token=")) : "";
      const token = cookie ? cookie.split(";")[0].split("=")[1] : "";

      const query = withAuth ? { access_token: token } : {};
      const client = ioClient(`http://localhost:${appPort}`, {
        path: "/api/v1/ws",
        transports: ["websocket"],
        forceNew: true,
        query,
      });

      const timer = setTimeout(() => { client.close(); reject(new Error("WebSocket readiness timeout")); }, 5000);
      client.on("ws:ready", () => {
        clearTimeout(timer);
        resolve({ client, cleanup: () => { try { client.close(); } catch { /* ok */ } } });
      });
      client.on("connect_error", (error) => { clearTimeout(timer); client.close(); reject(error); });
    });
  }

  function sendMessage(): Promise<string> {
    return request(app.getHttpServer())
      .post(`/api/v1/channels/${channelA}/messages`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ content: `WS test ${Date.now()}` })
      .then((r: any) => r.body.message.id);
  }

  function editMessage(msgId: string): Promise<void> {
    return request(app.getHttpServer())
      .patch(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .send({ content: "Edited via WS test" })
      .then(() => {});
  }

  function deleteMessage(msgId: string): Promise<void> {
    return request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies)
      .set("X-CSRF-Token", ownerToken)
      .then(() => {});
  }

  it(
    "subscribed client receives message:created",
    async () => {
      const { client, cleanup } = await connectClient(true);
      const msgPromise = new Promise<void>((resolve, reject) => {
        client.on("message:created", (data: any) => {
          try {
            expect(data.message).toBeDefined();
            expect(data.message.content).toContain("WS test");
            resolve();
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for message:created")), WS_TIMEOUT);
      });

      client.emit("subscribe", { channelIds: [channelA] });
      await new Promise((r) => setTimeout(r, 1000));
      await sendMessage();
      await msgPromise;
      cleanup();
    },
    WS_TIMEOUT + 5000,
  );

  it(
    "unsubscribed client does not receive message:created",
    async () => {
      const { client, cleanup } = await connectClient(true);
      let received = false;
      client.on("message:created", () => { received = true; });

      // Don't subscribe
      await new Promise((r) => setTimeout(r, 500));
      await sendMessage();
      await new Promise((r) => setTimeout(r, 2000));
      expect(received).toBe(false);
      cleanup();
    },
    WS_TIMEOUT,
  );

  it(
    "another channel subscriber does not receive the event",
    async () => {
      const { client, cleanup } = await connectClient(true);
      client.emit("subscribe", { channelIds: [channelB] });
      let receivedOnB = false;
      client.on("message:created", () => { receivedOnB = true; });

      await new Promise((r) => setTimeout(r, 1000));
      await sendMessage(); // Sends to channelA
      await new Promise((r) => setTimeout(r, 2000));
      expect(receivedOnB).toBe(false);
      cleanup();
    },
    WS_TIMEOUT,
  );

  it(
    "edit emits message:updated",
    async () => {
      const { client, cleanup } = await connectClient(true);
      const updatePromise = new Promise<void>((resolve, reject) => {
        client.on("message:updated", (data: any) => {
          try {
            expect(data.message.content).toContain("Edited via WS test");
            resolve();
          } catch (e) { reject(e); }
        });
        setTimeout(() => reject(new Error("Timeout waiting for message:updated")), WS_TIMEOUT);
      });

      client.emit("subscribe", { channelIds: [channelA] });
      await new Promise((r) => setTimeout(r, 1000));
      const msgId = await sendMessage();
      await new Promise((r) => setTimeout(r, 500));
      await editMessage(msgId);
      await updatePromise;
      cleanup();
    },
    WS_TIMEOUT + 5000,
  );

  it(
    "delete emits the exact F.4 payload once and only to the correct Channel",
    async () => {
      const { client: channelAClient, cleanup: cleanupA } = await connectClient(true);
      const { client: channelBClient, cleanup: cleanupB } = await connectClient(true);
      let channelAEvents = 0;
      let channelBEvents = 0;
      const deletePromise = new Promise<any>((resolve, reject) => {
        channelAClient.on("message:deleted", (data: any) => {
          channelAEvents++;
          resolve(data);
        });
        channelBClient.on("message:deleted", () => { channelBEvents++; });
        setTimeout(() => reject(new Error("Timeout waiting for message:deleted")), WS_TIMEOUT);
      });

      channelAClient.emit("subscribe", { channelIds: [channelA] });
      channelBClient.emit("subscribe", { channelIds: [channelB] });
      await new Promise((r) => setTimeout(r, 1000));
      const msgId = await sendMessage();
      await new Promise((r) => setTimeout(r, 500));
      await deleteMessage(msgId);
      await expect(deletePromise).resolves.toEqual({ messageId: msgId, channelId: channelA });

      await deleteMessage(msgId);
      await new Promise((r) => setTimeout(r, 1000));
      expect(channelAEvents).toBe(1);
      expect(channelBEvents).toBe(0);
      cleanupA();
      cleanupB();
    },
    WS_TIMEOUT + 5000,
  );
});
