import { linkPreviewContentFingerprint } from "@likecord/shared/link-preview";

describe("LP.2 shared content correlation", () => {
  it("is deterministic, content-sensitive, bounded, and contains no raw content", () => {
    const content = "Secret-ish authored text https://example.com/path?token=value";
    const fingerprint = linkPreviewContentFingerprint(content);
    expect(fingerprint).toBe(linkPreviewContentFingerprint(content));
    expect(fingerprint).not.toBe(linkPreviewContentFingerprint(content + " changed"));
    expect(fingerprint).toMatch(/^lp1:\d+:[0-9a-f]{16}$/);
    expect(fingerprint).not.toContain("example.com");
    expect(fingerprint).not.toContain("Secret-ish");
  });
});
