import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryBreakTheHoldContext} from '../../src/native-adversary-break-the-hold.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:pale-court-thrall:break-the-hold';
const RULE='**Break the Hold — Reaction:** When the Thrall is shown undeniable proof that its master has abandoned it, the PC can make a Presence Roll (11). On a success, remove this Thrall from the conflict without defeating them.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Break the Hold registers its exact Reaction source and bounded actor context handler',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_break_the_hold_context');
  assert.equal(feature.type,'Reaction');assert.equal(feature.trigger_kind,'on_scene_event');assert.equal(feature.target_policy,'one');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified actor context exposes the optional Presence Roll without deciding proof or result',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryBreakTheHoldContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Source-bound GM cue only; proof remains GM-adjudicated and the PC chooses whether to roll. No roll, result or conflict removal is committed.'});
  assert.deepEqual(projectNativeAdversaryBreakTheHoldContext(null),[]);
  assert.deepEqual(projectNativeAdversaryBreakTheHoldContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryBreakTheHoldContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('native GM adversary provenance attaches the cue only to current verified context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryBreakTheHoldContext\(terms\)/);
  assert.match(source,/feature_rule_contexts/);
  assert.match(source,/nativeEncounterActor/);
  assert.match(source,/nativeActorControl/);
});

test('Break the Hold source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Pale Court Thrall');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
