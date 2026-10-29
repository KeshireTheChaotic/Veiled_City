/** Native source-qualified ordinary GM ruling and pending owner-visible request proof. */
import {createHash} from 'node:crypto';
import {resolveRuleReferences} from './rule-reference-catalog.js';
export function createGmRulingRules({capabilities}){
const {adjudicateAcceptedIntent,selectRuleBasis,consentAction,historicalActionSource,conversationPrincipal,currentScene,scenePresence,isPvpIntent,assertPcCanAct,nativeDeviceUseIssue,validateGmRulingProposal}=capabilities||{};
if([adjudicateAcceptedIntent,selectRuleBasis,consentAction,historicalActionSource,conversationPrincipal,currentScene,scenePresence,isPvpIntent,assertPcCanAct,nativeDeviceUseIssue,validateGmRulingProposal].some(fn=>typeof fn!=='function'))throw new TypeError('Native GM ruling capabilities required');
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function eligibleContext(event,scene,location,scope){
  return event?.status==="active"&&event.source_kind==="gm"&&["observed","established"].includes(event.truth_status)
    &&!event.source_id?.startsWith("player:")&&!["authored_turn","ai_gm_input","player_declaration","roll_adjudication"].includes(event.kind)
    &&event.session_id===scene.session_id&&event.scene===scene.key&&(!event.location_key||event.location_key===location)
    &&(["party","public"].includes(event.visibility)||scope.mode==="private"&&event.visibility==="character"
      &&event.subject_key===scope.actorCharacterId);
}
/** Native scene geometry is ruling context, never evidence of player success or invented danger. */
function nativeGmSceneContext(db,guild,scope){
  const scene=currentScene(db,guild),pc=db.getCharacter(scope.actorCharacterId),presence=pc&&scenePresence(db,guild,'character',pc.id),
    place=pc?.data.location&&db.getSimulationEntity(guild,'location',pc.data.location),source=presence&&db.getWorldEvent(guild,presence.source_event);
  if(!place||presence?.data.state!=='actually_present'||presence.location_key!==pc.data.location||source?.status!=='active'
    ||!(['party','public'].includes(source.visibility)||scope.mode==='private'&&source.visibility==='character'&&source.subject_key===pc.id))return null;
  const data={scene:scene.key,session:scene.session_id,place,presence,source};return {ref:`native-scene:${hash(data)}`,data};
}
/** Read-only, bounded evidence inventory. Player declarations and GM/private-other facts cannot certify ordinary scene facts. */
function gmRulingContext(db,guild,scope){
  if(db.getCityCalendar(guild).flags.gm_discretion!==true)return {enabled:false,version:1};
  const scene=currentScene(db,guild),pc=db.getCharacter(scope.actorCharacterId);
  return {enabled:db.getCityCalendar(guild).flags.gm_discretion===true,version:1,scene:scene.key,
    authority_mode:db.getCityRecord(guild,"gm_authority","campaign")?.data.gm_authority_mode||"autonomous",
    location:pc?.data.location||null,evidence:db.listWorldEvents(guild,{limit:100,includeGM:false,
      characterId:scope.mode==="private"?scope.actorCharacterId:null})
      .filter(event=>eligibleContext(event,scene,pc?.data.location,scope)).slice(0,12)
      .map(event=>({ref:event.event_key,kind:event.kind,title:event.title,
        description:typeof event.details.description==="string"&&event.details.description.length<=600?event.details.description:null})),
    authority:"Evidence and proposal context only. Generic rolls grant no feature, special ability or material effect."};
}
function proof(db,guild,accepted,scope,{readOnly=false}={}){
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  if(principal.kind!=="owner"||accepted?.data.actor!==principal.character_id||accepted.data.owner_user_id!==principal.user
    ||accepted.data.actor_principal_revision!==principal.revision)throw new Error("Current ruling owner/principal required.");
  if(scope.mode==="private"?(accepted.visibility!=="character"||accepted.subject_key!==principal.character_id)
    :!["party","public"].includes(accepted.visibility))throw new Error("Current ruling source audience required.");
  const value=accepted.status==="resolved"?historicalActionSource(db,guild,accepted.record_key,{resolved:true})
    :consentAction(db,guild,accepted.record_key);
  if(isPvpIntent(db,guild,accepted))throw new Error("PC conflict requires the native bilateral PvP service, not GM discretion.");
  const pc=db.getCharacter(principal.character_id);
  if(!readOnly)assertPcCanAct(pc,db,guild);
  return {...value,pc};
}
/** Validate before replay or preparation. Native receipts alone authorize subsequent outcomes; no RNG/effect lives here. */
function adjudicateGmRuling(db,guild,acceptedKey,proposal,scope,recovery={}){
  validateGmRulingProposal(proposal);
  return db.transaction(()=>{
    const accepted=db.getCityRecord(guild,"typed_intent",acceptedKey),readOnly=proposal.disposition==='narrative_no_roll'&&proposal.effect_class==='observation'
      &&accepted?.data.type==='other'&&['describe_scene','current_situation'].includes(accepted.data.operation)
      &&accepted.data.framing==='immediate'&&accepted.data.resolution==='conversational',p=proof(db,guild,accepted,scope,{readOnly});
    const key=`gm-ruling:${hash([acceptedKey,1])}`,prior=db.getCityRecord(guild,"gm_action_ruling",key),proposalHash=hash(proposal);
    const reviewKey=`unsupported-action:${hash([acceptedKey,key])}`,oldReview=db.getCityRecord(guild,"unsupported_action",reviewKey);
    let authorizedRecovery=false;
    if(recovery.reviewRef){
      const e=db.getWorldEvent(guild,recovery.reviewRef),r=db.getRulesRuling(guild,proposal.saved_ruling_key),
        authorization=db.getCityRecord(guild,"gm_action_review_receipt",recovery.reviewRef);
      if(Object.keys(recovery).length!==1||prior?.data.review_reason!=="RULE_UNVERIFIED"
        ||oldReview?.status!=="needs_review"||oldReview.data.original_resolution!=="roll_required"
        ||proposal.disposition!=="standard_action_roll"||!r||e?.status!=="active"||e.kind!=="gm_action_review"
        ||e.source_kind!=="gm"||e.details.human_reviewed!==true||e.details.review!==reviewKey
        ||e.details.proposal_hash!==proposalHash||e.details.previous_hash!==hash(prior)
        ||e.details.rule_hash!==hash(r)||authorization?.source_event!==e.event_key||authorization.visibility!=="gm"
        ||authorization.data.event_hash!==hash(e)||authorization.data.review!==reviewKey
        ||e.session_id!==p.scene.session_id||e.scene!==p.scene.key)
        throw new Error("Exact authenticated saved-rule recovery required; it grants no capability or effect.");
      authorizedRecovery=true;
    }else if(Object.keys(recovery).length)throw new Error("Closed native recovery context required.");
    if(accepted.status==="resolved"&&!prior)throw new Error("Historical completion cannot authorize a new ruling interpretation.");
    if(prior&&prior.data.proposal_hash!==proposalHash){
      if(authorizedRecovery)throw new Error("Ruling terms changed; explicit revision/review is required.");
      // One ruling per action: a re-proposal (the world director re-reading the scene, a replay) gets the saved,
      // immutable ruling back instead of failing; new terms still need explicit human revision.
      return prior;
    }
    const nativeContext=nativeGmSceneContext(db,guild,scope);
    // Invented labels that name no saved event (live: "presence:npc-nessa-vale") are ignored and, if nothing real is
    // cited, the native scene context grounds the current-scene attempt. A real but ineligible event still fails.
    const cited=proposal.context_refs.map(ref=>ref===nativeContext?.ref?nativeContext:db.getWorldEvent(guild,ref)).filter(Boolean);
    const evidence=cited.length?cited:nativeContext?[nativeContext]:[];
    const contextValid=evidence.length>0&&evidence.every(event=>event===nativeContext||eligibleContext(event,p.scene,p.pc.data.location,scope));
    const contextHash=contextValid?hash(evidence):null;
    if(prior&&prior.data.context_hash&&(prior.data.context_hash!==contextHash||prior.data.location!==p.pc.data.location))
      throw new Error("Ruling context/evidence changed; stale authority cannot be replayed.");
    let review=null;
    if(db.getCityCalendar(guild).flags.gm_discretion!==true)review="GM_DISCRETION_DISABLED";
    else if(db.getCityRecord(guild,"gm_authority","campaign")?.data.gm_authority_mode==="manual")review="MANUAL_GM_AUTHORITY";
    else if(proposal.disposition==="needs_review")review="PROPOSED_REVIEW";
    // A mundane capability that only repeats an SRD rule already cited in raw_refs names no feature to adapt.
    else if(proposal.capability.kind!=="mundane"||proposal.capability.ref
      &&!(/^srd:/.test(proposal.capability.ref)&&proposal.raw_refs.includes(proposal.capability.ref)))review="CAPABILITY_ADAPTER_REQUIRED";
    else if(!["observation","attempt_only"].includes(proposal.effect_class)
      ||["move","local_zone","consent"].includes(accepted.data.type)
      ||accepted.data.type==='roll'&&accepted.data.operation!=='request_roll')review="NATIVE_EFFECT_ADAPTER_REQUIRED";
    else if(!contextValid)review="CONTEXT_UNVERIFIED";
    const specifiedRule=proposal.saved_ruling_key||proposal.override_refs.length||proposal.raw_refs.length
      ||proposal.house_refs.length||proposal.homebrew_refs.length;
    const basisInput={savedRulingKey:proposal.saved_ruling_key,overrideRefs:proposal.override_refs,
      rawRefs:specifiedRule?proposal.raw_refs:["srd:action-rolls"],houseRefs:proposal.house_refs,
      homebrewRefs:proposal.homebrew_refs,kind:"action"};
    const ruleBasis=selectRuleBasis(db,guild,basisInput,{rollKind:"action"});
    const rulingKeys=[...new Set([proposal.saved_ruling_key,...proposal.override_refs.map(ref=>ref.slice("override:".length)),
      ...proposal.house_refs.map(ref=>ref.slice("house:".length)),...proposal.homebrew_refs.map(ref=>ref.slice("homebrew:".length))]
      .filter(Boolean))].sort();
    // Timestamps alone are not a revision: same-second edits must invalidate native execution too.
    const ruleHash=hash({basis:ruleBasis,rulings:rulingKeys.map(ref=>db.getRulesRuling(guild,ref)),
      ...(proposal.modifier_keys.length?{modifiers:proposal.modifier_keys.map(ref=>{
        const source=db.getWorldEvent(guild,ref);return {source,ruling:source?.details?.roll_modifier?.ruling_key
          ?db.getRulesRuling(guild,source.details.roll_modifier.ruling_key):null};})}:{})});
    const referencesValid=(!proposal.saved_ruling_key||!!db.getRulesRuling(guild,proposal.saved_ruling_key))
      &&[["RAW",proposal.raw_refs],["campaign_override",proposal.override_refs],["house_rule",proposal.house_refs],
        ["homebrew",proposal.homebrew_refs]].every(([kind,refs])=>!refs.length||!!resolveRuleReferences(db,guild,kind,refs,{rollKind:"action"}));
    if(!review&&(!referencesValid||ruleBasis.kind==="provisional"))review="RULE_UNVERIFIED";
    if(!review&&!proposal.explanation.trim())review="EXPLANATION_REQUIRED";
    // Preserve historical completion; a new attempt cannot use a shutdown device as functional.
    if(!review&&accepted.status!=='resolved')review=nativeDeviceUseIssue(p.pc,accepted);
    const noRoll=proposal.disposition==="narrative_no_roll";
    if(!review&&noRoll&&(proposal.risk!=="none"||proposal.stakes!=="none"||proposal.difficulty!==null||proposal.trait!==null
      ||proposal.modifier_keys.length))review="NO_ROLL_PERMISSION_UNVERIFIED";
    if(!review&&!noRoll&&(proposal.difficulty===null||proposal.trait===null||!proposal.risk.trim()||proposal.risk==="none"
      ||!proposal.stakes.trim()||proposal.stakes==="none"||!proposal.difficulty_reason.trim()))review="ROLL_GROUNDING_REQUIRED";
    if(!review&&["blocked","needs_clarification"].includes(accepted.data.resolution)&&!authorizedRecovery)review="DECLARED_REVIEW";
    // A review is never a completion, roll request, provisional override or approved capability.
    const hold=row=>{
      if(oldReview&&["withdrawn","superseded"].includes(oldReview.status))return row;
      const reason=row.data.review_reason;
      const category=reason==="CAPABILITY_ADAPTER_REQUIRED"?"feature_permission":reason==="NATIVE_EFFECT_ADAPTER_REQUIRED"
        ?"native_adapter_absence":reason==="CONTEXT_UNVERIFIED"?"world_epistemic":reason==="RULE_UNVERIFIED"
        ?"rules_ambiguity":"authorization_or_clarification";
      if(!oldReview)db.saveCityRecord(guild,{kind:"unsupported_action",key:reviewKey,status:"needs_review",
        source_event:accepted.source_event,visibility:"gm",data:{version:1,action:acceptedKey,ruling:key,category,
          reason_code:row.data.review_reason,owner:accepted.data.owner_user_id,actor:accepted.data.actor,
          source_hash:accepted.data.source_hash,principal_revision:accepted.data.actor_principal_revision,
          scene:p.scene.key,session:p.scene.session_id,original_resolution:accepted.data.resolution,
          original_proposal_hash:proposalHash,context_hash:contextHash,rule_hash:ruleHash,
          alternative:"Clarify, revise or withdraw; a different tactic needs your own new declaration. Nothing is substituted.",
          authority:"Non-actionable review only; no dice, cost, capability, success or native effect."}});
      db.saveCityRecord(guild,{...accepted,key:accepted.record_key,data:{...accepted.data,resolution:"blocked",
        native_disposition:"needs_review",gm_ruling_ref:key,reason:"Scoped native review required; no effect applied."}});
      return row;
    };
    if(prior){
      if(prior.status==="needs_review"&&prior.data.review_reason&&!authorizedRecovery)return hold(prior);
      if(authorizedRecovery){
        if(review)throw new Error("Saved rule does not close the current native authority gap.");
        db.saveCityRecord(guild,{...accepted,key:acceptedKey,data:{...accepted.data,resolution:oldReview.data.original_resolution}});
      }else{
      if(prior.data.rule_hash!==ruleHash)throw new Error("Ruling rule revision changed; saved mechanics remain immutable.");
      if(review)throw new Error("Ruling execution permission changed; saved mechanics remain immutable.");
      return prior;
      }
    }
    const adjudication=review?null:adjudicateAcceptedIntent(db,guild,{...basisInput,acceptedIntent:acceptedKey,
      mode:noRoll?"no_roll":"roll_required",risk:proposal.risk,stakes:proposal.stakes,trait:proposal.trait,kind:"action",
      difficulty:proposal.difficulty,modifierKeys:proposal.modifier_keys,attackSource:"",explanation:proposal.explanation},"ai_gm",{scope,gmRulingRef:key});
    if(adjudication?.roll_request_ref
      &&db.getCityRecord(guild,"roll_request",adjudication.roll_request_ref)?.data.input.gm_ruling!==key)
      throw new Error("Historical native request cannot be adopted into new ruling terms.");
    const row=db.saveCityRecord(guild,{kind:"gm_action_ruling",key,status:review?"needs_review":adjudication.disposition,
      source_event:accepted.source_event,visibility:"gm",subject_key:null,data:{version:1,accepted_intent:acceptedKey,
        owner_user_id:accepted.data.owner_user_id,actor:accepted.data.actor,scene:p.scene.key,session_id:p.scene.session_id,
        location:p.pc.data.location||null,source_hash:accepted.data.source_hash,principal_revision:accepted.data.actor_principal_revision,
        proposal:structuredClone(proposal),proposal_hash:proposalHash,context_hash:contextHash,review_reason:review,
        context_refs:[...proposal.context_refs],rule_basis:ruleBasis,rule_hash:ruleHash,adjudication,
        history:[...(prior?.data.history||["proposed"]),review?"needs_review":"validated",...(review?[]:[adjudication.disposition])],
        ...(authorizedRecovery?{review_source:recovery.reviewRef}:{}),
        authority:"Native ordinary attempt adjudication only; no capability, cost, consent or material effect authority."}});
    if(authorizedRecovery)db.saveCityRecord(guild,{...oldReview,key:reviewKey,status:"reconciled",
      data:{...oldReview.data,review_source:recovery.reviewRef,native_request:adjudication.roll_request_ref}});
    return review?hold(row):row;
  });
}

/** Read-only current proof for a linked pending native request, before any optional cost or RNG. No new ruling can be minted here. */
function assertGmRulingRequest(db,guild,request){
  const row=db.getCityRecord(guild,"gm_action_ruling",request.data.input.gm_ruling);
  if(!row||!["roll_pending","needs_review"].includes(row.status)||row.data.review_reason
    ||row.source_event!==request.source_event||row.data.actor!==request.subject_key
    ||row.data.adjudication?.roll_request_ref!==request.record_key||row.data.accepted_intent!==request.data.input.accepted_intent)
    throw new Error("Current exact GM ruling/request evidence required before execution.");
  const accepted=db.getCityRecord(guild,"typed_intent",row.data.accepted_intent);
  adjudicateGmRuling(db,guild,row.data.accepted_intent,row.data.proposal,{mode:accepted.visibility==="character"?"private":"party",
    actorUserId:row.data.owner_user_id,actorCharacterId:row.data.actor});
  return row;
}

/** Owner-only pre-roll terms. These describe a proposed attempt, never certify world facts or material effects. */
function gmRulingDetails(db,guild,request,user){
  if(!request.data.input?.gm_ruling||user!==request.data.owner_user_id)return [];
  const row=db.getCityRecord(guild,"gm_action_ruling",request.data.input.gm_ruling);
  if(!row||row.source_event!==request.source_event||row.data.actor!==request.subject_key
    ||row.data.adjudication?.roll_request_ref!==request.record_key
    ||row.data.accepted_intent!==request.data.input.accepted_intent
    ||hash(validateGmRulingProposal(row.data.proposal))!==row.data.proposal_hash)
    throw new Error("Exact saved ruling terms required for private presentation.");
  if(request.status!=="resolved")assertGmRulingRequest(db,guild,request);
  const p=row.data.proposal;
  return [`Suggested trait: ${p.trait}; ${p.explanation}`,
    `Risk (proposed, not an established outcome): ${p.risk}`,
    `Success/failure stakes: ${p.stakes}`,`Difficulty rationale: ${p.difficulty_reason}`,
    `Rule basis: ${row.data.rule_basis.refs.join(", ")}`,
    "Success or Critical settles this attempt only. Access, knowledge, custody, damage and abilities require separate native authority.",
    "You may propose a different trait or Experience; applicability needs current native verification. No optional spend is inferred."];
}


return Object.freeze({nativeGmSceneContext,gmRulingContext,adjudicateGmRuling,assertGmRulingRequest,gmRulingDetails});
}
