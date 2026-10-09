/** Transactional narration outbox; Discord delivery is retryable and never reruns reasoning or mechanics. */
import { createHash } from "node:crypto";
import { splitDiscordText } from "./discord/chunking.js";

const digest=value=>createHash("sha256").update(String(value)).digest("hex");

function allowedPrivateTargets(db,session,scope){
  if(scope.mode==="private")return new Set([scope.actorUserId]);
  return new Set(db.roster(session.id).filter(row=>["present","late","guest"].includes(row.presence))
    .map(row=>row.discord_user_id).filter(Boolean));
}

/** Called inside the authoritative commit transaction. */
export function queueTurnPublications(db,{guild,session,result,scope,turnId,channelId=null}){
  if(!turnId)return [];
  const rows=[];let ordinal=0;
  const add=(surface,payload,options={})=>{
    for(const part of splitDiscordText(payload))rows.push(db.enqueuePublication(guild.id,{turnId,surface,ordinal:ordinal++,
      visibility:options.visibility||"party",targetUserId:options.targetUserId||null,
      targetCharacterId:options.targetCharacterId||null,channelId:options.channelId||null,payload:part,payloadHash:digest(part)}));
  };
  if(String(result.narration||"").trim())add(scope.mode==="private"?"private_scene":"party",result.narration,{
    visibility:scope.mode==="private"?(scope.actorCharacterId?"character":"player"):"party",
    targetUserId:scope.mode==="private"?scope.actorUserId:null,targetCharacterId:scope.actorCharacterId||null,
    channelId:channelId||db.getCampaign(guild.id)?.play_channel_id||null});
  const allowed=allowedPrivateTargets(db,session,scope);
  for(const message of result.private_messages||[]){
    if(!allowed.has(message.discord_user_id)||!String(message.content||"").trim())continue;
    const assignment=db.activeAssignment(session.id,message.discord_user_id);
    add(`private_user:${message.discord_user_id}`,`**Veilkeeper — private:**\n${message.content}`,{
      visibility:assignment?.character_id?"character":"player",targetUserId:message.discord_user_id,
      targetCharacterId:assignment?.character_id||null});
  }
  db.updateTurnAttempt(turnId,{publicationId:`publication:${turnId}`});
  return rows;
}

export function outboxSummary(row){
  return {id:row.id,turn_id:row.turn_id,surface:row.surface,ordinal:row.ordinal,visibility:row.visibility,
    status:row.status,attempts:row.attempt_count,discord_message_id:row.discord_message_id||null,
    uncertain:row.status==="uncertain",last_failure:row.last_failure||""};
}

/** Deliver pending/failed rows in order. `uncertain` rows require explicit operator force. */
export async function deliverTurnOutbox(db,guildId,turnId,transport,{forceUncertain=false}={}){
  db.markInterruptedPublicationsUncertain(guildId,turnId);
  const rows=db.listTurnPublications(guildId,turnId).filter(row=>["pending","failed"].includes(row.status)
    ||forceUncertain&&row.status==="uncertain");
  const results=[];
  for(const row of rows){
    db.updatePublication(row.id,{status:"delivering",attemptCount:row.attempt_count+1,lastFailure:""});
    try{
      const receipt=await transport(row);
      const delivered=db.updatePublication(row.id,{status:"delivered",discordMessageId:receipt?.messageId||null,
        channelId:receipt?.channelId||row.channel_id,lastFailure:""});
      results.push({ok:true,row:delivered});
    }catch(error){
      const failed=db.updatePublication(row.id,{status:"failed",lastFailure:String(error?.message||error).slice(0,1000)});
      results.push({ok:false,row:failed,error});break;
    }
  }
  return results;
}
