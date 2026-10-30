import {upsertBotMessage} from './frameworks/publication/public.js';
import {publicationKnowledgeDisclosure} from './frameworks/publication/public.js';
const {activeEvidence,factVisibleTo}=publicationKnowledgeDisclosure;
/** Discord publication boundary. Authoritative state is committed before these non-authoritative output operations run. */
import { AttachmentBuilder } from "discord.js";
import {publicationOpeningDelivery} from './frameworks/publication/public.js';
import { handoutFiles, handoutSummary } from "./handout.js";
import { randomUUID,createHash } from "node:crypto";
import {splitDiscordText as originalSplitDiscordText} from './discord/chunking.js';
import {publicationDiscordText} from './frameworks/publication/public.js';
publicationDiscordText.bind({splitDiscordText:originalSplitDiscordText});
const {splitDiscordText}=publicationDiscordText;
import {publicationDiscordChannels} from './frameworks/publication/public.js';
const {textChannel,assertGmOnlyChannel,assertPlayerPrivateChannel}=publicationDiscordChannels;
import {publicationWorldSimulation} from "./frameworks/publication/public.js";
const {simulationOverview,acknowledgeSimulationHook}=publicationWorldSimulation;
import { deliverTurnOutbox, outboxSummary, notSent } from "./publication-outbox.js";
const {failureTrace}=publicationOperations;
import {publicationTelemetrySource} from './operational-metrics.js';
import {publicationOperations} from './frameworks/publication/public.js';
publicationOperations.bind(publicationTelemetrySource);
const operationalMetrics=publicationOperations;
import { assertArchiveOutput, archivePvpHistory, assertPvpOutput, prepareStoredOutput, prepareNativeHookOutput,
  quarantineSimulationHook, quarantineGeneratedOutput, revalidateOutputPublication,substantivePreparedOutput } from "./pvp-output.js";
const {turnTraceFor}=publicationOperations;
import { queueDirectorPublications } from "./publication-outbox.js";
import {KeyedSerialQueue} from "./kernel/serial-queue.js";


import {lifecycleProjection} from './frameworks/publication/public.js';
import {publicationWorldEvents} from './frameworks/publication/public.js';
const {indexWorldEvent}=publicationWorldEvents;
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

export async function postJournalEntry({db,guild,title="Campaign Update",content="",nativeEncounterId=null,nativeLifecycleKey=null}){
  assertArchiveOutput(db,guild.id,content);
  const encounter=nativeEncounterId&&db.getEncounter(nativeEncounterId);
  const checkLifecycle=()=>{
    if(!nativeLifecycleKey)return false;
    const view=lifecycleProjection(db,guild.id,nativeLifecycleKey,{mode:'party',actorUserId:null,actorCharacterId:null});
    if(view.text!==content||view.title!==title)throw notSent('Exact native lifecycle title and body required.');
    return true;
  };
  if(title!=="Campaign Update"
    &&!(encounter?.guild_id===guild.id&&title===`Encounter ${encounter.encounter_number} Aftermath`)&&!checkLifecycle())
    throw Object.assign(new Error("PvP archive title requires a native source-bound projection."),{code:"NARRATIVE_PVP"});
  const c=db.getCampaign(guild.id);
  const ch=await textChannel(guild,c?.journal_channel_id);
  if(!ch) return false;
  for(const p of chunks(`## ${title}\n\n${content}`)){assertArchiveOutput(db,guild.id,content);checkLifecycle();await ch.send(p);}
  return true;
}

export {postGmLog} from './frameworks/publication/public.js';

export {postStateError} from './frameworks/publication/public.js';


