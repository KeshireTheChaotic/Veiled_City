import {createHash} from 'node:crypto';
import {GENERIC_TOOL_CONTRACTS} from './tool-contracts.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>Object.assign(new Error(code),{code});

/** Local Ollama chat transport. No retries, cloud fallback or model-driven endpoint selection. */
export function createOllamaProvider({model,baseUrl='http://localhost:11434',fetchImpl=fetch,timeoutMs=120000,maxOutputTokens=1024}){
  const url=new URL(baseUrl);
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||typeof model!=='string'||!model.trim()||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>32000)throw new TypeError('Local Ollama endpoint, model and bounded settings required');
  const continuations=new WeakMap();
  async function generate({instructions,context,tools=[],history=[],continuation,signal}){
    signal?.throwIfAborted();
    if(typeof instructions!=='string'||!context||!Array.isArray(history)||history.length>5||!Array.isArray(tools)||tools.length&&JSON.stringify(tools)!==JSON.stringify(GENERIC_TOOL_CONTRACTS))throw fail('invalid_provider_request');
    const binding=hash([instructions,context,tools]);let messages=[{role:'system',content:instructions},{role:'user',content:JSON.stringify(context)}];
    if(continuation){
      const prior=continuations.get(continuation),step=history.at(-1);
      if(!prior||prior.binding!==binding||history.length!==prior.historyLength+1||hash(history.slice(0,-1))!==prior.historyHash||JSON.stringify(step?.toolCalls)!==JSON.stringify(prior.calls)||!Array.isArray(step.toolResults)||step.toolResults.length!==prior.calls.length)throw fail('invalid_provider_continuation');
      messages=[...structuredClone(prior.messages),structuredClone(prior.message),...step.toolResults.map((result,i)=>{
        if(result.id!==prior.calls[i].id||result.name!==prior.calls[i].name)throw fail('invalid_provider_tool_results');
        return {role:'tool',tool_name:result.name,content:JSON.stringify(result.result)};
      })];
    }else if(history.length)throw fail('invalid_provider_continuation');
    const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
    let response;
    try{
      const result=await fetchImpl(new URL('/api/chat',url),{method:'POST',headers:{'Content-Type':'application/json'},signal:requestSignal,body:JSON.stringify({model,messages,stream:false,think:false,options:{num_predict:maxOutputTokens},...(tools.length?{tools:tools.map(t=>({type:'function',function:t}))}:{})})});
      if(!result.ok)throw new Error();response=await result.json();
    }catch{throw fail(signal?.aborted?'provider_aborted':'provider_request_failed');}
    signal?.throwIfAborted();
    const message=response?.message;
    if(response?.done!==true||response.done_reason==='length'||message?.role!=='assistant'||typeof message.content!=='string'||message.tool_calls!==undefined&&!Array.isArray(message.tool_calls))throw fail('provider_response_incomplete');
    const usage={};for(const [from,to] of [['prompt_eval_count','inputTokens'],['eval_count','outputTokens']])if(Number.isFinite(response[from])&&response[from]>=0)usage[to]=response[from];
    const calls=(message.tool_calls??[]).map((call,i)=>{
      const fn=call?.function;if(typeof fn?.name!=='string'||!tools.some(t=>t.name===fn.name)||!fn.arguments||typeof fn.arguments!=='object'||Array.isArray(fn.arguments))throw fail('invalid_provider_tool_call');
      return {id:`ollama:${history.length}:${i}`,name:fn.name,arguments:structuredClone(fn.arguments)};
    });
    if(calls.length){const token=Object.freeze(Object.create(null));continuations.set(token,{binding,messages:structuredClone(messages),message:structuredClone(message),calls,historyLength:history.length,historyHash:hash(history)});return {toolCalls:calls,usage,continuation:token};}
    return {text:message.content,usage};
  }
  return Object.freeze({generate});
}
