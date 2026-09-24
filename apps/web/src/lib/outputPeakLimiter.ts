export const OUTPUT_LIMITER_CEILING_DBFS = -0.5;
export const OUTPUT_LIMITER_LOOKAHEAD_MS = 3;
export const OUTPUT_LIMITER_RELEASE_MS = 80;
export const OUTPUT_LIMITER_CEILING = 10 ** (OUTPUT_LIMITER_CEILING_DBFS / 20);

/**
 * Deterministic sample core matching the production AudioWorklet. The delayed
 * window derives one gain for every channel, preserving stereo position.
 */
export class OutputPeakLimiterCore {
  readonly lookaheadFrames: number;
  readonly ringLength: number;
  private rings: Float32Array[] = [];
  private position = 0;
  private gain = 1;
  private readonly releaseStep: number;

  constructor(readonly sampleRate: number) {
    this.lookaheadFrames = Math.max(1, Math.ceil(sampleRate * OUTPUT_LIMITER_LOOKAHEAD_MS / 1000));
    this.ringLength = this.lookaheadFrames + 1;
    this.releaseStep = 1 - Math.exp(-1 / (sampleRate * OUTPUT_LIMITER_RELEASE_MS / 1000));
  }

  flush() {
    this.rings.forEach((ring) => ring.fill(0));
    this.position = 0;
    this.gain = 1;
  }

  process(input: readonly Float32Array[]): Float32Array[] {
    const channelCount = Math.min(32, input.length);
    const frameCount = input.reduce((maximum, channel) => Math.max(maximum, channel.length), 0);
    if (this.rings.length !== channelCount) {
      this.rings = Array.from({ length: channelCount }, () => new Float32Array(this.ringLength));
      this.position = 0;
      this.gain = 1;
    }
    const output = Array.from({ length: channelCount }, () => new Float32Array(frameCount));
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
      const requiredGain = peak > OUTPUT_LIMITER_CEILING ? OUTPUT_LIMITER_CEILING / peak : 1;
      if (requiredGain < this.gain) this.gain = requiredGain;
      else this.gain = Math.min(requiredGain, this.gain + (1 - this.gain) * this.releaseStep);
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sample = this.rings[channel][readPosition] * this.gain;
        output[channel][frame] = Number.isFinite(sample) ? sample : 0;
      }
      this.position = readPosition;
    }
    return output;
  }
}
