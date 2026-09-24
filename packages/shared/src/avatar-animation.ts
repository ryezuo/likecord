/** Pure bounded container inspection. No native decoder or application services. */
export const AVATAR_ANIMATION_LIMITS = Object.freeze({ input: 5 * 1024 * 1024, axis: 2048,
  frames: 120, pixelFrames: 12_582_912, rgba: 50_331_648, processingMs: 10_000,
  main: 2 * 1024 * 1024, poster: 512 * 1024, cycleMs: 10_000 });
export class AvatarAnimationError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export interface AvatarAnimation {
  format: "gif" | "webp"; width: number; height: number; frames: number;
  sourceDelays: number[]; delays: number[]; gce: boolean[]; loop: number;
}
const fail = (code = "AVATAR_INVALID_IMAGE"): never => { throw new AvatarAnimationError(code); };
export function checkAnimationBudget(width: number, height: number, frames: number): void {
  const l = AVATAR_ANIMATION_LIMITS;
  if (![width, height, frames].every(Number.isSafeInteger) || width < 1 || height < 1 || frames < 1) fail();
  if (width > l.axis || height > l.axis) fail("AVATAR_DIMENSIONS_EXCEEDED");
  if (frames > l.frames || width * height * frames > l.pixelFrames || width * height * frames * 4 > l.rgba)
    fail("AVATAR_ANIMATION_LIMIT_EXCEEDED");
}
export function normalizeAnimationTiming(source: number[]): number[] {
  if (!source.length || source.length > AVATAR_ANIMATION_LIMITS.frames) fail("AVATAR_INVALID_TIMING");
  const delays = source.map((value) => {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1000) fail("AVATAR_INVALID_TIMING");
    return Math.max(50, value);
  });
  if (delays.reduce((sum, value) => sum + value, 0) > AVATAR_ANIMATION_LIMITS.cycleMs) fail("AVATAR_INVALID_TIMING");
  return delays;
}

