import sharp from "sharp";
import { inspectAvatarAnimation, checkAnimationBudget, normalizeAnimationTiming, AVATAR_ANIMATION_LIMITS as L } from "@likecord/shared/src/avatar-animation";
import { normalizeAnimatedAvatar } from "./avatar-animation";
import { gifFixture, animatedWebp, composedGif, composedWebp, webpChunks } from "./avatar-animation.fixtures";
import { avatarCropRect } from "@likecord/shared";
import { requireAvatarRepresentation } from "../../storage/avatar-object";

describe("AV2.2 structural and resource admission", () => {
  it("reads GIF original timing, absent GCE and total-play mapping", () => {
    for (const repeat of [null, 0, 1, 2, 7]) {
      const parsed = inspectAvatarAnimation(gifFixture([null, 0, 4, 5, 100], repeat))!;
      expect(parsed.sourceDelays).toEqual([0, 0, 40, 50, 1000]);
      expect(parsed.delays).toEqual([50, 50, 50, 50, 1000]);
      expect(parsed.gce).toEqual([false, true, true, true, true]);
      expect(parsed.loop).toBe(repeat === null ? 1 : repeat === 0 ? 0 : repeat + 1);
    }
    expect(() => inspectAvatarAnimation(gifFixture([5, 5], 65535))).toThrow("TIMING");
    expect(() => inspectAvatarAnimation(gifFixture([5]))).toThrow("FORMAT_UNSUPPORTED");
  });
  it("requires GIF trailer, complete control/subblocks/palettes and no trailing bytes", () => {
    const good = gifFixture();
    for (let i = 0; i < good.length; i++) {
      if (i < 3) continue;
      expect(() => inspectAvatarAnimation(good.subarray(0, i))).toThrow();
    }
    expect(() => inspectAvatarAnimation(Buffer.concat([good, Buffer.from([0])]))).toThrow();
    const bad = Buffer.from(good); bad[10] = 0x87;
    expect(() => inspectAvatarAnimation(bad)).toThrow();
  });
  it("checks every source ceiling at boundary and +1 without native allocation", () => {
    for (const shape of [[2048, 2048, 3], [1024, 1024, 12], [512, 512, 48], [323, 323, 120]])
      expect(() => checkAnimationBudget(...shape as [number, number, number])).not.toThrow();
    for (const shape of [[2049, 1, 2], [1, 1, 121], [2048, 2048, 4], [324, 324, 120]])
      expect(() => checkAnimationBudget(...shape as [number, number, number])).toThrow();
    expect(L.pixelFrames * 4).toBe(50_331_648);
    expect(() => inspectAvatarAnimation(Buffer.alloc(L.input + 1))).toThrow("TOO_LARGE");
    expect(() => inspectAvatarAnimation(Buffer.alloc(L.input))).not.toThrow();
    expect(normalizeAnimationTiming(Array(10).fill(1000))).toEqual(Array(10).fill(1000));
    expect(() => normalizeAnimationTiming([...Array(10).fill(1000), 0])).toThrow();
    for (const value of [-1, 0.5, NaN, Infinity, 1001, Number.MAX_SAFE_INTEGER])
      expect(() => normalizeAnimationTiming([value])).toThrow("TIMING");
    expect(normalizeAnimationTiming([0, 49, 50, 1000])).toEqual([50, 50, 50, 1000]);
  });
  it("reads WebP rectangles/timing/loop and rejects flag, length and frame defects", async () => {
    const good = await animatedWebp(8, 6, [20, 50, 1000], 7);
    expect(inspectAvatarAnimation(good)).toMatchObject({ width: 8, height: 6, frames: 3, loop: 7, delays: [50, 50, 1000] });
    for (const index of [4, 16, 20, 21]) {
      const bad = Buffer.from(good); bad[index] ^= 0x80;
      expect(() => inspectAvatarAnimation(bad)).toThrow();
    }
    const anmf = good.indexOf("ANMF"), bad = Buffer.from(good); bad[anmf + 8] = 255;
    expect(() => inspectAvatarAnimation(bad)).toThrow();
    const flags = Buffer.from(good); flags[anmf + 23] = 4;
    expect(() => inspectAvatarAnimation(flags)).toThrow();
    expect(() => inspectAvatarAnimation(good.subarray(0, good.length - 1))).toThrow();
  });
});

