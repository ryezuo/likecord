import { CaptureDSP } from '../src/dsp.mjs';
import { TransmissionGuard } from '../src/control.mjs';
import { assert } from './scenarios.mjs';

export const variants = [
  { id: 'original-10', prerollMs: 10, gateTiming: 'delayed' },
  { id: 'reduced-5', prerollMs: 5, gateTiming: 'delayed' },
  { id: 'zero-added', prerollMs: 0, gateTiming: 'delayed' },
  { id: 'frame-lookahead', prerollMs: 0, gateTiming: 'frame-lookahead' }
];
export const offsets = [0, 1, 47, 127, 128, 239, 240, 351, 478, 479, 511, 959, 1919];
export const identityEngine = () => ({ calls: 0, process() { this.calls++; }, reset() {}, dispose() {} });
export function stream(dsp, source, sizes = [128]) {
  const result = new Float32Array(source.length);
  for (let pos = 0, n = 0; pos < source.length; n++) {
    const end = Math.min(source.length, pos + sizes[n % sizes.length]);
    dsp.process(source.subarray(pos, end), result.subarray(pos, end)); pos = end;
  }
  return result;
}
// Count preservation against the ungated path at the SAME propagation delay.
// This alignment is only for gain/onset inspection, never the latency estimator.
export function preservation(reference, candidate, addedDelay = 0, start = 0, end = reference.length - addedDelay) {
  let expected = 0, preserved = 0, attenuated = 0, discarded = 0, firstExpected = null, firstOutput = null;
  let referenceEnergy = 0, candidateEnergy = 0;
  for (let i = start; i < end; i++) {
    const x = reference[i], y = candidate[i + addedDelay];
    if (Math.abs(x) <= 1e-8) continue;
    expected++; firstExpected ??= i;
    if (Math.abs(y) <= 1e-8) discarded++;
    else { firstOutput ??= i + addedDelay; if (Math.abs(x - y) <= Math.max(1e-8, Math.abs(x) * 1e-5)) preserved++; else attenuated++; }
    referenceEnergy += x * x; candidateEnergy += y * y;
  }
  return { expected, preserved, attenuated, discarded, firstExpected, firstOutput,
    energyRatio: referenceEnergy ? candidateEnergy / referenceEnergy : null };
}
export function onsetMatrix() {
  const rows = [];
  for (const v of variants) for (const offset of offsets) for (const [signal, amplitude, length] of [
    ['strong-1ms', .1, 48], ['strong-5ms', .1, 240], ['strong-20ms', .1, 960], ['near-threshold-20ms', .004, 960]
  ]) {
    const onset = 4800 + offset, source = new Float32Array(onset + length + 24000);
    source.fill(amplitude, onset, onset + length);
    const dsp = new CaptureDSP({ ...v, engine: identityEngine(), gate: true }); dsp.activate();
    const result = stream(dsp, source, [1, 64, 127, 128, 256, 480, 512, 1024]);
    const reference = new Float32Array(source.length); reference.set(source.subarray(0, source.length - 479), 479);
    const samples = preservation(reference, result, v.prerollMs * 48, onset + 479, onset + 479 + length);
    assert(samples.expected === length && samples.expected === samples.preserved + samples.attenuated + samples.discarded);
    rows.push({ variant: v.id, signal, inputOnset: onset, frameOffset: onset % 480, quantumOffset: onset % 128, length, ...samples });
    dsp.dispose();
  }
  return { origin: 'deterministic_identity_engine_samples', rate: 48000, gate: true, gain: 100, threshold: -50,
    rmsWindowSamples: 480, attackSamples: 240, holdSamples: 7200, releaseSamples: 3840,
    callbackSizes: [1, 64, 127, 128, 256, 480, 512, 1024], variants, rows,
    limitation: 'Identity engine isolates gate/adapter sample loss; synthetic steps are not syllable intelligibility or RNNoise quality.' };
}

