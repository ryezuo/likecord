import { HttpException } from "@nestjs/common";

export function avatarError(status: number, code: string): HttpException {
  const messages: Record<string, string> = {
    AVATAR_INVALID_IMAGE: "This image is invalid or damaged. Choose another image.",
    AVATAR_ANIMATION_LIMIT_EXCEEDED: "This animation is too complex. Choose a smaller image or fewer frames.",
    AVATAR_INVALID_TIMING: "Animation timing is unsupported. Each frame must be at most 1 second and one cycle at most 10 seconds.",
    AVATAR_OUTPUT_TOO_LARGE: "The processed avatar is too large. Choose a simpler image.",
    AVATAR_PROCESSING_TIMEOUT: "Avatar processing took too long. Choose a simpler image.",
    AVATAR_BUSY: "Avatar processing is busy. Try again shortly.",
  };
  return new HttpException({ error: { code, message: messages[code] || code.toLowerCase().replace(/_/g, " ") } }, status);
}
