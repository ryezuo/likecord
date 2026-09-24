// Lifecycle-only adapter. The pinned RNNoise process() and accepted DSP stay unchanged.
import { RNNoise, FRAME } from '../src/dsp.mjs';
export class LifetimeEngine extends RNNoise {
  constructor(module, counters) {
    super(module); this.counters = counters;
    counters.STATE_CREATE_TOTAL++; counters.SCRATCH_ALLOC_TOTAL++;
    this.zeroScratch();
  }
  zeroScratch() {
    if (this.pointer) this.module.HEAPF32.fill(0, this.pointer >>> 2, (this.pointer >>> 2) + FRAME);
  }
  scratchZero() { return !this.pointer || this.module.HEAPF32.subarray(this.pointer >>> 2, (this.pointer >>> 2) + FRAME).every(x => x === 0); }
  reset() { super.reset(); this.zeroScratch(); this.counters.STATE_RESET_TOTAL++; }
  dispose() {
    if (this.state) { this.reset(); this.counters.STATE_DESTROY_TOTAL++; }
    if (this.pointer) { this.zeroScratch(); this.counters.SCRATCH_FREE_TOTAL++; }
    super.dispose();
  }
}
