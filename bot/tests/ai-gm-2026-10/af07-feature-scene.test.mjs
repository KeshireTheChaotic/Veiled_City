import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07FeatureScene} from '../../scripts/af07-codex-feature-scene.mjs';
import {createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';

test('purposeful scenario supplies a source-visible NPC goal and verifies native feature commitment',async()=>{
  const result=await runAf07FeatureScene();
  assert.equal(result.live,false);assert.equal(result.goalAvailable,true);assert.ok(result.eligibleFeatureCount>0);
  assert.equal(result.featureSelectionProven,true);assert.equal(result.ownerReactionInvitations,1);
  assert.ok(result.modelAttempts.length>0);assert.ok(result.modelAttempts.some(a=>a.eligibleFeatureSelections===1));
  assert.deepEqual(result.verification.sourceVerifiedFeatures.map(r=>r.feature),['adversary:aster-vale-contractor:flashbang']);
});

test('a scenario goal does not grant a wrong-adversary feature or manufacture a successful selection',async()=>{
  const result=await runAf07FeatureScene({aiFactory:context=>createAf07MockAi({...context,proposedFeature:'adversary:pale-regent:command-the-blood'})});
  assert.equal(result.goalAvailable,true);assert.equal(result.turnCommitted,true);assert.equal(result.featureSelectionProven,false);
  assert.equal(result.groupFeatureExecutions,0);assert.equal(result.ownerReactionInvitations,0);
  assert.equal(result.modelAttempts[0].eligibleFeatureSelections,0);
});
