import {randomUUID} from 'node:crypto';
import {typedEvidence} from './evidence-source.js';
function fail(message){ throw new Error(message); }
function block(results,e,message){ results.push({type:e?.type||"unknown",ok:false,blocked:true,error:message,event:e}); return true; }
function cleanKey(value){ return String(value||"").trim(); }

/** Append exactly one Knowledge-owned event result; App retains preflight, ordering and transaction. */
export function appendKnowledgeGmEvent(db,guildId,sessionId,e,scope,provenance,vis,results){
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
      }
}

export function gmEventVisibility(event,scope){
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
