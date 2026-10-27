import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentSealedDocketContext} from '../../src/native-environment-sealed-docket.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:archive-beneath-the-courthouse:sealed-docket';
const RULE='**Sealed Docket — Action:** Reveal a document that changes the legal or supernatural interpretation of a current conflict. Accessing it requires sacrificing time, secrecy, or a favor.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Sealed Docket exposes its exact source-bound action prompt contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_sealed_docket_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_sealed_docket_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/time, secrecy or favor/);
});

test('scoped GM context preserves source prompt and PC response ownership',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'sealed-docket-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentSealedDocketContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'sealed-docket-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Source-bound GM docket prompt; the document and interpretation remain GM-authored, the PC owns their response, and context alone records no document or cost agreement.'});
  assert.deepEqual(projectNativeEnvironmentSealedDocketContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentSealedDocketContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene context wiring remains an entitled read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-sealed-docket.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentSealedDocketSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope/);
});

test('Sealed Docket source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Archive Beneath the Courthouse');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
