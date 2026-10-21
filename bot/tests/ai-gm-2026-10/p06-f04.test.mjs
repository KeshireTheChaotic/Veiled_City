import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';

const FEATURE='environment:occult-crime-scene:sirens-outside';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Sirens Outside is source-pinned to its existing one-Fear ordinary responder adapter',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'sirens_outside');
  assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');
  assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'sirens_outside');
  assert.equal(contract.fear,1);
  assert.deepEqual(contract.categories,['authority','media','property_management','emergency_response']);
  assert.match(contract.effect,/never a combatant, PC reaction, custody or attack/);
});

test('changed source or forged handler and cost cannot expose the occurrence capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Occult Crime Scene');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:2}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'unmapped'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
  assert.equal(environmentProposalContract({feature_key:FEATURE,status:'supported',native_handler:'sirens_outside'}),null);
});

test('duplicate source identity and unrelated review-only features remain held',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Occult Crime Scene');
  input.environments.push(structuredClone(actor));
  assert.equal(inspectNativeFeatureOccurrence(FEATURE,input).status,'held_source');
  assert.equal(featureDisposition('environment:flooded-river-threshold:city-vs-river',sources()).status,'needs_rules_review');
});
