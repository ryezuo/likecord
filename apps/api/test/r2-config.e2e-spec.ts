import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase } from "./helpers";

describe("R2 Configuration Validation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // ── STORAGE_DRIVER=local ──

  it("STORAGE_DRIVER=local works without R2 variables", async () => {
    process.env.STORAGE_DRIVER = "local";
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);
    expect(app).toBeDefined();

    const res = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);
    expect(res.body.status).toBe("ok");
  });

  // ── STORAGE_DRIVER=r2 missing credentials → falls back to local ──

  it("STORAGE_DRIVER=r2 with missing R2_SECRET_ACCESS_KEY falls back to local", async () => {
    process.env.STORAGE_DRIVER = "r2";
    process.env.R2_ACCOUNT_ID = "fake-account";
    process.env.R2_ACCESS_KEY_ID = "fake-key";
    delete process.env.R2_SECRET_ACCESS_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);

    const { StorageService } = await import("../src/storage/storage.service");
    const storage = app.get(StorageService);
    expect(storage.getProvider()).toBe("local");

    const res = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);
    expect(res.body.status).toBe("ok");
  });

  // ── Valid R2 config is accepted ──

  it("valid R2 config is accepted", async () => {
    process.env.STORAGE_DRIVER = "r2";
    process.env.R2_ACCOUNT_ID = "valid-account-id";
    process.env.R2_ACCESS_KEY_ID = "valid-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "valid-secret-key";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);

    const { StorageService } = await import("../src/storage/storage.service");
    const storage = app.get(StorageService);
    expect(storage.getProvider()).toBe("r2");

    const res = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);
    expect(res.body.status).toBe("ok");
  });

  // ── STORAGE_DRIVER unset defaults to local ──

  it("unset STORAGE_DRIVER defaults to local", async () => {
    delete process.env.STORAGE_DRIVER;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = app.get(PrismaService);

    const { StorageService } = await import("../src/storage/storage.service");
    const storage = app.get(StorageService);
    expect(storage.getProvider()).toBe("local");
  });

  // ── R2 provider generates safe keys ──

  it("R2 provider generates keys with user ID prefix", async () => {
    process.env.STORAGE_DRIVER = "r2";
    process.env.R2_ACCOUNT_ID = "keygen-account";
    process.env.R2_ACCESS_KEY_ID = "keygen-key";
    process.env.R2_SECRET_ACCESS_KEY = "keygen-secret";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();

    const { StorageService } = await import("../src/storage/storage.service");
    const storage = app.get(StorageService);

    const key = storage.generateKey("user-123", "photo.png");
    expect(key).toContain("attachments/user-123/");
    expect(key).toMatch(/\.png$/);
  });
});
