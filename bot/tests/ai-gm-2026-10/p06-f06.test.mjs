import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';

const FEATURE='environment:haunted-nightclub:too-loud-to-think';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Too Loud to Think exposes its exact native ordinary PC action disadvantage contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'nightclub_auditory_disadvantage');
  assert.equal(feature.type,'Passive');
  assert.equal(feature.trigger_kind,'passive');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_pc_action_disadvantage');
  assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/Delicate auditory or verbal investigation has disadvantage/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'nightclub_auditory_disadvantage');
  assert.equal(contract.disposition,'request_pc_action_roll');
  assert.equal(contract.stakes_kind,'attempt_only');
  assert.equal(contract.advantage,false);
  assert.equal(contract.disadvantage,true);
});

test('source drift or altered protocol and cost cannot expose the disadvantage capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Haunted Nightclub');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'spotlight_action'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'one'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'difficulty'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
