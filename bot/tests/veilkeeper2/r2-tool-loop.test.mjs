import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelGateway} from '../../src/v2/model-gateway.js';
import {GENERIC_TOOL_CONTRACTS} from '../../src/v2/tool-contracts.js';
const names=['context_read','action_propose','state_inspect','knowledge_propose'];
function fixture(respond){
  const state={requests:[],executions:[],current:true},grant={};
  const gateway=createModelGateway({contextAuthority:{inspect:g=>{assert.equal(g,grant);if(!state.current)throw new Error('revoked');return {trace_id:'trace',records:[],utterance:'Interesting.'};}},provider:{generate:async r=>{state.requests.push(r);return respond(r,state);}}});
  const capabilities=Object.fromEntries(names.map(name=>[name,input=>{state.executions.push({name,input});return {status:'pending',effects_committed:false};}]));
  return {state,gateway,grant,capabilities};
}
test('ordinary response remains one call while advertising exactly four generic contracts',async()=>{
  const f=fixture(()=>({text:'The clerk raises an eyebrow.'})),d=await f.gateway.generate(f.grant,{capabilities:f.capabilities});
  assert.equal(f.gateway.inspect(d).modelCalls,1);assert.equal(f.gateway.inspect(d).toolCalls,0);assert.deepEqual(f.state.executions,[]);
  assert.deepEqual(f.state.requests[0].tools.map(t=>t.name),names);assert.ok(GENERIC_TOOL_CONTRACTS.every(t=>t.parameters.additionalProperties===false));
});
test('optional tool results continue the conversation, retain call IDs and accumulate usage',async()=>{
  const f=fixture((r,s)=>s.requests.length===1?{toolCalls:[{id:'call',name:'action_propose',arguments:{source_ref:'m'}}],usage:{inputTokens:10}}:{text:'The attempt awaits your roll.',usage:{inputTokens:7,outputTokens:4}});
  const d=await f.gateway.generate(f.grant,{capabilities:f.capabilities}),row=f.gateway.inspect(d);
  assert.equal(row.modelCalls,2);assert.equal(row.toolCalls,1);assert.equal(row.usage.inputTokens,17);
  assert.equal(f.state.requests[1].history[0].toolResults[0].result.effects_committed,false);assert.equal(f.state.executions.length,1);
});
test('duplicate call IDs replay once and altered arguments under one ID abort',async()=>{
  const call={id:'same',name:'knowledge_propose',arguments:{claim:'A rumor'}};
  const f=fixture((r,s)=>s.requests.length<3?{toolCalls:[call]}:{text:'A rumor, then.'});await f.gateway.generate(f.grant,{capabilities:f.capabilities});assert.equal(f.state.executions.length,1);
  const g=fixture((r,s)=>({toolCalls:[{...call,arguments:{claim:String(s.requests.length)}}]}));
  await assert.rejects(g.gateway.generate(g.grant,{capabilities:g.capabilities}),e=>e.code==='tool_call_replay_conflict');assert.equal(g.state.executions.length,1);
});
test('unknown capabilities are rejected without invoking native code; unbounded tool requests terminate',async()=>{
  const f=fixture((r,s)=>s.requests.length===1?{toolCalls:[{id:'x',name:'apply_damage',arguments:{}}]}:{text:'No adjudication is available.'});
  await f.gateway.generate(f.grant,{capabilities:f.capabilities});assert.deepEqual(f.state.executions,[]);assert.equal(f.state.requests[1].history[0].toolResults[0].result.code,'unknown_capability');
  const g=fixture((r,s)=>({toolCalls:[{id:String(s.requests.length),name:'context_read',arguments:{topic:'conversation'}}]}));
  await assert.rejects(g.gateway.generate(g.grant,{capabilities:g.capabilities}),e=>e.code==='tool_budget_exhausted');assert.equal(g.state.requests.length,6);assert.equal(g.state.executions.length,5);
});
test('native exceptions are bounded and context is revalidated before continuing or inspecting',async()=>{
  const f=fixture((r,s)=>s.requests.length===1?{toolCalls:[{id:'x',name:'context_read',arguments:{}}]}:{text:'Continue.'});
  f.capabilities.context_read=()=>{throw new Error('PRIVATE diagnostic');};const draft=await f.gateway.generate(f.grant,{capabilities:f.capabilities});
  assert.equal(JSON.stringify(f.state.requests).includes('PRIVATE diagnostic'),false);f.state.current=false;assert.throws(()=>f.gateway.inspect(draft),/revoked/);
});
