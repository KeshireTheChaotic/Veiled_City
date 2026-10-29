import {connectUnifiedArbitration} from './framework-to-framework/daggerheart--intent/public.js';
/** Authoritative AI/state mutation layer. Applies validated structured outputs while enforcing transaction and visibility invariants. */
import { randomUUID, createHash } from "node:crypto";
import {applyAuthoredInitialPosition} from './frameworks/session/public.js';
import {noteNarrativeInterest} from './narrative-salience.js';
import {nativeDirectorNarrativeSource,nativeDirectorNarrativeContent} from './narrative-director-source.js';
import {lastVerifiedCharacterPresence,reconcileSceneArrival,scenePresence} from './scene-continuity.js';
import { indexWorldEvent } from "./city-calendar.js";
import {normalizeEntityKey as normalizeNpcKey} from './kernel/entity-key.js';
import { applySimulationUpdates } from "./simulation.js";
import { validateNarrativeClaims, validateCanonAnnotations, validateCandidateClaims, assertNarrativeApplied } from "./narrative-integrity.js";
import { prepareAuthorizedTurnOutput, candidateNarrative, assertProtectedModelEvents } from "./pvp-output.js";
import { recordCharacterPerceptions } from "./character-observation.js";
import { applyAutonomousWorld, worldInputKey } from "./autonomous-world.js";
import { dispatchAiIntents } from "./ai-intents.js";
import { assertNpcObservation } from "./scene-continuity.js";
import { persistInterpretation } from "./narrative-context.js";
import { typedEvidence } from "./epistemic.js";
import { persistAuthoredCandidates } from "./authored-candidates.js";
import { persistPlayerIntents, persistPlayerIntentDiagnostics, persistTypedDialogue } from "./typed-intents.js";
import { adjudicateAcceptedIntent } from "./rules-arbitration.js";
import {adjudicateGmRuling} from "./gm-action-ruling.js";
import {applyUnifiedArbitration,prepareUnifiedCollaboration} from './gm-unified-arbitration.js';
import {nativeEnvironmentOutputCandidates} from './native-environment-output.js';
import { coordinateTypedActionWindows } from "./frameworks/session/public.js";
import { buildActionPlan, executableActionSpans, transitionAction } from "./frameworks/intent/public.js";
import { saveContextMemories } from "./context-memory.js";
import { stagePvpAttempts } from "./narrative-pvp.js";
import {prepareCampaignPvpAttack} from './pvp-attacks.js';
import {reserveCampaignAttackNotices} from './native-publications.js';
import { applyGeneratedPcEffect } from "./pc-effects.js";
import { relationshipProvenance, artifactProvenance, inferredSource } from "./frameworks/knowledge/public.js";
import {captureArcCandidate} from './personal-continuity.js';
import {ownerSemanticSource,semanticCandidateHash} from './semantic-candidate-source.js';
import {applyOrdinaryEffects} from './ordinary-effects.js';
import {isCharacterSourceSpan} from './source-communication.js';
import {sourceSpanInsideQuote} from './authored-turn-envelope.js';
import {applyPrivateSeedTurn} from './world-private-seeds.js';
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

function activeCharacterFor(db,sessionId,userId){
  return sessionId?db.activeAssignment(sessionId,userId):null;
}

function privateVisibility(event,scope){
  if(scope?.mode!=="private") return {
    visibility:event.visibility||"party",
    targetUserId:event.target_user_id||null,
    targetCharacterId:event.target_character_id||null
  };
  // Private player scenes may create private knowledge only for the acting player/character.
  if(["fact","clue","thread","npc_update","location_update","canon"].includes(event.type)){
    const characterId=scope.actorCharacterId||null;
    return characterId
      ?{visibility:"character",targetUserId:null,targetCharacterId:characterId}
      :{visibility:"player",targetUserId:scope.actorUserId,targetCharacterId:null};
  }
  return {visibility:"gm",targetUserId:null,targetCharacterId:null};
}

function fail(message){ throw new Error(message); }
function block(results,e,message){ results.push({type:e?.type||"unknown",ok:false,blocked:true,error:message,event:e}); return true; }
function cleanKey(value){ return String(value||"").trim(); }

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

