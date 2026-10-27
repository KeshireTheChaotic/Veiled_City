import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentThreeVectorsContext} from '../../src/native-environment-three-vectors.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:occult-crime-scene:three-vectors';
const RULE='**Three Vectors — Action:** Offer three clue vectors from physical, digital, witness, occult, financial, historical, relationship, or contradiction evidence. The PC chooses one to pursue; on Fear, another interested party moves on a different vector.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Three Vectors exposes its exact source-bound prompt contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_three_vectors_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_three_vectors_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/PC chooses one/);assert.match(contract.effect,/Fear result/);
});

test('scoped GM context preserves clue domains, PC choice and GM-authored response',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'three-vectors-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentThreeVectorsContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'three-vectors-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Source-bound clue prompt; the PC chooses a vector and the GM authors clues and any interested-party movement. Context records no clue, choice, roll or movement.'});
  assert.deepEqual(projectNativeEnvironmentThreeVectorsContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentThreeVectorsContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene wiring is a scoped read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-three-vectors.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentThreeVectorsSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope/);
});

test('source drift locally removes the Three Vectors capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Occult Crime Scene');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
