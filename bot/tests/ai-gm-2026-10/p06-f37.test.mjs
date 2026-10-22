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

test('native trace handler gates every exact owner-authorized HR14 v1 term',()=>{
  const trace=read('../../src/native-environment-trace.js'),rules=trace.slice(trace.indexOf('function rules()'),trace.indexOf('function failedAction'));
  for(const term of ['rule?.status!==\'supported\'','rule.native_handler!==\'intrusion_trace_owner_payment\'',
    'rule.authority_ref!==\'owner:everything-logs-hope:v1\'','rule.interpretation.optional!==true',
    'rule.interpretation.payment_owner!==\'affected_authenticated_pc_owner\'',
    'rule.interpretation.silence!==\'never_authorizes_payment\'',
    'rule.interpretation.scope!==\'suppress_only_this_native_intrusion_trace\'',
    'rule.interpretation.idempotency!==\'one_payment_per_trace_occurrence\'']) assert.ok(rules.includes(term),term);
});

test('native route records the exact intrusion classification before the PC roll and handles failure afterward',()=>{
  const trace=read('../../src/native-environment-trace.js'),arbitration=read('../../src/gm-unified-arbitration.js'),
    outcome=read('../../src/typed-roll-outcomes.js');
  const decision=arbitration.indexOf("const traceRisk=p.feature_ref==='environment:aster-vale-predictive-lab:everything-logs'");
  const ruling=arbitration.indexOf('const r=adjudicateGmRuling',decision);
  assert.ok(decision>=0&&ruling>decision);
  assert.match(trace,/proposal\.feature_ref!==FEATURE/);assert.match(trace,/proposal\.disposition!=='request_pc_action_roll'/);
  assert.match(trace,/proposal\.advantage\|\|proposal\.disadvantage/);
  assert.match(trace,/profile\?\.data\.template_hash!==feature\.template_hash/);
  assert.match(trace,/proof\.outcome!=='failure'/);assert.match(trace,/hope_cost:1,choices:\['pay_hope','leave_trace','native_suppression'\]/);
  assert.match(outcome,/captureEnvironmentTrace\(db,guild,actionId\)/);
});

test('only an actual failure opens the private owner trace choice and never grants NPC knowledge',()=>{
  const trace=read('../../src/native-environment-trace.js'),offer=trace.slice(trace.indexOf('export function prepareEnvironmentTrace'),trace.indexOf('export function inspectEnvironmentTrace')),
    choice=trace.slice(trace.indexOf('export function chooseEnvironmentTrace'),trace.indexOf('export function inspectEnvironmentTraceResult')),
    saved=trace.slice(trace.indexOf('export function inspectEnvironmentTraceResult'));
  assert.match(offer,/failedAction\(db,guild,entry\.intent_ref\)/);assert.match(offer,/visibility:'gm'/);
  assert.match(offer,/status:'pending_owner_choice'/);assert.match(offer,/knowledge_authorized:false/);assert.match(offer,/publication_authorized:false/);
  assert.match(choice,/user!==d\.owner/);assert.match(choice,/principal\.kind!=='owner'/);
  assert.match(choice,/input\.choice==='pay_hope'\?1:0/);assert.match(choice,/data\.resources\.hope-=amount/);
  assert.match(choice,/input\.choice==='native_suppression'/);
  assert.match(choice,/proof\.row\.data\.target_key!==offer\.record_key/);
  assert.match(saved,/ownerAuthoredSource/);assert.match(saved,/d\.hope_spent!==\(d\.choice==='pay_hope'\?1:0\)/);
  assert.match(saved,/trace\.data\.knowledge_authorized!==false/);assert.match(saved,/trace\.data\.publication_authorized!==false/);
});

test('modified feature source locally holds capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Aster Vale Predictive Lab');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
