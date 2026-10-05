import { randomUUID } from "node:crypto";

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
  // A private scene cannot silently publish newly learned information to the party.
  if(["fact","clue","thread","npc_update","location_update","canon"].includes(event.type)){
    const characterId=scope.actorCharacterId||event.target_character_id||null;
    return characterId
      ?{visibility:"character",targetUserId:null,targetCharacterId:characterId}
      :{visibility:"player",targetUserId:scope.actorUserId,targetCharacterId:null};
  }
  return {
    visibility:event.visibility||"gm",
    targetUserId:event.target_user_id||null,
    targetCharacterId:event.target_character_id||null
  };
}

export function applyGMEvents(db,guildId,sessionId,events=[],scope={mode:"party",actorUserId:null,actorCharacterId:null}){
  const results=[];
  for(const e of events){
    try{
      const vis=privateVisibility(e,scope);
      switch(e.type){
        case "fact":
        case "clue":{
          if(!e.value?.trim()) break;
          const id=db.addFact(guildId,{
            category:e.type,
            key:e.key||`${e.type}-${randomUUID()}`,
            content:e.value,
            visibility:vis.visibility,
            subjectUserId:vis.targetUserId,
            subjectCharacterId:vis.targetCharacterId,
            sessionId,
            source:"ai_gm"
          });
          results.push({type:e.type,ok:true,id,visibility:vis.visibility});
          break;
        }
        case "clock_delta":{
          if(!e.key) break;
          const v=db.changeClock(guildId,e.key,Number(e.amount)||0,{
            label:e.value||e.key,visibility:e.visibility||"gm",subjectUserId:e.target_user_id||null
          });
          results.push({type:e.type,key:e.key,value:v});
          break;
        }
        case "veil_exposure_delta":{
          const v=db.changeVeilExposure(guildId,Number(e.amount)||0);
          results.push({type:e.type,value:v});
          break;
        }
        case "resource_delta":{
          const allowed=new Set(["hope","hp","stress","armor"]);
          if(!allowed.has(e.key)) break;
          let characterId=e.target_character_id||null;
          if(!characterId && e.target_user_id){
            const a=activeCharacterFor(db,sessionId,e.target_user_id);
            characterId=a?.character_id||null;
          }
          if(!characterId) break;
          const ch=db.getCharacter(characterId);
          if(!ch || ch.guild_id!==guildId) break;
          db.updateCharacterData(characterId,data=>{
            const res=data.resources??(data.resources={});
            if(e.key==="hope"){
              res.hope=Math.max(0,(Number(res.hope)||0)+(Number(e.amount)||0));
            } else {
              const obj=res[e.key]??(res[e.key]={current:0,max:0});
              obj.current=Math.max(0,Math.min(Number(obj.max)||999,(Number(obj.current)||0)+(Number(e.amount)||0)));
            }
          });
          results.push({type:e.type,key:e.key,target_character_id:characterId,target_user_id:e.target_user_id||null,amount:e.amount});
          break;
        }
        case "thread":{
          const id=e.key||randomUUID();
          const row=db.upsertThread(guildId,{
            id,
            label:e.value||id,
            status:["active","resolved","failed","dormant"].includes(e.status)?e.status:"active",
            visibility:vis.visibility,
            subjectUserId:vis.targetUserId,
            subjectCharacterId:vis.targetCharacterId,
            notes:e.note||""
          });
          results.push({type:e.type,id,row,publish:vis.visibility==="party"||vis.visibility==="public"});
          break;
        }
        case "npc_update":
        case "location_update":{
          if(!e.key?.trim()||!e.value?.trim()) break;
          const kind=e.type==="npc_update"?"npc":"location";
          const row=db.upsertReference(guildId,{
            kind,key:e.key.trim().toLowerCase(),name:e.key.trim(),summary:e.value.trim(),
            visibility:vis.visibility,subjectUserId:vis.targetUserId,subjectCharacterId:vis.targetCharacterId
          });
          results.push({type:e.type,kind,key:row.entity_key,row,publish:vis.visibility==="party"||vis.visibility==="public"});
          break;
        }
        case "canon":{
          if(!e.key?.trim()||!e.value?.trim()) break;
          const r=db.proposeCanon(guildId,{key:e.key,value:e.value,visibility:vis.visibility,sessionId,sourceType:"ai",sourceId:"gm",provenance:e.note||"AI GM turn"});
          results.push({type:e.type,key:e.key,ok:r.status!=="conflict",status:r.status,conflict_id:r.conflict?.id||null});
          break;
        }
        case "relationship":
        case "log_only":{
          db.audit(guildId,sessionId,"ai","gm",e.type,e);
          results.push({type:e.type,ok:true});
          break;
        }
      }
    }catch(err){
      results.push({type:e.type,ok:false,error:String(err.message||err)});
    }
  }
  return results;
}

