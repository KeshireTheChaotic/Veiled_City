import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFeatureTriggerEligible} from '../../src/frameworks/daggerheart/feature-trigger-eligibility.js';

test('Static Wraith Feedback requires the existing verified device fact',()=>{
  const feature={feature_key:'adversary:static-wraith:feedback'};
  assert.equal(nativeFeatureTriggerEligible(feature,{device:{id:'device:signal'} }),true);
  assert.equal(nativeFeatureTriggerEligible(feature,{}),false);
});

test('Pale Court Knight Blood Rush requires two or more HP marks after damage',()=>{
  const feature={feature_key:'adversary:pale-court-knight:blood-rush'};
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'after_damage',receipt:{data:{hp_marks:2}}}),true);
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'after_damage',receipt:{data:{hp_marks:1}}}),false);
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'on_pc_action',receipt:{data:{hp_marks:3}}}),false);
});

test('Bad Branch requires a successful Fear PC-action result',()=>{
  const feature={feature_key:'adversary:aster-vale-catastrophe-analyst:bad-branch'};
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'on_pc_action',proof:{outcome:'success'},request:{data:{result:{duality:'Fear'}}}}),true);
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'on_pc_action',proof:{outcome:'failure'},request:{data:{result:{duality:'Fear'}}}}),false);
  assert.equal(nativeFeatureTriggerEligible(feature,{phase:'after_damage',proof:{outcome:'success'},request:{data:{result:{duality:'Fear'}}}}),false);
});

test('unknown feature keys and model-style trigger flags do not qualify',()=>{
  assert.equal(nativeFeatureTriggerEligible({feature_key:'adversary:other:feature'},{device:true,trigger:true,phase:'after_damage',receipt:{data:{hp_marks:4}}}),false);
});
