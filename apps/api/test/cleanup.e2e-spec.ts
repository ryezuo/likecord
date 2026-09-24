import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { RefreshCleanupService } from "../src/auth/refresh-cleanup.service";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { cleanDatabase } from "./helpers";

describe("Refresh Session Cleanup (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanupService: RefreshCleanupService;

  let userId: string;

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
    cleanupService = app.get(RefreshCleanupService);

    await cleanDatabase(prisma);

    const hash = await argon2.hash("test1234", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const user = await prisma.client.user.create({
      data: { email: "cleanup@test.com", username: "cleanupuser", displayName: "Cleanup User", passwordHash: hash },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.client.refreshSession.deleteMany();
  });

  // ── Helper: create a refresh session ──

  async function createSession(overrides: {
    userId?: string;
    expiresAt?: Date;
    revokedAt?: Date | null;
    tokenHash?: string;
  }) {
    const token = crypto.randomBytes(64).toString("hex");
    const tokenHash = overrides.tokenHash ?? crypto.createHash("sha256").update(token).digest("hex");
    return prisma.client.refreshSession.create({
      data: {
        userId: overrides.userId ?? userId,
        tokenHash,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: overrides.revokedAt ?? null,
      },
    });
  }

  // ── Expired session cleanup ──

  it("expired session is removed during cleanup", async () => {
    const session = await createSession({
      expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeNull();
  });

  // ── Old revoked session cleanup ──

  it("old revoked session (older than 7 days) is removed", async () => {
    const session = await createSession({
      revokedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeNull();
  });

  // ── Valid active session preserved ──

  it("valid active session is preserved during cleanup", async () => {
    const session = await createSession({
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      revokedAt: null,
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeDefined();
    expect(found!.tokenHash).toBe(session.tokenHash);
  });

  // ── Recent revoked session retained ──

  it("recent revoked session (less than 7 days) is retained", async () => {
    const session = await createSession({
      revokedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeDefined();
    expect(found!.revokedAt).toBeDefined();
  });

  // ── Mixed batch cleanup ──

  it("cleanup removes expired AND old revoked, keeps active AND recent revoked", async () => {
    const expired = await createSession({
      expiresAt: new Date(Date.now() - 1 * 60 * 1000),
    });
    const oldRevoked = await createSession({
      revokedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });
    const active = await createSession({
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    });
    const recentRevoked = await createSession({
      revokedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    expect(await prisma.client.refreshSession.count()).toBe(4);

    await (cleanupService as any).cleanup();

    expect(await prisma.client.refreshSession.count()).toBe(2);

    const expiredFound = await prisma.client.refreshSession.findUnique({ where: { id: expired.id } });
    expect(expiredFound).toBeNull();

    const oldRevokedFound = await prisma.client.refreshSession.findUnique({ where: { id: oldRevoked.id } });
    expect(oldRevokedFound).toBeNull();

    const activeFound = await prisma.client.refreshSession.findUnique({ where: { id: active.id } });
    expect(activeFound).toBeDefined();

    const recentFound = await prisma.client.refreshSession.findUnique({ where: { id: recentRevoked.id } });
    expect(recentFound).toBeDefined();
  });

  // ── Cleanup service can be initialized ──

  it("cleanup service can be initialized and runs without error", async () => {
    expect(cleanupService).toBeDefined();

    // The service's onModuleInit already ran. Cleanup itself shouldn't throw.
    await expect((cleanupService as any).cleanup()).resolves.toBeUndefined();
  });

  // ── Expired + revoked session is removed ──

  it("expired session that is also revoked is removed", async () => {
    const session = await createSession({
      expiresAt: new Date(Date.now() - 2 * 60 * 1000), // expired 2 min ago
      revokedAt: new Date(Date.now() - 1 * 60 * 1000), // revoked 1 min ago
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeNull();
  });

  // ── Session exactly at 7-day boundary is retained ──

  it("session revoked exactly 7 days ago is retained (not older than)", async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const session = await createSession({
      revokedAt: sevenDaysAgo,
    });

    await (cleanupService as any).cleanup();

    const found = await prisma.client.refreshSession.findUnique({ where: { id: session.id } });
    expect(found).toBeDefined();
  });
});
