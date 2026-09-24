import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const [nativeRun,rnnoiseRun,outputName]=process.argv.slice(2);
if(!/^(diagnostic|final)-v1-native(?:-[a-z0-9]+)?$/.test(nativeRun??'') || !/^(diagnostic|final)-v1-rnnoise(?:-[a-z0-9]+)?$/.test(rnnoiseRun??'') || !/^[a-z0-9-]+$/.test(outputName??'')) throw Error('Expected matching V1 Native/RNNoise run names and a safe new output name');
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b),n=a.length;return{samples:n,min:a[0]??null,median:n?(a[Math.floor((n-1)/2)]+a[Math.floor(n/2)])/2:null,p95:a[Math.ceil(n*.95)-1]??null,max:a.at(-1)??null,mean:n?a.reduce((s,x)=>s+x,0)/n:null};};
const memory=samples=>({ws:stats(samples.map(s=>s.attributedPrivateWorkingSetBytes/2**20)),commit:stats(samples.map(s=>s.attributedPrivateCommitBytes/2**20)),
  rendererWs:stats(samples.map(s=>s.processes.find(p=>p.role==='TARGET_RENDERER')?.privateWorkingSetBytes/2**20)),
  rendererCommit:stats(samples.map(s=>s.processes.find(p=>p.role==='TARGET_RENDERER')?.privateCommitBytes/2**20)),rssDiagnostic:stats(samples.map(s=>s.wholeTreeRssBytes/2**20))});
