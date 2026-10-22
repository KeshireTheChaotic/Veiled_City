import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryLoopholeContext} from '../../src/native-adversary-loophole.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';
const FEATURE='adversary:clause-eater:loophole';
const RULE='**Loophole — Reaction:** When the PC invokes a pact, oath, written authority, or social promise, mark a Stress. The PC must clarify one limitation or exception; if none exists, they mark a Stress instead.';
const sources=()=>({adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))});
test('Loophole binds exact Reaction, invoker, NPC Stress cost and source',()=>{
 const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
 assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_clause_eater_loophole_context');assert.equal(feature.type,'Reaction');assert.equal(feature.trigger_kind,'on_pc_invokes_obligation');assert.equal(feature.target_policy,'invoking_pc');assert.equal(feature.roll_protocol,'native_adversary_context');assert.deepEqual(feature.costs,[{resource:'npc_stress',amount:1}]);assert.equal(inspection.printed_rule,RULE);assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
test('verified context exposes exact cue without resolving PC clarification or Stress',()=>{
 const feature=featureDisposition(FEATURE,sources()).feature,[cue]=projectNativeAdversaryLoopholeContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
 assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,authority:'Exact source-bound GM cue only; trigger proof, PC clarification, and all Stress/resource changes are not committed.'});
});
test('Loophole refuses absent, mismatched and stale native proofs',()=>{
 const feature=featureDisposition(FEATURE,sources()).feature,proof={template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]};
 assert.deepEqual(projectNativeAdversaryLoopholeContext({}),[]);assert.deepEqual(projectNativeAdversaryLoopholeContext({...proof,template_hash:'wrong'}),[]);assert.deepEqual(projectNativeAdversaryLoopholeContext({...proof,features:[{key:FEATURE,hash:'wrong'}]}),[]);
});
