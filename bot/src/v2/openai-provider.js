import {createHash} from 'node:crypto';
import {GENERIC_TOOL_CONTRACTS} from './tool-contracts.js';
import {conversationInput} from './conversation-input.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const error=code=>Object.assign(new Error(code),{code});

/** Explicit SDK dependency and model selection; no environment reads or automatic
 * retries. Continuations preserve provider reasoning privately, bound to one packet.
 */
export function createOpenAIResponsesProvider({client,model,maxOutputTokens=2048,timeoutMs=60000}){
  if(typeof client?.responses?.create!=='function'||typeof model!=='string'||!model.trim()
    ||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>32000
    ||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new TypeError('Explicit Responses client/model and bounded settings required');
  const continuations=new WeakMap();
  async function generate({instructions,context,tools=[],history=[],continuation,signal}){
    signal?.throwIfAborted();
    if(typeof instructions!=='string'||!context||!Array.isArray(history)||history.length>5
      ||!Array.isArray(tools)||tools.length&&JSON.stringify(tools)!==JSON.stringify(GENERIC_TOOL_CONTRACTS))throw error('invalid_provider_request');
    const binding=hash([instructions,context,tools]),previous=continuation&&continuations.get(continuation);
    let input=[{role:'user',content:conversationInput(context)}];
    if(continuation){
      if(!previous||previous.binding!==binding||history.length!==previous.historyLength+1||hash(history.slice(0,-1))!==previous.historyHash)throw error('invalid_provider_continuation');
      const step=history.at(-1);
      if(JSON.stringify(step.toolCalls)!==JSON.stringify(previous.calls)||!Array.isArray(step.toolResults)||step.toolResults.length!==previous.calls.length)throw error('invalid_provider_tool_results');
      const outputs=step.toolResults.map((result,i)=>{
        if(result.id!==previous.calls[i].id||result.name!==previous.calls[i].name)throw error('invalid_provider_tool_results');
        return {type:'function_call_output',call_id:result.id,output:JSON.stringify(result.result)};
      });
      input=[...previous.input,...previous.output,...outputs];
    }else if(history.length)throw error('missing_provider_continuation');
    let response;
    try{response=await client.responses.create({model,instructions,input,store:false,max_output_tokens:maxOutputTokens,
      include:['reasoning.encrypted_content'],...(tools.length?{tools:tools.map(t=>({type:'function',...t,strict:false})),parallel_tool_calls:false}:{})},
      {signal,timeout:timeoutMs,maxRetries:0});}
    catch{throw error(signal?.aborted?'provider_aborted':'provider_request_failed');}
    signal?.throwIfAborted();
    if(response?.status!=='completed'||!Array.isArray(response.output))throw error('provider_response_incomplete');
    const calls=[],texts=[],ids=new Set();
    for(const item of response.output){
      if(item.type==='function_call'){
        if(typeof item.call_id!=='string'||!item.call_id||ids.has(item.call_id)||typeof item.name!=='string'||typeof item.arguments!=='string')throw error('invalid_provider_tool_call');
        let args;try{args=JSON.parse(item.arguments);}catch{throw error('invalid_provider_tool_arguments');}
        ids.add(item.call_id);calls.push({id:item.call_id,name:item.name,arguments:args});
      }else if(item.type==='message'){
        if(item.role!=='assistant'||!Array.isArray(item.content))throw error('invalid_provider_message');
        for(const part of item.content){if(part.type==='refusal')throw error('provider_refused');if(part.type!=='output_text'||typeof part.text!=='string')throw error('invalid_provider_message');texts.push(part.text);}
      }else if(item.type!=='reasoning')throw error('unsupported_provider_output');
    }
    const usage={};for(const [from,to] of [['input_tokens','inputTokens'],['output_tokens','outputTokens']])if(Number.isFinite(response.usage?.[from])&&response.usage[from]>=0)usage[to]=response.usage[from];
    if(calls.length){
      const token=Object.freeze(Object.create(null));
      continuations.set(token,{binding,historyLength:history.length,historyHash:hash(history),input:structuredClone(input),output:structuredClone(response.output),calls});
      return {toolCalls:calls,usage,continuation:token};
    }
    return {text:texts.join('\n'),usage};
  }
  return Object.freeze({generate});
}
