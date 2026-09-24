import { createHmac, randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { normalizeLinkPreviewUrl } from "@likecord/shared/link-preview-url";
import { LinkPreviewMetadata, sanitizeMetadata } from "./link-preview.parser";
import { LP_LIMITS } from "./link-preview.policy";

export type PreviewRedis = Pick<Redis, "get" | "set" | "eval" | "status">;

// Atomic fixed windows anchored at first admission, like the existing API rate
// owners. A rejected account cannot consume another server reservation.
export const LP_ADMIT_SCRIPT = `
local a=tonumber(redis.call('GET',KEYS[1]) or '0')
local s=tonumber(redis.call('GET',KEYS[2]) or '0')
if a>=tonumber(ARGV[1]) or s>=tonumber(ARGV[2]) then return 0 end
for i=1,2 do
  local n=redis.call('INCR',KEYS[i])
  if n==1 then redis.call('EXPIRE',KEYS[i],ARGV[3]) end
end
return 1`;
export const LP_UNLOCK_SCRIPT = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`;

function safeMetadata(value: unknown): value is LinkPreviewMetadata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((key) => !["title", "description", "siteName", "displayHost"].includes(key))) return false;
  for (const [key, max] of [["title", 200], ["description", 300], ["siteName", 80]] as const) {
    if (key === "description" && v[key] === undefined) continue;
    if (typeof v[key] !== "string" || !v[key] || sanitizeMetadata(v[key], max) !== v[key]) return false;
  }
  return typeof v.displayHost === "string" && normalizeLinkPreviewUrl(`https://${v.displayHost}/`)?.hostname === v.displayHost;
}

export class LinkPreviewCache {
  constructor(private readonly redis: PreviewRedis, private readonly secret: string) {
    if (!secret || Buffer.byteLength(secret) < 32 || secret.trim() !== secret || /change.me|placeholder/i.test(secret)) {
      throw new Error("LINK_PREVIEW_CACHE_HMAC_SECRET must be a dedicated secret of at least 32 bytes");
    }
  }

  key(serverId: string, fetchUrl: string): string {
    if (!serverId || serverId.includes("\0") || normalizeLinkPreviewUrl(fetchUrl)?.fetchUrl !== fetchUrl) throw new Error("url_rejected");
    return `lp:v1:{${this.hash(serverId + "\0" + fetchUrl)}}`;
  }

  private hash(value: string): string { return createHmac("sha256", this.secret).update(value).digest("hex"); }
  private ready(): void { if (this.redis.status !== "ready") throw new Error("redis_unavailable"); }

  /** Redis commands are bounded too; an offline client never queues admission. */
  private async command<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    this.ready();
    if (signal?.aborted) throw new Error("redis_unavailable");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      return await Promise.race([action(), new Promise<never>((_resolve, reject) => {
        abort = () => reject(new Error("redis_unavailable"));
        timer = setTimeout(abort, LP_LIMITS.totalMs);
        signal?.addEventListener("abort", abort, { once: true });
      })]);
    } finally {
      clearTimeout(timer);
      if (abort) signal?.removeEventListener("abort", abort);
    }
  }

  async admit(serverId: string, accountId: string, signal?: AbortSignal): Promise<boolean> {
    if (!serverId || !accountId) return false;
    return await this.command(() => this.redis.eval(LP_ADMIT_SCRIPT, 2,
      `lp:rate:account:${this.hash(accountId)}`, `lp:rate:server:${this.hash(serverId)}`,
      LP_LIMITS.accountRate, LP_LIMITS.serverRate, LP_LIMITS.windowSeconds), signal) === 1;
  }

  async read(key: string, signal?: AbortSignal): Promise<{ metadata: LinkPreviewMetadata | null } | null> {
    const raw = await this.command(() => this.redis.get(key), signal);
    if (!raw || Buffer.byteLength(raw) > LP_LIMITS.cacheBytes) return null;
    try {
      const entry = JSON.parse(raw);
      if (entry.outcome === "unavailable" && Object.keys(entry).length === 1) return { metadata: null };
      if (entry.outcome === "success" && Object.keys(entry).length === 2 && safeMetadata(entry.metadata) && !/https?:\/\//i.test(raw)) return { metadata: entry.metadata };
    } catch { /* A corrupt/old cache value is a miss. */ }
    return null;
  }

  async write(key: string, originalUrl: string, metadata: LinkPreviewMetadata | null, signal?: AbortSignal): Promise<void> {
    let value = metadata && safeMetadata(metadata) ? JSON.stringify({ outcome: "success", metadata }) : "";
    // Remote text can echo the requested capability URL. Do not persist its
    // plaintext identity, including individual signed query values.
    const url = new URL(originalUrl);
    const sensitive = [originalUrl, url.pathname === "/" ? "" : url.pathname, url.search, url.hash,
      url.hash.slice(1),
      ...url.searchParams.values()].filter(Boolean);
    if (Buffer.byteLength(value) > LP_LIMITS.cacheBytes || /https?:\/\//i.test(value) || sensitive.some((part) => value.includes(part))) value = "";
    const positive = !!value;
    if (!positive) value = JSON.stringify({ outcome: "unavailable" });
    await this.command(() => this.redis.set(key, value, "EX", positive ? LP_LIMITS.positiveSeconds : LP_LIMITS.negativeSeconds), signal);
  }

  async lock(key: string, signal?: AbortSignal): Promise<string | null> {
    const token = randomUUID();
    return await this.command(() => this.redis.set(`${key}:lock`, token, "EX", LP_LIMITS.lockSeconds, "NX"), signal) === "OK" ? token : null;
  }

  async unlock(key: string, token: string, signal?: AbortSignal): Promise<void> {
    await this.command(() => this.redis.eval(LP_UNLOCK_SCRIPT, 1, `${key}:lock`, token), signal);
  }
}
