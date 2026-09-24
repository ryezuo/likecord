/** Plain-text Message URL policy shared by the API and future Web renderer. */
export const LINK_PREVIEW_MAX_URL_LENGTH = 2048;
export const LINK_PREVIEW_MAX_MESSAGE_LENGTH = 4000;

export interface EligibleLinkPreviewUrl {
  href: string;
  fetchUrl: string;
  hostname: string;
}

export interface LinkPreviewUrlOccurrence extends EligibleLinkPreviewUrl {
  /** UTF-16 offsets, suitable for slicing the exact authored Message. */
  start: number;
  end: number;
  authoredText: string;
}

const SPECIAL_SUFFIXES = ["localhost", "local", "internal", "test", "invalid", "example", "home.arpa"];

export function normalizeLinkPreviewUrl(value: string): EligibleLinkPreviewUrl | null {
  if (!value || value.length > LINK_PREVIEW_MAX_URL_LENGTH || !/^https?:\/\//i.test(value)) return null;
  // Reject normalization that would erase controls or obscure an authority.
  // eslint-disable-next-line no-control-regex -- Explicit security rejection of ASCII controls.
  if (/[\s\u0000-\u001f\u007f\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    const authority = value.slice(value.indexOf("://") + 3).split(/[/?#]/, 1)[0];
    if (url.username || url.password || authority.includes("@") || url.port) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.replace(/\.$/, "");
    // WHATWG canonicalizes every numeric IPv4 spelling before this check.
    if (!hostname.includes(".") || hostname.includes(":") || /^[\d.]+$/.test(hostname)) return null;
    if (hostname.length > 253 || hostname.split(".").some((label) =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return null;
    if (SPECIAL_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return null;
    url.hostname = hostname;
    const href = url.href;
    url.hash = "";
    if (href.length > LINK_PREVIEW_MAX_URL_LENGTH) return null;
    return { href, fetchUrl: url.href, hostname };
  } catch {
    return null;
  }
}

function trimTerminal(value: string): string {
  const openers: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  while (value) {
    const last = value[value.length - 1];
    if (/[.,;:!?]/.test(last)) { value = value.slice(0, -1); continue; }
    const opener = openers[last];
    if (!opener) break;
    let balance = 0;
    let terminalMatched = false;
    for (const char of value) {
      if (char === opener) balance++;
      if (char === last) {
        terminalMatched = balance > 0;
        balance = Math.max(0, balance - 1);
      }
    }
    if (terminalMatched) break;
    value = value.slice(0, -1);
  }
  return value;
}

export function detectLinkPreviewUrls(content: string): LinkPreviewUrlOccurrence[] {
  if (content.length > LINK_PREVIEW_MAX_MESSAGE_LENGTH) return [];
  const occurrences: LinkPreviewUrlOccurrence[] = [];
  // eslint-disable-next-line no-control-regex -- Controls terminate authored candidates.
  const scanner = /https?:\/\/[^\s\u0000-\u001f\u007f<>"']+/gi;
  for (const match of content.matchAll(scanner)) {
    const start = match.index!;
    if (start > 0 && /\w/.test(content[start - 1])) continue;
    const authoredText = trimTerminal(match[0]);
    const normalized = normalizeLinkPreviewUrl(authoredText);
    if (normalized) occurrences.push({ ...normalized, start, end: start + authoredText.length, authoredText });
  }
  return occurrences;
}

export function selectLinkPreviewCandidate(content: string): LinkPreviewUrlOccurrence | null {
  // V1 cardinality is one: the first occurrence is also the first distinct identity.
  return detectLinkPreviewUrls(content)[0] ?? null;
}
