import { LinkPreviewParser, sanitizeMetadata } from "./link-preview.parser";
import { LP_LIMITS } from "./link-preview.policy";

function parse(html: string, chunkSize = 13) {
  const parser = new LinkPreviewParser("utf-8", "example.com");
  const bytes = Buffer.from(html);
  for (let i = 0; i < bytes.length; i += chunkSize) parser.write(bytes.subarray(i, i + chunkSize));
  return parser.finish();
}

describe("LP-METADATA / LP-SANITIZATION / LP-THUMBNAIL", () => {
  it("extracts title-only and requires a title", () => {
    expect(parse("<head><title>One &amp; Two</title></head>")).toEqual({ title: "One & Two", siteName: "example.com", displayHost: "example.com" });
    expect(parse('<meta name="description" content="no title">')).toBeNull();
  });
  it("uses first nonempty OG precedence case-insensitively", () => {
    expect(parse(`<head><TITLE>Fallback</TITLE><meta name="description" content="fallback">
      <META PROPERTY="OG:TITLE" CONTENT=" "><meta property="og:title" content="Preferred &amp; good">
      <meta property="og:title" content="Later"><meta property="og:description" content="Description">
      <meta property="og:site_name" content="Site"></head>`)).toEqual({
      title: "Preferred & good", description: "Description", siteName: "Site", displayHost: "example.com",
    });
  });
  it("stops at head/body and ignores executable contexts and every subresource", () => {
    const result = parse(`<head><script>document.write('<meta property="og:title" content="bad">')</script>
      <style>bad</style><template><meta property="og:title" content="bad"></template>
      <svg><title>bad</title></svg><title>Safe</title><meta property="og:image" content="https://private.com/secret">
      <link rel="canonical" href="https://other.com"></head><meta property="og:title" content="bad"><body>ignored`);
    expect(result).toEqual({ title: "Safe", siteName: "example.com", displayHost: "example.com" });
    expect(parse('<title>Safe</title><body><meta property="og:title" content="bad">')?.title).toBe("Safe");
  });
  it("handles malformed/truncated head and split UTF-8/entities", () => {
    expect(parse("<title>😀 &amp; é", 1)?.title).toBe("😀 & é");
    expect(parse('<title>fallback</title><meta property="og:title" content="&amp;lt;b&amp;gt;">')?.title).toBe("&lt;b&gt;");
  });
  it("decodes a supported declared charset", () => {
    const parser = new LinkPreviewParser("windows-1252", "example.com");
    parser.write(Buffer.from("<title>caf\xe9</title>", "latin1"));
    expect(parser.finish()?.title).toBe("café");
    expect(() => new LinkPreviewParser("unsupported", "example.com")).toThrow();
  });
  it("returns bounded inert text without markup, controls, bidi or unsafe invisibles", () => {
    const result = parse(`<meta property="og:title" content="&lt;script&gt;evil()&lt;/script&gt; &lt;img onerror=evil&gt; &quot;quoted&quot;\u202e\u200b\0\t ok">
      <meta name="description" content="&lt;svg&gt;&lt;iframe&gt;&lt;embed&gt; CSS: color:red; onclick=evil()">`);
    expect(result?.title).toBe('evil() "quoted" ok');
    expect(result?.description).toBe("CSS: color:red; onclick=evil()");
    expect(sanitizeMetadata("A\u009f\u2066\u034f\ufeff\r\n  B", 20)).toBe("A B");
  });
  it("truncates by code point with ellipsis and bounds the stream before parsing", () => {
    const text = "😀".repeat(400);
    const result = parse(`<meta property="og:title" content="${text}"><meta property="og:description" content="${text}"><meta property="og:site_name" content="${text}">`)!;
    expect(Array.from(result.title)).toHaveLength(200);
    expect(Array.from(result.description!)).toHaveLength(300);
    expect(Array.from(result.siteName)).toHaveLength(80);
    expect(result.title.endsWith("…")).toBe(true);
    const parser = new LinkPreviewParser("utf-8", "example.com");
    expect(() => parser.write(Buffer.alloc(LP_LIMITS.htmlBytes + 1))).toThrow("bytes");
    expect(parser.stopped).toBe(true);
  });
  it("never consumes parser input after stop", () => {
    const parser = new LinkPreviewParser("utf-8", "example.com");
    parser.write(Buffer.from("<title>Kept</title></head>"));
    parser.write(Buffer.from('<meta property="og:title" content="Changed">'));
    expect(parser.finish()?.title).toBe("Kept");
  });
  it("stops as soon as all first-nonempty OG fields settle precedence", () => {
    const parser = new LinkPreviewParser("utf-8", "example.com");
    parser.write(Buffer.from('<meta property="og:title" content="Title"><meta property="og:description" content="Description"><meta property="og:site_name" content="Site">'));
    expect(parser.stopped).toBe(true);
    parser.write(Buffer.alloc(LP_LIMITS.htmlBytes + 1));
    expect(parser.finish()).toEqual({ title: "Title", description: "Description", siteName: "Site", displayHost: "example.com" });
  });
});
