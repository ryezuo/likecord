import sharp from "sharp";
import { HttpException } from "@nestjs/common";
import { Readable } from "stream";
import { Request } from "express";
import { normalizeAvatar, inspectAvatarContainer, AVATAR_INPUT_LIMIT } from "./avatar-image";
import { receiveAvatar } from "./avatar-transport";
import { avatarCropRect, type AvatarCrop } from "@likecord/shared";

const picture = (width = 40, height = 20) => sharp({ create: { width, height, channels: 4, background: { r: 200, g: 40, b: 60, alpha: 0.4 } } });
const code = async (promise: Promise<unknown>, expected: string) => {
  try { await promise; throw new Error("Expected rejection"); }
  catch (error) { expect((error as HttpException).getResponse()).toMatchObject({ error: { code: expected } }); }
};
const chunk = (type: string, body: Buffer) => {
  const output = Buffer.alloc(body.length + 12);
  output.writeUInt32BE(body.length); output.write(type, 4); body.copy(output, 8);
  return output;
};

describe("avatar image safety and normalization", () => {
  it.each(["jpeg", "png", "webp"] as const)("fully decodes %s into a small static WebP", async (format) => {
    const input = await picture(520, 300).toFormat(format).toBuffer();
    const output = await normalizeAvatar(input, `image/${format}`);
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 256, height: 256, space: "srgb" });
    expect(meta.pages || 1).toBe(1);
    expect(output.length).toBeLessThanOrEqual(512 * 1024);
    expect(meta.exif).toBeUndefined(); expect(meta.icc).toBeUndefined(); expect(meta.xmp).toBeUndefined();
  });
  it("preserves alpha and never upscales", async () => {
    const output = await normalizeAvatar(await picture().png().toBuffer(), "image/png");
    expect(await sharp(output).metadata()).toMatchObject({ width: 20, height: 20, hasAlpha: true });
    const pixels = await sharp(output).raw().toBuffer();
    expect(pixels[3]).toBeGreaterThan(95); expect(pixels[3]).toBeLessThan(110);
  });
  it("applies EXIF orientation, center crop and strips metadata", async () => {
    const input = await sharp({ create: { width: 60, height: 20, channels: 3, background: "red" } })
      .composite([{ input: await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer(), left: 20, top: 0 }])
      .withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const output = await normalizeAvatar(input, "image/jpeg");
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ width: 20, height: 20 });
    expect(meta.orientation).toBeUndefined(); expect(meta.exif).toBeUndefined(); expect(meta.icc).toBeUndefined();
    const mean = (await sharp(output).stats()).channels;
    expect(mean[2].mean).toBeGreaterThan(220); expect(mean[0].mean).toBeLessThan(30);
  });
  it("preserves the exact V1 center crop when the crop header is absent or reset", async () => {
    const input = await picture(521, 301).png().toBuffer();
    const absent = await normalizeAvatar(input, "image/png");
    const reset = await normalizeAvatar(input, "image/png", { v: 1, panX: 0, panY: 0, zoom: 1 });
    expect(reset).toEqual(absent);
  });
  it("extracts exact bounded pan and zoom regions before resize", async () => {
    const block = async (background: string) => sharp({ create: { width: 30, height: 30, channels: 3, background } }).png().toBuffer();
    const input = await sharp({ create: { width: 90, height: 30, channels: 3, background: "red" } })
      .composite([{ input: await block("green"), left: 30, top: 0 }, { input: await block("blue"), left: 60, top: 0 }]).png().toBuffer();
    const channelMeans = async (panX: number, zoom = 1) => (await sharp(await normalizeAvatar(input, "image/png", { v: 1, panX, panY: 0, zoom })).stats()).channels.map((channel) => channel.mean);
    const left = await channelMeans(-1), center = await channelMeans(0), right = await channelMeans(1);
    expect(left[0]).toBeGreaterThan(220); expect(left[1]).toBeLessThan(30); expect(left[2]).toBeLessThan(30);
    expect(center[1]).toBeGreaterThan(100); expect(center[0]).toBeLessThan(30); expect(center[2]).toBeLessThan(30);
    expect(right[2]).toBeGreaterThan(220); expect(right[0]).toBeLessThan(30); expect(right[1]).toBeLessThan(30);
    expect(await sharp(await normalizeAvatar(input, "image/png", { v: 1, panX: 0, panY: 0, zoom: 4 })).metadata()).toMatchObject({ width: 7, height: 7 });
  });
  it("rejects dimension-dependent crop geometry as AVATAR_INVALID_CROP", async () => {
    await code(normalizeAvatar(await picture(1, 3).png().toBuffer(), "image/png", { v: 1, panX: 0, panY: 0, zoom: 1.01 }), "AVATAR_INVALID_CROP");
    await code(normalizeAvatar(await picture(10, 20).png().toBuffer(), "image/png", { v: 1, panX: 0.1, panY: 0, zoom: 1 }), "AVATAR_INVALID_CROP");
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("applies EXIF orientation %s before canonical crop geometry", async (orientation) => {
    const width = 8, height = 6, channels = 3;
    const source = Buffer.alloc(width * height * channels);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      source[offset] = 20 + x * 20; source[offset + 1] = 20 + y * 30; source[offset + 2] = 10 + (x + y) * 10;
    }
    const input = await sharp(source, { raw: { width, height, channels } }).withMetadata({ orientation }).png().toBuffer();
    const crop: AvatarCrop = { v: 1, panX: 1, panY: -1, zoom: 2 };
    const output = await sharp(await normalizeAvatar(input, "image/png", crop)).raw().toBuffer({ resolveWithObject: true });
    const rotated = orientation >= 5;
    const orientedWidth = rotated ? height : width, orientedHeight = rotated ? width : height;
    const oriented = Buffer.alloc(orientedWidth * orientedHeight * channels);
    for (let y = 0; y < orientedHeight; y++) for (let x = 0; x < orientedWidth; x++) {
      let sourceX = x, sourceY = y;
      if (orientation === 2) sourceX = width - 1 - x;
      if (orientation === 3) { sourceX = width - 1 - x; sourceY = height - 1 - y; }
      if (orientation === 4) sourceY = height - 1 - y;
      if (orientation === 5) { sourceX = y; sourceY = x; }
      if (orientation === 6) { sourceX = y; sourceY = height - 1 - x; }
      if (orientation === 7) { sourceX = width - 1 - y; sourceY = height - 1 - x; }
      if (orientation === 8) { sourceX = width - 1 - y; sourceY = x; }
      source.copy(oriented, (y * orientedWidth + x) * channels, (sourceY * width + sourceX) * channels, (sourceY * width + sourceX + 1) * channels);
    }
    const rectangle = avatarCropRect(orientedWidth, orientedHeight, crop);
    const expectedCrop = Buffer.alloc(rectangle.side * rectangle.side * channels);
    for (let y = 0; y < rectangle.side; y++) {
      const start = ((rectangle.top + y) * orientedWidth + rectangle.left) * channels;
      oriented.copy(expectedCrop, y * rectangle.side * channels, start, start + rectangle.side * channels);
    }
    const expected = await sharp(expectedCrop, { raw: { width: rectangle.side, height: rectangle.side, channels } }).webp({ quality: 85 }).toBuffer();
    const expectedPixels = await sharp(expected).raw().toBuffer();
    expect(output.info).toMatchObject({ width: rectangle.outputSide, height: rectangle.outputSide });
    expect(output.data).toHaveLength(expectedPixels.length);
    const meanDifference = output.data.reduce((sum, value, index) => sum + Math.abs(value - expectedPixels[index]), 0) / output.data.length;
    expect(meanDifference).toBeLessThan(3);
  });
  it("rejects spoofing, empty/large input, and unsupported signatures", async () => {
    await code(normalizeAvatar(await picture().png().toBuffer(), "image/jpeg"), "AVATAR_MIME_MISMATCH");
    await code(normalizeAvatar(Buffer.alloc(0), "image/png"), "AVATAR_EMPTY_INPUT");
    await code(normalizeAvatar(Buffer.alloc(AVATAR_INPUT_LIMIT + 1), "image/png"), "AVATAR_TOO_LARGE");
    for (const text of ["GIF89a", "<svg/>", "%PDF-1.7", "xxxxftypavif", "garbage", "RIFF0000WAVE"]) {
      await code(normalizeAvatar(Buffer.from(text), "image/png"), "AVATAR_FORMAT_UNSUPPORTED");
    }
  });
  it("rotates asymmetric pixels according to EXIF before cropping", async () => {
    const blue = await sharp({ create: { width: 20, height: 10, channels: 3, background: "blue" } }).png().toBuffer();
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } })
      .composite([{ input: blue, top: 10, left: 0 }]).withMetadata({ orientation: 6 }).jpeg({ quality: 100 }).toBuffer();
    const raw = await sharp(await normalizeAvatar(input, "image/jpeg")).raw().toBuffer();
    const left = (10 * 20 + 2) * 3, right = (10 * 20 + 17) * 3;
    expect(raw[left + 2]).toBeGreaterThan(220); expect(raw[left]).toBeLessThan(30);
    expect(raw[right]).toBeGreaterThan(220); expect(raw[right + 2]).toBeLessThan(30);
  });
  it.each(["jpeg", "png", "webp"] as const)("rejects truncated %s", async (format) => {
    const input = await picture().toFormat(format).toBuffer();
    await code(normalizeAvatar(input.subarray(0, -4), `image/${format}`), "AVATAR_INVALID_IMAGE");
  });
  it("rejects corrupted pixel data even with intact JPEG framing", async () => {
    const input = await picture(300, 300).jpeg().toBuffer();
    const sos = input.indexOf(Buffer.from([255, 218]));
    const start = sos + 2 + input.readUInt16BE(sos + 2);
    const corrupt = Buffer.concat([input.subarray(0, start), Buffer.from([255, 217])]);
    await code(normalizeAvatar(corrupt, "image/jpeg"), "AVATAR_INVALID_IMAGE");
  });
  it("rejects APNG and animated WebP markers before decode", async () => {
    const png = await picture().png().toBuffer();
    const apng = Buffer.concat([png.subarray(0, 33), chunk("acTL", Buffer.alloc(8)), png.subarray(33)]);
    await code(normalizeAvatar(apng, "image/png"), "AVATAR_ANIMATION_UNSUPPORTED");
    const webp = await picture().webp().toBuffer();
    const animation = Buffer.alloc(14); animation.write("ANIM"); animation.writeUInt32LE(6, 4);
    const animated = Buffer.concat([webp, animation]); animated.writeUInt32LE(animated.length - 8, 4);
    await code(normalizeAvatar(animated, "image/webp"), "AVATAR_ANIMATION_UNSUPPORTED");
  });
  it("rejects excessive axes and pixel area before allocation", async () => {
    const input = await picture().png().toBuffer();
    for (const [w, h] of [[4097, 1], [1, 4097], [65535, 65535]]) {
      const altered = Buffer.from(input); altered.writeUInt32BE(w, 16); altered.writeUInt32BE(h, 20);
      await code(normalizeAvatar(altered, "image/png"), "AVATAR_DIMENSIONS_EXCEEDED");
    }
  });
  it("maps the native WebP pixel-limit rejection to the dimensions error", async () => {
    const input = await picture(4097, 4097).webp().toBuffer();
    await code(normalizeAvatar(input, "image/webp"), "AVATAR_DIMENSIONS_EXCEEDED");
  });
  it("rejects malformed RIFF lengths and JPEG segments", () => {
    expect(() => inspectAvatarContainer(Buffer.from([255,216,255,224,255,255]))).toThrow();
    expect(() => inspectAvatarContainer(Buffer.from("RIFF0000WEBP"))).toThrow();
  });
});

