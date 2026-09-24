import { INestApplication, Catch, ArgumentsHost, ExceptionFilter, HttpException } from "@nestjs/common";
import { json, urlencoded, Request, Response, NextFunction } from "express";
import { AVATAR_INPUT_LIMIT } from "./avatar-image";
import { avatarError } from "./avatar-error";

export const isAvatarRequest = (req: Request) => /^\/api\/v1\/users\/[^/]+\/avatar(?:\/[^/]+)?\/?$/.test(req.path);

/** Install before Nest initialization with bodyParser:false; all other routes retain Nest's parsers. */
export function configureAvatarTransport(app: INestApplication): void {
  const parseJson = json();
  const parseForm = urlencoded({ extended: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isAvatarRequest(req)) { res.setHeader("Cache-Control", "no-store"); next(); }
    else parseJson(req, res, (error?: unknown) => error ? next(error) : parseForm(req, res, next));
  });
}

export function receiveAvatar(req: Request): Promise<Buffer> {
  const declared = req.headers["content-length"];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > AVATAR_INPUT_LIMIT)) {
    req.pause();
    throw avatarError(413, "AVATAR_TOO_LARGE");
  }
  return new Promise((resolve, reject) => {
    let length = 0;
    const chunks: Buffer[] = [];
    const finish = (error?: HttpException) => {
      clearTimeout(timer);
      req.removeListener("data", data);
      req.removeListener("end", end);
      req.removeListener("aborted", abort);
      req.removeListener("error", abort);
      req.pause();
      if (error) { chunks.length = 0; reject(error); }
      else resolve(Buffer.concat(chunks, length));
    };
    const data = (chunk: Buffer) => {
      length += chunk.length;
      if (length > AVATAR_INPUT_LIMIT) finish(avatarError(413, "AVATAR_TOO_LARGE"));
      else chunks.push(chunk);
    };
    const end = () => finish(length ? undefined : avatarError(400, "AVATAR_EMPTY_INPUT"));
    const abort = () => finish(avatarError(400, "AVATAR_RECEIVE_ABORTED"));
    const timer = setTimeout(() => finish(avatarError(503, "AVATAR_PROCESSING_TIMEOUT")), 30_000);
    req.on("data", data).once("end", end).once("aborted", abort).once("error", abort);
    if (req.readableEnded) end();
  });
}

@Catch()
export class AvatarExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const code = status === 401 ? "AUTH_REQUIRED" : status === 404 ? "NOT_FOUND" : status === 400 ? "AVATAR_INVALID_REQUEST" : "AVATAR_BUSY";
    response.setHeader("Cache-Control", "no-store");
    response.removeHeader("ETag");
    response.removeHeader("Content-Disposition");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    // Do not drain an oversized/stalled untrusted body just to keep the socket reusable.
    if (!request.complete) {
      response.setHeader("Connection", "close");
      response.once("finish", () => request.destroy());
    }
    response.status(status).json(body && typeof body === "object" && "error" in body && typeof body.error === "object"
      ? body : { error: { code, message: code.toLowerCase().replace(/_/g, " ") } });
  }
}
