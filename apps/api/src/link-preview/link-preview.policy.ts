import { isIP } from "node:net";
import * as ipaddr from "ipaddr.js";

export const LP_LIMITS = Object.freeze({
  redirects: 3, connectMs: 1500, firstByteMs: 2500, totalMs: 6000,
  headersBytes: 16384, htmlBytes: 262144, decompressedBytes: 262144,
  cacheBytes: 4096, concurrency: 4, queue: 32,
  accountRate: 5, serverRate: 30, windowSeconds: 60,
  positiveSeconds: 21600, negativeSeconds: 300, lockSeconds: 15,
});

export interface PinnedAddress { address: string; family: 4 | 6 }

export function globalAddress(value: string, family: number): PinnedAddress | null {
  if (!isIP(value) || isIP(value) !== family || value.includes("%")) return null;
  const parsed = ipaddr.parse(value);
  // All named special ranges fail closed, including globally reachable special
  // services. IPv6 additionally requires the currently allocated GUA envelope.
  if (parsed.range() !== "unicast") return null;
  if (parsed instanceof ipaddr.IPv6 && !parsed.match(ipaddr.IPv6.parse("2000::"), 3)) return null;
  return { address: parsed.toString(), family: family as 4 | 6 };
}

export function validateDnsAnswers(answers: readonly { address: string; family: number }[]): PinnedAddress | null {
  if (!answers.length) return null;
  const validated = answers.map(({ address, family }) => globalAddress(address, family));
  return validated.every((address) => address !== null) ? validated[0] : null;
}

export function matchesPinnedPeer(actual: string | undefined, expected: PinnedAddress): boolean {
  if (!actual || !isIP(actual) || actual.includes("%")) return false;
  let parsed = ipaddr.parse(actual);
  // Node can represent an IPv4 socket peer as mapped IPv6. This equivalence is
  // ONLY for comparison to an already validated IPv4 pin; DNS mapped IPs fail.
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) parsed = parsed.toIPv4Address();
  return parsed.toString() === expected.address;
}
