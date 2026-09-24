import { ExecutionContext } from "@nestjs/common";
import { AvatarGuard } from "./avatar.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { RateLimitGuard } from "../../rate-limit/rate-limit.guard";
import { RedisService } from "../../redis/redis.service";
import { WsGateway } from "../../ws/ws.gateway";
import { PermissionService } from "../../server/guards/permission.service";
import { PresenceService } from "../../presence/presence.service";
import { VoiceService } from "../../voice/voice.service";

const id = "11111111-1111-4111-8111-111111111111";
const context = (req: unknown, handler = () => {}) => ({
  getHandler: () => handler,
  switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader: jest.fn() }) }),
}) as unknown as ExecutionContext;

describe("avatar route guards", () => {
  const prisma = { client: { user: { findUnique: jest.fn() } } };
  let guard: AvatarGuard;
  const valid = () => ({ user: { id }, query: {}, method: "POST", cookies: { csrf_token: "token" }, headers: {
    "x-csrf-token": "token", origin: "https://localhost", "content-type": "image/png",
  } as Record<string, string> });
  beforeEach(() => { prisma.client.user.findUnique.mockResolvedValue({ id }); guard = new AvatarGuard(prisma as unknown as PrismaService); });
  it.each(["cookie", "header", "mismatch", "origin", "both-absent", "origin-suffix"])("rejects CSRF %s", async (failure) => {
    const req = valid();
    if (failure === "cookie") req.cookies.csrf_token = "";
    if (failure === "header") delete req.headers["x-csrf-token"];
    if (failure === "mismatch") req.headers["x-csrf-token"] = "other";
    if (failure === "origin") req.headers.origin = "https://evil.test";
    if (failure === "both-absent") delete req.headers.origin;
    if (failure === "origin-suffix") req.headers.origin = "https://localhost.evil.test";
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({ status: 403 });
  });
  it("accepts exact Origin or parsed Referer only when Origin is absent", async () => {
    const req = valid(); expect(await guard.canActivate(context(req))).toBe(true);
    delete req.headers.origin; req.headers.referer = "https://localhost/settings?x=1";
    expect(await guard.canActivate(context(req))).toBe(true);
    req.headers.origin = "https://evil.test"; await expect(guard.canActivate(context(req))).rejects.toMatchObject({ status: 403 });
  });
  it("rejects deleted requester, overrides and unsupported envelopes", async () => {
    prisma.client.user.findUnique.mockResolvedValueOnce(null); await expect(guard.canActivate(context(valid()))).rejects.toMatchObject({ status: 401 });
    await expect(guard.canActivate(context({ ...valid(), query: { userId: "other" } }))).rejects.toMatchObject({ status: 400 });
    for (const mime of ["application/json", "multipart/form-data", "image/png; charset=binary", "image/svg+xml"]) {
      const req = valid(); req.headers["content-type"] = mime; await expect(guard.canActivate(context(req))).rejects.toMatchObject({ status: 415 });
    }
    const req = valid(); req.headers["content-encoding"] = "gzip"; await expect(guard.canActivate(context(req))).rejects.toMatchObject({ status: 415 });
  });
  it("rejects mutation body/query on DELETE and read bodies", async () => {
    for (const method of ["DELETE", "GET"]) {
      const req = valid(); req.method = method; req.headers["transfer-encoding"] = "chunked";
      await expect(guard.canActivate(context(req))).rejects.toMatchObject({ status: 400 });
    }
  });
});

describe("avatar account limiter in NODE_ENV=test", () => {
  const evalRedis = jest.fn();
  let guard: RateLimitGuard;
  beforeEach(() => { evalRedis.mockReset(); guard = new RateLimitGuard({ getClient: () => ({ eval: evalRedis }) } as unknown as RedisService); });
  it.each([["avatar-mutation", 10, 600], ["avatar-metadata", 600, 60], ["avatar-image", 2400, 60]])("enforces %s", async (name, limit, duration) => {
    const handler = () => {}; Reflect.defineMetadata("rateLimitName", name, handler);
    const ctx = context({ user: { id } }, handler);
    evalRedis.mockResolvedValueOnce([limit, duration]); expect(await guard.canActivate(ctx)).toBe(true);
    expect(evalRedis.mock.calls[0].slice(1)).toEqual([1, `rl:${name}:${id}`, duration]);
    evalRedis.mockResolvedValueOnce([Number(limit) + 1, duration]); await expect(guard.canActivate(ctx)).rejects.toMatchObject({ status: 429 });
    evalRedis.mockResolvedValueOnce([1, duration]); await guard.canActivate(context({ user: { id: "other" } }, handler));
    expect(evalRedis.mock.calls[2][2]).toBe(`rl:${name}:other`);
  });
  it("fails closed on Redis outage", async () => {
    const handler = () => {}; Reflect.defineMetadata("rateLimitName", "avatar-mutation", handler);
    evalRedis.mockRejectedValueOnce(new Error("offline"));
    await expect(guard.canActivate(context({ user: { id } }, handler))).rejects.toMatchObject({ status: 503 });
  });
});

describe("avatar-only realtime producer", () => {
  it("resolves current nonbanned memberships at emission and sends one exact union/payload", async () => {
    const findMany = jest.fn().mockResolvedValue([{ serverId: "a" }, { serverId: "b" }, { serverId: "a" }]);
    const gateway = new WsGateway({ client: { member: { findMany } } } as unknown as PrismaService,
      {} as PermissionService, {} as PresenceService, {} as VoiceService, {} as never, {} as never);
    const emit = jest.fn(), to = jest.fn(() => ({ emit })); gateway.server = { to } as unknown as WsGateway["server"];
    await gateway.emitAvatarUpdated(id);
    expect(findMany).toHaveBeenCalledWith({ where: { userId: id, isBanned: false }, select: { serverId: true } });
    expect(to).toHaveBeenCalledTimes(1); expect(to).toHaveBeenCalledWith([`user:${id}`, "server:a", "server:b"]);
    expect(emit).toHaveBeenCalledWith("user:avatar-updated", { userId: id });
    findMany.mockResolvedValueOnce([]); await gateway.emitAvatarUpdated(id); expect(to).toHaveBeenLastCalledWith([`user:${id}`]);
  });
});
