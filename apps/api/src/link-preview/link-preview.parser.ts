import { Parser } from "htmlparser2";
import { TextDecoder } from "node:util";
import { LP_LIMITS } from "./link-preview.policy";

/** Internal text data, never HTML or a public Message projection. */
export interface LinkPreviewMetadata {
  title: string;
  description?: string;
  siteName: string;
  displayHost: string;
}

export function sanitizeMetadata(value: string, max: number): string {
  const text = value.replace(/<[^<>]*>/g, "").replace(/[<>]/g, "")
    .replace(/[\r\n\t]/g, " ")
    // eslint-disable-next-line no-control-regex, no-misleading-character-class -- Remove individual control/format code points, including CGJ.
    .replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
    .replace(/\s+/gu, " ").trim();
  const points = Array.from(text);
  return points.length > max ? points.slice(0, max - 1).join("") + "…" : text;
}

export class LinkPreviewParser {
  private readonly decoder: TextDecoder;
  private readonly parser: Parser;
  private bytes = 0;
  private title = "";
  private inTitle = false;
  private blockedDepth = 0;
  private values: Record<string, string> = Object.create(null);
  stopped = false;

  constructor(charset: string, private readonly hostname: string) {
    this.decoder = new TextDecoder(charset);
    this.parser = new Parser({
      onopentag: (name, attrs) => {
        if (this.stopped) return;
        if (["script", "style", "svg", "iframe", "embed", "template", "noscript"].includes(name)) this.blockedDepth++;
        if (this.blockedDepth) return;
        if (name === "body") { this.stop(); return; }
        if (name === "title") this.inTitle = true;
        if (name !== "meta") return;
        const key = (attrs.property || attrs.name || "").toLowerCase();
        const max = key === "og:title" ? 200 : key === "og:site_name" ? 80 : 300;
        if (!["og:title", "og:description", "description", "og:site_name"].includes(key) || this.values[key]) return;
        const safe = sanitizeMetadata(attrs.content || "", max);
        if (safe) this.values[key] = safe;
        if (this.values["og:title"] && this.values["og:description"] && this.values["og:site_name"]) this.stop();
      },
      ontext: (text) => {
        if (!this.stopped && !this.blockedDepth && this.inTitle) this.title += text;
      },
      onclosetag: (name) => {
        if (this.stopped) return;
        if (["script", "style", "svg", "iframe", "embed", "template", "noscript"].includes(name)) {
          this.blockedDepth = Math.max(0, this.blockedDepth - 1);
          return;
        }
        if (this.blockedDepth) return;
        if (name === "title") {
          this.inTitle = false;
          if (!this.values.title) this.values.title = sanitizeMetadata(this.title, 200);
          this.title = "";
        }
        if (name === "head") this.stop();
      },
    }, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true });
    // Establish a head scope even for malformed fragments lacking <head>, so
    // htmlparser2 does not discard an otherwise unmatched </head> stop token.
    this.parser.write("<head>");
  }

  write(chunk: Buffer): void {
    if (this.stopped) return;
    this.bytes += chunk.length;
    if (this.bytes > LP_LIMITS.htmlBytes) { this.stop(); throw new Error("bytes"); }
    this.parser.write(this.decoder.decode(chunk, { stream: true }));
  }

  finish(): LinkPreviewMetadata | null {
    if (!this.stopped) {
      this.parser.write(this.decoder.decode());
      this.parser.end();
    }
    const title = this.values["og:title"] || this.values.title || sanitizeMetadata(this.title, 200);
    this.stop();
    if (!title) return null;
    return {
      title,
      ...(this.values["og:description"] || this.values.description
        ? { description: this.values["og:description"] || this.values.description } : {}),
      siteName: this.values["og:site_name"] || sanitizeMetadata(this.hostname, 80),
      displayHost: this.hostname,
    };
  }

  stop(): void { this.stopped = true; this.parser.pause(); }
}
