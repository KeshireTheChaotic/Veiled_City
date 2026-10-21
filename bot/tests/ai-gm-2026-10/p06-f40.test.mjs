import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryProfessionalEntryContext} from '../../src/native-adversary-professional-entry.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:aster-vale-contractor:professional-entry';
const RULE='**Professional Entry — Passive:** The Contractor has advantage on the first roll made to breach, restrain, or surprise a prepared position.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Professional Entry registers its exact passive source and GM-context handler',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_professional_entry_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Contractor context preserves the first qualifying roll rule without inventing its boundary',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryProfessionalEntryContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; no prepared-position ruling, first-use tracking or Advantage roll modifier is committed.'});
  assert.deepEqual(projectNativeAdversaryProfessionalEntryContext(null),[]);
  assert.deepEqual(projectNativeAdversaryProfessionalEntryContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryProfessionalEntryContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('native GM adversary provenance attaches exact cues only to live bound actor context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryProfessionalEntryContext\(terms\)/);
  assert.match(source,/projectNativeAdversaryBreakTheHoldContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Professional Entry source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Aster Vale Contractor');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
