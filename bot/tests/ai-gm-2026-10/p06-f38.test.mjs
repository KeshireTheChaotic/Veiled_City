import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentContainmentShuttersContext} from '../../src/native-environment-containment-shutters.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:aster-vale-predictive-lab:containment-shutters';
const RULE='**Containment Shutters — Action:** Spend a Fear to divide the area with security barriers; escaping or reuniting routes requires a Difficulty 14 action.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Containment Shutters registers the exact source rule and its one-Fear native contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_containment_shutters_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);
  assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_containment_shutters_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,1);assert.match(contract.effect,/Difficulty 14/);
});

test('scoped context preserves the exact Fear and route rule without committing mechanics',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'containment-shutters-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentContainmentShuttersContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'containment-shutters-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Exact source-bound one-Fear and Difficulty 14 route cue; context spends no Fear, changes no barrier or route, and chooses or rolls for no PC.'});
  assert.deepEqual(projectNativeEnvironmentContainmentShuttersContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentContainmentShuttersContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('native scene context routes the exact occurrence and stops at its six-item limit',()=>{
  const scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  assert.match(scene,/nativeEnvironmentContainmentShuttersSituation/);
  assert.match(scene,/environment-containment-shutters\.js/);
  assert.match(scene,/nativeEnvironmentContainmentShuttersSituation\(db,guild,scope,location\)\.slice\(0,6-result\.length\)/);
});

test('Containment Shutters source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Aster Vale Predictive Lab');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
