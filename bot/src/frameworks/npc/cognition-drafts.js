import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {assertNpcObservation} from './observation-source.js';
function fail(message){ throw new Error(message); }

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