import {postPrivateRelay} from './frameworks/publication/public.js';
export {postPrivateRelay};

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
export async function deliverQueuedTurn({db,guild,turnId,forceUncertain=false,beforeSend=null}){
  const attempt=db.getTurnAttempt(turnId);if(!attempt||attempt.guild_id!==guild.id)throw new Error("Turn receipt not found for this campaign.");
  const results=await deliverTurnOutbox(db,guild.id,turnId,async row=>{
    if(row.target_user_id){
      const delivered=await sendPlayerPrivate({db,guild,userId:row.target_user_id,content:row.payload,
        sessionId:attempt.session_id,characterId:row.target_character_id||null,beforeSend:()=>{
          revalidateOutputPublication(db,guild.id,row);beforeSend?.(row);
        }});
      if(!delivered.ok)throw Object.assign(new Error(`Private delivery unavailable (${delivered.via}).`),{deliveryCertainty:delivered.certainty});
      return delivered;
    }
    const ch=await textChannel(guild,row.channel_id||db.getCampaign(guild.id)?.play_channel_id);
    if(!ch)throw notSent("Configured publication channel is unavailable.");
    try{revalidateOutputPublication(db,guild.id,row);beforeSend?.(row);}
    catch(error){error.deliveryCertainty='not_sent';throw error;} // Native guard failed before channel.send.
    const message=await ch.send(row.payload);
    db.addMessage({guildId:guild.id,sessionId:attempt.session_id,userId:null,speakerName:"Veilkeeper",
      visibility:row.visibility,subjectUserId:row.visibility==="player"?row.target_user_id:null,
      subjectCharacterId:row.visibility==="character"?row.target_character_id:null,content:row.payload});
    return {messageId:message.id,channelId:ch.id};
  },{forceUncertain,beforeSend});
  const publicationIds=new Set(db.listTurnPublications(guild.id,turnId).map(row=>row.id));
  const leads=db.listCityRecords(guild.id,{kind:'narrative_delivery',includeGM:true,limit:500})
    .filter(job=>job.status==='acknowledged_to_audience'&&job.data.lead_thread&&job.data.publications.some(id=>publicationIds.has(id)))
    .map(job=>db.getThread(guild.id,job.data.lead_thread)).filter(Boolean)
    .map(row=>({type:'thread',row,publish:['party','public'].includes(row.visibility)}));
  if(leads.length)try{await publishEventResults({db,guild,results:leads});}
    catch(error){console.error('Narrative lead case-board publication failed',error);}
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
      if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION","NPC_PROXY_AUTHORITY"].includes(error.code))throw error;
      if(attempted)return {ok:false,via,certainty:"uncertain",messages,error:String(error?.message||error)};
      // Fallback is safe only before any send has been attempted, never after partial/ambiguous I/O.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    return await send(member,"dm");
  }catch(error){
    if(["NARRATIVE_PVP","CHARACTER_OBSERVATION","WORLD_OBSERVATION","NPC_PROXY_AUTHORITY"].includes(error.code))throw error;
    return {ok:false,via,certainty:attempted?"uncertain":"not_sent",messages,error:String(error?.message||error)};
  }
}


function handoutAttachments(handout,format="markdown"){
  return handoutFiles(handout,format).map(f=>new AttachmentBuilder(f.buffer,{name:f.name}));
}

