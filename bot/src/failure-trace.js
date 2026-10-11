/** GM-private failure correlation. Summaries contain references and closed categories, never fictional text. */
const categories=new Set(["source_span","actor_knowledge","not_witnessed","canon","uncertainty_framing",
  "unmatched_source_span","overlapping_source_span","dependency_unavailable","invalid_optional_proposal",
  "incompatible_proposal_replay","output_claim_span","review_without_mutation"]);
const reference=value=>typeof value==="string"&&/^[a-zA-Z0-9:_-]{1,180}$/.test(value)?value:null;
export function failureTrace(error,attempt={}){
  return {version:1,code:/^[A-Z0-9_]{1,80}$/.test(error?.code||"")?error.code:"UNCLASSIFIED",
    category:categories.has(error?.diagnostic?.category)?error.diagnostic.category:"unclassified",
    turn_id:reference(attempt?.turn_id),message_id:reference(attempt?.discord_message_id),
    source_event:reference(error?.diagnostic?.source_ref),action_key:reference(error?.diagnostic?.action_key),
    model_attempts:Math.max(0,Number(error?.model_attempts||attempt?.model_attempts)||0),
    recovery:attempt?.committed==="yes"?"resync_committed_output":attempt?.committed==="unknown"?
      "inspect_commit_receipt":"retry_saved_source"};
}
