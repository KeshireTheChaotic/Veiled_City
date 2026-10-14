/** Discord publication boundary. Authoritative state is committed before these non-authoritative output operations run. */
import { AttachmentBuilder } from "discord.js";
import { handoutFiles, handoutSummary } from "./handout.js";
import { randomUUID,createHash } from "node:crypto";
import { splitDiscordText } from "./discord/chunking.js";
import { assertGmOnlyChannel, assertPlayerPrivateChannel } from "./discord/privacy.js";
import { simulationOverview, acknowledgeSimulationHook } from "./simulation.js";
import { deliverTurnOutbox, outboxSummary, notSent } from "./publication-outbox.js";
import { failureTrace } from "./failure-trace.js";
import {operationalMetrics} from './operational-metrics.js';
import { assertArchiveOutput, archivePvpHistory, assertPvpOutput, prepareStoredOutput, prepareNativeHookOutput,
  quarantineSimulationHook, quarantineGeneratedOutput, revalidateOutputPublication,substantivePreparedOutput } from "./pvp-output.js";
import {turnTraceFor} from './turn-trace-context.js';
import { queueDirectorPublications } from "./publication-outbox.js";
import {KeyedSerialQueue} from "./serial-queue.js";
const continuationDeliveryQueue=new KeyedSerialQueue();

/** Only never-attempted owner notices auto-deliver. Failed/uncertain delivery stays in reviewed recovery. */
export function publishContinuationNotices({db,guild,userId}){
  if(!guild||!userId)return Promise.resolve([]);
  return continuationDeliveryQueue.enqueue(`${guild.id}:${userId}`,async()=>{
    const results=[];
    for(const row of db.pendingContinuationTurns(guild.id,userId))
      results.push(await deliverQueuedTurn({db,guild,turnId:row.turn_id}));
    return results;
  });
}

/** Hooks remain queued on failed delivery and never publish internal action packets. */
export async function publishSimulationHooks({db,guild,sessionId=null}){
  let delivered=0;
  for(const hook of simulationOverview(db,guild.id).hooks){
    const session=db.getActiveSession(guild.id),recipient=hook.data.target_user_id,
      scope=recipient?{mode:"private",actorUserId:recipient,actorCharacterId:session&&db.activeAssignment(session.id,recipient)?.character_id}
        :{mode:"party",actorUserId:null,actorCharacterId:null};
    {
      let result;
      try{
        if(!session||recipient&&!db.roster(session.id).some(r=>r.discord_user_id===recipient&&["present","late","guest"].includes(r.presence)))
          throw Object.assign(new Error("Current hook audience required."),{code:"NARRATIVE_PVP"});
        try{result=prepareStoredOutput(db,guild.id,hook.data.content,scope);}catch(error){
          if(error.code!=='NARRATIVE_PVP')throw error;
          result=prepareNativeHookOutput(db,guild.id,hook,scope);
        }
      }catch(error){
        if(!["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION"].includes(error.code))throw error;
        quarantineSimulationHook(db,guild.id,hook);continue;
      }
      const turnId=queueDirectorPublications(db,{guild,session,result,scope,key:`simulation-hook:${hook.id}`});
      const delivery=await deliverQueuedTurn({db,guild,turnId});
      // The outbox distinguishes proven non-send from uncertainty. Never erase that receipt or blindly retry uncertainty.
      if(delivery.pending.length)continue;
      acknowledgeSimulationHook(db,guild.id,hook.id);delivered++;continue;
    }
  }
  return delivered;
}

const chunks = splitDiscordText;

async function textChannel(guild,id){
  if(!id) return null;
  try{
    const ch=await guild.channels.fetch(id);
    return ch?.isTextBased()?ch:null;
  }catch{return null;}
}

