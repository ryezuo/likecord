import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { MessageController } from "../src/message/message.controller";
import { MessageService } from "../src/message/message.service";
import { UUID_ROUTE_PARAM_NAMES, UuidParamGuard } from "../src/validation/uuid-param.guard";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EXISTING_CHANNEL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_CHANNEL_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

class TestAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.headers.authorization !== "Bearer authenticated-test-user") {
      throw new UnauthorizedException();
    }
    request.user = { id: USER_ID };
    return true;
  }
}

describe("UUID route parameter validation (e2e)", () => {
  let app: INestApplication;
  const messageService = {
    list: jest.fn(async (channelId: string) => {
      if (channelId === EXISTING_CHANNEL_ID) {
        return [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", channelId, content: "existing" }];
      }
      throw new NotFoundException({
        error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found" },
      });
    }),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        TestAuthenticationGuard,
        UuidParamGuard,
        { provide: MessageService, useValue: messageService },
        { provide: APP_GUARD, useExisting: TestAuthenticationGuard },
        { provide: APP_GUARD, useExisting: UuidParamGuard },
      ],
    });
    moduleBuilder.overrideGuard(JwtAuthGuard).useClass(TestAuthenticationGuard);
    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects an authenticated malformed channel UUID with a controlled 400 before the service", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/channels/not-a-uuid/messages")
      .set("Authorization", "Bearer authenticated-test-user")
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_UUID",
        message: "Invalid UUID route parameter",
      },
    });
    expect(messageService.list).not.toHaveBeenCalled();
  });

  it("preserves the existing not-found contract for a valid nonexistent channel UUID", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/channels/${MISSING_CHANNEL_ID}/messages`)
      .set("Authorization", "Bearer authenticated-test-user")
      .expect(404);

    expect(response.body.error?.code).toBe("CHANNEL_NOT_FOUND");
    expect(messageService.list).toHaveBeenCalledWith(MISSING_CHANNEL_ID, USER_ID, {
      before: undefined,
      limit: 50,
    });
  });

  it("preserves normal behavior for an existing valid channel UUID", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/channels/${EXISTING_CHANNEL_ID}/messages`)
      .set("Authorization", "Bearer authenticated-test-user")
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({ channelId: EXISTING_CHANNEL_ID, content: "existing" }),
    ]);
  });

  it("preserves authentication precedence for an unauthenticated malformed UUID", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/channels/not-a-uuid/messages")
      .expect(401);

    expect(messageService.list).not.toHaveBeenCalled();
  });

  it.each(UUID_ROUTE_PARAM_NAMES)("rejects malformed %s values through the shared mechanism", (name) => {
    const guard = new UuidParamGuard();
    const context = {
      getType: () => "http",
      switchToHttp: () => ({ getRequest: () => ({ params: { [name]: "not-a-uuid" } }) }),
    } as ExecutionContext;

    try {
      guard.canActivate(context);
      throw new Error("Expected malformed UUID rejection");
    } catch (error) {
      expect((error as { getResponse?: () => unknown }).getResponse?.()).toEqual({
        error: {
          code: "INVALID_UUID",
          message: "Invalid UUID route parameter",
        },
      });
    }
  });

  it("does not reinterpret non-UUID route parameters", () => {
    const guard = new UuidParamGuard();
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => ({ params: { code: "synthetic-opaque-code", targetType: "ROLE" } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it("does not apply HTTP route-parameter validation to other Nest contexts", () => {
    const guard = new UuidParamGuard();
    const context = {
      getType: () => "ws",
      switchToHttp: () => {
        throw new Error("HTTP request must not be accessed for a WebSocket context");
      },
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
