"use strict";
// One message per stream: magic/version, JSON bytes, main/input bytes, poster bytes.
const MAGIC = Buffer.from("AVA2\x01\x00\x00\x00", "binary");
const META = 8192, INPUT = 5242880, MAIN = 2097152, POSTER = 524288;
class Reader {
  constructor(input = false) { this.limits = input ? [META, INPUT, 0] : [META, MAIN, POSTER]; this.header = Buffer.alloc(20); this.offset = 0; this.parts = null; this.index = 0; this.position = 0; }
  push(chunk) {
    let p = 0;
    while (p < chunk.length) {
      if (!this.parts) {
        const take = Math.min(20 - this.offset, chunk.length - p);
        chunk.copy(this.header, this.offset, p, p + take); this.offset += take; p += take;
        if (this.offset !== 20) continue;
        if (!this.header.subarray(0, 8).equals(MAGIC)) throw Error("Invalid framing");
        const sizes = [8, 12, 16].map((offset) => this.header.readUInt32BE(offset));
        if (!sizes[0] || sizes.some((n, i) => n > this.limits[i])) throw Error("Invalid framing bounds");
        this.parts = sizes.map((size) => Buffer.alloc(size));
      }
      while (this.index < 3 && this.position === this.parts[this.index].length) { this.index++; this.position = 0; }
      if (this.index === 3) throw Error("Trailing message bytes");
      const part = this.parts[this.index], take = Math.min(part.length - this.position, chunk.length - p);
      chunk.copy(part, this.position, p, p + take); this.position += take; p += take;
    }
  }
  end() {
    if (!this.parts) throw Error("Truncated message");
    while (this.index < 3 && this.position === this.parts[this.index].length) { this.index++; this.position = 0; }
    if (this.index !== 3) throw Error("Truncated message");
    const meta = JSON.parse(this.parts[0].toString("utf8"));
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) throw Error("Invalid message");
    return { meta, main: this.parts[1], poster: this.parts[2] };
  }
  clear() { this.parts = null; this.header = null; }
}
async function send(stream, meta, main = Buffer.alloc(0), poster = Buffer.alloc(0), input = false) {
  const json = Buffer.from(JSON.stringify(meta)), limits = input ? [META, INPUT, 0] : [META, MAIN, POSTER];
  if ([json, main, poster].some((b, i) => b.length > limits[i])) throw Error("Invalid send bounds");
  const header = Buffer.alloc(20); MAGIC.copy(header);
  [json, main, poster].forEach((b, i) => header.writeUInt32BE(b.length, 8 + 4 * i));
  for (const part of [header, json, main, poster]) {
    await new Promise((resolve, reject) => stream.write(part, (error) => error ? reject(error) : resolve()));
  }
  stream.end();
}
module.exports = { Reader, send };