describe("bounded raw receive", () => {
  function stream(chunks: Buffer[], headers = {}) {
    const req = Readable.from(chunks) as unknown as Request;
    req.headers = headers;
    return req;
  }
  it("reads supported binary chunks, rejects empty, and ignores a dishonest small Content-Length", async () => {
    expect(await receiveAvatar(stream([Buffer.from("a"), Buffer.from("b")]))).toEqual(Buffer.from("ab"));
    await code(receiveAvatar(stream([])), "AVATAR_EMPTY_INPUT");
    await code(receiveAvatar(stream([Buffer.alloc(3 * 1024 * 1024), Buffer.alloc(3 * 1024 * 1024)], { "content-length": "1" })), "AVATAR_TOO_LARGE");
  });
  it("stops chunked oversize without consuming more chunks", async () => {
    const req = stream([Buffer.alloc(AVATAR_INPUT_LIMIT), Buffer.alloc(1), Buffer.alloc(10)]);
    await code(receiveAvatar(req), "AVATAR_TOO_LARGE");
    expect(req.isPaused()).toBe(true);
  });
  it("enforces receive deadline and abort", async () => {
    jest.useFakeTimers();
    const req = new Readable({ read() {} }) as unknown as Request; req.headers = {};
    const pending = code(receiveAvatar(req), "AVATAR_PROCESSING_TIMEOUT");
    await jest.advanceTimersByTimeAsync(30_000); await pending;
    const aborted = new Readable({ read() {} }) as unknown as Request; aborted.headers = {};
    const abort = code(receiveAvatar(aborted), "AVATAR_RECEIVE_ABORTED"); aborted.emit("aborted"); await abort;
    jest.useRealTimers();
  });
});
