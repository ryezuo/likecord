import * as argon2 from "argon2";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PERMISSIONS } from "../src/server/guards/permission.service";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

// ── Mock store for simulated R2/S3 ──
const mockStore = new Map<string, { size: number; contentType: string; body: Buffer }>();
const accessDeniedKeys = new Set<string>();
const sdkErrorKeys = new Set<string>();
const signingErrorKeys = new Set<string>();
const headKeys: string[] = [];
const rangeKeys: string[] = [];

// ── Mock AWS SDK modules ──
jest.mock("@aws-sdk/client-s3", () => {
  function MakeMockCommand(this: any, name: string, config: any) {
    Object.assign(this, config);
    this._cmd = name;
  }

  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation(async (command: any) => {
        const cmdName = (command as any)._cmd as string;

        if (cmdName === "HeadObjectCommand") {
          const key = (command as any).Key as string;
          headKeys.push(key);
          if (accessDeniedKeys.has(key)) {
            const err: any = new Error("AccessDenied");
            err.name = "AccessDenied";
            err.$metadata = { httpStatusCode: 403 };
            throw err;
          }
          if (sdkErrorKeys.has(key)) {
            throw new Error("Unexpected SDK failure");
          }
          const stored = mockStore.get(key);
          if (!stored) {
            const err: any = new Error("NotFound");
            err.name = "NotFound";
            err.$metadata = { httpStatusCode: 404 };
            throw err;
          }
          return { ContentLength: stored.size, ContentType: stored.contentType };
        }

        if (cmdName === "GetObjectCommand") {
          const key = (command as any).Key as string;
          const range = (command as any).Range as string | undefined;
          if (range) rangeKeys.push(key);
          const stored = mockStore.get(key);
          if (!stored) {
            const err: any = new Error("NoSuchKey");
            err.name = "NoSuchKey";
            err.$metadata = { httpStatusCode: 404 };
            throw err;
          }
          let body = stored.body;
          if (range) {
            const m = range.match(/bytes=(\d+)-(\d+)/);
            if (m) {
              body = body.slice(parseInt(m[1], 10), parseInt(m[2], 10) + 1);
            }
          }
          return {
            Body: (async function*() { yield body; })(),
            ContentType: stored.contentType,
          };
        }

        if (cmdName === "PutObjectCommand") {
          const key = (command as any).Key as string;
          const body = (command as any).Body;
          const ct = (command as any).ContentType || "application/octet-stream";
          const buf = Buffer.isBuffer(body) ? body : Buffer.from([]);
          mockStore.set(key, { size: buf.length, contentType: ct, body: buf });
          return {};
        }

        if (cmdName === "DeleteObjectCommand") {
          const key = (command as any).Key as string;
          mockStore.delete(key);
          return {};
        }

        return {};
      }),
    })),
    PutObjectCommand: jest.fn().mockImplementation(function (this: any, config: any) { MakeMockCommand.call(this, "PutObjectCommand", config); }),
    GetObjectCommand: jest.fn().mockImplementation(function (this: any, config: any) { MakeMockCommand.call(this, "GetObjectCommand", config); }),
    HeadObjectCommand: jest.fn().mockImplementation(function (this: any, config: any) { MakeMockCommand.call(this, "HeadObjectCommand", config); }),
    DeleteObjectCommand: jest.fn().mockImplementation(function (this: any, config: any) { MakeMockCommand.call(this, "DeleteObjectCommand", config); }),
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockImplementation((_client: any, command: any, _options: any) => {
    const cmdName = (command as any)._cmd;
    if (cmdName === "GetObjectCommand" && signingErrorKeys.has((command as any).Key)) {
      return Promise.reject(new Error("Induced signing failure"));
    }
    if (cmdName === "PutObjectCommand") return Promise.resolve("https://fake-r2.example.com/upload/" + (command as any).Key);
    if (cmdName === "GetObjectCommand") return Promise.resolve("https://fake-r2.example.com/download/" + (command as any).Key);
    return Promise.resolve("https://fake-r2.example.com/presigned");
  }),
}));

