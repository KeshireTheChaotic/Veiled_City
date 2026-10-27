import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentGuestRightContext} from '../../src/native-environment-guest-right.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:pale-court-townhouse:guest-right';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Guest Right is an exact supported conditional passive context contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_guest_right_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/accepts formal hospitality/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_guest_right_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,0);assert.match(contract.effect,/does not infer acceptance/);
});

test('entitled current profile receives condition without acceptance or protection being inferred',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'profile-1',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentGuestRightContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'profile-1',source_ref:feature.source_ref,
    text:'**Guest Right — Passive:** A guest who accepts formal hospitality gains protection from unprovoked violence by the host but is expected to obey explicitly stated house rules.',
    authority:'Exact conditional source cue only; no hospitality acceptance, protection or house-rule agreement is inferred.'});
  assert.deepEqual(projectNativeEnvironmentGuestRightContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentGuestRightContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene delivery is scoped and has no hospitality or protection state',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-guest-right.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentGuestRightSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('source drift locally removes Guest Right from native capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Pale Court Townhouse');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
