import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import sharp from "sharp";
import { createAvatarObject, parseAvatarKey, parseAvatarUrl, requireNormalizedAvatar, requireAvatarRepresentation, avatarPosterKey } from "./avatar-object";
import { animatedWebp, webpChunks, webpChunk, webpRiff } from "../user/avatar/avatar-animation.fixtures";
import { LocalAvatarStorage } from "./local-avatar-storage";
import { R2StorageProvider } from "./r2-storage.provider";

const send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => {
  const real = jest.requireActual("@aws-sdk/client-s3");
  return { ...real, S3Client: jest.fn(() => ({ send: (...args: unknown[]) => send(...args) })) };
});
const id = "11111111-1111-4111-8111-111111111111";
const object = () => createAvatarObject(id, new Date());
let bytes: Buffer;
beforeAll(async () => { bytes = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).webp().toBuffer(); });

// Extend one compressed chunk with trailing padding to exercise exact wire caps
// without creating a large decoded fixture or an expensive encoder workload.
function padRepresentation(input: Buffer, size: number, animated: boolean): Buffer {
  let padded = false;
  return webpRiff(webpChunks(input).map((chunk) => {
    if (!padded && (animated ? chunk.type === "ANMF" : ["VP8 ", "VP8L"].includes(chunk.type))) {
      padded = true;
      if (!animated) return webpChunk(chunk.type, Buffer.concat([chunk.data, Buffer.alloc(size - input.length)]));
      const frame = Buffer.from(chunk.data), subSize = frame.readUInt32LE(20);
      frame.writeUInt32LE(subSize + size - input.length, 20);
      return webpChunk(chunk.type, Buffer.concat([frame, Buffer.alloc(size - input.length)]));
    }
    return webpChunk(chunk.type, chunk.data);
  }));
}

describe("canonical avatar identity", () => {
  it("round trips only exact owned canonical URLs/keys", () => {
    const avatar = object();
    expect(parseAvatarUrl(id, avatar.url)).toEqual(avatar);
    expect(parseAvatarKey(avatar.key)).toEqual(avatar);
    for (const bad of ["https://example.org/pic", avatar.key, avatar.url + "?a=1", avatar.url.replace(id, "other"), null]) expect(parseAvatarUrl(id, bad)).toBeNull();
    for (const bad of ["../avatar.webp", "C:/avatar.webp", "avatars/../x", avatar.key.replace("/avatar", "\\avatar"), avatar.key + "/.."]) expect(parseAvatarKey(bad)).toBeNull();
  });
  it("enforces encoded output cap and WebP container at the storage boundary", () => {
    expect(() => requireNormalizedAvatar(bytes)).not.toThrow();
    expect(() => requireNormalizedAvatar(Buffer.alloc(512 * 1024 + 1))).toThrow();
    expect(() => requireNormalizedAvatar(Buffer.from("raw input"))).toThrow();
  });
  it("recognizes only fixed poster/main keys and preserves independent exact representation caps", async () => {
    const avatar = object(), animation = await animatedWebp(8, 8);
    expect(parseAvatarKey(avatarPosterKey(avatar))?.url).toBe(avatar.url);
    expect(parseAvatarUrl(id, avatar.url.replace(".webp", ".poster.webp"))).toBeNull();
    expect(parseAvatarKey(avatar.key.replace("avatar.webp", "other.webp"))).toBeNull();
    const main = padRepresentation(animation, 2 * 1024 * 1024, true);
    const poster = padRepresentation(bytes, 512 * 1024, false);
    expect(requireAvatarRepresentation(main)).toBe("animated");
    expect(requireAvatarRepresentation(poster, true)).toBe("static");
    expect(() => requireAvatarRepresentation(main, true)).toThrow();
    expect(() => requireAvatarRepresentation(padRepresentation(bytes, 512 * 1024 + 2, false))).toThrow();
    expect(() => requireAvatarRepresentation(Buffer.concat([main, Buffer.from([0])]))).toThrow();
    expect(() => requireAvatarRepresentation(Buffer.concat([poster, Buffer.from([0])]), true)).toThrow();
  });
});

