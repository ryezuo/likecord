const names=new Set(['Error','AbortError','NotAllowedError','NotFoundError','InvalidStateError','NotSupportedError','SecurityError','TypeError','TimeoutError']);
const codes=new Set(['SESSION_ACTIVE','ACTION_BUSY','PLAYBACK_REQUIRED','PICKER_UNAVAILABLE','CONTEXT_SINK_UNAVAILABLE','ENUMERATION_UNAVAILABLE','NO_EXPOSED_OUTPUT','POLICY_BLOCKED','INSECURE_CONTEXT','CHOICE_REQUIRED','STALE_ACTION','ACK_REJECTED','AUDIO_NOT_RUNNING','module-timeout','ready-timeout','metrics-timeout','processorerror','processor-error']);
export function fault(code){const e=new Error(code);e.code=code;return e;}
export function safeFailure(operation,phase,error){
  const code=codes.has(error?.code)?error.code:codes.has(error?.message)?error.message:'RUNTIME_ERROR';
  return {operation,phase,name:names.has(error?.name)?error.name:'Error',code};
}
export function abortableDelay(ms,signal){return new Promise((resolve,reject)=>{
  let timer;const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve();};
  const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Cancelled','AbortError'));};
  if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(finish,ms);
});}
