import type { LinkPreview as LinkPreviewDto } from "@likecord/shared/link-preview";
import { selectLinkPreviewCandidate } from "@likecord/shared/link-preview-url";
import { EXTERNAL_LINK_PROPS } from "./MessageText";

interface Props {
  content: string;
  preview: LinkPreviewDto;
}

export default function LinkPreview({ content, preview }: Props) {
  const candidate = selectLinkPreviewCandidate(content);
  if (!candidate || candidate.href !== preview.sourceUrl) return null;

  return (
    <a
      className="link-preview"
      href={preview.sourceUrl}
      aria-label={`Open link preview: ${preview.title} (${preview.displayHost})`}
      {...EXTERNAL_LINK_PROPS}
    >
      <span className="link-preview-site">{preview.siteName || preview.displayHost}</span>
      <span className="link-preview-title">{preview.title}</span>
      {preview.description ? <span className="link-preview-description">{preview.description}</span> : null}
    </a>
  );
}
