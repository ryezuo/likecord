import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { io as ioClient } from "socket.io-client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { VoiceService } from "../src/voice/voice.service";
import { cleanDatabase } from "./helpers";
import * as argon2 from "argon2";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

const WS_TIMEOUT = 25000;

function connectClient(port: number, accessToken: string): Promise<{ client: any; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://localhost:${port}`, {
      path: "/api/v1/ws",
      transports: ["websocket"],
      forceNew: true,
      query: { access_token: accessToken },
    });
    const timeout = setTimeout(() => {
      try { client.close(); } catch { /* */ }
      reject(new Error("WebSocket readiness timeout"));
    }, 5000);
    client.on("ws:ready", () => {
      clearTimeout(timeout);
      resolve({ client, cleanup: () => { try { client.close(); } catch { /* */ } } });
    });
    client.on("connect_error", (error) => {
      clearTimeout(timeout);
      try { client.close(); } catch { /* */ }
      reject(error);
    });
  });
}

describe("Screen Share (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let appPort: number;
  let serverId: string;
  let voiceChannelId: string;
  let ownerId: string;
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let userACookies: string[];
  let userBCookies: string[];
  let ownerCookies: string[];
  let userAToken: string;
  let userBToken: string;
  let userCToken: string;
  const trackedClients: Array<{ cleanup: () => void }> = [];

  function trackClient(result: { client: any; cleanup: () => void }) {
    trackedClients.push(result);
    return result;
  }

  function waitForEvent(client: any, event: string, check: (data: any) => void = () => {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), WS_TIMEOUT);
      client.once(event, (data: any) => {
        try {
          check(data);
          clearTimeout(timeout);
          resolve(data);
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  async function joinVoice(client: any): Promise<void> {
    const state = waitForEvent(client, "voice:state", (data) => expect(data.channelId).toBe(voiceChannelId));
    client.emit("voice:join", { serverId, channelId: voiceChannelId });
    await state;
  }

  async function startShare(client: any, presenterId: string): Promise<string> {
    const started = waitForEvent(client, "screen:share-started", (data) => expect(data.presenterId).toBe(presenterId));
    client.emit("screen:share-start", { channelId: voiceChannelId });
    return (await started).shareId;
  }

  async function stopShare(client: any, shareId: string): Promise<void> {
    const stopped = waitForEvent(client, "screen:share-stopped", (data) => expect(data.shareId).toBe(shareId));
    client.emit("screen:share-stop", { channelId: voiceChannelId, shareId });
    await stopped;
  }

  async function joinShare(client: any, shareId: string): Promise<void> {
    const joined = waitForEvent(client, "screen:viewer-joined");
    client.emit("screen:viewer-join", { shareId });
    await joined;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

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
      data: { email: "sowner@test.com", username: "sowner", displayName: "SOwner", passwordHash: hash },
    });
    ownerId = owner.id;

    const a = await prisma.client.user.create({
      data: { email: "sa@test.com", username: "screena", displayName: "ScreenA", passwordHash: hash },
    });
    userAId = a.id;

    const b = await prisma.client.user.create({
      data: { email: "sb@test.com", username: "screenb", displayName: "ScreenB", passwordHash: hash },
    });
    userBId = b.id;

    const c = await prisma.client.user.create({
      data: { email: "sc@test.com", username: "screenc", displayName: "ScreenC", passwordHash: hash },
    });
    userCId = c.id;

    const sv = await prisma.client.server.create({ data: { name: "ScreenTest", ownerId: owner.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });
    await prisma.client.member.create({ data: { serverId: sv.id, userId: a.id } });
    await prisma.client.member.create({ data: { serverId: sv.id, userId: b.id } });
    await prisma.client.member.create({ data: { serverId: sv.id, userId: c.id } });
    await prisma.client.role.create({
      data: { serverId: sv.id, name: "@everyone",
        permissions: BigInt(0x1000 | 0x800 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1 | 0x10 | 0x20),
        position: 0, isDefault: true, isMentionable: false },
    });
    voiceChannelId = (await prisma.client.channel.create({
      data: { serverId: sv.id, type: "VOICE", name: "ScreenVC", position: 0 },
    })).id;

    const oLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "sowner@test.com", password: "pass" });
    ownerCookies = oLogin.headers["set-cookie"];

    const aLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "sa@test.com", password: "pass" });
    userACookies = aLogin.headers["set-cookie"];
    userAToken = userACookies.find((c: string) => c.startsWith("access_token="))!.split(";")[0].split("=")[1];

    const bLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "sb@test.com", password: "pass" });
    userBCookies = bLogin.headers["set-cookie"];
    userBToken = userBCookies.find((c: string) => c.startsWith("access_token="))!.split(";")[0].split("=")[1];

    const cLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "sc@test.com", password: "pass" });
    const userCCookies = cLogin.headers["set-cookie"];
    userCToken = userCCookies.find((cookie: string) => cookie.startsWith("access_token="))!.split(";")[0].split("=")[1];
  }, 25000);

  afterAll(async () => {
    trackedClients.forEach((c) => { try { c.cleanup(); } catch { /* */ } });
    trackedClients.length = 0;
    await cleanDatabase(prisma);
    await app.close();
  });

  // SCREEN-01: Voice participant starts screen share → accepted
  it("voice participant starts Screen Share and becomes presenter", async () => {
    const { client, cleanup } = await connectClient(appPort, userAToken);

    // Simulate voice join
    client.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    const startedPromise = new Promise<void>((resolve, reject) => {
      client.on("screen:share-started", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          expect(data.channelId).toBe(voiceChannelId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    client.emit("screen:share-start", { channelId: voiceChannelId });
    await startedPromise;
    cleanup();
  }, WS_TIMEOUT + 5000);

  // MULTI-01 + MULTI-02: A and B share simultaneously; state lists both
  it("MULTI-01/02: two users share simultaneously and both appear in state", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    // A starts sharing → accepted
    const aStarted = new Promise<void>((resolve, reject) => {
      clientA.on("screen:share-started", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          expect(data.shareId).toBeDefined();
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });
    clientA.emit("screen:share-start", { channelId: voiceChannelId });
    await aStarted;

    // B starts sharing in same channel → accepted (not rejected)
    const bStarted = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-started", (data: any) => {
        try {
          expect(data.presenterId).toBe(userBId);
          expect(data.shareId).toBeDefined();
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });
    clientB.emit("screen:share-start", { channelId: voiceChannelId });
    await bStarted;

    // MULTI-02: state lists both shares
    const statePromise = new Promise<void>((resolve, reject) => {
      clientA.on("screen:share-state", (data: any) => {
        try {
          const presenters = data.shares.map((s: any) => s.presenterId);
          expect(presenters).toContain(userAId);
          expect(presenters).toContain(userBId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });
    clientA.emit("screen:share-state", { channelId: voiceChannelId });
    await statePromise;

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 15000);

  // SCREEN-03: Non-voice participant rejected
  it("non-voice participant rejected from starting screen share", async () => {
    const { client, cleanup } = await connectClient(appPort, userAToken);

    // User A is not in voice → share-start should be ignored (handler checks voiceChannel)
    let errorReceived = false;
    client.on("screen:share-error", () => { errorReceived = true; });
    client.on("screen:share-started", () => { errorReceived = true; });

    client.emit("screen:share-start", { channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1500));

    // Non-voice user should not receive any screen share events
    expect(errorReceived).toBe(false);
    cleanup();
  }, WS_TIMEOUT);

  // SCREEN-04: Non-presenter stop ignored
  it("non-presenter cannot stop someone else's share", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    // A starts sharing
    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    let bStoppedReceived = false;
    // B should NOT receive share-stopped from their own invalid stop attempt
    clientB.on("screen:share-stopped", () => { bStoppedReceived = true; });
    clientB.emit("screen:share-stop", { channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    expect(bStoppedReceived).toBe(false);

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-05: Presenter stops → cleared
  it("LIFE-PRES-01: presenter stops normally and state is cleared", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    // A starts
    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    // B should see share-stopped when A stops
    const stopPromise = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientA.emit("screen:share-stop", { channelId: voiceChannelId });
    await stopPromise;

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-07: Presenter leaves voice → cleared
  it("LIFE-PRES-02: presenter leaves voice and screen share is cleared", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    const stopPromise = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", () => resolve());
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientA.emit("voice:leave", { channelId: voiceChannelId });
    await stopPromise;

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-10: After stop, new user can become presenter
  it("LIFE-PRES-04: presenter can start a clean new share afterward", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    // B starts (no existing presenter after cleanup)
    const startedPromise = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-started", (data: any) => {
        try {
          expect(data.presenterId).toBe(userBId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientB.emit("screen:share-start", { channelId: voiceChannelId });
    await startedPromise;

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 5000);

  // SCREEN-09: Late join gets presenter state
  it("late joiner receives current presenter state", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    // B joins late
    const statePromise = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-state", (data: any) => {
        try {
          const presenters = (data.shares || []).map((s: any) => s.presenterId);
          expect(presenters).toContain(userAId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("screen:share-state", { channelId: voiceChannelId });
    await statePromise;

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-06: Socket disconnect clears presenter
  it("LIFE-PRES-03: presenter socket disconnect clears screen share", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    const shareStoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", () => resolve());
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientA.close(); // abrupt disconnect
    await shareStoppedP;
    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-06B: Same-user multi-tab disconnect must not clear the presenter socket's share
  it("SCREEN-06B: second socket disconnect keeps presenter socket's share active; presenter socket disconnect ends it", async () => {
    const voice = app.get(VoiceService);
    const { client: clientA1, cleanup: cleanupA1 } = await connectClient(appPort, userAToken);
    const { client: clientA2, cleanup: cleanupA2 } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA1.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientA2.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA1.on("screen:share-started", () => resolve());
      clientA1.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    // Redis ownership is socket-specific
    expect((await voice.findScreenShareByUser(voiceChannelId, userAId))?.presenterSocketId).toBe(clientA1.id);

    let bStopped = false;
    clientB.on("screen:share-stopped", () => { bStopped = true; });

    // A2 (same user, different socket) disconnects abruptly
    clientA2.close();
    await new Promise((r) => setTimeout(r, 1500));

    expect(bStopped).toBe(false);
    expect((await voice.findScreenShareByUser(voiceChannelId, userAId))?.presenterSocketId).toBe(clientA1.id);

    // A1 (the presenter socket) disconnects → share ends
    const stoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientA1.close();
    await stoppedP;

    expect(await voice.findScreenShareByUser(voiceChannelId, userAId)).toBeNull();
    cleanupA1();
    cleanupA2();
    cleanupB();
  }, WS_TIMEOUT + 15000);

  // SCREEN-04B: Cross-user stop is ignored and presenter ownership is unchanged
  it("SCREEN-04B: different user's socket cannot stop the presenter's share", async () => {
    const voice = app.get(VoiceService);
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    let bStopped = false;
    clientB.on("screen:share-stopped", () => { bStopped = true; });

    clientB.emit("screen:share-stop", { channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    expect(bStopped).toBe(false);
    expect((await voice.findScreenShareByUser(voiceChannelId, userAId))?.presenterSocketId).toBe(clientA.id);

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 10000);

  // SCREEN-04C: Same-user different-socket stop is ignored; presenter socket can stop
  it("SCREEN-04C: same-user second socket cannot stop; only the presenter socket can stop", async () => {
    const voice = app.get(VoiceService);
    const { client: clientA1, cleanup: cleanupA1 } = await connectClient(appPort, userAToken);
    const { client: clientA2, cleanup: cleanupA2 } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA1.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientA2.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA1.on("screen:share-started", () => resolve());
      clientA1.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    let bStopped = false;
    clientB.on("screen:share-stopped", () => { bStopped = true; });

    // A2 (same user, different socket) tries to stop A1's capture → ignored
    clientA2.emit("screen:share-stop", { channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    expect(bStopped).toBe(false);
    expect((await voice.findScreenShareByUser(voiceChannelId, userAId))?.presenterSocketId).toBe(clientA1.id);

    // A1 (the presenter socket) stops → cleared and broadcast
    const stoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    clientA1.emit("screen:share-stop", { channelId: voiceChannelId });
    await stoppedP;

    expect(await voice.findScreenShareByUser(voiceChannelId, userAId)).toBeNull();
    cleanupA1();
    cleanupA2();
    cleanupB();
  }, WS_TIMEOUT + 15000);

  // Stale cleanup: a former presenter's late disconnect must not clear a newly acquired presenter
  it("stale disconnect from former presenter cannot clear a newly acquired presenter", async () => {
    const voice = app.get(VoiceService);
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    // A stops explicitly
    const stoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", () => resolve());
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });
    clientA.emit("screen:share-stop", { channelId: voiceChannelId });
    await stoppedP;
    expect(await voice.findScreenShareByUser(voiceChannelId, userAId)).toBeNull();

    // B becomes the new presenter
    const startedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-started", () => resolve());
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });
    clientB.emit("screen:share-start", { channelId: voiceChannelId });
    await startedP;
    expect((await voice.findScreenShareByUser(voiceChannelId, userBId))?.presenterSocketId).toBe(clientB.id);

    // A's stale disconnect arrives afterwards
    let bStopped = false;
    clientB.on("screen:share-stopped", () => { bStopped = true; });
    clientA.close();
    await new Promise((r) => setTimeout(r, 1500));

    expect(bStopped).toBe(false);
    expect((await voice.findScreenShareByUser(voiceChannelId, userBId))?.presenterSocketId).toBe(clientB.id);

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 15000);

  it("VIEW-01: A presents and B joins A share", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    const joined = waitForEvent(b, "screen:viewer-joined", (data) => {
      expect(data).toEqual({ shareId, viewerId: userBId });
    });
    b.emit("screen:viewer-join", { shareId });
    await joined;
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([userBId]);
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-02: B joins A share twice and has one subscription", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    let presenterNotifications = 0;
    a.on("screen:viewer-joined", () => { presenterNotifications += 1; });
    const firstJoin = waitForEvent(b, "screen:viewer-joined");
    b.emit("screen:viewer-join", { shareId });
    await firstJoin;
    const duplicateJoin = waitForEvent(b, "screen:viewer-joined");
    b.emit("screen:viewer-join", { shareId });
    await duplicateJoin;
    await settle();
    expect(presenterNotifications).toBe(1);
    expect(await voice.listScreenShareSubscriptionsForSocket(b.id)).toEqual([shareId]);
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-03: B leaves A share and the subscription is removed", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    await joinShare(b, shareId);
    const left = waitForEvent(b, "screen:viewer-left", (data) => expect(data).toEqual({ shareId, viewerId: userBId }));
    b.emit("screen:viewer-leave", { shareId });
    await left;
    expect(await voice.listScreenShareSubscriptionsForSocket(b.id)).toEqual([]);
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-04: B outside A voice channel cannot join", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a);
    const shareId = await startShare(a, userAId);
    const rejected = waitForEvent(b, "screen:viewer-error", (data) => expect(data.code).toBe("SCREEN_VIEWER_NOT_ALLOWED"));
    b.emit("screen:viewer-join", { shareId });
    await rejected;
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([]);
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-05: B joins only A while A and C both present", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(b); await joinVoice(c);
    const aShareId = await startShare(a, userAId);
    const cShareId = await startShare(c, userCId);
    const joined = waitForEvent(b, "screen:viewer-joined"); b.emit("screen:viewer-join", { shareId: aShareId }); await joined;
    expect(await voice.listScreenShareViewerIds(aShareId)).toEqual([userBId]);
    expect(await voice.listScreenShareViewerIds(cShareId)).toEqual([]);
    await stopShare(a, aShareId); await stopShare(c, cShareId); closeA(); closeB(); closeC(); await settle();
  }, WS_TIMEOUT + 15000);

  it("VIEW-06: B joins A and C and both subscriptions coexist", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(b); await joinVoice(c);
    const aShareId = await startShare(a, userAId);
    const cShareId = await startShare(c, userCId);
    await joinShare(b, aShareId);
    await joinShare(b, cShareId);
    expect(new Set(await voice.listScreenShareSubscriptionsForSocket(b.id))).toEqual(new Set([aShareId, cShareId]));
    await stopShare(a, aShareId); await stopShare(c, cShareId); closeA(); closeB(); closeC(); await settle();
  }, WS_TIMEOUT + 15000);

  it("LIFE-VIEW-03: same-user unrelated socket disconnect does not affect active viewer", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b1, cleanup: closeB1 } = await connectClient(appPort, userBToken);
    const { client: b2, cleanup: closeB2 } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b1);
    const shareId = await startShare(a, userAId);
    await joinShare(b1, shareId);
    let voiceLeftEvents = 0;
    let viewerLeftEvents = 0;
    a.on("voice:user-left", (data: any) => { if (data.userId === userBId) voiceLeftEvents += 1; });
    a.on("screen:viewer-left", (data: any) => { if (data.viewerId === userBId) viewerLeftEvents += 1; });
    closeB2(); await settle();
    expect(await voice.listScreenShareSubscriptionsForSocket(b1.id)).toEqual([shareId]);
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([userBId]);
    expect(await voice.getVoiceState(voiceChannelId, userBId)).not.toBeNull();
    expect(voiceLeftEvents).toBe(0);
    expect(viewerLeftEvents).toBe(0);
    await stopShare(a, shareId); closeA(); closeB1(); await settle();
  }, WS_TIMEOUT + 10000);

  it("LIFE-VIEW-02: viewer owning socket disconnect removes its subscription", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    await joinShare(b, shareId);
    const presenterLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data).toEqual({ shareId, viewerId: userBId }));
    closeB(); await presenterLeft;
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([]);
    await stopShare(a, shareId); closeA(); await settle();
  }, WS_TIMEOUT + 10000);

  it("LIFE-VIEW-01: viewer leaves voice while subscribed", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    await joinShare(b, shareId);
    const presenterLeft = waitForEvent(a, "screen:viewer-left");
    b.emit("voice:leave", { channelId: voiceChannelId }); await presenterLeft;
    expect(await voice.listScreenShareSubscriptionsForSocket(b.id)).toEqual([]);
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("LIFE-MULTI-01: stopping A removes A viewers and preserves unrelated C share", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(b); await joinVoice(c);
    const aShareId = await startShare(a, userAId);
    const cShareId = await startShare(c, userCId);
    await joinShare(b, aShareId);
    await stopShare(a, aShareId);
    expect(await voice.listScreenShareViewerIds(aShareId)).toEqual([]);
    expect((await voice.getScreenShare(cShareId))?.presenterUserId).toBe(userCId);
    await stopShare(c, cShareId); closeA(); closeB(); closeC(); await settle();
  }, WS_TIMEOUT + 15000);

  it("VIEW-11: A receives viewer-joined with B identity and share ID", async () => {
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    const presenterJoined = waitForEvent(a, "screen:viewer-joined", (data) => expect(data).toEqual({ shareId, viewerId: userBId }));
    b.emit("screen:viewer-join", { shareId }); await presenterJoined;
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-12: A receives viewer-left with B identity and share ID", async () => {
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    await joinShare(b, shareId);
    const presenterLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data).toEqual({ shareId, viewerId: userBId }));
    b.emit("screen:viewer-leave", { shareId }); await presenterLeft;
    await stopShare(a, shareId); closeA(); closeB(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-13: B disconnecting while watching A notifies A", async () => {
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    await joinVoice(a); await joinVoice(b);
    const shareId = await startShare(a, userAId);
    await joinShare(b, shareId);
    const presenterLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data).toEqual({ shareId, viewerId: userBId }));
    closeB(); await presenterLeft;
    await stopShare(a, shareId); closeA(); await settle();
  }, WS_TIMEOUT + 10000);

  it("VIEW-14: A and C receive notifications only for their own shares", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(b); await joinVoice(c);
    const aShareId = await startShare(a, userAId);
    const cShareId = await startShare(c, userCId);
    const aJoined = waitForEvent(a, "screen:viewer-joined", (data) => expect(data).toEqual({ shareId: aShareId, viewerId: userBId }));
    b.emit("screen:viewer-join", { shareId: aShareId }); await aJoined;
    const cJoined = waitForEvent(c, "screen:viewer-joined", (data) => expect(data).toEqual({ shareId: cShareId, viewerId: userBId }));
    b.emit("screen:viewer-join", { shareId: cShareId }); await cJoined;
    const aLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data.shareId).toBe(aShareId));
    b.emit("screen:viewer-leave", { shareId: aShareId }); await aLeft;
    expect(await voice.listScreenShareSubscriptionsForSocket(b.id)).toEqual([cShareId]);
    const cLeft = waitForEvent(c, "screen:viewer-left", (data) => expect(data.shareId).toBe(cShareId));
    b.emit("screen:viewer-leave", { shareId: cShareId }); await cLeft;
    await stopShare(a, aShareId); await stopShare(c, cShareId); closeA(); closeB(); closeC(); await settle();
  }, WS_TIMEOUT + 15000);

  it("VIEW-15: viewer state returns current subscriptions and presenter viewers", async () => {
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: b, cleanup: closeB } = await connectClient(appPort, userBToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(b); await joinVoice(c);
    const aShareId = await startShare(a, userAId);
    const cShareId = await startShare(c, userCId);
    await joinShare(b, aShareId);
    await joinShare(b, cShareId);
    const viewerState = waitForEvent(b, "screen:viewer-state", (data) => expect(new Set(data.subscribedShareIds)).toEqual(new Set([aShareId, cShareId])));
    b.emit("screen:viewer-state"); await viewerState;
    const presenterState = waitForEvent(a, "screen:viewer-state", (data) => {
      expect(data.presenterShares).toContainEqual({ shareId: aShareId, viewerIds: [userBId], viewerCount: 1 });
    });
    a.emit("screen:viewer-state"); await presenterState;
    await stopShare(a, aShareId); await stopShare(c, cShareId); closeA(); closeB(); closeC(); await settle();
  }, WS_TIMEOUT + 15000);

  it("viewer kick and ban remove subscriptions and notify the presenter", async () => {
    const voice = app.get(VoiceService);
    const { client: a, cleanup: closeA } = await connectClient(appPort, userAToken);
    const { client: c, cleanup: closeC } = await connectClient(appPort, userCToken);
    await joinVoice(a); await joinVoice(c);
    const shareId = await startShare(a, userAId);
    await joinShare(c, shareId);
    const kickedLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data.viewerId).toBe(userCId));
    const cMember = await prisma.client.member.findUnique({ where: { serverId_userId: { serverId, userId: userCId } } });
    await request(app.getHttpServer()).delete(`/api/v1/servers/${serverId}/members/${cMember!.id}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", extractCsrf(ownerCookies)).expect(200);
    await kickedLeft;
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([]);
    closeC(); await settle();

    await prisma.client.member.create({ data: { serverId, userId: userCId } });
    const { client: cBan, cleanup: closeCBan } = await connectClient(appPort, userCToken);
    await joinVoice(cBan);
    await joinShare(cBan, shareId);
    const bannedLeft = waitForEvent(a, "screen:viewer-left", (data) => expect(data.viewerId).toBe(userCId));
    const cMemberForBan = await prisma.client.member.findUnique({ where: { serverId_userId: { serverId, userId: userCId } } });
    await request(app.getHttpServer()).post(`/api/v1/servers/${serverId}/members/${cMemberForBan!.id}/ban`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", extractCsrf(ownerCookies)).expect(200);
    await bannedLeft;
    expect(await voice.listScreenShareViewerIds(shareId)).toEqual([]);
    await stopShare(a, shareId); closeA(); closeCBan(); await settle();
  }, WS_TIMEOUT + 20000);

  // SCREEN-08A: Presenter kicked
  it("kicked presenter clears screen share", async () => {
    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });

    const shareStoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", () => resolve());
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    const aMember = await prisma.client.member.findFirst({ where: { serverId, userId: userAId } });
    await request(app.getHttpServer())
      .delete(`/api/v1/servers/${serverId}/members/${aMember!.id}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", extractCsrf(ownerCookies))
      .expect(200);

    await shareStoppedP;
    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 15000);

  // SCREEN-08B: Ban active presenter (independent from kick)
  it("SCREEN-08B: banned active presenter's screen share is cleared and cannot remain in voice", async () => {
    const voice = app.get(VoiceService);

    // Earlier tests may have kicked/deleted A's membership — re-create it for the ban scenario
    const member = await prisma.client.member.create({ data: { serverId, userId: userAId } });

    const { client: clientA, cleanup: cleanupA } = await connectClient(appPort, userAToken);
    const { client: clientB, cleanup: cleanupB } = await connectClient(appPort, userBToken);

    clientA.emit("voice:join", { serverId, channelId: voiceChannelId });
    clientB.emit("voice:join", { serverId, channelId: voiceChannelId });
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      clientA.on("screen:share-started", () => resolve());
      clientA.emit("screen:share-start", { channelId: voiceChannelId });
      setTimeout(() => resolve(), 2000);
    });
    expect((await voice.findScreenShareByUser(voiceChannelId, userAId))?.presenterSocketId).toBe(clientA.id);

    const shareStoppedP = new Promise<void>((resolve, reject) => {
      clientB.on("screen:share-stopped", (data: any) => {
        try {
          expect(data.presenterId).toBe(userAId);
          resolve();
        } catch (e) { reject(e); }
      });
      setTimeout(() => reject(new Error("Timeout")), WS_TIMEOUT);
    });

    // Owner bans A
    await request(app.getHttpServer())
      .post(`/api/v1/servers/${serverId}/members/${member.id}/ban`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", extractCsrf(ownerCookies))
      .expect(200);

    await shareStoppedP;

    // Presenter Redis state cleared
    expect(await voice.findScreenShareByUser(voiceChannelId, userAId)).toBeNull();
    // A cannot remain in voice
    expect(await voice.getVoiceState(voiceChannelId, userAId)).toBeNull();
    // Ban persisted
    const memberAfter = await prisma.client.member.findUnique({
      where: { serverId_userId: { serverId, userId: userAId } },
    });
    expect(memberAfter!.isBanned).toBe(true);

    cleanupA();
    cleanupB();
  }, WS_TIMEOUT + 15000);

});
