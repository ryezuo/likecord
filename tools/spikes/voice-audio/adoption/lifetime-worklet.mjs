import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import { FixedPrerollCandidate } from './fixed-preroll-candidate.mjs';
import { LifetimeEngine } from './lifetime-engine.mjs';
import { lifetimeProcessor } from './lifetime-processor.mjs';
registerProcessor('va3b-lifetime',lifetimeProcessor(AudioWorkletProcessor,createModule,
  (module,counters)=>new FixedPrerollCandidate({engine:new LifetimeEngine(module,counters),gate:true})));
