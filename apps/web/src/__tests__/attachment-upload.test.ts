import "@testing-library/jest-dom";
import { attachmentApi } from "../lib/api";

describe("attachmentApi.upload (storage driver aware)", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    document.cookie = "";
  });

  it("uses presigned PUT when /prepare returns an absolute uploadUrl (R2 mode)", async () => {
    document.cookie = "csrf_token=csrf123";
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: jest.fn() });

    const file = new File(["hello"], "photo.png", { type: "image/png" });
    const result = await attachmentApi.upload(
      { attachmentId: "att-1", uploadUrl: "https://bucket.r2.example.com/attachments/u1/abc/photo.png?X-Amz-…" },
      file,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://bucket.r2.example.com/");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({ "Content-Type": "image/png" });
    expect(init.credentials).toBeUndefined();
    expect(init.headers["X-CSRF-Token"]).toBeUndefined();
    expect(result).toEqual({ id: "att-1", fileName: "photo.png", fileSize: 5 });
  });

  it("sets a content-type header on presigned PUT even when file.type is empty", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: jest.fn() });

    const file = new File(["hello"], "noext", { type: "" });
    await attachmentApi.upload(
      { attachmentId: "att-2", uploadUrl: "https://bucket.r2.example.com/x.png?X-Amz-…" },
      file,
    );

    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toEqual({ "Content-Type": "application/octet-stream" });
  });

  it("POSTs to the local endpoint with CSRF when /prepare returns a relative uploadUrl", async () => {
    document.cookie = "csrf_token=csrf456";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "att-3", fileName: "a.png", fileSize: 3 }),
    });

    const file = new File(["abc"], "a.png", { type: "image/png" });
    const result = await attachmentApi.upload(
      { attachmentId: "att-3", uploadUrl: "/api/v1/attachments/att-3/upload" },
      file,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/attachments/att-3/upload");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({ "X-CSRF-Token": "csrf456" });
    expect(result).toEqual({ id: "att-3", fileName: "a.png", fileSize: 3 });
  });

  it("throws on a failed upload", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const file = new File(["x"], "x.png", { type: "image/png" });
    await expect(
      attachmentApi.upload({ attachmentId: "att-4", uploadUrl: "https://r2.example/x" }, file),
    ).rejects.toThrow("Upload failed: 500");
  });
});