describe("local avatar storage", () => {
  let root: string, provider: LocalAvatarStorage;
  beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), "likecord-avatar-test-")); provider = new LocalAvatarStorage(root); });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
  it("stores and reads an animated pair without granting static/poster the 2 MiB allowance", async () => {
    const avatar = object(), main = padRepresentation(await animatedWebp(8, 8), 600 * 1024, true);
    await provider.putAvatar(avatar.key, main); await provider.putAvatar(avatarPosterKey(avatar), bytes);
    expect(await provider.readAvatar(avatar.key)).toEqual(main); expect(await provider.readAvatar(avatarPosterKey(avatar))).toEqual(bytes);
    expect((await provider.listAvatars()).objects).toHaveLength(2);
    await expect(provider.putAvatar(avatarPosterKey(object()), main)).rejects.toThrow();
    await expect(provider.putAvatar(object().key, padRepresentation(bytes, 600 * 1024, false))).rejects.toThrow();
  });
  it("puts exclusively, reads fixed WebP, lists lastModified and deletes idempotently", async () => {
    const avatar = object();
    await provider.putAvatar(avatar.key, bytes);
    await expect(provider.putAvatar(avatar.key, bytes)).rejects.toMatchObject({ code: "EEXIST" });
    expect(await provider.readAvatar(avatar.key)).toEqual(bytes);
    const listed = (await provider.listAvatars()).objects;
    expect(listed.map((entry) => entry.key)).toEqual([avatar.key]);
    expect(Number.isFinite(listed[0].lastModified?.getTime())).toBe(true);
    await provider.deleteAvatar(avatar.key); await provider.deleteAvatar(avatar.key);
    expect(await provider.readAvatar(avatar.key)).toBeNull();
  });
  it("rejects traversal for every operation", async () => {
    for (const key of ["../outside", "C:\\outside", "avatars/../escape", object().key + "/.."]) {
      await expect(provider.putAvatar(key, bytes)).rejects.toThrow();
      await expect(provider.readAvatar(key)).rejects.toThrow();
      await expect(provider.deleteAvatar(key)).rejects.toThrow();
    }
  });
  it("rejects symlink/junction ancestor escapes", async () => {
    const outside = path.join(root, "outside"); await fs.mkdir(outside);
    await fs.symlink(outside, path.join(root, "avatars"), "junction");
    const avatar = object();
    await expect(provider.putAvatar(avatar.key, bytes)).rejects.toThrow("Unsafe");
    await expect(provider.readAvatar(avatar.key)).rejects.toThrow("Unsafe");
    await expect(provider.deleteAvatar(avatar.key)).rejects.toThrow("Unsafe");
    await expect(provider.listAvatars()).rejects.toThrow("Unsafe");
    expect(await fs.readdir(outside)).toEqual([]);
  });
  it("does not disguise invalid objects as absent or deleted", async () => {
    const avatar = object(); await provider.putAvatar(avatar.key, bytes);
    await fs.unlink(path.join(root, avatar.key)); await fs.mkdir(path.join(root, avatar.key));
    await expect(provider.readAvatar(avatar.key)).rejects.toThrow("Unsafe");
    await expect(provider.deleteAvatar(avatar.key)).rejects.toThrow("Unsafe");
  });
  it("retains lexical pagination while deleting a page and reports malformed inventory", async () => {
    for (let i = 0; i < 103; i++) await provider.putAvatar(object().key, bytes);
    await fs.writeFile(path.join(root, "avatars", "unknown"), "untouched");
    const first = await provider.listAvatars(); expect(first.objects).toHaveLength(100); expect(first.cursor).toBeDefined();
    for (const entry of first.objects) await provider.deleteAvatar(entry.key);
    const second = await provider.listAvatars(first.cursor);
    expect(second.objects).toHaveLength(4); expect(second.cursor).toBeUndefined();
    expect(second.objects.some((entry) => entry.key === "avatars/unknown")).toBe(true);
  });
});

