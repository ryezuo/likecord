// Bounded scalar observation only: no PCM/IDs/SDP/ICE are exported.
export const trackState = t => t ? { enabled:t.enabled, muted:t.muted, readyState:t.readyState } : null;
const rms = (energy, samples) => samples > 0 ? Math.sqrt(Math.max(0, energy) / samples) : null;
export async function syntheticAcquisition() {
  const context = new AudioContext({ sampleRate:48000 });
  const oscillator=context.createOscillator(), gain=context.createGain(), destination=context.createMediaStreamDestination();
  oscillator.frequency.value=173; gain.gain.value=.05;
  oscillator.connect(gain); gain.connect(destination); oscillator.start();
  const dispose=async()=>{destination.stream.getTracks().forEach(t=>t.stop());oscillator.stop();oscillator.disconnect();gain.disconnect();destination.disconnect();if(context.state!=='closed')await context.close();};
  try {await context.resume();return {stream:destination.stream,dispose};}catch(e){await dispose();throw e;}
}
function tap(context, source) {
  if(!context||!source)return null;
  const node=context.createAnalyser();node.fftSize=2048;source.connect(node);
  return {node,source,data:new Float32Array(node.fftSize),energy:0,samples:0,peak:0};
}
function readTap(t) {if(!t)return;let energy=0,peak=0;t.node.getFloatTimeDomainData(t.data);for(const x of t.data){energy+=x*x;peak=Math.max(peak,Math.abs(x));}t.energy+=energy;t.samples+=t.data.length;t.peak=Math.max(t.peak,peak);t.lastWindowRms=rms(energy,t.data.length);t.lastWindowPeak=peak;t.data.fill(0);}
function summary(t) {return t?{rms:rms(t.energy,t.samples),peak:t.peak,sampledValues:t.samples,lastWindowRms:t.lastWindowRms,lastWindowPeak:t.lastWindowPeak,windowSamples:t.data.length}:null;}
async function rtp(peers) {
  if(!peers)return null;const result={outbound:{},inbound:{},source:{}};
  for(const [peer,type,key,fields] of [
    [peers.a,'outbound-rtp','outbound',['bytesSent','packetsSent']],
    [peers.a,'media-source','source',['audioLevel','totalAudioEnergy','totalSamplesDuration']],
    [peers.b,'inbound-rtp','inbound',['bytesReceived','packetsReceived','totalAudioEnergy','totalSamplesDuration','concealedSamples']]
  ])for(const row of (await peer.getStats()).values()){
    if(row.type!==type||(row.kind??row.mediaType)!=='audio')continue;
    for(const field of fields)if(Number.isFinite(row[field]))result[key][field]=(result[key][field]??0)+row[field];
  }return result;
}
function deltas(a,b){if(!a||!b)return null;return Object.fromEntries(Object.keys(b).map(k=>[k,Object.fromEntries(Object.entries(b[k]).map(([f,v])=>[f,f==='audioLevel'?v:v-(a[k][f]??v)]))]));}
export async function observeListening({session,receiver,peers,acquisitionTotal,liveCaptures,actions,bundleId,sourceKind,outputMode}) {
  const capture=tap(session?.context,session?.node),incoming=tap(receiver?.context,receiver?.sources.get('CALL_A')?.node),output=tap(receiver?.context,receiver?.output);
  const started=performance.now();
  try {
    const before=await rtp(peers),begin=await session?.getMetrics();
    for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,100));readTap(capture);readTap(incoming);readTap(output);}
    const end=await session?.getMetrics(),after=await rtp(peers);
    const result={bundleId,origin:sourceKind==='synthetic'?'synthetic_acquisition_real_UI_handlers':'owner_microphone_scalar_diagnosis',elapsedMs:performance.now()-started,sourceKind,outputMode,acquisitionTotal,liveCaptureSessions:liveCaptures,
      captureAlias:session?.alias??null,controllerGeneration:session?.guard.generation??null,captureContext:session?.context.state??'absent',outputContext:receiver?.context.state??'absent',
      processedTrack:trackState(session?.track),rawTrack:trackState(session?.rawTrack),receivedTrack:trackState(peers?.remoteCall),senderTrack:trackState(peers?.callSender.track),senderMatchesCurrentCapture:peers?peers.callSender.track===session?.track:null,
      guardAllowed:session?.guard.allowed??false,processorAllowed:end?.allowed??null,processorGeneration:end?.generation??null,gateEnabled:session?.config.gate??null,gateOpen:end?.open??null,
      preFinalGuardRms:begin&&end?rms(end.preGuardEnergy-begin.preGuardEnergy,end.energySamples-begin.energySamples):null,
      postFinalGuardRms:begin&&end?rms(end.outputEnergy-begin.outputEnergy,end.energySamples-begin.energySamples):null,
      processedStream:summary(capture),receiverBeforeMix:summary(incoming),afterOutputGain:summary(output),
      peers:peers?{sender:peers.a.connectionState,receiver:peers.b.connectionState,senderICE:peers.a.iceConnectionState,receiverICE:peers.b.iceConnectionState}:null,rtpDelta:deltas(before,after),
      receive:receiver?{...receiver.snapshot(),master:receiver.master.gain.value,call:receiver.sources.get('CALL_A')?.gain.gain.value,output:receiver.output.gain.value,deafen:receiver.state.deafen??false,failed:receiver.failed??false,sink:receiver.context.sinkId?.type==='none'?'silent-digital':'selected-or-default'}:null,
      actions,physicalSoundConfirmed:false,recordingPersisted:false};
    result.stage=!session?'capture-absent':!session.guard.allowed?'mandatory-guard-closed':!result.postFinalGuardRms?'capture-or-final-guard-silent':!peers?'playback-not-started':!result.receiverBeforeMix?.rms?'received-stream-silent':!result.afterOutputGain?.rms?'receive-mix-or-output-silent':'digital-output-nonzero-physical-confirmation-pending';
    return result;
  }finally{for(const t of [capture,incoming,output])if(t){try{t.source.disconnect(t.node);}catch{/* Stop may already have disconnected the source. */}t.node.disconnect();t.data.fill(0);}}
}
