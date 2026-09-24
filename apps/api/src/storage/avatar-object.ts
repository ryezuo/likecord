import { randomUUID } from "crypto";
import { inspectAvatarAnimation, AVATAR_ANIMATION_LIMITS } from "@likecord/shared/avatar-animation";

export const AVATAR_OUTPUT_LIMIT = 512 * 1024;
export const AVATAR_STORAGE_MS = 15_000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const avatarUserIdPattern = new RegExp(`^${UUID}$`);
export const avatarVersionPattern = new RegExp(`^[1-9][0-9]{12}-${UUID}$`);
const keyPattern = new RegExp(`^avatars/(${UUID})/([1-9][0-9]{12}-${UUID})/(?:avatar|poster)\\.webp$`);

export interface AvatarObject { userId: string; version: string; time: number; key: string; url: string }
export interface AvatarPage { objects: { key: string; lastModified?: Date }[]; cursor?: string }
export interface AvatarStorage {
  putAvatar(key: string, buffer: Buffer): Promise<void>;
  readAvatar(key: string): Promise<Buffer | null>;
  deleteAvatar(key: string): Promise<void>;
  listAvatars(cursor?: string): Promise<AvatarPage>;
}

export function parseAvatarKey(key: string): AvatarObject | null {
  const match = keyPattern.exec(key);
  if (!match) return null;
  const [, userId, version] = match;
  return { userId, version, time: Number(version.slice(0, 13)), key,
    url: `/api/v1/users/${userId}/avatar/${version}.webp` };
}
export function requireAvatarKey(key: string): AvatarObject {
  const object = parseAvatarKey(key);
  if (!object) throw new Error("Invalid avatar key");
  return object;
}
export function createAvatarObject(userId: string, now: Date): AvatarObject {
  return requireAvatarKey(`avatars/${userId}/${now.getTime()}-${randomUUID()}/avatar.webp`);
}
export function parseAvatarUrl(userId: string, url: string | null): AvatarObject | null {
  const prefix = `/api/v1/users/${userId}/avatar/`;
  if (!url?.startsWith(prefix) || !url.endsWith(".webp")) return null;
  const object = parseAvatarKey(`avatars/${userId}/${url.slice(prefix.length, -5)}/avatar.webp`);
  return object?.url === url ? object : null;
}
export function requireNormalizedAvatar(buffer: Buffer): void {
  if (!buffer.length || buffer.length > AVATAR_OUTPUT_LIMIT || buffer.length < 12 ||
      buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP" ||
      buffer.readUInt32LE(4) + 8 !== buffer.length) throw new Error("Invalid normalized avatar");
}

export const avatarPosterKey = (object: AvatarObject) => `avatars/${object.userId}/${object.version}/poster.webp`;
export function avatarReadLimit(key: string, prefix?: Buffer): number {
  requireAvatarKey(key);
  if (prefix && !(prefix.length >= 30 && prefix.toString("ascii", 0, 4) === "RIFF"
    && prefix.toString("ascii", 8, 12) === "WEBP" && prefix.toString("ascii", 12, 16) === "VP8X"
    && prefix.readUInt32LE(16) === 10 && (prefix[20] & 2))) return AVATAR_OUTPUT_LIMIT;
  return key.endsWith("/poster.webp") ? AVATAR_OUTPUT_LIMIT : AVATAR_ANIMATION_LIMITS.main;
}

/** Classify canonical bytes, never grant static/poster objects the animation cap. */
export function requireAvatarRepresentation(buffer: Buffer, poster = false): "static" | "animated" {
  if (buffer.length < 12 || buffer.length > (poster ? AVATAR_OUTPUT_LIMIT : AVATAR_ANIMATION_LIMITS.main)
    || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP"
    || buffer.readUInt32LE(4) + 8 !== buffer.length) throw new Error("Invalid avatar representation");
  const animation = inspectAvatarAnimation(buffer);
  if (animation) {
    if (poster || animation.width > 256 || animation.width !== animation.height) throw new Error("Invalid animated avatar");
  } else requireNormalizedAvatar(buffer);
  let p = 12, frames = 0, width = 0, height = 0;
  while (p < buffer.length) {
    if (p + 8 > buffer.length) throw new Error("Invalid avatar chunk");
    const type = buffer.toString("ascii", p, p + 4), size = buffer.readUInt32LE(p + 4), data = p + 8;
    const next = data + size + size % 2;
    if (next > buffer.length || (size % 2 && buffer[next - 1] !== 0) || !["VP8X", "ANIM", "ANMF", "VP8 ", "VP8L", "ALPH"].includes(type))
      throw new Error("Invalid avatar chunk");
    if (type === "VP8 " || type === "VP8L") {
      frames++;
      if (type === "VP8L") {
        if (size < 5 || buffer[data] !== 0x2f) throw new Error("Invalid avatar pixels");
        const bits = buffer.readUInt32LE(data + 1); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
        if (bits >>> 29) throw new Error("Invalid avatar pixels");
      } else {
        if (size < 10 || buffer[data] & 1 || !buffer.subarray(data + 3, data + 6).equals(Buffer.from([0x9d, 1, 0x2a]))) throw new Error("Invalid avatar pixels");
        width = buffer.readUInt16LE(data + 6) & 0x3fff; height = buffer.readUInt16LE(data + 8) & 0x3fff;
      }
    }
    p = next;
  }
  if (!animation && (frames !== 1 || width < 1 || height < 1)) throw new Error("Invalid static avatar");
  return animation ? "animated" : "static";
}
