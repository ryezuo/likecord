import {
  OUTPUT_LIMITER_CEILING,
  OUTPUT_LIMITER_LOOKAHEAD_MS,
  OUTPUT_LIMITER_RELEASE_MS,
  OutputPeakLimiterCore,
} from "../lib/outputPeakLimiter";

function constant(value: number, frames = 16) {
  return new Float32Array(frames).fill(value);
}

describe("received CALL + Screen peak protection", () => {
  it("uses the accepted 3ms lookahead, -0.5dBFS ceiling, and approximately 80ms release", () => {
    const limiter = new OutputPeakLimiterCore(48000);
    expect(limiter.lookaheadFrames).toBe(Math.ceil(48000 * OUTPUT_LIMITER_LOOKAHEAD_MS / 1000));
    expect(OUTPUT_LIMITER_CEILING).toBeCloseTo(10 ** (-0.5 / 20), 8);
    expect(OUTPUT_LIMITER_RELEASE_MS).toBe(80);
  });

  it("passes a sub-ceiling mix linearly after the fixed lookahead", () => {
    const limiter = new OutputPeakLimiterCore(1000);
    const input = constant(0.4);
    const [output] = limiter.process([input]);
    expect([...output.slice(0, limiter.lookaheadFrames)]).toEqual([0, 0, 0]);
    for (const sample of output.slice(limiter.lookaheadFrames)) expect(sample).toBeCloseTo(0.4, 6);
  });

  it("limits simultaneous CALL and Screen after the master exactly once", () => {
    const limiter = new OutputPeakLimiterCore(1000);
    const call = 0.6;
    const screen = 0.5;
    const master = 2;
    const [output] = limiter.process([constant((call + screen) * master)]);
    const audible = output.slice(limiter.lookaheadFrames);
    expect(Math.max(...audible.map(Math.abs))).toBeLessThanOrEqual(OUTPUT_LIMITER_CEILING + 1e-6);
    expect(audible[0]).toBeCloseTo(OUTPUT_LIMITER_CEILING, 6);
  });

  it("uses one coherent gain across stereo channels and preserves image ratio", () => {
    const limiter = new OutputPeakLimiterCore(1000);
    const [left, right] = limiter.process([constant(2.8), constant(1.4)]);
    const frame = limiter.lookaheadFrames;
    expect(left[frame]).toBeCloseTo(OUTPUT_LIMITER_CEILING, 6);
    expect(right[frame]).toBeCloseTo(OUTPUT_LIMITER_CEILING / 2, 6);
    expect(left[frame] / right[frame]).toBeCloseTo(2, 6);
  });

  it("sanitizes non-finite samples and never emits a non-finite output", () => {
    const limiter = new OutputPeakLimiterCore(1000);
    const [output] = limiter.process([Float32Array.from([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.25, 0.25, 0.25, 0.25])]);
    expect([...output].every(Number.isFinite)).toBe(true);
    expect(output.slice(0, 6)).toEqual(new Float32Array(6));
    expect(output[6]).toBeCloseTo(0.25, 6);
  });

  it("flushes delayed material so privacy mutes cannot replay buffered audio", () => {
    const limiter = new OutputPeakLimiterCore(1000);
    limiter.process([Float32Array.from([0.8])]);
    limiter.flush();
    const [output] = limiter.process([new Float32Array(8)]);
    expect(output).toEqual(new Float32Array(8));
  });
});
