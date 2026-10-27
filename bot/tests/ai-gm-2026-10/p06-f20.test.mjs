import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentMetaphorPhysicsContext} from '../../src/native-environment-metaphor-physics.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:networked-dream:metaphor-is-physics';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Metaphor Is Physics is an exact supported passive invitation contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_metaphor_physics_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/if the player explains the connection/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_metaphor_physics_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,0);assert.match(contract.effect,/does not choose an action or grant a mechanical result/);
});

test('entitled current profile receives the invitation without an authored player action',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'profile-1',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentMetaphorPhysicsContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'profile-1',source_ref:feature.source_ref,
    text:'**Metaphor Is Physics — Passive:** Clever symbolic actions can substitute for literal tools if the player explains the connection.',
    authority:'Exact passive invitation only; the player owns their action and native adjudication owns its result.'});
  assert.deepEqual(projectNativeEnvironmentMetaphorPhysicsContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentMetaphorPhysicsContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene delivery is scoped and creates no state, choice, or mechanical result',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-metaphor-physics.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentMetaphorPhysicsSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('source drift locally removes Metaphor Is Physics from native capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Networked Dream');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
