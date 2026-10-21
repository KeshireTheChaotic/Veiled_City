import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentEveryoneIsWatchingContext} from '../../src/native-environment-everyone-is-watching.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:glass-market-grand-concourse:everyone-is-watching';
const RULE='**Everyone Is Watching — Reaction:** When the PC makes a public threat, promise, or bargain, record it as witnessed by at least one faction.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Everyone Is Watching exposes its exact source-bound reaction contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_everyone_is_watching_context');
  assert.equal(feature.type,'Reaction');assert.equal(feature.trigger_kind,'on_scene_event');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_everyone_is_watching_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/public threat, promise or bargain/);assert.match(contract.effect,/no durable witness receipt/);
});

test('scoped GM context preserves PC speech ownership and faction fiction autonomy',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'market-witness-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentEveryoneIsWatchingContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'market-witness-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Exact source-bound audience cue; the PC owns their public words and the GM authors any faction witness. Context creates no durable witness receipt or PC declaration.'});
  assert.deepEqual(projectNativeEnvironmentEveryoneIsWatchingContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentEveryoneIsWatchingContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene wiring is a scoped read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-everyone-is-watching.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  assert.match(source,/nativeEnvironmentInstanceForScope\(db,guild,scope,location\)/);
  assert.match(scene,/nativeEnvironmentEveryoneIsWatchingSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope/);
});

test('source drift locally removes Everyone Is Watching capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Glass Market Grand Concourse');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