/** Apply structured GM events while enforcing private-scene scope boundaries. */
export function applyGMEvents(db,guildId,sessionId,events=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},provenance={}){
  assertProtectedModelEvents(db,guildId,events,scope);
  const results=[];
  for(const e of events||[]){
    try{
      if(!e?.type) fail("GM event is missing type.");
      const vis=privateVisibility(e,scope);
      switch(e.type){
        case "fact":
        case "clue":{
          if(!String(e.value||"").trim()) fail(`${e.type} event requires value.`);
          const id=db.addFact(guildId,{
            category:e.type,
            key:cleanKey(e.key)||`${e.type}-${randomUUID()}`,
            content:e.value,
            visibility:vis.visibility,
            subjectUserId:vis.targetUserId,
            subjectCharacterId:vis.targetCharacterId,
            sessionId,
            source:"ai_gm",
            provenance:{...provenance,event:e,epistemic:typedEvidence(db,guildId,e,scope)},
            confidence:provenance.confidence??100
          });
          results.push({type:e.type,ok:true,id,visibility:vis.visibility,before:null,after:db.getFact(guildId,id)});
          break;
        }
        case "clock_delta":{
          const rawKey=cleanKey(e.key);
          if(!rawKey) fail("clock_delta event requires key.");
          let key=rawKey, visibility=e.visibility||"gm", subjectUserId=e.target_user_id||null, subjectCharacterId=e.target_character_id||null;
          if(scope.mode==="private"){
            const owner=scope.actorCharacterId||scope.actorUserId;
            if(!owner) fail("Private clock_delta requires an acting player or character.");
            key=`private:${owner}:${rawKey}`;
            if(scope.actorCharacterId){ visibility="character"; subjectCharacterId=scope.actorCharacterId; subjectUserId=null; }
            else { visibility="player"; subjectUserId=scope.actorUserId; subjectCharacterId=null; }
          }
          const before=db.getClock(guildId,key)||null;
          const v=db.changeClock(guildId,key,Number(e.amount)||0,{
            label:e.value||rawKey,visibility,subjectUserId,subjectCharacterId
          });
          results.push({type:e.type,ok:true,key,value:v,visibility,before,after:db.getClock(guildId,key)});
          break;
        }
        case "veil_exposure_delta":{
          if(scope.mode==="private"){ block(results,e,"Private AI turns may not directly alter global Veil Exposure; use a private clock/fact and let the GM promote global consequences."); break; }
          const before={veil_exposure:db.getCampaign(guildId)?.veil_exposure??0};
          const v=db.changeVeilExposure(guildId,Number(e.amount)||0);
          results.push({type:e.type,ok:true,value:v,before,after:{veil_exposure:v}});
          break;
        }
        case "resource_delta":{
          const allowed=new Set(["hope","hp","stress","armor"]);
          if(!allowed.has(e.key)) fail(`Unsupported resource_delta key: ${e.key||"(empty)"}.`);
          let characterId=e.target_character_id||null;
          if(scope.mode==="private"){
            if(!scope.actorCharacterId) fail("Private resource_delta requires the acting character.");
            if(e.target_character_id&&e.target_character_id!==scope.actorCharacterId){ block(results,e,"Private resource_delta cannot target another character."); break; }
            if(e.target_user_id&&e.target_user_id!==scope.actorUserId){ block(results,e,"Private resource_delta cannot target another player."); break; }
            characterId=scope.actorCharacterId;
          }else if(!characterId && e.target_user_id){
            const a=activeCharacterFor(db,sessionId,e.target_user_id);
            characterId=a?.character_id||null;
          }
          if(!characterId) fail("resource_delta could not resolve a target character.");
          const ch=db.getCharacter(characterId);
          if(!ch || ch.guild_id!==guildId) fail("resource_delta target character is not in this campaign.");
          const harmful=["hp","stress"].includes(e.key)&&Number(e.amount)>0
            ||e.key==="armor"&&Number(e.amount)!==0||e.key==="hope"&&Number(e.amount)<0;
          if(provenance.pvp_action_ids?.length||harmful&&scope.actorUserId&&scope.actorCharacterId
            &&characterId!==scope.actorCharacterId&&provenance.actorType!=="human_gm"){
            block(results,e,"Player-originated PC harm requires narrative PvP; generic resource_delta grants no damage or costs.");break;
          }
          const before=structuredClone(ch.data?.resources?.[e.key]??null);
          let effect;
          try{effect=applyGeneratedPcEffect(db,guildId,sessionId,e,characterId,scope);}
          catch(error){
            if(error.code!=="PC_EFFECT_AUTHORITY")throw error;
            block(results,e,`needs_native_cause: ${error.message}`);break;
          }
          const afterCharacter=db.getCharacter(characterId);
          results.push({type:e.type,ok:true,key:e.key,target_character_id:characterId,target_user_id:e.target_user_id||null,amount:effect.data.amount,
            cause_receipt:effect.record_key,before,after:structuredClone(afterCharacter?.data?.resources?.[e.key]??null)});
          break;
        }
        case "thread":{
          const rawId=cleanKey(e.key)||randomUUID();
          const owner=scope.actorCharacterId||scope.actorUserId;
          const id=scope.mode==="private"?`private:${owner}:${rawId}`:rawId;
          const before=db.getThread(guildId,id)||null;
          const row=db.upsertThread(guildId,{
            id,
            label:String(e.value||rawId),
            status:["active","resolved","failed","dormant"].includes(e.status)?e.status:"active",
            visibility:vis.visibility,
            subjectUserId:vis.targetUserId,
            subjectCharacterId:vis.targetCharacterId,
            notes:e.note||""
          });
          results.push({type:e.type,ok:true,id,row,before,after:row,publish:vis.visibility==="party"||vis.visibility==="public"});
          break;
        }
        case "npc_update":
        case "location_update":{
          if(!cleanKey(e.key)||!String(e.value||"").trim()) fail(`${e.type} requires key and value.`);
          const kind=e.type==="npc_update"?"npc":"location";
          const rawKey=e.key.trim().toLowerCase();
          const owner=scope.actorCharacterId||scope.actorUserId;
          const entityKey=scope.mode==="private"?`private:${owner}:${rawKey}`:rawKey;
          const before=db.getReference(guildId,kind,entityKey)||null;
          const row=db.upsertReference(guildId,{
            kind,key:entityKey,name:e.key.trim(),summary:e.value.trim(),
            visibility:vis.visibility,subjectUserId:vis.targetUserId,subjectCharacterId:vis.targetCharacterId
          });
          results.push({type:e.type,ok:true,kind,key:row.entity_key,row,before,after:row,publish:vis.visibility==="party"||vis.visibility==="public"});
          break;
        }
        case "canon":{
          if(scope.mode==="private"){ block(results,e,"Private AI turns may not write directly to the global canon ledger; record a private fact/clue and let the GM promote it to canon when appropriate."); break; }
          if(!cleanKey(e.key)||!String(e.value||"").trim()) fail("canon event requires key and value.");
          const canonVisibility=String(e.visibility||"party").toLowerCase();
          if(!["public","party","gm"].includes(canonVisibility)) fail("Canon visibility must be public, party, or gm because canon ledger entries are campaign-global.");
          const before=db.currentCanon(guildId,e.key)||null;
          if(!before){
            if(e.epistemic?.kind!=="observation")fail("New AI canon needs committed observation ancestry or explicit human GM promotion; inference is not truth.");
            typedEvidence(db,guildId,e,scope);
          }
          const r=db.proposeCanon(guildId,{key:e.key,value:e.value,visibility:canonVisibility,sessionId,sourceType:"ai",sourceId:"gm",provenance:e.note||"AI GM turn"});
          results.push({type:e.type,key:e.key,ok:r.status!=="conflict",status:r.status,conflict_id:r.conflict?.id||null,expectedConflict:r.status==="conflict",before,after:r.status==="conflict"?r.conflict:db.currentCanon(guildId,e.key)});
          break;
        }
        case "relationship":
        case "log_only":{
          db.audit(guildId,sessionId,"ai","gm",e.type,e);
          results.push({type:e.type,ok:true});
          break;
        }
        default:
          fail(`Unsupported GM event type: ${e.type}.`);
      }
    }catch(err){
      results.push({type:e?.type||"unknown",ok:false,error:String(err.message||err),event:e});
    }
  }
  return results;
}

