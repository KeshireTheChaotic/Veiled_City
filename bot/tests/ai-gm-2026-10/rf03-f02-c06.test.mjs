import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureReactionStakes} from '../../src/frameworks/daggerheart/feature-reaction-stakes.js';

const groupFeatures=new Set(['group:regent','group:flash']);
const stakes=createFeatureReactionStakes({
  isGroupFeature:feature=>groupFeatures.has(feature),
  groupFeatureStakes:feature=>`group-stakes:${feature}`
});

test('supported Feedback reaction retains exact native stakes text',()=>{
  assert.equal(stakes('adversary:static-wraith:feedback'),
    'On a failed Instinct reaction, mark 1 Stress and the electronic device shuts down until repaired or reset. On success it does not. Your roll is not assumed.');
});

test('native group features retain their existing delegated stakes',()=>{
  assert.equal(stakes('group:regent'),'group-stakes:group:regent');
  assert.equal(stakes('group:flash'),'group-stakes:group:flash');
});

test('unsupported feature keys remain held by the native failure contract',()=>{
  assert.throws(()=>stakes('adversary:unknown:reaction'),error=>error.code==='GM_ARBITRATION'
    &&error.message==='Unified GM arbitration held: feature_reaction_stakes_adapter');
});
