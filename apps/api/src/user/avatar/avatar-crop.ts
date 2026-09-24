import type { Request } from "express";
import { canonicalAvatarCrop, type AvatarCrop } from "@likecord/shared/avatar-crop";
import { avatarError } from "./avatar-error";

export const AVATAR_CROP_HEADER = "x-avatar-crop";
export const AVATAR_CROP_HEADER_LIMIT = 192;

const invalid = () => avatarError(400, "AVATAR_INVALID_CROP");
const whitespace = (character: string | undefined) => character === " " || character === "\t" || character === "\r" || character === "\n";

export function parseAvatarCropHeader(input: string): AvatarCrop {
  if (!input.length || input.length > AVATAR_CROP_HEADER_LIMIT
    || [...input].some((character) => character.charCodeAt(0) > 0x7f)) throw invalid();

  let offset = 0;
  const values: Partial<Record<keyof AvatarCrop, number>> = {};
  const skipWhitespace = () => { while (whitespace(input[offset])) offset++; };
  const take = (character: string) => {
    skipWhitespace();
    if (input[offset] !== character) throw invalid();
    offset++;
  };

  take("{");
  skipWhitespace();
  if (input[offset] === "}") throw invalid();
  while (offset < input.length) {
    skipWhitespace();
    const keyMatch = /^"(v|panX|panY|zoom)"/.exec(input.slice(offset));
    if (!keyMatch) throw invalid();
    const key = keyMatch[1] as keyof AvatarCrop;
    if (Object.prototype.hasOwnProperty.call(values, key)) throw invalid();
    offset += keyMatch[0].length;
    take(":");
    skipWhitespace();
    const numberMatch = /^-?(?:0|[1-9]\d*)(?:\.\d{1,6})?/.exec(input.slice(offset));
    if (!numberMatch) throw invalid();
    offset += numberMatch[0].length;
    values[key] = Number(numberMatch[0]);
    skipWhitespace();
    if (input[offset] === ",") { offset++; continue; }
    if (input[offset] === "}") { offset++; break; }
    throw invalid();
  }
  skipWhitespace();
  if (offset !== input.length || Object.keys(values).length !== 4) throw invalid();
  try {
    const crop = canonicalAvatarCrop(values as AvatarCrop);
    if (crop.v !== 1) throw invalid();
    return crop;
  } catch {
    throw invalid();
  }
}

export function readAvatarCropHeader(req: Pick<Request, "headers" | "rawHeaders">): AvatarCrop | null {
  const rawValues: string[] = [];
  for (let index = 0; index + 1 < (req.rawHeaders?.length || 0); index += 2) {
    if (req.rawHeaders[index].toLowerCase() === AVATAR_CROP_HEADER) rawValues.push(req.rawHeaders[index + 1]);
  }
  if (rawValues.length > 1) throw invalid();
  if (rawValues.length === 1) return parseAvatarCropHeader(rawValues[0]);

  const normalized = req.headers[AVATAR_CROP_HEADER];
  if (normalized === undefined) return null;
  if (Array.isArray(normalized)) {
    if (normalized.length !== 1) throw invalid();
    return parseAvatarCropHeader(normalized[0]);
  }
  return parseAvatarCropHeader(normalized);
}
