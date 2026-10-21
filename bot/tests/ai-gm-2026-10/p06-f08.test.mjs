import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';

const FEATURE='environment:after-hours-emergency-department:code-blue';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Code Blue exposes the exact source-defined medical emergency scene contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'environment_code_blue');
  assert.equal(feature.type,'Action');
  assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');
  assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/mundane medical emergency competes for staff attention/);
  assert.match(inspection.printed_rule,/PC can help, exploit the distraction, or let it complicate/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_code_blue');
  assert.equal(contract.kind,'medical_emergency');
  assert.equal(contract.category,'medical');
  assert.equal(contract.fear,0);
  assert.match(contract.effect,/owner response remains unselected/);
});

test('source drift and forged descriptor fields keep Code Blue held',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='After-Hours Emergency Department');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'on_scene_event'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'one'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'pc_reaction_each'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
