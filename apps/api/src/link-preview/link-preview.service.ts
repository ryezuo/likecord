import { normalizeLinkPreviewUrl } from "@likecord/shared/link-preview-url";
import { LinkPreviewCache } from "./link-preview.cache";
import { LinkPreviewExecutor } from "./link-preview.executor";
import { LinkPreviewTransport } from "./link-preview.transport";
import { LinkPreviewMetadata } from "./link-preview.parser";
import { LP_LIMITS } from "./link-preview.policy";

/** LP.1 internal seam only. LP.2 owns authorization/post-persist lifecycle wiring. */
export class LinkPreviewService {
  constructor(private readonly cache: LinkPreviewCache, private readonly executor: LinkPreviewExecutor,
    private readonly transport: LinkPreviewTransport) {}

  async preview(serverId: string, accountId: string, value: string): Promise<LinkPreviewMetadata | null> {
    const candidate = normalizeLinkPreviewUrl(value);
    if (!candidate) return null;
    // Queue before Redis work, so admission/lock waits cannot form an unbounded
    // second queue. Acquire the 15s lock only when a slot can actually run it.
    return this.executor.submit(async (signal) => {
      let key: string | undefined;
      let token: string | null = null;
      const lease = new AbortController();
      const abort = () => lease.abort();
      signal.addEventListener("abort", abort, { once: true });
      let leaseTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        if (signal.aborted || !await this.cache.admit(serverId, accountId, signal) || signal.aborted) return null;
        key = this.cache.key(serverId, candidate.fetchUrl);
        const cached = await this.cache.read(key, signal);
        if (signal.aborted) return null;
        if (cached) return cached.metadata;
        // Start before SET: even a delayed Redis acknowledgement cannot let
        // network work outlive the 15s dedup lease and overlap another owner.
        leaseTimer = setTimeout(abort, LP_LIMITS.totalMs);
        token = await this.cache.lock(key, lease.signal);
        if (!token || signal.aborted || lease.signal.aborted) return null;
        // Cover another process completing between the first read and lock.
        const raced = await this.cache.read(key, lease.signal);
        if (signal.aborted || lease.signal.aborted) return null;
        if (raced) return raced.metadata;
        const metadata = await this.transport.fetch(candidate.fetchUrl, lease.signal);
        if (signal.aborted || lease.signal.aborted) return null;
        await this.cache.write(key, candidate.href, metadata, lease.signal);
        return signal.aborted ? null : metadata;
      } catch { return null; }
      finally {
        clearTimeout(leaseTimer);
        signal.removeEventListener("abort", abort);
        lease.abort();
        if (key && token && !signal.aborted) {
          try { await this.cache.unlock(key, token, signal); } catch { /* Natural 15s expiry owns recovery. */ }
        }
      }
    });
  }
}
