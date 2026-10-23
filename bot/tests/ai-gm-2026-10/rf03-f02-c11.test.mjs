import test from 'node:test';
import assert from 'node:assert/strict';
import {LANES,FLASH,REGENT,validateGroupFeatureProposal} from '../../src/frameworks/daggerheart/group-feature-rules.js';

const entry={actor:{type:'npc'},operation:'feature'};
const proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',trait:'Instinct',difficulty:14,
  proposal_version:1,experience_ref:null,advantage:false,disadvantage:false,rule_basis_refs:['srd:reaction-rolls']};
const feature={feature_key:LANES};

test('each supported group feature requires its exact native trait and Difficulty',()=>{
  assert.equal(validateGroupFeatureProposal(entry,proposal,feature).difficulty,14);
  assert.equal(validateGroupFeatureProposal(entry,{...proposal,trait:'Presence',difficulty:20},{feature_key:REGENT}).difficulty,20);
  assert.equal(validateGroupFeatureProposal(entry,{...proposal,difficulty:12},{feature_key:FLASH}).difficulty,12);
});

test('native group proposal eligibility rejects changed actor, operation, disposition and terms',()=>{
  for(const [e,p,f] of [
    [{...entry,actor:{type:'pc'}},proposal,feature],
    [{...entry,operation:'attack'},proposal,feature],
    [entry,{...proposal,disposition:'request_pc_action_roll'},feature],
    [entry,{...proposal,stakes_kind:'attempt_only'},feature],
    [entry,{...proposal,trait:'Knowledge'},feature],
    [entry,{...proposal,difficulty:13},feature],
    [entry,{...proposal,proposal_version:2},feature],
    [entry,{...proposal,experience_ref:'experience:1'},feature],
    [entry,{...proposal,advantage:true},feature],
    [entry,{...proposal,disadvantage:true},feature],
    [entry,{...proposal,rule_basis_refs:[]},feature],
    [entry,proposal,{feature_key:'adversary:unknown:feature'}]
  ])assert.throws(()=>validateGroupFeatureProposal(e,p,f),error=>error.code==='GM_ARBITRATION');
});
