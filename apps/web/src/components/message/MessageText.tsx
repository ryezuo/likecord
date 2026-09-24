import React from "react";
import { detectLinkPreviewUrls } from "@likecord/shared/link-preview-url";

const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
  referrerPolicy: "no-referrer",
} as const;

export default function MessageText({ content }: { content: string }) {
  const occurrences = detectLinkPreviewUrls(content);
  if (occurrences.length === 0) return <>{content}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const occurrence of occurrences) {
    if (occurrence.start > cursor) parts.push(content.slice(cursor, occurrence.start));
    parts.push(
      <a key={`${occurrence.start}:${occurrence.end}`} className="message-link" href={occurrence.href} {...EXTERNAL_LINK_PROPS}>
        {occurrence.authoredText}
      </a>,
    );
    cursor = occurrence.end;
  }
  if (cursor < content.length) parts.push(content.slice(cursor));
  return <>{parts}</>;
}

export { EXTERNAL_LINK_PROPS };
