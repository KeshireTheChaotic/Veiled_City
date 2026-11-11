import test from 'node:test';
import assert from 'node:assert/strict';
import {createOllamaProvider} from '../../src/v2/ollama-provider.js';
import {createProviderFromEnv} from '../../src/v2/native-start.js';
import {GENERIC_TOOL_CONTRACTS} from '../../src/v2/tool-contracts.js';
const input={instructions:'Portray only the audience scene.',context:{utterance:'Interesting.'},tools:GENERIC_TOOL_CONTRACTS};
test('local transport preserves natural prose, four generic tools and usage',async()=>{
  const p=createOllamaProvider({model:'qwen3.5:4b',fetchImpl:async(url,options)=>{
    assert.equal(String(url),'http://localhost:11434/api/chat');const body=JSON.parse(options.body);
    assert.equal(body.model,'qwen3.5:4b');assert.equal(body.stream,false);assert.equal(body.think,false);assert.equal(body.options.num_predict,1024);
    assert.deepEqual(body.tools.map(t=>t.function),GENERIC_TOOL_CONTRACTS);assert.equal(body.messages[1].content,JSON.stringify(input.context));
    return {ok:true,json:async()=>({done:true,message:{role:'assistant',content:'The clerk raises an eyebrow.'},prompt_eval_count:20,eval_count:8})};
  }});
  assert.deepEqual(await p.generate(input),{text:'The clerk raises an eyebrow.',usage:{inputTokens:20,outputTokens:8}});
});
test('tool continuation is bound to its packet and exact native results',async()=>{
  let requests=0;const p=createOllamaProvider({model:'m',fetchImpl:async(url,options)=>{
    requests++;const body=JSON.parse(options.body);
    if(requests===1)return {ok:true,json:async()=>({done:true,message:{role:'assistant',content:'',tool_calls:[{function:{name:'state_inspect',arguments:{receipt_ref:'r'}}}]}})};
    assert.deepEqual(body.messages.at(-1),{role:'tool',tool_name:'state_inspect',content:'{"status":"pending"}'});
    return {ok:true,json:async()=>({done:true,message:{role:'assistant',content:'The outcome remains unresolved.'}})};
  }});
  const first=await p.generate(input),history=[{toolCalls:first.toolCalls,toolResults:[{...first.toolCalls[0],result:{status:'pending'}}]}];
  await assert.rejects(p.generate({...input,context:{utterance:'Other scene'},history,continuation:first.continuation}),/continuation/);
  assert.equal(requests,1);assert.match((await p.generate({...input,history,continuation:first.continuation})).text,/unresolved/);assert.equal(requests,2);
});
test('errors, truncated output, unknown tools and cancellation do not retry or fall back',async()=>{
  for(const response of [{ok:false},{ok:true,json:async()=>({done:false})},{ok:true,json:async()=>({done:true,done_reason:'length',message:{role:'assistant',content:'partial'}})},{ok:true,json:async()=>({done:true,message:{role:'assistant',content:'',tool_calls:[{function:{name:'damage',arguments:{}}}]}})}]){
    let calls=0;const p=createOllamaProvider({model:'m',fetchImpl:async()=>{calls++;return response;}});await assert.rejects(p.generate(input));assert.equal(calls,1);
  }
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(createOllamaProvider({model:'m',fetchImpl:async()=>{calls++;}}).generate({...input,signal:controller.signal}));assert.equal(calls,0);
  assert.throws(()=>createOllamaProvider({model:'m',baseUrl:'https://example.com'}),/Local Ollama/);
});
test('native backend defaults to local Ollama without an API key and retains the call cap',async()=>{
  const p=await createProviderFromEnv({VK2_MAX_TURNS:'2',AI_AUTH_MODE:'chatgpt',OPENAI_GM_MODEL:'ignored-legacy-model'});assert.equal(p.remaining,2);assert.equal(typeof p.generate,'function');
  await assert.rejects(createProviderFromEnv({VK2_PROVIDER:'unknown'}),/VK2_PROVIDER/);await assert.rejects(createProviderFromEnv({VK2_MAX_TURNS:'101'}),/VK2_MAX_TURNS/);
});
