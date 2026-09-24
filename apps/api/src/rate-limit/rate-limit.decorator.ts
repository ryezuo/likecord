import { SetMetadata } from "@nestjs/common";

export const RateLimit = (name: string) => SetMetadata("rateLimitName", name);
