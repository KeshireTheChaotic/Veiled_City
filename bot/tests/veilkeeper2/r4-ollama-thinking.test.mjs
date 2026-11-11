import test from 'node:test';import assert from 'node:assert/strict';
import {createOllamaProvider} from '../../src/v2/ollama-provider.js';
test('explicit local thinking remains private and returns only the final response',async()=>{
  const p=createOllamaProvider({model:'local',thinking:true,maxOutputTokens:4096,fetchImpl:async(_url,options)=>{
    const body=JSON.parse(options.body);assert.equal(body.think,true);assert.equal(body.options.num_predict,4096);
    return {ok:true,json:async()=>({done:true,message:{role:'assistant',thinking:'PRIVATE-REASONING',content:'Iona says, "The gutter is still leaking."'},eval_count:230})};
  }}),out=await p.generate({instructions:'GM',context:{utterance:'Roof included?'}});
  assert.deepEqual(out,{text:'Iona says, "The gutter is still leaking."',usage:{outputTokens:230}});
  assert.equal(JSON.stringify(out).includes('PRIVATE-REASONING'),false);
  assert.throws(()=>createOllamaProvider({model:'local',thinking:'true'}),/boolean/);
});