describe("AV2.2 real disposable native worker", () => {
  jest.setTimeout(20_000);
  it.each(["gif", "webp"])("fully normalizes %s into animation plus static frame-zero poster", async (format) => {
    const input = format === "gif" ? gifFixture([null, 4, 10], 2) : await animatedWebp(8, 6, [0, 40, 100], 3);
    const result = (await normalizeAnimatedAvatar(input, `image/${format}`, { v: 1, panX: 1, panY: -1, zoom: 2 }))!;
    expect(requireAvatarRepresentation(result.main)).toBe("animated"); expect(requireAvatarRepresentation(result.poster, true)).toBe("static");
    expect(inspectAvatarAnimation(result.main)).toMatchObject({ width: 3, height: 3, frames: 3, delays: [50, 50, 100], loop: 3 });
    const decoded = await sharp(result.main, { pages: 3 }).ensureAlpha().raw().toBuffer();
    const poster = await sharp(result.poster).ensureAlpha().raw().toBuffer();
    expect(decoded.length).toBe(3 * 3 * 3 * 4); expect(poster.length).toBe(3 * 3 * 4);
    expect(poster[0]).toBeGreaterThan(220); expect(decoded[36 + 1]).toBeGreaterThan(220); expect(decoded[72 + 2]).toBeGreaterThan(220);
    expect(result.main.includes(Buffer.from("EXIF"))).toBe(false);
    expect(result.main.length).toBeLessThanOrEqual(L.main); expect(result.poster.length).toBeLessThanOrEqual(L.poster);
  });
  it("passes static WebP to the original static owner", async () => {
    const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).webp().toBuffer();
    await expect(normalizeAnimatedAvatar(input, "image/webp", null)).resolves.toBeNull();
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])("composes partial frames before crop and independently verifies EXIF %i (0 = GIF)", async (orientation) => {
    const fixture = orientation ? await composedWebp(orientation) : composedGif();
    const { width: w, height: h, frames } = fixture;
    const decoded = await sharp(fixture.input, { pages: frames }).ensureAlpha().raw().toBuffer();
    for (let p = 0; p < decoded.length; p++) {
      if (p % 4 !== 3 && fixture.expected[p - p % 4 + 3] === 0) continue;
      expect(Math.abs(decoded[p] - fixture.expected[p])).toBeLessThanOrEqual(1);
    }
    const o = orientation || 1, ow = o >= 5 ? h : w, oh = o >= 5 ? w : h;
    const crop = { v: 1 as const, panX: 0, panY: 0, zoom: 1 };
    const rect = avatarCropRect(ow, oh, crop), side = rect.outputSide;
    const expected = Buffer.alloc(side * side * frames * 4);
    for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [ox, oy] = [[x, y], [w - 1 - x, y], [w - 1 - x, h - 1 - y], [x, h - 1 - y], [y, x], [h - 1 - y, x], [h - 1 - y, w - 1 - x], [y, w - 1 - x]][o - 1];
      if (ox < rect.left || ox >= rect.left + side || oy < rect.top || oy >= rect.top + side) continue;
      const from = (f * w * h + y * w + x) * 4, to = (f * side * side + (oy - rect.top) * side + ox - rect.left) * 4;
      decoded.copy(expected, to, from, from + 4);
    }
    const result = (await normalizeAnimatedAvatar(fixture.input, orientation ? "image/webp" : "image/gif", crop))!;
    const reference = await sharp(expected, { raw: { width: side, height: side * frames, channels: 4, pageHeight: side } })
      .webp({ quality: 80, alphaQuality: 100, effort: 3, minSize: false, mixed: false, delay: [50, 50, 70, 1000, 50], loop: 3 }).toBuffer();
    expect(result.main).toEqual(reference);
    expect(result.poster).toEqual(await sharp(expected.subarray(0, side * side * 4), { raw: { width: side, height: side, channels: 4 } }).webp({ quality: 85 }).toBuffer());
    expect(webpChunks(result.main).map((c) => c.type)).not.toEqual(expect.arrayContaining(["EXIF", "ICCP", "XMP "]));
  });
  it("rejects corrupted later WebP pixels after successful metadata and structure", async () => {
    const input = await animatedWebp();
    const last = webpChunks(input).filter((c) => c.type === "ANMF").at(-1)!;
    // Keep ANMF and lossless geometry intact, corrupt only entropy payload.
    input.fill(255, last.offset + 8 + 16 + 8 + 5, last.offset + 8 + last.data.length);
    expect(inspectAvatarAnimation(input)?.frames).toBe(3);
    await expect(sharp(input, { pages: 3 }).metadata()).resolves.toMatchObject({ pages: 3 });
    await expect(normalizeAnimatedAvatar(input, "image/webp", null)).rejects.toMatchObject({ status: 422 });
  });
  it("rejects compressed GIF corruption that passes structure and metadata", async () => {
    const input = gifFixture();
    const image = input.indexOf(0x2c), data = image + 12;
    input.fill(255, data, data + input[image + 11]);
    expect(inspectAvatarAnimation(input)?.frames).toBe(3);
    await expect(sharp(input, { pages: 3 }).metadata()).resolves.toMatchObject({ pages: 3 });
    await expect(normalizeAnimatedAvatar(input, "image/gif", null)).rejects.toMatchObject({ status: 422 });
  });
  it("reserves one animated slot and releases after timeout/abort so the next operation works", async () => {
    const input = await animatedWebp();
    const first = normalizeAnimatedAvatar(input, "image/webp", null, { budgetMs: 2 });
    await expect(normalizeAnimatedAvatar(input, "image/webp", null)).rejects.toMatchObject({ status: 503, response: { error: { code: "AVATAR_BUSY" } } });
    await expect(first).rejects.toMatchObject({ response: { error: { code: "AVATAR_PROCESSING_TIMEOUT" } } });
    const abort = new AbortController(); const pending = normalizeAnimatedAvatar(input, "image/webp", null, { signal: abort.signal }); abort.abort();
    await expect(pending).rejects.toMatchObject({ response: { error: { code: "AVATAR_RECEIVE_ABORTED" } } });
    await expect(normalizeAnimatedAvatar(input, "image/webp", null)).resolves.toHaveProperty("poster");
  });
});
