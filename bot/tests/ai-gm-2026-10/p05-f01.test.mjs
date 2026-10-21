import test from 'node:test';import assert from 'node:assert/strict';
import {GMService} from '../../src/gm.js';
function service(responses){let calls=0;const ctx={config:{openaiMaxRetries:0},db:{getCityCalendar:()=>({flags:{}})},metrics:{record(){},incident(){}},
 ai:{responses:{create:async()=>{calls++;return responses.shift();}}},requestModel:GMService.prototype.requestModel};return {ctx,calls:()=>calls};}
const request={model:'offline-stub',input:'Fresh scenario',text:{format:{schema:{type:'object',properties:{}}}}};
test('complete prose reaches caller in one provider call; malformed output gets one bounded repair',async()=>{
 for(const [responses,expected] of [[[{output_text:'{"narration":"The bell wakes the empty station."}'}],1],[[{output_text:'{'},{output_text:'{"narration":"The bell wakes the empty station."}'}],2]]){
  const s=service(responses);const result=await GMService.prototype.structuredResponse.call(s.ctx,request,{guildId:'g'});
  assert.equal(result.narration,'The bell wakes the empty station.');assert.equal(s.calls(),expected);
 }
});
test('explicit provider refusal incurs one request and no pointless parse retry',async()=>{
 const s=service([{output_text:'',output:[{content:[{type:'refusal',refusal:'declined'}]}]}]);
 await assert.rejects(()=>GMService.prototype.structuredResponse.call(s.ctx,request,{guildId:'g'}),{code:'STRUCTURED_PROVIDER_REFUSAL'});assert.equal(s.calls(),1);
});
test('cancelled request dispatches no provider call',async()=>{
 const s=service([]);await assert.rejects(()=>GMService.prototype.structuredResponse.call(s.ctx,request,{guildId:'g',signal:AbortSignal.abort()}),{code:'AI_GENERATION_DEADLINE'});assert.equal(s.calls(),0);
});
