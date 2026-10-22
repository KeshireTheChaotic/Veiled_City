import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversarySelfFulfillingEventContext} from '../../src/native-adversary-self-fulfilling-event.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:morrowline-echo:self-fulfilling-event';
const RULE='**Self-Fulfilling Event — Action:** Spend a Fear and name a plausible immediate hazard already present in the scene. The PC makes an Agility or Instinct Reaction Roll (13). On a failure, take 1d8+3 damage and the hazard becomes real; on a success, take half damage or avoid the secondary complication.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Self-Fulfilling Event registers exact Action, target and one Fear',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_self_fulfilling_event_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'after_gm_names_existing_hazard');assert.equal(feature.target_policy,'one_pc');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[{resource:'npc_fear',amount:1}]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Echo context does not create a hazard, roll, spend or scene change',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversarySelfFulfillingEventContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; Fear, hazard eligibility/creation, PC roll, damage, success choice and replay are not committed.'});
  assert.deepEqual(projectNativeAdversarySelfFulfillingEventContext(null),[]);
  assert.deepEqual(projectNativeAdversarySelfFulfillingEventContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversarySelfFulfillingEventContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Self-Fulfilling Event only to exact live source context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversarySelfFulfillingEventContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Self-Fulfilling Event source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Morrowline Echo');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
