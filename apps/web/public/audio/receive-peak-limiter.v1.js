const CEILING = 10 ** (-0.5 / 20);
const LOOKAHEAD_MS = 3;
const RELEASE_MS = 80;

class LikecordOutputPeakLimiterV1 extends AudioWorkletProcessor {
  constructor() {
    super();
    this.lookaheadFrames = Math.max(1, Math.ceil(sampleRate * LOOKAHEAD_MS / 1000));
    this.ringLength = this.lookaheadFrames + 1;
    this.releaseStep = 1 - Math.exp(-1 / (sampleRate * RELEASE_MS / 1000));
    this.rings = [];
    this.position = 0;
    this.gain = 1;
    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") this.flush();
    };
  }

  flush() {
    this.rings.forEach((ring) => ring.fill(0));
    this.position = 0;
    this.gain = 1;
  }

  process(inputs, outputs) {
    const input = inputs[0] || [];
    const output = outputs[0] || [];
    const channelCount = Math.min(32, output.length);
    const frameCount = output[0]?.length || 0;
    if (this.rings.length !== channelCount) {
      this.rings = Array.from({ length: channelCount }, () => new Float32Array(this.ringLength));
      this.position = 0;
      this.gain = 1;
    }
    for (let frame = 0; frame < frameCount; frame += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const value = input[channel]?.[frame] ?? 0;
        this.rings[channel][this.position] = Number.isFinite(value) ? value : 0;
      }
      const readPosition = (this.position + 1) % this.ringLength;
      let peak = 0;
      for (const ring of this.rings) {
        for (let index = 0; index < ring.length; index += 1) {
          const absolute = Math.abs(ring[index]);
          if (absolute > peak) peak = absolute;
        }
      }
      const requiredGain = peak > CEILING ? CEILING / peak : 1;
      if (requiredGain < this.gain) this.gain = requiredGain;
      else this.gain = Math.min(requiredGain, this.gain + (1 - this.gain) * this.releaseStep);
      for (let channel = 0; channel < channelCount; channel += 1) {
        const value = this.rings[channel][readPosition] * this.gain;
        output[channel][frame] = Number.isFinite(value) ? value : 0;
      }
      this.position = readPosition;
    }
    return true;
  }
}

registerProcessor("likecord-output-peak-limiter-v1", LikecordOutputPeakLimiterV1);
