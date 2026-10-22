import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryPredatoryGraceContext} from '../../src/native-adversary-predatory-grace.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:pale-court-knight:predatory-grace';
const RULE='**Predatory Grace — Passive:** The Knight ignores the first instance of forced movement each scene.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Predatory Grace registers the exact Passive source contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_predatory_grace_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'before_movement_applied');
  assert.equal(feature.target_policy,'one');assert.equal(feature.roll_protocol,'native_adversary_context');
  assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Knight context exposes the passive without committing movement prevention',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryPredatoryGraceContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; forced-movement event matching and once-per-scene prevention are not committed.'});
  assert.deepEqual(projectNativeAdversaryPredatoryGraceContext(null),[]);
  assert.deepEqual(projectNativeAdversaryPredatoryGraceContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryPredatoryGraceContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Predatory Grace to exact live actor context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryPredatoryGraceContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Predatory Grace source drift locally removes the native cue',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Pale Court Knight');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
