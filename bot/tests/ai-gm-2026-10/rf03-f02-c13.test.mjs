import test from 'node:test';
import assert from 'node:assert/strict';
import {featureCostPlan as providerCostPlan} from '../../src/native-feature-windows.js';
import {featureCostPlan as nativeCostPlan} from '../../src/frameworks/daggerheart/feature-costs.js';
import {featureReactionStakes} from '../../src/native-feature-effects.js';

test('native feature-window provider cold-imports through the cyclic scene and PvP modules',()=>{
  const feature={costs:[{resource:'fear',amount:1},{resource:'npc_stress',amount:1}]};
  const options={timing:'reaction',fear:1,stress:0,stressMax:1};
  assert.deepEqual(providerCostPlan(feature,options),nativeCostPlan(feature,options));
  assert.equal(featureReactionStakes('adversary:static-wraith:feedback'),
    'On a failed Instinct reaction, mark 1 Stress and the electronic device shuts down until repaired or reset. On success it does not. Your roll is not assumed.');
});
