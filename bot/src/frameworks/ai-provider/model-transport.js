import {randomUUID} from 'node:crypto';
import {setTimeout as waitForRetry} from 'node:timers/promises';

/** Owns provider dispatch and bounded transport retries; application observability is injected. */
export function createModelTransport({client,config,metrics,traceForGuild=()=>null,
  now=()=>performance.now(),wait=waitForRetry,randomId=randomUUID}={}){
  if(!config)throw new TypeError('AI provider configuration is required.');
  if(!client?.responses?.create)throw new TypeError('AI Responses client is required.');
  async function requestModel(request,{guildId,signal,retry=false,purpose='other'}={}){
    const limit=Number.isInteger(config.openaiMaxRetries)?Math.max(0,Math.min(5,config.openaiMaxRetries)):1;
    for(let attempt=0;attempt<=limit;attempt++){
      if(signal?.aborted)throw Object.assign(new Error('Model operation cancelled before dispatch.'),{code:'AI_GENERATION_DEADLINE'});
      const start=now();
      let response=null;
      try{
        response=await client.responses.create(request,{signal,maxRetries:0});
        if(signal?.aborted)throw Object.assign(new Error('Model response arrived after cancellation.'),{code:'AI_GENERATION_DEADLINE'});
        metrics.record('model_request',{guildId,model:request.model,durationMs:now()-start,
          inputTokens:response?.usage?.input_tokens,outputTokens:response?.usage?.output_tokens,
          cachedInputTokens:response?.usage?.input_tokens_details?.cached_tokens,retries:(attempt>0||retry)?1:0});
        traceForGuild(guildId)?.model(response?.usage,{purpose,model:request.model,ms:now()-start,retry:attempt>0});
        return response;
      }catch(error){
        const code=signal?.aborted?'AI_GENERATION_DEADLINE':'PROVIDER_ERROR';
        traceForGuild(guildId)?.model(response?.usage,{purpose,model:request.model,ms:now()-start,retry:attempt>0,error:code});
        metrics.record('model_request',{guildId,model:request.model,durationMs:now()-start,status:'error',errorCode:code,
          inputTokens:response?.usage?.input_tokens,outputTokens:response?.usage?.output_tokens,
          cachedInputTokens:response?.usage?.input_tokens_details?.cached_tokens,
          retries:(attempt>0||retry)?1:0});
        metrics.incident('model',{guildId,reference:randomId(),code});
        const recoverable=[408,409,429].includes(error.status)||error.status>=500
          ||['APIConnectionError','APIConnectionTimeoutError'].includes(error.name);
        if(signal?.aborted||!recoverable||attempt===limit)throw error;
        // A long server delay is a bounded deferral, not permission to retry sooner than requested.
        const hint=error.headers?.get?.('retry-after')??error.headers?.['retry-after']??error.headers?.['Retry-After'];
        const hintedMs=typeof hint==='string'?(/^\d+(?:\.\d+)?$/.test(hint.trim())
          ?Number(hint)*1000:Date.parse(hint)-Date.now()):NaN;
        const delayMs=Math.max(Math.min(1000,250*2**attempt),Number.isFinite(hintedMs)?Math.max(0,hintedMs):0);
        if(delayMs>1000)throw error;
        await wait(delayMs,undefined,{signal});
        if(signal?.aborted)throw error;
      }
    }
  }
  return {client,requestModel};
}
