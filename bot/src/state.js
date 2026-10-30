import {applyGMEvents} from './application/workflows/gm-event-dispatch.js';
export {applyGMEvents};
import {applyCanonProposalDrafts} from './frameworks/knowledge/public.js';
export {applyCanonProposalDrafts};
import {applyRelationshipDrafts} from './frameworks/knowledge/public.js';
export {applyRelationshipDrafts};
import {applyHandoutDrafts} from './frameworks/knowledge/public.js';
export {applyHandoutDrafts};
import {applyNpcCognitionDrafts} from './frameworks/npc/public.js';
export {applyNpcCognitionDrafts};
import {connectUnifiedArbitration} from './framework-to-framework/daggerheart--intent/public.js';
/** Authoritative AI/state mutation layer. Applies validated structured outputs while enforcing transaction and visibility invariants. */
import { createHash } from "node:crypto";
import {applyAuthoredInitialPosition} from './frameworks/session/public.js';
import {noteNarrativeInterest} from './frameworks/narrative/public.js';
import {nativeDirectorNarrativeSource,nativeDirectorNarrativeContent} from './frameworks/narrative/public.js';
import {lastVerifiedCharacterPresence,reconcileSceneArrival,scenePresence} from './frameworks/session/public.js';
import { indexWorldEvent } from './frameworks/world/public.js';
import {normalizeEntityKey as normalizeNpcKey} from './kernel/entity-key.js';
import { applySimulationUpdates } from "./frameworks/world/public.js";
import { validateNarrativeClaims, validateCanonAnnotations, validateCandidateClaims, assertNarrativeApplied } from "./narrative-integrity.js";
import { prepareAuthorizedTurnOutput, candidateNarrative } from "./pvp-output.js";
import { recordCharacterPerceptions } from "./frameworks/character/public.js";
import { applyAutonomousWorld, worldInputKey } from "./frameworks/world/public.js";
import { dispatchAiIntents } from "./ai-intents.js";
import { persistInterpretation } from "./narrative-context.js";
import { persistAuthoredCandidates } from "./authored-candidates.js";
import { persistPlayerIntents, persistPlayerIntentDiagnostics, persistTypedDialogue } from "./typed-intents.js";
import { adjudicateAcceptedIntent } from "./rules-arbitration.js";
import {adjudicateGmRuling} from "./gm-action-ruling.js";
import {applyUnifiedArbitration,prepareUnifiedCollaboration} from './gm-unified-arbitration.js';
import {nativeEnvironmentOutputCandidates} from './native-environment-output.js';
import { coordinateTypedActionWindows } from "./frameworks/session/public.js";
import { buildActionPlan, executableActionSpans, transitionAction } from "./frameworks/intent/public.js";
import { saveContextMemories } from './frameworks/knowledge/public.js';
import { stagePvpAttempts } from "./narrative-pvp.js";
import {prepareCampaignPvpAttack} from './pvp-attacks.js';
import {reserveCampaignAttackNotices} from './native-publications.js';
import {captureArcCandidate} from './frameworks/knowledge/public.js';
import {applyOrdinaryEffects} from './ordinary-effects.js';
import {assertSceneActionSource} from './frameworks/intent/public.js';
import {applyPrivateSeedTurn} from './frameworks/world/public.js';
import {assertMutationSuccess} from './application/workflows/state-mutation-results.js';

export function summarizeRoster(rows){
  return rows.map(r=>({
    user_id:r.discord_user_id,
    player:r.display_name,
    presence:r.presence,
    absence_mode:r.absence_mode,
    character:r.name||null,
    character_status:r.status||null,
    control_policy:r.control_policy||null,
    proxy_user_id:r.proxy_user_id||r.presence_proxy||null,
    sheet:r.data||null,
    accessibility:r.accessibility_json?JSON.parse(r.accessibility_json):null
  }));
}

export function playerSafeCharacter(c){
  if(!c) return null;
  return {id:c.id,name:c.name,status:c.status,data:c.data};
}




