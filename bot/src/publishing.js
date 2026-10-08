/** Discord publication boundary. Authoritative state is committed before these non-authoritative output operations run. */
import { AttachmentBuilder } from "discord.js";
import { handoutFiles, handoutSummary } from "./handout.js";
import { randomUUID } from "node:crypto";
import { splitDiscordText } from "./discord/chunking.js";
import { assertGmOnlyChannel, assertPlayerPrivateChannel } from "./discord/privacy.js";
import { simulationOverview, acknowledgeSimulationHook } from "./simulation.js";

/** Hooks remain queued on failed delivery and never publish internal action packets. */
export async function publishSimulationHooks({db,guild,sessionId=null}){
  let delivered=0;
  for(const hook of simulationOverview(db,guild.id).hooks){
    if(hook.data.target_user_id){
      if(!db.getPlayer(guild.id,hook.data.target_user_id)) continue;
      const result=await sendPlayerPrivate({db,guild,userId:hook.data.target_user_id,content:hook.data.content,sessionId});
      if(!result.ok) continue;
    }else{
      const message=await postPlayMessage({db,guild,sessionId,content:hook.data.content});
      if(!message) continue;
    }
    acknowledgeSimulationHook(db,guild.id,hook.id);
    delivered++;
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

async function upsertBotMessage({db,guild,channelId,surface,key,content}){
  const ch=await textChannel(guild,channelId);
  if(!ch) return null;
  const existing=db.getPublished(guild.id,surface,key);
  if(existing?.message_id && existing.channel_id===channelId){
    try{
      const m=await ch.messages.fetch(existing.message_id);
      await m.edit(content.slice(0,1990));
      return m;
    }catch{
      // The previously published Discord message may have been deleted; create a replacement below.
    }
  }
  const m=await ch.send(content.slice(0,1990));
  db.setPublished(guild.id,surface,key,channelId,m.id);
  return m;
}

function threadText(row){
  const icon={active:"🟡",resolved:"✅",failed:"❌",dormant:"⚪"}[row.status]||"•";
  return [`**${icon} CASE THREAD — ${row.label}**`,`Status: **${row.status}**`,row.notes||"No additional notes recorded."].join("\n");
}

function referenceText(kind,row){
  const label=kind==="npc"?"NPC":"LOCATION";
  return [`**${label} — ${row.display_name}**`,row.summary||"No player-safe summary recorded."].join("\n");
}

export async function publishEventResults({db,guild,results=[]}){
  const c=db.getCampaign(guild.id);
  for(const r of results){
    if(!r?.publish||!r.row) continue;
    if(r.type==="thread" && c?.case_board_channel_id){
      await upsertBotMessage({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:r.row.id,content:threadText(r.row)});
    } else if(r.kind==="npc" && c?.known_npcs_channel_id){
      await upsertBotMessage({db,guild,channelId:c.known_npcs_channel_id,surface:"npc",key:r.row.entity_key,content:referenceText("npc",r.row)});
    } else if(r.kind==="location" && c?.known_locations_channel_id){
      await upsertBotMessage({db,guild,channelId:c.known_locations_channel_id,surface:"location",key:r.row.entity_key,content:referenceText("location",r.row)});
    }
  }
}

export async function publishJournal({db,guild,session,recap}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  const head=`## Session ${session.session_number}${session.title?` — ${session.title}`:""}`;
  const parts=chunks(`${head}\n\n${recap}`);
  for(const p of parts) await ch.send(p);
  return true;
}

export async function postJournalEntry({db,guild,title="Campaign Update",content=""}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  for(const p of chunks(`## ${title}\n\n${content}`)) await ch.send(p);
  return true;
}

export async function postGmLog({db,guild,sessionId=null,title="GM Log",details=""}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.gm_log_channel_id);
  if(!ch) return false;
  try { assertGmOnlyChannel({guild,channel:ch,gmRoleId:c?.gm_role_id||null}); }
  catch (err) { console.error("Unsafe GM log channel configuration", err); return false; }
  const text=`**${title}**${sessionId?` · session ${sessionId.slice(0,8)}`:""}\n${String(details||"").slice(0,1800)}`;
  await ch.send(text);
  return true;
}

export async function postStateError({db,guild,error,context="runtime",sessionId=null}){
  const ref=randomUUID().slice(0,8);
  try{
    db.audit(guild.id,sessionId,"system","veilkeeper","state_error",{ref,context,error:String(error?.message||error)});
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
    for(const row of rows) await upsertBotMessage({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:row.id,content:threadText(row)});
  }
  for(const [kind,col] of [["npc","known_npcs_channel_id"],["location","known_locations_channel_id"]]){
    if(!c?.[col]) continue;
    for(const row of db.listReferences(guild.id,kind,{publicOnly:true})){
      await upsertBotMessage({db,guild,channelId:c[col],surface:kind,key:row.entity_key,content:referenceText(kind,row)});
    }
  }
}


export async function postPlayMessage({db,guild,content,sessionId=null}){
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.play_channel_id);
  if(!ch) return null;
  let last=null;
  for(const part of chunks(content)){
    last=await ch.send(part);
    if(sessionId) db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:"party",content:part});
  }
  return last;
}

export async function sendPlayerPrivate({db,guild,userId,content,sessionId=null,characterId=null}){
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await textChannel(guild,p.private_channel_id);
      if(ch){
        const campaign=db.getCampaign(guild.id);
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        for(const part of chunks(content)) await ch.send(part);
        if(sessionId) db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content});
        return {ok:true,via:"private_channel"};
      }
    }catch{
      // Fall through to DM when a configured private channel was deleted or is no longer writable.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    for(const part of chunks(content)) await member.send(part);
    if(sessionId) db.addMessage({guildId:guild.id,sessionId,userId:null,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content});
    return {ok:true,via:"dm"};
  }catch{
    return {ok:false,via:"unavailable"};
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
