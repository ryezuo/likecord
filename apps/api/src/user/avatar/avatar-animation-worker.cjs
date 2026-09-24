"use strict";
// This entry owns only native image work. Direct pure TS imports use Node 24's
// built-in type stripping; no API barrel, application bootstrap or extra loader.
const sharp = require("sharp");
const { avatarCropRect, DEFAULT_AVATAR_CROP } = require("@likecord/shared/src/avatar-crop.ts");
const { inspectAvatarAnimation, AVATAR_ANIMATION_LIMITS: L } = require("@likecord/shared/src/avatar-animation.ts");
const { Reader, send } = require("./avatar-animation-protocol.cjs");
sharp.concurrency(1); sharp.cache({ memory: 32, files: 0, items: 20 });
const invalid = () => { throw Error("AVATAR_INVALID_IMAGE"); };
async function normalize(job, input) {
  if (job.kind !== "normalize" || !Number.isFinite(job.remainingMs) || job.remainingMs <= 0 || job.remainingMs > L.processingMs) invalid();
  const deadline = performance.now() + job.remainingMs;
  const check = () => { if (performance.now() >= deadline) throw Error("AVATAR_PROCESSING_TIMEOUT"); };
  const seconds = () => { check(); return Math.max(1, Math.ceil((deadline - performance.now()) / 1000)); };
  const m = job.media;
  // The trusted parent supplied structural evidence; validate the bounded job as well.
  const parsed = inspectAvatarAnimation(input, check);
  if (!parsed || JSON.stringify(parsed) !== JSON.stringify(m)) invalid();
  const options = { failOn: "warning", limitInputPixels: L.pixelFrames, limitInputChannels: 4, unlimited: false, pages: m.frames };
  const meta = await sharp(input, options).metadata(); check();
  if (meta.format !== m.format || meta.width !== m.width || meta.pages !== m.frames || meta.pageHeight !== m.height
    || meta.height !== m.height * m.frames || meta.channels > 4 || meta.loop !== m.loop || meta.delay?.length !== m.frames) invalid();
  for (let i = 0; i < m.frames; i++) {
    const expected = m.format === "gif" && !m.gce[i] ? 100 : m.sourceDelays[i];
    if (meta.delay[i] !== expected) invalid();
  }
  const orientation = meta.orientation || 1;
  if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) invalid();
  let decoded = await sharp(input, options).toColourspace("srgb").ensureAlpha().raw()
    .timeout({ seconds: seconds() }).toBuffer(); check();
  const frameBytes = m.width * m.height * 4;
  if (decoded.length !== frameBytes * m.frames || decoded.length > L.rgba) invalid();
  const swap = orientation >= 5;
  let rect;
  try { rect = avatarCropRect(swap ? m.height : m.width, swap ? m.width : m.height, job.crop || DEFAULT_AVATAR_CROP); }
  catch { throw Error("AVATAR_INVALID_CROP"); }
  const side = rect.outputSide, bytes = side * side * 4;
  let joined = Buffer.alloc(bytes * m.frames);
  for (let i = 0; i < m.frames; i++) {
    check();
    let frame = sharp(decoded.subarray(i * frameBytes, (i + 1) * frameBytes), { raw: { width: m.width, height: m.height, channels: 4 } });
    if (orientation === 2) frame = frame.flop();
    if (orientation === 3) frame = frame.rotate(180);
    if (orientation === 4) frame = frame.flip();
    if (orientation === 5) frame = frame.flip().rotate(90);
    if (orientation === 6) frame = frame.rotate(90);
    if (orientation === 7) frame = frame.flop().rotate(90);
    if (orientation === 8) frame = frame.rotate(270);
    const out = await frame.extract({ left: rect.left, top: rect.top, width: rect.side, height: rect.side })
      .resize(side, side, { withoutEnlargement: true }).raw().timeout({ seconds: seconds() }).toBuffer();
    if (out.length !== bytes) invalid(); out.copy(joined, i * bytes);
  }
  decoded = null;
  const main = await sharp(joined, { raw: { width: side, height: side * m.frames, channels: 4, pageHeight: side } })
    .webp({ quality: 80, alphaQuality: 100, effort: 3, minSize: false, mixed: false, delay: m.delays, loop: m.loop })
    .timeout({ seconds: seconds() }).toBuffer();
  if (main.length > L.main) throw Error("AVATAR_OUTPUT_TOO_LARGE");
  const poster = await sharp(joined.subarray(0, bytes), { raw: { width: side, height: side, channels: 4 } })
    .webp({ quality: 85 }).timeout({ seconds: seconds() }).toBuffer(); joined = null;
  if (poster.length > L.poster) throw Error("AVATAR_OUTPUT_TOO_LARGE");
  const output = inspectAvatarAnimation(main, check);
  if (!output || output.width !== side || output.height !== side || output.frames !== m.frames || output.loop !== m.loop
    || JSON.stringify(output.sourceDelays) !== JSON.stringify(m.delays) || inspectAvatarAnimation(poster, check)) invalid();
  const pm = await sharp(poster, { failOn: "warning", limitInputPixels: 65536 }).metadata(); check();
  if (pm.format !== "webp" || pm.width !== side || pm.height !== side || (pm.pages || 1) !== 1) invalid();
  for (const buffer of [main, poster]) {
    for (let p = 12; p < buffer.length;) {
      const type = buffer.toString("ascii", p, p + 4);
      if (["EXIF", "XMP ", "ICCP"].includes(type)) invalid();
      const size = buffer.readUInt32LE(p + 4); p += 8 + size + size % 2;
    }
  }
  check(); return { main, poster };
}
const reader = new Reader(true);
let failed = false;
process.stdin.on("data", (chunk) => { if (!failed) { try { reader.push(chunk); } catch { failed = true; reader.clear(); process.exitCode = 1; process.stdin.destroy(); } } });
process.stdin.on("error", () => { reader.clear(); process.exitCode = 1; });
process.stdout.on("error", () => process.exit(1));
process.stdin.on("end", async () => {
  if (failed) return;
  try {
    const { meta, main, poster } = reader.end(); reader.clear(); if (poster.length) invalid();
    const result = await normalize(meta, main);
    await send(process.stdout, { kind: "result" }, result.main, result.poster);
  } catch (error) {
    reader.clear();
    const allowed = ["AVATAR_INVALID_IMAGE", "AVATAR_INVALID_CROP", "AVATAR_OUTPUT_TOO_LARGE", "AVATAR_PROCESSING_TIMEOUT"];
    const code = allowed.includes(error.message) ? error.message : "AVATAR_INVALID_IMAGE";
    await send(process.stdout, { kind: "error", code }).catch(() => {});
  }
});
