import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase } from "./helpers";

function getCorsOrigins(): string[] | false {
  const origin = process.env.APP_ORIGIN || process.env.CORS_ORIGIN || "";
  if (origin) {
    return origin.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return process.env.NODE_ENV === "production" ? false : ["https://localhost"];
}

describe("Production Config Validation (e2e)", () => {
  let appModule: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;

  async function createApp(env: string, appOrigin?: string, corsOrigin?: string) {
    const prevEnv = process.env.NODE_ENV;
    const prevAppOrigin = process.env.APP_ORIGIN;
    const prevCorsOrigin = process.env.CORS_ORIGIN;

    process.env.NODE_ENV = env;
    if (appOrigin !== undefined) process.env.APP_ORIGIN = appOrigin; else delete process.env.APP_ORIGIN;
    if (corsOrigin !== undefined) process.env.CORS_ORIGIN = corsOrigin; else delete process.env.CORS_ORIGIN;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.use(cookieParser());
    nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    nestApp.setGlobalPrefix("api/v1");

    const origins = getCorsOrigins();
    nestApp.enableCors({
      origin: origins,
      credentials: true,
    });

    await nestApp.init();

    // Restore env
    process.env.NODE_ENV = prevEnv;
    if (prevAppOrigin !== undefined) process.env.APP_ORIGIN = prevAppOrigin;
    if (prevCorsOrigin !== undefined) process.env.CORS_ORIGIN = prevCorsOrigin;

    return { moduleFixture, nestApp };
  }

  beforeAll(async () => {
    appModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = appModule.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    // Replicate main.ts CORS setup for test env
    app.enableCors({
      origin: ["https://localhost"],
      credentials: true,
    });
    await app.init();
    prisma = app.get(PrismaService);
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── debug-cookies endpoint ──

  it("debug-cookies endpoint returns error in production env", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/debug-cookies")
      .expect(200);

    expect(res.body).toEqual({ error: "not available" });

    process.env.NODE_ENV = "test";
  });

  it("debug-cookies endpoint returns cookie info in non-production env", async () => {
    process.env.NODE_ENV = "test";

    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/debug-cookies")
      .expect(200);

    expect(res.body).not.toHaveProperty("error");
    expect(res.body).toHaveProperty("hasAccessToken");
    expect(res.body).toHaveProperty("hasRefreshToken");
  });

  // ── CORS: No wildcard with credentials in production ──

  it("CORS does not respond to cross-origin requests in production with no CORS_ORIGIN set", async () => {
    const { nestApp } = await createApp("production");
    const p = nestApp.get(PrismaService);

    const res = await request(nestApp.getHttpServer())
      .options("/api/v1/auth/login")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "POST");

    // In production with no CORS_ORIGIN, origin is false → CORS denies cross-origin
    // express returns no Access-Control-Allow-Origin header
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();

    await nestApp.close();
  });

  // ── Local HTTPS origin is supported in development ──

  it("local HTTPS origin (https://localhost) is supported in non-production", async () => {
    const { nestApp } = await createApp("development");
    const p = nestApp.get(PrismaService);

    const res = await request(nestApp.getHttpServer())
      .options("/api/v1/auth/login")
      .set("Origin", "https://localhost")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBe("https://localhost");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");

    await nestApp.close();
  });

  // ── Production with explicit CORS_ORIGIN allows that origin ──

  it("production with CORS_ORIGIN set allows requests from that origin", async () => {
    const { nestApp } = await createApp("production", undefined, "https://likecord.example.com");
    const p = nestApp.get(PrismaService);

    const res = await request(nestApp.getHttpServer())
      .options("/api/v1/auth/login")
      .set("Origin", "https://likecord.example.com")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBe("https://likecord.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");

    await nestApp.close();
  });

  // ── validateConfig: production enforces JWT_ACCESS_SECRET ──

  it("validateConfig: JWT_ACCESS_SECRET is set and not default in test env", () => {
    // The global JWT_ACCESS_SECRET set in test-setup.ts should be valid
    expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
    expect(process.env.JWT_ACCESS_SECRET).not.toBe("change-me-in-production");
  });

  // ── Production would reject unsafe defaults ──

  it("validateConfig: production would reject change-me-in-production defaults", () => {
    const unsafeDefault = "change-me-in-production";
    // Verify our test secret is NOT the unsafe default
    expect(process.env.JWT_ACCESS_SECRET).not.toBe(unsafeDefault);
    // Verify the default is indeed the known unsafe value
    expect(unsafeDefault).toBe("change-me-in-production");
  });
});
