import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import {
  BootstrapAlreadyCompletedError,
  BootstrapConflictError,
  FirstUserBootstrapService,
} from "../src/bootstrap/first-user-bootstrap.service";
import { hashPassword } from "../src/auth/password";
import { PrismaService } from "../src/prisma/prisma.service";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const cookie = cookies.find((value: string) => value.startsWith("csrf_token="));
  return cookie ? cookie.split(";")[0].split("=")[1] : "";
}

type TransactionCallback = (tx: unknown) => Promise<unknown>;

interface TransactionRunner {
  $transaction: (callback: TransactionCallback) => Promise<unknown>;
}

interface TransactionWithUser {
  user: object;
}

describe("First user bootstrap (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bootstrap: FirstUserBootstrapService;

  const input = {
    email: "  Bootstrap-Owner@Test.Example  ",
    username: "bootstrap_owner",
    password: "bootstrap-test-password-9",
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix("api/v1");
    prisma = app.get(PrismaService);
    bootstrap = new FirstUserBootstrapService(prisma.client);
    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it("BOOTSTRAP-01 creates only the first user, which can log in and use the normal server/invite flow", async () => {
    const result = await bootstrap.bootstrap(input);
    const user = await prisma.client.user.findUnique({ where: { id: result.userId } });

    expect(user).toMatchObject({ email: "bootstrap-owner@test.example", username: input.username, displayName: input.username });
    expect(await prisma.client.server.count()).toBe(0);
    expect(await prisma.client.member.count()).toBe(0);
    expect(await prisma.client.role.count()).toBe(0);
    expect(await prisma.client.invite.count()).toBe(0);

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: input.email, password: input.password })
      .expect(201);

    const cookies = login.headers["set-cookie"];
    const csrf = extractCsrf(cookies);
    await request(app.getHttpServer())
      .get("/api/v1/users/@me")
      .set("Cookie", cookies)
      .expect(200);

    const server = await request(app.getHttpServer())
      .post("/api/v1/servers")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrf)
      .send({ name: "Bootstrap Test Server" })
      .expect(201);

    expect(server.body.ownerId).toBe(user!.id);

    const invite = await request(app.getHttpServer())
      .post(`/api/v1/servers/${server.body.id}/invites`)
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrf)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "second-user@test.example",
        username: "second_user",
        password: "second-user-password-9",
        inviteCode: invite.body.code,
      })
      .expect(201);
  });

  it("BOOTSTRAP-02 persists an Argon2 hash and never plaintext", async () => {
    const result = await bootstrap.bootstrap(input);
    const user = await prisma.client.user.findUniqueOrThrow({ where: { id: result.userId } });

    expect(user.passwordHash).not.toBe(input.password);
    await expect(argon2.verify(user.passwordHash, input.password)).resolves.toBe(true);
  });

  it("BOOTSTRAP-03 safely refuses a second attempt", async () => {
    await bootstrap.bootstrap(input);

    await expect(bootstrap.bootstrap({
      email: "another-owner@test.example",
      username: "another_owner",
      password: "another-bootstrap-password-9",
    })).rejects.toBeInstanceOf(BootstrapAlreadyCompletedError);

    expect(await prisma.client.user.count()).toBe(1);
  });

  it("BOOTSTRAP-04 safely refuses an existing email", async () => {
    await prisma.client.user.create({
      data: {
        email: "bootstrap-owner@test.example",
        username: "existing_user",
        displayName: "Existing User",
        passwordHash: await hashPassword("existing-user-password-9"),
      },
    });

    await expect(bootstrap.bootstrap(input)).rejects.toMatchObject<BootstrapConflictError>({ field: "email" });
    expect(await prisma.client.user.count()).toBe(1);
  });

  it("BOOTSTRAP-05 safely refuses an existing username", async () => {
    await prisma.client.user.create({
      data: {
        email: "existing-email@test.example",
        username: input.username,
        displayName: "Existing User",
        passwordHash: await hashPassword("existing-user-password-9"),
      },
    });

    await expect(bootstrap.bootstrap(input)).rejects.toMatchObject<BootstrapConflictError>({ field: "username" });
    expect(await prisma.client.user.count()).toBe(1);
  });

  it("BOOTSTRAP-06 rolls back a write when a failure occurs inside the transaction", async () => {
    const client = prisma.client as unknown as TransactionRunner;
    const originalTransaction = client.$transaction;

    client.$transaction = async (callback) => originalTransaction.call(client, async (tx: unknown) => {
      const transaction = tx as TransactionWithUser;
      const transactionProxy = new Proxy(transaction, {
        get(target, property) {
          if (property === "user") {
            return new Proxy(target.user, {
              get(userTarget, userProperty) {
                const value = Reflect.get(userTarget, userProperty, userTarget);
                if (userProperty === "create") {
                  return async (...args: unknown[]) => {
                    if (typeof value !== "function") throw new Error("forced transaction failure");
                    await value.apply(userTarget, args);
                    throw new Error("forced transaction failure");
                  };
                }
                return typeof value === "function" ? value.bind(userTarget) : value;
              },
            });
          }
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return callback(transactionProxy);
    });

    try {
      await expect(bootstrap.bootstrap(input)).rejects.toThrow("forced transaction failure");
      expect(await prisma.client.user.count()).toBe(0);
    } finally {
      client.$transaction = originalTransaction;
    }
  });

  it("BOOTSTRAP-07 preserves normal registration invite enforcement", async () => {
    await bootstrap.bootstrap(input);

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "blocked-user@test.example",
        username: "blocked_user",
        password: "blocked-user-password-9",
        inviteCode: "invalid-bootstrap-invite",
      })
      .expect(400);
  });

  it("BOOTSTRAP-08 exposes no bootstrap HTTP route", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/bootstrap")
      .send({})
      .expect(404);
  });
});
