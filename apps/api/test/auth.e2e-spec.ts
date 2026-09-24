import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase } from "./helpers";
import * as argon2 from "argon2";
import * as crypto from "crypto";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let serverId: string;
  let inviteCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");

    prisma = app.get(PrismaService);
    await cleanDatabase(prisma);

    const hash = await argon2.hash("test1234", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const admin = await prisma.client.user.create({
      data: { email: "testadmin@test.com", username: "testadmin", displayName: "Test Admin", passwordHash: hash },
    });

    const server = await prisma.client.server.create({
      data: { name: "Test Server", ownerId: admin.id },
    });
    serverId = server.id;

    await prisma.client.member.create({ data: { serverId: server.id, userId: admin.id } });
    await prisma.client.role.create({
      data: { serverId: server.id, name: "@everyone", permissions: BigInt(0), position: 0, isDefault: true, isMentionable: false },
    });

    const invite = await prisma.client.invite.create({
      data: { code: "testcode", serverId: server.id, creatorId: admin.id },
    });
    inviteCode = invite.code;

    await app.init();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ── Registration ──

  it("POST /auth/register - success with valid invite", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "newuser@test.com", username: "newuser", password: "password123", inviteCode })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("newuser@test.com");
    expect(res.body.user.username).toBe("newuser");

    const cookies = res.headers["set-cookie"];
    expect(cookies.some((c: string) => c.startsWith("access_token="))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
    const createdUser = await prisma.client.user.findUniqueOrThrow({ where: { email: "newuser@test.com" } });
    expect(await prisma.client.member.count({ where: { userId: createdUser.id } })).toBe(0);
    expect((await prisma.client.invite.findUniqueOrThrow({ where: { code: inviteCode } })).useCount).toBe(0);
  });

  it("POST /auth/register - blocked with invalid invite", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "badinvite@test.com", username: "badinvite", password: "password123", inviteCode: "invalidcode" })
      .expect(400);
  });

  it("POST /auth/register - duplicate username blocked", async () => {
    const invite2 = await prisma.client.invite.create({
      data: { code: "code2", serverId, creatorId: (await prisma.client.user.findFirst({ where: { email: "testadmin@test.com" } }))!.id },
    });
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "dupuser@test.com", username: "newuser", password: "password123", inviteCode: invite2.code })
      .expect(409);
  });

  it("POST /auth/register - duplicate email blocked", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "newuser@test.com", username: "another", password: "password123", inviteCode })
      .expect(409);
  });

  // ── Login ──

  it("POST /auth/login - success", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("newuser@test.com");
  });

  it("POST /auth/login - blocked with wrong password", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "wrongpassword" })
      .expect(401);
  });

  // ── Refresh (protected by CSRF) ──

  it("POST /auth/refresh - token rotation", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const allCookies = loginRes.headers["set-cookie"];
    const refreshCookie = allCookies.find((c: string) => c.startsWith("refresh_token="));
    const csrfToken = extractCsrf(allCookies);

    await new Promise((r) => setTimeout(r, 1000));

    const refreshRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(201);

    expect(refreshRes.body.success).toBe(true);
  });

  it("POST /auth/refresh - old token revoked after rotation", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const allCookies = loginRes.headers["set-cookie"];
    const refreshCookie = allCookies.find((c: string) => c.startsWith("refresh_token="));
    const csrfToken = extractCsrf(allCookies);

    // First refresh rotates the token
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(201);

    // Second with old token should fail
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(401);
  });

  // ── Logout (protected by CSRF) ──

  it("POST /auth/logout - revokes refresh session", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const allCookies = loginRes.headers["set-cookie"];
    const refreshCookie = allCookies.find((c: string) => c.startsWith("refresh_token="));
    const csrfToken = extractCsrf(allCookies);

    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", csrfToken)
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(401);
  });

  // ── User @me ──

  it("GET /users/@me - returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/users/@me")
      .expect(401);
  });

  it("GET /users/@me - returns user with valid auth", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const cookies = loginRes.headers["set-cookie"];

    const res = await request(app.getHttpServer())
      .get("/api/v1/users/@me")
      .set("Cookie", cookies)
      .expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe("newuser@test.com");
  });

  // ── Cookie Persistence ──

  it("login sets persistent refresh cookie with 30-day Max-Age", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" })
      .expect(201);

    const cookies = res.headers["set-cookie"];
    const refreshCookie = cookies.find((c: string) => c.startsWith("refresh_token="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("Max-Age=2592000"); // 30 days in seconds
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("Secure");
    // Check for explicit Expires header
    expect(refreshCookie).toMatch(/Expires=/);
  });

  it("login sets access cookie with 15-minute Max-Age", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" })
      .expect(201);

    const cookies = res.headers["set-cookie"];
    const accessCookie = cookies.find((c: string) => c.startsWith("access_token="));
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain("Max-Age=900"); // 15 minutes in seconds
    expect(accessCookie).toContain("HttpOnly");
    expect(accessCookie).toContain("Secure");
  });

  it("refresh fails after expiry", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const allCookies = loginRes.headers["set-cookie"];
    const refreshCookie = allCookies.find((c: string) => c.startsWith("refresh_token="));
    const csrfToken = extractCsrf(allCookies);

    // Manually expire the refresh session
    const tokenVal = refreshCookie.split(";")[0].split("=").slice(1).join("=");
    const tokenHash = crypto.createHash("sha256").update(tokenVal).digest("hex");
    const prismaLocal = app.get(PrismaService);
    await prismaLocal.client.refreshSession.updateMany({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie)
      .set("X-CSRF-Token", csrfToken)
      .expect(401);
  });

  it("logout clears cookies", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" });

    const allCookies = loginRes.headers["set-cookie"];
    const csrfToken = extractCsrf(allCookies);

    const logoutRes = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", csrfToken)
      .expect(204);

    const clearCookies = logoutRes.headers["set-cookie"];
    // Should clear both cookies (Max-Age=0 or expires in past)
    const accessClear = clearCookies?.find((c: string) => c.startsWith("access_token="));
    const refreshClear = clearCookies?.find((c: string) => c.startsWith("refresh_token="));
    expect(accessClear).toBeDefined();
    expect(refreshClear).toBeDefined();
  });

  // ── Update Profile (protected by CSRF) ──

  it("PATCH /users/@me - updates displayName and bio", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "newuser@test.com", password: "password123" })
      .expect(201);

    const allCookies = loginRes.headers["set-cookie"];
    const csrfToken = extractCsrf(allCookies);

    const res = await request(app.getHttpServer())
      .patch("/api/v1/users/@me")
      .set("Cookie", allCookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ displayName: "New Display", bio: "Hello world!" })
      .expect(200);

    expect(res.body.displayName).toBe("New Display");
    expect(res.body.bio).toBe("Hello world!");
  });
});