const modes={};
for(const run of [nativeRun,rnnoiseRun]){
  const raw=JSON.parse(await readFile(`results/local-lifetime-${run}-process.json`));
  const page=JSON.parse(await readFile(`results/local-lifetime-${run}-browser.json`));
  const cpuStart=raw.samples.find(s=>s.phase==='RNNOISE_CPU')?.atMs??Infinity;
  const critical=raw.samples.filter(s=>raw.baselineEndMs&&s.atMs>raw.baselineEndMs&&s.atMs<cpuStart);
  const select=phase=>critical.filter(s=>s.phase===`${page.mode}_${phase}`);
  const signalClean=page.cycles.every(c=>c.cleanup.noSignalReferences&&c.cleanup.contextState==='suspended'&&c.cleanup.pending===0&&c.cleanup.errors===0
    &&c.cleanup.cleanup.fifosZero&&c.cleanup.cleanup.scratchZero&&c.cleanup.cleanup.detectorReset&&c.cleanup.cleanup.peakReset&&c.cleanup.cleanup.temporalStateReset
    &&c.cleanup.cleanup.statePointer===0&&c.cleanup.cleanup.scratchPointer===0&&!c.cleanup.metrics.liveState&&!c.cleanup.metrics.liveScratch
    &&!c.cleanup.metrics.allowed&&c.cleanup.metrics.silentViolations===0
    &&c.cleanup.metrics.counters.STATE_CREATE_TOTAL===c.cleanup.metrics.counters.STATE_DESTROY_TOTAL
    &&c.cleanup.metrics.counters.SCRATCH_ALLOC_TOTAL===c.cleanup.metrics.counters.SCRATCH_FREE_TOTAL);
  const finalSignalValid=page.kind!=='final'||page.guardClosedBeforePreparation&&page.maximumOwners.activeGenerations<=1
    &&page.continuous?.audioSeconds>=600&&page.continuous.processedSeconds>=600&&page.continuous.observations.length===10
    &&page.continuous.observations.every(m=>!m.failed&&!m.overflow&&!m.underflow&&!m.silentViolations)
    &&page.cycles.every(c=>c.lastActiveMetrics&&!c.lastActiveMetrics.failed&&!c.lastActiveMetrics.overflow&&!c.lastActiveMetrics.underflow)
    &&page.accounts.length===5&&page.accounts.every(a=>a.cleanup.pending===0&&a.cleanup.errors===0&&a.cleanup.owners.rnnoiseStates===0
      &&a.cleanup.owners.tracks===0&&a.cleanup.owners.sources===0&&a.cleanup.owners.destinations===0&&a.cleanup.owners.activeGenerations===0);
  const valid=raw.completed&&!raw.failure&&!raw.invalidTopology&&page.result==='COMPLETE'&&page.targetRendererIdentityVerified&&page.pageRequests===1
    &&page.targetInventory.length===2&&page.targetInventory.every(t=>t.pageCount===1&&t.localProofPageCount===1)
    &&critical.length>0&&critical.every(s=>s.fullCoverage&&s.targetPresent&&s.audioServiceCount===1)
    &&page.cycles.length===page.cycleCount&&Object.values(page.finalOwners).every(n=>n===0)&&signalClean&&finalSignalValid;
  modes[page.mode]={run,valid,signalClean,finalSignalValid,variant:page.variant,kind:page.kind,cpu:page.cpu??null,cpuExcludedFromMemory:cpuStart!==Infinity,frameClockReview:page.frameClockReview??null,
    pre:memory(select('PRE_CYCLES')),post:memory(select('POST_CYCLES')),baseline:memory(raw.samples.filter(s=>s.phase==='COMMON_STABLE_BASELINE')),
    cycles:page.cycles.map(c=>{const active=select(`CYCLE_${c.cycle}_ACTIVE`),stopped=select(`CYCLE_${c.cycle}_STOPPED`);return{cycle:c.cycle,
      all:memory([...active,...stopped]),postStop:memory(stopped.filter(s=>s.phaseElapsedMs>=c.stopTransactionUpperBoundMs)),
      transactionBoundsMs:{active:c.activeTransactionUpperBoundMs,stop:c.stopTransactionUpperBoundMs},counters:c.cleanup.metrics.counters,cleanup:c.cleanup.cleanup};}),
    continuous:page.continuous?{...page.continuous,memory:memory(critical.filter(s=>s.phase.startsWith(`${page.mode}_LONG_`))),
      minuteBlocks:Array.from({length:10},(_,i)=>memory(select(`LONG_${i}`)))}:null,
    accounts:page.accounts,accountMemory:memory(critical.filter(s=>s.phase.startsWith(`${page.mode}_ACCOUNT_`))),
    accountBlocks:page.accounts.map(a=>({account:a.account,memory:memory(select(`ACCOUNT_${a.account}`))})),
    all:memory(critical),maximumOwners:page.maximumOwners,mainCounters:page.mainCounters,primaryDisposal:page.primaryDisposal,finalOwners:page.finalOwners,
    phaseMemory:Object.fromEntries([...new Set(critical.map(s=>s.phase))].filter(p=>p.startsWith(`${page.mode}_`)).map(p=>[p.slice(page.mode.length+1),memory(critical.filter(s=>s.phase===p))])),
    host:{cpu:stats(critical.map(s=>s.host?.HOST_CPU_UTILIZATION_PERCENT)),availableMiB:stats(critical.map(s=>s.host?.HOST_AVAILABLE_MEMORY_MIB)),commitMiB:stats(critical.map(s=>s.host?.HOST_COMMITTED_MEMORY_MIB)),pressure:'not_available'},
    topology:raw.baselineTopology,processCount:stats(critical.map(s=>s.processCount)),cadenceMs:stats(critical.slice(1).map((s,i)=>s.atMs-critical[i].atMs)),
    cleanedUp:raw.profileRemoved&&raw.browserStopped&&raw.collectorStopped};
}
const n=modes.NATIVE,r=modes.RNNOISE;
if(!n||!r||n.cycles.length!==r.cycles.length||n.variant!==r.variant||n.kind!==r.kind)throw Error('Mismatched control');
for (const mode of [n,r]) if (!mode.valid || !mode.cleanedUp || mode.cycles.length===0 || !mode.pre.ws.samples || !mode.post.ws.samples || mode.cycles.some(c=>!c.all.ws.samples||!c.postStop.ws.samples)) throw Error('Invalid or incomplete measurement; no memory verdict');
const offset=r.pre.ws.median-n.pre.ws.median,commitOffset=r.pre.commit.median-n.pre.commit.median;
const paired=r.cycles.map((c,i)=>({cycle:c.cycle,peakDelta:c.all.ws.max-n.cycles[i].all.ws.max,
  baselineAdjustedPeak:c.all.ws.max-n.cycles[i].all.ws.max-offset,
  postStopMedianDelta:c.postStop.ws.median-n.cycles[i].postStop.ws.median,
  postStopMaxDelta:c.postStop.ws.max-n.cycles[i].postStop.ws.max,
  baselineAdjustedPostStopMedian:c.postStop.ws.median-n.cycles[i].postStop.ws.median-offset,
  commitPostStopMedianDelta:c.postStop.commit.median-n.cycles[i].postStop.commit.median,
  baselineAdjustedCommitPostStopMedian:c.postStop.commit.median-n.cycles[i].postStop.commit.median-commitOffset,
  rendererPostStopMedianDelta:c.postStop.rendererWs.median-n.cycles[i].postStop.rendererWs.median,
  rendererCommitPostStopMedianDelta:c.postStop.rendererCommit.median-n.cycles[i].postStop.rendererCommit.median}));
