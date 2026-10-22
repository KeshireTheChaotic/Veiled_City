/** Truthful entry status helpers. Transport acknowledgement never certifies authored fiction. */
export function openingEntryEvidence(view,{narrativeVerified=false,fallback=false}={}){
  return {version:3,narrative_format:'audience_first_v9',narrative_verified:narrativeVerified,hook_verified:false,
    source_refs:[...view.source_refs],fallback,dramatic_coverage:'unverified',
    coverage_reason:fallback?'native_orientation_is_not_authored_scene':'semantic_coverage_not_natively_proven'};
}
export function openingEntryDeliveryStatus(evidence,rows,deliveredPending=0){
  if(rows.some(row=>['uncertain','delivering'].includes(row.status)))return 'uncertain';
  if(!rows.length)return 'pending';
  if(rows.some(row=>row.status==='failed'))return 'failed';
  if(deliveredPending>0)return 'pending';
  if(!rows.every(row=>row.status==='delivered'&&row.discord_message_id))return 'pending';
  return evidence?.fallback===true?'fallback_delivered':'delivered';
}