describe("R2 Upload Flow (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let serverId: string;
  let channelId: string;
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let userC: { id: string; email: string };
  let userACookies: string[];
  let userAToken: string;
  let userBCookies: string[];
  let userBToken: string;
  let everyoneRoleId: string;

  const everyonePermissions =
    PERMISSIONS.VIEW_CHANNEL |
    PERMISSIONS.SEND_MESSAGES |
    PERMISSIONS.ATTACH_FILES |
    PERMISSIONS.READ_MESSAGE_HISTORY |
    PERMISSIONS.CONNECT |
    PERMISSIONS.SPEAK |
    PERMISSIONS.CREATE_INVITE;

  beforeAll(async () => {
    process.env.STORAGE_DRIVER = "r2";
    process.env.R2_ACCOUNT_ID = "r2-upload-test-account";
    process.env.R2_ACCESS_KEY_ID = "r2-upload-test-key";
    process.env.R2_SECRET_ACCESS_KEY = "r2-upload-test-secret";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    app.enableCors({ origin: ["https://client.test"], credentials: true });
    await app.init();

    prisma = app.get(PrismaService);
    await cleanDatabase(prisma);

    const hash = await argon2.hash("test1234", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const uA = await prisma.client.user.create({
      data: { email: "usera@r2.test", username: "usera", displayName: "User A", passwordHash: hash },
    });
    const uB = await prisma.client.user.create({
      data: { email: "userb@r2.test", username: "userb", displayName: "User B", passwordHash: hash },
    });
    const uC = await prisma.client.user.create({
      data: { email: "userc@r2.test", username: "userc", displayName: "User C", passwordHash: hash },
    });
    userA = { id: uA.id, email: uA.email };
    userB = { id: uB.id, email: uB.email };
    userC = { id: uC.id, email: uC.email };

    const server = await prisma.client.server.create({
      data: { name: "R2 Test Server", ownerId: userA.id },
    });
    serverId = server.id;

    await prisma.client.member.create({ data: { serverId, userId: userA.id } });
    await prisma.client.member.create({ data: { serverId, userId: userB.id } });

    const everyoneRole = await prisma.client.role.create({
      data: {
        serverId, name: "@everyone",
        permissions: everyonePermissions,
        position: 0, isDefault: true, isMentionable: false,
      },
    });
    everyoneRoleId = everyoneRole.id;

    const channel = await prisma.client.channel.create({
      data: { serverId, type: "TEXT", name: "general", position: 0 },
    });
    channelId = channel.id;

    const loginA = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "userA@r2.test", password: "test1234" })
      .expect(201);
    userACookies = loginA.headers["set-cookie"];
    userAToken = extractCsrf(userACookies);

    const loginB = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "userB@r2.test", password: "test1234" })
      .expect(201);
    userBCookies = loginB.headers["set-cookie"];
    userBToken = extractCsrf(userBCookies);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(() => {
    mockStore.clear();
    accessDeniedKeys.clear();
    sdkErrorKeys.clear();
    signingErrorKeys.clear();
    headKeys.length = 0;
    rangeKeys.length = 0;
  });

  async function createLinkedAttachment(fileName: string) {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName, mimeType: "image/png", fileSize: 512 })
      .expect(201);
    const attachmentId = prepareRes.body.attachmentId as string;
    const key = prepareRes.body.key as string;
    const body = Buffer.alloc(512);
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(body);
    mockStore.set(key, { size: body.length, contentType: "image/png", body });
    await prisma.client.attachment.update({ where: { id: attachmentId }, data: { processed: true } });
    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ content: fileName, attachmentIds: [attachmentId] })
      .expect(201);
    return { attachmentId, key };
  }

  // ── Prepare with R2 ──

  it("prepare with R2 provider returns presigned upload URL", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "test.png", mimeType: "image/png", fileSize: 1024 })
      .expect(201);

    expect(res.body.attachmentId).toBeDefined();
    expect(res.body.uploadUrl).toContain("fake-r2.example.com/upload/");
    expect(res.body.key).toBeDefined();
    expect(res.body.expiresIn).toBeDefined();

    const dbAttachment = await prisma.client.attachment.findUnique({ where: { id: res.body.attachmentId } });
    expect(dbAttachment).toBeDefined();
    expect(dbAttachment!.fileName).toBe("test.png");
    expect(dbAttachment!.mimeType).toBe("image/png");
    expect(dbAttachment!.processed).toBe(false);
  });

  // ── Key is server-generated ──

  it("server-generated key contains user ID prefix", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "doc.pdf", mimeType: "application/pdf", fileSize: 2048 })
      .expect(201);

    const key: string = res.body.key;
    expect(key).toContain(`attachments/${userA.id}/`);
    expect(key).toMatch(/\.pdf$/);

    const attachment = await prisma.client.attachment.findUnique({ where: { id: res.body.attachmentId } });
    expect(attachment!.s3Key).toBe(key);
  });

  // ── Complete: ownership enforcement ──

  it("User B cannot complete User A's upload", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "own.png", mimeType: "image/png", fileSize: 500 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userBCookies)
      .set("X-CSRF-Token", userBToken)
      .expect(403);
  });

  // ── Complete: HeadObject genuine not-found → NOT_UPLOADED ──

  it("HeadObject real not-found (object never uploaded) → NOT_UPLOADED", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "missing.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;

    // Mirrors the real R2 flow: no server-side /upload call, processed stays false.

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(400);

    expect(res.body.error.code).toBe("NOT_UPLOADED");
  });

  // ── Complete: MIME metadata mismatch → reject ──

  it("MIME metadata mismatch (declared png but stored jpeg) → reject", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "fake.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    // Store file with incompatible content-type (text/plain vs declared image/png)
    const body = Buffer.alloc(512, 0x41);
    mockStore.set(key, { size: 512, contentType: "text/plain", body });

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(400);

    expect(res.body.error.code).toBe("MIME_MISMATCH");
  });

  // ── Complete: successful validation → COMPLETE ──

  it("successful validation with valid PNG → complete returns attachment info", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "valid.png", mimeType: "image/png", fileSize: 1024 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    // Create a valid PNG with correct magic bytes
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(1024);
    pngHeader.copy(body);
    mockStore.set(key, { size: 1024, contentType: "image/png", body });

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    expect(res.body.id).toBe(attachmentId);
    expect(res.body.fileName).toBe("valid.png");
    expect(res.body.fileSize).toBe(1024);
    expect(res.body.mimeType).toBe("image/png");
  });

  // ── Complete: size updated on mismatch ──

  it("HEAD size differs from declared → fileSize is updated", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "big.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    // Actual file is 500 bytes
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(500);
    pngHeader.copy(body);
    mockStore.set(key, { size: 500, contentType: "image/png", body });

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    expect(res.body.fileSize).toBe(500);
  });

  // ── Regression: R2 complete without the /upload proxy (the real production flow) ──

  it("complete succeeds WITHOUT /upload proxy when the object exists in R2 (regression: NOT_UPLOADED)", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "direct.png", mimeType: "image/png", fileSize: 1024 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(1024);
    pngHeader.copy(body);
    mockStore.set(key, { size: 1024, contentType: "image/png", body });

    // Deliberately do NOT set processed=true: the browser PUT directly to R2,
    // the API never proxied bytes through /upload, so the DB flag is still false.

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    expect(res.body.id).toBe(attachmentId);
    expect(res.body.fileName).toBe("direct.png");
    expect(res.body.fileSize).toBe(1024);
    expect(res.body.mimeType).toBe("image/png");

    const dbAttachment = await prisma.client.attachment.findUnique({ where: { id: attachmentId } });
    expect(dbAttachment!.processed).toBe(true);
  });

  // ── Provider consistency: /complete uses R2, never LocalStorageProvider ──

  it("complete uses the R2 provider selected at startup, not the local provider", async () => {
    const { StorageService } = await import("../src/storage/storage.service");
    const storage = app.get(StorageService);
    expect(storage.getProvider()).toBe("r2");
  });

  // ── Key consistency: prepare key == persisted key == key used by HEAD and Range ──

  it("exact key returned by prepare is the exact key persisted and used by complete HEAD/Range", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "keycheck.png", mimeType: "image/png", fileSize: 512 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key: string = prepareRes.body.key;

    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(512);
    pngHeader.copy(body);
    mockStore.set(key, { size: 512, contentType: "image/png", body });

    await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    const dbAttachment = await prisma.client.attachment.findUnique({ where: { id: attachmentId } });
    expect(dbAttachment!.s3Key).toBe(key);
    expect(headKeys).toContain(key);
    expect(rangeKeys).toContain(key);
    expect(headKeys).toHaveLength(1);
    expect(rangeKeys).toHaveLength(1);
  });

  // ── Error differentiation: AccessDenied must NOT become NOT_UPLOADED ──

  it("HeadObject AccessDenied (403) is a storage error, not NOT_UPLOADED", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "denied.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    accessDeniedKeys.add(prepareRes.body.key);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(500);

    expect(res.body.error.code).toBe("STORAGE_ERROR");
    expect(res.body.error.code).not.toBe("NOT_UPLOADED");
  });

  // ── Error differentiation: unexpected SDK error must NOT become NOT_UPLOADED ──

  it("HeadObject unexpected SDK error is a storage error, not NOT_UPLOADED", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "sdkfail.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    sdkErrorKeys.add(prepareRes.body.key);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(500);

    expect(res.body.error.code).toBe("STORAGE_ERROR");
    expect(res.body.error.code).not.toBe("NOT_UPLOADED");
  });

  // ── Download: non-COMPLETE attachment cannot be downloaded ──

  it("attachment download cache boundary covers authentication and route validation before the controller", async () => {
    const attachmentId = "00000000-0000-4000-8000-000000000001";
    const unauthenticated = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .expect(401);
    expect(unauthenticated.headers["cache-control"]).toBe("private, no-store");

    const invalidParam = await request(app.getHttpServer())
      .get("/api/v1/attachments/not-a-uuid/download")
      .set("Cookie", userACookies)
      .expect(400);
    expect(invalidParam.headers["cache-control"]).toBe("private, no-store");
  });

  it("attachment download cache boundary covers a revoked logical session", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: userC.email, password: "test1234" })
      .expect(201);
    const cookies = login.headers["set-cookie"];
    const session = await prisma.client.refreshSession.findFirstOrThrow({
      where: { userId: userC.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    await prisma.client.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const response = await request(app.getHttpServer())
      .get("/api/v1/attachments/00000000-0000-4000-8000-000000000001/download")
      .set("Cookie", cookies)
      .expect(401);
    expect(response.body.error.code).toBe("SESSION_INVALID");
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("non-processed attachment cannot be downloaded", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "noproc.png", mimeType: "image/png", fileSize: 100 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", userACookies)
      .expect(404);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("missing attachment download is private and non-storable", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/attachments/00000000-0000-4000-8000-000000000002/download")
      .set("Cookie", userACookies)
      .expect(404);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  // ── Download: authorized member gets URL ──

  it("authorized member gets download URL for completed attachment", async () => {
    // Prepare, upload, complete
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "dl.png", mimeType: "image/png", fileSize: 512 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(512);
    pngHeader.copy(body);
    mockStore.set(key, { size: 512, contentType: "image/png", body });

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    // Link attachment to a message
    const msgRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ content: "test message", attachmentIds: [attachmentId] })
      .expect(201);

    // Download as user B (also a member)
    const downloadRes = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", userBCookies)
      .set("Origin", "https://client.test")
      .expect(302);

    expect(downloadRes.headers.location).toContain("fake-r2.example.com/download/");
    expect(downloadRes.headers["cache-control"]).toBe("private, no-store");
    expect(downloadRes.headers.vary.split(/,\s*/)).toEqual(expect.arrayContaining(["Origin", "Accept"]));
  });

  // ── Download: unauthorized non-member gets denied ──

  it("unauthorized non-member gets download denied", async () => {
    // Prepare, upload, complete as user A
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "secret.png", mimeType: "image/png", fileSize: 512 })
      .expect(201);

    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;

    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const body = Buffer.alloc(512);
    pngHeader.copy(body);
    mockStore.set(key, { size: 512, contentType: "image/png", body });

    await prisma.client.attachment.update({
      where: { id: attachmentId },
      data: { processed: true },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);

    // Link attachment to a message
    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ content: "test", attachmentIds: [attachmentId] })
      .expect(201);

    // Login as user C (not a member of the server)
    const loginC = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "userC@r2.test", password: "test1234" })
      .expect(201);
    const userCCookies = loginC.headers["set-cookie"];

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", userCCookies)
      .expect(403);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("attachment download cache boundary covers VIEW_CHANNEL and READ_MESSAGE_HISTORY denials", async () => {
    const { attachmentId } = await createLinkedAttachment("permissions.png");
    try {
      await prisma.client.role.update({
        where: { id: everyoneRoleId },
        data: { permissions: everyonePermissions & ~PERMISSIONS.VIEW_CHANNEL },
      });
      const noView = await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set("Cookie", userBCookies)
        .expect(403);
      expect(noView.body.error.code).toBe("MISSING_PERMISSION");
      expect(noView.headers["cache-control"]).toBe("private, no-store");

      await prisma.client.role.update({
        where: { id: everyoneRoleId },
        data: { permissions: everyonePermissions & ~PERMISSIONS.READ_MESSAGE_HISTORY },
      });
      const noHistory = await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set("Cookie", userBCookies)
        .expect(403);
      expect(noHistory.body.error.code).toBe("MISSING_PERMISSION");
      expect(noHistory.headers["cache-control"]).toBe("private, no-store");
    } finally {
      await prisma.client.role.update({
        where: { id: everyoneRoleId },
        data: { permissions: everyonePermissions },
      });
    }
  });

  it("attachment download cache boundary covers signing failures", async () => {
    const { attachmentId, key } = await createLinkedAttachment("signing-error.png");
    signingErrorKeys.add(key);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", userACookies)
      .expect(500);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("F.4 message delete actively removes the R2 object before its Attachment row", async () => {
    const prepareRes = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ fileName: "delete-me.png", mimeType: "image/png", fileSize: 512 })
      .expect(201);
    const attachmentId = prepareRes.body.attachmentId;
    const key = prepareRes.body.key;
    const body = Buffer.alloc(512);
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(body);
    mockStore.set(key, { size: body.length, contentType: "image/png", body });

    await request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(201);
    const message = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .send({ content: "purge R2", attachmentIds: [attachmentId] })
      .expect(201);

    expect(mockStore.has(key)).toBe(true);
    await request(app.getHttpServer())
      .delete(`/api/v1/messages/${message.body.message.id}`)
      .set("Cookie", userACookies)
      .set("X-CSRF-Token", userAToken)
      .expect(200, { messageId: message.body.message.id, channelId });

    expect(mockStore.has(key)).toBe(false);
    expect(await prisma.client.attachment.findUnique({ where: { id: attachmentId } })).toBeNull();
    expect(await prisma.client.message.findUnique({ where: { id: message.body.message.id } })).toMatchObject({
      content: "",
      deletedAt: expect.any(Date),
    });
  });
});
