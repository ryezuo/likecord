import { Controller, Get, Post, Delete, Param, Req, Res, UseGuards, UseFilters } from "@nestjs/common";
import { Request, Response } from "express";
import { RateLimitGuard } from "../../rate-limit/rate-limit.guard";
import { RateLimit } from "../../rate-limit/rate-limit.decorator";
import { avatarUserIdPattern, avatarVersionPattern } from "../../storage/avatar-object";
import { AvatarGuard } from "./avatar.guard";
import { AvatarService, AvatarMutation } from "./avatar.service";
import { AvatarExceptionFilter, receiveAvatar } from "./avatar-transport";
import { avatarError } from "./avatar-error";
import { readAvatarCropHeader } from "./avatar-crop";

@Controller("users")
@UseGuards(AvatarGuard, RateLimitGuard)
@UseFilters(AvatarExceptionFilter)
export class AvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Post("@me/avatar")
  @RateLimit("avatar-mutation")
  async replace(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as { id: string }).id;
    const crop = readAvatarCropHeader(req);
    const release = this.avatars.acquire(userId);
    const controller = new AbortController();
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.once("close", abort);
    try {
      const input = await receiveAvatar(req);
      const mutation = await this.avatars.replace(userId, input, req.headers["content-type"]!, crop, controller.signal);
      this.respond(res, mutation);
    } finally { res.removeListener("close", abort); release(); }
  }

  @Delete("@me/avatar")
  @RateLimit("avatar-mutation")
  async remove(@Req() req: Request, @Res() res: Response) {
    this.respond(res, await this.avatars.remove((req.user as { id: string }).id));
  }

  private respond(res: Response, mutation: AvatarMutation) {
    try { res.setHeader("Cache-Control", "no-store"); res.status(200).json(mutation.projection); }
    finally { void this.avatars.afterCommit(mutation); }
  }

  private validateUser(userId: string) {
    if (!avatarUserIdPattern.test(userId)) throw avatarError(400, "AVATAR_INVALID_REQUEST");
  }

  @Get(":userId/avatar")
  @RateLimit("avatar-metadata")
  async metadata(@Param("userId") userId: string, @Res() res: Response) {
    this.validateUser(userId);
    const projection = await this.avatars.metadata(userId);
    res.setHeader("Cache-Control", "no-store");
    res.json(projection);
  }

  @Get(":userId/avatar/:version.poster.webp")
  @RateLimit("avatar-image")
  async poster(@Param("userId") userId: string, @Param("version") version: string, @Req() req: Request, @Res() res: Response) {
    return this.serveImage(userId, version, req, res, true);
  }

  @Get(":userId/avatar/:version.webp")
  @RateLimit("avatar-image")
  async image(@Param("userId") userId: string, @Param("version") version: string, @Req() req: Request, @Res() res: Response) {
    return this.serveImage(userId, version, req, res, false);
  }

  private async serveImage(userId: string, version: string, req: Request, res: Response, poster: boolean) {
    this.validateUser(userId);
    if (!avatarVersionPattern.test(version)) throw avatarError(404, "NOT_FOUND");
    const object = await this.avatars.image(userId, version);
    const etag = `"avatar-${version}${poster ? "-poster" : ""}"`;
    res.setHeader("Cache-Control", "private, no-cache");
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Content-Disposition", `inline; filename="${poster ? "poster" : "avatar"}.webp"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"]?.split(",").some((value) => [etag, `W/${etag}`, "*"].includes(value.trim()))) {
      res.status(304).end(); return;
    }
    const buffer = poster ? await this.avatars.readPoster(object) : await this.avatars.readImage(object);
    // Recheck after storage I/O as replacement/removal may have committed meanwhile.
    await this.avatars.image(userId, version);
    res.send(buffer);
  }
}
