import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentNoOrdinarySignalContext} from '../../src/native-environment-no-ordinary-signal.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:district-blackout:no-ordinary-signal';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('No Ordinary Signal is an exact supported passive network-context contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_no_ordinary_signal_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/Cellular and normal network access is unreliable/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_no_ordinary_signal_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,0);assert.match(contract.effect,/no automatic outcome/);
});

test('entitled current profile receives the exact cue without forced connection failure',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'profile-1',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentNoOrdinarySignalContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'profile-1',source_ref:feature.source_ref,
    text:'**No Ordinary Signal — Passive:** Cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required.',
    authority:'Exact passive source cue only; no specific connection attempt outcome is created.'});
  assert.deepEqual(projectNativeEnvironmentNoOrdinarySignalContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentNoOrdinarySignalContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene delivery is scoped and creates no state or mechanical outcome',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-no-ordinary-signal.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentNoOrdinarySignalSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('source drift locally removes No Ordinary Signal from native capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='District Blackout');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
