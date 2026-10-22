import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryRootSnareContext} from '../../src/native-adversary-root-snare.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:thorn-hound-of-the-green:root-snare';
const RULE='**Root Snare — Action:** A target within Close range makes an Agility Reaction Roll (15). On a failure, take 2d6+3 magic damage and become Restrained until freed.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Root Snare registers exact Action, Close target and no resource cost',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_root_snare_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'on_root_snare_action');
  assert.equal(feature.target_policy,'one_within_close');assert.equal(feature.roll_protocol,'native_adversary_context');
  assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Hound context preserves PC roll and consequence authority',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryRootSnareContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; target/range proof, PC Agility Reaction Roll, damage, Restrained state and recovery are not committed.'});
  assert.deepEqual(projectNativeAdversaryRootSnareContext(null),[]);
  assert.deepEqual(projectNativeAdversaryRootSnareContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryRootSnareContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Root Snare to exact live actor context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryRootSnareContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Root Snare source drift locally removes the native cue',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Thorn-Hound of the Green');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
