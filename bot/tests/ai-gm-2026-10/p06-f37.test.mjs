import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {compileNativeHouseErrata,nativeHouseErratum,nativeFeatureReviewContract} from '../../src/native-house-errata.js';

const FEATURE='environment:aster-vale-predictive-lab:everything-logs';
const RULE='**Everything Logs — Passive:** Failed intrusion actions create a trace unless the PC spends Hope or has a credible way to suppress it.';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const sources=()=>( {
  adversaries:JSON.parse(read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json')),
  environments:JSON.parse(read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json'))
});

test('Everything Logs and HR14 resolve to the exact qualified source contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'intrusion_trace_owner_payment');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_failed_action_trace_owner_choice');assert.deepEqual(feature.costs,[]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'intrusion_trace_owner_payment');assert.equal(contract.entry,'decisions');
  assert.equal(contract.disposition,'request_pc_action_roll');assert.equal(contract.advantage,false);assert.equal(contract.disadvantage,false);
  assert.match(contract.effect,/before dice/);assert.match(contract.effect,/exactly 1 Hope/);
  const hr14=nativeHouseErratum('HR14');
  assert.equal(hr14.status,'supported');assert.equal(hr14.native_handler,'intrusion_trace_owner_payment');
  assert.equal(hr14.interpretation.trigger,'actual_failed_intrusion_action');
  assert.equal(hr14.interpretation.hope_cost,1);assert.equal(hr14.interpretation.payment_owner,'affected_authenticated_pc_owner');
  assert.equal(hr14.interpretation.optional,true);assert.equal(hr14.interpretation.silence,'never_authorizes_payment');
  assert.equal(hr14.interpretation.alternative,'source_backed_credible_suppression');
  assert.equal(hr14.interpretation.scope,'suppress_only_this_native_intrusion_trace');
  assert.equal(hr14.interpretation.idempotency,'one_payment_per_trace_occurrence');
  assert.ok(compileNativeHouseErrata().includes(hr14));
  assert.equal(nativeFeatureReviewContract(FEATURE).erratum,'HR14');
});




test('modified feature source locally holds capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Aster Vale Predictive Lab');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
