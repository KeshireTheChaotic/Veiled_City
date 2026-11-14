import {performance} from 'node:perf_hooks';
import {GENERIC_TOOL_CONTRACTS} from './tool-contracts.js';
import {GM_CONVERSATION_INSTRUCTIONS} from './conversation-instructions.js';

const fail=code=>Object.assign(new Error(code),{code});

/** Ordinary speech takes one inference; optional native tool rounds are bounded.
 * Provider responses use {text,usage} or {toolCalls:[{id,name,arguments}],usage}.
 * Its result remains an unverified draft, never a publication grant.
 */
export function createModelGateway({contextAuthority,provider,clock=()=>performance.now()}){
  if(typeof contextAuthority?.inspect!=='function'||typeof provider?.generate!=='function')throw new TypeError('Scoped context authority and model provider required');
  const drafts=new WeakMap();
  async function generate(grant,{signal,capabilities=null,validateContext=()=>{}}={}){
    signal?.throwIfAborted();
    if(typeof validateContext!=='function'||capabilities!==null&&(Object.keys(capabilities).sort().join(',')!==GENERIC_TOOL_CONTRACTS.map(t=>t.name).sort().join(',')||Object.values(capabilities).some(f=>typeof f!=='function')))throw new TypeError('Exactly four native capabilities required');
    const packet=contextAuthority.inspect(grant),started=clock();
    if(packet.visibility==='npc_private'||packet.visibility==='gm_private')throw fail('private_context_is_not_audience_context');
    const validate=()=>{signal?.throwIfAborted();contextAuthority.inspect(grant);validateContext();};
    let result,continuation,modelCalls=0,toolCalls=0;const usage={},history=[],completed=new Map();
    while(modelCalls<6){
      validate();
      try{result=await provider.generate({instructions:GM_CONVERSATION_INSTRUCTIONS,context:packet,signal,...(continuation?{continuation}:{}),
        ...(capabilities?{tools:GENERIC_TOOL_CONTRACTS,history:structuredClone(history)}:{})});modelCalls++;}
      catch{throw fail(signal?.aborted?'generation_aborted':'generation_failed');}
      continuation=result?.continuation;
      validate();
      for(const key of ['inputTokens','outputTokens','cost'])if(Number.isFinite(result?.usage?.[key])&&result.usage[key]>=0)usage[key]=(usage[key]??0)+result.usage[key];
      if(result?.toolCalls===undefined||Array.isArray(result.toolCalls)&&result.toolCalls.length===0)break;
      if(!capabilities||!Array.isArray(result.toolCalls)||!result.toolCalls.length||result.toolCalls.length>4)throw fail('invalid_tool_batch');
      if(modelCalls===6||toolCalls+result.toolCalls.length>16)throw fail('tool_budget_exhausted');
      let calls;
      try{calls=JSON.parse(JSON.stringify(result.toolCalls));if(JSON.stringify(calls).length>128000)throw new Error();}catch{throw fail('invalid_tool_batch');}
      const results=[];
      for(const call of calls){
        validate();toolCalls++;
        if(!call||Object.keys(call).sort().join(',')!=='arguments,id,name'||typeof call.id!=='string'||!call.id||call.id.length>256||typeof call.name!=='string')throw fail('invalid_tool_call');
        const fingerprint=JSON.stringify([call.name,call.arguments]),prior=completed.get(call.id);let output;
        if(prior){if(prior.fingerprint!==fingerprint)throw fail('tool_call_replay_conflict');output=prior.output;}
        else{
          if(!Object.hasOwn(capabilities,call.name))output={status:'blocked',code:'unknown_capability'};
          else try{output=await capabilities[call.name](call.arguments);}catch{output={status:'blocked',code:'native_capability_failed'};}
          validate();completed.set(call.id,{fingerprint,output});
        }
        results.push({id:call.id,name:call.name,result:output});
      }
      history.push({toolCalls:calls,toolResults:results});
    }
    validate();
    if(!result||typeof result.text!=='string'||!result.text.trim()||result.text.length>20000)throw fail('invalid_model_draft');
    const draft=Object.freeze(Object.create(null));
    drafts.set(draft,Object.freeze({grant,text:result.text,traceId:packet.trace_id,modelCalls,toolCalls,validateContext,elapsedMs:Math.max(0,clock()-started),usage:Object.freeze(usage)}));
    return draft;
  }
  function inspect(draft){
    const row=draft&&drafts.get(draft);if(!row)throw fail('unissued_model_draft');
    contextAuthority.inspect(row.grant);row.validateContext();return row;
  }
  return Object.freeze({generate,inspect});
}
