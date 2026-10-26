/** Original authorization-first context selection belongs to Knowledge; no writes or provider calls. */
import {knowledgeWorldHistory} from './contracts/world-history.js';
import {clusterContext} from './memory-source.js';
import {evidenceType,activeEvidence} from './evidence-source.js';
import {projectAuthorityRecords,authorityRecordPage} from './authority-projection.js';
const historyContext=(...args)=>knowledgeWorldHistory.historyContext(...args);
const tokens=value=>String(value||"").toLowerCase().match(/[a-z0-9-]{3,}/g)||[];
export class ContextPlanner {
  constructor(db){this.db=db;}
  plan(guildId,{operation="turn",scene="",actorType="gm",actorKey="",userId="",characterId="",query="",scope="gm",maxTokens=4000,
    sourceRefs=[],factPage=0}={}){
    if(!["gm","npc","institution","character","player"].includes(actorType)||!['gm','public','party','player','character'].includes(scope)) throw new Error("Explicit context actor/scope required.");
    if(actorType==="character"&&this.db.getCharacter(characterId)?.guild_id!==guildId) throw new Error("Context character is not in this campaign.");
    if(actorType==="character"&&this.db.getCharacter(characterId)?.owner_user_id!==userId)
      throw new Error("Character context requires the current owner; GM context is a separate explicit scope.");
    if(actorType==="player"&&characterId&&["character","gm"].includes(scope)
      &&(this.db.getCharacter(characterId)?.guild_id!==guildId||this.db.getCharacter(characterId)?.owner_user_id!==userId))
      throw new Error("Character-private player context requires the current owner.");
    if(actorType==="npc"&&!this.db.getNpcProfile(guildId,actorKey)) throw new Error("Context NPC not found.");
    if(!Array.isArray(sourceRefs)||sourceRefs.length>12||sourceRefs.some(ref=>typeof ref!=="string"||!/^fact:[^\s]{1,160}$/.test(ref)))
      throw new Error("Context expansion requires bounded exact fact source references (at most 12).");
    if(!Number.isSafeInteger(factPage)||factPage<0||factPage>2000)throw new Error("Context fact page must be bounded.");
    const budget=Math.max(100,Math.min(6000,Number(maxTokens)||4000)),terms=[...new Set(tokens(`${query} ${scene}`))].slice(0,8);
    const candidates=new Map(),withheld=[];let fact_page=null;
    const add=(source,data,priority=0)=>{
      if(data?.kind?.startsWith("pvp_")||["character_visible_fact","character_perception_receipt","world_visible_fact"].includes(data?.kind))return;
      if(data?.kind==="authored_turn"&&data.details?.discord_message_id?.startsWith("description:"))return;
      if(['native_fresh_scene_description','native_scene_setup_offer','native_scene_fiction'].includes(data?.kind))return;
      const text=JSON.stringify(data);const score=terms.reduce((n,word)=>n+(text.toLowerCase().includes(word)?10:0),priority);
      candidates.set(source,{source,data,priority:score,estimated_tokens:Math.ceil((text.length+source.length+80)/3)});
    };
    if(actorType==="npc"){
      for(const row of clusterContext(this.db,guildId,"npc",actorKey,query)) add(`cluster:${row.key}`,row,15);
      for(const term of terms.length?terms:[""]) for(const row of this.db.listNpcKnowledge(guildId,actorKey,{queryTokens:tokens(term),limit:30}))
        if(row.belief_state!=="unknown") add(`npc_knowledge:${actorKey}:${row.knowledge_key}`,row,20);
      for(const row of this.db.listNpcGoals(guildId,actorKey,{status:"active",limit:8})) add(`npc_goal:${actorKey}:${row.goal_key}`,row,30);
      for(const row of this.db.listNpcMemories(guildId,actorKey,{status:"retrievable",queryTokens:terms,limit:12})) add(`npc_memory:${row.id}`,row,10);
      withheld.push("Global facts, other actor knowledge, canon secrets and civic event graphs excluded before ranking.");
    }else if(actorType==="institution"){
      for(const row of clusterContext(this.db,guildId,"institution",actorKey,query)) add(`cluster:${row.key}`,row,15);
      if(!this.db.getCityRecord(guildId,"institution",actorKey)) throw new Error("Institution not found.");
      for(const term of terms.length?terms:[""]) for(const row of this.db.listCityRecords(guildId,{kind:"report",actor:actorKey,query:term,includeGM:true,limit:20}))
        add(`institution_report:${row.record_key}`,row,20);
      withheld.push("Employee memories and global facts excluded; only filed institution reports included.");
    }else{
      // Lexical matches are ranking candidates, not the only retrieval gateway. Native exact-source
      // expansion and bounded nonlexical pages use the identical entitlement predicate on every read.
      const factScope={scope:actorType==="gm"?scope:scope==="gm"?"character":scope,userId,characterId};
      const page=this.db.contextFacts(guildId,{...factScope,limit:50,offset:factPage*50});
      for(const row of page)add(`fact:${row.id}`,{...row,epistemic:evidenceType(row),evidence_active:activeEvidence(this.db,guildId,row.id)},5);
      fact_page={page:factPage,next_page:page.length===50?factPage+1:null,
        sources:page.map(row=>`fact:${row.id}`),expansion:'sourceRefs: at most 12 exact fact locators; same current entitlement, no authority grant'};
      for(const term of terms.length?terms:[""]) for(const row of this.db.contextFacts(guildId,{scope:actorType==="gm"?scope:scope==="gm"?"character":scope,
        userId,characterId,query:term,limit:20})) add(`fact:${row.id}`,{...row,epistemic:evidenceType(row),evidence_active:activeEvidence(this.db,guildId,row.id)},20);
      if(sourceRefs.length)for(const row of this.db.contextFacts(guildId,{...factScope,ids:sourceRefs.map(ref=>ref.slice(5)),limit:12}))
        add(`fact:${row.id}`,{...row,epistemic:evidenceType(row),evidence_active:activeEvidence(this.db,guildId,row.id)},100);
      if(this.db.getCityCalendar(guildId).flags.personal_arcs===true){
        const session=this.db.getActiveSession(guildId);
        const ids=actorType==="gm"&&scope==="gm"&&session?this.db.roster(session.id)
          .filter(row=>["present","late","guest"].includes(row.presence)).map(row=>row.character_id).filter(Boolean).slice(0,8)
          :actorType==="character"&&this.db.getCharacter(characterId)?.owner_user_id===userId?[characterId]:[];
        for(const id of ids) for(const kind of ["arc","arc_beat"]) for(const row of this.db.characterContinuity(guildId,id,{kind,query,limit:8}))
          if(kind==="arc"||row.status==="pending") add(`${kind}:${row.record_key}`,{...row.data,character_id:id,status:row.status,nonbinding:true},15);
      }
      if(actorType==="gm"&&scope==="gm"){
        for(const row of clusterContext(this.db,guildId,"campaign",guildId,query)) add(`cluster:${row.key}`,row,5);
        for(const term of terms) for(const row of this.db.listWorldEvents(guildId,{includeGM:true,query:term,limit:12})) add(`event:${row.event_key}`,row,10);
        for(const row of historyContext(this.db,guildId,`${scene} ${query}`)) add(`history:${row.sources.map(s=>s.event_key).join(",")}`,row,5);
        for(const row of this.db.searchRulesRulings(guildId,query)) add(`ruling:${row.id||row.ruling_key}`,row,50);
      }else withheld.push("GM-only records and unrelated player/character scopes excluded before ranking.");
    }
    const segments=[],omissions=[];let used=0;
    for(const row of [...candidates.values()].sort((a,b)=>b.priority-a.priority||a.source.localeCompare(b.source))){
      if(used+row.estimated_tokens>budget){omissions.push({source:row.source,reason:"token_budget"});continue;}
      segments.push(row);used+=row.estimated_tokens;
    }
    return {operation,actor:{type:actorType,key:actorKey},scope,segments,omissions,withheld,estimated_tokens:used,budget,fact_page,
      authority:actorType==="gm"?"GM context does not grant actor knowledge":"Actor-relative subjective knowledge, not canon"};
  }
  authorityIndex(guildId,kind,{pageSize=25}={}){
    const rows=kind==="canon"?this.db.listCanon(guildId,{includeGM:true,limit:500}):kind==="rulings"?this.db.searchRulesRulings(guildId,""):[];
    return projectAuthorityRecords(kind,rows,{pageSize});
  }
  authorityPage(guildId,kind,{page=0,pageSize=25}={}){
    const rows=kind==="canon"?this.db.listCanon(guildId,{includeGM:true,limit:500}):kind==="rulings"?this.db.searchRulesRulings(guildId,""):[];
    return authorityRecordPage(kind,rows,{page,pageSize});
  }
}
