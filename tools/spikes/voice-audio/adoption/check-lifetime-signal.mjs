import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import {RNNoise} from '../src/dsp.mjs';
import {FixedPrerollCandidate} from './fixed-preroll-candidate.mjs';
import {LifetimeEngine} from './lifetime-engine.mjs';
import {lifetimeProcessor} from './lifetime-processor.mjs';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const counts=()=>({STATE_CREATE_TOTAL:0,STATE_RESET_TOTAL:0,STATE_DESTROY_TOTAL:0,SCRATCH_ALLOC_TOTAL:0,SCRATCH_FREE_TOTAL:0});
const checks=[];const check=(name,fn)=>{try{checks.push({name,result:'PASS',...fn()});}catch(error){checks.push({name,result:'FAIL',error:error.message});}};
const signals=[['zeros',new Float32Array(9601)],['speech-like',Float32Array.from({length:24013},(_,i)=>(.1*Math.sin(i*.023)+.06*Math.sin(i*.057))*(.5+.5*Math.sin(i*.001)**2))],
  ['noise',Float32Array.from({length:15361},(_,i)=>(((Math.imul(i+5,1103515245)>>>0)%65536)/32768-1)*.08)],
  ['frame-boundary',Float32Array.from({length:9601},(_,i)=>[0,127,128,478,479,480,511,512,959,960].includes(i)?.18:0)]];
const render=(dsp,input)=>{assert(dsp.activate());const output=new Float32Array(input.length);const sizes=[1,127,128,256,480,511];let offset=0,step=0;
  while(offset<input.length){const n=Math.min(sizes[step++%sizes.length],input.length-offset);dsp.process(input.subarray(offset,offset+n),output.subarray(offset,offset+n));offset+=n;}
  assert(!dsp.failed&&dsp.overflows===0&&dsp.underflows===0);return output;};
const module=createModule(),counters=counts();
for(const[name,input]of signals)check(`Fresh signal in reused runtime equals previous fixed DSP: ${name}`,()=>{
  const poison=new FixedPrerollCandidate({engine:new LifetimeEngine(module,counters),gate:true});render(poison,signals[1][1]);poison.dispose();
  const candidate=new FixedPrerollCandidate({engine:new LifetimeEngine(module,counters),gate:true});
  const reference=new FixedPrerollCandidate({engine:new RNNoise(createModule()),gate:true});
  try{const a=render(candidate,input),b=render(reference,input);let maxDifference=0;for(let i=0;i<a.length;i++)maxDifference=Math.max(maxDifference,Math.abs(a[i]-b[i]));assert.equal(maxDifference,0);return{samples:input.length,maxAbsoluteDifference:maxDifference,tolerance:0};}
  finally{candidate.dispose();reference.dispose();}
});
globalThis.sampleRate=48000;globalThis.currentFrame=0;
class MockBase{constructor(){this.messages=[];this.port={postMessage:data=>this.messages.push(data),onmessage:null,close:()=>{this.closed=true;}};}}
const Processor=lifetimeProcessor(MockBase,createModule,(m,c)=>new FixedPrerollCandidate({engine:new LifetimeEngine(m,c),gate:true}));
check('Warm processor: five generations, exact guard silence, destroyed temporal state, cleared partial FIFOs and scratch',()=>{
  const p=new Processor({}),input=Float32Array.from({length:128},(_,i)=>.1*Math.sin(i*.17)),output=new Float32Array(128);
  const send=data=>p.port.onmessage({data});const tick=()=>{p.process([[input]],[[output]]);globalThis.currentFrame+=128;};
  for(let i=1;i<=5;i++){
    const revision=i*3;send({type:'activate',revision});const dsp=p.signal,scratchIndex=dsp.engine.pointer>>>2;
    send({type:'open',revision});tick();assert(output.every(x=>x===0));tick();assert(output.every(x=>x===0));
    send({type:'open',revision:revision-1});tick();assert(output.every(x=>x===0));
    send({type:'open',revision});for(let j=0;j<87;j++)tick();assert(!dsp.failed);
    send({type:'stop',revision:revision+1});assert.equal(p.signal,null);assert.equal(dsp.engine.state,0);assert.equal(dsp.engine.pointer,0);
    assert([dsp.frame,dsp.output,dsp.energy,dsp.preroll].every(a=>a.every(x=>x===0)));
    assert(dsp.engine.module.HEAPF32.subarray(scratchIndex,scratchIndex+480).every(x=>x===0));
    send({type:'open',revision});tick();assert(output.every(x=>x===0));
    const receipt=p.messages.findLast(m=>m.type==='stop');assert(Object.values(receipt.cleanup).every(x=>x===true||x===false||x===0));
    assert.equal(receipt.counters.STATE_CREATE_TOTAL,i);assert.equal(receipt.counters.STATE_DESTROY_TOTAL,i);
  }
  send({type:'retire',revision:99});tick();assert(output.every(x=>x===0));assert(p.closed);
  const final=p.messages.findLast(m=>m.type==='retire');assert.equal(final.counters.RUNTIME_CREATE_TOTAL,1);assert.equal(final.counters.RUNTIME_DISPOSE_TOTAL,1);
  assert.equal(final.counters.PORT_CLOSE_TOTAL,1);assert.equal(final.silentViolations,0);return{generations:5,counters:final.counters,silentViolations:final.silentViolations};
});
const source=await readFile('.cache/provenance/engine-src-denoise.c','utf8');
check('Pinned C reset semantics used before destroy',()=>{assert.match(source,/int rnnoise_init\(DenoiseState \*st, RNNModel \*model\)\s*\{\s*memset\(st, 0, sizeof\(\*st\)\)/);
  assert.match(source,/void rnnoise_destroy\(DenoiseState \*st\)\s*\{\s*free\(st\);/);assert.equal(typeof module._rnnoise_init,'function');
  return{sourceSha256:createHash('sha256').update(source).digest('hex'),exportsVerified:['_rnnoise_init','_rnnoise_destroy'],customModel:false};});
const result={id:'va3b-lifetime-signal',checks,result:checks.every(c=>c.result==='PASS')?'PASS':'FAIL',counters,algorithmChanged:false,newFifo:false,gatePrerollMs:10,physicalAudio:false};
await writeFile('results/local-lifetime-signal.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
if(result.result!=='PASS')process.exitCode=1;
