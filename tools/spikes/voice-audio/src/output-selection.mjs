import { fault, safeFailure } from './action-diagnostics.mjs';
export class OutputSelection {
  constructor({media,permissions,page,secure,contextPrototype}){Object.assign(this,{media,permissions,page,secure,contextPrototype});this.devices=new Map();}
  capabilities(context){
    const policy=this.page.permissionsPolicy??this.page.featurePolicy;let speakerPolicy='not_queryable';
    try{if(policy?.features?.().includes('speaker-selection'))speakerPolicy=policy.allowsFeature('speaker-selection')?'allowed':'blocked';}catch{}
    return {secureContext:this.secure,picker:typeof this.media?.selectAudioOutput==='function',contextSetSinkId:typeof (context??this.contextPrototype)?.setSinkId==='function',enumerateDevices:typeof this.media?.enumerateDevices==='function',speakerPolicy};
  }
  async inspect(context){
    const value={...this.capabilities(context),speakerPermission:'not_queryable',exposedOutputs:0,exposedNonDefaultOutputs:0};
    try{const permission=await this.permissions?.query({name:'speaker-selection'});if(['granted','denied','prompt'].includes(permission?.state))value.speakerPermission=permission.state;}catch{}
    if(value.enumerateDevices)try{const devices=await this.media.enumerateDevices();value.exposedOutputs=devices.filter(d=>d.kind==='audiooutput'&&d.deviceId).length;value.exposedNonDefaultOutputs=devices.filter(d=>d.kind==='audiooutput'&&d.deviceId&&!['default','communications'].includes(d.deviceId)).length;}catch(e){value.enumerationError=safeFailure('sink','enumerate',e);}
    return value;
  }
  clear(){this.devices.clear();}
  async choose({context,consent,current,apply,notify}){
    let phase='precondition';const capabilities=this.capabilities(context);
    try{
      if(!consent||!context)throw fault('PLAYBACK_REQUIRED');
      if(!capabilities.secureContext)throw fault('INSECURE_CONTEXT');
      if(capabilities.speakerPolicy==='blocked')throw fault('POLICY_BLOCKED');
      if(!capabilities.contextSetSinkId)throw fault('CONTEXT_SINK_UNAVAILABLE');
      this.clear();
      if(capabilities.picker){
        phase='picker';notify({result:'PICKER_PENDING',capabilities});
        // No awaited permission/enumeration query before the native picker: retain user activation.
        const device=await this.media.selectAudioOutput();if(!current())throw fault('STALE_ACTION');
        phase='apply';await apply(device.deviceId);if(!current())throw fault('STALE_ACTION');
        return {result:'APPLIED',alias:'OUTPUT_SELECTED',capabilities};
      }
      if(!capabilities.enumerateDevices)throw fault('ENUMERATION_UNAVAILABLE');
      phase='enumerate';notify({result:'ENUMERATING',capabilities});
      const devices=await this.media.enumerateDevices();if(!current())throw fault('STALE_ACTION');
      for(const device of devices)if(device.kind==='audiooutput'&&device.deviceId&&!['default','communications'].includes(device.deviceId))this.devices.set(`OUTPUT_${this.devices.size+1}`,device);
      if(!this.devices.size)throw fault('NO_EXPOSED_OUTPUT');
      return {result:'CHOICES_AVAILABLE',capabilities,exposedAlternatives:this.devices.size};
    }catch(e){return {result:e.code==='STALE_ACTION'?'CANCELLED':'UNAVAILABLE_OR_FAILED',capabilities,error:safeFailure('sink',phase,e)};}
  }
  choices(){return [...this.devices].map(([alias,device])=>({alias,label:device.label||alias}));}
  async applyChoice(alias,{current,apply}){
    try{const device=this.devices.get(alias);if(!device)throw fault('CHOICE_REQUIRED');if(!current())throw fault('STALE_ACTION');await apply(device.deviceId);if(!current())throw fault('STALE_ACTION');return {result:'APPLIED',alias};}
    catch(e){return {result:e.code==='STALE_ACTION'?'CANCELLED':'UNAVAILABLE_OR_FAILED',error:safeFailure('sink','apply',e)};}
  }
}
