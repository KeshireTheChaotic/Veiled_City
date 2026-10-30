function fail(message){ throw new Error(message); }
function block(results,e,message){ results.push({type:e?.type||"unknown",ok:false,blocked:true,error:message,event:e}); return true; }
function cleanKey(value){ return String(value||"").trim(); }

/** Original campaign progress operations; no Native feature effects or clock scheduling. */
export function appendWorldGmEvent(db,guildId,e,scope,results){
      switch(e.type){
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
      }
}
