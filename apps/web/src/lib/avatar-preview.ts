import { AvatarAnimationError, inspectAvatarAnimation, type AvatarAnimation } from "@likecord/shared/src/avatar-animation";

export interface StaticAvatarPreview {
  url: string;
  width: number;
  height: number;
}

export type AvatarPreviewErrorCode = "INVALID" | "UNSUPPORTED" | "TOO_COMPLEX" | "DECODE_FAILED" | "PREVIEW_UNAVAILABLE";

export class AvatarPreviewError extends Error {
  readonly code: AvatarPreviewErrorCode;

  constructor(code: AvatarPreviewErrorCode) {
    super(code);
    this.name = "AvatarPreviewError";
    this.code = code;
  }
}

const previewError = (code: AvatarPreviewErrorCode) => new AvatarPreviewError(code);

export function avatarPreviewErrorMessage(error: unknown): string {
  const code = error instanceof AvatarPreviewError ? error.code : "PREVIEW_UNAVAILABLE";
  const messages: Record<AvatarPreviewErrorCode, string> = {
    INVALID: "This image is invalid or damaged. Choose another image.",
    UNSUPPORTED: "This image format is not supported. Choose a JPEG, PNG, WebP or animated GIF.",
    TOO_COMPLEX: "This animation exceeds the supported limits. Choose a smaller image or fewer frames.",
    DECODE_FAILED: "Your browser could not create a preview for this image. Choose another image.",
    PREVIEW_UNAVAILABLE: "Avatar preview is unavailable in this browser. Try another supported browser or image.",
  };
  return messages[code];
}

function inspectAnimation(bytes: Uint8Array): AvatarAnimation | null {
  try {
    return inspectAvatarAnimation(bytes);
  } catch (error) {
    if (!(error instanceof AvatarAnimationError)) throw previewError("PREVIEW_UNAVAILABLE");
    if (["AVATAR_TOO_LARGE", "AVATAR_DIMENSIONS_EXCEEDED", "AVATAR_ANIMATION_LIMIT_EXCEEDED", "AVATAR_INVALID_TIMING"].includes(error.code))
      throw previewError("TOO_COMPLEX");
    if (error.code === "AVATAR_FORMAT_UNSUPPORTED") throw previewError("UNSUPPORTED");
    throw previewError("INVALID");
  }
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(previewError("PREVIEW_UNAVAILABLE"));
  }, "image/png"));
}

async function loadImage(file: File): Promise<{ image: HTMLImageElement; release: () => void }> {
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = sourceUrl;
  try {
    if (image.decode) await image.decode();
    else await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(previewError("DECODE_FAILED")); });
    return { image, release: () => { image.src = ""; URL.revokeObjectURL(sourceUrl); } };
  } catch {
    image.src = "";
    URL.revokeObjectURL(sourceUrl);
    throw previewError("DECODE_FAILED");
  }
}

/** Produces an orientation-applied, static first-frame bitmap for visual editing only. */
export async function createStaticAvatarPreview(file: File): Promise<StaticAvatarPreview> {
  if (!file.size) throw previewError("INVALID");
  if (file.size > 5 * 1024 * 1024) throw previewError("TOO_COMPLEX");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw previewError("UNSUPPORTED");
  // Advisory only: same pure walk bounds animation before the browser decoder.
  // Static JPEG/PNG/WebP geometry and backend authority remain unchanged.
  let buffer: ArrayBuffer;
  try {
    buffer = await (file.arrayBuffer ? file.arrayBuffer() : new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(previewError("PREVIEW_UNAVAILABLE"));
      reader.readAsArrayBuffer(file);
    }));
  } catch {
    throw previewError("PREVIEW_UNAVAILABLE");
  }
  const bytes = new Uint8Array(buffer);
  const animation = inspectAnimation(bytes);
  if (animation && file.type !== `image/${animation.format}`) throw previewError("INVALID");
  if (file.type === "image/gif" && !animation) throw previewError("UNSUPPORTED");
  if (bytes.length >= 8 && bytes[0] === 137 && String.fromCharCode(...bytes.subarray(1, 4)) === "PNG") {
    const view = new DataView(bytes.buffer);
    for (let p = 8; p + 12 <= bytes.length;) {
      const length = view.getUint32(p), type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
      if (["acTL", "fcTL", "fdAT"].includes(type)) throw previewError("UNSUPPORTED");
      if (length > bytes.length - p - 12) throw previewError("INVALID");
      p += 12 + length;
    }
  }
  let width = 0;
  let height = 0;
  let source: CanvasImageSource;
  let release = () => {};

  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      throw previewError("DECODE_FAILED");
    }
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
    release = () => bitmap.close();
  } else {
    const loaded = await loadImage(file);
    width = loaded.image.naturalWidth;
    height = loaded.image.naturalHeight;
    source = loaded.image;
    release = loaded.release;
  }

  const canvas = document.createElement("canvas");
  try {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw previewError("INVALID");
    if (width > (animation ? 2048 : 4096) || height > (animation ? 2048 : 4096) || width * height > 16_777_216)
      throw previewError("TOO_COMPLEX");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw previewError("PREVIEW_UNAVAILABLE");
    try {
      context.drawImage(source, 0, 0, width, height);
    } catch {
      throw previewError("PREVIEW_UNAVAILABLE");
    }
    let blob: Blob;
    try {
      blob = await canvasBlob(canvas);
    } catch {
      throw previewError("PREVIEW_UNAVAILABLE");
    }
    return { url: URL.createObjectURL(blob), width, height };
  } finally {
    release();
    canvas.width = 0;
    canvas.height = 0;
  }
}
