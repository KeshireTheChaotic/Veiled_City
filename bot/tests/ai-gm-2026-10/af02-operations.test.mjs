import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeResourcePlan,nativeModifierPlan,nativeDurationExpired} from '../../src/frameworks/daggerheart/feature-operation-plans.js';
import {featureCostPlan,commitFeatureResources} from '../../src/frameworks/daggerheart/feature-costs.js';
import {DatabaseSync} from 'node:sqlite';

test('resource and token plans retain exact costs, cap only when explicitly requested and never underflow',()=>{
  assert.deepEqual(nativeResourcePlan({current:3,max:12},-2),{before:3,after:1,delta:-2});
  assert.deepEqual(nativeResourcePlan({current:2,max:3},2,{overflow:'cap'}),{before:2,after:3,delta:1});
  assert.throws(()=>nativeResourcePlan({current:0,max:3},-1),/capacity/);
  assert.throws(()=>nativeResourcePlan({current:2,max:3},2),/capacity/);
  assert.throws(()=>nativeResourcePlan({current:2,max:3,authorized:true},1),/shape/);
  assert.throws(()=>nativeResourcePlan({current:2,max:3},NaN),/shape/);
  const balance={current:1,max:3};nativeResourcePlan(balance,1);assert.deepEqual(balance,{current:1,max:3});
});

test('closed modifier operations use native counts, thresholds, bands and predicates',()=>{
  assert.equal(nativeModifierPlan({kind:'capped_count',per:1,cap:2},{count:9}),2);
  assert.equal(nativeModifierPlan({kind:'threshold',threshold:4,above:1,below:0},{value:3}),0);
  assert.equal(nativeModifierPlan({kind:'threshold',threshold:4,above:1,below:0},{value:4}),1);
  const bands={kind:'bands',bands:[{min:0,max:2,value:2},{min:3,max:4,value:0},{min:5,max:6,value:-1}]};
  assert.deepEqual([0,2,3,4,5,6].map(value=>nativeModifierPlan(bands,{value})),[2,2,0,0,-1,-1]);
  assert.throws(()=>nativeModifierPlan(bands,{value:7}),/unproved_range/);
  assert.throws(()=>nativeModifierPlan({kind:'bands',bands:[{min:0,max:3,value:1},{min:3,max:6,value:2}]},{value:3}),/bands/);
  assert.equal(nativeModifierPlan({kind:'conditional',value:2,otherwise:0},{eligible:false}),0);
  assert.throws(()=>nativeModifierPlan({kind:'eval',code:'return 100'},{value:1}),/shape/);
  assert.throws(()=>nativeModifierPlan({kind:'conditional',value:2,otherwise:0},{eligible:'true'}),/shape/);
});

test('duration expiration is source-scoped and uses committed event kinds',()=>{
  for(const [kind,eventKind] of [['scene','scene_ended'],['severe_damage','severe_damage_committed'],['next_action','action_roll_committed'],['next_reaction','reaction_roll_committed']]){
    assert.equal(nativeDurationExpired({kind,ref:'source'},{kind:eventKind,ref:'source'}),true);
    assert.equal(nativeDurationExpired({kind,ref:'source'},{kind:eventKind,ref:'other'}),false);
    assert.equal(nativeDurationExpired({kind,ref:'source'},{kind:'model_says_expired',ref:'source'}),false);
  }
  assert.throws(()=>nativeDurationExpired({kind:'whenever',ref:'x'},{kind:'scene_ended',ref:'x'}),/kind/);
});

test('existing source cost workflow preserves additive Fear/Stress and rejects unsupported PC/token payments',()=>{
  const f={costs:[{resource:'fear',amount:2},{resource:'npc_stress',amount:1}]};
  assert.deepEqual(featureCostPlan(f,{timing:'spotlight_action',additionalSpotlight:true,experience:true,fear:4,stress:1,stressMax:2}),
    {fear:4,npc_stress:1,expenses:{additional_spotlight:1,feature:2,experience:1}});
  assert.throws(()=>featureCostPlan(f,{timing:'reaction',fear:1,stress:1,stressMax:2}),/insufficient/);
  assert.throws(()=>featureCostPlan(f,{timing:'reaction',fear:3,stress:2,stressMax:2}),/insufficient/);
  for(const resource of ['pc_hope','forecast','arbitrary'])
    assert.throws(()=>featureCostPlan({costs:[{resource,amount:1}]},{timing:'reaction',fear:3,stress:0,stressMax:2}),/descriptor/);
});

test('shared resource writer commits both costs atomically and rolls back a failed native write',()=>{
  const sql=new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE state(fear INTEGER, stress INTEGER); INSERT INTO state VALUES(3,0)');
  let failWrite=false;
  const state=()=>sql.prepare('SELECT * FROM state').get();
  const db={transaction:fn=>{sql.exec('BEGIN');try{const result=fn();sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}},
    getCampaign:()=>({fear:state().fear}),changeFear:(guild,delta)=>sql.prepare('UPDATE state SET fear=fear+?').run(delta),
    updateCombatant:(id,patch)=>{if(failWrite)throw new Error('native write failed');sql.prepare('UPDATE state SET stress=?').run(patch.stress_current);return {id,...patch};}};
  const cost={fear:1,npc_stress:1,expenses:{additional_spotlight:0,experience:0,feature:1}};
  try{
    const result=commitFeatureResources(db,'g',{id:'npc',stress_current:0,stress_max:2},cost);
    assert.equal(result.fear.after,2);assert.equal(result.combatant.stress_current,1);
    failWrite=true;assert.throws(()=>commitFeatureResources(db,'g',{id:'npc',stress_current:1,stress_max:2},cost),/native write failed/);
    assert.equal(state().fear,2);assert.equal(state().stress,1);
    assert.throws(()=>commitFeatureResources(db,'g',null,cost),/shape/);
    assert.equal(state().fear,2);
  }finally{sql.close();}
});
