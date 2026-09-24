const report = {id:'va3b-lifetime',guardClosedBeforePreparation:true,physicalCapture:false,recording:false,speaker:false,peers:0,cycles:[],accounts:[],maximumOwners:{},mainCounters:{
  AUDIO_CONTEXT_CREATE_TOTAL:0,AUDIO_CONTEXT_CLOSE_TOTAL:0,WORKLET_ADD_MODULE_TOTAL:0,WORKLET_NODE_CREATE_TOTAL:0,
  PORT_CREATE_TOTAL:0,PORT_CLOSE_TOTAL:0,SOURCE_CREATE_TOTAL:0,SOURCE_STOP_TOTAL:0,DESTINATION_CREATE_TOTAL:0,DESTINATION_STOP_TOTAL:0}};
const assert=(x,reason)=>{if(!x)throw Error(reason);};
const post=async(url,value)=>{const r=await fetch(url,{method:'POST',...(value&&{headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})});if(!r.ok)throw Error(await r.text());};
const phase=(name,seconds)=>post('/phase',{name,seconds});
const hold=async()=>{const r=await fetch('/hold');if(!r.ok)throw Error('Sampler stopped');};
const identify=async()=>{await post('/identify-begin');performance.mark('VA3B_MEMORY_TARGET');await post('/identify-end');performance.clearMarks('VA3B_MEMORY_TARGET');};
const instances=new Set();
function owners(){
  const value={contexts:0,nodes:0,ports:0,listeners:0,tracks:0,sources:0,destinations:0,pending:0,activeGenerations:0,rnnoiseStates:0};
  for(const x of instances){value.contexts+=!!x.context;value.nodes+=!!x.node;value.ports+=!!x.node;value.listeners+=x.node?2:0;
    value.tracks+=!!x.track;value.sources+=!!x.source;value.destinations+=!!x.destination;value.pending+=x.pending.size;
    value.activeGenerations+=x.active;value.rnnoiseStates+=x.mode==='RNNOISE'&&x.active?1:0;}
  for(const [key,n]of Object.entries(value))report.maximumOwners[key]=Math.max(report.maximumOwners[key]??0,n);
  return value;
}
class RuntimeOwner{
  constructor(mode,variant){this.mode=mode;this.variant=variant;this.pending=new Map();this.revision=0;this.request=0;this.active=false;this.errors=0;this.workletCounters={};instances.add(this);}
  wait(type){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(type);reject(Error(`Timeout ${type}`));},3000);
    this.pending.set(type,{resolve:data=>{clearTimeout(timer);this.pending.delete(type);resolve(data);},reject:error=>{clearTimeout(timer);this.pending.delete(type);reject(error);}});});}
  async ask(type,extra={}){const response=this.wait(type);this.node.port.postMessage({type,request:++this.request,revision:this.revision,...extra});return response;}
  async ensure(){
    if(!this.context){this.context=new AudioContext({sampleRate:48000});report.mainCounters.AUDIO_CONTEXT_CREATE_TOTAL++;
      await this.context.audioWorklet.addModule(this.mode==='RNNOISE'?'/lifetime-worklet.js':'/lifetime-native.js');report.mainCounters.WORKLET_ADD_MODULE_TOTAL++;}
    if(!this.node){
      const created=this.wait('created');
      this.node=new AudioWorkletNode(this.context,'va3b-lifetime',{outputChannelCount:[1],channelCount:1,channelCountMode:'explicit',processorOptions:{channels:1}});
      report.mainCounters.WORKLET_NODE_CREATE_TOTAL++;report.mainCounters.PORT_CREATE_TOTAL++;
      this.node.port.onmessage=({data})=>{
        if(data.counters)this.workletCounters=data.counters;
        if(data.type==='failure'){this.errors++;if(this.track)this.track.enabled=false;for(const p of [...this.pending.values()])p.reject(Error(data.reason));}
        else this.pending.get(data.type)?.resolve(data);
      };
      this.node.onprocessorerror=()=>{this.errors++;if(this.track)this.track.enabled=false;for(const p of [...this.pending.values()])p.reject(Error('processorerror'));};
      await created;
    }
    owners();
  }
  async start(){
    assert(!this.active,'Capture already active');assert([...instances].every(other=>other===this||!other.active),'Previous capture guard remains active');await this.ensure();this.revision++;
    this.source=this.context.createOscillator();this.gain=this.context.createGain();this.gain.gain.value=.1;
    this.destination=this.context.createMediaStreamDestination();this.destination.channelCount=1;
    this.track=this.destination.stream.getAudioTracks()[0];this.track.enabled=false;
    report.mainCounters.SOURCE_CREATE_TOTAL++;report.mainCounters.DESTINATION_CREATE_TOTAL++;
    this.source.connect(this.gain);this.gain.connect(this.node);this.node.connect(this.destination);
    const ready=this.wait('ready');this.node.port.postMessage({type:'activate',revision:this.revision});
    this.source.start();await this.context.resume();const ack=await ready;
    assert(ack.revision===this.revision&&!ack.allowed&&!this.track.enabled&&ack.silentViolations===0,'Premature or stale readiness');
    // An old generation cannot open a freshly prepared signal state.
    this.node.port.postMessage({type:'open',revision:this.revision-1});
    const blocked=await this.ask('metrics');assert(!blocked.allowed&&blocked.silentViolations===0,'Stale open escaped guard');
    this.active=true;owners();return ack;
  }
  async open(){assert(this.active&&this.context.state==='running','Current permit missing');this.node.port.postMessage({type:'open',revision:this.revision});
    const ack=await this.ask('metrics');assert(ack.allowed&&ack.revision===this.revision,'Open was not committed');this.track.enabled=true;return ack;}
  async stop(){
    if(!this.active)return null;
    this.track.enabled=false;this.active=false;this.revision++;
    const ack=await this.ask(this.variant==='V1'?'retire':'stop');
    const c=ack.cleanup;assert(c.fifosZero&&c.scratchZero&&c.detectorReset&&c.peakReset&&c.temporalStateReset&&c.statePointer===0&&c.scratchPointer===0&&!c.liveState,'Signal cleanup failed');
    assert(ack.silentViolations===0&&!ack.allowed&&!ack.liveState&&!ack.liveScratch&&!ack.failed&&ack.overflow===0&&ack.underflow===0,'Signal integrity failed');
    this.source.stop();this.source.disconnect();this.gain.disconnect();this.node.disconnect();this.destination.disconnect();
    this.destination.stream.getTracks().forEach(t=>t.stop());
    report.mainCounters.SOURCE_STOP_TOTAL++;report.mainCounters.DESTINATION_STOP_TOTAL++;
    assert(this.track.readyState==='ended','Track not ended');
    this.source=this.gain=this.destination=this.track=null;
    if(this.variant==='V1')this.closeNode();
    await this.context.suspend();
    assert(this.pending.size===0&&this.errors===0,'Pending request or processor error');
    return {cleanup:c,metrics:ack,contextState:this.context.state,noSignalReferences:!this.track&&!this.source&&!this.destination,
      pending:this.pending.size,errors:this.errors,owners:owners()};
  }
  closeNode(){this.node.port.onmessage=null;this.node.onprocessorerror=null;this.node.port.close();this.node.disconnect();this.node=null;report.mainCounters.PORT_CLOSE_TOTAL++;}
  async dispose(){
    await this.stop();
    if(this.node){this.revision++;const ack=await this.ask('retire');assert(!ack.liveState&&ack.cleanup.scratchZero,'Retire failed');this.closeNode();}
    if(this.context){await this.context.close();report.mainCounters.AUDIO_CONTEXT_CLOSE_TOTAL++;this.context=null;}
    instances.delete(this);return {workletCounters:this.workletCounters,owners:owners(),pending:this.pending.size,errors:this.errors};
  }
}
let native,candidate;
try{
  const {cycles:cycleCount,...configuration}=await(await fetch('/configuration')).json();Object.assign(report,configuration,{cycleCount});
  await identify();native=new RuntimeOwner('NATIVE','V2');await native.start();await native.open();
  await phase('COMMON_SETTLING',205);await hold();await phase('COMMON_STABLE_BASELINE',10);await hold();
  candidate=new RuntimeOwner(report.mode,report.variant);
  await phase(`${report.mode}_PRE_CYCLES`,10);await hold();
}catch(error){report.result='HARNESS_FAILED';report.error=error.message;}
if(!report.error){
  try{
    for(let cycle=1;cycle<=report.cycleCount;cycle++){
      const begin=performance.now();await phase(`${report.mode}_CYCLE_${cycle}_ACTIVE`,3);
      const nativeStop=await native.stop();const ready=await candidate.start();const active=await candidate.open();
      const activeTransactionUpperBoundMs=performance.now()-begin;await hold();
      const lastActiveMetrics=await candidate.ask('metrics');report.lastActiveObservation={cycle,...lastActiveMetrics};
      assert(!lastActiveMetrics.failed && !lastActiveMetrics.overflow && !lastActiveMetrics.underflow && !lastActiveMetrics.silentViolations, 'Active DSP integrity: '+JSON.stringify({failed:lastActiveMetrics.failed,overflow:lastActiveMetrics.overflow,underflow:lastActiveMetrics.underflow,silentViolations:lastActiveMetrics.silentViolations,gaps:lastActiveMetrics.gaps}));
      if(report.mode==='RNNOISE')assert(lastActiveMetrics.rnnoiseFrames>0,'RNNoise did not process');
      const stopBegin=performance.now();await phase(`${report.mode}_CYCLE_${cycle}_STOPPED`,3);
      const cleanup=await candidate.stop();await native.start();await native.open();
      const stopTransactionUpperBoundMs=performance.now()-stopBegin;await hold();
      report.cycles.push({cycle,ready,active,lastActiveMetrics,cleanup,nativeCleanupPass:!!nativeStop?.cleanup.fifosZero,activeTransactionUpperBoundMs,stopTransactionUpperBoundMs});
    }
    await phase(`${report.mode}_POST_CYCLES`,10);await hold();
    if(report.kind==='final'){
      await phase(`${report.mode}_ASSET_LOAD`,1);await native.stop();await candidate.start();await candidate.open();await hold();
      const audioStart=candidate.context.currentTime,first=await candidate.ask('metrics');report.continuous={first,observations:[]};
      for(let minute=0;minute<10;minute++){await phase(`${report.mode}_LONG_${minute}`,60.1);await hold();report.continuous.observations.push(await candidate.ask('metrics'));}
      report.continuous.audioSeconds=candidate.context.currentTime-audioStart;
      const last=report.continuous.observations.at(-1);
      report.continuous.processedSeconds=report.mode==='RNNOISE'?(last.rnnoiseFrames-first.rnnoiseFrames)/100:(last.samples-first.samples)/48000;
      assert(report.continuous.processedSeconds>=600,'Fewer than ten minutes processed');
      assert(report.continuous.observations.every(m=>!m.failed && !m.overflow && !m.underflow && !m.silentViolations),'Continuous DSP integrity');
      assert(report.continuous.audioSeconds>=600,'Continuous interval below ten minutes');
      report.continuous.cleanup=await candidate.stop();await native.start();await native.open();
      await phase(`${report.mode}_POST_LONG`,10);await hold();
      report.primaryDisposal=await candidate.dispose();candidate=null;
      for(let account=1;account<=5;account++){
        await phase(`${report.mode}_ACCOUNT_${account}`,3);await native.stop();candidate=new RuntimeOwner(report.mode,report.variant);
        const ready=await candidate.start();await candidate.open();await hold();
        const cleanup=await candidate.dispose();candidate=null;await native.start();await native.open();report.accounts.push({account,ready,cleanup});
      }
      await phase(`${report.mode}_ACCOUNT_POST`,10);await hold();
    }else{report.primaryDisposal=await candidate.dispose();candidate=null;}
    report.nativeDisposal=await native.dispose();native=null;report.finalOwners=owners();
    assert(Object.values(report.finalOwners).every(x=>x===0),'Owner remains at completion');
    if(report.mode==='RNNOISE'){
      await phase('RNNOISE_CPU',1);
      const {measureLifetimeCPU}=await import('/lifetime-cpu.js');
      report.cpu=measureLifetimeCPU(report.variant,report.cycles[0].ready.quantumMin);
      await hold();
    }
    report.frameClockReview={required:true,meaning:'currentFrame discontinuity counter; not direct CPU timing or automatically a DSP FIFO failure',cycles:report.cycles.filter(c=>c.lastActiveMetrics.gaps).map(c=>({cycle:c.cycle,atReady:c.ready.gaps,atOpen:c.active.gaps,atEnd:c.lastActiveMetrics.gaps})),continuous:report.continuous?{first:report.continuous.first.gaps,last:report.continuous.observations.at(-1).gaps}:null};
    await identify();report.result='COMPLETE';
  }catch(error){report.result='HARNESS_FAILED';report.error=error.message;}
}
report.emergencyCleanup=[];for(const instance of [...instances]){try{report.emergencyCleanup.push(await instance.dispose());}catch(error){report.finalCleanupError=error.message;}}report.ownersAfterFinally=owners();
await post('/report',report);