/** An NPC's unsupported disclosure becomes testimony-weighted evidence from that NPC, never objective truth,
 * plus the NPC's own knowledge of it so a later repeat passes the disclosure check. Failure records nothing. */
export function recordNpcTestimony(db,guildId,sessionId,claim,diagnostic,scope,sourceRef,provenance={}){
  if(diagnostic?.reason_code!=='fact_missing'||claim?.entity_type!=='npc'||!sourceRef||!String(claim.proposed||'').trim())return null;
  const npc=normalizeNpcKey(claim.entity);
  if(!db.getNpcProfile(guildId,npc))return null;
  const key=`testimony:${npc}:${createHash('sha256').update(String(claim.proposed)).digest('hex').slice(0,16)}`;
  try{
    const [result]=applyGMEvents(db,guildId,sessionId,[{type:'fact',key,value:claim.proposed,
      epistemic:{kind:'testimony',source_refs:[sourceRef],perspective:`npc:${npc}`}}],scope,provenance);
    if(!result?.ok)return null;
    db.upsertNpcKnowledge(guildId,{npcKey:npc,knowledgeKey:key,content:claim.proposed,sourceType:'testimony',sourceRef:result.id});
    return result.id;
  }catch{return null;}
}




/**
 * Apply one authoritative AI mutation bundle transactionally. Either all valid
 * state changes commit together or the surrounding transaction rolls back.
 */