async function upsertBotMessage({db,guild,channelId,surface,key,content,beforeWrite}){
  const ch=await textChannel(guild,channelId);
  if(!ch) return null;
  const existing=db.getPublished(guild.id,surface,key);
  if(existing?.message_id && existing.channel_id===channelId){
    let message;
    try{
      message=await ch.messages.fetch(existing.message_id);
    }catch(error){
      if(error.code!==10008&&error.status!==404)throw error; // Only confirmed absence permits replacement.
    }
    if(message){
      beforeWrite?.();await message.edit(content.slice(0,1990));return message; // Uncertain edit never falls through to send.
    }
  }
  beforeWrite?.();
  const m=await ch.send(content.slice(0,1990));
  db.setPublished(guild.id,surface,key,channelId,m.id);
  return m;
}

function recordText(db,guild,kind,row){
  const ref=createHash('sha256').update(JSON.stringify([kind,row.id||row.entity_key])).digest('hex').slice(0,16);
  const candidate=kind==='thread'?row.notes:row.summary,scope={mode:'party',actorUserId:null,actorCharacterId:null};
  let body='Description pending source review.';
  if(candidate){
    try{prepareStoredOutput(db,guild,candidate,scope);body=candidate;}
    catch(error){
      if(error.code!=='NARRATIVE_PVP')throw error;
      quarantineGeneratedOutput(db,guild,'reference-publication',{kind,ref,candidate,label:row.label||row.display_name});
    }
  }
  const status=kind==='thread'&&['active','resolved','failed','dormant'].includes(row.status)?`\nRecord status: ${row.status}`:'';
  // Native record metadata is UI, not fiction or proof of any PC outcome. Unproven labels are not safe headings.
  return `**${kind==='thread'?'CASE THREAD':kind==='npc'?'NPC':'LOCATION'} RECORD — ${ref}**${status}\n${body}`;
}
function publishRecord({db,guild,channelId,surface,key,kind,row}){
  const content=recordText(db,guild.id,kind,row),beforeWrite=()=>{
    const current=kind==='thread'?db.getThread(guild.id,row.id):db.getReference(guild.id,kind,row.entity_key);
    if(!current||!['public','party'].includes(current.visibility)||recordText(db,guild.id,kind,current)!==content)
      throw Object.assign(new Error('Current source-bound reference output required.'),{code:'NARRATIVE_PVP'});
  };
  return upsertBotMessage({db,guild,channelId,surface,key,content,beforeWrite});
}

export async function publishEventResults({db,guild,results=[]}){
  const c=db.getCampaign(guild.id);
  for(const r of results){
    if(!r?.publish||!r.row) continue;
    if(r.type==="thread" && c?.case_board_channel_id){
      await publishRecord({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:r.row.id,kind:'thread',row:r.row});
    } else if(r.kind==="npc" && c?.known_npcs_channel_id){
      await publishRecord({db,guild,channelId:c.known_npcs_channel_id,surface:"npc",key:r.row.entity_key,kind:'npc',row:r.row});
    } else if(r.kind==="location" && c?.known_locations_channel_id){
      await publishRecord({db,guild,channelId:c.known_locations_channel_id,surface:"location",key:r.row.entity_key,kind:'location',row:r.row});
    }
  }
}

export async function publishJournal({db,guild,session,recap}){
  assertArchiveOutput(db,guild.id,recap,{sessionId:session.id});
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  const head=`## Session ${session.session_number}`;
  const parts=chunks(`${head}\n\n${recap}`);
  for(const p of parts){assertArchiveOutput(db,guild.id,recap,{sessionId:session.id});await ch.send(p);}
  return true;
}

export async function postJournalEntry({db,guild,title="Campaign Update",content="",nativeEncounterId=null}){
  assertArchiveOutput(db,guild.id,content);
  const encounter=nativeEncounterId&&db.getEncounter(nativeEncounterId);
  if(title!=="Campaign Update"
    &&!(encounter?.guild_id===guild.id&&title===`Encounter ${encounter.encounter_number} Aftermath`))
    throw Object.assign(new Error("PvP archive title requires a native source-bound projection."),{code:"NARRATIVE_PVP"});
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  for(const p of chunks(`## ${title}\n\n${content}`)){assertArchiveOutput(db,guild.id,content);await ch.send(p);}
  return true;
}

