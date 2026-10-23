import test from 'node:test';
import assert from 'node:assert/strict';
import {LANES,FLASH,REGENT,isGroupFeature,groupReactionRules,groupReactionOptions,groupNeedsChoice,groupFeatureStakes}
  from '../../src/frameworks/daggerheart/group-feature-rules.js';

test('native group identities and fixed reaction terms remain exact',()=>{
  assert.equal(isGroupFeature(LANES),true);assert.equal(isGroupFeature(FLASH),true);assert.equal(isGroupFeature(REGENT),true);
  assert.equal(isGroupFeature('group:unknown'),false);
  assert.deepEqual(groupReactionRules(LANES),{trait:'Instinct',difficulty:14});
  assert.deepEqual(groupReactionRules(FLASH),{trait:'Instinct',difficulty:12});
  assert.deepEqual(groupReactionRules(REGENT),{trait:'Presence',difficulty:20});
  assert.throws(()=>groupReactionRules('group:unknown'),error=>error.code==='GM_ARBITRATION');
});

test('native owner choices are required only for the existing outcomes',()=>{
  assert.deepEqual(groupReactionOptions(FLASH),['vulnerable','stress']);
  assert.deepEqual(groupReactionOptions(REGENT),['hope','stress','command']);
  assert.deepEqual(groupReactionOptions(LANES),[]);
  assert.equal(groupNeedsChoice(FLASH,true),true);
  assert.equal(groupNeedsChoice(FLASH,true,true),false);
  assert.equal(groupNeedsChoice(REGENT,false),true);
  assert.equal(groupNeedsChoice(REGENT,true),false);
  assert.equal(groupNeedsChoice(LANES,false),false);
});

test('native feature stakes statements preserve existing choice and consent language',()=>{
  assert.equal(groupFeatureStakes(LANES),'On failure you cannot move beyond Very Close until after the Saint next takes the spotlight. On success no restriction applies. No roll or failed response is assumed.');
  assert.match(groupFeatureStakes(FLASH),/YOU choose Vulnerable or 1 Stress/u);
  assert.match(groupFeatureStakes(FLASH),/Silence\/withdrawal is not a failed reaction/u);
  assert.match(groupFeatureStakes(REGENT),/Command compliance needs an exact communicated command/u);
  assert.throws(()=>groupFeatureStakes('group:unknown'),error=>error.code==='GM_ARBITRATION');
});