function resolveRelationshipEndpoint(db,guildId,type,key,label=""){
  if(type==="character"){
    const c=db.getCharacter(key)||db.findGuildCharacter(guildId,key,{includeClosed:true})||db.findGuildCharacter(guildId,label,{includeClosed:true});
    if(c) return {key:c.id,label:c.name};
    throw new Error(`Relationship character endpoint not found: ${key||label||"(empty)"}.`);
  }
  const raw=String(key||label||"").trim();
  if(!raw) throw new Error(`Relationship ${type||"entity"} endpoint is empty.`);
  return {key:raw.includes(":")?raw:db.relationshipEntityKey(type,raw),label:String(label||raw)};
}

export function applyRelationshipDrafts(db,guildId,relationships=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm"){
  const out=[];
  for(const r of relationships||[]){
    try{
      const from=resolveRelationshipEndpoint(db,guildId,r.from_type,r.from_key,r.from_label);
      const to=resolveRelationshipEndpoint(db,guildId,r.to_type,r.to_key,r.to_label);
      if(scope.mode==="private"&&scope.actorCharacterId){
        const characterEndpoints=[r.from_type==="character"?from.key:null,r.to_type==="character"?to.key:null].filter(Boolean);
        if(characterEndpoints.some(id=>id!==scope.actorCharacterId)){
          out.push({ok:false,blocked:true,error:"Private relationship draft cannot mutate another player character's relationship state.",draft:r});
          continue;
        }
      }
      let visibility=r.visibility||"party";
      if(scope.mode==="private") visibility=scope.actorCharacterId?"character":"gm";
      const existing=db.findRelationship(guildId,{fromType:r.from_type,fromKey:from.key,toType:r.to_type,toKey:to.key,relationshipType:r.relationship_type||"other"});
      const provenance=inferredSource(source)?relationshipProvenance(db,guildId,r,scope,existing):null;
      if(provenance&&(r.from_type==="character"||["debt","obligation"].includes(r.relationship_type))){
        const key=`relationship-interpretation:${createHash("sha256").update(JSON.stringify([db.getActiveSession(guildId)?.id,scope,r])).digest("hex").slice(0,40)}`;
        const cause=indexWorldEvent(db,guildId,{key,source_id:source,kind:"relationship_interpretation",title:"Nonbinding directional relationship interpretation",
          visibility,subject_key:scope.actorCharacterId||undefined,details:{epistemic:provenance.epistemic,authority:"Interpretation only; not PC feelings, debt or agreement"}},source);
        const proposal=db.getCityRecord(guildId,"relationship_interpretation",key)||db.saveCityRecord(guildId,{kind:"relationship_interpretation",key,status:"pending",source_event:cause.event_key,visibility,subject_key:scope.actorCharacterId||undefined,
          data:{draft:r,provenance,authority:"Nonbinding interpretation only; no PC feelings, debt, consent or authoritative score"}});
        out.push({ok:true,row:{...proposal,id:proposal.record_key},before:existing||null,after:proposal,interpretation_only:true});continue;
      }
      const score=r.mode==="delta"?Math.max(-5,Math.min(5,Number(existing?.score||0)+Number(r.score||0))):Math.max(-5,Math.min(5,Number(r.score||0)));
      const row=db.upsertRelationship(guildId,{fromType:r.from_type,fromKey:from.key,fromLabel:from.label,toType:r.to_type,toKey:to.key,toLabel:to.label,relationshipType:r.relationship_type||"other",score,visibility,note:r.note||"",source,sourceCharacterId:scope.actorCharacterId||null,provenance});
      out.push({ok:true,row,before:existing||null,after:row});
    }catch(err){out.push({ok:false,error:String(err.message||err),draft:r});}
  }
  return out;
}

