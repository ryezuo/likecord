import { detectLinkPreviewUrls as detect, normalizeLinkPreviewUrl as normalize, selectLinkPreviewCandidate } from "@likecord/shared/link-preview-url";

describe("LP-URL shared plain-text owner", () => {
  it.each([".", ",", ";", ":", "!", "?", ")", "]", "}", ")."])("trims terminal %s and preserves ranges", (suffix) => {
    const content = `look (https://Example.com/a${suffix} next`;
    const [link] = detect(content);
    expect(link.authoredText).toBe("https://Example.com/a");
    expect(content.slice(link.start, link.end)).toBe(link.authoredText);
    expect(link.hostname).toBe("example.com");
  });
  it.each(["(a)", "[a]", "{a}", "a_(b_(c))", "a)(b)"])("preserves balanced %s", (tail) => {
    expect(detect(`https://example.com/${tail})`)[0].authoredText).toBe(`https://example.com/${tail}`);
  });
  it("preserves every occurrence, order, queries, fragments, line breaks and first-distinct selection", () => {
    const text = "x\nHTTPS://EXAMPLE.COM:443/a?q=1#one\r\nhttps://example.com/a?q=1#two https://other.com/";
    const links = detect(text);
    expect(links).toHaveLength(3);
    expect(links[0].fetchUrl).toBe(links[1].fetchUrl);
    expect(links[0].href).toBe("https://example.com/a?q=1#one");
    expect(links[0].fetchUrl).toBe("https://example.com/a?q=1");
    expect(links.map((link) => text.slice(link.start, link.end))).toEqual(links.map((link) => link.authoredText));
    expect(selectLinkPreviewCandidate(text)).toEqual(links[0]);
  });
  it("canonicalizes IDNA and one root dot", () => {
    expect(normalize("HtTpS://BÜCHER.de.:443/a")?.hostname).toBe("xn--bcher-kva.de");
    expect(normalize("https://example.com../")).toBeNull();
  });
  it.each([
    "http://user:pass@example.com", "https://@example.com", "http://example.com:443", "https://example.com:80",
    "https://example.com:444", "http://127.0.0.1", "http://8.8.8.8", "http://2130706433", "http://0x7f000001",
    "http://0177.0.0.1", "http://127.1", "http://[::1]", "http://[2606:4700:4700::1111]", "http://[::ffff:8.8.8.8]",
    "http://redis", "https://foo.localhost", "https://foo.local", "https://foo.internal", "https://foo.test",
    "https://foo.invalid", "https://foo.example", "https://foo.home.arpa", "https://home.arpa", "https://",
    "javascript:alert(1)", "ftp://example.com", "data:text/html,x", "file://example.com", "ws://example.com",
    "wss://example.com", "blob:https://example.com", "//example.com", "https://exam\\ple.com", "https://exa\nmple.com",
  ])("rejects %s", (value) => expect(normalize(value)).toBeNull());
  it("accepts default ports and rejects embedded word schemes", () => {
    expect(normalize("http://example.com:80")?.fetchUrl).toBe("http://example.com/");
    expect(normalize("https://example.com:443")?.fetchUrl).toBe("https://example.com/");
    expect(detect("ahttps://example.com _http://example.com 2https://example.com www.example.com")).toEqual([]);
  });
  it("leaves Markdown syntax literal and encoded nesting inside the outer candidate", () => {
    const text = "[label](https://example.com/a) https://other.com/?next=https%3A%2F%2Fnested.com%2F";
    expect(detect(text).map((v) => v.authoredText)).toEqual([
      "https://example.com/a", "https://other.com/?next=https%3A%2F%2Fnested.com%2F",
    ]);
  });
  it.each([" ", "\n", "\t", "\0", "\u007f", "<", ">", "'", '"'])("terminates before delimiter", (end) => {
    expect(detect(`https://example.com/a${end}tail`)[0].authoredText).toBe("https://example.com/a");
  });
  it("enforces 2048 URL and 4000 Message bounds", () => {
    const base = "https://example.com/";
    const url = base + "x".repeat(2048 - base.length);
    expect(normalize(url)).not.toBeNull();
    expect(normalize(url + "x")).toBeNull();
    expect(detect(url + " ".repeat(4000 - url.length))).toHaveLength(1);
    expect(detect(url + " ".repeat(4001 - url.length))).toEqual([]);
  });
});