export async function deliverHandout({db,guild,handout,format="markdown"}){
  if(!handout)return {ok:false,via:'missing'};
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),actual=db.getHandout(handout.id);
  if(!actual||actual.guild_id!==guild.id||digest(actual)!==digest(handout))
    throw Object.assign(notSent('Exact current native handout required.'),{code:'HANDOUT_AUTHORITY'});
  const key=`handout-delivery:${digest([actual,format])}`,prior=db.getCityRecord(guild.id,'handout_delivery',key);
  if(prior&&prior.status!=='not_sent')return prior.data.result||{ok:false,via:'held',certainty:'uncertain'};
  const source=indexWorldEvent(db,guild.id,{key:`${key}:source`,kind:'native_handout_delivery',title:'Native handout delivery attempt',
    source_id:'native:handout',visibility:'gm',session_id:handout.session_id,details:{handout:handout.id,revision:digest(actual)}},'native:handout');
  const save=(status,result)=>db.saveCityRecord(guild.id,{kind:'handout_delivery',key,status,visibility:'gm',source_event:source.event_key,
    data:{handout:handout.id,result}});
  save('sending',{ok:false,via:'held',certainty:'uncertain'});
  try{
    const result=await deliverHandoutNow({db,guild,handout,format});
    save(result.ok?'delivered':result.certainty==='uncertain'?'uncertain':'not_sent',result);return result;
  }catch(error){save('needs_review',{ok:false,via:'held',certainty:'uncertain'});throw error;}
}
async function deliverHandoutNow({db,guild,handout,format="markdown"}){
  if(!handout) return {ok:false,via:"missing"};
  if(!['markdown','json','docx','all'].includes(format))throw notSent('Supported native handout format required.');
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),initial=db.getHandout(handout.id);
  const reject=()=>{throw Object.assign(notSent('Handout source, visibility or recipient changed; refresh before delivery.'),{code:'HANDOUT_AUTHORITY',expected:true});};
  if(!initial||initial.guild_id!==guild.id||initial.status!=='active'||digest(initial)!==digest(handout))reject();
  const expected=digest(initial),character=initial.subject_character_id&&db.getCharacter(initial.subject_character_id),
    recipient=initial.subject_user_id||character?.owner_user_id||null;
  const check=()=>{
    const current=db.getHandout(initial.id);
    if(!current||current.status!=='active'||current.guild_id!==guild.id||digest(current)!==expected)reject();
    if(current.visibility==='character'){
      const pc=db.getCharacter(current.subject_character_id);
      if(pc?.guild_id!==guild.id||!pc.owner_user_id||pc.owner_user_id!==recipient
        ||current.subject_user_id&&current.subject_user_id!==pc.owner_user_id)reject();
    }else if(current.visibility==='player'){
      if(!recipient||current.subject_user_id!==recipient||!db.getPlayer(guild.id,recipient))reject();
    }else if(!['party','public','gm'].includes(current.visibility))reject();
    const scope=current.visibility==='gm'?{mode:'gm'}:current.visibility==='character'||current.visibility==='player'
      ?{mode:'private',actorUserId:recipient,actorCharacterId:current.subject_character_id||null}:{mode:'party'};
    for(const ref of current.metadata?.epistemic?.source_refs||[]){
      const row=db.getFact(guild.id,ref)||db.getWorldEvent(guild.id,String(ref).replace(/^event:/,''));
      if(!row||!activeEvidence(db,guild.id,ref)||current.visibility!=='gm'&&!factVisibleTo({...row,
        subject_character_id:row.subject_character_id||row.subject_key,subject_user_id:row.subject_user_id||row.subject_key},scope))reject();
    }
  };
  check();
  const summary=handoutSummary(handout);
  const files=handoutAttachments(handout,format);
  const campaign=db.getCampaign(guild.id);
  if(["public","party"].includes(handout.visibility)){
    const ch=await textChannel(guild,campaign?.play_channel_id);
    if(!ch) return {ok:false,via:"unavailable"};
    check();
    await ch.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"play_channel"};
  }
  if(handout.visibility==="gm"){
    const ch=await textChannel(guild,campaign?.gm_log_channel_id);
    if(!ch) return {ok:false,via:"unavailable"};
    assertGmOnlyChannel({guild,channel:ch,gmRoleId:campaign?.gm_role_id||null});
    check();
    await ch.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"gm_log"};
  }
  let userId=handout.subject_user_id||null;
  if(!userId&&handout.subject_character_id){
    userId=db.getCharacter(handout.subject_character_id)?.owner_user_id||null;
  }
  if(!userId) return {ok:false,via:"unavailable"};
  const p=db.getPlayer(guild.id,userId);
  let attempted=false;
  if(p?.private_channel_id){
    try{
      const ch=await textChannel(guild,p.private_channel_id);
      if(ch){
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        check();attempted=true;
        await ch.send({content:summary.slice(0,1900),files});
        return {ok:true,via:"private_channel"};
      }
    }catch(error){
      if(error.code==='HANDOUT_AUTHORITY')throw error;
      if(attempted)return {ok:false,via:'private_channel',certainty:'uncertain',error:String(error.message||error)};
      // Invalid/deleted/unsafe private channels fall back to DM delivery.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    check();attempted=true;
    await member.send({content:summary.slice(0,1900),files});
    return {ok:true,via:"dm"};
  }catch(error){
    if(error.code==='HANDOUT_AUTHORITY')throw error;
    if(attempted)return {ok:false,via:'dm',certainty:'uncertain',error:String(error.message||error)};
    const relay=await postPrivateRelay({db,guild,userId,title:`Evidence handout delivery failed — ${handout.title}`,content:summary,sessionId:handout.session_id,context:`handout:${handout.id}`,beforeSend:check});
    return relay.ok?relay:{ok:false,via:"unavailable",ref:relay.ref};
  }
}

publicationOpeningDelivery.bind({deliverQueuedTurn});
