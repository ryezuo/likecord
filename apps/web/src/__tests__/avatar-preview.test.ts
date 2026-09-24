import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AvatarPreviewError,
  avatarPreviewErrorMessage,
  createStaticAvatarPreview,
} from "../lib/avatar-preview";

const fixture = (name: string, type: string) => new File(
  [readFileSync(join(__dirname, "fixtures", name))],
  name,
  { type },
);

describe("static oriented avatar preview", () => {
  const originalBitmap = global.createImageBitmap;
  const originalImage = global.Image;

  const mockCanvas = () => {
    const drawImage = jest.fn();
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const encode = jest.spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) => callback(new Blob(["static"], { type: "image/png" })));
    return { drawImage, encode };
  };

  const mockImage = (decode: () => Promise<void>, width = 8, height = 6) => {
    const image = {
      decoding: "auto",
      src: "",
      naturalWidth: width,
      naturalHeight: height,
      decode: jest.fn(decode),
    } as unknown as HTMLImageElement;
    global.Image = jest.fn(() => image) as unknown as typeof Image;
    return image;
  };

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:static-preview");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.createImageBitmap = originalBitmap;
    global.Image = originalImage;
    jest.restoreAllMocks();
  });

  it("bakes browser EXIF orientation into a static PNG and closes the bitmap", async () => {
    const bitmap = { width: 60, height: 90, close: jest.fn() } as unknown as ImageBitmap;
    global.createImageBitmap = jest.fn(async () => bitmap);
    const { drawImage } = mockCanvas();
    const file = new File(["oriented-jpeg"], "avatar.jpg", { type: "image/jpeg" });

    await expect(createStaticAvatarPreview(file)).resolves.toEqual({ url: "blob:static-preview", width: 60, height: 90 });
    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 60, 90);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("renders repository-valid animated GIF and WebP fixtures as one static PNG frame", async () => {
    const gifBitmap = { width: 8, height: 6, close: jest.fn() } as unknown as ImageBitmap;
    const webpBitmap = { width: 8, height: 6, close: jest.fn() } as unknown as ImageBitmap;
    global.createImageBitmap = jest.fn()
      .mockResolvedValueOnce(gifBitmap)
      .mockResolvedValueOnce(webpBitmap);
    const { drawImage, encode } = mockCanvas();

    await expect(createStaticAvatarPreview(fixture("valid-animated-avatar.gif", "image/gif")))
      .resolves.toMatchObject({ width: 8, height: 6 });
    await expect(createStaticAvatarPreview(fixture("valid-animated-avatar.webp", "image/webp")))
      .resolves.toMatchObject({ width: 8, height: 6 });

    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(encode.mock.calls.map((call) => call[1])).toEqual(["image/png", "image/png"]);
    expect(gifBitmap.close).toHaveBeenCalledTimes(1);
    expect(webpBitmap.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["avatar.jpg", "image/jpeg"],
    ["avatar.png", "image/png"],
    ["avatar.webp", "image/webp"],
  ])("keeps the static %s preview path", async (name, type) => {
    const bitmap = { width: 24, height: 16, close: jest.fn() } as unknown as ImageBitmap;
    global.createImageBitmap = jest.fn(async () => bitmap);
    mockCanvas();

    await expect(createStaticAvatarPreview(new File(["static-image"], name, { type })))
      .resolves.toMatchObject({ width: 24, height: 16 });
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("keeps deterministic parser and policy rejection ahead of browser decode", async () => {
    global.createImageBitmap = jest.fn();
    const oversizedCanvas = new Uint8Array(readFileSync(join(__dirname, "fixtures", "valid-animated-avatar.gif")));
    oversizedCanvas[6] = 1;
    oversizedCanvas[7] = 8;

    await expect(createStaticAvatarPreview(new File([oversizedCanvas], "complex.gif", { type: "image/gif" })))
      .rejects.toMatchObject({ code: "TOO_COMPLEX" });
    await expect(createStaticAvatarPreview(new File([fixture("valid-animated-avatar.gif", "image/gif")], "mismatch.webp", { type: "image/webp" })))
      .rejects.toMatchObject({ code: "INVALID" });
    const apng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 97, 99, 84, 76, 0, 0, 0, 0]);
    await expect(createStaticAvatarPreview(new File([apng], "animated.png", { type: "image/png" })))
      .rejects.toMatchObject({ code: "UNSUPPORTED" });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("reports a controlled decode error when the preferred browser bitmap path rejects", async () => {
    global.createImageBitmap = jest.fn(async () => { throw new DOMException("native detail", "InvalidStateError"); });

    await expect(createStaticAvatarPreview(fixture("valid-animated-avatar.gif", "image/gif")))
      .rejects.toEqual(new AvatarPreviewError("DECODE_FAILED"));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("uses and releases the existing HTML image path when createImageBitmap is unavailable", async () => {
    global.createImageBitmap = undefined as unknown as typeof createImageBitmap;
    const image = mockImage(async () => {});
    const { drawImage } = mockCanvas();
    (URL.createObjectURL as jest.Mock)
      .mockReturnValueOnce("blob:source-image")
      .mockReturnValueOnce("blob:static-preview");

    await expect(createStaticAvatarPreview(fixture("valid-animated-avatar.webp", "image/webp")))
      .resolves.toEqual({ url: "blob:static-preview", width: 8, height: 6 });
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 8, 6);
    expect(image.src).toBe("");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:source-image");
  });

  it("releases the HTML image path and hides native detail when decoding fails", async () => {
    global.createImageBitmap = undefined as unknown as typeof createImageBitmap;
    const image = mockImage(async () => { throw new DOMException("native detail", "EncodingError"); });
    (URL.createObjectURL as jest.Mock).mockReturnValueOnce("blob:source-image");

    await expect(createStaticAvatarPreview(fixture("valid-animated-avatar.gif", "image/gif")))
      .rejects.toEqual(new AvatarPreviewError("DECODE_FAILED"));
    expect(image.src).toBe("");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:source-image");
  });

  it("classifies dimension and canvas failures while still releasing native resources", async () => {
    const oversized = { width: 4097, height: 1, close: jest.fn() } as unknown as ImageBitmap;
    global.createImageBitmap = jest.fn(async () => oversized);
    await expect(createStaticAvatarPreview(new File(["x"], "x.png", { type: "image/png" })))
      .rejects.toMatchObject({ code: "TOO_COMPLEX" });
    expect(oversized.close).toHaveBeenCalledTimes(1);

    const ordinary = { width: 8, height: 6, close: jest.fn() } as unknown as ImageBitmap;
    global.createImageBitmap = jest.fn(async () => ordinary);
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(createStaticAvatarPreview(new File(["x"], "x.png", { type: "image/png" })))
      .rejects.toMatchObject({ code: "PREVIEW_UNAVAILABLE" });
    expect(ordinary.close).toHaveBeenCalledTimes(1);
  });

  it("maps only controlled preview codes to browser-safe user messages", () => {
    expect(avatarPreviewErrorMessage(new AvatarPreviewError("INVALID"))).toContain("invalid or damaged");
    expect(avatarPreviewErrorMessage(new AvatarPreviewError("UNSUPPORTED"))).toContain("not supported");
    expect(avatarPreviewErrorMessage(new AvatarPreviewError("TOO_COMPLEX"))).toContain("supported limits");
    expect(avatarPreviewErrorMessage(new AvatarPreviewError("DECODE_FAILED"))).toContain("browser could not create");
    expect(avatarPreviewErrorMessage(new Error("native decoder detail"))).toBe("Avatar preview is unavailable in this browser. Try another supported browser or image.");
  });
});
