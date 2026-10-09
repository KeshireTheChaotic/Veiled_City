/** Explainable internal adjudication envelopes; model suggestions never become native dice, costs or authority. */

const modes=new Set(["no_roll","roll_required","native_resolved","human_exception","blocked"]);
export function adjudicationEnvelope(input){
  const value={source_refs:[],rule_basis:{kind:"none",refs:[]},risk:"none",stakes:"none",native_mechanic:null,
    required_consent:[],participants:[],proposed_mutations:[],verified_receipts:[],...input};
  if(!modes.has(value.mode)||!value.intent||!Array.isArray(value.source_refs)||!value.source_refs.length)
    throw new Error("Adjudication requires a sourced intent and supported mode.");
  if(!["saved_ruling","RAW","house_rule","homebrew","none"].includes(value.rule_basis?.kind)
    ||!Array.isArray(value.rule_basis.refs))throw new Error("Adjudication rule basis is invalid.");
  if(value.mode==="native_resolved"&&!value.verified_receipts.length)throw new Error("Native resolution requires an application receipt.");
  if(value.mode==="roll_required"&&value.native_mechanic!=="roll_request")throw new Error("Uncertainty with stakes requires a native roll request.");
  if(value.mode==="no_roll"&&(value.required_consent.length||value.proposed_mutations.some(row=>row.cost)))
    throw new Error("No-roll adjudication cannot bypass consent or costs.");
  return value;
}

export function movementAdjudication({sourceRef,sourceSpan,receipt,blockedReason=""}){
  return adjudicationEnvelope({intent:"movement",source_refs:[sourceRef],mode:blockedReason?"blocked":"native_resolved",
    rule_basis:{kind:"none",refs:[]},risk:blockedReason||"ordinary local movement",stakes:blockedReason?"arrival not committed":"none",
    native_mechanic:"scene_movement",proposed_mutations:blockedReason?[]:[{kind:"character_location"}],
    verified_receipts:receipt?[receipt]:[],source_span:sourceSpan});
}