export function applyAuthoritativeMutation(db,{guildId,sessionId=null,events=[],relationships=[],handouts=[],npcMemories=[],npcKnowledge=[],npcGoals=[],
  simulationUpdates=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm",provenance={},narrative=null,aiIntents=narrative?.ai_intents||[],content=null,inspectStaged=null}){
  return db.transaction(()=>{
    const outputSource=nativeDirectorNarrativeSource(narrative)||(provenance.messageId&&scope.actorCharacterId?worldInputKey(provenance.messageId,scope.actorCharacterId):null);
    content=content||nativeDirectorNarrativeContent(narrative);
    const originalNarrative=narrative&&candidateNarrative(narrative);
    const privateWorldSeeds=applyPrivateSeedTurn(db,guildId,narrative,{content});
    // Semantic rejection may preserve an independent conversational sibling,
    // but must never silently bless/drop an explicitly proposed native effect.
    // Retain the original hard rejection for quoted movement at this effect boundary.
    const authoredInput=outputSource&&db.getWorldEvent(guildId,outputSource);
    assertSceneActionSource(authoredInput,narrative);
    // Projection cannot erase the existing prohibition on bypassing governed native goal adapters.
    if(npcGoals.length&&source!=='human_gm'&&db.getCityCalendar(guildId).flags.emergent_goals===true)
      assertMutationSuccess({npcGoals:applyNpcCognitionDrafts(db,guildId,{goals:npcGoals},source,provenance).goals});
    if(narrative){
      validateCanonAnnotations(db,guildId,originalNarrative,scope);
      prepareAuthorizedTurnOutput(db,guildId,narrative,scope,{
        sourceRef:outputSource&&db.getWorldEvent(guildId,outputSource)?outputSource:null,origin:source,content});
      handouts=narrative.handouts||handouts; npcMemories=narrative.npc_memories||npcMemories;
      npcKnowledge=narrative.npc_knowledge||npcKnowledge; npcGoals=narrative.npc_goals||npcGoals;
    }
    if(narrative?.narrative_interpretation)persistInterpretation(db,guildId,narrative.narrative_interpretation,scope,provenance);
    const intentDiagnostics=persistPlayerIntentDiagnostics(db,guildId,narrative?.player_intent_diagnostics||[],scope,provenance);
    const typedIntents=persistPlayerIntents(db,guildId,narrative?.player_intents||[],scope,provenance);
    persistAuthoredCandidates(db,guildId,narrative?.authored_candidates,scope,{...provenance,typedIntents});
    if(db.getCityCalendar(guildId).flags.narrative_authority&&scope.actorCharacterId&&!scenePresence(db,guildId,'character',scope.actorCharacterId)){
      const prior=lastVerifiedCharacterPresence(db,guildId,db.getCharacter(scope.actorCharacterId));
      if(prior)reconcileSceneArrival(db,guildId,{type:'character',key:scope.actorCharacterId,source_event:prior.source_event,owner:scope.actorUserId});
    }
    const initialPositions=typedIntents.filter(row=>row.data.operation==='initial_position')
      .map(row=>applyAuthoredInitialPosition(db,guildId,row,scope));
    const personalCandidates=[];
    for(const intent of typedIntents.filter(row=>row.data.operation==='personal_commitment_candidate')){
      try{
        const authored=db.getWorldEvent(guildId,intent.source_event);
        const candidate=captureArcCandidate(db,guildId,scope.actorUserId,scope.actorCharacterId,provenance.messageId,
          authored.details.raw_text,{acceptedIntent:intent.record_key});
        if(candidate)personalCandidates.push(candidate);
      }catch(error){
        if(error.code!=='SEMANTIC_PROPOSAL')throw error;
        db.saveCityRecord(guildId,{kind:'semantic_candidate_review',key:intent.record_key,status:'needs_review',visibility:'gm',
          source_event:intent.source_event,data:{version:1,reason:'Owner source/framing needs review; no personal arc or consent created.'}});
      }
    }
    let actionPlan=buildActionPlan(db,guildId,typedIntents);
    const collaborationOnly=prepareUnifiedCollaboration(db,guildId,narrative,typedIntents,{connectUnifiedArbitration});
    const conflictInputs=typedIntents.filter(row=>!collaborationOnly.has(row.record_key));
    const pvpAttempts=stagePvpAttempts(db,guildId,conflictInputs,actionPlan);
    const campaignPvpPreparations=pvpAttempts.filter(row=>row.kind==='pvp_attack_intent'&&row.data.version===4).map(row=>{
      try{
        const request=prepareCampaignPvpAttack(db,guildId,row);
        reserveCampaignAttackNotices(db,guildId,request.record_key);
        return {status:'pending_owner',intent:row.record_key,request:request.record_key};
      }catch(error){
        if(!['NARRATIVE_PVP','SCENE_ACTION_WINDOW','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;
        const review=db.saveCityRecord(guildId,{kind:'pvp_campaign_review',key:row.record_key,status:'needs_review',visibility:'gm',
          source_event:row.source_event,data:{version:1,accepted_intent:row.data.accepted_intent,reason:String(error.message).slice(0,500),
            authority:'Pending native mechanics only; no dice, consent, resources or PC outcome.'}});
        return {status:'needs_review',intent:row.record_key,review:review.record_key};
      }
    });
    const pvpIds=new Set(pvpAttempts.map(row=>row.data.accepted_intent));
    if(pvpAttempts.length)actionPlan=actionPlan.map(row=>db.getCityRecord(guildId,"compound_action",row.record_key));
    const actionWindows=coordinateTypedActionWindows(db,guildId,conflictInputs,actionPlan);
    if(actionWindows.length)actionPlan=actionPlan.map(row=>db.getCityRecord(guildId,"compound_action",row.record_key));
    const coordinatedIds=new Set(actionWindows.map(row=>row.action));
    const unifiedArbitration=applyUnifiedArbitration(db,guildId,narrative,typedIntents,{content,connectUnifiedArbitration});
    for(const decision of unifiedArbitration.filter(d=>d.data.native?.operation==='campaign_pvp_attack')){
      const request=db.getCityRecord(guildId,'pvp_attack_request',decision.data.native.request),
        preparation=campaignPvpPreparations.find(p=>p.intent===request?.data.offer.input.attack);
      if(!preparation)continue;
      Object.assign(preparation,{status:'pending_owner',request:request.record_key});
      const review=db.getCityRecord(guildId,'pvp_campaign_review',preparation.intent);
      if(review)db.saveCityRecord(guildId,{...review,key:review.record_key,status:'resolved',data:{...review.data,native_request:request.record_key}});
    }
    const unifiedIds=new Set(unifiedArbitration.map(row=>row.data.entry));
    const gmRulings=typedIntents.filter(row=>!unifiedIds.has(row.record_key)&&row.data.gm_ruling&&!row.data.gm_review_terminal&&!pvpIds.has(row.record_key)&&!coordinatedIds.has(row.record_key)
      &&!actionPlan.some(node=>node.data.action_id===row.record_key&&node.data.status==="suspended"))
      .map(row=>adjudicateGmRuling(db,guildId,row.record_key,row.data.gm_ruling,scope));
    if(gmRulings.length){
      for(const ruling of gmRulings){
        const receipt=ruling.data.adjudication?.receipts?.[0],node=actionPlan.find(n=>n.data.action_id===ruling.data.accepted_intent);
        if(receipt&&node&&node.data.status!=="resolved")transitionAction(db,guildId,node.record_key,
          {expected_status:node.data.status,status:"resolved",receipt});
      }
      typedIntents.forEach((row,index)=>{typedIntents[index]=db.getCityRecord(guildId,"typed_intent",row.record_key);});
      actionPlan=buildActionPlan(db,guildId,typedIntents);
    }
    const nativeAdjudications=typedIntents.filter(row=>!unifiedIds.has(row.record_key)&&!row.data.gm_ruling&&row?.data?.resolution==="roll_required"&&!pvpIds.has(row.record_key)&&!coordinatedIds.has(row.record_key)
      &&!actionPlan.some(n=>n.data.action_id===row.record_key&&["suspended","blocked"].includes(n.data.status))).map(row=>{
      const adjudication=row.data.native_adjudication;
      return adjudicateAcceptedIntent(db,guildId,{
        acceptedIntent:row.record_key,mode:"roll_required",risk:adjudication.risk,stakes:adjudication.stakes,
        savedRulingKey:adjudication.saved_ruling_key,overrideRefs:adjudication.override_refs,
        rawRefs:adjudication.raw_refs,houseRefs:adjudication.house_refs,homebrewRefs:adjudication.homebrew_refs,
        trait:adjudication.trait,kind:adjudication.kind,difficulty:adjudication.difficulty,
        modifierKeys:adjudication.modifier_keys,attackSource:adjudication.attack_source,
        explanation:adjudication.explanation
      },provenance.actorId||"ai_gm",{scope});
    });
    const executableSpans=new Set(executableActionSpans(actionPlan));
    const deniedSpans=new Set(actionPlan.filter(row=>["blocked","clarification","failed"].includes(row.data.status))
      .map(row=>row.data.source_span));
    if((narrative?.scene_actions||[]).some(action=>deniedSpans.has(action.source_span)))
      throw new Error("Blocked or unresolved typed intent cannot propose an authoritative scene action.");
    const plannedNarrative=narrative?.player_intents?.length?{...narrative,
      scene_actions:(narrative?.scene_actions||[]).filter(action=>!narrative.player_intents.some(row=>row.framing==="immediate"&&row.source_span===action.source_span)
        ||executableSpans.has(action.source_span))}:narrative;
    const world=applyAutonomousWorld(db,guildId,plannedNarrative,scope,provenance,content);
    world.push(...initialPositions.map(row=>({status:'arrived',source_event:row.data.arrival,initial_setup:true})));
    recordCharacterPerceptions(db,guildId,{world,intents:typedIntents,scope,sourceRef:outputSource});
    if(narrative)prepareAuthorizedTurnOutput(db,guildId,narrative,scope,{
      sourceRef:outputSource&&db.getWorldEvent(guildId,outputSource)?outputSource:null,world,origin:source,content});
    if(outputSource&&scope.actorCharacterId&&db.getWorldEvent(guildId,outputSource)?.kind==='ai_gm_input'&&db.getCityCalendar(guildId).flags.narrative_salience)
      noteNarrativeInterest(db,guildId,scope,outputSource,{intents:typedIntents});
    const typedDialogue=persistTypedDialogue(db,guildId,narrative?.player_intents||[],scope,provenance);
    const contextMemories=saveContextMemories(db,guildId,narrative,scope,provenance);
    const eventResults=applyGMEvents(db,guildId,sessionId,events,scope,{...provenance,pvp_action_ids:[...pvpIds]});
    const relationshipResults=applyRelationshipDrafts(db,guildId,relationships,scope,source);
    const handoutResults=applyHandoutDrafts(db,guildId,sessionId,handouts,scope,source);
    const scene=sessionId?db.getDirectorState(sessionId).scene_label||"":"";
    const cognition=applyNpcCognitionDrafts(db,guildId,{memories:npcMemories,knowledge:npcKnowledge,goals:npcGoals},source,{...provenance,sessionId,scene});
    const simulation=applySimulationUpdates(db,guildId,simulationUpdates,{scope,
      provenance:{...provenance,actorType:provenance.actorType||(source==="human_gm"?"human_gm":"ai"),sessionId,scene}});
    const reviewNormalization=narrative?.state_review_normalization;
    const reviewSource=provenance.messageId&&scope.actorCharacterId
      ?worldInputKey(provenance.messageId,scope.actorCharacterId):null;
    const reviewAudit=reviewNormalization?.normalized&&reviewSource&&db.getWorldEvent(guildId,reviewSource)?db.saveCityRecord(guildId,{
      kind:"post_turn_review_audit",key:`review:${provenance.messageId||provenance.interactionId||"unknown"}`,
      status:"normalized",visibility:"gm",subject_key:null,
      source_event:reviewSource,data:{version:1,session_id:sessionId,
        corrections:reviewNormalization.corrections||[],
        authority:"Private audit of deterministic review metadata normalization; no world-state authority."}
    }):null;
    assertMutationSuccess({events:eventResults,relationships:relationshipResults,handouts:handoutResults,npcMemories:cognition.memories,npcKnowledge:cognition.knowledge,npcGoals:cognition.goals});
    if(originalNarrative) assertNarrativeApplied(originalNarrative,eventResults);
    const base={sessionId,actorType:provenance.actorType||"ai",actorId:provenance.actorId||scope.actorUserId||"veilkeeper",sourceLayer:source,sourceInteractionId:provenance.interactionId||null,sourceMessageId:provenance.messageId||null,confidence:provenance.confidence??100,rationale:provenance.rationale||"",triggerText:provenance.triggerText||""};
    eventResults.forEach((result,index)=>{
      if(!result?.ok&&!result?.expectedConflict) return;
      db.recordMutation(guildId,{...base,
        mutationType:`event:${events[index]?.type||result.type||"unknown"}`,
        entityKey:events[index]?.key||result.key||result.id||"",
        visibility:result.visibility||result.after?.visibility||events[index]?.visibility||"gm",
        before:result.before??{},after:result.after??result,payload:events[index]||{}
      });
    });
    relationshipResults.forEach((result,index)=>{
      if(!result?.ok) return;
      db.recordMutation(guildId,{...base,mutationType:"relationship",entityKey:result.row?.id||"",
        visibility:result.row?.visibility||"gm",before:result.before??{},after:result.after??result.row??result,payload:relationships[index]||{}
      });
    });
    handoutResults.forEach((result,index)=>{
      if(!result?.ok) return;
      db.recordMutation(guildId,{...base,mutationType:"handout",entityKey:result.row?.id||"",
        visibility:result.row?.visibility||"gm",after:result.row||result,payload:handouts[index]||{}
      });
    });
    cognition.memories.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_memory",entityKey:`${result.row?.npc_key||""}:${result.row?.id||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
    cognition.knowledge.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_knowledge",entityKey:`${result.row?.npc_key||""}:${result.row?.knowledge_key||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
    cognition.goals.filter(x=>x?.ok).forEach(result=>db.recordMutation(guildId,{...base,mutationType:"npc_goal",entityKey:`${result.row?.npc_key||""}:${result.row?.goal_key||""}`,visibility:"gm",before:result.before??{},after:result.after??result.row,payload:result.draft||{}}));
    const opportunityBudget={operations:0,cost:0};
    const intents=dispatchAiIntents(db,guildId,aiIntents,{scope,sessionId,budget:opportunityBudget,
      origin:provenance.messageId||provenance.interactionId||source});
    const ordinaryEffects=applyOrdinaryEffects(db,guildId,narrative?.ordinary_effect_proposals||[],scope,
      {typedIntents,budget:opportunityBudget,provenance});
    if(originalNarrative){
      const audit=validateCandidateClaims(db,guildId,originalNarrative,scope,eventResults,{output:narrative});
      if(audit?.diagnostics?.length)db.saveCityRecord(guildId,{kind:'candidate_claim_review',
        key:`candidate-claims:${createHash('sha256').update(JSON.stringify([sessionId,outputSource,originalNarrative])).digest('hex')}`,
        status:'needs_review',visibility:'gm',source_event:outputSource||'',data:{version:1,diagnostics:audit.diagnostics,
          authority:'rejected_unpublished_annotations_not_world_state'}});
      for(const diagnostic of audit?.diagnostics||[])
        recordNpcTestimony(db,guildId,sessionId,originalNarrative.narrative_claims?.[diagnostic.index],diagnostic,scope,outputSource,provenance);
    }
    const nativeEntries=intents.filter(row=>row.status==='accepted'&&row.data.intent?.feature==='scene'
      &&row.data.intent.payload?.op==='enter'&&row.data.result?.status==='approved').map(row=>row.data.result.record_key);
    if((nativeEntries.length||ordinaryEffects.some(row=>row.status==='applied')
      ||nativeEnvironmentOutputCandidates(db,guildId,outputSource,scope).length)&&narrative)prepareAuthorizedTurnOutput(db,guildId,narrative,scope,{
      sourceRef:outputSource&&db.getWorldEvent(guildId,outputSource)?outputSource:null,world,nativeEntries,
      nativeEffects:ordinaryEffects.filter(row=>row.status==='applied').map(row=>row.record_key),origin:source,content});
    // Validate against native operations staged in this transaction, not the old
    // state or model-described effects. Any failure rolls back the entire bundle.
    if(narrative) validateNarrativeClaims(db,guildId,narrative,scope,{staged:true,eventResults});
    // Trusted in-process observer only. Used to capture a scoped destination AFTER native movement validation;
    // preview still rolls back everything and never calls a provider inside this transaction.
    if(inspectStaged)inspectStaged({world,nativeEntries});
    return {events:eventResults,relationships:relationshipResults,handouts:handoutResults,
      npcMemories:cognition.memories,npcKnowledge:cognition.knowledge,npcGoals:cognition.goals,simulation,intents,world,typedIntents,
      intentDiagnostics,nativeAdjudications,gmRulings,unifiedArbitration,actionPlan,actionWindows,pvpAttempts,campaignPvpPreparations,typedDialogue,contextMemories,reviewAudit,personalCandidates,ordinaryEffects,privateWorldSeeds};
  });
}

/** Native preview shares the commit resolver and always rolls back; no delivery or paid calls. */
export function previewAuthoritativeMutation(db,input){
  const rollback={};let result;
  try{db.transaction(()=>{
    result=applyAuthoritativeMutation(db,input);
    // Optional caller check against the staged state, before it is rolled back.
    input.inspectMutation?.(result);
    throw rollback;
  });}
  catch(error){if(error!==rollback)throw error;}
  return result;
}
