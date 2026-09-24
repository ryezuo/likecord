import test from 'node:test';
import assert from 'node:assert/strict';
import { OutputSelection } from '../src/output-selection.mjs';
import { runBackground,summarizeHidden } from '../src/background-probe.mjs';
import { safeFailure } from '../src/action-diagnostics.mjs';
import { ReceiveGraph } from '../src/runtime.mjs';

function outputFixture(overrides={}){
  let micCalls=0,applications=[];
  const context={setSinkId(){}};
  const media={getUserMedia(){micCalls++;throw Error('Never acquire a microphone');},enumerateDevices:async()=>[],...overrides};
  const selector=new OutputSelection({media,permissions:{query:async()=>{throw TypeError('unsupported');}},page:{},secure:true,contextPrototype:context});
  return {selector,context,applications,micCalls:()=>micCalls,operation:{context,consent:true,current:()=>true,apply:async id=>applications.push(id),notify(){}}};
}
test('Output inspect reports unsupported permission query as unknown without microphone acquisition',async()=>{
  const f=outputFixture();const cap=await f.selector.inspect(f.context);assert.equal(cap.speakerPermission,'not_queryable');assert.equal(cap.picker,false);assert.equal(cap.contextSetSinkId,true);assert.equal(f.micCalls(),0);
});
test('Native picker is called synchronously before permission/enumeration awaits',async()=>{
  let called=false;const f=outputFixture({selectAudioOutput:()=>{called=true;return Promise.resolve({deviceId:'fixture-selected'});}});
  const promise=f.selector.choose(f.operation);assert(called);assert.equal((await promise).result,'APPLIED');assert.deepEqual(f.applications,['fixture-selected']);assert.equal(f.micCalls(),0);
});
test('Missing playback consent never opens picker or applies an output',async()=>{
  let called=false;const f=outputFixture({selectAudioOutput:()=>{called=true;}});const r=await f.selector.choose({...f.operation,consent:false});assert.equal(r.error.code,'PLAYBACK_REQUIRED');assert(!called);assert.equal(f.applications.length,0);
});
test('Absent picker offers exposed alternatives without selecting any automatically or exporting identities',async()=>{
  const f=outputFixture({enumerateDevices:async()=>[{kind:'audiooutput',deviceId:'default',label:'Default fixture'},{kind:'audiooutput',deviceId:'fixture-private-id',label:'Private fixture label'}]});
  const r=await f.selector.choose(f.operation);assert.equal(r.result,'CHOICES_AVAILABLE');assert.equal(f.applications.length,0);assert(!JSON.stringify(r).includes('fixture-private'));assert(!JSON.stringify(r).includes('Private fixture'));assert.equal(f.micCalls(),0);
  assert.equal((await f.selector.applyChoice('OUTPUT_1',f.operation)).result,'APPLIED');assert.deepEqual(f.applications,['fixture-private-id']);
});
test('Default-only enumeration is a limitation, not a silent no-op or microphone prompt',async()=>{
  const f=outputFixture({enumerateDevices:async()=>[{kind:'audiooutput',deviceId:'default'}]});const r=await f.selector.choose(f.operation);assert.equal(r.error.code,'NO_EXPOSED_OUTPUT');assert.equal(f.applications.length,0);assert.equal(f.micCalls(),0);
});
test('Missing enumeration and missing context sink API are distinct limitations',async()=>{
  const f=outputFixture({enumerateDevices:undefined});assert.equal((await f.selector.choose(f.operation)).error.code,'ENUMERATION_UNAVAILABLE');assert.equal((await f.selector.choose({...f.operation,context:{}})).error.code,'CONTEXT_SINK_UNAVAILABLE');
});
test('Explicit local cancellation invalidates previous choice without changing output',async()=>{
  const f=outputFixture({enumerateDevices:async()=>[{kind:'audiooutput',deviceId:'fixture-private'}]});await f.selector.choose(f.operation);f.selector.clear();assert.equal((await f.selector.applyChoice('OUTPUT_1',f.operation)).error.code,'CHOICE_REQUIRED');assert.equal(f.applications.length,0);
});
for(const name of ['NotAllowedError','AbortError','NotFoundError','InvalidStateError'])test(`Picker ${name} remains distinct and does not expose private exception text`,async()=>{
  const f=outputFixture({selectAudioOutput:async()=>{throw new DOMException('private-device-label',name);}});const r=await f.selector.choose(f.operation);assert.equal(r.error.name,name);assert.equal(r.error.phase,'picker');assert.equal(f.applications.length,0);assert(!JSON.stringify(r).includes('private-device-label'));
});
test('Stop while picker is pending prevents the late selection from reaching the adapter',async()=>{
  let finish,current=true;const f=outputFixture({selectAudioOutput:()=>new Promise(r=>finish=r)});const promise=f.selector.choose({...f.operation,current:()=>current});current=false;finish({deviceId:'fixture-late'});assert.equal((await promise).result,'CANCELLED');assert.equal(f.applications.length,0);
});
test('setSinkId rejection is attributed to apply, never reported as successful selection',async()=>{
  const f=outputFixture({selectAudioOutput:async()=>({deviceId:'fixture-output'})});const r=await f.selector.choose({...f.operation,apply:async()=>{throw new DOMException('private-output','AbortError');}});assert.equal(r.error.phase,'apply');assert.equal(r.error.name,'AbortError');assert.notEqual(r.result,'APPLIED');
});
test('Policy denial is distinct from an unsupported policy query',async()=>{
  const f=outputFixture();f.selector.page={featurePolicy:{features:()=>['speaker-selection'],allowsFeature:()=>false}};assert.equal((await f.selector.choose(f.operation)).error.code,'POLICY_BLOCKED');
});
test('Hidden proof needs two observations inside the same real visibility interval',()=>{
  const base={context:'running',callbacks:10,frames:2,eventIndex:1,visibility:'hidden',atMs:10};
  assert.equal(summarizeHidden([base,{...base,callbacks:20,frames:4,atMs:20}]).result,'PASS_OBSERVED_SCOPE');
  for(const patch of [{visibility:'visible'},{eventIndex:2},{context:'suspended'},{frames:2}])assert.equal(summarizeHidden([base,{...base,callbacks:20,frames:4,atMs:20,...patch}]).result,'NOT_ESTABLISHED');
});
function backgroundFixture(){
  let time=0,frames=0,disposed=0;const listeners=new Map(),abort=new AbortController();
  const probe={context:{state:'suspended',addEventListener(){},removeEventListener(){}},track:{readyState:'live'},guard:{allowed:false},pending:new Map(),resume:async()=>{probe.context.state='running';},reset:async()=>{probe.guard.allowed=true;return true;},getMetrics:async()=>({callbacks:++frames*4,frames,generation:2,failed:false}),dispose:async()=>{disposed++;probe.context.state='closed';probe.track.readyState='ended';probe.disposeAcknowledged=true;}};
  return {probe,abort,disposed:()=>disposed,listeners,options:{signal:abort.signal,bundleId:'fixture-bundle',publish(){},create:async()=>probe,page:{visibilityState:'visible',addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},now:()=>time,wait:async ms=>{time+=ms;},durationMs:1000}};
}
test('Background preparation completes silently with actual elapsed duration and no visible-only hidden PASS',async()=>{
  const f=backgroundFixture();const r=await runBackground(f.options);assert.equal(r.result,'PASS');assert.equal(r.observedMs,1000);assert.equal(r.hidden.result,'NOT_ESTABLISHED');assert.equal(r.cleanup.context,'closed');assert.equal(f.disposed(),1);assert.equal(f.listeners.size,0);
});
test('Background cancellation has one cleanup owner and does not reopen the session',async()=>{
  const f=backgroundFixture();const r=await runBackground({...f.options,wait:async()=>{f.abort.abort();f.abort.signal.throwIfAborted();}});assert.equal(r.result,'CANCELLED');assert.equal(r.cleanup.track,'ended');assert.equal(f.disposed(),1);assert.equal(f.listeners.size,0);
});
test('Background readiness failure identifies its phase using only safe exception text',async()=>{
  const f=backgroundFixture();const r=await runBackground({...f.options,create:async()=>{throw Error('ready-timeout');}});assert.equal(r.error.phase,'prepare-worklet-and-ready');assert.equal(r.error.code,'ready-timeout');assert.equal(r.result,'FAIL');assert.equal(f.listeners.size,0);
});
test('Rejected background opening ACK fails closed and still tears down',async()=>{
  const f=backgroundFixture();f.probe.reset=async()=>false;const r=await runBackground(f.options);assert.equal(r.error.code,'ACK_REJECTED');assert.equal(r.cleanup.context,'closed');assert.equal(f.disposed(),1);
});
test('Unknown errors export only an allowlisted name and safe generic code',()=>{
  assert.deepEqual(safeFailure('sink','apply',{name:'private-label',message:'secret-device-id'}),{operation:'sink',phase:'apply',name:'Error',code:'RUNTIME_ERROR'});
});
test('Actual direct adapter fails silent on sink rejection without adding a second route',async()=>{
  let connections=0;const graph=Object.assign(Object.create(ReceiveGraph.prototype),{closed:false,outputGeneration:0,adapter:'direct',audible:true,output:{gain:{value:1},connect(){connections++;}},context:{sinkId:'fixture-before',setSinkId:async()=>{throw new DOMException('device unavailable','NotFoundError');}}});
  await assert.rejects(graph.direct('fixture-new'),{name:'NotFoundError'});assert.equal(graph.output.gain.value,0);assert.equal(graph.context.sinkId,'fixture-before');assert.equal(graph.adapter,'direct');assert.equal(connections,0);
});
