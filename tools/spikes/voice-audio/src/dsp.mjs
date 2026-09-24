// Experimental hypotheses from the dedicated contract, never product defaults.
export const FRAME = 480;
export const PCM_SCALE = 32768;
export const CEILING = 10 ** (-0.5 / 20);
export class RNNoise {
  constructor(module) {
    this.module = module;
    for (const key of ['_rnnoise_create', '_rnnoise_init', '_rnnoise_process_frame', '_rnnoise_destroy', '_malloc', '_free']) {
      if (typeof module[key] !== 'function') throw Error(`Missing ABI: ${key}`);
    }
    this.state = module._rnnoise_create(0);
    this.pointer = module._malloc(FRAME * 4);
    if (!this.state || !this.pointer) { this.dispose(); throw Error('RNNoise allocation failed'); }
    this.frames = 0;
  }
  process(frame) {
    const m = this.module;
    // Read HEAPF32 anew: Emscripten may grow memory outside the render callback.
    for (let i = 0; i < FRAME; i++) m.HEAPF32[(this.pointer >>> 2) + i] = frame[i] * PCM_SCALE;
    m._rnnoise_process_frame(this.state, this.pointer, this.pointer);
    for (let i = 0; i < FRAME; i++) frame[i] = m.HEAPF32[(this.pointer >>> 2) + i] / PCM_SCALE;
    this.frames++;
  }
  reset() { if (this.module._rnnoise_init(this.state, 0) !== 0) throw Error('RNNoise reset failed'); }
  dispose() {
    if (this.state) this.module._rnnoise_destroy(this.state);
    if (this.pointer) this.module._free(this.pointer);
    this.state = this.pointer = 0;
  }
}

