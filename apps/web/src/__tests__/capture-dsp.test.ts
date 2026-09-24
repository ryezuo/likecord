import { readFileSync } from "fs";
import { join } from "path";
import { runInNewContext } from "vm";

function create(rate = 48000, channels = 1) {
  let Processor: any;
  const messages: any[] = [];
  runInNewContext(readFileSync(join(process.cwd(), "public/audio/capture.v1.js"), "utf8"), {
    sampleRate: rate, AudioWorkletProcessor: class { port = { onmessage: null, postMessage: (message: unknown) => messages.push(message) }; },
    registerProcessor: (_name: string, value: unknown) => { Processor = value; },
    Float32Array, Float64Array, Number, Math, Array, Error,
  });
  const p = new Processor({ processorOptions: { channels } });
  const command = (data: object) => p.port.onmessage({ data: { revision: 1, ...data } });
  const config = (patch: object = {}) => command({ type: "configure", preferences: { inputGainPercent: 100, voiceActivationEnabled: false, voiceActivationThresholdDbfs: -50, ...patch } });
  const render = (data: number[] | number[][], block = 128): number[][] => {
    const source = typeof data[0] === "number" ? [data as number[]] : data as number[][];
    const result: number[][] = Array.from({ length: channels }, () => []);
    for (let start = 0; start < source[0].length; start += block) {
      const input = source.map((values) => Float32Array.from(values.slice(start, start + block)));
      const out = result.map(() => new Float32Array(input[0].length));
      p.process([input], [out]);
      out.forEach((values, c) => result[c].push(...values));
    }
    return result;
  };
  config(); command({ type: "reset" }); render(new Array(256).fill(0)); command({ type: "allow" });
  return { p, config, command, render, messages, rate };
}