export function applyHandoutDrafts(db,guildId,sessionId,handouts=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm"){
  const out=[];
  for(const h of handouts||[]){
    try{
      if(!String(h.title||"").trim()) throw new Error("Handout draft requires a title.");
      let visibility=h.visibility||"party", userId=h.target_user_id||null, characterId=h.target_character_id||null;
      if(scope.mode==="private"&&visibility!=="gm"){
        if(scope.actorCharacterId){visibility="character";characterId=scope.actorCharacterId;userId=null;}
        else {visibility="player";userId=scope.actorUserId;characterId=null;}
      }
      if(visibility==="character"&&!characterId) characterId=scope.actorCharacterId||null;
      if(visibility==="player"&&!userId) userId=scope.actorUserId||null;
      if(visibility==="character"&&!characterId) throw new Error("Character-visible handout has no target character.");
      if(visibility==="player"&&!userId) throw new Error("Player-visible handout has no target user.");
      const evidence=inferredSource(source)?artifactProvenance(db,guildId,h,visibility,characterId||userId,scope):null;
      const authority=evidence?.metadata.unsupported_count&&h.authority==="canonical"?"illustrative":h.authority||"illustrative";
      const row=db.createHandout(guildId,{sessionId,title:h.title,kind:h.kind||"document",authority,visibility,subjectUserId:userId,subjectCharacterId:characterId,content:h.player_visible_text||"",canonicalFacts:evidence?.accepted||h.canonical_facts||[],caseKey:h.case_key||"",npcKey:h.npc_key||"",locationKey:h.location_key||"",source,metadata:evidence?.metadata||{generated:true}});
      out.push({ok:true,row});
    }catch(err){out.push({ok:false,error:String(err.message||err),draft:h});}
  }
  return out;
}


