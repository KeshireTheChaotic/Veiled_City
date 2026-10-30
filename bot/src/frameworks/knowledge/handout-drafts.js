import {artifactProvenance,inferredSource} from './presentation-evidence-service.js';

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
