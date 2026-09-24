import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import { RNNoise, CaptureDSP } from './dsp.mjs';
import { CaptureSession, delay } from './runtime.mjs';
import { assert } from '../test/scenarios.mjs';
import { variants, offsets, latencyCases, onsetMatrix, preservation } from '../test/latency-scenarios.mjs';

export async function runLatencyChecks({ offlineCapture, stimulus, lagEstimate, percentiles }, progress, signal) {
  const result = { id: 'latency-continuation-01', comparison: 'deterministic exploratory pre-roll variants',
    proposedTargetMs: 30, targetChanged: false,
    selectedForListening: 'reduced-5', selectedPrerollMs: 5, selectionIsProductAcceptance: false,
    rate: 48000, quantum: 128, gain: 100, threshold: -50, rmsSamples: 480, attackSamples: 240, holdSamples: 7200, releaseSamples: 3840,
    method: { inputSamples: 48000, lagSearch: [0, 3000], correlationWindow: [8000, 26000], stride: 8,
      limitation: 'Same deterministic chirped multitone and window as baseline; phase-sensitive digital/offline lag, not hardware/codec/network/CPU. Fractions below 30 ms are not headroom.' },
    deterministic: [], delays: [], mandatorySilence: [], processorFailure: [], nativeAndPhysicalAudio: 'not_executed' };
  for (const [name, run] of latencyCases) { await run(); result.deterministic.push({ name, result: 'PASS' }); }
  result.onsetIdentity = onsetMatrix();
  for (const mode of ['native', 'rnnoise']) for (const variant of [{ id: 'gate-off', gate: false, prerollMs: 0, gateTiming: 'delayed' }, ...variants.map(v => ({ ...v, gate: true }))]) {
    signal?.throwIfAborted(); if (mode === 'native' && variant.gateTiming === 'frame-lookahead') continue;
    progress(`Comparando atraso: ${mode} / ${variant.id}`);
    const source = stimulus(48000), rendered = await offlineCapture(mode, variant.gate, [], source, variant);
    assert(rendered.data.every(Number.isFinite) && rendered.data.some(x => x !== 0));
    const lag = lagEstimate(source, rendered.data);
    result.delays.push({ mode, ...variant, ...lag, targetResult: lag.ms <= 30 ? 'PASS_OBSERVED_SCOPE' : 'FAIL',
      propagationSamples: (mode === 'rnnoise' ? 960 + 479 : 0) + (variant.gate ? variant.prerollMs * 48 : 0),
      futureFrameAvailable: false, detectorLookaheadSamples: variant.gateTiming === 'frame-lookahead' ? '479 down to 0; frame-end envelope' : variant.gate ? variant.prerollMs * 48 : 0 });
  }
  // Real RNNoise onset/tail inspection, paired with its own ungated output.
  // Render one complete sequence per variant; do not clip its beginning/tail.
  const source = new Float32Array(48000 * 5), episodes = [];
  for (const [index, offset] of offsets.entries()) {
    const onset = (2 + index * 35) * 480 + offset;
    const length = [48, 240, 960][index % 3];
    for (let j = 0; j < length; j++) source[onset + j] = .14 * Math.sin(2 * Math.PI * 173 * j / 48000) + .07 * Math.sin(2 * Math.PI * 521 * j / 48000);
    episodes.push({ inputOnset: onset, frameOffset: onset % 480, quantumOffset: onset % 128, length });
  }
  progress('Inspecionando ataques RNNoise e caudas sem recorte da renderização');
  const reference = (await offlineCapture('rnnoise', false, [], source, { prerollMs: 0 })).data;
  result.onsetRNNoise = { input: '13 separated 173/521 Hz bursts, 1/5/20 ms, offsets from identity matrix; 5 s including silent tail', episodes: [],
    limitation: 'RNNoise itself suppresses/transforms short tones. Expected samples refer to its ungated output, never to promised speech recovery. No syllable intelligibility claim.' };
  for (const v of variants) {
    const data = (await offlineCapture('rnnoise', true, [], source, v)).data;
    for (const e of episodes) result.onsetRNNoise.episodes.push({ variant: v.id, ...e,
      ...preservation(reference, data, v.prerollMs * 48, Math.max(0, e.inputOnset), e.inputOnset + 10000) });
    for (const mode of v.gateTiming === 'frame-lookahead' ? ['rnnoise'] : ['native', 'rnnoise']) {
      const input = new Float32Array(16000); input.set(stimulus(4000));
      const events = [{ at: 4992, type: 'block' }, { at: 8192, type: 'open' }];
      const rendered = await offlineCapture(mode, true, events, input, v);
      assert(rendered.data.subarray(0, 4000).some(x => x !== 0), 'Missing open positive control');
      assert(rendered.data.subarray(4992).every(x => x === 0), 'Buffered old audio after mandatory block/reopen');
      result.mandatorySilence.push({ mode, variant: v.id, result: 'PASS', guardSample: 4992, reopenSample: 8192, postGuardNonzero: 0 });
    }
    // Actual onprocessorerror for every experimental timing, no physical sound.
    let session;
    try {
      session = await CaptureSession.create({ signal, mode: 'rnnoise', config: { ...v, gate: true }, sourceFactory: c => { const s = c.createOscillator(); s.start(); return s; } });
      await session.resume(); await session.reset({ selfMuted: false }); assert(session.track.enabled);
      await delay(120);
      const metrics = await session.getMetrics(); assert(metrics.frames > 0 && metrics.quantumMin === 128 && metrics.quantumMax === 128);
      await session.reset({ selfMuted: true }, { ...v, gate: true }); const closedGeneration = session.guard.generation;
      session.node.port.postMessage({ type: 'open', generation: closedGeneration - 1 });
      await session.getMetrics(); assert(!session.track.enabled && session.guard.state.selfMuted, 'Stale generation reopened capture');
      await session.reset({ selfMuted: false }); assert(session.track.enabled, 'Matching operation/generation ACK failed');
      session.node.port.postMessage({ type: 'crash' }); await delay(200);
      assert(session.guard.state.failed && !session.track.enabled && session.crashExecuted);
      result.processorFailure.push({ variant: v.id, result: 'PASS', event: session.processorErrorEventType, trackEnabled: session.track.enabled,
        quantumMin: metrics.quantumMin, quantumMax: metrics.quantumMax, observedFrames: metrics.frames, clock: session.ready.cpuClock,
        staleGenerationIgnored: true, matchingOpenAck: true });
    } finally { await session?.dispose(); }
    assert(session.context.state === 'closed' && session.track.readyState === 'ended' && session.pending.size === 0);
    Object.assign(result.processorFailure.at(-1), { context: session.context.state, track: session.track.readyState,
      disposeAck: session.disposeAcknowledged, pendingRequests: session.pending.size, totalMemoryRelease: 'not_measured' });
  }
  progress('Medindo custo auxiliar: primeira passagem e passagem aquecida');
  const timingOverhead = [];
  for (let i = 0; i < 2000; i++) { const t = performance.now(); timingOverhead.push(performance.now() - t); }
  result.surrogateCPU = { role: 'window.performance.now exact-DSP auxiliary benchmark; not real worklet callbacks or deadlines',
    baselineOutlierMsPreserved: 2.7, clockPairOverhead: percentiles(timingOverhead),
    instrumentation: 'Two performance.now calls per DSP invocation; input view formed before timer, array append after timer. Pair overhead measured separately, not subtracted. Timer and scheduler jitter remain.', runs: [] };
  for (const v of variants) {
    const dsp = new CaptureDSP({ ...v, engine: new RNNoise(createModule()), gate: true });
    const input = stimulus(48000 * 15), output = new Float32Array(128);
    for (const condition of ['first-pass-fresh-DSP-not-cold-browser', 'second-pass-warmed-code-reset-state']) {
      dsp.activate(); const heavy = [], fifo = [], all = []; const started = performance.now();
      for (let pos = 0; pos + 128 <= input.length; pos += 128) {
        const view = input.subarray(pos, pos + 128), before = dsp.engineCalls, start = performance.now();
        dsp.process(view, output); const elapsed = performance.now() - start;
        all.push(elapsed); (dsp.engineCalls > before ? heavy : fifo).push(elapsed);
      }
      result.surrogateCPU.runs.push({ variant: v.id, condition, sampleSeconds: 15, quantum: 128, quantumMs: 128 / 48,
        wallMs: performance.now() - started, firstRNNoiseCallMs: heavy[0], firstFIFOCallMs: fifo[0],
        aggregate: percentiles(all), rnnoise: percentiles(heavy), fifo: percentiles(fifo), wasmHeapBytes: dsp.engine.module.HEAPU8.byteLength, controlledDSPBytes: dsp.bufferBytes });
    }
    dsp.dispose();
  }
  result.memory = { wasmHeapBytes: 16777216, wasmAudioScratchBytesWithinHeap: 1920,
    dspBytesByVariant: Object.fromEntries(variants.map(v => { const dsp = new CaptureDSP({ ...v, engine: { dispose() {} } }); const bytes = dsp.bufferBytes; dsp.dispose(); return [v.id, bytes]; })),
    workletTimingArraysBytes: 144000,
    otherIdentifiedAllocations: 'RNNoise state/model/stack/allocator reside inside WASM heap; JS module/base64 glue, decoded WASM/compiled code, objects/ports/nodes/tracks, browser audio/peer buffers and temporary metrics copies are additional and unquantified. Synthetic test vectors/report arrays are harness allocations, not a capture working-set estimate.',
    measureUserAgentSpecificMemoryAvailable: typeof performance.measureUserAgentSpecificMemory === 'function',
    crossOriginIsolated, totalAdditionalMemory: 'not_measured', budget64MiB: 'not_measured', leakFreedom: 'not_proven_by_dispose_ACK' };
  result.realWorkletCPU = { result: 'not_measured', reason: 'No worklet performance clock observed; permitted browser API/capabilities expose no trace/profiler. WPR exists with CPU/Audio profiles, but no WPA/xperf analyzer or callback/JS/WASM attribution exposed in this environment; broad OS sampling is not a reliable per-callback distribution. No profiler installed or isolation changed.',
    instrumentationCost: 'Existing worklet counters, output scan and 144000-byte preallocated timing arrays; callback overhead not measured. Callback count/currentTime are not CPU substitutes.' };
  result.complete = true; return result;
}
