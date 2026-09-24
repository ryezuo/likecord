import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export interface RateLimitConfig {
  points: number;
  duration: number;
  keyPrefix: string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor(private readonly redis: RedisService) {
    this.configs.set("register", {
      points: parseInt(process.env.RATE_LIMIT_REGISTER_POINTS || "3", 10),
      duration: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW || "3600", 10),
      keyPrefix: "rl:register",
    });
    this.configs.set("login", {
      points: parseInt(process.env.RATE_LIMIT_LOGIN_POINTS || "5", 10),
      duration: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || "60", 10),
      keyPrefix: "rl:login",
    });
    this.configs.set("refresh", {
      points: parseInt(process.env.RATE_LIMIT_REFRESH_POINTS || "10", 10),
      duration: parseInt(process.env.RATE_LIMIT_REFRESH_WINDOW || "60", 10),
      keyPrefix: "rl:refresh",
    });
  }

  private getConfig(name: string): RateLimitConfig {
    const cfg = this.configs.get(name);
    if (!cfg) throw new Error(`Unknown rate limit config: ${name}`);
    return cfg;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const rateLimitName = Reflect.getMetadata("rateLimitName", handler);
    if (!rateLimitName) return true;
    if (["avatar-mutation", "avatar-metadata", "avatar-image"].includes(rateLimitName)) {
      return this.avatarLimit(context, rateLimitName);
    }
    if (process.env.NODE_ENV === "test") return true;

    const cfg = this.getConfig(rateLimitName);
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${cfg.keyPrefix}:${ip}`;

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, cfg.duration);
    }

    const ttl = await this.redis.getTtl(key);
    if (current > cfg.points) {
      throw new HttpException(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests. Try again in ${ttl} seconds.`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async avatarLimit(context: ExecutionContext, name: string): Promise<boolean> {
    const limits: Record<string, [number, number]> = {
      "avatar-mutation": [10, 600], "avatar-metadata": [600, 60], "avatar-image": [2400, 60],
    };
    const [points, duration] = limits[name];
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new HttpException({ error: { code: "AUTH_REQUIRED", message: "Authentication required" } }, 401);
    let result: [number, number];
    try {
      // Atomic fixed-window increment/expiry; no immortal bucket if a connection drops between commands.
      result = await this.redis.getClient().eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return {n,redis.call('TTL',KEYS[1])}",
        1, `rl:${name}:${userId}`, duration,
      ) as [number, number];
    } catch {
      throw new HttpException({ error: { code: "AVATAR_BUSY", message: "Avatar rate limiter unavailable" } }, 503);
    }
    if (result[0] > points) {
      context.switchToHttp().getResponse().setHeader("Retry-After", Math.max(1, result[1]));
      throw new HttpException({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many avatar requests" } }, 429);
    }
    return true;
  }
}
