import test from 'node:test';
import assert from 'node:assert/strict';
import {featureChoiceProposalIssue} from '../../src/frameworks/daggerheart/feature-choice-policy.js';

const feature={native_handler:'feedback'};
const proposal={proposal_version:2,disposition:'native_feature_resolution',stakes_kind:'native_feature',experience_ref:null,
  advantage:false,disadvantage:false};
const entry={actor:{type:'npc'},operation:'reaction'};

test('supported reaction feature proposal retains its exact native shape',()=>{
  assert.equal(featureChoiceProposalIssue(feature,proposal,entry),null);
  assert.equal(featureChoiceProposalIssue({native_handler:'blood_rush_hold_position'},proposal,entry),null);
});

test('proposal policy rejects unsupported handler and changed execution authority',()=>{
  for(const [f,p,e] of [
    [{native_handler:'unknown'},proposal,entry],
    [feature,{...proposal,proposal_version:1},entry],
    [feature,{...proposal,disposition:'request_pc_action_roll'},entry],
    [feature,{...proposal,stakes_kind:'attempt_only'},entry],
    [feature,{...proposal,experience_ref:'experience:1'},entry],
    [feature,{...proposal,advantage:true},entry],
    [feature,{...proposal,disadvantage:true},entry],
    [feature,proposal,{...entry,actor:{type:'pc'}}],
    [feature,proposal,{...entry,operation:'attack'}]
  ])assert.equal(featureChoiceProposalIssue(f,p,e),'feature_choice_shape_or_handler');
});