const size=r.kind==='final'?20:5;
const blocks=Array.from({length:paired.length/size},(_,i)=>{const rows=paired.slice(i*size,(i+1)*size);return{from:i*size+1,to:(i+1)*size,
  peakDelta:stats(rows.map(c=>c.peakDelta)),postStopDelta:stats(rows.map(c=>c.postStopMedianDelta)),commitDelta:stats(rows.map(c=>c.commitPostStopMedianDelta)),
  nativePeak:stats(n.cycles.slice(i*size,(i+1)*size).map(c=>c.all.ws.max)),rnnoisePeak:stats(r.cycles.slice(i*size,(i+1)*size).map(c=>c.all.ws.max)),
  nativePostStop:stats(n.cycles.slice(i*size,(i+1)*size).map(c=>c.postStop.ws.median)),rnnoisePostStop:stats(r.cycles.slice(i*size,(i+1)*size).map(c=>c.postStop.ws.median)),
  nativeCommit:stats(n.cycles.slice(i*size,(i+1)*size).map(c=>c.postStop.commit.median)),rnnoiseCommit:stats(r.cycles.slice(i*size,(i+1)*size).map(c=>c.postStop.commit.median))};});
const result={id:'va3b-lifetime',variant:r.variant,kind:r.kind,executionValid:n.valid&&r.valid,cleanedUp:n.cleanedUp&&r.cleanedUp,
  primary:'Matched attributable private working set; conservative target/audio/browser/network/storage sum, no double counting of WASM/heap bytes',
  peakPairing:'Same cycle phase peak; post-stop distributions after measured transaction bounds; fresh-profile baseline offsets shown separately',
  offsetMiB:offset,commitOffsetMiB:commitOffset,modes,paired,blocks,
  maxCycleDelta:Math.max(...paired.map(c=>c.peakDelta)),maxAdjustedCycleDelta:Math.max(...paired.map(c=>c.baselineAdjustedPeak)),
  maxStableDelta:Math.max(...paired.map(c=>c.postStopMaxDelta)),requiresOwnerEvidenceReview:true};
result.pairedPhases=Object.entries(r.phaseMemory).filter(([phase])=>n.phaseMemory[phase]).map(([phase,value])=>({phase,
  peakDeltaMiB:value.ws.max-n.phaseMemory[phase].ws.max,adjustedPeakDeltaMiB:value.ws.max-n.phaseMemory[phase].ws.max-offset,
  medianDeltaMiB:value.ws.median-n.phaseMemory[phase].ws.median,commitMedianDeltaMiB:value.commit.median-n.phaseMemory[phase].commit.median}));
result.maximumMatchedPhasePeakMiB=Math.max(...result.pairedPhases.map(p=>p.peakDeltaMiB));
result.maximumAdjustedMatchedPhasePeakMiB=Math.max(...result.pairedPhases.map(p=>p.adjustedPeakDeltaMiB));
result.startupPeakDeltaMiB=paired[0].peakDelta;
await writeFile(`results/local-lifetime-${outputName}.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({executionValid:result.executionValid,cleanedUp:result.cleanedUp,offsetMiB:offset,maxCycleDelta:result.maxCycleDelta,maxAdjustedCycleDelta:result.maxAdjustedCycleDelta,
  cycles:paired.filter(c=>c.cycle===1||c.cycle%5===0),blocks:blocks.map(b=>({from:b.from,to:b.to,peak:b.peakDelta,postStop:b.postStopDelta,commit:b.commitDelta})),counters:r.primaryDisposal.workletCounters},null,2));