describe("production capture worklet", () => {
  it.each([0, 100, 200])("implements %i percent, finite peak-only output and gain ramp", (percent) => {
    const { render, config, p } = create();
    config({ inputGainPercent: percent });
    const output = render(new Array(1000).fill(0.1))[0];
    expect(output.every(Number.isFinite)).toBe(true);
    expect(output[800]).toBeCloseTo(0.1 * percent / 100, 6);
    expect(p.gain).toBe(percent / 100);
    if (percent !== 100) expect(output[144 + 200]).not.toBeCloseTo(0.1 * percent / 100, 3);
  });
  it("is transparent below ceiling apart from a measured 3 ms delay", () => {
    const { render } = create();
    const input = Array.from({ length: 1500 }, (_, i) => Math.sin(i * 0.031) * 0.2);
    const out = render(input)[0];
    for (let i = 144; i < out.length; i++) expect(out[i]).toBeCloseTo(input[i - 144], 7);
  });
  it("bounds overload and links stereo gain without makeup", () => {
    const { render, config } = create(48000, 2);
    config({ inputGainPercent: 200 });
    const [left, right] = render([new Array(6000).fill(0.8), new Array(6000).fill(0.4)]);
    expect(Math.max(...left)).toBeLessThanOrEqual(10 ** (-0.5 / 20) + 1e-7);
    for (let i = 144; i < left.length; i++) expect(left[i]).toBeCloseTo(right[i] * 2, 6);
  });
  it.each([NaN, Infinity, -Infinity])("fails closed on nonfinite input %s", (bad) => {
    const { p, render, messages } = create();
    render(new Array(200).fill(0.8));
    expect(render([0.2, bad, 0.4])[0]).toEqual([0, 0, 0]);
    expect(p.failed).toBe(true);
    expect(messages).toContainEqual({ type: "failure" });
    expect(render(new Array(800).fill(0.8))[0].every((sample) => sample === 0)).toBe(true);
  });
  it("keeps meter active under a closed gate without using the F6 speaking threshold", () => {
    const { config, render, p, messages } = create();
    config({ voiceActivationEnabled: true, voiceActivationThresholdDbfs: -20 });
    const out = render(new Array(4800).fill(0.01))[0];
    expect(out.every((sample) => sample === 0)).toBe(true);
    expect(p.open).toBe(false);
    expect(messages.some((m) => m.type === "meter" && Math.abs(m.dbfs + 40) < 0.01)).toBe(true);
  });
  it("applies threshold, 6 dB hysteresis, 5 ms attack, 150 ms hold and 80 ms release", () => {
    const { config, render, p } = create();
    config({ voiceActivationEnabled: true, voiceActivationThresholdDbfs: -20 });
    render(new Array(1200).fill(0.10001), 1);
    expect(p.open).toBe(true); expect(p.envelope).toBe(1);
    render(new Array(1200).fill(10 ** (-25 / 20)), 1);
    expect(p.open).toBe(true); expect(p.hold).toBe(7200);
    render(new Array(480 + 144 + 7200).fill(0), 1);
    expect(p.open).toBe(false); expect(p.envelope).toBeGreaterThan(0);
    render(new Array(3840).fill(0), 1);
    expect(p.envelope).toBe(0);
    render(new Array(2000).fill(0.099), 1);
    expect(p.open).toBe(false);
    let attackStart = -1; let attackEnd = -1;
    for (let i = 0; i < 2000; i++) {
      render([0.2], 1);
      if (p.envelope > 0 && attackStart < 0) attackStart = i;
      if (p.envelope === 1) { attackEnd = i; break; }
    }
    expect(attackEnd - attackStart).toBeGreaterThanOrEqual(239);
    expect(attackEnd - attackStart).toBeLessThanOrEqual(240);
  });
  it.each([0.004, 0.2])("preserves delayed weak/strong onset at %s using fixed native pre-roll", (level) => {
    const { config, render } = create();
    config({ voiceActivationEnabled: true });
    const out = render(new Array(1800).fill(level))[0];
    expect(out.slice(0, 624).every((sample) => sample === 0)).toBe(true);
    expect(out[624]).toBeGreaterThan(0);
    expect(out[1300]).toBeCloseTo(level, 6);
  });
  it.each(["block", "reset"])("%s dominates gain/limiter/pre-roll and stale allow; reopening erases speech", (type) => {
    const { config, command, render, p } = create();
    config({ inputGainPercent: 200, voiceActivationEnabled: true });
    render(new Array(1000).fill(0.9));
    command({ type, revision: 2 });
    command({ type: "allow", revision: 1 });
    expect(render(new Array(1000).fill(0.9))[0].every((sample) => sample === 0)).toBe(true);
    command({ type: "reset", revision: 3 });
    render(new Array(256).fill(0)); command({ type: "allow", revision: 3 });
    expect(render(new Array(2000).fill(0))[0].every((sample) => sample === 0)).toBe(true);
    expect(p.allowed).toBe(true);
  });
  it.each([{ inputGainPercent: 110 }, { voiceActivationThresholdDbfs: -40 }])("flushes gain/threshold changes %j", (patch) => {
    const { config, render } = create();
    config({ voiceActivationEnabled: true }); render(new Array(1000).fill(0.2));
    config({ voiceActivationEnabled: true, ...patch });
    expect(render(new Array(2000).fill(0))[0].every((sample) => sample === 0)).toBe(true);
  });
  it.each([44100, 48000, 96000])("measures native chain delay and bounded buffers at %i Hz", (rate) => {
    const a = create(rate); const b = create(rate);
    b.config({ voiceActivationEnabled: true, voiceActivationThresholdDbfs: -80 });
    const count = Math.ceil(rate * 0.04);
    const limiter = a.render(new Array(count).fill(0.1))[0].findIndex((v) => v > 0);
    const combined = b.render(new Array(count).fill(0.1))[0].findIndex((v) => v > 0);
    expect(limiter).toBe(Math.floor(rate * 0.003));
    expect(combined - limiter).toBe(Math.round(rate * 0.01));
    expect(combined / rate * 1000).toBeLessThanOrEqual(30);
    const bytes = [b.p.energy, b.p.peakTimes, b.p.peakValues, ...b.p.limiter, ...b.p.preroll].reduce((sum, array) => sum + array.byteLength, 0);
    expect(bytes).toBeLessThan(20000);
    console.info(JSON.stringify({ rate, nativeBypassMs: 0, gainMs: 0, limiterMs: limiter / rate * 1000,
      gateBufferMs: (combined - limiter) / rate * 1000, limiterAndGateMs: combined / rate * 1000, monoBufferBytes: bytes }));
  });
});