describe("R2 avatar storage (mock SDK only)", () => {
  let provider: R2StorageProvider;
  beforeEach(() => { send.mockReset(); provider = new R2StorageProvider(); });
  it("streams a recognized animated main with bounded reads and keeps poster/static at 512 KiB", async () => {
    const avatar = object(), main = padRepresentation(await animatedWebp(8, 8), 600 * 1024, true);
    await provider.putAvatar(avatar.key, main); await provider.putAvatar(avatarPosterKey(avatar), bytes);
    send.mockResolvedValueOnce({ Body: (async function* () { yield main.subarray(0, 13); yield main.subarray(13, 30); yield main.subarray(30); })(), ContentLength: main.length });
    expect(await provider.readAvatar(avatar.key)).toEqual(main);
    await expect(provider.putAvatar(avatarPosterKey(avatar), main)).rejects.toThrow();
    send.mockResolvedValueOnce({ Body: (async function* () { yield main; })(), ContentLength: main.length });
    await expect(provider.readAvatar(avatarPosterKey(avatar))).rejects.toThrow("size");
    send.mockResolvedValueOnce({ Body: (async function* () { yield padRepresentation(bytes, 600 * 1024, false); })() });
    await expect(provider.readAvatar(avatar.key)).rejects.toThrow("size");
  });
  it("uses exclusive server PUT, fixed MIME, and bounded abort signal", async () => {
    const avatar = object(); await provider.putAvatar(avatar.key, bytes);
    expect(send.mock.calls[0][0].input).toMatchObject({ Key: avatar.key, Body: bytes, ContentType: "image/webp", IfNoneMatch: "*" });
    expect(send.mock.calls[0][1].abortSignal).toBeInstanceOf(AbortSignal);
  });
  it("reads bounded WebP and uses strict delete", async () => {
    send.mockResolvedValueOnce({ Body: (async function* () { yield bytes; })(), ContentLength: bytes.length });
    const avatar = object(); expect(await provider.readAvatar(avatar.key)).toEqual(bytes);
    await provider.deleteAvatar(avatar.key);
    expect(send.mock.calls[1][0].input.Key).toBe(avatar.key);
    send.mockRejectedValueOnce(new Error("offline")); await expect(provider.deleteAvatar(avatar.key)).rejects.toThrow("offline");
  });
  it("distinguishes 404 from access/network/missing-body failures", async () => {
    send.mockRejectedValueOnce({ name: "NoSuchKey" }); expect(await provider.readAvatar(object().key)).toBeNull();
    for (const failure of [{ name: "AccessDenied" }, new Error("offline")]) {
      send.mockRejectedValueOnce(failure); await expect(provider.readAvatar(object().key)).rejects.toEqual(failure);
    }
    send.mockResolvedValueOnce({}); await expect(provider.readAvatar(object().key)).rejects.toThrow();
    send.mockResolvedValueOnce({ Body: (async function* () { yield Buffer.alloc(512 * 1024 + 1); })() });
    await expect(provider.readAvatar(object().key)).rejects.toThrow();
  });
  it("paginates only avatars and refuses an incomplete cursor", async () => {
    const avatar = object(), date = new Date();
    send.mockResolvedValueOnce({ Contents: [{ Key: avatar.key, LastModified: date }], IsTruncated: true, NextContinuationToken: "next" });
    expect(await provider.listAvatars()).toEqual({ objects: [{ key: avatar.key, lastModified: date }], cursor: "next" });
    send.mockResolvedValueOnce({ Contents: [], IsTruncated: false }); await provider.listAvatars("next");
    expect(send.mock.calls[1][0].input).toMatchObject({ Prefix: "avatars/", MaxKeys: 100, ContinuationToken: "next" });
    send.mockResolvedValueOnce({ IsTruncated: true }); await expect(provider.listAvatars()).rejects.toThrow();
  });
});
