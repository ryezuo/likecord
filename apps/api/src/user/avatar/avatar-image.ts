import sharp, { SharpOptions } from "sharp";
import { HttpException } from "@nestjs/common";
import { AVATAR_OUTPUT_LIMIT, requireNormalizedAvatar } from "../../storage/avatar-object";
import { avatarError } from "./avatar-error";
import { avatarCropRect, DEFAULT_AVATAR_CROP, type AvatarCrop } from "@likecord/shared/avatar-crop";

export const AVATAR_INPUT_LIMIT = 5 * 1024 * 1024;
const dimensions = (width: number, height: number) => {
  if (!width || !height || width > 4096 || height > 4096 || width * height > 16_777_216)
    throw avatarError(422, "AVATAR_DIMENSIONS_EXCEEDED");
};

/** Bounded container walk; no metadata/string payloads are decoded here. */
export function inspectAvatarContainer(input: Buffer): "jpeg" | "png" | "webp" {
  const invalid = () => avatarError(422, "AVATAR_INVALID_IMAGE");
  if (input.length >= 8 && input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    let offset = 8, header = false, data = false, end = false;
    while (offset + 12 <= input.length) {
      const length = input.readUInt32BE(offset);
      const type = input.toString("ascii", offset + 4, offset + 8);
      if (length > input.length - offset - 12) throw invalid();
      if (!header) {
        if (type !== "IHDR" || length !== 13) throw invalid();
        dimensions(input.readUInt32BE(offset + 8), input.readUInt32BE(offset + 12));
        header = true;
      } else if (type === "IHDR") throw invalid();
      if (["acTL", "fcTL", "fdAT"].includes(type)) throw avatarError(422, "AVATAR_ANIMATION_UNSUPPORTED");
      if (type === "IDAT") data = true;
      offset += length + 12;
      if (type === "IEND") { if (length !== 0) throw invalid(); end = true; break; }
    }
    if (!header || !data || !end || offset !== input.length) throw invalid();
    return "png";
  }
  if (input.length >= 12 && input.toString("ascii", 0, 4) === "RIFF") {
    if (input.toString("ascii", 8, 12) !== "WEBP") throw avatarError(415, "AVATAR_FORMAT_UNSUPPORTED");
    if (input.readUInt32LE(4) + 8 !== input.length) throw invalid();
    let offset = 12, frames = 0;
    while (offset + 8 <= input.length) {
      const type = input.toString("ascii", offset, offset + 4);
      const length = input.readUInt32LE(offset + 4);
      if (length > input.length - offset - 8) throw invalid();
      if (type === "ANIM" || type === "ANMF" || (type === "VP8X" && length > 0 && (input[offset + 8] & 2)))
        throw avatarError(422, "AVATAR_ANIMATION_UNSUPPORTED");
      if (type === "VP8 " || type === "VP8L") frames++;
      offset += 8 + length + (length % 2);
    }
    if (frames !== 1 || offset !== input.length) throw invalid();
    return "webp";
  }
  if (input.length >= 4 && input[0] === 255 && input[1] === 216) {
    let offset = 2, frame = false, scan = false;
    while (offset < input.length) {
      if (input[offset++] !== 255) throw invalid();
      while (input[offset] === 255) offset++;
      const marker = input[offset++];
      if (marker === 217) {
        if (!frame || !scan || offset !== input.length) throw invalid();
        return "jpeg";
      }
      if (marker === undefined || marker === 0 || marker === 216 || (marker >= 208 && marker <= 215)) throw invalid();
      if (offset + 2 > input.length) throw invalid();
      const length = input.readUInt16BE(offset);
      if (length < 2 || offset + length > input.length) throw invalid();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) throw invalid();
        dimensions(input.readUInt16BE(offset + 5), input.readUInt16BE(offset + 3));
        frame = true;
      }
      offset += length;
      if (marker === 218) {
        scan = true;
        while (offset < input.length) {
          if (input[offset] !== 255) { offset++; continue; }
          let next = offset + 1;
          while (input[next] === 255) next++;
          if (input[next] === 0 || (input[next] >= 208 && input[next] <= 215)) { offset = next + 1; continue; }
          break;
        }
      }
    }
    throw invalid();
  }
  throw avatarError(415, "AVATAR_FORMAT_UNSUPPORTED");
}

export async function normalizeAvatar(input: Buffer, mime: string, crop: AvatarCrop | null = null): Promise<Buffer> {
  if (!input.length) throw avatarError(400, "AVATAR_EMPTY_INPUT");
  if (input.length > AVATAR_INPUT_LIMIT) throw avatarError(413, "AVATAR_TOO_LARGE");
  const format = inspectAvatarContainer(input);
  if (mime !== `image/${format}`) throw avatarError(415, "AVATAR_MIME_MISMATCH");
  const deadline = Date.now() + 10_000;
  const remaining = () => {
    const seconds = Math.floor((deadline - Date.now()) / 1000);
    if (seconds < 1) throw avatarError(503, "AVATAR_PROCESSING_TIMEOUT");
    return seconds;
  };
  try {
    const options: SharpOptions = { failOn: "warning", limitInputPixels: 16_777_216,
      limitInputChannels: 4, unlimited: false };
    const metadata = await sharp(input, options).metadata();
    remaining();
    if (metadata.format !== format) throw avatarError(415, "AVATAR_MIME_MISMATCH");
    if ((metadata.pages || 1) !== 1) throw avatarError(422, "AVATAR_ANIMATION_UNSUPPORTED");
    dimensions(metadata.width, metadata.height);
    // Materialize EVERY source pixel before resize; shrink-on-load must not hide corrupt tails.
    const decoded = await sharp(input, options).autoOrient().toColourspace("srgb")
      .raw().timeout({ seconds: remaining() }).toBuffer({ resolveWithObject: true });
    dimensions(decoded.info.width, decoded.info.height);
    let rectangle;
    try { rectangle = avatarCropRect(decoded.info.width, decoded.info.height, crop || DEFAULT_AVATAR_CROP); }
    catch { throw avatarError(400, "AVATAR_INVALID_CROP"); }
    const output = await sharp(decoded.data, { raw: decoded.info })
      .extract({ left: rectangle.left, top: rectangle.top, width: rectangle.side, height: rectangle.side })
      .resize(rectangle.outputSide, rectangle.outputSide, { withoutEnlargement: true }).webp({ quality: 85 })
      .timeout({ seconds: remaining() }).toBuffer({ resolveWithObject: true });
    remaining();
    if (output.data.length > AVATAR_OUTPUT_LIMIT) throw avatarError(422, "AVATAR_OUTPUT_TOO_LARGE");
    if (output.info.format !== "webp" || output.info.width !== rectangle.outputSide || output.info.height !== rectangle.outputSide) throw avatarError(422, "AVATAR_INVALID_IMAGE");
    requireNormalizedAvatar(output.data);
    return output.data;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    if (Date.now() >= deadline || /timeout/i.test((error as Error).message)) throw avatarError(503, "AVATAR_PROCESSING_TIMEOUT");
    if (/exceeds pixel limit/i.test((error as Error).message)) throw avatarError(422, "AVATAR_DIMENSIONS_EXCEEDED");
    throw avatarError(422, "AVATAR_INVALID_IMAGE");
  }
}