export function applyCanonProposalDrafts(db,guildId,sessionId,drafts=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},meta={}){
  const out=[];
  for(const d of drafts||[]){
    if(scope.mode!=="private"){
      out.push({ok:false,blocked:true,error:"Player canon proposals are accepted only from a private player→GM scene.",draft:d});
      continue;
    }
    if(!scope.actorUserId||!scope.actorCharacterId){
      out.push({ok:false,blocked:true,error:"A private player canon proposal requires an acting player character so its origin can be recorded.",draft:d});
      continue;
    }
    const key=String(d?.key||"").trim().toLowerCase();
    const value=String(d?.value||"").trim();
    if(!key||!value) throw new Error("Canon proposal draft requires key and value.");
    const visibility=["public","party","gm"].includes(String(d?.visibility||"").toLowerCase())?String(d.visibility).toLowerCase():"party";
    let verified;
    for(const intent of meta.typedIntents||[]){
      if(intent.data?.operation!=='proposal_campaign_canon')continue;
      try{
        const candidate=ownerSemanticSource(db,guildId,intent.record_key,scope,'proposal_campaign_canon',meta.messageId);
        if(candidate.statement.includes(value)){verified=candidate;break;}
      }catch(error){if(error.code!=='SEMANTIC_PROPOSAL')throw error;}
    }
    if(!verified){out.push({ok:false,blocked:true,error:'Canon draft lacks its current typed private owner request and exact authored value.',draft:d});continue;}
    const before=db.findCanonProposalByCharacterValue(scope.actorCharacterId,key,value);
    const row=db.upsertCanonProposal(guildId,scope.actorCharacterId,null,{
      key,value,visibility,reason:String(d?.reason||"").trim()
    },{
      source:"typed_private_proposal_v2",
      proposedByUserId:scope.actorUserId,
      proposedByCharacterId:scope.actorCharacterId,
      sessionId:sessionId||null,
      channelId:meta.channelId||null,
      messageId:meta.messageId||null
    });
    if(!['accepted','rejected'].includes(row.status))db.saveCityRecord(guildId,{kind:'canon_proposal_source',key:row.id,
      status:'verified',visibility:'gm',source_event:verified.source.event_key,data:{version:1,proof:verified.proof,
        terms_hash:semanticCandidateHash([row.character_id,row.proposed_by_user_id,row.canon_key,row.proposed_value,row.proposed_visibility])}});
    out.push({ok:true,row,created:!before,source:"player_private_scene"});
  }
  return out;
}


/** Persist subjective NPC cognition proposed by the AI. These rows are GM-private
 * simulation state and never replace objective facts/canon. */