// Streaming FIFO independent of callback length. No allocations, async work or
// fetches in process(). Exactly one engine state per capture generation.
export class CaptureDSP {
  constructor({ rate = 48000, engine = null, gain = 100, gate = false, threshold = -50, prerollMs = 10, gateTiming = 'delayed' } = {}) {
    if (engine && rate !== 48000) throw Error('MODE_INCOMPATIBLE: RNNoise requires a 48 kHz processing context');
    this.rate = rate; this.engine = engine;
    this.frame = new Float32Array(FRAME);
    this.output = new Float32Array(FRAME);
    this.window = Math.round(rate * 0.010);
    this.squares = new Float64Array(this.window);
    this.setTiming(prerollMs, gateTiming);
    this.gain = gain / 100; this.gate = gate; this.threshold = threshold;
    this.allowed = false; this.failed = false; this.disposed = false;
    this.overloads = 0; this.engineCalls = 0; this.samples = 0; this.preGuardEnergy = 0;
    this.clear();
  }
  setTiming(prerollMs, gateTiming) {
    if (![0, 5, 10].includes(prerollMs) || !['delayed', 'frame-lookahead'].includes(gateTiming)) throw Error('Invalid gate timing');
    if (gateTiming === 'frame-lookahead' && (!this.engine || prerollMs !== 0)) throw Error('MODE_INCOMPATIBLE: frame lookahead requires RNNoise and zero added preroll');
    this.prerollMs = prerollMs; this.gateTiming = gateTiming;
    this.preroll = new Float32Array(Math.round(this.rate * prerollMs / 1000));
  }
  clear() {
    this.frame.fill(0); this.output.fill(0); this.squares.fill(0); this.preroll.fill(0);
    this.inputCount = this.outputCount = this.outputRead = this.windowIndex = this.preIndex = 0;
    this.sumSquares = this.envelope = this.hold = 0; this.open = false; this.level = -120;
  }
  block() { this.allowed = false; this.clear(); }
  activate() {
    if (this.failed || this.disposed) return false;
    this.clear(); this.engine?.reset(); this.allowed = true; return true;
  }
  configure({ gain = this.gain * 100, gate = this.gate, threshold = this.threshold, prerollMs = this.prerollMs, gateTiming = this.gateTiming } = {}) {
    if (!Number.isInteger(gain) || gain < 0 || gain > 200 || !Number.isInteger(threshold) || threshold < -80 || threshold > -10 || typeof gate !== 'boolean') throw Error('Invalid DSP intent');
    this.gain = gain / 100; this.gate = gate; this.threshold = threshold;
    if (prerollMs !== this.prerollMs || gateTiming !== this.gateTiming) this.setTiming(prerollMs, gateTiming);
    this.clear(); this.engine?.reset();
  }
  shaped(sample, count = true) {
    sample *= this.gain;
    if (!Number.isFinite(sample)) throw Error('Nonfinite processed sample');
    if (Math.abs(sample) > CEILING) { if (count) this.overloads++; sample = Math.sign(sample) * CEILING; }
    return sample;
  }
  detect(sample) {
    const sq = sample * sample;
    this.sumSquares += sq - this.squares[this.windowIndex];
    this.squares[this.windowIndex] = sq;
    this.windowIndex = (this.windowIndex + 1) % this.window;
    this.level = 20 * Math.log10(Math.max(Math.sqrt(Math.max(0, this.sumSquares) / this.window), 1e-6));
    if (!this.gate) return;
    if (this.level >= this.threshold) this.open = true;
    if (this.level >= this.threshold - 6) this.hold = Math.round(this.rate * 0.150);
    else if (this.hold > 0) this.hold--;
    else this.open = false;
    this.envelope = this.open ? Math.min(1, this.envelope + 1 / (this.rate * 0.005)) : Math.max(0, this.envelope - 1 / (this.rate * 0.080));
  }
  process(input, output) {
    output.fill(0);
    if (!this.allowed || this.failed || this.disposed) return;
    try {
      for (let i = 0; i < output.length; i++) {
        let sample = input?.[i] ?? 0;
        if (!Number.isFinite(sample)) { this.failed = true; this.block(); output.fill(0); return; }
        if (this.engine) {
          this.frame[this.inputCount++] = sample;
          if (this.inputCount === FRAME) {
            this.engine.process(this.frame); this.engineCalls++;
            this.output.set(this.frame); this.inputCount = 0;
            this.outputCount = FRAME; this.outputRead = 0;
            // Experimental reuse of already computed output, NOT equivalent
            // to fixed 10 ms pre-roll. At input index k*480+479 only output
            // frame k exists. Scan its post-RNNoise/post-gain samples in order;
            // use its final envelope while draining it. Available lookahead
            // falls from 479 to 0 samples. The next frame cannot be inspected.
            if (this.gate && this.gateTiming === 'frame-lookahead') {
              for (let j = 0; j < FRAME; j++) this.detect(this.shaped(this.output[j], false));
            }
          }
          sample = this.outputCount ? this.output[this.outputRead++] : 0;
          if (this.outputCount) this.outputCount--;
        }
        sample = this.shaped(sample);
        // Instantaneous peak clamp is a bounded diagnostic candidate, not an
        // accepted limiter. Distortion under overload must be reported.
        if (!(this.gate && this.gateTiming === 'frame-lookahead')) this.detect(sample);
        if (this.gate) {
          if (this.preroll.length) {
            const delayed = this.preroll[this.preIndex];
            this.preroll[this.preIndex] = sample; this.preIndex = (this.preIndex + 1) % this.preroll.length;
            sample = delayed;
          }
          sample *= this.envelope;
        }
        // Last operation after ALL processing and stored samples.
        this.preGuardEnergy += sample * sample;
        output[i] = this.allowed && !this.failed ? sample : 0;
        this.samples++;
      }
    } catch {
      this.failed = true; this.block(); output.fill(0);
    }
  }
  get bufferBytes() { return this.frame.byteLength + this.output.byteLength + this.squares.byteLength + this.preroll.byteLength; }
  dispose() { if (this.disposed) return; this.block(); this.engine?.dispose(); this.disposed = true; }
}
