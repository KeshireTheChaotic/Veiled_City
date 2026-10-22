import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryBadFutureContext} from '../../src/native-adversary-bad-future.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:morrowline-echo:bad-future';
const RULE='**Bad Future — Reaction:** When reduced to 3 HP or fewer, the Echo projects three possible outcomes. The GM truthfully states one danger, one opportunity, and one uncertainty in the current scene.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Bad Future registers the exact owner-authorized Reaction contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_bad_future_context');
  assert.equal(feature.type,'Reaction');assert.equal(feature.trigger_kind,'on_hp_at_or_below_three');
  assert.equal(feature.target_policy,'current_scene');assert.equal(feature.roll_protocol,'native_adversary_context');
  assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Echo context carries exactly the truthful three-part cue',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryBadFutureContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Owner-authorized source behavior: truthfully state one danger, one opportunity, and one uncertainty in the current scene; the GM retains creative latitude in their content.'});
  assert.deepEqual(projectNativeAdversaryBadFutureContext(null),[]);
  assert.deepEqual(projectNativeAdversaryBadFutureContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryBadFutureContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Bad Future to exact live actor context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryBadFutureContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Bad Future source drift locally removes the native cue',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Morrowline Echo');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
