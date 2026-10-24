/** Native rule precedence, source-bound adjudication and exact saved native request/outcome proof. */
import {createHash} from 'node:crypto';
import {resolveRuleReferences} from './rule-reference-catalog.js';
import {nativeArbitrationFailure as arbitrationFailure} from './native-failure.js';
export function createRulesArbitration({capabilities}){
const {indexWorldEvent,cityKey,prepareRollRequest,conversationPrincipal,currentScene,isPvpIntent,overlapsOwnerActionTerminal,captureNoRollFeatureWindows,nativeDeviceUseIssue,consentAction,historicalActionSource}=capabilities||{};
if([indexWorldEvent,cityKey,prepareRollRequest,conversationPrincipal,currentScene,isPvpIntent,overlapsOwnerActionTerminal,captureNoRollFeatureWindows,nativeDeviceUseIssue,consentAction,historicalActionSource].some(fn=>typeof fn!=='function'))throw new TypeError('Native adjudication capabilities required');
const modes=new Set(["no_roll","roll_required","native_resolved","human_exception","blocked"]);
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
const inputHash=input=>hash({acceptedIntent:input.acceptedIntent,mode:input.mode,risk:input.risk,stakes:input.stakes,
  trait:input.trait??null,kind:input.kind||'',difficulty:input.difficulty??null,modifierKeys:input.modifierKeys||[],
  attackSource:input.attackSource||'',explanation:input.explanation,savedRulingKey:input.savedRulingKey||'',
  overrideRefs:input.overrideRefs||[],rawRefs:input.rawRefs||[],houseRefs:input.houseRefs||[],homebrewRefs:input.homebrewRefs||[]});
const intentHash=a=>hash({source:a.source_event,actor:a.data.actor,owner:a.data.owner_user_id,principal:a.data.actor_principal_revision,
  type:a.data.type,operation:a.data.operation,framing:a.data.framing,target:a.data.target_key||'',start:a.data.start,end:a.data.end,
  source_hash:a.data.source_hash,source_span:a.data.source_span,audience:a.visibility,subject:a.subject_key||null,
  scene:a.data.scene,session:a.data.session_id,dependencies:a.data.dependencies||[],coordination:a.data.coordination||null});
function replayAdjudication(db,guild,accepted,replay,input,scope){
  // A saved decision is read-only history, not a shortcut around the owner/source boundary.
  const proof=accepted.status==='resolved'
    ?historicalActionSource(db,guild,accepted.record_key,{resolved:true})
    :consentAction(db,guild,accepted.record_key);
  if(scope.actorUserId!==accepted.data.owner_user_id||scope.actorCharacterId!==accepted.data.actor
    ||(scope.mode==='private'?(accepted.visibility!=='character'||accepted.subject_key!==accepted.data.actor)
      :!['party','public'].includes(accepted.visibility)))
    throw arbitrationFailure('Saved adjudication owner or audience does not match the authenticated scope.');
  const data=replay.data,basis=selectRuleBasis(db,guild,input);
  if(replay.source_event!==proof.source.event_key||data.action_id!==accepted.record_key
    ||JSON.stringify(data.source_refs)!==JSON.stringify([proof.source.event_key])
    ||data.expected_revisions?.scene!==proof.scene.key||hash(data.rule_basis)!==hash(basis)
    ||data.stakes!==input.stakes||data.explanation!==input.explanation
    ||data.input_hash&&data.input_hash!==inputHash(input)||data.intent_hash&&data.intent_hash!==intentHash(accepted))
    throw arbitrationFailure('Saved adjudication source, rule or proposed terms changed; no new outcome is authorized.');
  if(input.mode==='roll_required'){
    const request=db.getCityRecord(guild,'roll_request',data.roll_request_ref);
    if(!request||request.source_event!==proof.source.event_key||request.subject_key!==accepted.data.actor
      ||request.visibility!=='character'||request.data.owner_user_id!==accepted.data.owner_user_id
      ||request.data.session_id!==proof.scene.session_id||request.data.scene!==proof.scene.key
      ||request.data.input?.accepted_intent!==accepted.record_key
      ||data.difficulty!==input.difficulty||hash(data.modifier_refs)!==hash(input.modifierKeys||[])
      ||request.data.input.kind!==input.kind
      ||(request.data.input.attack_source||'')!==(input.attackSource||'')
      ||!request.data.alternate_trait&&request.data.input.trait!==input.trait)
      throw arbitrationFailure('Saved adjudication requires its exact native request ancestry; no replacement dice or costs.');
  }else{
    const receipt=data.receipts?.length===1&&db.getCityRecord(guild,'action_outcome_receipt',data.receipts[0]);
    if(!receipt||receipt.status!=='resolved'||receipt.source_event!==proof.source.event_key
      ||receipt.data.action_id!==accepted.record_key||receipt.data.actor_ref!==accepted.data.actor
      ||receipt.data.outcome!=='resolved_no_roll'||receipt.visibility!==accepted.visibility
      ||(receipt.subject_key||null)!==(accepted.subject_key||null)
      ||receipt.data.state_mutations?.length!==0||receipt.data.native_roll_refs?.length!==0)
      throw arbitrationFailure('Saved no-roll adjudication requires its original nonmechanical native receipt.');
  }
  return data;
}
function adjudicationEnvelope(input){
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
function selectRuleBasis(db,guild,{savedRulingKey="",overrideRefs=[],rawRefs=[],houseRefs=[],homebrewRefs=[],kind=""}={},context={}){
  if(savedRulingKey){
    const row=db.getRulesRuling(guild,savedRulingKey);
    if(row)return {kind:"saved_ruling",refs:[`ruling:${row.ruling_key}`],version:String(row.updated_at||row.created_at||"saved"),
      scope:`campaign:${guild}`,sources:[{ruling_key:row.ruling_key,title:row.question}]};
  }
  const rollKind=context.rollKind||kind;
  for(const [basis,refs] of [["campaign_override",overrideRefs],["RAW",rawRefs],["house_rule",houseRefs],["homebrew",homebrewRefs]]){
    if(!refs.length)continue;
    const sources=resolveRuleReferences(db,guild,basis,refs,{...context,rollKind});
    if(sources)return {kind:basis,refs:[...refs],version:sources.map(row=>row.version).join(","),scope:sources[0].scope,sources};
    return {kind:"provisional",refs:[],rejected_refs:[...refs],reason:"Rule reference does not exist or apply in this campaign context."};
  }
  return {kind:"provisional",refs:[]};
}

/** Ground one accepted action into a receipt-backed no-roll completion or a real pending native request. */
function adjudicateAcceptedIntent(db,guild,input,actor,context={}){
  const scope=context.scope||{},accepted=db.getCityRecord(guild,"typed_intent",cityKey(input.acceptedIntent));
  if(!accepted)throw new Error("Current accepted typed intent required.");
  if(accepted.status!=="resolved"&&overlapsOwnerActionTerminal(db,guild,accepted.source_event,accepted.data.start,accepted.data.end))
    throw new Error("The owner withdrew this source range; no new native adjudication.");
  if(accepted.data.gm_review_terminal||accepted.data.gm_ruling&&!context.gmRulingRef)
    throw new Error("Scoped ruling/review must be validated before native arbitration.");
  if(isPvpIntent(db,guild,accepted))throw new Error("PC conflict requires bilateral narrative PvP, never ordinary action or attack adjudication.");
  const replayKey=`adjudication:${hash([accepted.record_key,input.mode])}`;
  const replay=db.getCityRecord(guild,"native_adjudication",replayKey);
  if(replay)return replayAdjudication(db,guild,accepted,replay,input,scope);
  if(accepted.status!=="accepted_for_adjudication")throw new Error("Current accepted typed intent required.");
  const source=db.getWorldEvent(guild,accepted.source_event),principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  const scene=currentScene(db,guild);
  if(!source||source.status!=="active"||source.kind!=="authored_turn"||source.details.author!==principal.user
    ||accepted.data.actor!==principal.character_id||accepted.data.actor_principal_revision!==principal.revision
    ||source.session_id!==scene.session_id||source.scene!==scene.key||!db.ownerAuthoredSource(guild,source.event_key,principal.user))
    throw new Error("Accepted action source, actor or scene is stale.");
  if(!["no_roll","roll_required"].includes(input.mode)||typeof input.explanation!=="string"||!input.explanation.trim())
    throw new Error("Native adjudication needs a supported disposition and explanation.");
  const deviceIssue=nativeDeviceUseIssue(db.getCharacter(principal.character_id),accepted);
  if(deviceIssue)throw arbitrationFailure(deviceIssue);
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
      receipts:[receipt.record_key],explanation:input.explanation,input_hash:inputHash(input),intent_hash:intentHash(accepted),expected_revisions:{scene:scene.key}};
    db.saveCityRecord(guild,{kind:"native_adjudication",key,status:"resolved",source_event:source.event_key,
      visibility:accepted.visibility,subject_key:accepted.subject_key,data});
    captureNoRollFeatureWindows(db,guild,receipt.record_key);
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
    ...(context.gmRulingRef?{gm_ruling:context.gmRulingRef,private_result:true}:{}),
    ...(context.privateResult===true?{private_result:true}:{}),
    ...(context.nativeEquippedRef?{native_equipped_ref:context.nativeEquippedRef}:{}),
    character_id:principal.character_id,trait:input.trait,kind:input.kind,modifier_keys:input.modifierKeys||[],
    difficulty_source:difficulty.event_key,attack_source:input.attackSource||"",adjudication:input.explanation},actor,context);
  const disposition=request.status==="needs_review"?"needs_review":"roll_pending";
  const data={action_id:actionId,source_refs:[source.event_key],rule_basis_refs:rule_basis.refs,rule_basis,
    disposition,difficulty:input.difficulty,modifier_refs:input.modifierKeys||[],stakes:input.stakes,
    roll_request_ref:request.record_key,receipts:[],explanation:input.explanation,
    review_reasons:request.data.breakdown.unresolved||[],owner_user_id:principal.user,audience:"character",
    input_hash:inputHash(input),intent_hash:intentHash(accepted),expected_revisions:{scene:scene.key,request:String(request.data.revision)}};
  db.saveCityRecord(guild,{kind:"native_adjudication",key,status:disposition,source_event:source.event_key,
    visibility:"character",subject_key:principal.character_id,data});
  return data;
}

function movementAdjudication({sourceRef,sourceSpan,receipt,blockedReason=""}){
  return adjudicationEnvelope({intent:"movement",source_refs:[sourceRef],mode:blockedReason?"blocked":"native_resolved",
    rule_basis:{kind:"none",refs:[]},risk:blockedReason||"ordinary local movement",stakes:blockedReason?"arrival not committed":"none",
    native_mechanic:"scene_movement",proposed_mutations:blockedReason?[]:[{kind:"character_location"}],
    verified_receipts:receipt?[receipt]:[],source_span:sourceSpan});
}

return Object.freeze({adjudicationEnvelope,selectRuleBasis,adjudicateAcceptedIntent,movementAdjudication});
}
