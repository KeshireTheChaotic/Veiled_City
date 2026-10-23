import test from 'node:test';
import assert from 'node:assert/strict';
import {featureCostPlan} from '../../src/frameworks/daggerheart/feature-costs.js';

test('native feature costs preserve fear, NPC stress and optional spotlight accounting',()=>{
  const feature={costs:[{resource:'fear',amount:2},{resource:'npc_stress',amount:1}]};
  const result=featureCostPlan(feature,{timing:'spotlight_action',additionalSpotlight:true,experience:true,fear:4,stress:2,stressMax:4});
  assert.deepEqual(result,{fear:4,npc_stress:1,expenses:{additional_spotlight:1,feature:2,experience:1}});
});

test('native reaction and passive costs cannot add spotlight or spend beyond available resources',()=>{
  assert.deepEqual(featureCostPlan({costs:[{resource:'npc_stress',amount:1}]},{timing:'reaction',fear:0,stress:1,stressMax:2}),
    {fear:0,npc_stress:1,expenses:{additional_spotlight:0,feature:0,experience:0}});
  assert.throws(()=>featureCostPlan({costs:[{resource:'fear',amount:1}]},{timing:'reaction',additionalSpotlight:true,fear:3,stress:0,stressMax:1}),e=>e.code==='GM_ARBITRATION');
  assert.throws(()=>featureCostPlan({costs:[{resource:'fear',amount:2}]},{timing:'passive',fear:1,stress:0,stressMax:1}),e=>e.code==='GM_ARBITRATION');
  assert.throws(()=>featureCostPlan({costs:[{resource:'npc_stress',amount:2}]},{timing:'passive',fear:0,stress:0,stressMax:1}),e=>e.code==='GM_ARBITRATION');
});

test('native feature costs reject malformed resource descriptors and invalid balances',()=>{
  for(const costs of [[{resource:'hope',amount:1}],[{resource:'fear',amount:-1}],[{resource:'fear',amount:1,source:'x'}]])
    assert.throws(()=>featureCostPlan({costs},{timing:'passive',fear:1,stress:0,stressMax:1}),e=>e.code==='GM_ARBITRATION');
  assert.throws(()=>featureCostPlan({costs:[]},{timing:'unknown',fear:0,stress:0,stressMax:0}),e=>e.code==='GM_ARBITRATION');
  assert.throws(()=>featureCostPlan({costs:[]},{timing:'passive',fear:13,stress:0,stressMax:0}),e=>e.code==='GM_ARBITRATION');
});
