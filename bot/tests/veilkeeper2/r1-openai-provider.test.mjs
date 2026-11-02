import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {createOpenAIResponsesProvider} from '../../src/v2/openai-provider.js';
import {createModelGateway} from '../../src/v2/model-gateway.js';
import {GENERIC_TOOL_CONTRACTS} from '../../src/v2/tool-contracts.js';
const final=text=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text}]}],usage:{input_tokens:10,output_tokens:3}});
const call=()=>({status:'completed',output:[{type:'reasoning',id:'reason',summary:[],encrypted_content:'opaque-reasoning'},
  {type:'function_call',id:'fc',call_id:'call',name:'context_read',arguments:'{"topic":"conversation"}'}],usage:{input_tokens:5,output_tokens:2}});
const request=()=>({instructions:'Author scoped prose.',context:{source_ref:'m',trace_id:'t',utterance:'Interesting.',records:[]},tools:GENERIC_TOOL_CONTRACTS,history:[]});
function fixture(responses){const sent=[];const client=new OpenAI({apiKey:'offline-test-key',maxRetries:0,fetch:async(url,options)=>{sent.push({url:String(url),body:JSON.parse(options.body)});return new Response(JSON.stringify(responses.shift()),{status:200,headers:{'content-type':'application/json'}});}});return {sent,provider:createOpenAIResponsesProvider({client,model:'explicit-test-model',maxOutputTokens:700,timeoutMs:1000})};}
test('installed SDK emits the exact scoped Responses request without storage or implicit tool inventory',async()=>{
  const f=fixture([final('The clerk nods.')]),result=await f.provider.generate(request());assert.equal(result.text,'The clerk nods.');
  assert.match(f.sent[0].url,/\/v1\/responses$/);const body=f.sent[0].body;assert.equal(body.model,'explicit-test-model');assert.equal(body.store,false);assert.equal(body.max_output_tokens,700);
  assert.equal(body.parallel_tool_calls,false);assert.deepEqual(body.tools.map(t=>t.name),GENERIC_TOOL_CONTRACTS.map(t=>t.name));assert.ok(body.tools.every(t=>t.type==='function'&&t.strict===false));
  assert.deepEqual(JSON.parse(body.input[0].content),request().context);assert.equal(Object.hasOwn(body,'previous_response_id'),false);
});
test('tool continuation replays reasoning and exact call outputs through the installed SDK',async()=>{
  const f=fixture([call(),final('Reply')]),r=request(),first=await f.provider.generate(r);
  assert.equal(JSON.stringify(first.continuation),'{}');assert.equal(JSON.stringify(first).includes('opaque-reasoning'),false);
  const history=[{toolCalls:first.toolCalls,toolResults:[{id:'call',name:'context_read',result:{text:'Interesting.'}}]}];
  await f.provider.generate({...r,history,continuation:first.continuation});const input=f.sent[1].body.input;
  assert.equal(input[1].encrypted_content,'opaque-reasoning');assert.equal(input[2].call_id,'call');assert.deepEqual(input[3],{type:'function_call_output',call_id:'call',output:'{"text":"Interesting."}'});
});
test('continuations cannot cross context, native instructions, or forged call results',async()=>{
  const f=fixture([call()]),r=request(),first=await f.provider.generate(r),history=[{toolCalls:first.toolCalls,toolResults:[{id:'call',name:'context_read',result:{}}]}];
  for(const patch of [{context:{...r.context,source_ref:'other'}},{instructions:'Different instructions'},{continuation:{}}])await assert.rejects(f.provider.generate({...r,history,continuation:first.continuation,...patch}),/continuation/);
  await assert.rejects(f.provider.generate({...r,history:[{...history[0],toolResults:[{id:'other',name:'context_read',result:{}}]}],continuation:first.continuation}),/tool_results/);assert.equal(f.sent.length,1);
});
test('truncation, refusal and malformed tool arguments cannot become prose or executable calls',async()=>{
  for(const response of [{status:'incomplete',output:[]},final(''),{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]},
    {status:'completed',output:[{type:'function_call',call_id:'x',name:'action_propose',arguments:'not json'}]}]){
    const f=fixture([response]);if(response.output[0]?.content?.[0]?.text==='')assert.equal((await f.provider.generate(request())).text,'');
    else await assert.rejects(f.provider.generate(request()));
  }
});
test('transport errors are sanitized, bounded request options disable retries, and abort skips dispatch',async()=>{
  let calls=0;const provider=createOpenAIResponsesProvider({model:'explicit-test-model',timeoutMs:500,client:{responses:{create:async(body,options)=>{calls++;assert.equal(options.maxRetries,0);assert.equal(options.timeout,500);throw new Error('SECRET diagnostic');}}}});
  await assert.rejects(provider.generate(request()),e=>e.code==='provider_request_failed'&&!e.message.includes('SECRET'));assert.equal(calls,1);
  const controller=new AbortController();controller.abort();await assert.rejects(provider.generate({...request(),signal:controller.signal}));assert.equal(calls,1);
});
test('real gateway passes opaque provider continuation without exposing it to tools or the final draft',async()=>{
  const f=fixture([call(),final('Scoped reply')]),grant={},packet=request().context;
  const gateway=createModelGateway({provider:f.provider,contextAuthority:{inspect:()=>packet}}),capabilities=Object.fromEntries(GENERIC_TOOL_CONTRACTS.map(t=>[t.name,()=>({text:'Interesting.'})]));
  const draft=await gateway.generate(grant,{capabilities}),result=gateway.inspect(draft);
  assert.equal(result.modelCalls,2);assert.equal(result.usage.inputTokens,15);assert.equal(result.text,'Scoped reply');assert.equal(JSON.stringify(result).includes('opaque-reasoning'),false);
});
