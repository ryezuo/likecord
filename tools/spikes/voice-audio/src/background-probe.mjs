import { CaptureSession } from './runtime.mjs';
import { abortableDelay, fault, safeFailure } from './action-diagnostics.mjs';
export function summarizeHidden(samples){
  const windows=[];
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i];
    if(a.visibility==='hidden'&&b.visibility==='hidden'&&a.eventIndex===b.eventIndex&&a.context==='running'&&b.context==='running')
      windows.push({startMs:a.atMs,endMs:b.atMs,callbacks:b.callbacks-a.callbacks,frames:b.frames-a.frames});
  }
  return {windows,result:windows.some(x=>x.callbacks>0&&x.frames>0)?'PASS_OBSERVED_SCOPE':'NOT_ESTABLISHED'};
}
export async function runBackground({signal,bundleId,publish,create=options=>CaptureSession.create(options),page=document,now=()=>performance.now(),wait=abortableDelay,durationMs=8000}){
  const started=now(),result={operation:'background',bundleId,origin:'local_browser_runtime',physicalCapture:false,physicalPlayback:false,intendedObservationMs:durationMs,startedAt:new Date().toISOString(),phase:'prepare-worklet-and-ready',result:'RUNNING',events:[],samples:[],contextEvents:[],droppedObservations:0};
  let probe,measuring=false,intervalStart=0,queue=Promise.resolve(),sampleError=null;
  const emit=()=>publish(structuredClone(result));
  const bounded=(list,item)=>{if(list.length<64)list.push(item);else result.droppedObservations++;};
  const sample=()=>{queue=queue.then(async()=>{
    if(!measuring||signal.aborted)return;
    const visibility=page.visibilityState,eventIndex=result.events.length-1;
    const metrics=await probe.getMetrics();
    bounded(result.samples,{atMs:now()-started,visibility:page.visibilityState===visibility&&eventIndex===result.events.length-1?visibility:'boundary',eventIndex,context:probe.context.state,callbacks:metrics.callbacks,frames:metrics.frames,guardAllowed:probe.guard.allowed,generation:metrics.generation,processorFailed:metrics.failed});
    if(metrics.failed)throw fault('processor-error');
  }).catch(e=>{sampleError=e;});return queue;};
  const visibility=()=>{bounded(result.events,{atMs:now()-started,state:page.visibilityState});if(measuring)void sample();};
  const contextState=()=>bounded(result.contextEvents,{atMs:now()-started,state:probe.context.state});
  page.addEventListener('visibilitychange',visibility);visibility();emit();
  try{
    signal.throwIfAborted();
    // A MediaStreamDestination only: no speaker connection, physical mic or UI consent changes.
    probe=await create({mode:'rnnoise',sourceFactory:c=>{const oscillator=c.createOscillator();oscillator.frequency.value=173;oscillator.start();return oscillator;}});
    signal.throwIfAborted();probe.context.addEventListener('statechange',contextState);contextState();
    result.phase='resume';emit();await probe.resume();signal.throwIfAborted();
    result.phase='opening-ack';emit();if(!await probe.reset({selfMuted:false}))throw fault('ACK_REJECTED');
    if(probe.context.state!=='running')throw fault('AUDIO_NOT_RUNNING');
    intervalStart=now();result.observationStartMs=intervalStart-started;result.phase='ready-for-tab-switch';measuring=true;await sample();emit();
    while(now()-intervalStart<durationMs){await wait(Math.min(500,durationMs-(now()-intervalStart)),signal);await sample();if(sampleError)throw sampleError;}
    result.observationEndMs=now()-started;result.observedMs=now()-intervalStart;
    result.hidden=summarizeHidden(result.samples);result.result='PASS';
  }catch(e){result.result=signal.aborted?'CANCELLED':'FAIL';result.error=safeFailure('background',result.phase,e);}
  finally{
    measuring=false;page.removeEventListener('visibilitychange',visibility);await queue;
    if(probe){probe.context.removeEventListener('statechange',contextState);await probe.dispose();}
    result.phase='complete';result.endedAt=new Date().toISOString();result.totalElapsedMs=now()-started;
    result.intervals=result.events.map((event,i)=>({state:event.state,startMs:event.atMs,endMs:result.events[i+1]?.atMs??result.totalElapsedMs}));
    result.cleanup={context:probe?.context.state??'not-created',track:probe?.track.readyState??'not-created',pendingRequests:probe?.pending.size??0,disposeAck:probe?.disposeAcknowledged??null,visibilityListenerRemoved:true,physicalCapture:false};
    result.hidden??={windows:[],result:'NOT_ESTABLISHED'};emit();
  }
  return result;
}
