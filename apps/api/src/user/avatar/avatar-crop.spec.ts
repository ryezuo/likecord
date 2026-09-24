import { HttpException } from "@nestjs/common";
import type { Request } from "express";
import { avatarCropRect, DEFAULT_AVATAR_CROP, serializeAvatarCrop, type AvatarCrop } from "@likecord/shared";
import { AVATAR_CROP_HEADER_LIMIT, parseAvatarCropHeader, readAvatarCropHeader } from "./avatar-crop";

const valid = '{"v":1,"panX":0,"panY":0,"zoom":1}';
const expectInvalid = (value: string) => {
  try { parseAvatarCropHeader(value); throw new Error("Expected invalid crop"); }
  catch (error) { expect((error as HttpException).getResponse()).toMatchObject({ error: { code: "AVATAR_INVALID_CROP" } }); }
};

describe("bounded X-Avatar-Crop parser", () => {
  it("accepts the exact crop keys once in any order and canonical numeric boundaries", () => {
    expect(parseAvatarCropHeader(valid)).toEqual(DEFAULT_AVATAR_CROP);
    expect(parseAvatarCropHeader('{ "zoom":4, "panY":1, "v":1, "panX":-1 }')).toEqual({ v: 1, panX: -1, panY: 1, zoom: 4 });
    expect(parseAvatarCropHeader('{"v":1.0,"panX":-0,"panY":0.123456,"zoom":1.25}')).toEqual({ v: 1, panX: 0, panY: 0.123456, zoom: 1.25 });
  });

  it("accepts exactly 192 ASCII bytes and rejects longer or non-ASCII values", () => {
    const prefix = '{"v":1,"panX":0,"panY":0,';
    const suffix = '"zoom":1}';
    const maximum = `${prefix}${" ".repeat(AVATAR_CROP_HEADER_LIMIT - prefix.length - suffix.length)}${suffix}`;
    expect(maximum).toHaveLength(192);
    expect(parseAvatarCropHeader(maximum)).toEqual(DEFAULT_AVATAR_CROP);
    expectInvalid(`${maximum} `);
    expectInvalid('{"v":1,"panX":0,"panY":0,"zoom":1é}');
  });

  it.each([
    '{"v":1,"v":1,"panX":0,"panY":0,"zoom":1}',
    '{"v":1,"panX":0,"panY":0,"zoom":1,"extra":0}',
    '{"v":2,"panX":0,"panY":0,"zoom":1}',
    '{"v":"1","panX":0,"panY":0,"zoom":1}',
    '{"v":1,"panX":null,"panY":0,"zoom":1}',
    '{"v":1,"panX":[],"panY":0,"zoom":1}',
    '{"v":1,"panX":1e-1,"panY":0,"zoom":1}',
    '{"v":1,"panX":0.1234567,"panY":0,"zoom":1}',
    '{"v":1,"panX":0,"panY":0,"zoom":1} trailing',
    '{"v":1,"panX":NaN,"panY":0,"zoom":1}',
    '{"v":1,"panX":Infinity,"panY":0,"zoom":1}',
    '{"v":1,"panX":01,"panY":0,"zoom":1}',
    '{"v":1,"panX":-1.1,"panY":0,"zoom":1}',
    '{"v":1,"panX":0,"panY":0,"zoom":4.1}',
    '{"v":1,"panX":0,"panY":0}',
    '{}',
  ])("rejects invalid grammar or geometry: %s", (value) => expectInvalid(value));

  it("rejects duplicate raw header instances before normalized-header merging", () => {
    const request = { rawHeaders: ["X-Avatar-Crop", valid, "x-avatar-crop", valid], headers: { "x-avatar-crop": `${valid}, ${valid}` } } as Pick<Request, "headers" | "rawHeaders">;
    expect(() => readAvatarCropHeader(request)).toThrow(expect.objectContaining({ status: 400 }));
    expect(readAvatarCropHeader({ rawHeaders: [], headers: {} } as Pick<Request, "headers" | "rawHeaders">)).toBeNull();
    expect(readAvatarCropHeader({ rawHeaders: ["X-Avatar-Crop", valid], headers: { "x-avatar-crop": valid } } as Pick<Request, "headers" | "rawHeaders">)).toEqual(DEFAULT_AVATAR_CROP);
  });
});

describe("canonical avatar crop geometry", () => {
  const crop = (values: Partial<AvatarCrop> = {}): AvatarCrop => ({ ...DEFAULT_AVATAR_CROP, ...values });
  it.each([
    [10, 10, crop(), { left: 0, top: 0, side: 10, outputSide: 10 }],
    [6, 10, crop(), { left: 0, top: 2, side: 6, outputSide: 6 }],
    [11, 7, crop(), { left: 2, top: 0, side: 7, outputSide: 7 }],
    [10, 7, crop(), { left: 1, top: 0, side: 7, outputSide: 7 }],
    [20, 10, crop({ panX: -1 }), { left: 0, top: 0, side: 10, outputSide: 10 }],
    [20, 10, crop({ panX: 1 }), { left: 10, top: 0, side: 10, outputSide: 10 }],
    [20, 10, crop({ zoom: 2, panX: 1, panY: 1 }), { left: 15, top: 5, side: 5, outputSide: 5 }],
    [1000, 800, crop(), { left: 100, top: 0, side: 800, outputSide: 256 }],
    [1, 3, crop(), { left: 0, top: 1, side: 1, outputSide: 1 }],
  ] as const)("maps %sx%s without blank regions", (width, height, value, expected) => {
    const rectangle = avatarCropRect(width, height, value);
    expect(rectangle).toEqual(expected);
    expect(rectangle.left).toBeGreaterThanOrEqual(0); expect(rectangle.top).toBeGreaterThanOrEqual(0);
    expect(rectangle.left + rectangle.side).toBeLessThanOrEqual(width);
    expect(rectangle.top + rectangle.side).toBeLessThanOrEqual(height);
  });

  it("rejects dimension-dependent tiny zoom and pan on an axis with no travel", () => {
    expect(() => avatarCropRect(1, 3, crop({ zoom: 1.01 }))).toThrow(RangeError);
    expect(() => avatarCropRect(10, 20, crop({ panX: 0.1 }))).toThrow(RangeError);
    expect(() => avatarCropRect(20, 10, crop({ panY: -0.1 }))).toThrow(RangeError);
  });

  it("serializes canonical key order with no more than six decimal places", () => {
    expect(serializeAvatarCrop(crop({ panX: 0.12345649, panY: -0, zoom: 1.23456749 })))
      .toBe('{"v":1,"panX":0.123456,"panY":0,"zoom":1.234567}');
  });
});
