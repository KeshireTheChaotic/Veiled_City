/** Transactional narration outbox; Discord delivery is retryable and never reruns reasoning or mechanics. */
import { createHash } from "node:crypto";
import { splitDiscordText } from "./discord/chunking.js";
import { assertPvpOutput } from "./pvp-authorship.js";
import { bindOutputPublication, revalidateOutputPublication, captureOutputArchive, recordOutputArchive } from "./pvp-output.js";
import {KeyedSerialQueue} from "./serial-queue.js";
const deliveryQueues=new WeakMap();
function serialized(db,key,job){
  if(!deliveryQueues.has(db))deliveryQueues.set(db,new KeyedSerialQueue());
  return deliveryQueues.get(db).enqueue(key,job);
}
export function notSent(message){return Object.assign(new Error(message),{deliveryCertainty:"not_sent"});}

const digest=value=>createHash("sha256").update(String(value)).digest("hex");

function allowedPrivateTargets(db,session,scope){
  if(scope.mode==="private")return new Set([scope.actorUserId]);
  return new Set(db.roster(session.id).filter(row=>["present","late","guest"].includes(row.presence))
    .map(row=>row.discord_user_id).filter(Boolean));
}

/** Called inside the authoritative commit transaction. */
export function queueTurnPublications(db,{guild,session,result,scope,turnId,channelId=null}){
  assertPvpOutput(db,guild.id,result,scope);
  if(!turnId)return [];
  const rows=[];let ordinal=0;
  const add=(surface,payload,options={})=>{
    for(const part of splitDiscordText(payload)){
      const row=db.enqueuePublication(guild.id,{turnId,surface,ordinal:ordinal++,
      visibility:options.visibility||"party",targetUserId:options.targetUserId||null,
      targetCharacterId:options.targetCharacterId||null,channelId:options.channelId||null,payload:part,payloadHash:digest(part)});
      bindOutputPublication(db,guild.id,result,row,part);rows.push(row);
    }
  };
  if(String(result.narration||"").trim())add(scope.mode==="private"?"private_scene":"party",result.narration,{
    visibility:scope.mode==="private"?(scope.actorCharacterId?"character":"player"):"party",
    targetUserId:scope.mode==="private"?scope.actorUserId:null,targetCharacterId:scope.actorCharacterId||null,
    channelId:scope.mode==="private"?null:channelId||db.getCampaign(guild.id)?.play_channel_id||null});
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

/** Direct director adapters use the same persisted, revalidated publication path as ordinary turns. */
export function queueDirectorPublications(db,{guild,session,result,scope,key}){
  if(!key)throw new Error("Stable native director cycle/interaction key required.");
  return db.transaction(()=>{
    assertPvpOutput(db,guild.id,result,scope);
    if(!result.narration&&result.public_narration)result.narration=result.public_narration;
    const turn=db.beginTurnAttempt({guildId:guild.id,sessionId:session.id,messageId:`director:${digest(key)}`,
      actorPrincipal:scope.actorUserId||"__world_director__",audience:scope.mode});
    queueTurnPublications(db,{guild,session,result,scope,turnId:turn.turn_id});
    db.updateTurnAttempt(turn.turn_id,{stage:"committed",committed:"yes",nativeCommitId:`director:${key}`});
    return turn.turn_id;
  });
}

export function outboxSummary(row){
  return {id:row.id,turn_id:row.turn_id,surface:row.surface,ordinal:row.ordinal,visibility:row.visibility,
    status:row.status,attempts:row.attempt_count,discord_message_id:row.discord_message_id||null,
    uncertain:row.status==="uncertain",last_failure:row.last_failure||""};
}

/** Only demonstrably unsent rows retry. A later chunk cannot overtake an uncertain predecessor. */
export function deliverTurnOutbox(db,guildId,turnId,transport,{forceUncertain=false}={}){
  if(forceUncertain)throw new Error("Reconcile the exact uncertain publication before resending; blind force is disabled.");
  return serialized(db,`${guildId}:${turnId}`,async()=>{
  // Inside the lock no same-process sender is active. Startup also performs global recovery.
  db.markInterruptedPublicationsUncertain(guildId,turnId);
  const rows=db.listTurnPublications(guildId,turnId);
  const results=[];
  for(const row of rows){
    if(row.status==="delivered")continue;
    if(row.status==="failed"&&!row.last_failure.startsWith("NOT_SENT: ")){
      db.updatePublication(row.id,{status:"uncertain",lastFailure:"Legacy failed delivery has no proof of non-send; exact-part reconciliation required."});break;
    }
    if(!["pending","failed"].includes(row.status))break;
    db.updatePublication(row.id,{status:"delivering",attemptCount:row.attempt_count+1,lastFailure:""});
    let attempted=false;
    try{
      revalidateOutputPublication(db,guildId,row);
      const archive=captureOutputArchive(db,guildId,row);
      attempted=true;
      const receipt=await transport(row);
      if(!receipt||receipt.ok===false||!receipt.messageId||!receipt.channelId)
        throw Object.assign(new Error("Delivery needs an acknowledged Discord message/channel receipt."),
          {deliveryCertainty:receipt?.certainty||"uncertain"});
      const delivered=db.updatePublication(row.id,{status:"delivered",discordMessageId:receipt?.messageId||null,
        channelId:receipt?.channelId||row.channel_id,lastFailure:""});
      recordOutputArchive(db,guildId,delivered,archive);
      results.push({ok:true,row:delivered});
    }catch(error){
      const safe=!attempted||error.deliveryCertainty==="not_sent";
      const failed=db.updatePublication(row.id,{status:safe?"failed":"uncertain",
        lastFailure:`${safe?"NOT_SENT: ":""}${String(error?.message||error)}`.slice(0,1000)});
      results.push({ok:false,row:failed,error});break;
    }
  }
  return results;
  });
}

/** GM review changes delivery state only, never the source, payload, consent or mechanical receipts. */
export function reconcilePublication(db,guildId,id,{actor,gm=false,decision,reason,message=null}={}){
  const original=db.getPublication(guildId,id);
  if(!original)throw new Error("Exact publication required.");
  return serialized(db,`${guildId}:${original.turn_id}`,()=>db.transaction(()=>{
    const row=db.getPublication(guildId,id);
    if(!gm||!actor||!String(reason||"").trim()||row.status!=="uncertain")throw new Error("Authenticated GM and exact uncertain part review required.");
    revalidateOutputPublication(db,guildId,row);
    let after;
    if(decision==="delivered"){
      if(!message?.id||!message.channelId||message.author?.bot!==true||!message.verifiedBotId
        ||message.author.id!==message.verifiedBotId||message.content!==row.payload
        ||!row.target_user_id&&row.channel_id&&message.channelId!==row.channel_id
        ||row.target_user_id&&message.verifiedRecipient!==row.target_user_id)
        throw new Error("Fetch and verify the exact bot-authored Discord message and audience before reconciliation.");
      const archive=captureOutputArchive(db,guildId,row);
      after=db.updatePublication(id,{status:"delivered",discordMessageId:message.id,channelId:message.channelId,lastFailure:""});
      recordOutputArchive(db,guildId,after,archive);
    }else if(decision==="confirmed_not_sent")after=db.updatePublication(id,{status:"pending",lastFailure:"GM attested exact part was not sent."});
    else throw new Error("Use delivered or confirmed_not_sent.");
    db.recordMutation(guildId,{actorType:"human",actorId:actor,sourceLayer:"delivery_reconciliation",mutationType:decision,
      entityKey:id,visibility:"gm",confidence:100,rationale:String(reason).slice(0,1000),
      payload:{publication:id,turn:row.turn_id,payload_hash:row.payload_hash,message_id:message?.id||null,channel_id:message?.channelId||null}});
    return after;
  }));
}
