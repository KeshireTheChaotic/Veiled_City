import test from 'node:test';
import assert from 'node:assert/strict';
import {planFeedbackReactionOutcome} from '../../src/frameworks/daggerheart/feature-reaction-outcomes.js';

test('successful Feedback reaction leaves Stress and device unchanged',()=>{
  assert.deepEqual(planFeedbackReactionOutcome({success:true,stressCurrent:2,stressMax:3,effectKey:'feature-effect:1'}),
    {stress_delta:0,device_disabled_by:null});
});

test('failed Feedback reaction adds one Stress and ties device shutdown to its exact receipt',()=>{
  assert.deepEqual(planFeedbackReactionOutcome({success:false,stressCurrent:1,stressMax:3,effectKey:'feature-effect:2'}),
    {stress_delta:1,device_disabled_by:'feature-effect:2'});
});

test('failed Feedback reaction at Stress capacity remains held',()=>{
  assert.throws(()=>planFeedbackReactionOutcome({success:false,stressCurrent:3,stressMax:3,effectKey:'feature-effect:3'}),
    error=>error.code==='GM_ARBITRATION'&&error.message.endsWith('feature_stress_overflow_adapter_required'));
});

test('invalid or missing native reaction evidence cannot produce an outcome',()=>{
  for(const input of [
    {success:1,stressCurrent:0,stressMax:1,effectKey:'feature-effect:4'},
    {success:false,stressCurrent:-1,stressMax:1,effectKey:'feature-effect:4'},
    {success:false,stressCurrent:2,stressMax:1,effectKey:'feature-effect:4'},
    {success:false,stressCurrent:0,stressMax:1,effectKey:''}
  ])assert.throws(()=>planFeedbackReactionOutcome(input),error=>error.code==='GM_ARBITRATION');
});
