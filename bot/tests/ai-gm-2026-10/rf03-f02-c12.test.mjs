import test from 'node:test';
import assert from 'node:assert/strict';
import {LANES,FLASH,REGENT} from '../../src/frameworks/daggerheart/group-feature-rules.js';
import {groupFeatureOutcome} from '../../src/frameworks/daggerheart/group-feature-outcomes.js';

test('Traffic Saint applies its existing failure condition without a resource cost',()=>{
  assert.deepEqual(groupFeatureOutcome(LANES,{success:false}),{required_choice:false,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(LANES,{success:true}),{required_choice:false,stress:0,hope:0,condition:false});
});

test('Flashbang preserves failure, chosen success, and native Critical outcomes',()=>{
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:false}),{required_choice:false,stress:1,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true}),{required_choice:true,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'vulnerable'}),{required_choice:true,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'stress'}),{required_choice:true,stress:1,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:false,critical:true}),{required_choice:false,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,critical:true}),{required_choice:false,stress:0,hope:0,condition:false});
});

test('Blood Regent preserves its owner-selected Hope or Stress consequence',()=>{
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false}),{required_choice:true,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'hope'}),{required_choice:true,stress:0,hope:2,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'stress'}),{required_choice:true,stress:2,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'command'}),{required_choice:true,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:true}),{required_choice:false,stress:0,hope:0,condition:false});
});

test('unknown features or unverified result types cannot produce a native outcome',()=>{
  assert.throws(()=>groupFeatureOutcome('adversary:unknown', {success:false}),error=>error.code==='GM_ARBITRATION');
  assert.throws(()=>groupFeatureOutcome(FLASH,{success:'success'}),error=>error.code==='GM_ARBITRATION');
});
