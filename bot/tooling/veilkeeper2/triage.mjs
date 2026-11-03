import fs from 'node:fs';
const root=new URL('../../../docs/veilkeeper2/',import.meta.url);
const contracts=JSON.parse(fs.readFileSync(new URL('RECORD_CONTRACTS.json',root),'utf8'));
/** Mechanical grouping of dynamic record uses by what the call can do. It closes no hold:
 * every group keeps its legacy payload read-only until a typed projection is proved.
 */
export function classify(use){
  if(/\(\s*\.\.\.\s*\w+\s*\)/.test(use.expression))return 'forwarding-wrapper';
  if(!use.write)return /^(?:get)/.test(use.callee)?'keyed-read':'list-read';
  if(/^(?:indexWorldEvent|saveWorldEvent)$/.test(use.callee))return 'world-event-write';
  return use.kindExpression===null&&/\{\s*\.\.\./.test(use.expression)?'city-record-write-spread-kind':'city-record-write-dynamic-kind';
}
/** Literal `kind:"x"` strings in a source text: a bounded candidate set for a writer whose
 * kind arrives through a spread or variable. A candidate set is not proof of the written kinds.
 */
export function candidateKinds(source){return [...new Set([...source.matchAll(/\bkind\s*:\s*(["'`])([A-Za-z0-9_:.-]+)\1/g)].map(m=>m[2]))].sort();}
/** Writers whose kind set was resolved by reading the source, with the evidence line. A resolution
 * closes the kind set only; the legacy payload still stays read-only until a typed projection is proved.
 */
export const RESOLVED_WRITERS=Object.freeze({
  'bot/src/frameworks/daggerheart/environment-access-rules.js':{kinds:['native_environment_admission'],evidence:'environment-access-rules.js:7 const kind'},
  'bot/src/frameworks/daggerheart/environment-witness-rules.js':{kinds:['native_environment_witness_accounts'],evidence:'environment-witness-rules.js:6 const kind'},
  'bot/src/frameworks/daggerheart/mixed-condition-rules.js':{kinds:['native_mixed_condition','pc_native_condition'],eventKinds:['native_mixed_condition','native_pc_condition'],evidence:'mixed-condition-rules.js:10-11 recordKind/eventKind'},
  'bot/src/frameworks/intent/review-action.js':{kinds:['ai_intent'],evidence:'review-action.js:10 getCityRecord(guild,"ai_intent",key); spread preserves row.kind'},
  'bot/src/frameworks/daggerheart/environment-recovery-rules.js':{kinds:['native_environment_resolution'],evidence:'environment-recovery-rules.js:5 const kind (literal candidate native_environment_recovery_declaration is not the written kind)'},
  'bot/src/frameworks/knowledge/historical-archive.js':{kinds:['historical_record_archive'],evidence:'historical-archive.js:6 const archiveKind (candidate set differs)'},
  'bot/src/frameworks/daggerheart/encounter-activation-rules.js':{kinds:['encounter_binding'],evidence:'encounter-activation-rules.js:38,49 spread of getCityRecord(guild,"encounter_binding",...) (candidate native_encounter_activation is only read)'},
  'bot/src/frameworks/persistence/database.js':{kinds:['goal_state'],evidence:'database.js:1787-1788 spread of getCityRecord(guildId,"goal_state",...) (candidate historical_archive_conflict is not the written kind); only the one dynamic writer is resolved, not the file'},
  'bot/src/frameworks/world/long-projects.js':{kinds:['long_project','project_draft'],evidence:'long-projects.js:38,40 before/draft reads spread at :46,:89,:144'},
  'bot/src/frameworks/world/minor-npc-service.js':{kinds:['minor_draft'],evidence:'minor-npc-service.js:30 before=getCityRecord(...,"minor_draft")'},
  'bot/src/frameworks/world/reviewed-authoring.js':{kinds:['world_draft'],evidence:'reviewed-authoring.js:60 before=getCityRecord(...,"world_draft")'},
  'bot/src/application/workflows/session-opening-runner.js':{kinds:['session_opening_job'],partial:true,evidence:'session-opening-runner.js:41,94 read session_opening_job; save() row comes from inspect/assert helpers not re-traced'},
  'bot/src/frameworks/operations/ai-review.js':{kinds:['ai_intent','consequence','goal_transition','group_transition','organization_request','seed_draft','strategy'],evidence:'ai-review.js:21 REVIEW_KINDS and :38/:50 membership checks'}
});
export function triage(uses){
  const groups={};for(const use of uses){const g=classify(use);(groups[g]??={count:0,callees:{},files:{}});groups[g].count++;groups[g].callees[use.callee]=(groups[g].callees[use.callee]??0)+1;groups[g].files[use.file]=(groups[g].files[use.file]??0)+1;}
  return groups;
}
if(import.meta.url===new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`).href){
  const groups=triage(contracts.dynamicUses),writers={};
  for(const use of contracts.dynamicUses)if(/^city-record-write/.test(classify(use))){const w=writers[use.file]??={uses:0,candidateKinds:candidateKinds(fs.readFileSync(new URL('../../../'+use.file,import.meta.url),'utf8')),...(RESOLVED_WRITERS[use.file]?{resolved:RESOLVED_WRITERS[use.file]}:{})};w.uses++;}
  const report={cityRecordWriters:writers,total:contracts.dynamicUses.length,scope:'mechanical grouping only; no record is classified public, migrated or granted execution authority',groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{count:v.count,callees:v.callees,topFiles:Object.entries(v.files).sort((a,b)=>b[1]-a[1]).slice(0,10)}]))};
  fs.writeFileSync(new URL('DYNAMIC_RECORD_TRIAGE.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.count])),null,1),report.total,Object.keys(writers).length,'writer files;',Object.values(writers).filter(w=>w.candidateKinds.length===0&&!w.resolved).length,'unresolved with no literal candidate');
}
