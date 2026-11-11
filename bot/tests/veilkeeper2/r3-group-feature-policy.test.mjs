import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeResourcePlan} from '../../src/v2/rules/native-resource-plan.js';
import {featureCostPlan} from '../../src/v2/rules/feature-cost-plan.js';
import {LANES,FLASH,REGENT,FOAM,groupFeaturePolicies,groupFeatureEffects,isGroupFeature,groupReactionRules,groupFeatureCostPlan,groupNeedsChoice,groupReactionOptions,groupFeatureStakes,validateGroupFeatureProposal} from '../../src/v2/rules/group-feature-rules.js';
import {groupFeatureOutcome} from '../../src/v2/rules/group-feature-outcomes.js';
const costOptions={timing:'spotlight_action',fear:8};
const normalCost={timing:'spotlight_action',fear:8,stress:0,stressMax:6};
test('fixed source-keyed reactions retain all four native policies',()=>{
  assert.deepEqual([LANES,FLASH,REGENT,FOAM].map(groupReactionRules),[{trait:'Instinct',difficulty:14},{trait:'Instinct',difficulty:12},{trait:'Presence',difficulty:20},{trait:'Agility',difficulty:14}]);
  assert.equal(groupFeaturePolicies[LANES].expiry,'next_spotlight');assert.equal(groupFeaturePolicies[FOAM].spellcast_disadvantage,true);assert.equal(groupFeaturePolicies[FOAM].expiry,'until_freed');
  for(const feature of [LANES,FLASH,REGENT,FOAM]){assert.equal(isGroupFeature(feature),true);assert.equal(Object.isFrozen(groupFeaturePolicies[feature]),true);assert.ok(groupFeatureStakes(feature).length>50);}
  assert.equal(isGroupFeature('invented'),false);assert.throws(()=>groupReactionRules('invented'));assert.throws(()=>groupFeatureStakes('invented'));
});
test('All Lanes Stop failure restricts movement; success does not',()=>{
  assert.deepEqual(groupFeatureOutcome(LANES,{success:false}),{required_choice:false,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(LANES,{success:true}),{required_choice:false,stress:0,hope:0,condition:false});
});
test('Flashbang preserves failure, owner choice on ordinary success and critical immunity',()=>{
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:false}),{required_choice:false,stress:1,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'stress'}),{required_choice:true,stress:1,hope:0,condition:false});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,choice:'vulnerable'}),{required_choice:true,stress:0,hope:0,condition:true});
  assert.deepEqual(groupFeatureOutcome(FLASH,{success:true,critical:true}),{required_choice:false,stress:0,hope:0,condition:false});
  assert.deepEqual(groupReactionOptions(FLASH),['vulnerable','stress']);
});
test('Command the Blood preserves exact Hope/Stress/command alternatives without inventing compliance',()=>{
  for(const [choice,stress,hope] of [['hope',0,2],['stress',2,0],['command',0,0]])assert.deepEqual(groupFeatureOutcome(REGENT,{success:false,choice}),{required_choice:true,stress,hope,condition:false});
  assert.deepEqual(groupFeatureOutcome(REGENT,{success:true}),{required_choice:false,stress:0,hope:0,condition:false});
  assert.match(groupFeatureStakes(REGENT),/supported owner declaration/);assert.equal(groupNeedsChoice(REGENT,false),true);assert.equal(groupNeedsChoice(REGENT,true),false);
});
test('pending/unknown owner choice remains required; a pure outcome is never owner consent',()=>{
  for(const choice of [null,'invented','HOPE'])assert.equal(groupFeatureOutcome(REGENT,{success:false,choice}).required_choice,true);
  assert.equal(groupFeatureOutcome(FLASH,{success:true}).required_choice,true);
  assert.equal(groupFeatureEffects[REGENT].choices.command.condition,false);
  for(const success of [undefined,null,'success',0])assert.throws(()=>groupFeatureOutcome(FLASH,{success}));
  assert.throws(()=>groupFeatureOutcome(FOAM,{success:false})); // Area reactions use their own native outcome validator.
});
test('fixed reaction proposals reject model difficulty, bonuses and unsupported operation changes',()=>{
  for(const feature of [LANES,FLASH,REGENT,FOAM]){
    const p={...groupReactionRules(feature),disposition:'native_feature_resolution',stakes_kind:'native_feature',rule_basis_refs:['srd:reaction-rolls']},entry={actor:{type:'npc'},operation:'feature'};
    assert.equal(validateGroupFeatureProposal(entry,p,{feature_key:feature}),groupFeaturePolicies[feature]);
    for(const patch of [{difficulty:1},{trait:'Strength'},{advantage:true},{disadvantage:true},{experience_ref:'pc-experience'},{proposal_version:2}])assert.throws(()=>validateGroupFeatureProposal(entry,{...p,...patch},{feature_key:feature}));
    assert.throws(()=>validateGroupFeatureProposal({...entry,actor:{type:'pc'}},p,{feature_key:feature}));
  }
});
test('feature Fear, additional spotlight and Experience are separate exact expenses',()=>{
  const feature={costs:[{resource:'fear',amount:2},{resource:'npc_stress',amount:1}]};
  assert.deepEqual(featureCostPlan(feature,{...normalCost,additionalSpotlight:true,experience:true}),{fear:4,npc_stress:1,expenses:{additional_spotlight:1,feature:2,experience:1}});
  assert.deepEqual(featureCostPlan({costs:[]},normalCost),{fear:0,npc_stress:0,expenses:{additional_spotlight:0,feature:0,experience:0}});
  assert.throws(()=>featureCostPlan(feature,{...normalCost,fear:1}),/insufficient/);assert.throws(()=>featureCostPlan(feature,{...normalCost,stress:6}),/insufficient/);
});
test('Null Foam omits Stress only for native zero-capacity sheets, retaining Fear',()=>{
  const feature={feature_key:FOAM,costs:[{resource:'npc_stress',amount:1},{resource:'fear',amount:1}]};
  assert.equal(groupFeatureCostPlan(feature,{stress_current:0,stress_max:0},costOptions).npc_stress,0);
  assert.equal(groupFeatureCostPlan(feature,{stress_current:0,stress_max:6},costOptions).npc_stress,1);
  assert.equal(groupFeatureCostPlan(feature,{stress_current:0,stress_max:0},costOptions).fear,1);
  assert.throws(()=>groupFeatureCostPlan({...feature,feature_key:FLASH},{stress_current:0,stress_max:0},costOptions),/insufficient/);
  assert.throws(()=>groupFeatureCostPlan({...feature,feature_key:'invented'},{stress_current:0,stress_max:0},costOptions));
  assert.equal(feature.costs.length,2);
});
test('malformed and out-of-capacity feature expenditure descriptors hold',()=>{
  for(const costs of [[{resource:'hope',amount:1}],[{resource:'fear',amount:-1}],[{resource:'fear',amount:1,approved:true}],[{resource:'fear',amount:1.5}],[{resource:'fear',amount:13}]])assert.throws(()=>featureCostPlan({costs},normalCost));
  for(const patch of [{timing:'unknown'},{timing:'reaction',additionalSpotlight:true},{fear:13},{fear:-1},{stress:7},{stressMax:0,stress:1},{experience:1}])assert.throws(()=>featureCostPlan({costs:[]},{...normalCost,...patch}));
});
test('resource arithmetic cannot overdraw, overflow or grant unknown resource fields',()=>{
  assert.deepEqual(nativeResourcePlan({current:3,max:6},-2),{before:3,after:1,delta:-2});assert.deepEqual(nativeResourcePlan({current:5,max:6},3,{overflow:'cap'}),{before:5,after:6,delta:1});
  assert.equal(Object.isFrozen(nativeResourcePlan({current:0,max:0},0)),true);
  for(const [balance,delta,options] of [[{current:0,max:6},-1],[{current:6,max:6},1],[{current:1,max:6,owner:'x'},0],[{current:1.5,max:6},0],[{current:1,max:6},0,{overflow:'ignore'}]])assert.throws(()=>nativeResourcePlan(balance,delta,options));
});
