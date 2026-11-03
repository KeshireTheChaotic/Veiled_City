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
  'bot/src/frameworks/daggerheart/pvp-fear-move-rules.js':{kinds:['pvp_exchange_gate','pvp_fear_move_decision','pvp_fear_publication','pvp_fear_threat_state','pvp_fear_trigger'],partial:true,evidence:'pvp-fear-move-rules.js:535,667,705,731,733 and :403 (const kind pvp_fear_publication at :396) traced; :484 current is target() which returns pvp_fear_threat_state for npc_introduce_or_escalate but clocks/simulation entities for other move kinds (not city records); :430/:467/:533 trigger-row filters and :516 held action nodes not traced'},
  'bot/src/frameworks/daggerheart/pvp-brawl-rules.js':{kinds:['pvp_attack_request','pvp_spotlight_opportunity','pvp_target_lock'],partial:true,evidence:'pvp-brawl-rules.js:183,256,265,266,280,281 traced; :152/:155/:184/:254 w-row origins not traced'},
  'bot/src/frameworks/daggerheart/pvp-agreement-rules.js':{kinds:['pvp_agreement','pvp_proposal'],partial:true,evidence:'pvp-agreement-rules.js:100,170,230 traced; :232/:243/:264-298 plan/participant origins not traced'},
  'bot/src/frameworks/session/scene-action-window.js':{kinds:['scene_action_participant','scene_action_window'],partial:true,evidence:'scene-action-window.js:82,92,116,119 traced; :146/:154/:164 plans.get origin not traced'},
  'bot/src/frameworks/daggerheart/incoming-attack-rules.js':{kinds:['npc_volley_attack','pc_incoming_attack'],partial:true,evidence:'incoming-attack-rules.js:227,243,257,299,508 traced; :349 parent.row comes from inspectVolley (:116 reads npc_volley_attack); :354 child rows are parent.children, whose kind is not traced'},
  'bot/src/native-publications.js':{kinds:['pvp_damage_offer'],partial:true,evidence:'native-publications.js:150 traced; :36,:56 kind notice and :70,:75,:166 variable kind not traced'},
  'bot/src/frameworks/world/city-core-rules.js':{kinds:['action','personnel'],partial:true,evidence:'city-core-rules.js:109,131,138,156 traced; :52 kind variable and :128 institute row not traced'},
  'bot/src/frameworks/daggerheart/pvp-damage-rules.js':{kinds:['pvp_attack_request','pvp_damage_offer','pvp_damage_roll_receipt','typed_intent'],partial:true,evidence:'pvp-damage-rules.js:33,172,236,302,306 traced; :237 rewrites p.request rows (attack requests) from proof(); proof() return shape not re-read'},
  'bot/src/frameworks/world/city-civic.js':{kinds:['change','community','message','report'],partial:true,evidence:'city-civic.js:145,170,175,225 traced; :115 kind from data not traced'},
  'bot/src/frameworks/session/action-continuation.js':{kinds:['action_continuation','compound_action'],partial:true,evidence:'action-continuation.js:171,175,192,206 traced; :212 signal origin not traced'},
  'bot/src/frameworks/world/autonomous-world.js':{kinds:['autonomous_entity'],partial:true,evidence:'autonomous-world.js:285 traced; :60,:257,:259,:263 rows not traced'},
  'bot/src/frameworks/world/consequences.js':{kinds:['consequence','consequence_subscription'],evidence:'consequences.js:12,67,71 spread of getCityRecord rows'},
  'bot/src/frameworks/world/commitments.js':{kinds:['commitment','commitment_offer'],evidence:'commitments.js:13,20,67 spread of getCityRecord rows'},
  'bot/src/frameworks/npc/strategy.js':{kinds:['strategy'],evidence:'strategy.js:99,147,150 before=getCityRecord(...,"strategy")'},
  'bot/src/frameworks/world/contact-groups.js':{kinds:['community','group_transition'],evidence:'contact-groups.js:63,84,92,96 getCityRecord group_transition/community'},
  'bot/src/frameworks/session/opening-attendance.js':{kinds:['opening_attendance_registration','opening_entry_opportunity'],evidence:'opening-attendance.js:5 const KIND; :155,158 getCityRecord opening_entry_opportunity'},
  'bot/src/frameworks/session/session-opening.js':{kinds:['session_opening_job'],partial:true,evidence:'session-opening.js:4 const KIND; :34,96,155 rows come from inspectSessionOpening, not traced'},
  'bot/src/frameworks/knowledge/memory-lifecycle.js':{kinds:['memory_revision'],partial:true,evidence:'memory-lifecycle.js:107,118 traced; :82 old row origin not traced'},
  'bot/src/frameworks/daggerheart/gm-action-review-rules.js':{kinds:['typed_intent','unsupported_action'],evidence:'gm-action-review-rules.js:64,107,109 getCityRecord rows'},
  'bot/src/frameworks/daggerheart/gm-ruling-rules.js':{kinds:['typed_intent','unsupported_action'],evidence:'gm-ruling-rules.js:143,151,173 getCityRecord rows'},
  'bot/src/application/workflows/assembly-planning.js':{kinds:['assembly_refresh'],evidence:'assembly-planning.js:73,92,100 getCityRecord assembly_refresh'},
  'bot/src/application/workflows/session-opening-recovery.js':{kinds:['session_opening_precommit_review','session_opening_review'],evidence:'session-opening-recovery.js:54,99,103 getCityRecord rows'},
  'bot/src/frameworks/daggerheart/encounter-grounding-rules.js':{kinds:['encounter_binding','encounter_proposal'],evidence:'encounter-grounding-rules.js:52,70 getCityRecord rows'},
  'bot/src/frameworks/narrative/fresh-npc-authoring.js':{kinds:['npc_authoring_attempt'],evidence:'fresh-npc-authoring.js:135,140 getCityRecord attempt'},
  'bot/src/frameworks/world/seed-drafts.js':{kinds:['seed_draft'],evidence:'seed-drafts.js:67,163 before=getCityRecord seed_draft'},
  'bot/src/frameworks/knowledge/owned-community.js':{kinds:['organization_request'],evidence:'owned-community.js:58,107 getCityRecord organization_request'},
  'bot/src/frameworks/session/scene-setup.js':{kinds:['scene_setup'],evidence:'scene-setup.js:89,103 getCityRecord scene_setup'},
  'bot/src/frameworks/world/infrastructure.js':{kinds:['infrastructure'],partial:true,evidence:'infrastructure.js:80 traced; :63 lookup.get row not traced'},
  'bot/src/frameworks/daggerheart/typed-roll-outcome-rules.js':{kinds:['roll_request'],partial:true,evidence:'typed-roll-outcome-rules.js:68 traced; :33,:37,:41 rows not traced'},
  'bot/src/frameworks/daggerheart/pc-death-rules.js':{kinds:['pc_death_outcome'],partial:true,evidence:'pc-death-rules.js:96 traced; :53,:96 requestProof and :263 blazeActionAuthorization rows not traced'},
  'bot/src/frameworks/daggerheart/pvp-round-rules.js':{kinds:['pvp_proposal','pvp_resolution_receipt'],partial:true,evidence:'pvp-round-rules.js:147 traced; :30,:37 w rows not traced'},
  'bot/src/frameworks/intent/semantic-intake.js':{kinds:['semantic_intent_proposal'],partial:true,evidence:'semantic-intake.js:166 traced; :122,:168 rows not traced'},
  'bot/src/frameworks/daggerheart/pc-effect-rules.js':{kinds:['pc_effect_authority'],evidence:'pc-effect-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/group-feature-execution-rules.js':{kinds:['gm_group_feature_execution','native_mixed_condition'],evidence:'group-feature-execution-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/knowledge/personal-continuity.js':{kinds:['arc_beat','arc_candidate'],evidence:'personal-continuity.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/feature-window-rules.js':{kinds:['native_feature_window'],evidence:'feature-window-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/state.js':{kinds:['pvp_campaign_review'],evidence:'state.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/npc/motivation.js':{kinds:['goal_transition'],evidence:'motivation.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/world/identity-rules.js':{kinds:['autonomous_entity'],evidence:'identity-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/roll-menu.js':{kinds:['roll_menu_token'],evidence:'roll-menu.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/session/story-continuity.js':{kinds:['story_setup'],evidence:'story-continuity.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/pvp-menu.js':{kinds:['pvp_ui_token'],evidence:'pvp-menu.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/world/upkeep.js':{kinds:['upkeep'],evidence:'upkeep.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/session/negotiations.js':{kinds:['institution'],evidence:'negotiations.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/session/scene-entry-native.js':{kinds:['scene_entry'],evidence:'scene-entry-native.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/pvp-fear-gate-rules.js':{kinds:['pvp_fear_trigger'],evidence:'pvp-fear-gate-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/ordinary-effect-rules.js':{kinds:['unsupported_action'],evidence:'ordinary-effect-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/knowledge/memory-clusters.js':{kinds:['memory_cluster'],evidence:'memory-clusters.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/intent/action-dependency.js':{kinds:['compound_action'],evidence:'action-dependency.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/pvp-terminal-rules.js':{kinds:['scene_action_window'],evidence:'pvp-terminal-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/rules-arbitration-rules.js':{kinds:['typed_intent'],evidence:'rules-arbitration-rules.js source-read: spread rows are getCityRecord results of these kinds'},
  'bot/src/frameworks/daggerheart/pvp-attack-rules.js':{kinds:['pvp_attack_request'],partial:true,evidence:'pvp-attack-rules.js:237 traced; :283 proof.row not traced'},
  'bot/src/frameworks/narrative/scene-fiction-authority.js':{kinds:['scene_authoring_attempt'],partial:true,evidence:'scene-fiction-authority.js:82 traced; :78 not traced'},
  'bot/src/frameworks/narrative/fresh-scene-authoring.js':{kinds:['scene_authoring_attempt'],partial:true,evidence:'fresh-scene-authoring.js:97 traced; :92 not traced'},
  'bot/src/frameworks/daggerheart/feature-effect-rules.js':{kinds:['native_feature_window'],partial:true,evidence:'feature-effect-rules.js:80 traced; :53 inspectFeatureWindow row not traced'},
  'bot/src/application/workflows/assembly-publications.js':{kinds:['assembly_reconciliation'],partial:true,evidence:'assembly-publications.js:103 traced; :66 job row not traced'},
  'bot/src/frameworks/daggerheart/gm-execution-rules.js':{kinds:['gm_action_continuation'],partial:true,evidence:'gm-execution-rules.js:76 traced; :165 request row not traced'},
  'bot/src/frameworks/daggerheart/environment-recording-rules.js':{kinds:['native_environment_recording'],evidence:'environment-recording-rules.js:5 const kind'},
  'bot/src/frameworks/daggerheart/environment-countdown-rules.js':{kinds:['native_environment_countdown','native_environment_countdown_head','native_environment_countdown_step'],partial:true,evidence:'environment-countdown-rules.js:11 KIND/STEP constants and :114 _head traced; :98 local kind is KIND or STEP, not traced'},
  'bot/src/content-packages.js':{kinds:['seed_draft'],partial:true,evidence:'content-packages.js:70 spreads reviewSeedDraft result; seed_draft kind assumed from that function and not re-traced'},
  'bot/src/frameworks/daggerheart/typed-roll-execution.js':{kinds:['typed_intent'],evidence:'typed-roll-execution.js:23 accepted=listCityRecords kind typed_intent; declaration=accepted[0] spread at :66,:75,:92'},
  'bot/src/frameworks/narrative/narrative-salience.js':{kinds:['narrative_salience'],evidence:'narrative-salience.js:164,168 rows from records(db,guild,"narrative_salience")'},
  'bot/src/frameworks/daggerheart/condition-recovery-rules.js':{kinds:['native_mixed_condition','pc_native_condition'],partial:true,evidence:'condition-recovery-rules.js:56,84 condition from injected validateNativeCondition; kinds taken from mixed-condition-rules recordKind, injection wiring not re-traced'},
  'bot/src/frameworks/intent/typed-intent-persistence.js':{kinds:['semantic_intent_proposal','typed_intent'],partial:true,evidence:'typed-intent-persistence.js:122,165 reads; :131 acceptedRow comes from acceptIntentForAdjudication/resolvePendingReferent, not traced'},
  'bot/src/frameworks/daggerheart/pvp-profile-rules.js':{kinds:['pvp_encounter_contract'],partial:true,evidence:'pvp-profile-rules.js live() reads pvp_encounter_contract; :193 spread of live() result not traced'},
  'bot/src/frameworks/session/scene-continuity.js':{kinds:['scene_presence'],evidence:'scene-continuity.js:60-64,169 records() lists kind scene_presence; :172 archives those rows'},
  'bot/src/frameworks/narrative/narrative-authority.js':{kinds:['scene_authoring_attempt'],evidence:'narrative-authority.js:210 spread of getCityRecord(...,"scene_authoring_attempt",attempt)'},
  'bot/src/frameworks/knowledge/narrative-memory.js':{kinds:['narrative_delivery'],evidence:'narrative-memory.js:79,91 job from listNarrativeRecords(...,"narrative_delivery")'},
  'bot/src/frameworks/narrative/interpretation-context.js':{kinds:['scene_entry'],evidence:'interpretation-context.js:115,125 entry from db.characterContinuity(...,{kind:"scene_entry"}); that reader is not re-traced',partial:true},
  'bot/src/frameworks/daggerheart/pvp-reaction-rules.js':{kinds:['pvp_reaction_offer'],partial:true,evidence:'pvp-reaction-rules.js:23 proof() reads pvp_reaction_offer; :86 f.row assumed to be that row, return of proof() not read'},
  'bot/src/frameworks/session/window-coordinator.js':{kinds:['scene_action_window'],partial:true,evidence:'window-coordinator.js:29-30 current() reads scene_action_window and :70 closes it; :136 resolveActionWindow result and :222 plan not traced'},
  'bot/src/frameworks/daggerheart/roll-collaboration-rules.js':{kinds:['roll_request'],partial:true,evidence:'roll-collaboration-rules.js:218 roll_request read; save() callers :354 (other) and :428 (row) not fully traced'},
  'bot/src/frameworks/operations/ai-review.js':{kinds:['ai_intent','consequence','goal_transition','group_transition','organization_request','seed_draft','strategy'],evidence:'ai-review.js:21 REVIEW_KINDS and :38/:50 membership checks'}
});
/** Review aid: for a `{...name,` spread write, the nearest earlier assignment of `name` in the file.
 * It shows where a row came from; a human still has to read it before adding a resolution.
 */
export function spreadOrigin(source,use){
  const name=/\{\s*\.\.\.\s*([A-Za-z_$][\w$]*)/.exec(use.expression)?.[1];if(!name)return null;
  const before=source.split(/\r?\n/).slice(0,use.line).join('\n'),re=new RegExp(`\\b${name.replace(/\$/g,'\\$')}\\s*=(?!=)\\s*([^;\\n]{0,200})`,'g');let last=null,m;while((m=re.exec(before)))last=m[1];return {name,assignedFrom:last};
}
/** A forwarding wrapper is pure when the call spreads the enclosing function's own rest parameter
 * and nothing else, so it adds no record kind: kinds are decided at its callers.
 */
export function isPureForwarder(source,use){
  const arg=/\(\s*\.\.\.\s*(\w+)\s*\)/.exec(use.expression)?.[1];if(!arg)return false;
  const head=source.split(/\r?\n/).slice(Math.max(0,use.line-4),use.line).join('\n');
  return new RegExp(`\\(\\s*(?:[\\w$,\\s]*,)?\\s*\\.\\.\\.\\s*${arg}\\s*\\)\\s*(?:=>|\\{)`).test(head)||new RegExp(`\\.\\.\\.\\s*${arg}\\s*\\)\\s*(?:=>|\\{)`).test(head);
}
export function triage(uses){
  const groups={};for(const use of uses){const g=classify(use);(groups[g]??={count:0,callees:{},files:{}});groups[g].count++;groups[g].callees[use.callee]=(groups[g].callees[use.callee]??0)+1;groups[g].files[use.file]=(groups[g].files[use.file]??0)+1;}
  return groups;
}
if(import.meta.url===new URL(`file:///${process.argv[1].replace(/\\/g,'/')}`).href){
  const groups=triage(contracts.dynamicUses),writers={};
  for(const use of contracts.dynamicUses)if(/^city-record-write/.test(classify(use))){const w=writers[use.file]??={uses:0,candidateKinds:candidateKinds(fs.readFileSync(new URL('../../../'+use.file,import.meta.url),'utf8')),...(RESOLVED_WRITERS[use.file]?{resolved:RESOLVED_WRITERS[use.file]}:{})};w.uses++;}
  const wrappers=contracts.dynamicUses.filter(u=>classify(u)==='forwarding-wrapper').map(u=>({file:u.file,line:u.line,pure:isPureForwarder(fs.readFileSync(new URL('../../../'+u.file,import.meta.url),'utf8'),u)})),report={forwardingWrappers:{total:wrappers.length,pure:wrappers.filter(w=>w.pure).length,notVerified:wrappers.filter(w=>!w.pure)},cityRecordWriters:writers,total:contracts.dynamicUses.length,scope:'mechanical grouping only; no record is classified public, migrated or granted execution authority',groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{count:v.count,callees:v.callees,topFiles:Object.entries(v.files).sort((a,b)=>b[1]-a[1]).slice(0,10)}]))};
  fs.writeFileSync(new URL('DYNAMIC_RECORD_TRIAGE.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.count])),null,1),report.total,Object.keys(writers).length,'writer files;',Object.values(writers).filter(w=>w.candidateKinds.length===0&&!w.resolved).length,'unresolved with no literal candidate');
}

