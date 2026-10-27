import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentModelRoomContext} from '../../src/native-environment-model-room.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:aster-vale-predictive-lab:model-room';
const RULE='**Model Room — Action:** Reveal a forecast that is frighteningly accurate but incomplete. The PC may take a Hope by accepting that one listed risk is real and immediately relevant.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Model Room exposes the exact source-bound forecast prompt and optional Hope contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_model_room_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_model_room_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/PC may take Hope/);
});

test('scoped GM context preserves incomplete forecast fiction and player-owned Hope choice',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'model-room-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentModelRoomContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'model-room-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Source-bound GM forecast prompt; forecast remains fiction, the PC decides whether to accept the risk and take Hope, and context alone changes no resource.'});
  assert.deepEqual(projectNativeEnvironmentModelRoomContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentModelRoomContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene context adapter is read-only and wired to entitled current profile',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-model-room.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentModelRoomSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope/);
});

test('Model Room source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Aster Vale Predictive Lab');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
