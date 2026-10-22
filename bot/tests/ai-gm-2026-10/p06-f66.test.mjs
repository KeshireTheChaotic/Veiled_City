import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryConflictingDutyContext} from '../../src/native-adversary-conflicting-duty.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:clause-eater:conflicting-duty';
const RULE='**Conflicting Duty — Action:** Spend a Fear. The PC makes a Presence Reaction Roll (15). On a failure, choose: mark 2 Stress, lose 1 Hope, or become Vulnerable until they publicly state which obligation they prioritize.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Conflicting Duty is an exact source-bound Action cue with no granted resolution',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_clause_eater_conflicting_duty_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'one');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[{resource:'npc_fear',amount:1}]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Clause-Eater context preserves roll and player-owned consequence choice',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    context={template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]},
    before=structuredClone(context),[cue]=projectNativeAdversaryConflictingDutyContext(context);
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; Fear payment, PC Presence roll, player consequence choice and effects are not committed.'});
  assert.deepEqual(context,before);
});

test('Conflicting Duty rejects absent, mismatched and stale native proofs',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,proof={template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]};
  assert.deepEqual(projectNativeAdversaryConflictingDutyContext(null),[]);
  assert.deepEqual(projectNativeAdversaryConflictingDutyContext({...proof,template_hash:'forged'}),[]);
  assert.deepEqual(projectNativeAdversaryConflictingDutyContext({...proof,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('GM-owned current adversary context dispatches the private Conflicting Duty projector',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryConflictingDutyContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('source drift locally holds Conflicting Duty without hiding unrelated supported features',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Clause-Eater');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key==='adversary:thorn-hound-of-the-green:urban-cover'));
});