function resolveRelationshipEndpoint(db,guildId,type,key,label=""){
  if(type==="character"){
    const c=db.getCharacter(key)||db.findGuildCharacter(guildId,key,{includeClosed:true})||db.findGuildCharacter(guildId,label,{includeClosed:true});
    if(c) return {key:c.id,label:c.name};
  }
  const raw=String(key||label||"").trim();
  return {key:raw.includes(":")?raw:db.relationshipEntityKey(type,raw),label:String(label||raw)};
}

export function applyRelationshipDrafts(db,guildId,relationships=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm"){
  const out=[];
  for(const r of relationships||[]){
    try{
      const from=resolveRelationshipEndpoint(db,guildId,r.from_type,r.from_key,r.from_label);
      const to=resolveRelationshipEndpoint(db,guildId,r.to_type,r.to_key,r.to_label);
      let visibility=r.visibility||"party";
      if(scope.mode==="private" && ["public","party"].includes(visibility)) visibility=scope.actorCharacterId?"character":"gm";
      const existing=db.db.prepare(`SELECT * FROM relationships WHERE guild_id=? AND from_type=? AND from_key=? AND to_type=? AND to_key=? AND relationship_type=?`).get(guildId,r.from_type,from.key,r.to_type,to.key,r.relationship_type||"other");
      const score=r.mode==="delta"?Math.max(-5,Math.min(5,Number(existing?.score||0)+Number(r.score||0))):Math.max(-5,Math.min(5,Number(r.score||0)));
      const row=db.upsertRelationship(guildId,{fromType:r.from_type,fromKey:from.key,fromLabel:from.label,toType:r.to_type,toKey:to.key,toLabel:to.label,relationshipType:r.relationship_type||"other",score,visibility,note:r.note||"",source,sourceCharacterId:scope.actorCharacterId||null});
      out.push({ok:true,row});
    }catch(err){out.push({ok:false,error:String(err.message||err),draft:r});}
  }
  return out;
}

export function applyHandoutDrafts(db,guildId,sessionId,handouts=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},source="ai_gm"){
  const out=[];
  for(const h of handouts||[]){
    try{
      let visibility=h.visibility||"party", userId=h.target_user_id||null, characterId=h.target_character_id||null;
      if(scope.mode==="private" && ["public","party"].includes(visibility)){
        if(scope.actorCharacterId){visibility="character";characterId=scope.actorCharacterId;userId=null;}
        else {visibility="player";userId=scope.actorUserId;characterId=null;}
      }
      if(visibility==="character"&&!characterId) characterId=scope.actorCharacterId||null;
      if(visibility==="player"&&!userId) userId=scope.actorUserId||null;
      const row=db.createHandout(guildId,{sessionId,title:h.title,kind:h.kind||"document",authority:h.authority||"canonical",visibility,subjectUserId:userId,subjectCharacterId:characterId,content:h.player_visible_text||"",canonicalFacts:h.canonical_facts||[],caseKey:h.case_key||"",npcKey:h.npc_key||"",locationKey:h.location_key||"",source,metadata:{generated:true}});
      out.push({ok:true,row});
    }catch(err){out.push({ok:false,error:String(err.message||err),draft:h});}
  }
  return out;
}
