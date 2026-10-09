/** Authoritative AI/state mutation layer. Applies validated structured outputs while enforcing transaction and visibility invariants. */
import { randomUUID, createHash } from "node:crypto";
import { indexWorldEvent } from "./city-calendar.js";
import { normalizeNpcKey } from "./npc-cognition.js";
import { applySimulationUpdates } from "./simulation.js";
import { validateNarrativeClaims, assertNarrativeApplied } from "./narrative-integrity.js";
import { dispatchAiIntents } from "./ai-intents.js";
import { assertNpcObservation } from "./scene-continuity.js";
import { persistInterpretation } from "./narrative-context.js";
import { typedEvidence } from "./epistemic.js";
import { persistAuthoredCandidates } from "./authored-candidates.js";
import { relationshipProvenance, artifactProvenance, inferredSource } from "./presentation-evidence.js";

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

/** Apply structured GM events while enforcing private-scene scope boundaries. */
export function applyGMEvents(db,guildId,sessionId,events=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},provenance={}){
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
          const before=structuredClone(ch.data?.resources?.[e.key]??null);
          db.updateCharacterData(characterId,data=>{
            const res=data.resources??(data.resources={});
            if(e.key==="hope"){
              res.hope=Math.max(0,(Number(res.hope)||0)+(Number(e.amount)||0));
            } else {
              const obj=res[e.key]??(res[e.key]={current:0,max:0});
              obj.current=Math.max(0,Math.min(Number(obj.max)||999,(Number(obj.current)||0)+(Number(e.amount)||0)));
            }
          });
          const afterCharacter=db.getCharacter(characterId);
          results.push({type:e.type,ok:true,key:e.key,target_character_id:characterId,target_user_id:e.target_user_id||null,amount:e.amount,before,after:structuredClone(afterCharacter?.data?.resources?.[e.key]??null)});
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
    const before=db.findCanonProposalByCharacterValue(scope.actorCharacterId,key,value);
    const row=db.upsertCanonProposal(guildId,scope.actorCharacterId,null,{
      key,value,visibility,reason:String(d?.reason||"").trim()
    },{
      source:"player_private_scene",
      proposedByUserId:scope.actorUserId,
      proposedByCharacterId:scope.actorCharacterId,
      sessionId:sessionId||null,
      channelId:meta.channelId||null,
      messageId:meta.messageId||null
    });
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

export function assertMutationSuccess({events=[],relationships=[],handouts=[],npcMemories=[],npcKnowledge=[],npcGoals=[]}={}){
  const failures=[];
  for(const [kind,rows] of [["event",events],["relationship",relationships],["handout",handouts],["npc_memory",npcMemories],["npc_knowledge",npcKnowledge],["npc_goal",npcGoals]]){
    rows.forEach((row,index)=>{
      // Canon conflicts are expected control-flow and remain committed for GM resolution.
      if(row?.ok===false&&!row?.expectedConflict&&!row?.blocked) failures.push({kind,index,error:row.error||"mutation failed",row});
    });
  }
  if(failures.length){
    const err=new Error(`Authoritative state mutation rejected: ${failures.map(f=>`${f.kind}[${f.index}]: ${f.error}`).join("; ")}`);
    err.code="STATE_MUTATION_REJECTED";
    err.failures=failures;
    throw err;
  }
  return true;
}

/**
 * Apply one authoritative AI mutation bundle transactionally. Either all valid
 * state changes commit together or the surrounding transaction rolls back.
 */
export function applyAuthoritativeMutation(db,{guildId,sessionId=null,events=[],relationships=[],handouts=[],npcMemories=[],npcKnowledge=[],npcGoals=[],
  simulationUpdates=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm",provenance={},narrative=null,aiIntents=narrative?.ai_intents||[]}){
  return db.transaction(()=>{
    if(narrative?.narrative_interpretation)persistInterpretation(db,guildId,narrative.narrative_interpretation,scope,provenance);
    persistAuthoredCandidates(db,guildId,narrative?.authored_candidates,scope,provenance);
    const eventResults=applyGMEvents(db,guildId,sessionId,events,scope,provenance);
    const relationshipResults=applyRelationshipDrafts(db,guildId,relationships,scope,source);
    const handoutResults=applyHandoutDrafts(db,guildId,sessionId,handouts,scope,source);
    const scene=sessionId?db.getDirectorState(sessionId).scene_label||"":"";
    const cognition=applyNpcCognitionDrafts(db,guildId,{memories:npcMemories,knowledge:npcKnowledge,goals:npcGoals},source,{...provenance,sessionId,scene});
    const simulation=applySimulationUpdates(db,guildId,simulationUpdates,{scope,
      provenance:{...provenance,actorType:provenance.actorType||(source==="human_gm"?"human_gm":"ai"),sessionId,scene}});
    assertMutationSuccess({events:eventResults,relationships:relationshipResults,handouts:handoutResults,npcMemories:cognition.memories,npcKnowledge:cognition.knowledge,npcGoals:cognition.goals});
    if(narrative) assertNarrativeApplied(narrative,eventResults);
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
    const intents=dispatchAiIntents(db,guildId,aiIntents,{scope,sessionId,
      origin:provenance.messageId||provenance.interactionId||source});
    // Validate against native operations staged in this transaction, not the old
    // state or model-described effects. Any failure rolls back the entire bundle.
    if(narrative) validateNarrativeClaims(db,guildId,narrative,scope,{staged:true,eventResults});
    return {events:eventResults,relationships:relationshipResults,handouts:handoutResults,
      npcMemories:cognition.memories,npcKnowledge:cognition.knowledge,npcGoals:cognition.goals,simulation,intents};
  });
}

/** Native preview shares the commit resolver and always rolls back; no delivery or paid calls. */
export function previewAuthoritativeMutation(db,input){
  const rollback={};let result;
  try{db.transaction(()=>{result=applyAuthoritativeMutation(db,input);throw rollback;});}
  catch(error){if(error!==rollback)throw error;}
  return result;
}
