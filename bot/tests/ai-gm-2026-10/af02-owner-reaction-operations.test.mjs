import test from 'node:test';
import assert from 'node:assert/strict';
import {LANES,FLASH,REGENT,groupReactionOptions,groupNeedsChoice,validateGroupFeatureProposal} from '../../src/frameworks/daggerheart/group-feature-rules.js';
import {groupFeatureOutcome} from '../../src/frameworks/daggerheart/group-feature-outcomes.js';

test('independent reaction branches preserve the three source contracts',()=>{
  assert.deepEqual(groupFeatureOutcome(LANES,{success:false}),{required_choice:false,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(LANES,{success:true}),{required_choice:false,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:false}),{required_choice:false,stress:1,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true}),{required_choice:true,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'vulnerable'}),{required_choice:true,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'stress'}),{required_choice:true,stress:1,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false}),{required_choice:true,stress:0,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'hope'}),{required_choice:true,stress:0,hope:2,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'stress'}),{required_choice:true,stress:2,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice:'command'}),{required_choice:true,stress:0,hope:0,condition:false});
});

test('a required owner choice remains required; no cross-PC state or automatic choice is retained',()=>{
  const pending=groupFeatureOutcome(REGENT,{success:false});
  const chosen=groupFeatureOutcome(REGENT,{success:false,choice:'hope'});
  assert.equal(pending.required_choice,true);assert.equal(pending.hope,0);
  assert.equal(chosen.required_choice,true);assert.equal(chosen.hope,2);
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:false}),pending);
  assert.deepEqual(groupReactionOptions(REGENT),['hope','stress','command']);
  const options=groupReactionOptions(FLASH);options.push('forged');assert.deepEqual(groupReactionOptions(FLASH),['vulnerable','stress']);
});

test('native Critical applies no source consequence or optional expenditure; unsupported evidence is rejected',()=>{
  for(const feature of [LANES,FLASH,REGENT]){
    assert.deepEqual(groupFeatureOutcome(feature,{success:true,critical:true}),{required_choice:false,stress:0,hope:0,condition:false});
    assert.equal(groupNeedsChoice(feature,true,true),false);
  }
  assert.throws(()=>groupFeatureOutcome('forged',{success:true}),/evidence/);
  assert.throws(()=>groupFeatureOutcome(FLASH,{success:'true'}),/evidence/);
});

test('shared planning retains exact NPC/reaction proposal gates',()=>{
  const entry={actor:{type:'npc'},operation:'feature'},feature={feature_key:FLASH},proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',
    trait:'Instinct',difficulty:12,advantage:false,disadvantage:false,experience_ref:null,rule_basis_refs:['srd:reaction-rolls']};
  assert.equal(validateGroupFeatureProposal(entry,proposal,feature).difficulty,12);
  assert.throws(()=>validateGroupFeatureProposal({...entry,actor:{type:'character'}},proposal,feature),/fixed_rules/);
  assert.throws(()=>validateGroupFeatureProposal(entry,{...proposal,difficulty:1},feature),/fixed_rules/);
  assert.throws(()=>validateGroupFeatureProposal(entry,{...proposal,advantage:true},feature),/fixed_rules/);
});
