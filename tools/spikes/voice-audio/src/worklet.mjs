import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import { CaptureDSP, RNNoise, CEILING } from './dsp.mjs';

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.generation = 0; this.disposed = false; this.callbacks = 0; this.nonzero = 0;
    this.outputEnergy = 0; this.energySamples = 0;
    this.quantumMin = Infinity; this.quantumMax = 0; this.wasFailed = false;
    this.clock = typeof performance !== 'undefined' ? performance.now.bind(performance) : null;
    this.durations = new Float64Array(16000); this.heavy = new Uint8Array(16000); this.measured = 0;
    this.events = options.processorOptions?.events ?? []; this.eventIndex = 0; this.position = 0;
    const config = options.processorOptions ?? {};
    try {
      const module = config.mode === 'rnnoise' ? createModule() : null;
      // This named sync factory returns the initialized module, even though its
      // glue also creates a .ready Promise. No promise enters process().
      this.dsp = new CaptureDSP({ ...config, rate: sampleRate, engine: module ? new RNNoise(module) : null });
      this.wasmBytes = module?.HEAPU8.byteLength ?? 0;
      this.port.onmessage = ({ data }) => this.message(data);
      this.port.postMessage({ type: 'ready', generation: 0, sampleRate, wasmBytes: this.wasmBytes, bufferBytes: this.dsp.bufferBytes, instrumentationBytes:this.durations.byteLength+this.heavy.byteLength, cpuClock: this.clock ? 'performance.now' : 'not_measured' });
      if (config.syntheticAutoOpen) this.dsp.activate();
    } catch {
      this.port.postMessage({ type: 'error', reason: 'initialization' });
    }
  }
  message(data) {
    if (this.disposed || !this.dsp) return;
    if (data.type === 'dispose') {
      this.dsp.dispose(); this.disposed = true;
      this.port.postMessage({ type: 'disposed', generation: this.generation, stateFreed: true, sampleBuffersZero: true });
      this.port.onmessage = null; this.port.close(); return;
    }
    if (data.type === 'metrics') {
      this.port.postMessage({ type: 'metrics', generation:this.generation, allowed:this.dsp.allowed, preGuardEnergy:this.dsp.preGuardEnergy, outputEnergy:this.outputEnergy, energySamples:this.energySamples, callbacks: this.callbacks, quantumMin: this.quantumMin, quantumMax: this.quantumMax, frames: this.dsp.engineCalls, nonzero: this.nonzero, level: this.dsp.level, open: this.dsp.open, failed: this.dsp.failed, samples: this.dsp.samples, wasmBytes: this.wasmBytes, bufferBytes: this.dsp.bufferBytes, measuredCallbacks: this.measured, durations: Array.from(this.durations.subarray(0, this.measured)), heavy: Array.from(this.heavy.subarray(0, this.measured)) });
      return;
    }
    if (data.type === 'crash') { this.crashRequested = true; this.port.postMessage({type:'crash-armed',callbacks:this.callbacks}); return; }
    if (data.generation < this.generation) return;
    this.generation = data.generation;
    this.dsp.block();
    try {
      if (data.config) this.dsp.configure(data.config);
      if (data.type === 'open') this.dsp.activate();
      this.port.postMessage({ type: 'ack', operation: data.type, generation: this.generation, allowed: this.dsp.allowed });
    } catch { this.dsp.failed = true; this.port.postMessage({ type: 'error', reason: 'reset' }); }
  }
  process(inputs, outputs) {
    if (this.crashRequested) { this.port.postMessage({type:'crash-executed'}); throw Error('Injected render callback failure'); }
    const output = outputs[0]?.[0];
    if (!output || this.disposed) return false;
    if (!this.dsp) { output.fill(0); return true; }
    while (this.events[this.eventIndex]?.at <= this.position) {
      const event = this.events[this.eventIndex++];
      if (event.type === 'crash') throw Error('Injected render callback failure');
      if (event.type === 'block') this.dsp.block();
      if (event.type === 'open') this.dsp.activate();
      if (event.type === 'configure') this.dsp.configure(event.config);
    }
    const start = this.clock ? this.clock() : 0; const before = this.dsp.engineCalls;
    this.dsp.process(inputs[0]?.[0], output);
    if (this.clock && this.measured < this.durations.length) {
      this.durations[this.measured] = this.clock() - start;
      this.heavy[this.measured++] = this.dsp.engineCalls > before ? 1 : 0;
    }
    this.callbacks++; this.quantumMin = Math.min(this.quantumMin, output.length); this.quantumMax = Math.max(this.quantumMax, output.length);
    for (let i = 0; i < output.length; i++) { if (output[i] !== 0) this.nonzero++; this.outputEnergy += output[i]*output[i]; }
    this.energySamples += output.length;
    this.position += output.length;
    // Error notification and JS allocation stay outside the render callback:
    // controller also polls metrics; processorerror catches uncaught failures.
    return true;
  }
}
registerProcessor('voice-capture-spike', CaptureProcessor);

// Diagnostic instantaneous peak clamp, zero lookahead/release. It is NOT the
// proposed smooth 3 ms lookahead / 80 ms release limiter and is not adopted.
class ReceivePeakProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input=inputs[0], output=outputs[0];
    for(let c=0;c<output.length;c++)for(let i=0;i<output[c].length;i++){
      const sample=input[c]?.[i]??0;
      if(!Number.isFinite(sample)){for(let k=0;k<output.length;k++)output[k].fill(0);return true;}
      output[c][i]=sample>CEILING?CEILING:sample< -CEILING?-CEILING:sample;
    }
    return true;
  }
}
registerProcessor('voice-receive-peak-spike',ReceivePeakProcessor);
