import createModule from '@jitsi/rnnoise-wasm/dist/rnnoise-sync.js';
import { RNNoise, CaptureDSP } from './dsp.mjs';
import { CallTransaction } from './control.mjs';
import { CaptureSession, ReceiveGraph, localPeers, delay } from './runtime.mjs';
import { assert, runScenarios } from '../test/scenarios.mjs';
import { runLatencyChecks } from './latency-checks.mjs';
const countNonzero = data => data.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
const percentiles = values => {
  if (!values.length) return { count: 0, p50_ms: null, p95_ms: null, max_ms: null };
  values.sort((a,b) => a-b);
  return { count: values.length, p50_ms: values[Math.floor(values.length * .5)], p95_ms: values[Math.floor(values.length * .95)], max_ms: values.at(-1) };
};
function stimulus(length) {
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / 48000; const phase = 2 * Math.PI * (113 * t + 31 * t * t);
    result[i] = (0.11 * Math.sin(phase) + 0.07 * Math.sin(phase * 2.013) + 0.04 * Math.sin(phase * 3.071)) * (0.5 + 0.5 * Math.sin(t * 17) ** 2);
  }
  return result;
}
function lagEstimate(input, output) {
  let best = -Infinity, lag = 0;
  for (let d = 0; d <= 3000; d++) {
    let dot = 0, a = 0, b = 0;
    for (let i = 8000; i < 26000; i += 8) { const x = input[i], y = output[i + d]; dot += x*y; a += x*x; b += y*y; }
    const correlation = dot / Math.sqrt(a*b || 1);
    if (correlation > best) { best = correlation; lag = d; }
  }
  return { samples: lag, ms: lag / 48, correlation: best, method: 'normalized cross-correlation of deterministic chirped multitone; digital chain only; not end-to-end or hardware' };
}
async function offlineCapture(mode, gate, events = [], source = stimulus(48000), config = {}) {
  const context = new OfflineAudioContext(1, source.length, 48000);
  await context.audioWorklet.addModule('/worklet.js');
  const buffer = context.createBuffer(1, source.length, 48000); buffer.copyToChannel(source, 0);
  const node = new AudioWorkletNode(context, 'voice-capture-spike', { outputChannelCount: [1], processorOptions: { mode, gate, syntheticAutoOpen: true, events, ...config } });
  const messages = []; node.port.onmessage = e => messages.push(e.data);
  const input = context.createBufferSource(); input.buffer = buffer; input.connect(node); node.connect(context.destination); input.start();
  try { const rendered = await context.startRendering(); return { data: rendered.getChannelData(0), messages }; }
  finally { input.disconnect(); node.disconnect(); node.port.postMessage({ type: 'dispose' }); node.port.onmessage = null; node.port.close(); }
}
export async function runBrowserChecks(progress, signal) {
  const report = { environment: { userAgent: navigator.userAgent, platform: 'Windows local desktop', secureContext: isSecureContext, crossOriginIsolated }, captureExecuted: false, physicalPlaybackExecuted: false, deterministic: await runScenarios(), checks: [] };
  const add = (name, result, origin, details) => { signal?.throwIfAborted(); report.checks.push({ name, result, origin, ...details }); progress(report, name); };
  assert(report.deterministic.every(x => x.result === 'PASS'), 'Deterministic silence failed; runtime disabled');
  for (const path of ['/worklet.js', '/rnnoise-sync.wasm']) {
    const r = await fetch(path); assert(r.ok); const type = r.headers.get('content-type');
    assert(type.startsWith(path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'));
    if (path.endsWith('.wasm')) assert(WebAssembly.validate(await r.arrayBuffer()));
    add(`same-origin ${path} MIME and bytes`, 'PASS', 'local_browser_runtime', { type });
  }
  const module = createModule(); const expected = createModule(); const engine = new RNNoise(module);
  const state = expected._rnnoise_create(0); const pointer = expected._malloc(480*4);
  let exact = true; let allFinite = true; const vectors = stimulus(480*80);
  for (let n = 0; n < 80; n++) {
    const frame = vectors.slice(n*480,(n+1)*480);
    for(let i=0;i<480;i++) expected.HEAPF32[(pointer>>>2)+i] = frame[i]*32768;
    expected._rnnoise_process_frame(state,pointer,pointer); engine.process(frame);
    for(let i=0;i<480;i++) { exact &&= frame[i] === Math.fround(expected.HEAPF32[(pointer>>>2)+i]/32768); allFinite &&= Number.isFinite(frame[i]); }
  }
  assert(exact && allFinite); engine.dispose(); expected._rnnoise_destroy(state); expected._free(pointer);
  add('Actual sync RNNoise ABI and scale vectors', 'PASS', 'deterministic_samples', { frames: 80, matchesDirectCABI: exact, factoryThenable: typeof module.then === 'function', wasmHeapBytes: module.HEAPU8.byteLength });
  for (const mode of ['native', 'rnnoise']) for (const gate of [false, true]) {
    const source = stimulus(48000); const rendered = await offlineCapture(mode,gate,[],source);
    assert(rendered.data.every(Number.isFinite) && rendered.data.some(x=>x!==0));
    add(`Digital delay ${mode} gate=${gate}`, 'MEASURED', 'local_browser_runtime', { ...lagEstimate(source,rendered.data), proposedBudgetMs:30, gatePreRollMs:gate?10:0, adapterFifoMs:mode==='rnnoise'?479/48:0 });
  }
  const input = new Float32Array(48000); input.set(stimulus(10000));
  for (const mode of ['native','rnnoise']) {
    const rendered = await offlineCapture(mode,true,[{ at:12288,type:'block' },{ at:24576,type:'open' }],input);
    assert(rendered.data.subarray(0,10000).some(x=>x!==0));
    assert(countNonzero(rendered.data.subarray(12288)) === 0, 'Post-guard or reopened stale speech');
    add(`Real worklet mandatory silence + reset ${mode}`, 'PASS', 'local_browser_runtime', { guardAtSample:12288, reopenAtSample:24576, postGuardNonzero:0 });
  }
  // CPU wall-clock measurement of the exact same implementation on window,
  // NOT measured AudioWorklet scheduling/deadline performance.
  const dsp = new CaptureDSP({ engine: new RNNoise(createModule()), gate:true }); dsp.activate();
  const source = stimulus(48000*15); const durations = [], heavy = [], fifo = []; const out = new Float32Array(128);
  const cpuStart = performance.now();
  for (let pos=0;pos+128<=source.length;pos+=128) { const view=source.subarray(pos,pos+128); const before=dsp.engineCalls; const start=performance.now(); dsp.process(view,out); const elapsed=performance.now()-start; durations.push(elapsed); (dsp.engineCalls>before?heavy:fifo).push(elapsed); }
  const cost = { sampleDurationSeconds:15, wallMs:performance.now()-cpuStart, clock:'window.performance.now', role:'surrogate exact-DSP benchmark, not real AudioWorklet callback deadlines', quantum:128, quantumMs:128/48, aggregate:percentiles(durations), rnnoiseCallbacks:percentiles(heavy), fifoOnlyCallbacks:percentiles(fifo), controlledBufferBytes:dsp.bufferBytes, wasmHeapBytes:dsp.engine.module.HEAPU8.byteLength, browserWorkingSet:'not_measured', additionalWorkingSetBudget:'not_measured' };
  dsp.dispose(); add('DSP cost separated by invocation type', 'MEASURED', 'local_browser_runtime', cost);
  let session, second, peers, screenDest, screenSource, graph;
  try {
    session = await CaptureSession.create({ signal, mode:'rnnoise', config:{gate:true}, sourceFactory:context=>{ const osc=context.createOscillator(); osc.frequency.value=173; osc.start(); return osc; } });
    await session.resume(); await session.reset({ selfMuted:false }); assert(session.track.enabled, 'Current-generation open ACK must enable synthetic sender track');
    const visibilityStates=[document.visibilityState];
    const visibilityListener=()=>visibilityStates.push(document.visibilityState);
    document.addEventListener('visibilitychange',visibilityListener);
    const start=await session.getMetrics(); const observationStart=performance.now(); await delay(5000); const metrics=await session.getMetrics();
    report.readiness={totalSetupMs:session.setupMs,afterModuleAvailableMs:session.readyAfterModuleMs,proposedAfterBytesBudgetMs:3000,totalSetupTimeoutMs:10000,workletInstrumentationBytes:session.ready.instrumentationBytes};
    document.removeEventListener('visibilitychange',visibilityListener);
    assert(metrics.callbacks>start.callbacks&&metrics.frames>start.frames,'Live RNNoise must actually process frames');
    add('Live worklet scheduling/readiness/resource sample','MEASURED','local_browser_runtime',{readyMs:session.setupMs,readyBudgetMs:3000,elapsedObservationMs:performance.now()-observationStart,callbacksDuringObservation:metrics.callbacks-start.callbacks,rnnoiseFramesDuringObservation:metrics.frames-start.frames,quantumMin:metrics.quantumMin,quantumMax:metrics.quantumMax,rnnoiseFrames:metrics.frames,wasmHeapBytes:metrics.wasmBytes,bufferBytes:metrics.bufferBytes,callbackCpuClock:session.ready.cpuClock,actualCallbackCPU:metrics.measuredCallbacks?{aggregate:percentiles(metrics.durations),rnnoise:percentiles(metrics.durations.filter((_,i)=>metrics.heavy[i])),fifo:percentiles(metrics.durations.filter((_,i)=>!metrics.heavy[i]))}:'not_measured',visibilityStates,backgroundTabScheduling:visibilityStates.includes('hidden')?'observed_hidden_with_continuing_callbacks':'not_exercised'});
    screenDest=session.context.createMediaStreamDestination(); screenSource=session.context.createConstantSource(); screenSource.offset.value=0.01; screenSource.connect(screenDest); screenSource.start();
    const screenTrack=screenDest.stream.getAudioTracks()[0];
    peers=await localPeers(session.track,screenTrack,null,signal);
    const tx = new CallTransaction(session.track); tx.add('CALL_A',peers.callSender);
    const generation=tx.begin();
    second=await CaptureSession.create({ signal, mode:'native', sourceFactory:context=>{const osc=context.createOscillator();osc.frequency.value=281;osc.start();return osc;} });
    assert(session.track.enabled,'Preparation interrupted old valid path');
    await session.reset({transition:true});
    assert(await tx.commit(generation,second.track)==='committed');
    await second.resume(); await second.reset({selfMuted:false});
    assert(peers.callSender.track===second.track && peers.screenSender.track===screenTrack);
    await delay(350);
    let bytesSent=0; const stats=await peers.a.getStats(); for(const row of stats.values()) if(row.type==='outbound-rtp'&&row.kind==='audio') bytesSent+=row.bytesSent??0;
    assert(bytesSent>0);
    add('Real local RTCPeerConnection CALL replaceTrack; SCREEN first untouched','PASS','local_browser_runtime',{peers:2,callSendersReplaced:1,screenSendersMutated:0,audioBytesSent:bytesSent,acoustics:'not_tested',productAuthorization:'not_tested',iceServers:0});
    await second.reset({deafened:true}); await second.reset({deafened:false}); assert(!second.track.enabled&&second.guard.state.selfMuted);
    await second.context.suspend(); assert(!second.track.enabled); await second.resume(); assert(!second.track.enabled);
    add('Actual context suspend/resume and undeafen retain mute','PASS','local_browser_runtime',{contextState:second.context.state,senderTrackEnabled:second.track.enabled});
    graph=new ReceiveGraph(second.context); await graph.direct(); await graph.direct();
    const src=second.context.createMediaStreamSource(new MediaStream([peers.remoteCall])); graph.add('CALL_A',src,'CALL');
    assert(graph.snapshot().adapters===1); graph.configure({deafen:true}); assert(graph.sources.get('CALL_A').gain.gain.value===0);
    await second.reset({selfMuted:false});
    const beforeCrash=await second.getMetrics();
    second.node.port.postMessage({type:'crash'}); await delay(200);
    const afterCrash=await second.getMetrics().catch(()=>null);
    assert(second.guard.state.failed&&!second.track.enabled,`Render exception state=${second.context.state}; before=${beforeCrash.callbacks}; after=${afterCrash?.callbacks}; armed=${JSON.stringify(second.crashArmed)}; executed=${second.crashExecuted}; failed=${second.guard.state.failed}`);
    add('Actual processorerror fail-closed','PASS','local_browser_runtime',{trigger:'injected throw in process(), browser onprocessorerror handler',deliveredEventType:second.processorErrorEventType,senderTrackEnabled:second.track.enabled});
    let sinkRejected=false;
    if(typeof second.context.setSinkId==='function') { try { await graph.direct('SPIKE_NONEXISTENT_OUTPUT'); } catch {sinkRejected=true;} assert(graph.output.gain.value===0&&graph.snapshot().adapters===1); }
    add('Output sole direct adapter and failure silence','PASS','local_browser_runtime',{...graph.snapshot(),contextSetSinkId:typeof second.context.setSinkId==='function',elementSetSinkId:typeof HTMLMediaElement.prototype.setSinkId==='function',selectAudioOutput:typeof navigator.mediaDevices.selectAudioOutput==='function',invalidSinkRejected:sinkRejected,physicalDevice:'not_executed',bridge:'not_proven'});
  } finally {
    graph?.dispose(); peers?.close(); screenSource?.stop(); screenSource?.disconnect(); screenDest?.stream.getTracks().forEach(t=>t.stop()); screenDest?.disconnect();
    const start=performance.now(); await session?.dispose(); await second?.dispose();
    add('Live resources teardown','PASS','local_browser_runtime',{teardownMs:performance.now()-start,contextsClosed:[session?.context.state,second?.context.state],tracksEnded:[session?.track.readyState,second?.track.readyState],normalDisposeAck:session?.disposeAcknowledged,failedProcessorDisposeAck:second?.disposeAcknowledged,failedProcessorReclaimedBy:'context.close; worklet port may still service dispose after process failure',pendingControllerRequests:(session?.pending.size??0)+(second?.pending.size??0),wasmStateFreedNormal:session?.disposeAcknowledged,totalBrowserMemoryReleased:'not_measured'});
  }
  let timedOut=false; try { await CaptureSession.create({mode:'native',inject:'drop-ready'}); } catch (e) { timedOut=e.message==='ready-timeout'; } assert(timedOut);
  add('Dropped readiness ACK enforces setup timeout/cleanup','PASS','injected_failure',{timeoutMs:100,productionHypothesisMs:3000});
  // Distinct constant signals make category/master duplication observable in
  // actual rendered samples, not just a node inventory assertion.
  for (const [name,patch,expected] of [['mixed',{master:200,personal:25,share:50},.25],['deafen',{deafen:true},.2],['HIDDEN',{hidden:true},.1],['master zero',{master:0},0]]) {
    const c=new OfflineAudioContext(1,4800,48000); await c.audioWorklet.addModule('/worklet.js'); const g=new ReceiveGraph(c);
    const call=c.createConstantSource();call.offset.value=.1; const screen=c.createConstantSource();screen.offset.value=.2;
    g.add('CALL',call,'CALL');g.add('SCREEN',screen,'SCREEN');g.configure(patch);await g.direct();await g.direct();g.output.gain.value=1;call.start();screen.start();
    const buffer=await c.startRendering();const data=buffer.getChannelData(0);assert(data.subarray(1000).every(x=>Math.abs(x-expected)<1e-6),`Output formula ${name}`);g.dispose();
    add(`Rendered output ${name}`,'PASS','local_browser_runtime',{expected,observed:data[2000],masterApplications:1});
  }
  {
    const c=new OfflineAudioContext(2,4800,48000);await c.audioWorklet.addModule('/worklet.js');const g=new ReceiveGraph(c);
    const source=c.createBufferSource();const buffer=c.createBuffer(2,4800,48000);buffer.getChannelData(0).fill(.2);buffer.getChannelData(1).fill(-.3);source.buffer=buffer;
    const legacy=document.createElement('audio');legacy.muted=false;
    g.add('STEREO_SCREEN',source,'SCREEN',legacy);await g.direct();g.output.gain.value=1;source.start();const rendered=await c.startRendering();
    assert(legacy.muted&&legacy.srcObject===null);assert(Math.abs(rendered.getChannelData(0)[2000]-.2)<1e-6&&Math.abs(rendered.getChannelData(1)[2000]+.3)<1e-6);
    add('Screen stereo and retired element','PASS','local_browser_runtime',{left:rendered.getChannelData(0)[2000],right:rendered.getChannelData(1)[2000],legacyMuted:legacy.muted,pathsPerFlow:1});g.dispose();
  }
  {
    const c=new OfflineAudioContext(1,4800,48000);await c.audioWorklet.addModule('/worklet.js');const g=new ReceiveGraph(c);
    const sfx=c.createConstantSource();sfx.offset.value=.01;g.add('SFX_CATEGORY_ONLY',sfx,'SFX');g.configure({master:0,deafen:true,hidden:true});await g.direct();g.output.gain.value=1;sfx.start();const data=(await c.startRendering()).getChannelData(0);
    assert(Math.abs(data[2000]-.007)<1e-6);g.dispose();add('Independent synthetic SFX category','PASS','local_browser_runtime',{sample:data[2000],VA1CuesUsed:false,physicalPlayback:false});
  }
  {
    const c=new OfflineAudioContext(1,4800,48000);await c.audioWorklet.addModule('/worklet.js');const g=new ReceiveGraph(c);const source=c.createConstantSource();source.offset.value=.8;
    g.add('OVERLOAD',source,'SCREEN');g.configure({master:200});await g.direct();g.output.gain.value=1;source.start();const data=(await c.startRendering()).getChannelData(0);
    assert(data.subarray(1000).every(x=>Math.abs(x)<=10**(-.5/20)+1e-7));g.dispose();add('Receive overload diagnostic clamp','PASS','local_browser_runtime',{unprotectedPeak:1.6,observedPeak:data[2000],ceilingDbFS:-.5,lookaheadMs:0,smoothLimiter:'not_implemented_or_accepted',distortion:'hard clipping expected under overload; no timbre approval'});
  }
  report.latencyContinuation = await runLatencyChecks({ offlineCapture, stimulus, lagEstimate, percentiles }, name => progress(report, name), signal);
  report.bundle = await (await fetch('/bundle-manifest.json')).json();
  report.complete=true; return report;
}
