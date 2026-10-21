import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';

const FEATURE='environment:apartment-veil-breach:upload-in-progress';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Upload in Progress exposes only its exact existing native countdown contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'upload_countdown');
  assert.equal(feature.type,'Action');
  assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');
  assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);
  assert.match(inspection.printed_rule,/4-step countdown/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'upload_countdown');
  assert.deepEqual(contract.operations,['upload_start','upload_advance','upload_adjust']);
  assert.equal(contract.max,4);
  assert.equal(contract.fear,1);
});

test('source drift and forged descriptor fields retain the occurrence-local hold',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Apartment Veil Breach');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:2}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'on_scene_event'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'one'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'owner_reaction'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
