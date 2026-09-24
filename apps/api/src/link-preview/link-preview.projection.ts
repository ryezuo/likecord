import { Injectable } from "@nestjs/common";
import { normalizeLinkPreviewUrl } from "@likecord/shared/link-preview-url";
import { LinkPreviewCache } from "./link-preview.cache";
import type { LinkPreviewMetadata } from "./link-preview.parser";

/** Cache-only LP.2 history seam. It never calls admission or the network. */
@Injectable()
export class LinkPreviewProjectionService {
  constructor(private readonly cache: LinkPreviewCache) {}

  async readMany(serverId: string, values: readonly string[]): Promise<Array<LinkPreviewMetadata | null>> {
    const candidates = values.map(normalizeLinkPreviewUrl);
    const distinct = new Map<string, Promise<LinkPreviewMetadata | null>>();

    for (const candidate of candidates) {
      if (!candidate || distinct.has(candidate.fetchUrl)) continue;
      const cached = this.cache.read(this.cache.key(serverId, candidate.fetchUrl))
        .then((entry) => entry?.metadata ?? null);
      distinct.set(candidate.fetchUrl, cached);
    }

    // Message history is capped at 50. De-duplicating first bounds this to one
    // cache read per distinct first candidate and lets Redis multiplex the reads.
    const resolved = new Map<string, LinkPreviewMetadata | null>();
    await Promise.all(Array.from(distinct, async ([fetchUrl, pending]) => {
      resolved.set(fetchUrl, await pending);
    }));

    return candidates.map((candidate) => candidate ? resolved.get(candidate.fetchUrl) ?? null : null);
  }
}
