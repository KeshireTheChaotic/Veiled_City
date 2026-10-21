import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryStealTheFocusContext} from '../../src/native-adversary-steal-the-focus.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:veil-burned-stalker:steal-the-focus';
const RULE='**Steal the Focus — Action:** Spend a Fear. Move the Stalker from Close to Melee range without a roll and make a standard attack. On a success, the PC also loses 1 Hope if they have any.';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Steal the Focus registers the exact action source and Fear cost',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_steal_the_focus_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'adversary_action');assert.equal(feature.target_policy,'one');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);
  assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Stalker context preserves the action without committing mechanics',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryStealTheFocusContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; no Fear transaction, range change, attack/damage roll, Hope loss or receipt is committed.'});
  assert.deepEqual(projectNativeAdversaryStealTheFocusContext(null),[]);
  assert.deepEqual(projectNativeAdversaryStealTheFocusContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryStealTheFocusContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Steal the Focus only to exact live source context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryStealTheFocusContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Steal the Focus source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Veil-Burned Stalker');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