export async function postGmLog({db,guild,sessionId=null,title="GM Log",details=""}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.gm_log_channel_id);
  if(!ch) return false;
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch (err) { console.error("Unsafe GM log channel configuration", err); return false; }
  const text=`**${title}**${sessionId?` · session ${sessionId.slice(0,8)}`:""}\n${String(details||"")}`;
  for(const part of chunks(text))await ch.send(part);
  return true;
}

export async function postStateError({db,guild,error,context="runtime",sessionId=null,attempt=null}){
  const ref=randomUUID().slice(0,8);
  operationalMetrics.record('runtime_failure',{guildId:guild.id,status:'error',errorCode:error?.code});
  operationalMetrics.incident('runtime',{guildId:guild.id,reference:ref,code:error?.code});
  try{
    const diagnostic=error?.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?Object.fromEntries(
      ["category","actor","entity","action","source","source_ref","source_span","recovery","reason_code"].map(key=>[key,String(error.diagnostic[key]||"").slice(0,1000)])):null;
    const lifetime=error?.interaction_diagnostic?JSON.parse(JSON.stringify(error.interaction_diagnostic)):null;
    db.audit(guild.id,sessionId,"system","veilkeeper","state_error",{ref,context,error:String(error?.message||error),
      trace:failureTrace(error,attempt||{}),...(diagnostic?{diagnostic}:{}),...(lifetime?{interaction:lifetime}:{})});
  }catch{
    // Audit logging must never prevent the primary error from being reported to Discord.
  }
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.state_errors_channel_id);
  if(!ch) return ref;
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch (privacyErr) { console.error(`Unsafe state-errors channel; error ${ref} was not published`, privacyErr); return ref; }
  const stack=String(error?.stack||error?.message||error||"Unknown error").replace(/```/g,"''' ").slice(0,1450);
  const body=`**⚠️ Veilkeeper state/runtime error · ${ref}**\nContext: ${String(context).slice(0,250)}\n` + "```\n" + stack + "\n```";
  try{ await ch.send(body); }
  catch(sendErr){ console.error(`Could not publish state error ${ref}`,sendErr); }
  return ref;
}


export async function postPrivateRelay({db,guild,userId,title="Private delivery relay required",content,sessionId=null,context="private-delivery"}){
  const ref=randomUUID().slice(0,8);
  try{
    db.audit(guild.id,sessionId,"system","veilkeeper","private_delivery_relay",{ref,context,userId,title});
  }catch{
    // Relay auditing is best-effort; delivery can still proceed when the audit insert fails.
  }
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.state_errors_channel_id);
  if(!ch) return {ok:false,ref,via:"unavailable"};
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch { return {ok:false,ref,via:"unsafe_channel"}; }
  const header=`**⚠️ ${title} · ${ref}**\nTarget player: <@${userId}>\nContext: ${String(context).slice(0,250)}\n\n**ADMIN GM: relay the following sanitized player-facing package exactly as needed:**`;
  await ch.send(header.slice(0,1990));
  for(const part of chunks(content)) await ch.send(part);
  return {ok:true,ref,via:"state_errors"};
}

export async function syncConfiguredSurfaces({db,guild}){
  const c=db.getCampaign(guild.id);
  if(c?.case_board_channel_id){
    const rows=db.listPublicPartyThreads(guild.id);
    for(const row of rows) await publishRecord({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:row.id,kind:'thread',row});
  }
  for(const [kind,col] of [["npc","known_npcs_channel_id"],["location","known_locations_channel_id"]]){
    if(!c?.[col]) continue;
    for(const row of db.listReferences(guild.id,kind,{publicOnly:true})){
      await publishRecord({db,guild,channelId:c[col],surface:kind,key:row.entity_key,kind,row});
    }
  }
}


export async function postPlayMessage({db,guild,content,sessionId=null,authority=null,publication=null}){
  const scope={mode:"party",actorUserId:null,actorCharacterId:null},needsProof=!!db.getActiveSession(guild.id);
  let substantive=false;
  const check=()=>{
    if(publication){
      if(publication.visibility!=="party"||publication.target_user_id||content!==publication.payload)throw notSent("Exact party publication required.");
      revalidateOutputPublication(db,guild.id,publication);
    }else if(authority){
      const {result,scope:sourceScope}=authority;
      if(sourceScope?.mode!=="party"||content!==result.narration&&content!==`**Encounter Aftermath**\n${result.player_summary}`)
        throw Object.assign(new Error("Exact native output body required."),{code:"NARRATIVE_PVP"});
      assertPvpOutput(db,guild.id,result,sourceScope,{publication:true});
      substantive=substantivePreparedOutput(db,guild.id,result,sourceScope);
    }else if(needsProof)substantive=substantivePreparedOutput(db,guild.id,prepareStoredOutput(db,guild.id,content,scope),scope);
  };
  check();
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.play_channel_id);
  if(!ch)return {ok:false,via:"unavailable",certainty:"not_sent",messages:[]};
  const messages=[];
  for(const part of chunks(content)){
    check();
    const sent=await ch.send(part);
    turnTraceFor(guild.id)?.publication(substantive);
    messages.push({messageId:sent.id,channelId:sent.channelId||ch.id});
    if(sessionId) db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:"party",content:part});
  }
  return {ok:true,via:"play_channel",certainty:"acknowledged",messages,...messages.at(-1)};
}

/** Deliver committed narration without re-entering GM generation or native mechanics. */
export async function deliverQueuedTurn({db,guild,turnId,forceUncertain=false}){
  const attempt=db.getTurnAttempt(turnId);if(!attempt||attempt.guild_id!==guild.id)throw new Error("Turn receipt not found for this campaign.");
  const results=await deliverTurnOutbox(db,guild.id,turnId,async row=>{
    if(row.target_user_id){
      const delivered=await sendPlayerPrivate({db,guild,userId:row.target_user_id,content:row.payload,
        sessionId:attempt.session_id,characterId:row.target_character_id||null,beforeSend:()=>revalidateOutputPublication(db,guild.id,row)});
      if(!delivered.ok)throw Object.assign(new Error(`Private delivery unavailable (${delivered.via}).`),{deliveryCertainty:delivered.certainty});
      return delivered;
    }
    const ch=await textChannel(guild,row.channel_id||db.getCampaign(guild.id)?.play_channel_id);
    if(!ch)throw notSent("Configured publication channel is unavailable.");
    revalidateOutputPublication(db,guild.id,row);
    const message=await ch.send(row.payload);
    db.addMessage({guildId:guild.id,sessionId:attempt.session_id,userId:null,speakerName:"Veilkeeper",
      visibility:row.visibility,subjectUserId:row.visibility==="player"?row.target_user_id:null,
      subjectCharacterId:row.visibility==="character"?row.target_character_id:null,content:row.payload});
    return {messageId:message.id,channelId:ch.id};
  },{forceUncertain});
  const pending=db.listTurnPublications(guild.id,turnId).filter(row=>row.status!=="delivered");
  db.updateTurnAttempt(turnId,{stage:pending.length?"needs_recovery":"delivered",
    terminalCode:pending.length?"PUBLICATION_PENDING":null,errorRef:pending[0]?.last_failure||null});
  return {turn:db.getTurnAttempt(turnId),results:results.map(item=>({...item,row:outboxSummary(item.row)})),pending:pending.map(outboxSummary)};
}

export async function sendPlayerPrivate({db,guild,userId,content,sessionId=null,characterId=null,beforeSend=null,publication=null,
  recordMessage=true,allowedMentions=null,generated=false}){
  const messages=[];let attempted=false,via="unavailable",substantive=false;
  const check=()=>{
    if(generated){
      try{const scope={mode:'private',actorUserId:userId,actorCharacterId:characterId};
        substantive=substantivePreparedOutput(db,guild.id,prepareStoredOutput(db,guild.id,content,scope),scope);}
      catch(error){
        if(error.code!=='NARRATIVE_PVP')throw error;
        quarantineGeneratedOutput(db,guild.id,'direct-generated-private',{userId,characterId,content},sessionId);throw error;
      }
    }
    if(publication){
      if(publication.target_user_id!==userId||publication.target_character_id!==(characterId||null)||content!==publication.payload)
        throw notSent("Exact private publication recipient/body required.");
      revalidateOutputPublication(db,guild.id,publication);
    }
    beforeSend?.();
  };
  check(); // Generated candidates fail before any transport lookup, including between sessions.
  const send=async(target,route)=>{
    via=route;
    for(const part of chunks(content)){
      // Permission changes during an awaited send must not expose later private chunks.
      if(route==="private_channel")assertPlayerPrivateChannel({guild,channel:target,userId,gmRoleId:db.getCampaign(guild.id)?.gm_role_id||null});
      check();attempted=true;
      const sent=await target.send(allowedMentions?{content:part,allowedMentions}:part);messages.push({messageId:sent.id,channelId:sent.channelId||(route==="private_channel"?target.id:null)});
      if(generated)turnTraceFor(guild.id)?.publication(substantive);
    }
    if(sessionId&&recordMessage)db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:characterId?"character":"player",
      subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content});
    return {ok:true,via,certainty:"acknowledged",messages,...messages.at(-1)};
  };
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await textChannel(guild,p.private_channel_id);
      if(ch){
        const campaign=db.getCampaign(guild.id);
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        return await send(ch,"private_channel");
      }
    }catch(error){
      if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION"].includes(error.code))throw error;
      if(attempted)return {ok:false,via,certainty:"uncertain",messages,error:String(error?.message||error)};
      // Fallback is safe only before any send has been attempted, never after partial/ambiguous I/O.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    return await send(member,"dm");
  }catch(error){
    if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION"].includes(error.code))throw error;
    return {ok:false,via,certainty:attempted?"uncertain":"not_sent",messages,error:String(error?.message||error)};
  }
}


function handoutAttachments(handout,format="markdown"){
  return handoutFiles(handout,format).map(f=>new AttachmentBuilder(f.buffer,{name:f.name}));
}

export async function deliverHandout({db,guild,handout,format="markdown"}){
  if(!handout) return {ok:false,via:"missing"};
  const summary=handoutSummary(handout);
  const files=handoutAttachments(handout,format);
  const campaign=db.getCampaign(guild.id);
  if(["public","party"].includes(handout.visibility)){
    const ch=await textChannel(guild,campaign?.play_channel_id);
    if(!ch) return {ok:false,via:"unavailable"};
    await ch.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"play_channel"};
  }
  if(handout.visibility==="gm"){
    const ch=await textChannel(guild,campaign?.gm_log_channel_id);
    if(!ch) return {ok:false,via:"unavailable"};
    assertGmOnlyChannel({guild,channel:ch,gmRoleId:campaign?.gm_role_id||null});
    await ch.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"gm_log"};
  }
  let userId=handout.subject_user_id||null;
  if(!userId&&handout.subject_character_id){
    userId=db.getCharacter(handout.subject_character_id)?.owner_user_id||null;
  }
  if(!userId) return {ok:false,via:"unavailable"};
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await textChannel(guild,p.private_channel_id);
      if(ch){
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        await ch.send({content:summary.slice(0,1900),files});
        return {ok:true,via:"private_channel"};
      }
    }catch{
      // Invalid/deleted/unsafe private channels fall back to DM delivery.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    await member.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"dm"};
  }catch{
    const relay=await postPrivateRelay({db,guild,userId,title:`Evidence handout delivery failed — ${handout.title}`,content:summary,sessionId:handout.session_id,context:`handout:${handout.id}`});
    return relay.ok?relay:{ok:false,via:"unavailable",ref:relay.ref};
  }
}
