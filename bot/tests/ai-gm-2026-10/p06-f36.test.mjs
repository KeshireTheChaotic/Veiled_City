import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentThirdRailSpiritContext} from '../../src/native-environment-third-rail-spirit.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:dead-platform:third-rail-spirit';
const RULE='**Third Rail Spirit — Action:** Spend a Fear to manifest a hostile current across a route, dealing 2d8+3 magic damage on a failed Agility Reaction Roll.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Third Rail Spirit exposes its exact source-bound action contract and cost',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_third_rail_spirit_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_third_rail_spirit_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,1);
  assert.match(contract.effect,/one-Fear/);assert.match(contract.effect,/failed Agility Reaction/);assert.match(contract.effect,/commits no cost/);
});

test('scoped GM context preserves mechanics as a cue without spending or attacking',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'third-rail-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentThirdRailSpiritContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'third-rail-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Exact source-bound Fear and failed reaction damage cue; context spends no Fear, chooses no route or target, rolls no PC dice and commits no damage.'});
  assert.deepEqual(projectNativeEnvironmentThirdRailSpiritContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentThirdRailSpiritContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene wiring is a scoped read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-third-rail-spirit.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentThirdRailSpiritSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope|gm_d20/);
});

test('source drift locally removes Third Rail Spirit capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Dead Platform');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
