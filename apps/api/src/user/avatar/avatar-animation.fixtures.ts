import sharp from "sharp";

const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u24 = (n: number) => { const b = Buffer.alloc(3); b.writeUIntLE(n, 0, 3); return b; };
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
export const webpChunk = (type: string, data: Buffer) => Buffer.concat([Buffer.from(type), u32(data.length), data, ...(data.length % 2 ? [Buffer.from([0])] : [])]);
export function webpChunks(buffer: Buffer) {
  const result: { type: string; data: Buffer; offset: number }[] = [];
  for (let p = 12; p < buffer.length;) { const n = buffer.readUInt32LE(p + 4); result.push({ type: buffer.toString("ascii", p, p + 4), data: buffer.subarray(p + 8, p + 8 + n), offset: p }); p += 8 + n + n % 2; }
  return result;
}
export const webpRiff = (chunks: Buffer[]) => { const body = Buffer.concat(chunks); return Buffer.concat([Buffer.from("RIFF"), u32(body.length + 4), Buffer.from("WEBP"), body]); };
const rgba = (w: number, h: number, pixel: (x: number, y: number) => number[]) => {
  const b = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(pixel(x, y), (y * w + x) * 4); return b;
};

/** Small known-pixel disposal/palette/interlace fixture, derived from accepted probe evidence. */
export function composedGif() {
  const w = 8, h = 6, palette = [[0, 0, 0], [240, 20, 20], [20, 230, 20], [20, 20, 230]];
  const specs = [
    { x: 0, y: 0, w, h, dis: 1, delay: 0, transparent: true, interlace: true, indices: Array.from({ length: w * h }, (_, i) => i === 0 ? 0 : 1), local: null },
    { x: 0, y: 0, w, h, dis: 1, delay: 4, transparent: false, interlace: false, indices: Array(w * h).fill(3), local: null },
    { x: 2, y: 2, w: 4, h: 2, dis: 2, delay: 7, transparent: true, interlace: false, indices: [1, 0, 1, 1, 1, 1, 0, 1], local: [palette[0], [230, 220, 20], palette[2], palette[3]] },
    { x: 0, y: 0, w: 2, h: 2, dis: 3, delay: 100, transparent: true, interlace: false, indices: [2, 2, 2, 2], local: null },
    { x: 6, y: 4, w: 2, h: 2, dis: 1, delay: 5, transparent: true, interlace: false, indices: [1, 0, 0, 1], local: null },
  ];
  const parts = [Buffer.from("GIF89a"), u16(w), u16(h), Buffer.from([0x81, 0, 0]), Buffer.from(palette.flat()),
    Buffer.from([0x21, 0xff, 11]), Buffer.from("NETSCAPE2.0"), Buffer.from([3, 1, 2, 0, 0])];
  let canvas = Buffer.alloc(w * h * 4); const expected: Buffer[] = [];
  for (const f of specs) {
    const previous = Buffer.from(canvas), pal = f.local || palette;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const index = f.indices[y * f.w + x]; if (f.transparent && index === 0) continue;
      canvas.set([...pal[index], 255], ((f.y + y) * w + f.x + x) * 4);
    }
    expected.push(Buffer.from(canvas));
    parts.push(Buffer.from([0x21, 0xf9, 4, f.dis * 4 + Number(f.transparent)]), u16(f.delay), Buffer.from([0, 0]),
      Buffer.from([0x2c]), u16(f.x), u16(f.y), u16(f.w), u16(f.h), Buffer.from([(f.local ? 0x81 : 0) | (f.interlace ? 0x40 : 0)]));
    if (f.local) parts.push(Buffer.from(f.local.flat()));
    let indices = f.indices;
    if (f.interlace) { indices = []; for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = start; y < f.h; y += step) indices.push(...f.indices.slice(y * f.w, (y + 1) * f.w)); }
    const codes = [...indices.flatMap((index) => [4, index]), 5], data = Buffer.alloc(Math.ceil(codes.length * 3 / 8));
    codes.forEach((value, index) => { const bit = index * 3; data[bit >> 3] |= value << (bit % 8); if (bit % 8 > 5) data[(bit >> 3) + 1] |= value >> (8 - bit % 8); });
    parts.push(Buffer.from([2, data.length]), data, Buffer.from([0]));
    if (f.dis === 2) for (let y = 0; y < f.h; y++) canvas.fill(0, ((f.y + y) * w + f.x) * 4, ((f.y + y) * w + f.x + f.w) * 4);
    if (f.dis === 3) canvas = previous;
  }
  return { input: Buffer.concat([...parts, Buffer.from([0x3b])]), expected: Buffer.concat(expected), width: w, height: h, frames: specs.length };
}

