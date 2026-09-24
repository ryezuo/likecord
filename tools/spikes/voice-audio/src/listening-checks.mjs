import { assert, runScenarios } from '../test/scenarios.mjs';
import { latencyCases } from '../test/latency-scenarios.mjs';
// Same registered handlers as the real buttons. No raw speaker connection,
// forced guard state or synthetic replacement of peers/receive graph.
export async function runListeningChecks({act,control,actionResult,snapshot,cleanup,state,bundle,publish}) {
  const result={id:'native-listening-diagnosis-01',bundle,physicalCapture:false,physicalPlayback:false,deterministic:await runScenarios(),steps:[],complete:false};
  for(const [name,run] of latencyCases){await run();result.deterministic.push({name,result:'PASS'});}
  assert(result.deterministic.every(x=>x.result==='PASS'));
  publish(result);
  const record=(name,evidence)=>{result.steps.push({name,result:'PASS',...structuredClone(evidence)});publish(result);};
  const observe=async()=>{await act('diagnose');assert(actionResult('diagnose').result==='fulfilled');return structuredClone(snapshot());};
  const controls=['mode','gate','gain','preroll','micConsent','listenConsent'];
  const saved=controls.map(id=>({id,value:control(id).value,checked:control(id).checked}));
  try{
    control('mode').value='native';control('gate').checked=false;control('gain').value='100';control('preroll').value='5';
    control('micConsent').checked=false;control('listenConsent').checked=false;
    await act('micStart');assert(actionResult('micStart').result==='rejected'&&state().liveRawTracks===0);
    record('Capture consent required',{state:state(),action:actionResult('micStart')});
    control('micConsent').checked=true;await act('micStart');
    let d=await observe();assert(d.sourceKind==='synthetic'&&!d.processedTrack.enabled&&d.postFinalGuardRms===0&&d.processedStream.rms===0);
    record('Start remains silent before explicit open',{diagnosis:d});
    await act('micOpen');await act('listen');assert(actionResult('listen').result==='rejected'&&state().output==='stopped');
    record('Playback consent required',{state:state(),action:actionResult('listen')});
    control('listenConsent').checked=true;await act('listen');d=await observe();
    assert(d.senderMatchesCurrentCapture&&d.gateEnabled===false&&d.gateOpen===false&&d.preFinalGuardRms>.01&&d.postFinalGuardRms>.01&&d.receiverBeforeMix.rms>.01&&d.afterOutputGain.rms>.001);
    assert(d.captureContext==='running'&&d.outputContext==='running'&&d.receive.adapters===1&&d.receive.consumerAudiblePaths===0&&d.receive.remotePlayoutConsumers.length===1&&d.outputMode==='silent-digital');
    assert(state().state==='ready-open');record('Documented start-open-listen sequence carries nonzero digital audio',{diagnosis:d});
    await act('listen');d=await observe();assert(d.receive.remotePlayoutConsumers.length===1&&d.receive.adapters===1);record('Repeated listen retains one direct route and one muted consumer',{diagnosis:d});
    await act('mute');d=await observe();assert(!d.processedTrack.enabled&&!d.guardAllowed&&d.postFinalGuardRms===0&&d.processedStream.rms===0&&d.afterOutputGain.lastWindowRms<1e-5);record('Manual mute silences digital output after transport drain',{diagnosis:d});
    await act('deafen');await act('deafen');d=await observe();assert(!d.processedTrack.enabled&&state().simulation.selfMuted&&d.afterOutputGain.rms<1e-5);record('Undeafen does not reopen microphone',{diagnosis:d});
    await act('micOpen');const previousAlias=d.captureAlias;await act('apply');d=await observe();
    assert(d.captureAlias!==previousAlias&&d.senderMatchesCurrentCapture&&d.liveCaptureSessions===1&&d.afterOutputGain.rms>.001&&d.receive.remotePlayoutConsumers.length===1);record('New capture generation replaces CALL while previous acquisition is released',{diagnosis:d,previousAlias});
    await act('stop');const closed=cleanup();assert(closed.captureContext==='closed'&&closed.outputContext==='closed'&&closed.rawTrack==='ended'&&closed.processedTrack==='ended'&&closed.liveRawTracks===0&&closed.remainingFlows===0&&closed.remainingPlayoutElements===0&&closed.pendingCaptureRequests===0&&closed.peersClosed.every(x=>x==='closed'));
    record('Stop releases tracks contexts peers and muted playout consumer',{cleanup:closed,state:state()});
    result.complete=true;return result;
  }catch(e){result.error={name:e.name,message:e.message};publish(result);throw e;}
  finally{await act('stop');for(const x of saved){control(x.id).value=x.value;control(x.id).checked=x.checked;}}
}
