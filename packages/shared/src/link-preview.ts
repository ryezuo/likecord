export interface LinkPreview {
  sourceUrl: string;
  displayHost: string;
  title: string;
  siteName?: string;
  description?: string;
}

export interface MessagePreviewUpdatedEvent {
  messageId: string;
  channelId: string;
  contentFingerprint: string;
  linkPreview: LinkPreview;
}

/**
 * Cheap cross-runtime correlation for ephemeral preview results. This is not
 * an authentication primitive; callers must also compare the current URL
 * candidate and authoritative Message state.
 */
export function linkPreviewContentFingerprint(content: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `lp1:${content.length}:${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
