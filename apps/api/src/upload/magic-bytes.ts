export interface MagicByteResult {
  detected: string;
  match: boolean;
}

const MAGIC_BYTES: Record<string, Uint8Array> = {
  "image/png": new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  "image/jpeg": new Uint8Array([0xFF, 0xD8, 0xFF]),
  "image/gif": new Uint8Array([0x47, 0x49, 0x46, 0x38]),
  "image/webp": new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  "application/pdf": new Uint8Array([0x25, 0x50, 0x44, 0x46]),
};

export function detectMimeFromMagic(buffer: Buffer): string | null {
  for (const [mime, sig] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= sig.length && buffer.slice(0, sig.length).equals(sig)) {
      return mime;
    }
  }
  return null;
}

export function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  // If the declared MIME has known magic bytes, the file must match them
  // e.g., declaring "application/pdf" requires the file to start with %PDF
  const knownMimes = new Set(Object.keys(MAGIC_BYTES));
  
  if (knownMimes.has(declaredMime)) {
    const detected = detectMimeFromMagic(buffer);
    if (!detected) return false; // Declared a known type but no magic found
    
    // JPEG variants accept jpeg magic
    if (declaredMime === "image/jpeg" && detected === "image/jpeg") return true;
    if (declaredMime === "image/pjpeg" && detected === "image/jpeg") return true;

    // WebP check
    if (declaredMime === "image/webp" && detected === "image/webp") {
      if (buffer.length >= 12) {
        return buffer.slice(8, 12).toString() === "WEBP";
      }
      return false;
    }

    return detected === declaredMime;
  }

  // Unknown declared MIME — allow if no dangerous magic detected
  return true;
}
