import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryFlowAroundItContext} from '../../src/native-adversary-flow-around-it.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:river-hound:flow-around-it';
const RULE='**Flow Around It — Passive:** The Hound can pass through gaps large enough for flowing water.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Flow Around It registers the exact passive source and native context terms',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_flow_around_it_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified River Hound context preserves the rule without traversal commit',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryFlowAroundItContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; no gap-size ruling, passage or position change is committed.'});
  assert.deepEqual(projectNativeAdversaryFlowAroundItContext(null),[]);
  assert.deepEqual(projectNativeAdversaryFlowAroundItContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryFlowAroundItContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Flow Around It only to exact live source context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryFlowAroundItContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Flow Around It source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='River Hound');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
