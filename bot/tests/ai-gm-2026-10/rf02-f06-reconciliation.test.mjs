import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileTransitions} from '../../tooling/architecture/transition-audit.mjs';
import {violationId,transitionBaselineHash,applyTransitions} from '../../tooling/architecture/boundary-checker.mjs';
import {buildCommands,commandCharacterCount,validateCommandSchema,assertValidCommandSchema} from '../../src/frameworks/discord/public.js';
import {selectFreshTests} from '../../src/frameworks/operations/ai-gm-test-selection.js';
import {qualifyTypedIntentRelease} from '../../src/frameworks/operations/typed-intent-qualification.js';
function fixture(){
 const value={code:'LEGACY_MODULE_LOCATION',from:'bot/src/audit-sample.js',owner:'character'},id=violationId(value),entry={...value,id,max_occurrences:1,remove_in_feature:'RF02-F04',expires_after:'RF02',reviewed_base_sha:'fixture-native-base',reason:'Exact original fixture'},baseline={source_sha:'fixture-native-base',violations:{[id]:1}};
 const manifest={version:1,baseline_sha256:transitionBaselineHash(baseline),entries:[entry]},audit={owner_authorization:'explicit fixture owner decision',records:[{id,original:structuredClone(entry),classification:'VALIDATED_FUTURE_DEPENDENCY',remove_in_feature:'RF03-F01',expires_after:'RF03',intended_owner:'daggerheart',justification:'Mechanical rule projection requires its native feature',evidence:[{source:entry.from,symbol:'prepareRule'}]}]};
 return {manifest,audit,options:{baseline,currentViolationIds:new Set([id])},entry};
}
test('audited future deadline preserves every identity/count field and leaves original objects untouched',()=>{
 const f=fixture(),snapshot=structuredClone(f),r=reconcileTransitions(f.manifest,f.audit,f.options);
 assert.deepEqual(f,snapshot);assert.deepEqual(r.manifest.entries[0],{...f.entry,remove_in_feature:'RF03-F01',expires_after:'RF03'});assert.deepEqual(r.held_ids,[]);
 const report={violations:[f.entry],summary:{}},pass=applyTransitions(report,r.manifest,{phase:'RF03',legacyPaths:new Set([f.entry.from]),baseline:f.options.baseline});assert.equal(pass.summary.pass,true);
 assert.equal(applyTransitions(report,r.manifest,{phase:'RF04',legacyPaths:new Set([f.entry.from]),baseline:f.options.baseline}).summary.pass,false);
});
test('omitted, duplicate, unknown, stale and changed-identity audit records fail closed',()=>{
 for(const mutation of [f=>f.audit.records=[],f=>f.audit.records.push(structuredClone(f.audit.records[0])),f=>f.audit.records[0].id='unknown',f=>f.audit.records[0].original.max_occurrences=2,f=>f.options.currentViolationIds.clear()]){
   const f=fixture();mutation(f);assert.throws(()=>reconcileTransitions(f.manifest,f.audit,f.options));
 }
});
test('owner approval, real evidence and matching accountable feature/phase are required',()=>{
 for(const mutation of [f=>delete f.audit.owner_authorization,f=>f.audit.records[0].evidence=[],f=>f.audit.records[0].remove_in_feature='RF03-F07',f=>f.audit.records[0].expires_after='RF06',f=>f.manifest.baseline_sha256='changed']){
  const f=fixture();mutation(f);assert.throws(()=>reconcileTransitions(f.manifest,f.audit,f.options));
 }
});
test('uncertain or unresolved outstanding entries remain held without a deadline extension',()=>{
 for(const classification of ['UNJUSTIFIED_OR_UNCERTAIN','RF02_OUTSTANDING']){
  const f=fixture();f.audit.records[0].classification=classification;const r=reconcileTransitions(f.manifest,f.audit,f.options);
  assert.deepEqual(r.held_ids,[f.entry.id]);assert.deepEqual(r.manifest.entries,[f.entry]);
 }
});
test('resolved outstanding record is removed only with current absence proof',()=>{
 const f=fixture();f.audit.records[0].classification='RF02_OUTSTANDING';f.audit.records[0].resolution='RESOLVED';
 assert.equal(reconcileTransitions(f.manifest,f.audit,f.options).held_ids.length,1);f.options.currentViolationIds.clear();
 const r=reconcileTransitions(f.manifest,f.audit,f.options);assert.deepEqual(r.manifest.entries,[]);assert.deepEqual(r.removed_ids,[f.entry.id]);
});
test('a review cannot silently remove an additional still-present native edge',()=>{
 const f=fixture(),other={...f.entry,from:'bot/src/other-sample.js'};other.id=violationId(other);other.expires_after='RF06';other.remove_in_feature='RF06-F02';f.manifest.entries.push(other);
 f.audit.additional_resolutions=[{id:other.id,justification:'Updated native consumer',evidence:[{source:other.from}]}];f.options.currentViolationIds.add(other.id);
 assert.throws(()=>reconcileTransitions(f.manifest,f.audit,f.options));f.options.currentViolationIds.delete(other.id);
 assert.deepEqual(reconcileTransitions(f.manifest,f.audit,f.options).removed_ids,[other.id]);
});
test('relocated command builders produce deterministic inert schema without registering commands',()=>{
 const first=buildCommands(),second=buildCommands();assert.ok(first.length>0);assert.deepEqual(first,second);
 assert.equal(new Set(first.map(c=>c.name)).size,first.length);assert.ok(first.every(c=>typeof c.name==='string'&&(c.options===undefined||Array.isArray(c.options))));
});
test('relocated schema counts localization and nested choices and preserves required-option failures',()=>{
 const valid=[{name:'test',description:'Description',options:[{name:'value',description:'V',type:3,required:true,choices:[{name:'Long',value:'x'}]}]}];
 assert.deepEqual(validateCommandSchema(valid),[]);assert.doesNotThrow(()=>assertValidCommandSchema(valid));
 assert.equal(commandCharacterCount({name:'x',name_localizations:{fr:'long'},description:'y',options:[{name:'z',choices:[{name:'v',value:'12'}]}]}),9);
 const bad=[{name:'test',description:'D',options:[{name:'first',type:3},{name:'second',type:3,required:true}]}];assert.throws(()=>assertValidCommandSchema(bad),/required option 'second'/);
});
test('relocated independent selector handles only caller-supplied fresh paths without registry execution',()=>{
 const mapping={'bot/src/sample.js':['bot/tests/ai-gm-2026-10/p99-f01-new.test.mjs']};
 assert.deepEqual(selectFreshTests(['bot/src/sample.js'],mapping),{tests:mapping['bot/src/sample.js'],uncovered:[],qualified:true});
 assert.equal(selectFreshTests(['bot/src/unmapped.js'],mapping).qualified,false);assert.throws(()=>selectFreshTests(['../escape.js'],mapping),/canonical paths/);
});
test('relocated qualification helper preserves synthetic-only status and detects incomplete metrics',()=>{
 const metrics=Object.fromEntries(['semantic_omissions','semantic_overreach','false_refusal','false_success','mis_scoped_npc_knowledge','unnecessary_rolls','missing_rolls','duplicate_receipts','invalid_cross_player_conflicts','secret_leaks','unauthorized_effects','skipped_security_suites'].map(k=>[k,0]));
 const result=qualifyTypedIntentRelease(metrics,{required_suites:['new-case'],passed_suites:['new-case']});assert.equal(result.ready,true);assert.equal(result.fixture_only,true);assert.equal(result.live_requests,0);
 assert.equal(qualifyTypedIntentRelease({...metrics,secret_leaks:1}).ready,false);assert.throws(()=>qualifyTypedIntentRelease({}),/complete nonnegative/);
});
