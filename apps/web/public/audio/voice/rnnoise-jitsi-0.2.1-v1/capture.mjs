import createModule from './rnnoise-sync.js';
import { RnnoiseEngine } from './engine.mjs';
import { FixedPrerollCandidate } from './fixed-dsp.mjs';

// One processor/runtime/state per active generation. Its account owns the
// reusable AudioContext/registration. No physical output, network or peer here.
class RnnoiseCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    if (sampleRate !== 48000) throw Error('RNNoise requires 48 kHz');
    this.runtime = createModule();
    this.signal = new FixedPrerollCandidate({ engine: new RnnoiseEngine(this.runtime) });
    for (let i = 0; i < 20; i++) {
      this.signal.frame.fill(0);
      this.signal.engine.process(this.signal.frame);
    }
    this.signal.engine.reset();
    this.signal.clear();
    this.revision = 0;
    this.allowed = false;
    this.ready = false;
    this.failed = false;
    this.retired = false;
    this.ack = null;
    this.meterFrames = 0;
    this.port.onmessage = ({ data }) => {
      if (
        this.retired ||
        !data ||
        !Number.isInteger(data.revision) ||
        data.revision < this.revision
      )
        return;
      try {
        if (data.type === 'retire') {
          this.allowed = false;
          this.ready = false;
          this.revision = data.revision;
          this.signal.block();
          this.signal.dispose();
          this.signal = null;
          this.runtime = null;
          this.retired = true;
          this.port.postMessage({ type: 'retired', revision: this.revision, state: 0, scratch: 0 });
          this.port.onmessage = null;
          this.port.close();
        } else if (data.type === 'block' || data.type === 'reset') {
          this.revision = data.revision;
          this.allowed = false;
          this.ready = false;
          this.meterFrames = 0;
          this.signal.block();
          this.signal.engine.reset();
          this.ack = data.type === 'reset' ? { revision: this.revision, quanta: 0 } : null;
        } else if (
          data.type === 'allow' &&
          data.revision === this.revision &&
          this.ready &&
          !this.failed
        ) {
          // Clear any meter-only history before transmission becomes possible.
          this.signal.activate();
          this.allowed = true;
        } else if (data.type === 'configure') {
          const p = data.preferences;
          if (!p) throw Error('Missing capture intent');
          this.signal.configure({
            gain: p.inputGainPercent,
            gate: p.voiceActivationEnabled,
            threshold: p.voiceActivationThresholdDbfs,
          });
        }
      } catch {
        this.fail();
      }
    };
  }
  fail() {
    if (this.failed) return;
    this.failed = true;
    this.allowed = false;
    this.ready = false;
    this.ack = null;
    this.signal?.block();
    try {
      this.signal?.engine.reset();
    } catch {
      /* Owner hard retirement follows failure. */
    }
    this.port.postMessage({ type: 'failure' });
  }
  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return !this.retired;
    output.fill(0);
    if (this.retired) return false;
    if (this.failed) return true;
    // The node uses explicit mono speaker downmix before this processor.
    if (outputs[0].length !== 1 || (inputs[0]?.length ?? 0) > 1) {
      this.fail();
      return true;
    }
    if (this.ack) {
      if (++this.ack.quanta >= 2) {
        this.ready = true;
        this.signal.activate();
        this.port.postMessage({ type: 'reset', revision: this.ack.revision });
        this.ack = null;
      }
      return true;
    }
    if (!this.ready) return true;
    this.signal.process(inputs[0]?.[0], output);
    if (this.signal.failed) {
      this.fail();
      output.fill(0);
      return true;
    }
    let energy = 0;
    for (let i = 0; i < output.length; i++) energy += output[i] * output[i];
    this.meterFrames += output.length;
    if (this.meterFrames >= 2400) {
      this.meterFrames = 0;
      this.port.postMessage({
        type: 'meter',
        revision: this.revision,
        dbfs: this.signal.level,
        gateOpen: !this.signal.gate || this.signal.open,
        speaking: this.allowed && energy > 1e-8,
      });
    }
    // Meter processing is authorized for a current test/muted capture; it never
    // grants transmission. Mandatory output guard is last, after every FIFO.
    if (!this.allowed || !this.ready || this.failed) output.fill(0);
    return true;
  }
}
registerProcessor('likecord-rnnoise-v1', RnnoiseCapture);
