import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require("cookie-parser");
import * as fs from "fs/promises";
import * as path from "path";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { UploadService } from "../src/upload/upload.service";
import { CleanupService } from "../src/upload/cleanup.service";
import { StorageService } from "../src/storage/storage.service";
import * as argon2 from "argon2";
import { cleanDatabase } from "./helpers";

function extractCsrf(cookies: string[]): string {
  const c = cookies.find((c: string) => c.startsWith("csrf_token="));
  return c ? c.split(";")[0].split("=")[1] : "";
}

const UPLOAD_DIR = path.join(process.cwd(), "test-uploads");

describe("File Uploads (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanupService: CleanupService;
  let storageService: StorageService;
  let serverId: string;
  let channelId: string;
  let ownerId: string;
  let ownerCookies: string[];
  let ownerToken: string;

  beforeAll(async () => {
    // Use a test upload directory
    process.env.STORAGE_DRIVER = "local";
    process.env.UPLOAD_DIR = UPLOAD_DIR;

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
    cleanupService = app.get(CleanupService);
    storageService = app.get(StorageService);

    await cleanDatabase(prisma);

    const hash = await argon2.hash("pass", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const owner = await prisma.client.user.create({
      data: { email: "u@test.com", username: "uowner", displayName: "Owner", passwordHash: hash },
    });
    ownerId = owner.id;

    const sv = await prisma.client.server.create({ data: { name: "FileTest", ownerId: owner.id } });
    serverId = sv.id;
    await prisma.client.member.create({ data: { serverId: sv.id, userId: owner.id } });
    await prisma.client.role.create({
      data: {
        serverId: sv.id, name: "@everyone",
        permissions: BigInt(0x1000 | 0x400 | 0x200 | 0x80 | 0x40 | 0x1 | 0x200), // includes ATTACH_FILES
        position: 0, isDefault: true, isMentionable: false,
      },
    });
    const ch = await prisma.client.channel.create({ data: { serverId: sv.id, type: "TEXT", name: "general", position: 0 } });
    channelId = ch.id;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login").send({ email: "u@test.com", password: "pass" });
    ownerCookies = loginRes.headers["set-cookie"];
    ownerToken = extractCsrf(ownerCookies);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }, 20000);

  afterAll(async () => {
    await cleanDatabase(prisma);
    // Clean up test uploads
    await fs.rm(UPLOAD_DIR, { recursive: true, force: true }).catch(() => {});
    await app.close();
  });

  function prepareUpload(fileName: string, mimeType: string, fileSize: number, cookies = ownerCookies, token = ownerToken) {
    return request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/attachments/prepare`)
      .set("Cookie", cookies).set("X-CSRF-Token", token)
      .send({ fileName, mimeType, fileSize });
  }

  function doUpload(attachmentId: string, buffer: Buffer, cookies = ownerCookies, token = ownerToken) {
    return request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/upload`)
      .set("Cookie", cookies).set("X-CSRF-Token", token)
      .send(buffer);
  }

  function completeUpload(attachmentId: string, cookies = ownerCookies, token = ownerToken) {
    return request(app.getHttpServer())
      .post(`/api/v1/attachments/${attachmentId}/complete`)
      .set("Cookie", cookies).set("X-CSRF-Token", token);
  }

  // Test 1: non-member cannot prepare upload
  it("non-member cannot prepare upload", async () => {
    const hash = await argon2.hash("pass2", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "nofiles@test.com", username: "nofiles", displayName: "No", passwordHash: hash } });
    // NOT a member of the server — will fail permission check
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "nofiles@test.com", password: "pass2" });
    const c = login.headers["set-cookie"];
    const t = extractCsrf(c);
    const res = await prepareUpload("test.png", "image/png", 1000, c, t);
    expect(res.status).toBe(403);
  });

  // Test 2: invalid MIME type is rejected (dangerous extension)
  it("dangerous file extension is rejected", async () => {
    const res = await prepareUpload("hack.exe", "application/x-msdownload", 1000);
    expect(res.status).toBe(400);
  });

  // Test 3: file over 100 MB is rejected
  it("file over 100 MB is rejected", async () => {
    const res = await prepareUpload("large.png", "image/png", 104857601);
    expect(res.status).toBe(400);
  });

  // Test 4: object key is server-generated
  it("object key is server-generated", async () => {
    const res = await prepareUpload("photo.png", "image/png", 5000);
    expect(res.status).toBe(201);
    expect(res.body.key).toBeDefined();
    expect(res.body.key).toContain(ownerId);
    expect(res.body.key).toMatch(/^[a-f0-9-]+\/[a-f0-9]+\.png$/);
  });

  // Test 5: complete rejects non-existent attachment
  it("complete rejects missing attachment", async () => {
    await completeUpload("00000000-0000-0000-0000-000000000000").expect(404);
  });

  // Test 6: complete rejects mismatched size (magic bytes fail for garbage data)
  it("upload with mismatched MIME/magic is rejected", async () => {
    const prep = await prepareUpload("fake.pdf", "application/pdf", 100);
    const attId = prep.body.attachmentId;

    // Send garbage data with PDF MIME
    const garbage = Buffer.from("this is not a PDF", "utf-8");
    const up = await doUpload(attId, garbage);
    expect(up.status).toBe(400);
  });

  // Test 7: upload and complete works for authenticated member
  it("authenticated member can upload and complete", async () => {
    const prepRes = await prepareUpload("auth.png", "image/png", 100);
    expect(prepRes.status).toBe(201);
    const attId = prepRes.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const upRes = await doUpload(attId, pngBytes);
    expect(upRes.status).toBe(201);

    await completeUpload(attId).expect(201);
  });

  // Test 8: message can contain attachment without text
  it("message with attachment can be sent without text", async () => {
    const prep = await prepareUpload("img.png", "image/png", 100);
    const attId = prep.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    await doUpload(attId, pngBytes);

    const msg = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ attachmentIds: [attId] });
    expect(msg.status).toBe(201);
    expect(msg.body.message.id).toBeDefined();

    // Verify attachment is linked in DB
    const linked = await prisma.client.attachment.findUnique({
      where: { id: attId },
      select: { messageId: true },
    });
    expect(linked?.messageId).toBe(msg.body.message.id);
  });

  // Test 9: attachment download requires membership
  it("serves local attachment bytes with the scoped cache boundary and existing headers", async () => {
    const prep = await prepareUpload("local-download.png", "image/png", 100);
    const attId = prep.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    await doUpload(attId, pngBytes).expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ attachmentIds: [attId] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attId}/download`)
      .set("Cookie", ownerCookies)
      .set("Origin", "https://client.test")
      .expect(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["content-type"]).toContain("application/octet-stream");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="local-download.png"');
    expect(response.headers["content-length"]).toBe(String(pngBytes.length));
    expect(response.headers.vary.split(/,\s*/)).toContain("Origin");
    expect(response.body).toEqual(pngBytes);
  });

  it("does not apply the attachment cache boundary to other routes", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("Origin", "https://client.test")
      .expect(200);
    expect(response.headers["cache-control"]).toBeUndefined();
    expect(response.headers.vary.split(/,\s*/)).toContain("Origin");
  });

  it("attachment download requires membership", async () => {
    // First create a message with the attachment so it's linked
    const prep = await prepareUpload("dl.png", "image/png", 100);
    const attId = prep.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    await doUpload(attId, pngBytes);

    await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ attachmentIds: [attId] })
      .expect(201);

    // Non-member tries to download
    const hash = await argon2.hash("pass4", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2 });
    const u = await prisma.client.user.create({ data: { email: "nomember@test.com", username: "nomember", displayName: "No", passwordHash: hash } });
    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email: "nomember@test.com", password: "pass4" });
    const c = login.headers["set-cookie"];

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attId}/download`)
      .set("Cookie", c)
      .expect(403);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  // Test 10: F.4 actively deletes local objects and rows after Message commit
  it("message delete actively removes the local object and Attachment row", async () => {
    const prep = await prepareUpload("del.png", "image/png", 100);
    const attId = prep.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    await doUpload(attId, pngBytes);

    const msg = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ attachmentIds: [attId] });
    const msgId = msg.body.message.id;
    const storedAttachment = await prisma.client.attachment.findUnique({ where: { id: attId } });
    expect(storedAttachment).not.toBeNull();
    const storedPath = path.join(UPLOAD_DIR, storedAttachment!.s3Key);
    await expect(fs.access(storedPath)).resolves.toBeUndefined();

    // Delete the message
    await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .expect(200);

    expect(await prisma.client.attachment.findUnique({ where: { id: attId } })).toBeNull();
    await expect(fs.access(storedPath)).rejects.toBeDefined();

    // The normal application download path cannot expose the deleted attachment.
    const missingAfterDelete = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attId}/download`)
      .set("Cookie", ownerCookies)
      .expect(404);
    expect(missingAfterDelete.headers["cache-control"]).toBe("private, no-store");
  });

  // Test 11: orphan cleanup deletes stale unattached attachments
  it("orphan cleanup deletes stale unattached attachments", async () => {
    const prep1 = await prepareUpload("orphan1.png", "image/png", 100);
    const prep2 = await prepareUpload("orphan2.png", "image/png", 100);

    // Manually set their creation time to 48 hours ago
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.client.attachment.update({
      where: { id: prep1.body.attachmentId },
      data: { createdAt: oldDate },
    });
    await prisma.client.attachment.update({
      where: { id: prep2.body.attachmentId },
      data: { createdAt: oldDate },
    });

    const result = await cleanupService.runNow();
    expect(result.orphans).toBeGreaterThanOrEqual(2);

    // Verify they're gone from DB
    const a1 = await prisma.client.attachment.findUnique({ where: { id: prep1.body.attachmentId } });
    expect(a1).toBeNull();
  });

  // Test 12: retained cleanup state is immediately inaccessible and retryable
  it("storage failure retains a retry handle that periodic cleanup removes later", async () => {
    const prep = await prepareUpload("retain.png", "image/png", 100);
    const attId = prep.body.attachmentId;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    await doUpload(attId, pngBytes);

    const msg = await request(app.getHttpServer())
      .post(`/api/v1/channels/${channelId}/messages`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .send({ attachmentIds: [attId] });
    const msgId = msg.body.message.id;

    const deleteSpy = jest.spyOn(storageService, "delete").mockRejectedValueOnce(new Error("induced storage failure"));

    await request(app.getHttpServer())
      .delete(`/api/v1/messages/${msgId}`)
      .set("Cookie", ownerCookies).set("X-CSRF-Token", ownerToken)
      .expect(200);

    const retained = await prisma.client.attachment.findUnique({ where: { id: attId } });
    expect(retained).not.toBeNull();
    const retainedDownload = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${attId}/download`)
      .set("Cookie", ownerCookies)
      .expect(403);
    expect(retainedDownload.body.error.code).toBe("MESSAGE_DELETED");
    expect(retainedDownload.headers["cache-control"]).toBe("private, no-store");

    const result = await cleanupService.runNow();
    expect(result.expired).toBeGreaterThanOrEqual(1);
    expect(deleteSpy).toHaveBeenCalledTimes(2);

    const a1 = await prisma.client.attachment.findUnique({ where: { id: attId } });
    expect(a1).toBeNull();
    deleteSpy.mockRestore();
  });
});
