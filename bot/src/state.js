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
  if(["fact","clue","thread","npc_update","location_update"].includes(event.type)){
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
          if(!allowed.has(e.key)||!e.target_user_id) break;
          const a=activeCharacterFor(db,sessionId,e.target_user_id);
          if(!a) break;
          db.updateCharacterData(a.character_id,data=>{
            const res=data.resources??(data.resources={});
            if(e.key==="hope"){
              res.hope=Math.max(0,(Number(res.hope)||0)+(Number(e.amount)||0));
            } else {
              const obj=res[e.key]??(res[e.key]={current:0,max:0});
              obj.current=Math.max(0,Math.min(Number(obj.max)||999,(Number(obj.current)||0)+(Number(e.amount)||0)));
            }
          });
          results.push({type:e.type,key:e.key,target:e.target_user_id,amount:e.amount});
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
