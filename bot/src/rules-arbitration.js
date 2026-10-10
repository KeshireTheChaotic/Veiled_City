/** Explainable internal adjudication envelopes; model suggestions never become native dice, costs or authority. */
import { createHash } from "node:crypto";
import { indexWorldEvent, cityKey } from "./city-calendar.js";
import { prepareRollRequest } from "./roll-requests.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { currentScene } from "./scene-continuity.js";

const modes=new Set(["no_roll","roll_required","native_resolved","human_exception","blocked"]);
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
export function adjudicationEnvelope(input){
  const value={source_refs:[],rule_basis:{kind:"none",refs:[]},risk:"none",stakes:"none",native_mechanic:null,
    required_consent:[],participants:[],proposed_mutations:[],verified_receipts:[],...input};
  if(!modes.has(value.mode)||!value.intent||!Array.isArray(value.source_refs)||!value.source_refs.length)
    throw new Error("Adjudication requires a sourced intent and supported mode.");
  if(!["saved_ruling","campaign_override","RAW","house_rule","homebrew","provisional","none"].includes(value.rule_basis?.kind)
    ||!Array.isArray(value.rule_basis.refs))throw new Error("Adjudication rule basis is invalid.");
  if(value.mode==="native_resolved"&&!value.verified_receipts.length)throw new Error("Native resolution requires an application receipt.");
  if(value.mode==="roll_required"&&value.native_mechanic!=="roll_request")throw new Error("Uncertainty with stakes requires a native roll request.");
  if(value.mode==="no_roll"&&(value.required_consent.length||value.proposed_mutations.some(row=>row.cost)))
    throw new Error("No-roll adjudication cannot bypass consent or costs.");
  return value;
}

/** Explicit precedence: saved scoped ruling, campaign override, RAW, compatible extensions, provisional. */
export function selectRuleBasis(db,guild,{savedRulingKey="",overrideRefs=[],rawRefs=[],houseRefs=[],homebrewRefs=[]}={}){
  if(savedRulingKey){
    const row=db.getRulesRuling(guild,savedRulingKey);
    if(row)return {kind:"saved_ruling",refs:[`ruling:${row.ruling_key}`]};
  }
  const bounded=(values,prefix)=>Array.isArray(values)&&values.length<=8&&values.every(ref=>
    typeof ref==="string"&&ref.length<=200&&ref.startsWith(prefix));
  if(!bounded(overrideRefs,"override:")||!bounded(rawRefs,"srd:")||!bounded(houseRefs,"house:")
    ||!bounded(homebrewRefs,"homebrew:"))throw new Error("Rule references must use bounded verified authority namespaces.");
  if(overrideRefs.length)return {kind:"campaign_override",refs:overrideRefs};
  if(rawRefs.length)return {kind:"RAW",refs:rawRefs};
  if(houseRefs.length)return {kind:"house_rule",refs:houseRefs};
  if(homebrewRefs.length)return {kind:"homebrew",refs:homebrewRefs};
  return {kind:"provisional",refs:[]};
}

