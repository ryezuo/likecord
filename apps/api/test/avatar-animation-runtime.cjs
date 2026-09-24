"use strict";
// Local implementation smoke. Run in the API linux/amd64 image with network none.
const assert = require("node:assert/strict");
const { normalizeAnimatedAvatar } = require("../dist/user/avatar/avatar-animation.js");
const { gifFixture, animatedWebp } = require("../dist/user/avatar/avatar-animation.fixtures.js");
const { inspectAvatarAnimation } = require("@likecord/shared/src/avatar-animation.ts");
const sharp = require("sharp");
(async () => {
  assert.equal(process.platform, "linux"); assert.equal(process.arch, "x64");
  for (const format of ["gif", "webp"]) {
    const input = format === "gif" ? gifFixture([null, 4, 10], 2) : await animatedWebp(8, 6, [0, 40, 100], 3);
    const result = await normalizeAnimatedAvatar(input, `image/${format}`, { v: 1, panX: 0, panY: 0, zoom: 1 });
    const parsed = inspectAvatarAnimation(result.main);
    assert.equal(parsed.frames, 3); assert.equal(parsed.loop, 3); assert.deepEqual(parsed.delays, [50, 50, 100]);
    assert.equal(inspectAvatarAnimation(result.poster), null);
    assert.equal((await sharp(result.main, { pages: 3 }).ensureAlpha().raw().toBuffer()).length, 6 * 6 * 3 * 4);
    console.log(JSON.stringify({ format, frames: parsed.frames, mainBytes: result.main.length, posterBytes: result.poster.length, result: "PASS" }));
  }
  const input = gifFixture();
  await assert.rejects(normalizeAnimatedAvatar(input, "image/gif", null, { budgetMs: 2 }), (error) => error.getResponse().error.code === "AVATAR_PROCESSING_TIMEOUT");
  assert.ok((await normalizeAnimatedAvatar(input, "image/gif", null)).poster.length);
  console.log(JSON.stringify({ result: "PASS", productionWorker: "dist/user/avatar/avatar-animation-worker.cjs", node: process.version, sharp: sharp.versions.sharp, vips: sharp.versions.vips, webp: sharp.versions.webp }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
