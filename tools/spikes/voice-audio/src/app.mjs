import { runBrowserChecks } from './browser-checks.mjs';
import { CaptureSession, ReceiveGraph, localPeers } from './runtime.mjs';
import { CallTransaction, nativeConstraints, sanitizeNative, verifyIsolation } from './control.mjs';
import { syntheticAcquisition, observeListening } from './listening-diagnostics.mjs';
import { runListeningChecks } from './listening-checks.mjs';
import { runBackground } from './background-probe.mjs';
import { OutputSelection } from './output-selection.mjs';
import { safeFailure, fault } from './action-diagnostics.mjs';
const $ = id => document.getElementById(id);
let report = {}, session = null, receiver = null, peers = null, sharing = null, sharePeers = null, shareContext = null;
let request = 0, running = false, nativeEvidence = [], selectedSink = '', timer = null, receiveContext = null, automaticAbort = null;
let commitBusy=false, listenBusy=false, activeTransaction=null, bundle=null;
let backgroundTask=null,outputBusy=false;
const outputSelection=new OutputSelection({media:navigator.mediaDevices,permissions:navigator.permissions,page:document,secure:isSecureContext,contextPrototype:AudioContext.prototype});
let outputEvidence={result:'NOT_EXECUTED'};
const liveRawTracks=new Set(), actions={}, handlers={}; let acquisitionTotal=0, diagnosis=null, diagnosing=false, sequenceRunning=false, lastCleanup=null;
const supported = navigator.mediaDevices?.getSupportedConstraints?.() ?? {};
function status(text) { $('progress').textContent = text; }
function config() { const timing=$('preroll').value; return { gain:Number($('gain').value), gate:$('gate').checked, threshold:Number($('threshold').value), prerollMs:timing==='frame'?0:Number(timing), gateTiming:timing==='frame'?'frame-lookahead':'delayed' }; }
function intent() {
  const value = {};
  for (const key of ['autoGainControl','echoCancellation','noiseSuppression']) { const x=$(key).value; value[key]=x==='auto'?'auto':x==='true'; }
  const format=$('format').value;
  if(format!=='auto') { const [key,number]=format.split(':'); value[key]=Number(number); }
  return value;
}
function render() {
  const metrics=session?.metrics;
  $('state').textContent=JSON.stringify({ bundleId:bundle?.bundleId??null, mode:session?.mode??null, effectiveConfig:session?.config??null, state:session?.state??'stopped', microphone:session?.track.enabled?'open':'closed', captureContext:session?.context.state??'absent',outputContext:receiveContext?.state??'absent',simulation:session?.guard.state??null, processingRate:session?.context.sampleRate??null, meterDbFS:metrics?.level??null, gateOpen:metrics?.open??false, nativeCaptureAcquisitionsTotal:nativeEvidence.length,liveRawTracks:liveRawTracks.size, output:receiver?.snapshot()??'stopped', outputAlias:receiveContext?.sinkId?.type==='none'?'silent-digital':selectedSink?'OUTPUT_A':'system-default', share:sharing?'local test':'stopped', rawIdsExported:false },null,2);
  $('results').textContent=JSON.stringify(report,null,2);
  $('outputEvidence').textContent=JSON.stringify(outputEvidence,null,2);
  $('diagnosis').textContent=JSON.stringify({snapshot:diagnosis,acquisitionTotal,liveRawTracks:[...liveRawTracks].filter(t=>t.readyState==='live').length,lastCleanup,actions},null,2);
}
function safeError(e) { const known=['MODE_INCOMPATIBLE','ready-timeout','module-timeout','processorerror','processor-error']; return known.find(x=>String(e.message).includes(x))??e.name??'Error'; }
function action(id, fn) { handlers[id]=async()=>{try{const value=await fn();actions[id]={result:'fulfilled',returned:value===true?true:value===false?false:null};render();}catch(e){actions[id]={result:'rejected',reason:safeError(e)};status(`${id}: ${safeError(e)}. Teste permanece fechado/silenciado quando indisponível.`);render();}};$(id).addEventListener('click',handlers[id]); }
async function stop() {
  const oldCapture=session,oldReceive=receiveContext,oldPeers=peers,oldReceiver=receiver;
  request++;clearInterval(timer);timer=null;
  automaticAbort?.abort(); session?.guard.dispose();
  outputSelection.clear();$('outputChoices').hidden=true;
  activeTransaction?.dispose();
  receiver?.dispose(); receiver=null; peers?.close();peers=null;sharePeers?.close();sharePeers=null;
  if(sharing)sharing.getTracks().forEach(t=>t.stop());sharing=null;
  $('screen').pause();$('screen').srcObject=null;$('screen').style.display='none';
  await receiveContext?.close();receiveContext=null;
  await shareContext?.close();shareContext=null;
  const previous=session;session=null;await previous?.dispose();
  await backgroundTask;
  lastCleanup={captureContext:oldCapture?.context.state??'absent',outputContext:oldReceive?.state??'absent',rawTrack:oldCapture?.rawTrack?.readyState??'absent',processedTrack:oldCapture?.track.readyState??'absent',peersClosed:oldPeers?[oldPeers.a.connectionState,oldPeers.b.connectionState]:[],remainingFlows:oldReceiver?.sources.size??0,liveRawTracks:liveRawTracks.size,pendingCaptureRequests:oldCapture?.pending.size??0,disposeAck:oldCapture?.disposeAcknowledged??null,remainingPlayoutElements:document.querySelectorAll('audio[data-spike-playout]').length};
  status('Parado: tracks, contextos, peers, listeners e ports liberados.'); render();
}
function recordNative(track, requested, mode, desired) {
  const evidence={origin:'manual_owner_runtime',alias:'INPUT_A',mode,desiredIntent:desired,supportedConstraintNames:sanitizeNative(supported),capabilities:sanitizeNative(track.getCapabilities?.()??{}),requestedConstraints:sanitizeNative(requested),trackConstraints:sanitizeNative(track.getConstraints()),reportedSettings:sanitizeNative(track.getSettings()),auditoryObservation:'not_reported'};
  evidence.mutability=Object.fromEntries(Object.keys(evidence.supportedConstraintNames).map(key=>{const cap=evidence.capabilities[key];return[key,cap===undefined?'capability_absent_or_unknown':Array.isArray(cap)?(cap.length>1?'advertised_mutable_not_audibly_proven':'fixed_or_singleton'):cap.min===cap.max?'fixed_or_singleton':'advertised_range_not_all_combinations_proven'];}));
  nativeEvidence.push(evidence);$('native').textContent=JSON.stringify(evidence,null,2);
  const current=$('format').value;const select=$('format');select.replaceChildren(new Option('Auto','auto'));
  for(const key of ['channelCount','sampleRate']) { const capability=evidence.capabilities[key]; if(capability&&capability.min!==capability.max)for(const v of new Set([capability.min,capability.max]))select.add(new Option(`${key}: ${v} (limite anunciado; combinação não garantida)`,`${key}:${v}`)); }
  if([...select.options].some(o=>o.value===current))select.value=current;
}
async function acquire(mode, token) {
  const desired=intent();const requested=nativeConstraints(desired,supported,mode);
  const synthetic=sequenceRunning||$('syntheticInput').checked;
  if(synthetic&&mode!=='native')throw Error('MODE_INCOMPATIBLE: acquisition diagnosis is Native only');
  const resource=synthetic?await syntheticAcquisition():{stream:await navigator.mediaDevices.getUserMedia({audio:requested})};
  const raw=resource.stream,track=raw.getAudioTracks()[0],alias=`CAPTURE_${++acquisitionTotal}`;liveRawTracks.add(track);
  let released=false;const disposeRaw=async()=>{if(released)return;released=true;raw.getTracks().forEach(t=>t.stop());liveRawTracks.delete(track);await resource.dispose?.();};
  if(token!==request){await disposeRaw();throw Error('obsolete');} track.enabled=false;
  try {
    if(!synthetic)recordNative(track,requested,mode,desired);
    if(mode==='rnnoise'&&!verifyIsolation(track.getSettings(),supported))throw Error('MODE_INCOMPATIBLE');
    const candidate=await CaptureSession.create({rawTrack:track,mode,config:config(),disposeRaw});candidate.alias=alias;candidate.sourceKind=synthetic?'synthetic':'microphone';
    if(token!==request){await candidate.dispose();throw Error('obsolete');} return candidate;
  }catch(e){await disposeRaw();throw e;}
}
function meter() {
  clearInterval(timer);let inFlight=false;
  timer=setInterval(async()=>{if(inFlight||!session)return;inFlight=true;try{await session.getMetrics();render();}catch{}finally{inFlight=false;}},500);
}
action('synthetic',async()=>{
  if(running||session)throw Error('Stop current test first');running=true;$('synthetic').disabled=true;
  status('Executando samples, bundle e peers locais…');
  automaticAbort=new AbortController();
  try {report=await runBrowserChecks((value,name)=>{report=value;status(name);render();},automaticAbort.signal);status('Provas automáticas concluídas. Escuta/hardware não executados.');}
  catch(e){report.complete=false;report.error={name:e.name,message:e.message,site:e.stack?.split('\n').slice(1,3)};status(`Falha automática: ${e.message}`);}
  finally{running=false;$('synthetic').disabled=false;}
});
action('micStart',async()=>{
  if(!$('micConsent').checked||running)throw Error('Explicit microphone consent required');
  await stop();const token=++request;session=await acquire($('mode').value,token);await session.resume();meter();status('Captura ativa, microfone de transmissão fechado. Abra explicitamente para medir.');
});
action('background',async()=>{
  if(running||session||listenBusy||commitBusy){
    const code=session?'SESSION_ACTIVE':'ACTION_BUSY';report.background={operation:'background',bundleId:bundle?.bundleId,result:'BLOCKED',error:safeFailure('background','precondition',fault(code)),sessionActive:Boolean(session),actionRunning:running};
    $('backgroundStatus').textContent=code==='SESSION_ACTIVE'?'Pare a sessão de captura/escuta antes desta medição sintética. Nenhum recurso foi alterado.':'Outra ação está em andamento. Aguarde ou use Parar.';return;
  }
  running=true;const abort=new AbortController();automaticAbort=abort;
  backgroundTask=runBackground({signal:abort.signal,bundleId:bundle?.bundleId,publish:value=>{
    report.background=value;
    $('backgroundStatus').textContent=value.phase==='ready-for-tab-switch'?'Pronto para trocar de aba: medição sintética silenciosa em andamento (8 s previstos).':value.phase!=='complete'?`Preparando: ${value.phase}. Nenhum microfone físico.`:value.result==='PASS'?`Concluído em ${(value.observedMs/1000).toFixed(2)} s: ${value.hidden.result}. Recursos liberados.`:value.result==='CANCELLED'?'Medição cancelada; recursos liberados.':`Falha em ${value.error?.phase}: ${value.error?.name} / ${value.error?.code}. Recursos liberados.`;
    render();
  }});
  try{await backgroundTask;}finally{backgroundTask=null;if(automaticAbort===abort)automaticAbort=null;running=false;}
});
action('prepareSilentSession',async()=>{
  if(session||running||listenBusy)throw fault('SESSION_ACTIVE');
  await stop();running=true;const token=request;let resource,probe,local,graph,context;
  try{
    resource=await syntheticAcquisition();const raw=resource.stream.getAudioTracks()[0];liveRawTracks.add(raw);
    probe=await CaptureSession.create({rawTrack:raw,mode:'native',config:{gain:100,gate:false},disposeRaw:async()=>{liveRawTracks.delete(raw);await resource.dispose();}});
    probe.alias=`CAPTURE_${++acquisitionTotal}`;probe.sourceKind='synthetic';
    await probe.resume();if(!await probe.reset({selfMuted:false}))throw fault('ACK_REJECTED');
    local=await localPeers(probe.track);context=new AudioContext();await context.audioWorklet.addModule('/worklet.js');
    graph=new ReceiveGraph(context);await graph.addRemote('CALL_A',new MediaStream([local.remoteCall]),'CALL');graph.configure({master:30});
    await graph.direct({type:'none'});await context.resume();if(token!==request)throw fault('STALE_ACTION');
    session=probe;peers=local;receiver=graph;receiveContext=context;graph.audible=true;graph.output.gain.value=1;meter();
    status('Sessão sintética pronta: mesmo CALL/adapter, saída silenciosa. Consentimentos físicos não alterados.');
  }catch(e){graph?.dispose();local?.close();if(context&&context.state!=='closed')await context.close();if(probe)await probe.dispose();else await resource?.dispose();throw e;}
  finally{running=false;}
});
action('apply',async()=>{
  if(!session||!$('micConsent').checked||commitBusy)throw Error('Explicit capture required; serialized commit must finish');
  const token=++request,previous=session;
  const candidate=await acquire($('mode').value,token);
  if(token!==request||previous.closed||previous.guard.state.adminBlocked||!previous.guard.state.permission){await candidate.dispose();return;}
  commitBusy=true;$('apply').disabled=true;
  try{
    await previous.reset({transition:true});
    if(token!==request||previous.closed){await candidate.dispose();return;}
    const transaction=new CallTransaction(previous.track);activeTransaction=transaction;if(peers)transaction.add('CALL_A',peers.callSender);
    const result=await transaction.commit(transaction.begin(),candidate.track);
    if(result!=='committed'){await candidate.dispose();await previous.reset({transition:false});throw Error('Replacement failed');}
    if(token!==request||previous.closed){await candidate.dispose();return;}
    // Publish current permission/mute state while all tracks are still closed.
    // Later user actions operate on candidate; no cached state is restored after await.
    candidate.guard.update({...previous.guard.state,transition:false,ready:false,failed:false,suspended:false});
    session=candidate;await previous.dispose();
    if(token!==request||candidate.closed)return;
    await candidate.resume();meter();status('Modo/controles aplicados em nova geração; intenções completas preservadas.');
  }catch(e){if(session!==candidate)await candidate.dispose();throw e;}
  finally{activeTransaction=null;commitBusy=false;$('apply').disabled=false;}
});
action('micOpen',async()=>{if(session)return session.reset({selfMuted:false});});
action('mute',async()=>{if(session)return session.reset({selfMuted:true});});
action('deafen',async()=>{if(session){await session.reset({deafened:!session.guard.state.deafened});receiver?.configure({deafen:session.guard.state.deafened});}});
action('admin',async()=>{request++;if(activeTransaction)activeTransaction.request++;if(session)await session.reset({adminBlocked:!session.guard.state.adminBlocked,selfMuted:true});});
action('crash',async()=>{session?.node.port.postMessage({type:'crash'});});
action('suspend',async()=>{if(session){await session.reset({suspended:true});await session.context.suspend();}});
action('resume',async()=>{await session?.resume();});
for(const id of ['gain','threshold','gate','preroll'])$(id).addEventListener('change',()=>{if(session)void session.reset({},config()).then(render);});
for(const id of ['master','personal','shareVolume','hidden'])$(id).addEventListener('change',()=>receiver?.configure({master:Number($('master').value),personal:Number($('personal').value),share:Number($('shareVolume').value),hidden:$('hidden').checked}));
action('listen',async()=>{
  if(!session||!$('listenConsent').checked)throw Error('Explicit private playback choice required');
  if(listenBusy)return false;listenBusy=true;
  try{
  const token=request;
  if(!peers){const prepared=await localPeers(session.track);if(token!==request){prepared.close();return;}peers=prepared;}
  if(!receiver){
    const prepared=new AudioContext();let graph=null;
    try{
      await prepared.audioWorklet.addModule('/worklet.js');
      if(token!==request){await prepared.close();return;}
      graph=new ReceiveGraph(prepared);await graph.addRemote('CALL_A',new MediaStream([peers.remoteCall]),'CALL');
      if(token!==request){graph.dispose();await prepared.close();return;}
      receiveContext=prepared;receiver=graph;
    }catch(e){graph?.dispose();if(prepared.state!=='closed')await prepared.close();throw e;}
  }
  if(token!==request||!receiver||receiver.closed)return;
  receiver.configure({master:Number($('master').value),personal:Number($('personal').value),share:Number($('shareVolume').value),hidden:$('hidden').checked,deafen:session.guard.state.deafened});
  const currentReceiver=receiver;await currentReceiver.direct(sequenceRunning||$('silentOutput').checked?{type:'none'}:selectedSink);await currentReceiver.context.resume();
  if(token!==request||receiver!==currentReceiver||currentReceiver.closed)return;
  currentReceiver.audible=true;currentReceiver.output.gain.value=1;status('Escuta local ativa na saída escolhida. Sem gravação.');
  }finally{listenBusy=false;}
});
action('diagnose',async()=>{
  if(diagnosing||running)return;diagnosing=true;clearInterval(timer);timer=null;const token=request;
  try{status('Medindo o caminho digital por 1 segundo…');const value=await observeListening({session,receiver,peers,acquisitionTotal,liveCaptures:liveRawTracks.size,actions:structuredClone(actions),bundleId:bundle?.bundleId,sourceKind:session?.sourceKind??'none',outputMode:receiver?.context.sinkId?.type==='none'?'silent-digital':'physical-selected-or-default'});if(token===request){diagnosis=value;status(`Diagnóstico: ${value.stage}. Som físico requer confirmação do proprietário.`);}}
  finally{diagnosing=false;if(session)meter();}
});
action('listenStop',async()=>{receiver?.silence();});
action('listeningChecks',async()=>{
  if(session||running||sequenceRunning)throw Error('Stop current test first');
  if(!$('syntheticInput').checked||!$('silentOutput').checked)throw Error('Select synthetic acquisition and silent digital output');
  sequenceRunning=true;$('listeningChecks').disabled=true;
  try{report=await runListeningChecks({act:id=>handlers[id](),control:id=>$(id),actionResult:id=>actions[id],snapshot:()=>diagnosis,cleanup:()=>lastCleanup,state:()=>JSON.parse($('state').textContent),bundle,publish:value=>{report=value;render();}});}
  finally{await stop();sequenceRunning=false;$('listeningChecks').disabled=false;}
  status('Sequência Native concluída: caminho digital validado. Esta sequência não mede som físico.');
});
function outputFeedback(value){
  outputEvidence={...value,bundleId:bundle?.bundleId,capabilities:{...outputEvidence.capabilities,...value.capabilities}};
  const messages={PICKER_PENDING:'Escolha uma saída no diálogo do navegador.',ENUMERATING:'Consultando somente saídas já expostas pelo navegador…',CHOICES_AVAILABLE:'Seletor nativo ausente. Escolha explicitamente uma saída exposta na lista abaixo.',APPLIED:'Saída aplicada ao adapter direto. Confirme o dispositivo fisicamente.',CANCELLED:'Seleção cancelada; nenhuma nova saída aplicada.'};
  const errors={PLAYBACK_REQUIRED:'Inicie a escuta com consentimento separado antes de trocar a saída.',CONTEXT_SINK_UNAVAILABLE:'Este contexto não oferece setSinkId; a saída padrão continua disponível.',NO_EXPOSED_OUTPUT:'Seletor nativo ausente e nenhuma saída alternativa exposta. A saída padrão foi mantida.',ENUMERATION_UNAVAILABLE:'Seletor e enumeração indisponíveis; mantenha a saída padrão.',POLICY_BLOCKED:'A política speaker-selection bloqueia a troca de saída.',INSECURE_CONTEXT:'Troca de saída indisponível fora de contexto seguro.',CHOICE_REQUIRED:'Escolha uma saída da lista antes de aplicar.'};
  let text=messages[value.result]??errors[value.error?.code];
  if(!text){const e=value.error;text=e?.name==='NotAllowedError'?'Solicitação não autorizada ou diálogo dispensado; esta exceção não distingue os dois casos.':e?.name==='AbortError'?'Operação abortada pelo navegador; cancelamento ou falha não diferenciados.':`Falha em ${e?.phase}: ${e?.name} / ${e?.code}.`;}
  if(value.error?.phase==='apply')text+=' Reprodução silenciada; a saída anterior permanece selecionada se o navegador não concluiu a troca.';
  $('outputStatus').textContent=text;render();
}
function outputOperation(){const graph=receiver,token=request;return {context:graph?.context,consent:$('listenConsent').checked,current:()=>token===request&&receiver===graph&&!graph?.closed,notify:outputFeedback,apply:async id=>{
  if(token!==request||receiver!==graph)throw fault('STALE_ACTION');
  try{if(!await graph.direct(id))throw fault('STALE_ACTION');selectedSink=id;}
  catch(e){graph.silence();throw e;}
}};}
action('sink',async()=>{
  if(outputBusy){$('outputStatus').textContent='Seleção já em andamento.';return;}
  outputBusy=true;$('outputChoices').hidden=true;
  try{const value=await outputSelection.choose(outputOperation());outputFeedback(value);
    if(value.result==='CHOICES_AVAILABLE'){
      $('outputList').replaceChildren(new Option('Escolha uma saída…',''));
      for(const choice of outputSelection.choices())$('outputList').add(new Option(`${choice.alias} — ${choice.label}`,choice.alias));
      $('outputChoices').hidden=false;
    }
  }finally{outputBusy=false;}
});
action('outputApply',async()=>{
  if(outputBusy)return;const operation=outputOperation();if(!operation.consent||!operation.context){outputFeedback({result:'UNAVAILABLE_OR_FAILED',error:safeFailure('sink','precondition',fault('PLAYBACK_REQUIRED'))});return;}
  outputBusy=true;try{outputFeedback(await outputSelection.applyChoice($('outputList').value,operation));}finally{outputBusy=false;}
});
action('outputCancel',async()=>{if(outputBusy){$('outputStatus').textContent='Aplicação em andamento. Use Parar para encerrar a sessão.';return;}outputSelection.clear();$('outputChoices').hidden=true;outputFeedback({result:'CANCELLED'});});
action('shareStart',async()=>{
  if(!$('shareConsent').checked||!$('listenConsent').checked||!receiver||sharing)throw Error('Explicit share and playback required');
  const token=request;const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
  if(token!==request){stream.getTracks().forEach(t=>t.stop());return;}sharing=stream;
  const audio=stream.getAudioTracks()[0];if(!audio){stream.getTracks().forEach(t=>t.stop());sharing=null;throw Error('No share audio supplied');}
  // A second local connection gives the screen its own tested receive path.
  shareContext=new AudioContext();const silent=shareContext.createMediaStreamDestination();silent.stream.getTracks()[0].enabled=false;
  try{
    const prepared=await localPeers(silent.stream.getAudioTracks()[0],audio,stream.getVideoTracks()[0]);
    silent.stream.getTracks().forEach(t=>t.stop());
    if(token!==request){prepared.close();return;}sharePeers=prepared;
    receiver.add('SCREEN_A',receiveContext.createMediaStreamSource(new MediaStream([sharePeers.remoteScreen])),'SCREEN');
    $('screen').srcObject=new MediaStream([sharePeers.remoteVideo]);$('screen').muted=true;$('screen').style.display='block';await $('screen').play();
    stream.getVideoTracks()[0].addEventListener('ended',()=>void stop(),{once:true});status('Share recebido pelo peer local: observe sincronismo A/V e independência de deafen/HIDDEN.');
  }catch(e){await stop();throw e;}
});
action('stop',stop);
action('export',async()=>{
  const payload={automatic:report,native:nativeEvidence,diagnosis,output:outputEvidence,manualState:JSON.parse($('state').textContent),listening:'owner observations are recorded in the dedicated owner document',recordingPersisted:false};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='voice-audio-spike-metrics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('pagehide',()=>void stop());render();
// Static metadata only. Page load never creates an AudioContext or acquires media.
void (async()=>{
  bundle=await (await fetch('/bundle-manifest.json')).json();
  outputEvidence={bundleId:bundle.bundleId,result:'NOT_EXECUTED',capabilities:await outputSelection.inspect(receiveContext)};
  $('identity').textContent=`${bundle.id} · bundle ${bundle.bundleId}`;
  $('validated').textContent='Bundle local de pesquisa. Execute os testes e registre novas observações; os resultados históricos estão no README.';
  render();
})().catch(()=>status('Identidade indisponível: confira o build local antes de capturar.'));