/** Null denotes a non-animation candidate; static validation remains its own owner. */
export function inspectAvatarAnimation(input: Uint8Array, checkDeadline: () => void = () => {}): AvatarAnimation | null {
  const n = input.length;
  if (n > AVATAR_ANIMATION_LIMITS.input) fail("AVATAR_TOO_LARGE");
  const view = new DataView(input.buffer, input.byteOffset, n);
  const need = (offset: number, length: number) => { checkDeadline(); if (offset < 0 || length < 0 || offset + length > n) fail(); };
  const u16 = (p: number) => { need(p, 2); return view.getUint16(p, true); };
  const u24 = (p: number) => { need(p, 3); return input[p] + input[p + 1] * 256 + input[p + 2] * 65536; };
  const u32 = (p: number) => { need(p, 4); return view.getUint32(p, true); };
  const text = (p: number, size: number) => { need(p, size); return String.fromCharCode(...input.subarray(p, p + size)); };
  checkDeadline();
  if (n >= 3 && text(0, 3) === "GIF") {
    need(0, 13);
    if (!["GIF87a", "GIF89a"].includes(text(0, 6))) fail();
    const width = u16(6), height = u16(8), packed = input[10];
    checkAnimationBudget(width, height, 1);
    let p = 13, globalColors = 0;
    if (packed & 128) { globalColors = 2 ** ((packed & 7) + 1); need(p, globalColors * 3); p += globalColors * 3; }
    if (globalColors && input[11] >= globalColors) fail();
    const sourceDelays: number[] = [], gce: boolean[] = [];
    let control: { delay: number; transparent: number | null } | null = null, loop = 1, loopSeen = false, ended = false;
    const blocks = () => {
      let bytes = 0;
      for (;;) { need(p, 1); const length = input[p++]; if (!length) break; need(p, length); p += length; bytes += length; }
      return bytes;
    };
    while (p < n) {
      need(p, 1); const tag = input[p++];
      if (tag === 0x3b) { ended = true; break; }
      if (tag === 0x21) {
        need(p, 1); const label = input[p++];
        if (label === 0xf9) {
          need(p, 6);
          if (control || input[p] !== 4 || input[p + 5] !== 0 || (input[p + 1] & 0xe0) || ((input[p + 1] >> 2) & 7) > 3) fail();
          control = { delay: u16(p + 2) * 10, transparent: input[p + 1] & 1 ? input[p + 4] : null }; p += 6;
        } else if (label === 0xff) {
          need(p, 12); if (input[p++] !== 11) fail();
          const application = text(p, 11); p += 11;
          if (["NETSCAPE2.0", "ANIMEXTS1.0"].includes(application)) {
            need(p, 5); if (loopSeen || input[p] !== 3 || input[p + 1] !== 1 || input[p + 4] !== 0) fail();
            const repeats = u16(p + 2); loop = repeats ? repeats + 1 : 0;
            if (loop > 65535) fail("AVATAR_INVALID_TIMING");
            loopSeen = true; p += 5;
          } else blocks();
        } else if (label === 0xfe) blocks();
        else if (label === 0x01) {
          // Plain-text rendering is not represented in decoder image pages.
          need(p, 13); if (input[p] !== 12) fail();
          fail();
        } else fail();
      } else if (tag === 0x2c) {
        need(p, 9);
        const x = u16(p), y = u16(p + 2), w = u16(p + 4), h = u16(p + 6), flags = input[p + 8]; p += 9;
        if (!w || !h || x + w > width || y + h > height || (flags & 0x18)) fail();
        let colors = globalColors;
        if (flags & 128) { colors = 2 ** ((flags & 7) + 1); need(p, colors * 3); p += colors * 3; }
        if (!colors || (control?.transparent !== null && control?.transparent !== undefined && control.transparent >= colors)) fail();
        need(p, 1); const lzw = input[p++]; if (lzw < 2 || lzw > 8 || !blocks()) fail();
        sourceDelays.push(control?.delay ?? 0); gce.push(!!control); control = null;
        checkAnimationBudget(width, height, sourceDelays.length);
      } else fail();
    }
    if (!ended || p !== n || control) fail();
    if (sourceDelays.length < 2) fail("AVATAR_FORMAT_UNSUPPORTED");
    return { format: "gif", width, height, frames: sourceDelays.length, sourceDelays,
      delays: normalizeAnimationTiming(sourceDelays), gce, loop };
  }
  if (n < 12 || text(0, 4) !== "RIFF" || text(8, 4) !== "WEBP") return null;
  if (u32(4) + 8 !== n) fail();
  let p = 12, width = 0, height = 0, flags = 0, extended = false, animation = false, loop = 0, staticFrame = false;
  const sourceDelays: number[] = [];
  const seen = new Set<string>();
  const chunk = (start: number, end: number) => {
    if (start + 8 > end) fail();
    const type = text(start, 4), size = u32(start + 4), data = start + 8, next = data + size + size % 2;
    if (next > end || (size % 2 && input[next - 1] !== 0)) fail();
    return { type, size, data, next };
  };
  while (p < n) {
    const c = chunk(p, n);
    if (c.type === "VP8X") {
      if (extended || p !== 12 || c.size !== 10) fail();
      flags = input[c.data]; if (flags & 0xc1 || input[c.data + 1] || input[c.data + 2] || input[c.data + 3]) fail();
      width = u24(c.data + 4) + 1; height = u24(c.data + 7) + 1; extended = true;
      if (flags & 2) checkAnimationBudget(width, height, 1);
    } else if (c.type === "ANIM") {
      if (!extended || !(flags & 2) || animation || sourceDelays.length || c.size !== 6) fail();
      animation = true; loop = u16(c.data + 4);
    } else if (c.type === "ANMF") {
      if (!animation || c.size < 24 || staticFrame) fail();
      const x = u24(c.data) * 2, y = u24(c.data + 3) * 2, w = u24(c.data + 6) + 1, h = u24(c.data + 9) + 1;
      if (x + w > width || y + h > height || (input[c.data + 15] & 0xfc)) fail();
      let q = c.data + 16, image = false, alpha = false;
      while (q < c.data + c.size) {
        const sub = chunk(q, c.data + c.size);
        if (sub.type === "ALPH") { if (alpha || image || !sub.size) fail(); alpha = true; }
        else if (sub.type === "VP8 " || sub.type === "VP8L") {
          if (image || !sub.size || (alpha && sub.type === "VP8L")) fail();
          // Dimensions are checked before native allocation, including compressed frame headers.
          let fw: number, fh: number;
          if (sub.type === "VP8L") {
            if (sub.size < 5 || input[sub.data] !== 0x2f) fail();
            const bits = u32(sub.data + 1); if (bits >>> 29) fail();
            fw = (bits & 0x3fff) + 1; fh = ((bits >>> 14) & 0x3fff) + 1;
          } else {
            if (sub.size < 10 || input[sub.data] & 1 || text(sub.data + 3, 3) !== "\u009d\u0001\u002a") fail();
            fw = u16(sub.data + 6) & 0x3fff; fh = u16(sub.data + 8) & 0x3fff;
          }
          if (fw !== w || fh !== h) fail(); image = true;
        } else fail();
        q = sub.next;
      }
      if (!image) fail();
      sourceDelays.push(u24(c.data + 12)); checkAnimationBudget(width, height, sourceDelays.length);
    } else if (c.type === "VP8 " || c.type === "VP8L") {
      if (flags & 2) fail(); staticFrame = true;
    } else if (["ICCP", "EXIF", "XMP ", "ALPH"].includes(c.type)) {
      if (seen.has(c.type)) fail(); seen.add(c.type);
    } else if (flags & 2) fail();
    p = c.next;
  }
  if (!(flags & 2) && !animation && !sourceDelays.length) return null;
  if (!animation || sourceDelays.length < 2) fail();
  return { format: "webp", width, height, frames: sourceDelays.length, sourceDelays,
    delays: normalizeAnimationTiming(sourceDelays), gce: [], loop };
}
