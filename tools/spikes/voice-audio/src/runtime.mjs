import { TransmissionGuard, receiveGains } from './control.mjs';
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function deadline(promise, milliseconds, label = 'timeout') {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

export class CaptureSession {
  get state() {
    if(this.closed)return 'stopped';
    if(this.guard.state.failed)return this.reason;
    if(this.context.state!=='running')return `context-${this.context.state}`;
    if(!this.guard.state.ready)return 'preparing';
    return this.guard.allowed&&this.track.enabled?'ready-open':'ready-muted';
  }
  constructor(context, rawTrack = null) {
    this.context = context; this.rawTrack = rawTrack; this.guard = new TransmissionGuard(); this.closed = false;
    this.pending = new Map(); this.metrics = null; this.disposeAcknowledged = false; this.reason = 'preparing';
    this.destination = context.createMediaStreamDestination(); this.track = this.destination.stream.getAudioTracks()[0]; this.track.enabled = false;
    this.guard.own(this.track); if (rawTrack) this.guard.own(rawTrack);
    this.guard.onBlock = generation => this.node?.port.postMessage({ type: 'block', generation });
    this.stateListener = () => { if (!this.closed) {
      // A queued running notification must not invalidate a reset ACK issued
      // after resume() already resolved. Only a real state transition closes.
      const suspended = context.state !== 'running';
      if (suspended !== this.guard.state.suspended) this.guard.update({ suspended });
      this.reason = context.state;
    } };
    context.addEventListener('statechange', this.stateListener);
    this.ended = () => { this.reason = 'source-ended'; void this.dispose(); };
    rawTrack?.addEventListener('ended', this.ended);
  }
  static async create({ mode = 'native', config = {}, rawTrack = null, sourceFactory = null, inject = null, signal = null, disposeRaw = null } = {}) {
    const context = new AudioContext({ sampleRate: 48000 });
    const session = new CaptureSession(context, rawTrack); const start = performance.now();
    session.disposeRaw = disposeRaw;
    session.config = { gain: 100, gate: false, threshold: -50, prerollMs: 10, gateTiming: 'delayed', ...config }; session.mode = mode;
    session.signal=signal; session.abortListener=()=>void session.dispose();
    signal?.addEventListener('abort',session.abortListener,{once:true});
    try {
      signal?.throwIfAborted();
      await deadline(context.audioWorklet.addModule('/worklet.js'), 10000, 'module-timeout');
      const moduleAvailableAt=performance.now();
      if (session.closed) throw Error('session-disposed');
      const ready = new Promise((resolve, reject) => { session.resolveReady = resolve; session.rejectReady = reject; });
      session.node = new AudioWorkletNode(context, 'voice-capture-spike', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit', processorOptions: { mode, ...config } });
      session.processorFailure = event => { session.processorErrorEventType=event.type; session.reason = 'processorerror'; session.guard.update({ failed: true }); session.rejectReady?.(Error('processorerror')); };
      // Chromium maps this IDL attribute to the Error event internally. Use
      // the portable onprocessorerror attribute rather than guessing its type.
      session.node.onprocessorerror = session.processorFailure;
      session.node.port.onmessage = ({ data }) => {
        if (data.type === 'disposed') { session.disposeAcknowledged = true; session.resolveDisposed?.(); return; }
        if (session.closed) return;
        if(data.type==='crash-armed')session.crashArmed=data;
        if(data.type==='crash-executed')session.crashExecuted=true;
        if (data.type === 'ready') { if (inject !== 'drop-ready') { session.ready = data; session.resolveReady(data); } }
        if (data.type === 'error') { session.reason = 'processor-error'; session.guard.update({ failed: true }); session.rejectReady?.(Error('processor-error')); }
        if (data.type === 'ack') {
          const allowed = data.allowed && session.guard.acknowledge(data.generation, session.track);
          if (session.rawTrack && data.generation === session.guard.generation) session.rawTrack.enabled = Boolean(allowed);
          const pending = session.pending.get(data.generation);
          if (pending?.operation === data.operation) { pending.resolve(Boolean(allowed)); session.pending.delete(data.generation); }
        }
        if (data.type === 'metrics') {
          session.metrics = data; session.resolveMetrics?.(data); session.resolveMetrics = null;
          if (data.failed) session.guard.update({ failed: true });
        }
      };
      session.node.connect(session.destination);
      if (rawTrack) session.source = context.createMediaStreamSource(new MediaStream([rawTrack]));
      else if (sourceFactory) session.source = sourceFactory(context);
      session.source?.connect(session.node);
      await deadline(ready, Math.min(inject === 'drop-ready' ? 100 : 3000,Math.max(1,10000-(performance.now()-start))), 'ready-timeout');
      session.readyAfterModuleMs=performance.now()-moduleAvailableAt;
      session.setupMs = performance.now() - start; session.reason = 'ready-muted'; return session;
    } catch (error) { await session.dispose(); throw error; }
  }
  async reset(patch = {}, config) {
    if (this.closed) return false;
    const generation = this.guard.update(patch);
    const s = this.guard.state;
    const eligible = this.guard.active && s.permission && !s.selfMuted && !s.adminBlocked && !s.deafened && !s.suspended && !s.failed && !s.transition;
    const operation = eligible ? 'open' : 'block';
    const ack = new Promise(resolve => this.pending.set(generation, { resolve, operation }));
    this.node.port.postMessage({ type: operation, generation, config });
    try { const allowed = await deadline(ack, 1000, 'reset-timeout'); if (config) Object.assign(this.config, config); return allowed; }
    catch { this.guard.update({ failed: true }); return false; }
    finally { this.pending.delete(generation); }
  }
  async resume() {
    await this.context.resume();
    return this.reset({ suspended: false });
  }
  async getMetrics() {
    if (this.closed) return this.metrics;
    const value = new Promise(resolve => { this.resolveMetrics = resolve; }); this.node.port.postMessage({ type: 'metrics' });
    return deadline(value, 1000, 'metrics-timeout');
  }
  async dispose() {
    if (this.closed) return;
    this.closed = true; this.guard.dispose(); this.source?.disconnect(); this.source?.stop?.();
    this.signal?.removeEventListener('abort',this.abortListener);
    this.context.removeEventListener('statechange', this.stateListener); this.rawTrack?.removeEventListener('ended', this.ended);
    if (this.node) {
      const ack = new Promise(resolve => { this.resolveDisposed = resolve; });
      this.node.port.postMessage({ type: 'dispose' });
      try { await deadline(ack, 500, 'dispose-timeout'); } catch { /* closed context is final reclamation */ }
      this.node.disconnect(); this.node.onprocessorerror = null; this.node.port.onmessage = null; this.node.port.close();
    }
    for (const pending of this.pending.values()) pending.resolve(false); this.pending.clear();
    this.destination.disconnect(); await this.context.close();
    await this.disposeRaw?.();
    this.reason = 'stopped';
  }
}

// One receive destination, CALL/SCREEN gain then one common master, SFX separate.
// A silent graph runs automatic tests; audibility is a separate explicit action.
export class ReceiveGraph {
  constructor(context) {
    this.context = context; this.sources = new Map(); this.output = context.createGain(); this.output.gain.value = 0;
    this.master = context.createGain();
    this.peak = new AudioWorkletNode(context,'voice-receive-peak-spike',{outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    this.peak.onprocessorerror=()=>{this.output.gain.value=0;this.audible=false;this.failed=true;};
    this.master.connect(this.peak); this.peak.connect(this.output);
    this.sfx = context.createGain(); this.sfx.connect(this.output);
    this.adapter = null; this.outputGeneration = 0; this.audible = false; this.closed = false;
    this.state = { master: 100, personal: 100, share: 100, sfx: 70 };
  }
  add(alias, node, category, legacyElement = null) {
    if (!['CALL', 'SCREEN', 'SFX'].includes(category) || this.sources.has(alias)) throw Error('Unknown or duplicate receive flow');
    if (legacyElement) { legacyElement.muted = true; legacyElement.pause(); legacyElement.srcObject = null; legacyElement.remove(); }
    const gain = this.context.createGain(); gain.gain.value = 0;
    node.connect(gain); gain.connect(category === 'SFX' ? this.sfx : this.master);
    this.sources.set(alias, { node, gain, category }); this.configure(this.state);
  }
  async addRemote(alias, stream, category) {
    if(this.closed)throw Error('output-closed');
    if(this.sources.has(alias))throw Error('duplicate-receive-flow');
    // Chromium's remote WebRTC -> WebAudio source requires an active playout
    // consumer in the observed runtime. This element is NEVER an audible route.
    const consumer=document.createElement('audio');consumer.muted=true;consumer.volume=0;consumer.hidden=true;
    consumer.dataset.spikePlayout=alias;
    consumer.srcObject=stream;document.body.append(consumer);
    try{
      this.add(alias,this.context.createMediaStreamSource(stream),category);
      this.sources.get(alias).consumer=consumer;
      await deadline(consumer.play(),3000,'remote-playout-timeout');
      if(this.closed||!this.sources.has(alias))throw Error('output-closed');
    }catch(e){consumer.pause();consumer.srcObject=null;consumer.remove();this.remove(alias);throw e;}
  }
  remove(alias) { const item = this.sources.get(alias); if (!item) return; item.consumer?.pause();if(item.consumer){item.consumer.srcObject=null;item.consumer.remove();}item.node.disconnect(); item.gain.disconnect(); this.sources.delete(alias); }
  configure(patch) {
    Object.assign(this.state, patch); const g = receiveGains(this.state);
    // Immediate guards dominate ordinary 10 ms gain ramps.
    const apply = (param, value, immediate) => { param.cancelScheduledValues(this.context.currentTime); param.setValueAtTime(param.value, this.context.currentTime); if (immediate) param.setValueAtTime(value, this.context.currentTime); else param.linearRampToValueAtTime(value, this.context.currentTime + 0.010); };
    apply(this.master.gain, g.master, g.master === 0); apply(this.sfx.gain, g.sfx, g.sfx === 0);
    for (const item of this.sources.values()) { const value = item.category === 'CALL' ? g.call : item.category === 'SCREEN' ? g.screen : 1; apply(item.gain.gain, value, value === 0); }
  }
  async direct(sinkId = '') {
    if (this.closed) throw Error('output-closed');
    const generation = ++this.outputGeneration;
    this.output.gain.value = 0;
    if (sinkId && typeof this.context.setSinkId !== 'function') throw Error('context-setSinkId-unavailable');
    if (typeof this.context.setSinkId === 'function' && this.context.sinkId !== sinkId) await this.context.setSinkId(sinkId);
    if (this.closed || generation !== this.outputGeneration) return false;
    if (!this.adapter) { this.output.connect(this.context.destination); this.adapter = 'direct'; }
    if (this.adapter !== 'direct') throw Error('adapter-already-owned');
    this.output.gain.value = this.audible ? 1 : 0; return true;
  }
  async listen() { await this.context.resume(); await this.direct(); this.audible = true; this.output.gain.value = 1; }
  silence() { this.audible = false; this.output.gain.value = 0; }
  snapshot() { const consumers=[...this.sources.values()].filter(x=>x.consumer).map(x=>({muted:x.consumer.muted,volume:x.consumer.volume,paused:x.consumer.paused,readyState:x.consumer.readyState}));return { flowCount: this.sources.size, adapters: this.adapter ? 1 : 0, audiblePathsPerFlow: this.audible && this.adapter ? 1 : 0, retiredElementsAudible: 0, adapter: this.adapter, bridge: 'not_proven', remotePlayoutConsumers:consumers, consumerAudiblePaths:consumers.filter(x=>!x.muted&&x.volume>0&&!x.paused).length, routeCountIsEnergyProof:false }; }
  dispose() { this.closed = true; this.outputGeneration++; this.silence(); for (const key of [...this.sources.keys()]) this.remove(key); this.output.disconnect(); this.master.disconnect(); this.peak.disconnect(); this.peak.onprocessorerror=null; this.peak.port.close(); this.sfx.disconnect(); this.adapter = null; }
}

export async function localPeers(callTrack, screenTrack = null, videoTrack = null, signal = null) {
  const a = new RTCPeerConnection({ iceServers: [] }); const b = new RTCPeerConnection({ iceServers: [] });
  const tracks = []; const byMid = new Map(); const iceErrors = [];
  a.onicecandidate = e => { if (e.candidate) b.addIceCandidate(e.candidate).catch(() => iceErrors.push('candidate-rejected')); };
  b.onicecandidate = e => { if (e.candidate) a.addIceCandidate(e.candidate).catch(() => iceErrors.push('candidate-rejected')); };
  b.ontrack = e => {tracks.push(e.track);byMid.set(e.transceiver.mid,e.track);};
  // Deliberately screen-first. Selection by first audio sender would be wrong.
  const screenStream=new MediaStream([screenTrack,videoTrack].filter(Boolean));
  const screenSender = screenTrack ? a.addTrack(screenTrack, screenStream) : null;
  const videoSender = videoTrack ? a.addTrack(videoTrack, screenStream) : null;
  const callSender = a.addTrack(callTrack, new MediaStream([callTrack]));
  let changed;
  const close=()=>{signal?.removeEventListener('abort',close);a.removeEventListener('connectionstatechange',changed);a.onicecandidate=b.onicecandidate=b.ontrack=null;a.close();b.close();for(const track of tracks)track.stop();};
  signal?.addEventListener('abort',close,{once:true});
  try {
    signal?.throwIfAborted();
    await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription);
    await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
    await deadline(new Promise((resolve, reject) => {
      changed = () => { if (a.connectionState === 'connected') { a.removeEventListener('connectionstatechange', changed); resolve(); } else if (['failed','closed'].includes(a.connectionState)) { a.removeEventListener('connectionstatechange', changed); reject(Error('peer-failed')); } };
      a.addEventListener('connectionstatechange', changed); changed();
    }), 8000, 'local-peer-timeout');
    signal?.throwIfAborted();
    const remote=sender=>sender?byMid.get(a.getTransceivers().find(t=>t.sender===sender)?.mid):null;
    return { a, b, callSender, screenSender, videoSender, tracks, remoteCall:remote(callSender), remoteScreen:remote(screenSender), remoteVideo:remote(videoSender), iceErrors, close };
  } catch (error) { close(); throw error; }
}