export async function composedWebp(orientation = 1) {
  const w = 8, h = 6;
  const specs = [
    { x: 0, y: 0, w, h, delay: 0, noBlend: true, dispose: false, pixels: rgba(w, h, (x, y) => x === 0 && y === 0 ? [0, 0, 0, 0] : [220, 20, 20, 255]) },
    { x: 0, y: 0, w, h, delay: 49, noBlend: true, dispose: false, pixels: rgba(w, h, () => [20, 20, 220, 255]) },
    { x: 2, y: 2, w: 4, h: 2, delay: 70, noBlend: false, dispose: true, pixels: rgba(4, 2, (x) => [20, 220, 20, x === 0 ? 0 : 128]) },
    { x: 0, y: 0, w: 2, h: 2, delay: 1000, noBlend: true, dispose: false, pixels: rgba(2, 2, (x) => [240, 220, 20, x === 0 ? 0 : 128]) },
    { x: 6, y: 4, w: 2, h: 2, delay: 50, noBlend: false, dispose: false, pixels: rgba(2, 2, () => [220, 20, 200, 255]) },
  ];
  const parts = [webpChunk("VP8X", Buffer.concat([Buffer.from([0x1a, 0, 0, 0]), u24(w - 1), u24(h - 1)])), webpChunk("ANIM", Buffer.concat([u32(0), u16(3)]))];
  const canvas = Buffer.alloc(w * h * 4), expected: Buffer[] = [];
  for (const f of specs) {
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const si = (y * f.w + x) * 4, di = ((f.y + y) * w + f.x + x) * 4, s = f.pixels.subarray(si, si + 4);
      if (f.noBlend || s[3] === 255) canvas.set(s, di);
      else {
        const sa = s[3] / 255, da = canvas[di + 3] / 255, alpha = sa + da * (1 - sa);
        for (let c = 0; c < 3; c++) canvas[di + c] = alpha ? Math.floor((s[c] * sa + canvas[di + c] * da * (1 - sa)) / alpha) : 0;
        canvas[di + 3] = Math.floor(alpha * 255);
      }
    }
    expected.push(Buffer.from(canvas));
    const encoded = await sharp(f.pixels, { raw: { width: f.w, height: f.h, channels: 4 } }).webp({ lossless: true, effort: 0 }).toBuffer();
    const payload = webpChunks(encoded).filter((c) => ["ALPH", "VP8 ", "VP8L"].includes(c.type)).map((c) => webpChunk(c.type, c.data));
    parts.push(webpChunk("ANMF", Buffer.concat([u24(f.x / 2), u24(f.y / 2), u24(f.w - 1), u24(f.h - 1), u24(f.delay), Buffer.from([Number(f.noBlend) * 2 + Number(f.dispose)]), ...payload])));
    if (f.dispose) for (let y = 0; y < f.h; y++) canvas.fill(0, ((f.y + y) * w + f.x) * 4, ((f.y + y) * w + f.x + f.w) * 4);
  }
  parts.push(webpChunk("EXIF", Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from([73, 73, 42, 0, 8, 0, 0, 0]), u16(1), u16(0x112), u16(3), u32(1), u16(orientation), u16(0), u32(0)])));
  return { input: webpRiff(parts), expected: Buffer.concat(expected), width: w, height: h, frames: specs.length };
}

export function gifFixture(delays: (number | null)[] = [5, 10, 15], repeat: number | null = 0): Buffer {
  const parts = [Buffer.from("GIF89a", "ascii"), Buffer.from([8, 0, 6, 0, 0x81, 0, 0]),
    Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255])];
  if (repeat !== null) parts.push(Buffer.from([0x21, 0xff, 11]), Buffer.from("NETSCAPE2.0"), Buffer.from([3, 1, repeat & 255, repeat >> 8, 0]));
  delays.forEach((delay, i) => {
    if (delay !== null) parts.push(Buffer.from([0x21, 0xf9, 4, ((i % 3) + 1) << 2, delay & 255, delay >> 8, 0, 0]));
    parts.push(Buffer.from([0x2c, 0, 0, 0, 0, 8, 0, 6, 0, 0]));
    const codes: number[] = [];
    for (let p = 0; p < 48; p++) codes.push(4, (i % 3) + 1);
    codes.push(5);
    const encoded = Buffer.alloc(Math.ceil(codes.length * 3 / 8));
    codes.forEach((value, index) => { const bit = index * 3; encoded[bit >> 3] |= value << (bit % 8); if (bit % 8 > 5) encoded[(bit >> 3) + 1] |= value >> (8 - bit % 8); });
    parts.push(Buffer.from([2, encoded.length]), encoded, Buffer.from([0]));
  });
  return Buffer.concat([...parts, Buffer.from([0x3b])]);
}
export async function animatedWebp(width = 8, height = 6, delays = [50, 100, 150], loop = 0): Promise<Buffer> {
  const data = Buffer.alloc(width * height * delays.length * 4);
  for (let f = 0; f < delays.length; f++) for (let p = 0; p < width * height; p++) {
    const offset = (f * width * height + p) * 4;
    data[offset + f % 3] = 240; data[offset + 3] = 255;
  }
  const result = await sharp(data, { raw: { width, height: height * delays.length, channels: 4, pageHeight: height } })
    .webp({ lossless: true, delay: delays, loop }).toBuffer();
  let frame = 0;
  for (let p = 12; p < result.length;) {
    const size = result.readUInt32LE(p + 4);
    if (result.toString("ascii", p, p + 4) === "ANMF") result.writeUIntLE(delays[frame++], p + 20, 3);
    p += 8 + size + size % 2;
  }
  return result;
}
