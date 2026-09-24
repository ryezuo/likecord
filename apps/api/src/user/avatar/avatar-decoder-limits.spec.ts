import sharp from "sharp";
import { normalizeAvatar } from "./avatar-image";

// Fault injection covers output limits and native timeout paths that tiny valid fixtures cannot reach.
jest.mock("sharp", () => ({ __esModule: true, default: jest.fn() }));
describe("avatar decoder budgets", () => {
  const mockSharp = sharp as jest.MockedFunction<typeof sharp>;
  const input = Buffer.from([255,216,255,192,0,8,8,0,1,0,1,1,255,218,0,2,1,255,217]);
  const output = Buffer.from("RIFF\u000c\u0000\u0000\u0000WEBPVP8 \u0000\u0000\u0000\u0000", "binary");
  let decode: Record<string, jest.Mock>, encode: Record<string, jest.Mock>;
  const chain = () => {
    const value: Record<string, jest.Mock> = {};
    for (const method of ["autoOrient", "toColourspace", "raw", "timeout", "extract", "resize", "webp"]) value[method] = jest.fn(() => value);
    value.toBuffer = jest.fn(); return value;
  };
  beforeEach(() => {
    mockSharp.mockReset(); decode = chain(); encode = chain();
    mockSharp.mockReturnValueOnce({ metadata: async () => ({ format: "jpeg", width: 1, height: 1 }) } as unknown as ReturnType<typeof sharp>)
      .mockReturnValueOnce(decode as unknown as ReturnType<typeof sharp>).mockReturnValueOnce(encode as unknown as ReturnType<typeof sharp>);
    decode.toBuffer.mockResolvedValue({ data: Buffer.alloc(3), info: { width: 1, height: 1, channels: 3 } });
    encode.toBuffer.mockResolvedValue({ data: output, info: { format: "webp", width: 1, height: 1 } });
  });
  it("uses strict bounded decode, materializes raw pixels and sets native timeouts", async () => {
    await normalizeAvatar(input, "image/jpeg");
    expect(mockSharp.mock.calls[1][1]).toMatchObject({ failOn: "warning", limitInputPixels: 16_777_216, limitInputChannels: 4, unlimited: false });
    expect(decode.raw).toHaveBeenCalled(); expect(decode.timeout).toHaveBeenCalled(); expect(encode.timeout).toHaveBeenCalled();
    expect(mockSharp.mock.calls[2][1]).toEqual({ raw: { width: 1, height: 1, channels: 3 } });
  });
  it("maps actual native timeout rejection without exposing parser details", async () => {
    decode.toBuffer.mockRejectedValueOnce(new Error("timeout in secret parser path"));
    await expect(normalizeAvatar(input, "image/jpeg")).rejects.toMatchObject({ status: 503, response: { error: { code: "AVATAR_PROCESSING_TIMEOUT" } } });
  });
  it("rejects output above 512 KiB", async () => {
    encode.toBuffer.mockResolvedValueOnce({ data: Buffer.alloc(512 * 1024 + 1), info: { format: "webp", width: 1, height: 1 } });
    await expect(normalizeAvatar(input, "image/jpeg")).rejects.toMatchObject({ status: 422, response: { error: { code: "AVATAR_OUTPUT_TOO_LARGE" } } });
  });
  it("does not return a JS timeout while native decode is still pending", async () => {
    jest.useFakeTimers();
    let finish!: (value: unknown) => void;
    decode.toBuffer.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let ended = false;
    const pending = normalizeAvatar(input, "image/jpeg").catch((error) => { ended = true; expect(error.status).toBe(503); });
    await jest.advanceTimersByTimeAsync(11_000); expect(ended).toBe(false);
    finish({ data: Buffer.alloc(3), info: { width: 1, height: 1, channels: 3 } }); await pending;
    expect(ended).toBe(true); jest.useRealTimers();
  });
});
