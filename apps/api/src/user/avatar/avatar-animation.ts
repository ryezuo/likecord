import { spawn } from "node:child_process";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import type { AvatarCrop } from "@likecord/shared";
import { inspectAvatarAnimation, AVATAR_ANIMATION_LIMITS as L } from "@likecord/shared/avatar-animation";
import { avatarError } from "./avatar-error";
import { requireAvatarRepresentation } from "../../storage/avatar-object";

// CJS entry is copied unchanged by Nest; the same code runs in dev and Linux production.
// eslint-disable-next-line @typescript-eslint/no-var-requires -- shared with the loader-free native child
const protocol = require("./avatar-animation-protocol.cjs") as {
  Reader: new () => { push(chunk: Buffer): void; end(): { meta: Record<string, unknown>; main: Buffer; poster: Buffer }; clear(): void };
  send(stream: NodeJS.WritableStream, meta: unknown, main: Buffer, poster: Buffer, input: boolean): Promise<void>;
};
let animatedActive = false;
export interface AnimatedAvatarPair { main: Buffer; poster: Buffer }
export interface AnimationExecutionOptions { signal?: AbortSignal; budgetMs?: number; workerPath?: string }

/** Returns null for static input. The caller retains total admission through this promise. */
export async function normalizeAnimatedAvatar(input: Buffer, mime: string, crop: AvatarCrop | null,
  options: AnimationExecutionOptions = {}): Promise<AnimatedAvatarPair | null> {
  const deadline = performance.now() + Math.min(options.budgetMs ?? L.processingMs, L.processingMs);
  const check = () => { if (performance.now() >= deadline) throw avatarError(503, "AVATAR_PROCESSING_TIMEOUT"); };
  let media;
  try { media = inspectAvatarAnimation(input, check); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = String(error.code); throw avatarError(code === "AVATAR_TOO_LARGE" ? 413 : code === "AVATAR_FORMAT_UNSUPPORTED" ? 415 : 422, code);
    }
    throw error;
  }
  if (!media) return null;
  if (mime !== `image/${media.format}`) throw avatarError(415, "AVATAR_MIME_MISMATCH");
  check();
  if (options.signal?.aborted) throw avatarError(400, "AVATAR_RECEIVE_ABORTED");
  if (animatedActive) throw avatarError(503, "AVATAR_BUSY");
  animatedActive = true;
  try {
    return await new Promise<AnimatedAvatarPair>((resolve, reject) => {
      const reader = new protocol.Reader();
      let reason: ReturnType<typeof avatarError> | undefined, exited = false, stderrBytes = 0;
      let hardKill: NodeJS.Timeout | undefined;
      const child = spawn(process.execPath, [options.workerPath || path.join(__dirname, "avatar-animation-worker.cjs")], {
        detached: process.platform !== "win32", windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
        env: { ...(process.platform === "win32" ? { SystemRoot: process.env.SystemRoot } : {}), LANG: "C.UTF-8", UV_THREADPOOL_SIZE: "4" },
      });
      const kill = (signal: NodeJS.Signals) => {
        if (exited || !child.pid) return;
        try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); }
        catch { try { child.kill(signal); } catch { /* keep admission until OS confirms exit */ } }
      };
      const terminate = (error: ReturnType<typeof avatarError>) => {
        if (reason) return;
        reason = error; reader.clear(); child.stdin.destroy(); kill("SIGTERM");
        hardKill = setTimeout(() => kill("SIGKILL"), 50);
      };
      const timeout = setTimeout(() => terminate(avatarError(503, "AVATAR_PROCESSING_TIMEOUT")), Math.max(1, deadline - performance.now()));
      const abort = () => terminate(avatarError(400, "AVATAR_RECEIVE_ABORTED"));
      options.signal?.addEventListener("abort", abort, { once: true });
      child.on("error", () => terminate(avatarError(503, "AVATAR_BUSY")));
      child.once("exit", () => { exited = true; clearTimeout(hardKill); });
      child.stdout.on("data", (chunk: Buffer) => {
        if (reason) return;
        if (performance.now() >= deadline) { terminate(avatarError(503, "AVATAR_PROCESSING_TIMEOUT")); return; }
        try { reader.push(chunk); } catch { terminate(avatarError(422, "AVATAR_INVALID_IMAGE")); }
      });
      child.stderr.on("data", (chunk: Buffer) => { stderrBytes += chunk.length; if (stderrBytes > 8192) terminate(avatarError(422, "AVATAR_INVALID_IMAGE")); });
      child.stdin.on("error", () => { if (!exited) terminate(avatarError(422, "AVATAR_INVALID_IMAGE")); });
      child.once("close", (code, signal) => {
        clearTimeout(timeout); clearTimeout(hardKill); options.signal?.removeEventListener("abort", abort);
        try {
          if (reason) throw reason;
          check(); if (!exited || code !== 0 || signal) throw avatarError(422, "AVATAR_INVALID_IMAGE");
          const result = reader.end();
          if (result.meta.kind === "error" && !result.main.length && !result.poster.length) {
            const value = String(result.meta.code);
            if (["AVATAR_INVALID_IMAGE", "AVATAR_INVALID_CROP", "AVATAR_OUTPUT_TOO_LARGE", "AVATAR_PROCESSING_TIMEOUT"].includes(value))
              throw avatarError(value === "AVATAR_INVALID_CROP" ? 400 : value === "AVATAR_PROCESSING_TIMEOUT" ? 503 : 422, value);
          }
          if (result.meta.kind !== "result" || Object.keys(result.meta).length !== 1) throw avatarError(422, "AVATAR_INVALID_IMAGE");
          if (requireAvatarRepresentation(result.main) !== "animated" || requireAvatarRepresentation(result.poster, true) !== "static")
            throw avatarError(422, "AVATAR_INVALID_IMAGE");
          check(); resolve({ main: result.main, poster: result.poster });
        } catch (error) { reject(error && typeof error === "object" && "getStatus" in error ? error : avatarError(422, "AVATAR_INVALID_IMAGE")); }
        finally { reader.clear(); child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); child.removeAllListeners(); }
      });
      if (options.signal?.aborted) abort();
      if (!reason) void protocol.send(child.stdin, { kind: "normalize", media, crop, remainingMs: deadline - performance.now() }, input, Buffer.alloc(0), true)
        .catch(() => terminate(avatarError(422, "AVATAR_INVALID_IMAGE")));
    });
  } finally { animatedActive = false; }
}
