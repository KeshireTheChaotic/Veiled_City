import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentContaminatedSceneContext} from '../../src/native-environment-contaminated-scene.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:occult-crime-scene:contaminated-scene';
const RULE='**Contaminated Scene — Passive:** The first careless supernatural effect used here raises Veil Exposure by 1 if mundane investigators are present.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Contaminated Scene exposes its exact source-bound trigger and effect cue',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_contaminated_scene_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_contaminated_scene_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/first careless supernatural effect/);assert.match(contract.effect,/applies no delta/);
});

test('scoped GM receives the trigger while context applies no Exposure delta',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'contaminated-scene-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentContaminatedSceneContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'contaminated-scene-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Exact source-bound trigger and Veil Exposure cue; context itself applies no delta, and any campaign change remains behind existing native state/privacy gates.'});
  assert.deepEqual(projectNativeEnvironmentContaminatedSceneContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentContaminatedSceneContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene wiring is a scoped read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-contaminated-scene.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentContaminatedSceneSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeVeilExposure|changeFear|changeHope/);
});

test('source drift locally removes Contaminated Scene capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Occult Crime Scene');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