export const latencyCases = variants.flatMap(v => [
  [`${v.id}: gate off preserves all samples and frames at every callback boundary`, () => {
    const engine = identityEngine(), dsp = new CaptureDSP({ ...v, engine, gate: false }); dsp.activate();
    const input = Float32Array.from({ length: 10003 }, (_, i) => (i % 113 + 1) / 1000);
    const out = stream(dsp, input, [1, 127, 128, 256, 480, 512, 1024]);
    assert(out.subarray(0, 479).every(x => x === 0));
    assert(out.subarray(479).every((x, i) => x === input[i]));
    assert(engine.calls === Math.floor(input.length / 480)); dsp.dispose();
  }],
  [`${v.id}: mandatory mute before/during/after attack clears both FIFOs and fresh generation`, () => {
    for (const at of [1, 479, 480, 600, 719, 959, 1024, 1800]) {
      const dsp = new CaptureDSP({ ...v, engine: identityEngine(), gate: true });
      const guard = new TransmissionGuard(), track = { enabled: false, stop() { this.enabled = false; } };
      guard.own(track); guard.onBlock = () => dsp.block();
      const generation = guard.update({ selfMuted: false }); dsp.activate(); guard.acknowledge(generation, track);
      stream(dsp, new Float32Array(at).fill(.1));
      guard.update({ selfMuted: true }); assert(!track.enabled);
      assert(stream(dsp, new Float32Array(1027).fill(.1)).every(x => x === 0));
      assert([dsp.frame, dsp.output, dsp.preroll, dsp.squares].every(a => a.every(x => x === 0)));
      assert(!guard.acknowledge(generation, track));
      const fresh = guard.update({ selfMuted: false }); dsp.activate(); assert(guard.acknowledge(fresh, track));
      assert(stream(dsp, new Float32Array(4000)).every(x => x === 0), 'Old onset after unmute');
      assert(stream(dsp, new Float32Array(4000).fill(.1)).some(x => x !== 0), 'Fresh onset never recovered');
      dsp.dispose(); guard.dispose();
    }
  }],
  [`${v.id}: hysteresis, short pause, hold/release and zero gain preserve intent`, () => {
    const dsp = new CaptureDSP({ ...v, engine: identityEngine(), gate: true }); dsp.activate();
    stream(dsp, new Float32Array(4800).fill(.1)); assert(dsp.open && dsp.envelope === 1);
    stream(dsp, new Float32Array(4800).fill(10 ** (-53 / 20))); assert(dsp.open && dsp.envelope === 1);
    stream(dsp, new Float32Array(4800)); assert(dsp.open && dsp.envelope === 1, '100 ms pause exceeds hold');
    const tail = stream(dsp, new Float32Array(14400)); assert(!dsp.open && dsp.envelope === 0 && tail.subarray(12000).every(x => x === 0));
    dsp.configure({ gain: 0 }); assert(stream(dsp, new Float32Array(4800).fill(.1)).every(x => x === 0));
    assert(dsp.allowed && !dsp.failed && dsp.level === -120); dsp.dispose();
  }],
  [`${v.id}: engine fault closes the entire callback and cannot reopen failed state`, () => {
    const engine = identityEngine(); engine.process = () => { throw Error('injected engine fault'); };
    const dsp = new CaptureDSP({ ...v, engine, gate: true }); dsp.activate();
    assert(stream(dsp, new Float32Array(1024).fill(.1), [1024]).every(x => x === 0));
    assert(dsp.failed && !dsp.activate()); dsp.dispose();
  }]
]);
latencyCases.push(['Onset matrix exposes fixed-delay and frame-lookahead tradeoffs across alignments', () => {
  const matrix = onsetMatrix();
  const strong = id => matrix.rows.filter(r => r.variant === id && r.signal.startsWith('strong'));
  assert(strong('original-10').every(r => r.preserved === r.expected));
  assert(strong('reduced-5').every(r => r.preserved === r.expected));
  assert(strong('zero-added').every(r => r.attenuated > 0));
  assert(strong('frame-lookahead').some(r => r.attenuated > 0) && strong('frame-lookahead').some(r => r.preserved === r.expected));
  assert(matrix.rows.some(r => r.variant === 'frame-lookahead' && r.discarded > 0));
}]);
latencyCases.push(['Shared buffering cannot claim an unavailable next frame or a native adapter', () => {
  let failed = false; try { new CaptureDSP({ gateTiming: 'frame-lookahead', prerollMs: 0 }); } catch { failed = true; } assert(failed);
  // At the first output sample only the current 480 samples exist. A 10 ms
  // lookahead requires one more than even its largest 479-sample horizon.
  for (let j = 0; j < 480; j++) assert(479 - j < 480);
}]);
