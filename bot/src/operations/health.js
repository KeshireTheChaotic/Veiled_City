/** GM-only, content-free operational reports. Reads native status without invoking validators, recovery or models. */
import {operationalMetrics} from '../operational-metrics.js';
const statuses=new Set(['active','proposed','selected','superseded','awaiting_pair','awaiting_move','move_selected',
  'executing','resolved','needs_review','needs_scope_review','pending','blocked','needs_adjudication','ready',
  'awaiting_defense','awaiting_armor','awaiting_damage','awaiting_owner','awaiting_death','accepted','declined','revoked',
  'withdrawn','delivering','delivered','uncertain','failed','queued','received','capturing','captured','generating',
  'generated','validating','validated','committed','publishing','needs_recovery','cancelled','complete','routed','pre_director',
  'pending_choice','reviewed','missed','held','not_sent']);
const safe=value=>statuses.has(value)?value:'unknown';
function recovery(kind,status,source){
  if(kind==='historical_archive_conflict')return 'Archive proof changed or was reversed. Inspect history; no native effects or old actions were restored.';
  if(source&&source!=='active')return 'Revalidate the exact source and audience; preserve committed native effects. Do not publish stale material.';
  if(kind==='publication'||kind==='pvp_ui_delivery')return ['uncertain','delivering'].includes(status)?
    'Inspect exact Discord delivery; reconcile evidence before any resend. Never blindly retry.':
    'Inspect saved delivery and current audience. Only demonstrably unsent output may retry; never rerun mechanics.';
  if(kind==='pvp_fear_trigger')return status==='awaiting_pair'?
    'Await the other authorized roll or neutral withdrawal path; saved roll remains unchanged.':status==='needs_review'?
    'Inspect native Fear review; correct missing source/rule/target/authority then explicitly reconcile. Fear is still due.':
    'Fear is due now. Inspect exact native decision and any pending owner defense/Armor choice; resume only authorized native resolution.';
  if(kind==='pc_incoming_attack')return 'Await the affected owner defense/Armor/death choice; do not choose for the PC.';
  if(kind==='pvp_output_quarantine')return 'Private scope review only; GM cannot author or consent to another PC response.';
  return 'Inspect saved native continuation/turn receipt and current source; do not repeat a committed effect or model call.';
}
export function operationalReport(db,guildId,{authorized=false,metrics=operationalMetrics,reference=null}={}){
  if(!authorized||!guildId)throw Object.assign(new Error('GM/admin permission required.'),{code:'PERMISSION_DENIED'});
  const native=db.operationalHealthData(guildId),normalize=rows=>rows.map(r=>({
    ...(r.kind?{kind:r.kind}:{}),status:safe(r.status),count:r.count}));
  const incidents=native.incidents.map(r=>({reference:metrics.reference(guildId,r.kind,r.record_key),kind:r.kind,
    status:safe(r.status),source_status:['active','retracted','superseded'].includes(r.source_status)?r.source_status:null,
    age_seconds:Number.isFinite(r.age_seconds)?r.age_seconds:null,
    age_basis:r.kind==='pvp_fear_trigger'?'native_roll_created_at':r.kind==='publication'?'publication_created_at':
      r.kind==='turn'?'turn_updated_at':'unknown (historical native records have no wall timestamp)',
    recovery:recovery(r.kind,r.status,r.source_status)}));
  const memory=metrics.incidents(guildId);
  if(reference){
    const incident=[...incidents,...memory].find(r=>r.reference===reference);
    return {incident:incident||null,note:'References are guild-scoped and process-salted; absent/expired references disclose nothing.'};
  }
  return {metrics:metrics.snapshot(guildId),native:{counts:normalize(native.groups),publications:normalize(native.publications),
    turns:normalize(native.turns),manual_mutation_receipts:native.manual,fear_review_events:native.reviews,archival:native.archival},incidents,recent_failures:memory,
    bounds:'At most 20 oldest pending records per category, bounded recent in-memory incidents; native group limit 256.',
    native_counts_capped:native.groups.length===256,
    certainty:'Persisted delivering/uncertain is NOT delivered. This report performs no recovery or model execution.',
    age_note:'Fear age is measured from the saved roll, not an invented due timestamp. Unknown historical ages remain null.',
    live_quality_scores:'Not collected offline; do not infer live staging rubric scores from synthetic tests.'};
}