export function applyNpcCognitionDrafts(db,guildId,{memories=[],knowledge=[],goals=[]}={},source="ai_gm",provenance={}){
  const out={memories:[],knowledge:[],goals:[]};
  const ensureProfile=(draft)=>{
    const key=normalizeNpcKey(draft?.npc_key||"");
    if(!key) throw new Error("NPC cognition draft requires npc_key.");
    let profile=db.getNpcProfile(guildId,key);
    if(!profile){
      if(source!=="human_gm")
        throw new Error("Unknown NPC requires authorized world authoring/review; cognition cannot create actors.");
      const ref=db.listReferences(guildId,"npc",{publicOnly:false}).find(r=>normalizeNpcKey(r.display_name||r.entity_key)===key);
      profile=db.upsertNpcProfile(guildId,{
        npcKey:key,
        displayName:ref?.display_name||String(draft?.npc_key||key),
        publicIdentity:ref?.summary||"",
        portrayal:ref?.summary||"",
        activityTier:"background",
        decisionProfile:{},knowledgeBoundaries:[],capabilities:[],source:"ai_observed"
      });
    }
    return profile;
  };
  const sourceRef=String(provenance.messageId||provenance.sourceMessageId||provenance.interactionId||source||"");

  for(const draft of memories||[]){
    try{
      if(source!=="human_gm")assertNpcObservation(db,guildId,normalizeNpcKey(draft.npc_key),draft.source_ref||sourceRef,
        {sourceType:draft.source_type||source,content:draft.content,strict:true});
      const profile=ensureProfile(draft);
      const row=db.addNpcMemory(guildId,{
        npcKey:profile.npc_key,memoryType:draft.memory_type||"episodic",content:draft.content,
        subjectType:draft.subject_type||"entity",subjectKey:draft.subject_key||"",
        sentiment:draft.sentiment??0,importance:draft.importance??50,confidence:draft.confidence??100,
        sourceType:draft.source_type||source,sourceRef:draft.source_ref||sourceRef,tags:draft.tags||[],dedupe:true
      });
      if(!row.source_session) db.annotateNpcMemory(guildId,row.id,{sessionId:provenance.sessionId||null,
        scene:provenance.scene||"",tick:db.getSimulationClock(guildId).tick});
      out.memories.push({ok:true,row,before:null,after:row,draft});
    }catch(err){out.memories.push({ok:false,error:String(err.message||err),draft});}
  }
  for(const draft of knowledge||[]){
    try{
      if(source!=="human_gm")assertNpcObservation(db,guildId,normalizeNpcKey(draft.npc_key),draft.source_ref||sourceRef,
        {sourceType:draft.source_type||source,content:draft.content,strict:true});
      const profile=ensureProfile(draft);
      const before=db.getNpcKnowledge(guildId,profile.npc_key,draft.knowledge_key)||null;
      const row=db.upsertNpcKnowledge(guildId,{
        npcKey:profile.npc_key,knowledgeKey:draft.knowledge_key,content:draft.content,
        beliefState:["inferred","rumor","supernatural_impression","told","told_by_npc","faction_report","document"].includes(draft.source_type)
          ?(draft.belief_state==="known"||!draft.belief_state?"suspected":draft.belief_state):draft.belief_state||"known",confidence:draft.confidence??100,
        sourceType:draft.source_type||source,sourceRef:draft.source_ref||sourceRef,isSecret:draft.is_secret??true
      });
      if(before&&(before.content!==row.content||before.belief_state!==row.belief_state)){
        const oldMemory=db.addNpcMemory(guildId,{npcKey:profile.npc_key,memoryType:"semantic",
          content:`Previously believed (${before.belief_state}): ${before.content}`,confidence:before.confidence,
          sourceType:before.source_type,sourceRef:before.source_ref,tags:["belief-history",before.knowledge_key]});
        const correction=db.addNpcMemory(guildId,{npcKey:profile.npc_key,memoryType:"semantic",
          content:`Belief revised (${row.belief_state}): ${row.content}`,confidence:row.confidence,
          sourceType:row.source_type,sourceRef:oldMemory.id,tags:["belief-revision",row.knowledge_key]});
        db.annotateNpcMemory(guildId,oldMemory.id,{status:row.belief_state==="doubted"?"challenged":"superseded",supersededBy:correction.id});
      }
      out.knowledge.push({ok:true,row,before,after:row,draft});
    }catch(err){out.knowledge.push({ok:false,error:String(err.message||err),draft});}
  }
  for(const draft of goals||[]){
    try{
      if(db.getCityCalendar(guildId).flags.emergent_goals===true&&source!=="human_gm")
        fail("Enabled emergent goals require sourced, policy-governed ai_intents rather than legacy npc_goals.");
      const profile=ensureProfile(draft);
      const before=db.listNpcGoals(guildId,profile.npc_key,{limit:200}).find(x=>x.goal_key===String(draft.goal_key||"").trim().toLowerCase())||null;
      const row=db.upsertNpcGoal(guildId,{
        npcKey:profile.npc_key,goalKey:draft.goal_key,title:draft.title||"",objective:draft.objective,
        horizon:draft.horizon||"near",priority:draft.priority??50,progress:draft.progress??0,status:draft.status||"active",
        dependencies:draft.dependencies||[],acceptableMethods:draft.acceptable_methods||[],rationale:draft.rationale||"",source
      });
      out.goals.push({ok:true,row,before,after:row,draft});
    }catch(err){out.goals.push({ok:false,error:String(err.message||err),draft});}
  }
  return out;
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
    if(authoredInput?.kind==='ai_gm_input')for(const action of narrative?.scene_actions||[]){
      const raw=authoredInput.details.text,span=action.source_span,start=typeof span==='string'?raw.indexOf(span):-1;
      if(span&&start>=0&&(!isCharacterSourceSpan(raw,start,start+span.length)||sourceSpanInsideQuote(raw,start)))
        throw Object.assign(new Error('Quoted or explicitly OOC source cannot authorize a native scene action.'),{code:'PLAYER_INTENT'});
    }
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
