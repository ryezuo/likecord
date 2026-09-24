import { LP_LIMITS } from "./link-preview.policy";

interface Job {
  controller: AbortController;
  run: () => Promise<void>;
  cancel: () => void;
}

export class LinkPreviewExecutor {
  private readonly active = new Set<Job>();
  private readonly queued: Job[] = [];
  private closed = false;

  submit<T>(callback: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    if (this.closed || (this.active.size >= LP_LIMITS.concurrency && this.queued.length >= LP_LIMITS.queue)) return Promise.resolve(null);
    return new Promise((resolve) => {
      const controller = new AbortController();
      const job: Job = {
        controller,
        cancel: () => { controller.abort(); resolve(null); },
        run: async () => {
          try { resolve(await callback(controller.signal)); } catch { resolve(null); }
          finally {
            this.active.delete(job);
            const next = this.queued.shift();
            if (next && !this.closed) this.start(next);
          }
        },
      };
      if (this.active.size < LP_LIMITS.concurrency) this.start(job); else this.queued.push(job);
    });
  }

  private start(job: Job): void { this.active.add(job); void job.run(); }

  onModuleDestroy(): void {
    this.closed = true;
    for (const job of this.queued.splice(0)) job.cancel();
    for (const job of this.active) job.cancel();
  }
}
