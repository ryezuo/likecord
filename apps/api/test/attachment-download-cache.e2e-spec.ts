import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Global,
  INestApplication,
  Module,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { StorageService } from "../src/storage/storage.service";
import { UploadModule } from "../src/upload/upload.module";
import { UploadService } from "../src/upload/upload.service";
import { UuidParamGuard } from "../src/validation/uuid-param.guard";

const ids = {
  local: "00000000-0000-4000-8000-000000000101",
  redirect: "00000000-0000-4000-8000-000000000102",
  missing: "00000000-0000-4000-8000-000000000103",
  unavailable: "00000000-0000-4000-8000-000000000104",
  membership: "00000000-0000-4000-8000-000000000105",
  view: "00000000-0000-4000-8000-000000000106",
  history: "00000000-0000-4000-8000-000000000107",
  deleted: "00000000-0000-4000-8000-000000000108",
  failure: "00000000-0000-4000-8000-000000000109",
} as const;

const bytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const redirectUrl = "https://fake-r2.example.com/download/object?X-Amz-Expires=600";

const storage = {
  download: jest.fn(async (key: string) => key === ids.unavailable
    ? null
    : { buffer: bytes, mimeType: "application/octet-stream" }),
};

const uploadService = {
  getDownloadInfo: jest.fn(async (attachmentId: string) => {
    if (attachmentId === ids.missing) throw new NotFoundException();
    if (attachmentId === ids.membership) {
      throw new ForbiddenException({ error: { code: "NOT_MEMBER", message: "Not a member" } });
    }
    if (attachmentId === ids.view || attachmentId === ids.history) {
      throw new ForbiddenException({ error: { code: "MISSING_PERMISSION", message: "Missing permission" } });
    }
    if (attachmentId === ids.deleted) {
      throw new ForbiddenException({ error: { code: "MESSAGE_DELETED", message: "Parent message was deleted" } });
    }
    if (attachmentId === ids.failure) throw new Error("Induced signing failure");
    return {
      attachment: { s3Key: attachmentId, fileName: "picture.png" },
      redirectUrl: attachmentId === ids.redirect ? redirectUrl : null,
    };
  }),
};

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.headers["x-test-session"] === "revoked") {
      throw new UnauthorizedException({ error: { code: "SESSION_INVALID", message: "Session is no longer active" } });
    }
    if (req.headers["x-test-session"] !== "active") throw new UnauthorizedException();
    req.user = { id: "00000000-0000-4000-8000-000000000201" };
    return true;
  }
}

@Global()
@Module({
  providers: [{ provide: StorageService, useValue: storage }],
  exports: [StorageService],
})
class TestDependenciesModule {}

@Controller("cache-probe")
class CacheProbeController {
  @Get()
  check() {
    return { status: "ok" };
  }
}

@Module({
  imports: [TestDependenciesModule, UploadModule],
  controllers: [CacheProbeController],
})
class AttachmentDownloadCacheTestModule {}

describe("Attachment download cache boundary (HTTP)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [AttachmentDownloadCacheTestModule],
    })
      .overrideProvider(UploadService)
      .useValue(uploadService)
      .overrideGuard(JwtAuthGuard)
      .useClass(TestSessionGuard)
      .compile();

    app = fixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.enableCors({ origin: ["https://client.test"], credentials: true });
    app.useGlobalGuards(new UuidParamGuard());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets the policy before authentication, logical-session, and parameter guards", async () => {
    const unauthenticated = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${ids.local}/download`)
      .expect(401);
    expect(unauthenticated.headers["cache-control"]).toBe("private, no-store");

    const revoked = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${ids.local}/download`)
      .set("X-Test-Session", "revoked")
      .expect(401);
    expect(revoked.body.error.code).toBe("SESSION_INVALID");
    expect(revoked.headers["cache-control"]).toBe("private, no-store");

    const invalidParam = await request(app.getHttpServer())
      .get("/api/v1/attachments/not-a-uuid/download")
      .set("X-Test-Session", "active")
      .expect(400);
    expect(invalidParam.body.error.code).toBe("INVALID_UUID");
    expect(invalidParam.headers["cache-control"]).toBe("private, no-store");
    expect(uploadService.getDownloadInfo).not.toHaveBeenCalled();
  });

  it("preserves local bytes and response metadata while adding the policy", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${ids.local}/download`)
      .set("X-Test-Session", "active")
      .set("Origin", "https://client.test")
      .expect(200);

    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["content-type"]).toContain("application/octet-stream");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="picture.png"');
    expect(response.headers["content-length"]).toBe(String(bytes.length));
    expect(response.headers.vary.split(/,\s*/)).toContain("Origin");
    expect(response.body).toEqual(bytes);
  });

  it("preserves the R2 redirect and Accept/CORS Vary values without following Location", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${ids.redirect}/download`)
      .set("X-Test-Session", "active")
      .set("Origin", "https://client.test")
      .expect(302);

    expect(response.headers.location).toBe(redirectUrl);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary.split(/,\s*/)).toEqual(expect.arrayContaining(["Origin", "Accept"]));
  });

  it.each([
    [ids.membership, 403, "NOT_MEMBER"],
    [ids.view, 403, "MISSING_PERMISSION"],
    [ids.history, 403, "MISSING_PERMISSION"],
    [ids.deleted, 403, "MESSAGE_DELETED"],
  ])("covers authorization denial for %s", async (attachmentId, status, code) => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("X-Test-Session", "active")
      .expect(status);
    expect(response.body.error.code).toBe(code);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it.each([
    [ids.missing, "missing Attachment"],
    [ids.unavailable, "missing local object"],
  ])("covers 404 for %s (%s)", async (attachmentId) => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("X-Test-Session", "active")
      .expect(404);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("covers an application 5xx at the signing/storage boundary", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${ids.failure}/download`)
      .set("X-Test-Session", "active")
      .expect(500);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("does not apply the policy outside the Attachment download route", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/cache-probe")
      .set("Origin", "https://client.test")
      .expect(200);
    expect(response.headers["cache-control"]).toBeUndefined();
    expect(response.headers.vary.split(/,\s*/)).toContain("Origin");
  });
});
