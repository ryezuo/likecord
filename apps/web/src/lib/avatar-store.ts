import { ApiError, avatarApi, type AvatarProjection } from "./api";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const idPattern = new RegExp(`^${uuid}$`);
const versionPattern = new RegExp(`^[1-9][0-9]{12}-${uuid}\\.webp$`);
export function canonicalAvatar(userId: string, value?: string | null): string | null {
  const prefix = `/api/v1/users/${userId}/avatar/`;
  return idPattern.test(userId) && value?.startsWith(prefix) && versionPattern.test(value.slice(prefix.length)) ? value : null;
}
type Entry = {
  url: string | null; revision: number; listeners: Set<() => void>; wanted: boolean;
  controller?: AbortController; settled?: Promise<boolean>; resolve?: (success: boolean) => void;
  recovery?: { url: string; promise: Promise<boolean> };
};

/** Session-scoped avatar state only. No profile projections or media ownership. */
export class AvatarStore {
  private entries = new Map<string, Entry>();
  private active = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private blockedUntil = 0;
  private disposed = false;
  constructor(readonly selfId: string, initial: string | null, private readonly mergeSelf: (url: string | null) => void,
    private readonly fetchMetadata = (id: string, signal?: AbortSignal) => avatarApi.metadata(id, signal)) {
    if (idPattern.test(selfId)) this.ensure(selfId, initial);
  }
  private ensure(id: string, initial?: string | null): Entry | undefined {
    if (!idPattern.test(id) || this.disposed) return;
    let entry = this.entries.get(id);
    if (!entry && this.entries.size < 512) {
      entry = { url: canonicalAvatar(id, initial), revision: 0, listeners: new Set(), wanted: false };
      this.entries.set(id, entry);
    }
    return entry;
  }
  read = (id: string) => this.entries.get(id)?.url;
  subscribe(id: string, listener: () => void, initial?: string | null): () => void {
    const entry = this.ensure(id, initial);
    if (!entry) return () => {};
    const first = entry.listeners.size === 0;
    entry.listeners.add(listener);
    if (first) void this.refresh(id);
    return () => {
      entry.listeners.delete(listener);
      if (!entry.listeners.size && id !== this.selfId) {
        this.entries.delete(id); entry.controller?.abort(); entry.resolve?.(false);
      }
    };
  }
  private publish(id: string, entry: Entry, url: string | null) {
    if (url !== entry.url) entry.recovery = undefined;
    entry.url = url;
    if (id === this.selfId) this.mergeSelf(url);
    entry.listeners.forEach((listener) => listener());
  }
  accept(projection: AvatarProjection) {
    if (projection.userId !== this.selfId || this.disposed) return;
    const entry = this.ensure(this.selfId);
    if (!entry) return;
    entry.revision++;
    this.publish(this.selfId, entry, canonicalAvatar(this.selfId, projection.avatarUrl));
    void this.refresh(this.selfId);
  }
  refresh(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry || this.disposed) return Promise.resolve(false);
    entry.revision++; entry.wanted = true;
    if (!entry.settled) entry.settled = new Promise((resolve) => { entry.resolve = resolve; });
    this.schedule();
    return entry.settled;
  }
  invalidate(id: string) { if (this.entries.has(id)) void this.refresh(id); }
  recover() { this.entries.forEach((_entry, id) => { void this.refresh(id); }); }
  recoverImage(id: string, url: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry || this.disposed) return Promise.resolve(false);
    if (entry.recovery?.url === url) return entry.recovery.promise;
    const promise = this.refresh(id);
    entry.recovery = { url, promise };
    return promise;
  }
  private schedule() {
    if (this.timer || this.disposed) return;
    this.timer = setTimeout(() => { this.timer = undefined; this.pump(); }, Math.max(50, this.blockedUntil - Date.now()));
  }
  private pump() {
    if (this.disposed) return;
    if (Date.now() < this.blockedUntil) { this.schedule(); return; }
    for (const [id, entry] of this.entries) {
      if (this.active >= 4) break;
      if (!entry.wanted || entry.controller) continue;
      entry.wanted = false; this.active++;
      const revision = entry.revision;
      const controller = new AbortController(); entry.controller = controller;
      const timeout = setTimeout(() => controller.abort(), 15_000);
      void (async () => {
        let success = false;
        try {
          const result = await this.fetchMetadata(id, controller.signal);
          if (!this.disposed && this.entries.get(id) === entry && !controller.signal.aborted && revision === entry.revision && result.userId === id) {
            this.publish(id, entry, canonicalAvatar(id, result.avatarUrl)); success = true;
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 429) {
            this.blockedUntil = Date.now() + error.retryAfter * 1000;
          }
        } finally {
          clearTimeout(timeout); entry.controller = undefined; this.active--;
          if (!entry.wanted) {
            entry.resolve?.(success); entry.resolve = undefined; entry.settled = undefined;
          }
          if ([...this.entries.values()].some((item) => item.wanted)) this.schedule();
        }
      })();
    }
  }
  dispose() {
    this.disposed = true; clearTimeout(this.timer);
    this.entries.forEach((entry) => { entry.controller?.abort(); entry.resolve?.(false); });
    this.entries.clear();
  }
}
