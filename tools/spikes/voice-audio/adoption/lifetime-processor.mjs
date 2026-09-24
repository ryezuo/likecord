// Harness-only protocol around unmodified processing algorithms.
export function lifetimeProcessor(Base, createRuntime, createSignal) {
  const counters = { MODULE_EVALUATIONS:1, PROCESSOR_CREATE_TOTAL:0, PROCESSOR_REUSE_TOTAL:0,
    RUNTIME_CREATE_TOTAL:0, RUNTIME_DISPOSE_TOTAL:0, STATE_CREATE_TOTAL:0, STATE_RESET_TOTAL:0,
    STATE_DESTROY_TOTAL:0, SCRATCH_ALLOC_TOTAL:0, SCRATCH_FREE_TOTAL:0, PORT_CREATE_TOTAL:0, PORT_CLOSE_TOTAL:0 };
  return class extends Base {
    constructor(options) {
      super(options);
      if (sampleRate !== 48000) throw Error('MODE_INCOMPATIBLE');
      this.nativeHandler = this.port.onmessage;
      this.runtime = createRuntime?.();
      counters.PROCESSOR_CREATE_TOTAL++; counters.PORT_CREATE_TOTAL++;
      if (this.runtime) counters.RUNTIME_CREATE_TOTAL++;
      this.lifeRevision = 0; this.signal = null; this.lifeReady = false; this.retired = false;
      this.activations = 0; this.callbacks = 0; this.samples = 0; this.engineFrames = 0;
      this.silentViolations = 0; this.staleOpens = 0; this.quantumMin = Infinity; this.quantumMax = 0;
      this.previousFrame = null; this.previousLength = 0; this.gaps = 0;
      this.port.onmessage = ({data}) => {
        if (this.retired) return;
        try {
          if (data.type === 'activate' && data.revision > this.lifeRevision && !this.signal) {
            this.lifeRevision = data.revision; this.lifeReady = false; this.silentQuanta = 0;
            if (this.activations++) counters.PROCESSOR_REUSE_TOTAL++;
            if (this.runtime) {
              this.signal = createSignal(this.runtime, counters);
              for (let i=0;i<20;i++) { this.signal.frame.fill(0); this.signal.engine.process(this.signal.frame); }
              this.signal.engine.reset(); this.signal.clear();
            } else {
              this.nativeHandler({data:{type:'configure',revision:data.revision,preferences:{inputGainPercent:100,voiceActivationEnabled:true,voiceActivationThresholdDbfs:-50}}});
              this.nativeHandler({data:{type:'reset',revision:data.revision}});
              this.signal = true;
            }
            this.previousFrame = null;
          } else if (data.type === 'open') {
            if (data.revision !== this.lifeRevision || !this.lifeReady || !this.signal) this.staleOpens++;
            else if (this.runtime) this.signal.activate();
            else this.nativeHandler({data:{type:'allow',revision:data.revision}});
          } else if (data.type === 'stop' || data.type === 'retire') {
            if (data.revision < this.lifeRevision) return;
            this.lifeRevision = data.revision; this.lifeReady = false;
            const cleanup = this.clearSignal();
            if (data.type === 'retire') {
              this.retired = true;
              if (this.runtime) counters.RUNTIME_DISPOSE_TOTAL++;
              this.runtime = null; counters.PORT_CLOSE_TOTAL++;
            }
            this.port.postMessage({type:data.type,request:data.request,revision:this.lifeRevision,cleanup,...this.metrics()});
            if (this.retired) { this.nativeHandler = null; this.port.onmessage = null; this.port.close(); }
          } else if (data.type === 'metrics') this.port.postMessage({type:'metrics',request:data.request,...this.metrics()});
        } catch (error) {
          this.lifeReady = false; this.clearSignal();
          this.port.postMessage({type:'failure',reason:error.message});
        }
      };
      this.port.postMessage({type:'created',...this.metrics()});
    }
    clearSignal() {
      if (this.runtime && this.signal) {
        const dsp = this.signal, engine = dsp.engine;
        this.engineFrames += dsp.engineCalls;
        dsp.block(); engine.reset();
        const clean = { fifosZero:[dsp.frame,dsp.output,dsp.energy,dsp.preroll].every(a=>a.every(x=>x===0)),
          scratchZero:engine.scratchZero(), detectorReset:dsp.energySum===0 && dsp.hold===0 && dsp.envelope===0 && !dsp.open && dsp.level===-120,
          peakReset:dsp.limitGain===1, temporalStateReset:true };
        dsp.dispose(); this.signal = null;
        return {...clean,statePointer:engine.state,scratchPointer:engine.pointer,liveState:false};
      }
      if (!this.runtime && this.nativeHandler) {
        this.nativeHandler({data:{type:'block',revision:this.lifeRevision}});
        this.peakValues.fill(0); this.peakTimes.fill(0); this.meterFrames = 0;
      }
      this.signal = null;
      return {fifosZero:true,scratchZero:true,detectorReset:true,peakReset:true,temporalStateReset:true,statePointer:0,scratchPointer:0,liveState:false};
    }
    metrics() {
      return {counters:{...counters},callbacks:this.callbacks,samples:this.samples,rnnoiseFrames:this.engineFrames+(this.runtime && this.signal ? this.signal.engineCalls : 0),
        liveState:!!(this.runtime && this.signal),liveScratch:!!(this.runtime && this.signal),ready:this.lifeReady,
        allowed:this.runtime ? !!this.signal?.allowed : !!this.allowed,revision:this.lifeRevision,
        heapBytes:this.runtime?.HEAPU8.byteLength ?? 0, quantumMin:this.quantumMin,quantumMax:this.quantumMax,
        silentViolations:this.silentViolations,staleOpens:this.staleOpens,gaps:this.gaps,failed:!!this.signal?.failed,
        overflow:this.signal?.overflows ?? 0,underflow:this.signal?.underflows ?? 0,directCPUClock:typeof performance==='undefined'?'not_available':'available_not_instrumented'};
    }
    process(inputs,outputs) {
      const output = outputs[0]?.[0]; if (!output) return !this.retired;
      output.fill(0); if (this.retired) return false;
      this.callbacks++; this.samples += output.length;
      this.quantumMin = Math.min(this.quantumMin,output.length); this.quantumMax = Math.max(this.quantumMax,output.length);
      if (!this.signal) return true;
      if (this.previousFrame !== null && currentFrame !== this.previousFrame+this.previousLength) this.gaps++;
      this.previousFrame = currentFrame; this.previousLength = output.length;
      if (this.runtime) this.signal.process(inputs[0]?.[0],output);
      else Base.prototype.process.call(this,inputs,outputs);
      const allowed = this.runtime ? this.signal.allowed : this.allowed;
      if (!allowed && output.some(x=>x!==0)) this.silentViolations++;
      if (!this.lifeReady && ++this.silentQuanta >= 2) {
        this.lifeReady = true; this.port.postMessage({type:'ready',...this.metrics()});
      }
      return true;
    }
  };
}
