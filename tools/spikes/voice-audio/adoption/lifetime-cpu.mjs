import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import {FixedPrerollCandidate} from './fixed-preroll-candidate.mjs';
import {LifetimeEngine} from './lifetime-engine.mjs';
const distribution=values=>{const a=values.toSorted((a,b)=>a-b);return{samples:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
export function measureLifetimeCPU(variant,quantum){
  if(!['V1','V2'].includes(variant)||!Number.isInteger(quantum)||quantum<=0)throw Error('Unverified CPU configuration');
  const source=Float32Array.from({length:48000*15},(_,i)=>.1*Math.sin(i*.043)+.03*Math.sin(i*.173));
  const blocks=[];for(let i=0;i+quantum<=source.length;i+=quantum)blocks.push(source.subarray(i,i+quantum));
  const output=new Float32Array(quantum),runs=[],clock=[];
  for(let i=0;i<2000;i++){const start=performance.now();clock.push(performance.now()-start);}
  let module;const counters={STATE_CREATE_TOTAL:0,STATE_RESET_TOTAL:0,STATE_DESTROY_TOTAL:0,SCRATCH_ALLOC_TOTAL:0,SCRATCH_FREE_TOTAL:0};
  for(const condition of ['first-activation','warm-activation']){
    if(!module||variant==='V1')module=createModule();
    const engine=new LifetimeEngine(module,counters),dsp=new FixedPrerollCandidate({engine,gate:true});
    try{
      for(let i=0;i<20;i++){dsp.frame.fill(0);engine.process(dsp.frame);}engine.reset();dsp.clear();dsp.activate();
      const all=[],heavy=[],fifo=[];
      for(const block of blocks){const before=dsp.engineCalls,start=performance.now();dsp.process(block,output);const elapsed=performance.now()-start;
        all.push(elapsed);(dsp.engineCalls>before?heavy:fifo).push(elapsed);}
      if(dsp.failed||dsp.overflows||dsp.underflows)throw Error('CPU signal failure');
      runs.push({condition,all:distribution(all),rnnoiseHeavy:distribution(heavy),fifo:distribution(fifo)});
    }finally{dsp.dispose();}
  }
  const quantumMs=quantum/48,warmP95Ms=Math.max(runs[1].all.p95,runs[1].rnnoiseHeavy.p95);
  return{origin:'window.performance.now selected lifetime DSP surrogate; not direct AudioWorklet callback timing',variant,quantumFrames:quantum,quantumMs,
    directCallbackCPU:'not_available',secondsPerActivation:15,prewarmFramesPerActivation:20,runs,clockPairOverhead:distribution(clock),
    overheadSubtracted:false,outliersRemoved:false,warmP95Ms,warmP95QuantumPercent:warmP95Ms/quantumMs*100,
    warmMaxMs:runs[1].all.max,pass:warmP95Ms<=quantumMs*.25&&runs[1].all.max<quantumMs,counters,
    memoryScope:'Executed after all memory/account observations; its Window WASM allocation is excluded from memory acceptance.'};
}
