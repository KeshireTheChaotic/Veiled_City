import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';

const FEATURE='environment:haunted-nightclub:vip-threshold';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('VIP Threshold exposes owner-backed admission methods without granting entry itself',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'nightclub_vip_threshold');
  assert.equal(feature.type,'Passive');
  assert.equal(feature.trigger_kind,'attempted_private_floor_entry');
  assert.equal(feature.target_policy,'acting_pc');
  assert.equal(feature.roll_protocol,'established_credential_or_successful_deception');
  assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/Entry to the private floor requires invitation, status, leverage, or deception/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'nightclub_vip_threshold');
  assert.equal(contract.entry,'owner_private_admission');
  assert.deepEqual(contract.methods,['invitation','status','leverage','deception']);
  assert.equal(contract.fear,0);
  assert.match(contract.effect,/does not move a PC or waive locks/i);
});

test('source drift and forged admission protocol cannot expose VIP Threshold',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Haunted Nightclub');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'passive'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'none'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'none'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
