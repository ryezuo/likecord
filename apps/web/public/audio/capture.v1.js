// CALL capture only. No playback destination, allocations per sample or network.
const CAPTURE_CEILING = 10 ** (-0.5 / 20);

class LikecordCaptureV1 extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.channels = options.processorOptions.channels;
    if (!Number.isInteger(this.channels) || this.channels < 1 || this.channels > 32) throw new Error("Capture format unavailable");
    this.limiterFrames = Math.floor(sampleRate * 0.003);
    this.preFrames = Math.round(sampleRate * 0.01);
    this.rmsFrames = Math.round(sampleRate * 0.01);
    this.ringLength = this.limiterFrames + 1;
    this.limiter = Array.from({ length: this.channels }, () => new Float32Array(this.ringLength));
    this.preroll = Array.from({ length: this.channels }, () => new Float32Array(this.preFrames + 1));
    this.energy = new Float64Array(this.rmsFrames);
    // Monotonic peak deque: each sample enters and leaves exactly once.
    this.peakValues = new Float64Array(this.ringLength + 1);
    this.peakTimes = new Float64Array(this.ringLength + 1);
    this.gain = 1;
    this.targetGain = 1;
    this.gainStep = 0;
    this.rampLeft = 0;
    this.gateEnabled = false;
    this.threshold = -50;
    this.allowed = false;
    this.failed = false;
    this.revision = 0;
    this.ack = null;
    this.meterFrames = 0;
    this.releaseStep = 1 - Math.exp(-1 / (sampleRate * 0.08));
    this.flush();
    this.port.onmessage = ({ data }) => {
      if (!data || data.revision < this.revision) return;
      if (data.type === "block" || data.type === "reset") {
        this.revision = data.revision;
        this.allowed = false;
        this.flush();
        this.ack = data.type === "reset" ? { revision: data.revision, frames: 0 } : null;
      } else if (data.type === "allow" && data.revision === this.revision && !this.failed) {
        this.flush();
        this.allowed = true;
      } else if (data.type === "configure") {
        const p = data.preferences;
        if (!p || !Number.isInteger(p.inputGainPercent) || p.inputGainPercent < 0 || p.inputGainPercent > 200
          || typeof p.voiceActivationEnabled !== "boolean" || !Number.isInteger(p.voiceActivationThresholdDbfs)
          || p.voiceActivationThresholdDbfs < -80 || p.voiceActivationThresholdDbfs > -10) {
          this.fail(); return;
        }
        this.flush();
        this.targetGain = p.inputGainPercent / 100;
        this.rampLeft = Math.max(1, Math.round(sampleRate * 0.01));
        this.gainStep = (this.targetGain - this.gain) / this.rampLeft;
        this.gateEnabled = p.voiceActivationEnabled;
        this.threshold = p.voiceActivationThresholdDbfs;
      }
    };
  }

  flush() {
    this.limiter.forEach((ring) => ring.fill(0));
    this.preroll.forEach((ring) => ring.fill(0));
    this.energy.fill(0);
    this.position = 0;
    this.prePosition = 0;
    this.energyPosition = 0;
    this.energySum = 0;
    this.frame = 0;
    this.peakHead = 0;
    this.peakTail = 0;
    this.limitGain = 1;
    this.envelope = 0;
    this.open = false;
    this.hold = 0;
  }

  fail() {
    this.allowed = false;
    this.failed = true;
    this.flush();
    this.port.postMessage({ type: "failure" });
  }

  process(inputs, outputs) {
    const input = inputs[0] || [];
    const output = outputs[0] || [];
    const frames = output[0]?.length || 0;
    output.forEach((channel) => channel.fill(0));
    if (this.failed) return true;
    if (output.length !== this.channels || (input.length && input.length !== this.channels)) {
      this.fail(); return true;
    }
    let lastDb = -120;
    let transmittedEnergy = 0;
    for (let i = 0; i < frames; i += 1) {
      if (this.rampLeft > 0) {
        this.gain += this.gainStep;
        if (--this.rampLeft === 0) this.gain = this.targetGain;
      }
      let peak = 0;
      for (let c = 0; c < this.channels; c += 1) {
        const value = (input[c]?.[i] ?? 0) * this.gain;
        if (!Number.isFinite(value)) {
          this.fail(); output.forEach((channel) => channel.fill(0)); return true;
        }
        this.limiter[c][this.position] = value;
        peak = Math.max(peak, Math.abs(value));
      }
      const capacity = this.peakValues.length;
      while (this.peakHead !== this.peakTail && this.peakTimes[this.peakHead] < this.frame - this.limiterFrames) {
        this.peakHead = (this.peakHead + 1) % capacity;
      }
      while (this.peakHead !== this.peakTail) {
        const last = (this.peakTail + capacity - 1) % capacity;
        if (this.peakValues[last] > peak) break;
        this.peakTail = last;
      }
      this.peakValues[this.peakTail] = peak;
      this.peakTimes[this.peakTail] = this.frame++;
      this.peakTail = (this.peakTail + 1) % capacity;
      const maximum = this.peakValues[this.peakHead];
      const required = maximum > CAPTURE_CEILING ? CAPTURE_CEILING / maximum : 1;
      this.limitGain = required < this.limitGain ? required
        : Math.min(required, this.limitGain + (1 - this.limitGain) * this.releaseStep);
      const read = (this.position + 1) % this.ringLength;
      let energy = 0;
      for (let c = 0; c < this.channels; c += 1) {
        const value = this.limiter[c][read] * this.limitGain;
        this.preroll[c][this.prePosition] = value;
        energy += value * value / this.channels;
      }
      this.energySum = Math.max(0, this.energySum + energy - this.energy[this.energyPosition]);
      this.energy[this.energyPosition] = energy;
      this.energyPosition = (this.energyPosition + 1) % this.rmsFrames;
      lastDb = 10 * Math.log10(Math.max(this.energySum / this.rmsFrames, 1e-12));
      if (lastDb >= this.threshold || (this.open && lastDb >= this.threshold - 6)) {
        this.open = true;
        this.hold = Math.round(sampleRate * 0.15);
      } else if (this.hold > 0) this.hold--;
      else this.open = false;
      this.envelope = this.open ? Math.min(1, this.envelope + 1 / (sampleRate * 0.005))
        : Math.max(0, this.envelope - 1 / (sampleRate * 0.08));
      const preRead = this.gateEnabled ? (this.prePosition + 1) % (this.preFrames + 1) : this.prePosition;
      for (let c = 0; c < this.channels; c += 1) {
        // This is the last sample operation, after every pending buffer.
        const sample = this.allowed ? this.preroll[c][preRead] * (this.gateEnabled ? this.envelope : 1) : 0;
        output[c][i] = sample;
        transmittedEnergy += sample * sample / this.channels;
      }
      this.position = read;
      this.prePosition = (this.prePosition + 1) % (this.preFrames + 1);
    }
    if (this.ack) {
      this.ack.frames += frames;
      // Render two silent quanta before readiness acknowledgement.
      if (this.ack.frames >= frames * 2) {
        this.port.postMessage({ type: "reset", revision: this.ack.revision });
        this.ack = null;
      }
    }
    this.meterFrames += frames;
    if (this.meterFrames >= sampleRate / 10) {
      this.meterFrames = 0;
      this.port.postMessage({ type: "meter", revision: this.revision, dbfs: lastDb,
        gateOpen: this.gateEnabled ? this.envelope > 0 : true,
        speaking: this.allowed && Math.sqrt(transmittedEnergy / Math.max(1, frames)) >= 0.035 });
    }
    return true;
  }
}

registerProcessor("likecord-capture-v1", LikecordCaptureV1);
