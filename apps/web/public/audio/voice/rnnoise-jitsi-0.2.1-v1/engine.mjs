// Exact pinned RNNoise ABI/scale, with signal ownership cleanup before release.
export const FRAME = 480;
export const CEILING = 10 ** (-0.5 / 20);
export class RnnoiseEngine {
  constructor(module) {
    this.module = module;
    this.state = 0;
    this.pointer = 0;
    for (const key of [
      '_rnnoise_create',
      '_rnnoise_init',
      '_rnnoise_process_frame',
      '_rnnoise_destroy',
      '_malloc',
      '_free',
    ]) {
      if (typeof module[key] !== 'function') throw Error('RNNoise ABI unavailable');
    }
    try {
      this.state = module._rnnoise_create(0);
      this.pointer = module._malloc(FRAME * 4);
      if (!this.state || !this.pointer) throw Error('RNNoise allocation failed');
      this.zeroScratch();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  zeroScratch() {
    if (this.pointer) this.module.HEAPF32.fill(0, this.pointer >>> 2, (this.pointer >>> 2) + FRAME);
  }
  process(frame) {
    const m = this.module;
    for (let i = 0; i < FRAME; i++) m.HEAPF32[(this.pointer >>> 2) + i] = frame[i] * 32768;
    m._rnnoise_process_frame(this.state, this.pointer, this.pointer);
    for (let i = 0; i < FRAME; i++) frame[i] = m.HEAPF32[(this.pointer >>> 2) + i] / 32768;
  }
  reset() {
    if (!this.state || this.module._rnnoise_init(this.state, 0) !== 0)
      throw Error('RNNoise reset failed');
    this.zeroScratch();
  }
  dispose() {
    try {
      if (this.state) this.reset();
    } finally {
      this.zeroScratch();
      if (this.state) this.module._rnnoise_destroy(this.state);
      if (this.pointer) this.module._free(this.pointer);
      this.state = this.pointer = 0;
    }
  }
}
