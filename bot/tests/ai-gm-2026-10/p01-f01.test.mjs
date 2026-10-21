import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticResponseObligation,routerFailureEngagement,routeGameplayIntake} from '../../src/gameplay-intake.js';
test('indirect invitation survives malformed optional intents without acquiring authority',async()=>{
  const source='The rent is due, and the night shift barely pays.';
  for(const intents of [null,{},[null,{framing:'hypothetical',source_span:source}]]){
    const result=semanticResponseObligation(source,intents,{authenticated:true,engagement:{respond:true,engagement_kind:'conversation'}});
    assert.equal(result.needed,true);assert.match(result.authority,/never.*consent/);
  }
  const intake=await routeGameplayIntake(source);assert.equal(intake.remaining_text,source);assert.deepEqual(intake.native_receipts,[]);
});
test('explicit OOC and classified player conversation need no GM interruption',()=>{
  assert.equal(semanticResponseObligation('OOC: back after dinner',[null],{authenticated:true,engagement:{respond:true}}).needed,false);
  assert.equal(semanticResponseObligation('Your coat looks great.',[],{authenticated:true,engagement:{respond:false,engagement_kind:'no_response'}}).needed,false);
  assert.equal(routerFailureEngagement('I ask the vendor.',{authenticated:false}),false);
});
