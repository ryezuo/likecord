export interface AvatarCrop {
  v: 1;
  panX: number;
  panY: number;
  zoom: number;
}

export interface AvatarCropRect {
  left: number;
  top: number;
  side: number;
  outputSide: number;
}

export const DEFAULT_AVATAR_CROP: AvatarCrop = Object.freeze({ v: 1, panX: 0, panY: 0, zoom: 1 });

const finite = (value: number) => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const rounded = (value: number) => {
  const result = Number(value.toFixed(6));
  return Object.is(result, -0) ? 0 : result;
};

export function canonicalAvatarCrop(crop: AvatarCrop): AvatarCrop {
  if (crop.v !== 1 || !finite(crop.panX) || !finite(crop.panY) || !finite(crop.zoom)
    || crop.panX < -1 || crop.panX > 1 || crop.panY < -1 || crop.panY > 1
    || crop.zoom < 1 || crop.zoom > 4) throw new RangeError("Invalid avatar crop");
  return { v: 1, panX: rounded(crop.panX), panY: rounded(crop.panY), zoom: rounded(crop.zoom) };
}

export function serializeAvatarCrop(crop: AvatarCrop): string {
  const value = canonicalAvatarCrop(crop);
  return JSON.stringify({ v: 1, panX: value.panX, panY: value.panY, zoom: value.zoom });
}

export function avatarCropRect(width: number, height: number, crop: AvatarCrop): AvatarCropRect {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new RangeError("Invalid avatar dimensions");
  const value = canonicalAvatarCrop(crop);
  const minimum = Math.min(width, height);
  if (value.zoom > Math.min(4, minimum)) throw new RangeError("Invalid avatar zoom");
  const side = Math.max(1, Math.floor(minimum / value.zoom));
  const travelX = width - side;
  const travelY = height - side;
  if ((!travelX && value.panX !== 0) || (!travelY && value.panY !== 0))
    throw new RangeError("Invalid avatar pan");
  return {
    left: Math.floor(travelX * (value.panX + 1) / 2),
    top: Math.floor(travelY * (value.panY + 1) / 2),
    side,
    outputSide: Math.min(256, side),
  };
}

function panForOffset(offset: number, travel: number): number {
  if (!travel || offset <= 0) return travel ? -1 : 0;
  if (offset >= travel) return 1;
  // Select the middle of the integer pixel bin so six-decimal serialization
  // reproduces the requested offset instead of crossing a floor boundary.
  return (2 * (offset + 0.5) / travel) - 1;
}

export function avatarCropAtCenter(width: number, height: number, zoom: number, centerX: number, centerY: number): AvatarCrop {
  const base = canonicalAvatarCrop({ v: 1, panX: 0, panY: 0, zoom });
  const side = Math.max(1, Math.floor(Math.min(width, height) / base.zoom));
  const travelX = width - side;
  const travelY = height - side;
  const left = clamp(Math.floor(centerX - side / 2), 0, travelX);
  const top = clamp(Math.floor(centerY - side / 2), 0, travelY);
  const result = canonicalAvatarCrop({
    v: 1,
    panX: panForOffset(left, travelX),
    panY: panForOffset(top, travelY),
    zoom: base.zoom,
  });
  avatarCropRect(width, height, result);
  return result;
}

export function moveAvatarImage(width: number, height: number, crop: AvatarCrop, imageDeltaX: number, imageDeltaY: number): AvatarCrop {
  const rect = avatarCropRect(width, height, crop);
  return avatarCropAtCenter(width, height, crop.zoom,
    rect.left + rect.side / 2 - imageDeltaX,
    rect.top + rect.side / 2 - imageDeltaY);
}

export function zoomAvatarCrop(width: number, height: number, crop: AvatarCrop, zoom: number): AvatarCrop {
  const rect = avatarCropRect(width, height, crop);
  return avatarCropAtCenter(width, height, zoom,
    rect.left + rect.side / 2,
    rect.top + rect.side / 2);
}
