import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryRideTheCurrentContext} from '../../src/native-adversary-ride-the-current.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:static-wraith:ride-the-current';
const RULE='**Ride the Current — Passive:** The Wraith can move between powered devices within Close range without crossing the intervening space.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Ride the Current registers the exact source and passive context terms',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_ride_the_current_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Static Wraith context preserves the passive without committing a movement',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryRideTheCurrentContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; no powered-device eligibility, Close-range proof, destination, movement or replay state is committed.'});
  assert.deepEqual(projectNativeAdversaryRideTheCurrentContext(null),[]);
  assert.deepEqual(projectNativeAdversaryRideTheCurrentContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryRideTheCurrentContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Ride the Current only to exact live source context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryRideTheCurrentContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Ride the Current source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Static Wraith');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