/** Ground one accepted action into a receipt-backed no-roll completion or a real pending native request. */
export function adjudicateAcceptedIntent(db,guild,input,actor,context={}){
  const scope=context.scope||{},accepted=db.getCityRecord(guild,"typed_intent",cityKey(input.acceptedIntent));
  if(!accepted)throw new Error("Current accepted typed intent required.");
  const replayKey=`adjudication:${hash([accepted.record_key,input.mode])}`;
  const replay=db.getCityRecord(guild,"native_adjudication",replayKey);
  if(replay)return replay.data;
  if(accepted.status!=="accepted_for_adjudication")throw new Error("Current accepted typed intent required.");
  const source=db.getWorldEvent(guild,accepted.source_event),principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  const scene=currentScene(db,guild);
  if(!source||source.status!=="active"||source.kind!=="authored_turn"||source.details.author!==principal.user
    ||accepted.data.actor!==principal.character_id||accepted.data.actor_principal_revision!==principal.revision
    ||source.session_id!==scene.session_id||source.scene!==scene.key||!db.ownerAuthoredSource(guild,source.event_key,principal.user))
    throw new Error("Accepted action source, actor or scene is stale.");
  if(!["no_roll","roll_required"].includes(input.mode)||typeof input.explanation!=="string"||!input.explanation.trim())
    throw new Error("Native adjudication needs a supported disposition and explanation.");
  const rule_basis=selectRuleBasis(db,guild,input),actionId=accepted.record_key,key=replayKey;
  if(input.mode==="no_roll"){
    if(input.risk!=="none"||input.stakes!=="none"||rule_basis.kind==="provisional")
      throw new Error("No-roll completion requires established costless, uncontested permission and a grounded basis.");
    const receiptKey=`action-receipt:${hash([actionId,"no_roll"])}`;
    const receipt=db.getCityRecord(guild,"action_outcome_receipt",receiptKey)||db.saveCityRecord(guild,{
      kind:"action_outcome_receipt",key:receiptKey,status:"resolved",source_event:source.event_key,
      visibility:accepted.visibility,subject_key:accepted.subject_key,
      data:{idempotency_key:receiptKey,action_id:actionId,source_event:source.event_key,actor_ref:principal.character_id,
        outcome:"resolved_no_roll",state_mutations:[],native_roll_refs:[],rule_refs:rule_basis.refs,
        observed_by:[principal.character_id],audience:accepted.visibility,scene_revision_after:scene.key}});
    db.saveCityRecord(guild,{...accepted,key:accepted.record_key,status:"resolved",
      data:{...accepted.data,outcome_receipt:receipt.record_key,native_disposition:"no_roll"}});
    const data={action_id:actionId,source_refs:[source.event_key],rule_basis_refs:rule_basis.refs,rule_basis,
      disposition:"resolved",difficulty:null,modifier_refs:[],stakes:input.stakes,roll_request_ref:null,
      receipts:[receipt.record_key],explanation:input.explanation,expected_revisions:{scene:scene.key}};
    db.saveCityRecord(guild,{kind:"native_adjudication",key,status:"resolved",source_event:source.event_key,
      visibility:accepted.visibility,subject_key:accepted.subject_key,data});
    return data;
  }
  if(rule_basis.kind==="provisional")throw new Error("Unsupported risky adjudication needs a saved or sourced provisional human ruling.");
  if(!Number.isSafeInteger(input.difficulty)||input.difficulty<0||input.difficulty>100)
    throw new Error("Risky adjudication requires a bounded native Difficulty.");
  const difficulty=indexWorldEvent(db,guild,{key:`roll-grounding:${hash([actionId,input.difficulty,rule_basis])}`,
    kind:"roll_adjudication",title:"Grounded AI-GM roll difficulty",source_id:"ai_gm",session_id:scene.session_id,
    scene:scene.key,visibility:"character",subject_key:principal.character_id,
    details:{native_grounded:true,accepted_intent:actionId,rule_basis,roll_difficulty:{declaration:source.event_key,value:input.difficulty}}},actor);
  const request=prepareRollRequest(db,guild,{source_event:source.event_key,accepted_intent:actionId,
    character_id:principal.character_id,trait:input.trait,kind:input.kind,modifier_keys:input.modifierKeys||[],
    difficulty_source:difficulty.event_key,attack_source:input.attackSource||"",adjudication:input.explanation},actor,context);
  const data={action_id:actionId,source_refs:[source.event_key],rule_basis_refs:rule_basis.refs,rule_basis,
    disposition:"roll_pending",difficulty:input.difficulty,modifier_refs:input.modifierKeys||[],stakes:input.stakes,
    roll_request_ref:request.record_key,receipts:[],explanation:input.explanation,
    expected_revisions:{scene:scene.key,request:String(request.data.revision)}};
  db.saveCityRecord(guild,{kind:"native_adjudication",key,status:"roll_pending",source_event:source.event_key,
    visibility:"character",subject_key:principal.character_id,data});
  return data;
}

export function movementAdjudication({sourceRef,sourceSpan,receipt,blockedReason=""}){
  return adjudicationEnvelope({intent:"movement",source_refs:[sourceRef],mode:blockedReason?"blocked":"native_resolved",
    rule_basis:{kind:"none",refs:[]},risk:blockedReason||"ordinary local movement",stakes:blockedReason?"arrival not committed":"none",
    native_mechanic:"scene_movement",proposed_mutations:blockedReason?[]:[{kind:"character_location"}],
    verified_receipts:receipt?[receipt]:[],source_span:sourceSpan});
}
