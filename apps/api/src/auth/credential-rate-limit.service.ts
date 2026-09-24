import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { RedisService } from "../redis/redis.service";

const REAUTH_LIMIT = 5;
const REAUTH_WINDOW_SECONDS = 15 * 60;
const MUTATION_LIMIT = 5;
const MUTATION_WINDOW_SECONDS = 60 * 60;

export class CredentialRateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super("Credential mutation rate limit exceeded");
  }
}

@Injectable()
export class CredentialRateLimitService {
  constructor(private readonly redis: RedisService) {}

  async assertAdmission(userId: string, ipAddress?: string): Promise<void> {
    const keys = this.keys(userId, ipAddress);
    try {
      const result = await this.redis.getClient().eval(
        "local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); local ta=redis.call('TTL',KEYS[1]); local tb=redis.call('TTL',KEYS[2]); return {a,b,ta,tb}",
        2,
        keys.reauth,
        keys.mutation,
      ) as [number, number, number, number];
      if (Number(result[0]) >= REAUTH_LIMIT || Number(result[1]) >= MUTATION_LIMIT) {
        const ttl = Math.max(1, Number(result[0]) >= REAUTH_LIMIT ? Number(result[2]) : Number(result[3]));
        throw new CredentialRateLimitError(ttl);
      }
    } catch (error) {
      if (error instanceof CredentialRateLimitError) throw error;
      throw this.unavailable();
    }
  }

  async recordReauthenticationFailure(userId: string, ipAddress?: string): Promise<void> {
    const key = this.keys(userId, ipAddress).reauth;
    try {
      await this.redis.getClient().eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",
        1,
        key,
        REAUTH_WINDOW_SECONDS,
      );
    } catch {
      throw this.unavailable();
    }
  }

  async reserveSuccessfulMutation(userId: string, ipAddress?: string): Promise<void> {
    const key = this.keys(userId, ipAddress).mutation;
    try {
      const result = await this.redis.getClient().eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; local t=redis.call('TTL',KEYS[1]); if n>tonumber(ARGV[2]) then redis.call('DECR',KEYS[1]); end; return {n,t}",
        1,
        key,
        MUTATION_WINDOW_SECONDS,
        MUTATION_LIMIT,
      ) as [number, number];
      if (Number(result[0]) > MUTATION_LIMIT) throw new CredentialRateLimitError(Math.max(1, Number(result[1])));
    } catch (error) {
      if (error instanceof CredentialRateLimitError) throw error;
      throw this.unavailable();
    }
  }

  async releaseMutationReservation(userId: string, ipAddress?: string): Promise<void> {
    const key = this.keys(userId, ipAddress).mutation;
    try {
      await this.redis.getClient().eval(
        "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n<=1 then redis.call('DEL',KEYS[1]); else redis.call('DECR',KEYS[1]); end; return 1",
        1,
        key,
      );
    } catch {
      // The request is already failing before commit. A leaked conservative
      // reservation is safer than making Redis failure look like success.
    }
  }

  static toHttpException(_error: CredentialRateLimitError): HttpException {
    return new HttpException(
      { error: { code: "CREDENTIAL_RATE_LIMITED", message: "Too many credential requests" } },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private keys(userId: string, ipAddress?: string) {
    const ipDimension = crypto.createHash("sha256").update(ipAddress || "unknown").digest("hex").slice(0, 16);
    return {
      reauth: `rl:credential-reauth:${userId}:${ipDimension}`,
      mutation: `rl:credential-mutation:${userId}:${ipDimension}`,
    };
  }

  private unavailable(): HttpException {
    return new HttpException(
      { error: { code: "CREDENTIAL_RATE_LIMIT_UNAVAILABLE", message: "Credential protection is temporarily unavailable" } },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
