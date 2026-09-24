// VA.3B 40 ms adoption candidate. No product imports until every gate passes.
import { FRAME, CEILING } from '../src/dsp.mjs';

export class FixedPrerollCandidate {
  constructor({ engine, rate = 48000, gain = 100, gate = false, threshold = -50 }) {
    if (!engine || rate !== 48000) throw Error('MODE_INCOMPATIBLE');
    this.engine = engine;
    this.frame = new Float32Array(FRAME);
    this.output = new Float32Array(FRAME);
    this.energy = new Float64Array(FRAME);
    this.preroll = new Float32Array(FRAME);
    this.gain = this.targetGain = gain / 100;
    this.gainStep = this.rampLeft = 0;
    this.gate = gate;
    this.threshold = threshold;
    this.releaseStep = 1 - Math.exp(-1 / (48000 * .08));
    this.allowed = false;
    this.failed = this.disposed = false;
    this.engineCalls = this.overflows = this.underflows = 0;
    this.clear();
  }

  clear() {
    this.frame.fill(0); this.output.fill(0); this.energy.fill(0); this.preroll.fill(0);
    this.inputCount = this.outputCount = this.outputRead = this.energyIndex = this.preIndex = 0;
    this.energySum = this.hold = this.envelope = 0;
    this.limitGain = 1;
    this.open = this.started = false;
    this.level = -120;
  }

  block() { this.allowed = false; this.clear(); }
  activate() {
    if (this.failed || this.disposed) return false;
    this.clear(); this.engine.reset(); this.allowed = true; return true;
  }

  configure({ gain = this.targetGain * 100, gate = this.gate, threshold = this.threshold } = {}) {
    if (!Number.isInteger(gain) || gain < 0 || gain > 200 || typeof gate !== 'boolean'
      || !Number.isInteger(threshold) || threshold < -80 || threshold > -10) throw Error('Invalid capture intent');
    this.clear(); this.engine.reset();
    this.targetGain = gain / 100; this.rampLeft = 480;
    this.gainStep = (this.targetGain - this.gain) / this.rampLeft;
    this.gate = gate; this.threshold = threshold;
  }

  prepareOwnedOutput() {
    this.engine.process(this.frame); this.engineCalls++;
    let peak = 0;
    for (let j = 0; j < FRAME; j++) {
      if (this.rampLeft > 0) {
        this.gain += this.gainStep;
        if (--this.rampLeft === 0) this.gain = this.targetGain;
      }
      const value = this.frame[j] * this.gain;
      if (!Number.isFinite(value)) throw Error('Nonfinite RNNoise output');
      this.output[j] = value;
      peak = Math.max(peak, Math.abs(value));
    }
    // Already computed frame peak; no extra fixed signal FIFO or hard clipping.
    const required = peak > CEILING ? CEILING / peak : 1;
    for (let j = 0; j < FRAME; j++) {
      this.limitGain = required < this.limitGain ? required
        : Math.min(required, this.limitGain + (1 - this.limitGain) * this.releaseStep);
      this.output[j] *= this.limitGain;
    }
  }

  detect(value) {
    const square = value * value;
    this.energySum = Math.max(0, this.energySum + square - this.energy[this.energyIndex]);
    this.energy[this.energyIndex] = square;
    this.energyIndex = (this.energyIndex + 1) % FRAME;
    this.level = 10 * Math.log10(Math.max(this.energySum / FRAME, 1e-12));
    if (this.level >= this.threshold || (this.open && this.level >= this.threshold - 6)) {
      this.open = true; this.hold = 7200;
    } else if (this.hold > 0) this.hold--;
    else this.open = false;
    this.envelope = this.open ? Math.min(1, this.envelope + 1 / 240)
      : Math.max(0, this.envelope - 1 / 3840);
  }

  process(input, output) {
    output.fill(0);
    if (!this.allowed || this.failed || this.disposed) return;
    try {
      for (let i = 0; i < output.length; i++) {
        const value = input?.[i] ?? 0;
        if (!Number.isFinite(value)) throw Error('Nonfinite input');
        this.frame[this.inputCount++] = value;
        if (this.inputCount === FRAME) {
          if (this.outputCount) { this.overflows++; throw Error('FIFO overflow'); }
          this.prepareOwnedOutput();
          this.inputCount = 0; this.outputCount = FRAME; this.outputRead = 0; this.started = true;
        }
        let sample = 0;
        if (this.outputCount) { sample = this.output[this.outputRead++]; this.outputCount--; }
        else if (this.started) { this.underflows++; throw Error('FIFO underflow'); }
        // Detection uses post-RNNoise/gain/peak samples in drain/sample order.
        // Gate lookahead is exclusively the accepted fixed 480-sample delay.
        this.detect(sample);
        if (this.gate) {
          const delayed = this.preroll[this.preIndex];
          this.preroll[this.preIndex] = sample;
          this.preIndex = (this.preIndex + 1) % FRAME;
          sample = delayed * this.envelope;
        }
        // Mandatory guard remains the last operation after every owned FIFO.
        output[i] = this.allowed && !this.failed ? sample : 0;
      }
    } catch {
      this.failed = true; this.block(); output.fill(0);
    }
  }

  get bufferBytes() { return this.frame.byteLength + this.output.byteLength + this.energy.byteLength + this.preroll.byteLength; }
  dispose() {
    if (this.disposed) return;
    this.block(); this.engine.dispose(); this.disposed = true;
  }
}
