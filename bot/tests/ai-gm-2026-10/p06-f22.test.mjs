import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentConsensusEngineContext} from '../../src/native-environment-consensus-engine.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:veil-anchor-chamber:consensus-engine';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Consensus Engine is an exact supported passive pre-action risk cue',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_consensus_engine_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/state the risk before a voluntary action/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_consensus_engine_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,0);assert.match(contract.effect,/No alteration amount or outcome is supplied/);
});

test('entitled current profile receives risk cue without invented Exposure result',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'profile-1',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentConsensusEngineContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'profile-1',source_ref:feature.source_ref,
    text:'**Consensus Engine — Passive:** Obvious supernatural actions inside may alter Veil Exposure in unexpected directions; the GM should state the risk before a voluntary action.',
    authority:'Exact passive pre-action risk cue only; no Veil Exposure change is authored.'});
  assert.deepEqual(projectNativeEnvironmentConsensusEngineContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentConsensusEngineContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene delivery is scoped and makes no Exposure state change',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-consensus-engine.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentConsensusEngineSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('source drift locally removes Consensus Engine from native capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Veil Anchor Chamber');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
