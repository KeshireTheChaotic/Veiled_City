import {nativeGeneratedPcEffectSource} from './contracts/generated-pc-effect-source.js';
const {applyGeneratedPcEffect}=nativeGeneratedPcEffectSource;
function fail(message){ throw new Error(message); }
function block(results,e,message){ results.push({type:e?.type||"unknown",ok:false,blocked:true,error:message,event:e}); return true; }
function activeCharacterFor(db,sessionId,userId){
  return sessionId?db.activeAssignment(sessionId,userId):null;
}

/** Append original Native PC-resource result; native cause and affected owner remain mandatory. */
export function appendNativeResourceGmEvent(db,guildId,sessionId,e,scope,provenance,results){
      switch(e.type){
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
      }
}
