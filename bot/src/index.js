/** Discord runtime orchestration for message routing, serialized GM turns, world-director passes, and post-commit publication. */
import "dotenv/config";
import path from "node:path";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { loadConfig } from "./config.js";
import { VeiledDB } from "./db.js";
import { ContentIndex } from "./content.js";
import { GMService } from "./gm.js";
import { handleCommand } from "./commands.js";
import { applyAuthoritativeMutation, applyCanonProposalDrafts } from "./state.js";
import { routeDiscoveryMessage } from "./continuity-routing.js";
import { captureArcCandidate } from "./personal-continuity.js";
import { publishEventResults, postGmLog, postStateError, deliverHandout, postPlayMessage } from "./publishing.js";
import { VoiceNarrator } from "./voice.js";
import { KeyedSerialQueue } from "./serial-queue.js";
import { queueDirectorAfterPartyTurn, blockedMutationRows, describeBlockedAction, lowConfidenceReviewItems, normalizeDirectorConfidence } from "./director.js";
import { splitDiscordText } from "./discord/chunking.js";
import { assertPlayerPrivateChannel } from "./discord/privacy.js";
import { createLogger } from "./logger.js";
import { runNpcDirector } from "./simulation.js";
import { publishSimulationHooks } from "./publishing.js";

const config=loadConfig();
const log=createLogger(config.logLevel);
const db=new VeiledDB(config.dbPath,path.resolve(process.cwd(),"./sql/schema.sql"));
const content=new ContentIndex(config.contentRoot);
const gm=new GMService({db,content,config});
const voice=new VoiceNarrator(config,{db});
const gmTurnQueue=new KeyedSerialQueue();

const client=new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages,GatewayIntentBits.GuildVoiceStates],
  partials:[Partials.Channel]
});

async function sendPrivate(guild,userId,text,sessionId=null,characterId=null){
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await guild.channels.fetch(p.private_channel_id);
      if(ch?.isTextBased()){
        const campaign=db.getCampaign(guild.id);
        assertPlayerPrivateChannel({guild,channel:ch,userId,gmRoleId:campaign?.gm_role_id||null});
        for(const part of splitDiscordText(text)) await ch.send(part);
        db.addMessage({guildId:guild.id,sessionId,userId:client.user.id,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content:text});
        return true;
      }
    }catch{
      // Missing or unsafe registered channels fall back to direct-message delivery.
    }
  }
  try{
    const member=await guild.members.fetch(userId);
    await member.send(text);
    db.addMessage({guildId:guild.id,sessionId,userId:client.user.id,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content:text});
    return true;
  }catch{
    log.warn(`Could not deliver private GM message to ${userId}.`);
    return false;
  }
}


function looksLikeRulesQuestion(text,directMention=false){
  if(directMention) return true;
  const t=String(text||"").trim();
  return /\?$/.test(t) || /^(how|what|when|where|why|can|could|do|does|did|is|are|would|should|which|who)\b/i.test(t) || /\b(rule|rules|mechanic|roll|hope|fear|stress|armor|domain|card|daggerheart)\b/i.test(t);
}

function resolveController(session,message){
  const own=db.activeAssignment(session.id,message.author.id);
  const proxies=db.proxyAssignments(session.id,message.author.id);
  const npcProxies=db.npcProxyAssignments(session.id,message.author.id);
  const candidates=[...(own?[own]:[]),...proxies,...npcProxies];
  let controlled=own ?? (candidates.length===1?candidates[0]:null);
  let playerText=message.content;
  let explicitlySelected=false;
  const prefix=playerText.match(/^\s*(?:\[([^\]]+)\]|([^:]{1,80})):?[\s]+([\s\S]*)$/);
  if(prefix){
    const requested=(prefix[1]||prefix[2]||"").trim().toLowerCase();
    const match=candidates.find(a=>a.name?.toLowerCase()===requested);
    if(match){ controlled=match; playerText=prefix[3].trim(); explicitlySelected=true; }
  }
  return {controlled,playerText,ambiguous:!controlled&&candidates.length>1,candidates,explicitlySelected};
}

async function safeStateError({guild,error,context,sessionId}){
  try{return await postStateError({db,guild,error,context,sessionId});}
  catch(logErr){log.error("Could not post state error",logErr); return "unlogged";}
}

async function outputStep(errors,{guild,sessionId,context},fn){
  try{return await fn();}
  catch(err){
    log.error(`Post-commit output failed: ${context}`,err);
    const ref=await safeStateError({guild,error:err,context,sessionId});
    errors.push({context,ref,error:err});
    return null;
  }
}

function allowedPrivateMessages(session,resultMessages,scope){
  const activePresence=new Set(["present","guest","late"]);
  const rosterUsers=new Set(db.roster(session.id).filter(r=>activePresence.has(r.presence)).map(r=>r.discord_user_id).filter(Boolean));
  const allowed=scope.mode==="private"?new Set([scope.actorUserId]):rosterUsers;
  const deliver=[];
  const blocked=[];
  for(const pm of resultMessages||[]){
    if(!pm?.discord_user_id||!pm.content?.trim()) continue;
    if(allowed.has(pm.discord_user_id)) deliver.push(pm);
    else blocked.push(pm);
  }
  return {deliver,blocked};
}

async function notifyBlockedActions({guild,session,actorUserId=null,actorCharacterId=null,rows=[],context="GM turn"}){
  if(!rows.length) return;
  const descriptions=rows.map(describeBlockedAction);
  const playerLines=[...new Set(descriptions.map(x=>x.player).filter(Boolean))];
  let playerNoticeDelivered=true;
  if(actorUserId&&playerLines.length){
    playerNoticeDelivered=await sendPrivate(guild,actorUserId,`**⚠️ Veilkeeper scope guard**\n${playerLines.map(x=>`• ${x}`).join("\n")}`,session?.id||null,actorCharacterId||null).catch(()=>false);
  }
  const gmLines=[...new Set(descriptions.map(x=>x.gm).filter(Boolean))];
  if(actorUserId&&playerLines.length&&!playerNoticeDelivered) gmLines.push(`⚠️ The required private blocked-action notice could not be delivered to Discord user ${actorUserId}; check that player's private channel/DM permissions.`);
  const posted=await postGmLog({db,guild,sessionId:session?.id||null,title:`Blocked Veilkeeper action — ${context}`,details:gmLines.map(x=>`• ${x}`).join("\n")});
  if(!posted){
    await safeStateError({guild,error:new Error(`Blocked Veilkeeper action(s): ${gmLines.join(" | ")}`),context:`blocked-action:${context}`,sessionId:session?.id||null});
  }
  db.audit(guild.id,session?.id||null,"system","veilkeeper","blocked_actions",{context,count:rows.length,details:gmLines});
}

async function runPendingDirectorPass(guild,session){
  const pending=db.getPendingDirectorPass(session.id);
  if(!pending) return {ran:false};
  if(db.isDirectorPaused(guild.id)) return {ran:false,paused:true,pending:true};
  let result;
  try{
    await runNpcDirector({db,gm,guildId:guild.id,layer:pending.layer,
      cycleKey:`${session.id}:${pending.layer}:${pending.queued_at||pending.round_number||pending.scene_label}`,
      query:pending.reason||pending.scene_label||""});
    await publishSimulationHooks({db,guild,sessionId:session.id});
    result=normalizeDirectorConfidence(await gm.runWorldDirector({guildId:guild.id,layer:pending.layer,trigger:pending}));
    const hasOutputs=(result.events||[]).length||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length||(result.private_messages||[]).length||String(result.public_narration||"").trim();
    if(!result.act&&hasOutputs) throw new Error("World director returned act=false with non-empty outputs.");
  }catch(err){
    log.error(`World director ${pending.layer} generation failed`,err);
    await safeStateError({guild,error:err,context:`world-director-${pending.layer}-generation`,sessionId:session.id});
    db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:pending.layer,trigger:pending,acted:false,rationale:"Director generation failed; pass remains pending.",status:"failed",error:String(err.message||err)});
    return {ran:true,ok:false,pending:true};
  }

  let mutation={events:[],relationships:[],handouts:[]};
  if(result.act){
    const mutates=(result.events||[]).some(e=>e.type!=="log_only")||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length;
    if(mutates) db.snapshotCampaign(guild.id,{label:`Pre-world-director ${pending.layer}`,reason:`Automatic snapshot before ${pending.layer} director pass`,createdBy:"veilkeeper"});
    try{
      mutation=applyAuthoritativeMutation(db,{narrative:result,guildId:guild.id,sessionId:session.id,events:result.events||[],relationships:result.relationships||[],handouts:result.handouts||[],npcMemories:result.npc_memories||[],npcKnowledge:result.npc_knowledge||[],npcGoals:result.npc_goals||[],simulationUpdates:result.simulation_updates||[],scope:{mode:"party",actorUserId:null,actorCharacterId:null},source:`world_director_${pending.layer}`,provenance:{actorType:"ai",actorId:"world_director",triggerText:pending.reason||"",rationale:result.gm_notes||"",confidence:result.confidence??100}});
    }catch(err){
      console.error(`World director ${pending.layer} state mutation rolled back`,err);
      await safeStateError({guild,error:err,context:`world-director-${pending.layer}-state`,sessionId:session.id});
      db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:pending.layer,trigger:pending,acted:!!result.act,rationale:result.gm_notes||"",publicNarration:result.public_narration||"",status:"failed",error:String(err.message||err)});
      return {ran:true,ok:false,pending:true};
    }
  }

  db.completeDirectorPass(session.id,pending.layer,{sceneLabel:pending.scene_label||null});
  const outputErrors=[];
  const blocked=blockedMutationRows(mutation);
  if(blocked.length) await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-blocked`},()=>notifyBlockedActions({guild,session,rows:blocked,context:`world director/${pending.layer}`}));
  await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-publish`},()=>publishEventResults({db,guild,results:mutation.events||[]}));
  for(const r of (mutation.events||[]).filter(x=>x.type==="canon"&&x.status==="conflict")) await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-canon-conflict`},()=>postStateError({db,guild,error:new Error(`Canon conflict ${r.conflict_id} requires GM resolution`),context:`world-director-${pending.layer}-canon-conflict`,sessionId:session.id}));
  for(const h of (mutation.handouts||[]).filter(x=>x.ok)) await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-handout:${h.row.id}`},()=>deliverHandout({db,guild,handout:h.row,format:"markdown"}));
  if(String(result.public_narration||"").trim()) await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-narration`},()=>postPlayMessage({db,guild,sessionId:session.id,content:result.public_narration}));
  const pms=allowedPrivateMessages(session,result.private_messages||[],{mode:"party"});
  for(const pm of pms.deliver){
    const a=db.activeAssignment(session.id,pm.discord_user_id);
    await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-private:${pm.discord_user_id}`},()=>sendPrivate(guild,pm.discord_user_id,`**Veilkeeper — private world movement:**\n${pm.content}`,session.id,a?.character_id||null));
  }
  if(pms.blocked.length){
    await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-private-blocked`},()=>notifyBlockedActions({guild,session,rows:pms.blocked.map(x=>({type:"private_message",error:"World-director private message targeted a user outside the active session roster."})),context:`world director/${pending.layer}`}));
  }
  await outputStep(outputErrors,{guild,sessionId:session.id,context:`world-director-${pending.layer}-gm-log`},()=>postGmLog({db,guild,sessionId:session.id,title:`World Director — ${pending.layer}`,details:`${result.gm_notes||"No GM note."}\nEvents: ${(mutation.events||[]).filter(x=>x.ok).map(x=>x.type).join(", ")||"none"}\nRelationships: ${(mutation.relationships||[]).filter(x=>x.ok).length}\nHandouts: ${(mutation.handouts||[]).filter(x=>x.ok).length}`}));
  db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:pending.layer,trigger:pending,acted:!!result.act,rationale:result.gm_notes||"",publicNarration:result.public_narration||"",mutationSummary:{events:(mutation.events||[]).filter(x=>x.ok).length,relationships:(mutation.relationships||[]).filter(x=>x.ok).length,handouts:(mutation.handouts||[]).filter(x=>x.ok).length,npc_memories:(mutation.npcMemories||[]).filter(x=>x.ok).length,npc_knowledge:(mutation.npcKnowledge||[]).filter(x=>x.ok).length,npc_goals:(mutation.npcGoals||[]).filter(x=>x.ok).length},status:"completed"});
  db.audit(guild.id,session.id,"ai","world_director",`director_${pending.layer}`,{pending,result:{act:result.act,gm_notes:result.gm_notes},output_errors:outputErrors.map(x=>x.ref)});
  return {ran:true,ok:true,outputErrors};
}

async function runPrivateSceneDirector({guild,session,actorUserId,actorCharacterId,actorAssignment=null,sceneReview}){
  if(sceneReview?.decision!=="transition") return {ran:false};
  if(db.isDirectorPaused(guild.id)){
    db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:"scene",trigger:{scope:"private",actor_user_id:actorUserId,scene_label:sceneReview.label},acted:false,rationale:"Private scene-transition director skipped because the World Director is paused.",status:"skipped"});
    return {ran:false,paused:true};
  }
  let result;
  try{
    result=normalizeDirectorConfidence(await gm.runWorldDirector({guildId:guild.id,layer:"scene",trigger:{scope:"private",actor_user_id:actorUserId,actor_character_id:actorCharacterId||null,scene_label:sceneReview.label,reason:sceneReview.reason},actorAssignment}));
    const hasOutputs=(result.events||[]).length||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length||(result.private_messages||[]).length||String(result.public_narration||"").trim();
    if(!result.act&&hasOutputs) throw new Error("Private scene director returned act=false with non-empty outputs.");
  }catch(err){
    await safeStateError({guild,error:err,context:"world-director-private-scene-generation",sessionId:session.id});
    db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:"scene",trigger:{scope:"private",actor_user_id:actorUserId,scene_label:sceneReview.label},acted:false,rationale:"Private scene director generation failed.",status:"failed",error:String(err.message||err)});
    return {ran:true,ok:false};
  }
  const scope={mode:"private",actorUserId,actorCharacterId:actorCharacterId||null};
  let mutation={events:[],relationships:[],handouts:[]};
  if(result.act){
    const mutates=(result.events||[]).some(e=>e.type!=="log_only")||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length;
    if(mutates) db.snapshotCampaign(guild.id,{label:"Pre-private scene director",reason:`Automatic snapshot before private scene transition to ${sceneReview.label}`,createdBy:"veilkeeper"});
    try{
      mutation=applyAuthoritativeMutation(db,{narrative:result,guildId:guild.id,sessionId:session.id,events:result.events||[],relationships:result.relationships||[],handouts:result.handouts||[],npcMemories:result.npc_memories||[],npcKnowledge:result.npc_knowledge||[],npcGoals:result.npc_goals||[],simulationUpdates:result.simulation_updates||[],scope,source:"world_director_scene_private",provenance:{actorType:"ai",actorId:"world_director",triggerText:sceneReview.reason||"",rationale:result.gm_notes||"",confidence:result.confidence??100}});
    }catch(err){
      await safeStateError({guild,error:err,context:"world-director-private-scene-state",sessionId:session.id});
      db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:"scene",trigger:{scope:"private",actor_user_id:actorUserId,scene_label:sceneReview.label},acted:!!result.act,rationale:result.gm_notes||"",status:"failed",error:String(err.message||err)});
      return {ran:true,ok:false};
    }
  }
  // Private scene transitions are intentionally not written into the party director's scene label/cadence.
  // Doing so could let private location/context influence a later public round pass.
  const outputErrors=[];
  const blocked=blockedMutationRows(mutation);
  if(blocked.length) await outputStep(outputErrors,{guild,sessionId:session.id,context:"private-scene-director-blocked"},()=>notifyBlockedActions({guild,session,actorUserId,actorCharacterId,rows:blocked,context:"private scene director"}));
  for(const h of (mutation.handouts||[]).filter(x=>x.ok)) await outputStep(outputErrors,{guild,sessionId:session.id,context:`private-scene-director-handout:${h.row.id}`},()=>deliverHandout({db,guild,handout:h.row,format:"markdown"}));
  if(String(result.public_narration||"").trim()) await outputStep(outputErrors,{guild,sessionId:session.id,context:"private-scene-director-narration"},()=>sendPrivate(guild,actorUserId,`**Veilkeeper — scene transition:**\n${result.public_narration}`,session.id,actorCharacterId||null));
  const pms=allowedPrivateMessages(session,result.private_messages||[],scope);
  if(pms.blocked.length) await outputStep(outputErrors,{guild,sessionId:session.id,context:"private-scene-director-message-blocked"},()=>notifyBlockedActions({guild,session,actorUserId,actorCharacterId,rows:pms.blocked.map(()=>({type:"private_message",error:"Private scene director attempted to message another player."})),context:"private scene director message scope"}));
  for(const pm of pms.deliver) await outputStep(outputErrors,{guild,sessionId:session.id,context:"private-scene-director-private"},()=>sendPrivate(guild,pm.discord_user_id,`**Veilkeeper — private world movement:**\n${pm.content}`,session.id,actorCharacterId||null));
  await outputStep(outputErrors,{guild,sessionId:session.id,context:"private-scene-director-gm-log"},()=>postGmLog({db,guild,sessionId:session.id,title:"World Director — private scene transition",details:`Scene: ${sceneReview.label}\n${result.gm_notes||"No GM note."}\nEvents: ${(mutation.events||[]).filter(x=>x.ok).map(x=>x.type).join(", ")||"none"}`}));
  db.recordDirectorHistory(guild.id,{sessionId:session.id,layer:"scene",trigger:{scope:"private",actor_user_id:actorUserId,scene_label:sceneReview.label,reason:sceneReview.reason},acted:!!result.act,rationale:result.gm_notes||"",publicNarration:result.public_narration||"",mutationSummary:{events:(mutation.events||[]).filter(x=>x.ok).length,relationships:(mutation.relationships||[]).filter(x=>x.ok).length,handouts:(mutation.handouts||[]).filter(x=>x.ok).length,npc_memories:(mutation.npcMemories||[]).filter(x=>x.ok).length,npc_knowledge:(mutation.npcKnowledge||[]).filter(x=>x.ok).length,npc_goals:(mutation.npcGoals||[]).filter(x=>x.ok).length},status:"completed"});
  db.audit(guild.id,session.id,"ai","world_director","director_scene_private",{actor:actorUserId,scene:sceneReview,result:{act:result.act,gm_notes:result.gm_notes}});
  return {ran:true,ok:true};
}

function commitTurnMutation({guild,session,result,scope,speaker,label,meta={}}){
  const mutates=(result.events||[]).some(e=>e.type!=="log_only")||(result.relationships||[]).length||(result.handouts||[]).length||(result.npc_memories||[]).length||(result.npc_knowledge||[]).length||(result.npc_goals||[]).length||(result.simulation_updates||[]).length;
  if(mutates) db.snapshotCampaign(guild.id,{label,reason:`Automatic snapshot before eventful GM turn by ${speaker}`,createdBy:"veilkeeper"});
  return db.transaction(()=>{
    const mutation=applyAuthoritativeMutation(db,{
      guildId:guild.id,
      sessionId:session.id,
      narrative:result,
      events:result.events||[],
      relationships:result.relationships||[],
      handouts:result.handouts||[],
      npcMemories:result.npc_memories||[],
      npcKnowledge:result.npc_knowledge||[],
      npcGoals:result.npc_goals||[],simulationUpdates:result.simulation_updates||[],
      scope,
      source:"ai_gm",
      provenance:{actorType:"ai",actorId:scope.actorUserId||"veilkeeper",messageId:meta.messageId||null,triggerText:meta.triggerText||"",rationale:Object.values(result.state_review||{}).filter(x=>x&&x.reason).map(x=>x.reason).join(" | "),confidence:Math.min(...Object.values(result.state_review||{}).filter(x=>x&&Number.isFinite(Number(x.confidence))).map(x=>Number(x.confidence)),100)}
    });
    const proposalMap=new Map();
    const addProposal=(d)=>{
      const key=String(d?.key||"").trim().toLowerCase();
      const value=String(d?.value||"").trim();
      if(!key||!value) return;
      const id=`${key}\u0000${value}`;
      if(!proposalMap.has(id)) proposalMap.set(id,{key,value,visibility:d.visibility||"party",reason:d.reason||""});
    };
    for(const d of result.canon_proposals||[]) addProposal(d);
    if(scope.mode==="private"){
      for(const r of mutation.events||[]){
        if(r?.blocked&&r.type==="canon"&&r.event?.key&&String(r.event?.value||"").trim()){
          addProposal({key:r.event.key,value:r.event.value,visibility:["public","party","gm"].includes(String(r.event.visibility||"").toLowerCase())?r.event.visibility:"party",reason:r.event.note||"Converted from a blocked private-scene canon attempt."});
        }
      }
    }
    const canonProposals=applyCanonProposalDrafts(db,guild.id,session.id,[...proposalMap.values()],scope,meta);
    for(const r of mutation.events||[]){
      if(!(r?.blocked&&r.type==="canon"&&r.event?.key)) continue;
      const key=String(r.event.key||"").trim().toLowerCase();
      const value=String(r.event.value||"").trim();
      const p=canonProposals.find(x=>x?.ok&&x.row?.canon_key===key&&x.row?.proposed_value===value);
      if(p){ r.proposal_id=p.row.id; r.proposal_status=p.row.status; }
    }
    return {...mutation,canonProposals};
  });
}

async function notifyCanonProposals({guild,session,message,actorUserId,actorCharacterId,speaker,rows=[]}){
  const proposals=[...new Map((rows||[]).filter(x=>x?.ok&&x.row).map(x=>[x.row.id,x])).values()];
  if(!proposals.length) return {count:0,gmFailures:[]};
  const gmFailures=[];
  for(const p of proposals){
    const row=p.row;
    const details=[
      `Player: <@${actorUserId}>`,
      `Character: ${speaker||row.character_name||actorCharacterId||"unknown"}`,
      `Proposal ID: \`${row.id.slice(0,8)}\``,
      `Status: ${String(row.status||"pending").toUpperCase()}`,
      `Key: \`${row.canon_key}\``,
      `Proposed canon: ${row.proposed_value}`,
      `Requested visibility: ${row.proposed_visibility}`,
      row.reason?`Reason: ${row.reason}`:null,
      `Source: private player→GM scene${row.source_channel_id?` in <#${row.source_channel_id}>`:""}${row.source_message_id?` · message ${row.source_message_id}`:""}`
    ].filter(Boolean).join("\n");
    let posted=false;
    try{ posted=await postGmLog({db,guild,sessionId:session?.id||null,title:"Player canon proposal",details}); }
    catch{
      // A failed GM-log publication must not roll back the durable proposal; state-error fallback handles notice.
    }
    if(!posted){
      const ref=await safeStateError({guild,error:new Error(`Player canon proposal ${row.id}: ${row.canon_key} = ${row.proposed_value}`),context:"player-canon-proposal-gm-log",sessionId:session?.id||null});
      gmFailures.push({id:row.id,ref});
    }
    db.audit(guild.id,session?.id||null,"player",actorUserId,"canon_proposal",{proposal_id:row.id,character_id:actorCharacterId||null,status:row.status,key:row.canon_key,source:"player_private_scene"});
  }
  const lines=proposals.map(p=>{
    const row=p.row;
    const status=String(row.status||"pending").toLowerCase();
    const statusText=status==="pending"?"Pending human GM review":status==="conflict"?"Awaiting GM conflict resolution":status==="accepted"?"Already accepted":status==="rejected"?"Previously rejected":status;
    return `• \`${row.id.slice(0,8)}\` \`${row.canon_key}\` → ${row.proposed_value}\n  Status: **${statusText}**`;
  });
  const warning=gmFailures.length?`\n\n⚠️ The proposal is safely stored in \`/vc-canon proposals\`, but the configured GM-log notification could not be delivered. A state-error reference was recorded: ${gmFailures.map(x=>x.ref).join(", ")}.`:"";
  const text=`**📜 Canon proposal ${proposals.length===1?"recorded":"records updated"}**\n${lines.join("\n")}\n\nThis did **not** change campaign canon.${warning}`;
  for(const c of splitDiscordText(text)) await message.channel.send(c);
  db.addMessage({guildId:guild.id,sessionId:session?.id||null,userId:client.user.id,speakerName:"Veilkeeper",visibility:actorCharacterId?"character":"player",subjectUserId:actorCharacterId?null:actorUserId,subjectCharacterId:actorCharacterId||null,content:text});
  return {count:proposals.length,gmFailures};
}

async function processPrivateTurn(message,directMention){
  const session=db.getActiveSession(message.guild.id);
  if(!session){
    if(directMention) await message.reply("No session is active. Private scene messages are processed during an active session.");
    return;
  }
  const {controlled,playerText,ambiguous,candidates}=resolveController(session,message);
  if(ambiguous){
    await message.reply(`You control multiple roles this session (${candidates.map(x=>x.name).join(", ")}). Prefix the message with the intended name, e.g. \`[${candidates[0].name}] ...\`.`);
    return;
  }
  const speaker=controlled?.name||message.member?.displayName||message.author.username;
  const vis=controlled?.character_id?"character":"player";
  captureArcCandidate(db,message.guild.id,message.author.id,controlled?.npc_proxy?null:controlled?.character_id,message.id,playerText);
  db.addMessage({guildId:message.guild.id,sessionId:session.id,messageId:message.id,userId:message.author.id,speakerName:speaker,characterId:controlled?.character_id||null,visibility:vis,subjectUserId:vis==="player"?message.author.id:null,subjectCharacterId:vis==="character"?controlled.character_id:null,content:playerText});

  let result;
  try{
    await message.channel.sendTyping();
    const cleaned=playerText.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
    result=await gm.runTurn({guildId:message.guild.id,actorUserId:message.author.id,actorName:speaker,actorAssignment:controlled,messageText:cleaned||playerText,scope:"private"});
    if(!result.respond) return;
  }catch(err){
    console.error("Private GM generation failed",err);
    const ref=await safeStateError({guild:message.guild,error:err,context:`private-turn-generation:${message.author.id}`,sessionId:session.id});
    await message.reply(`⚠️ Private GM engine error (${ref}). Your message was saved and no campaign state was committed; retrying is safe.`).catch(()=>{});
    return;
  }

  const scope={mode:"private",actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null};
  let mutation;
  try{
    mutation=commitTurnMutation({guild:message.guild,session,result,scope,speaker,label:"Pre-private GM mutation",meta:{channelId:message.channel.id,messageId:message.id,triggerText:playerText}});
  }catch(err){
    console.error("Private GM state mutation rolled back",err);
    const ref=await safeStateError({guild:message.guild,error:err,context:`private-turn-state:${message.author.id}`,sessionId:session.id});
    await message.reply(`⚠️ Private GM state update was rejected and rolled back (${ref}). Your message is saved; no generated consequences were committed, so retrying is safe.`).catch(()=>{});
    return;
  }

  const {events:applied,relationships:relApplied,handouts:handApplied,canonProposals=[]}=mutation;
  const outputErrors=[];
  const blockedState=blockedMutationRows(mutation);
  if(blockedState.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-blocked-state"},()=>notifyBlockedActions({guild:message.guild,session,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,rows:blockedState,context:"private turn"}));
  if(canonProposals.some(x=>x.ok)) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-canon-proposal"},()=>notifyCanonProposals({guild:message.guild,session,message,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,speaker,rows:canonProposals}));
  for(const h of handApplied.filter(x=>x.ok)) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:`private-handout:${h.row.id}`},()=>deliverHandout({db,guild:message.guild,handout:h.row,format:"markdown"}));
  for(const r of applied.filter(x=>x.type==="canon"&&x.status==="conflict")) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"canon-conflict-private"},()=>postStateError({db,guild:message.guild,error:new Error(`Canon conflict ${r.conflict_id} requires GM resolution`),context:"canon-conflict-private",sessionId:session.id}));
  if(result.narration?.trim()){
    const sent=await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-narration"},async()=>{
      for(const c of splitDiscordText(result.narration)) await message.channel.send(c);
      db.addMessage({guildId:message.guild.id,sessionId:session.id,userId:client.user.id,speakerName:"Veilkeeper",visibility:vis,subjectUserId:vis==="player"?message.author.id:null,subjectCharacterId:vis==="character"?controlled.character_id:null,content:result.narration});
      return true;
    });
    if(!sent) console.warn("Private narration delivery failed after state commit.");
  }
  const privateMessages=allowedPrivateMessages(session,result.private_messages,scope);
  if(privateMessages.blocked.length){
    await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-message-scope-block"},async()=>{
      db.audit(message.guild.id,session.id,"system","veilkeeper","blocked_private_message_targets",{actor:message.author.id,targets:privateMessages.blocked.map(x=>x.discord_user_id)});
      await notifyBlockedActions({guild:message.guild,session,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,rows:privateMessages.blocked.map(x=>({type:"private_message",error:"Private GM output attempted to target a different player from a private scene."})),context:"private message scope"});
    });
  }
  for(const pm of privateMessages.deliver){
    const targetA=db.activeAssignment(session.id,pm.discord_user_id);
    const targetNpc=db.npcProxyAssignments(session.id,pm.discord_user_id);
    const privateKnowledgeId=targetA?.character_id||(targetNpc.length===1?targetNpc[0].knowledge_id:null);
    await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:`private-message:${pm.discord_user_id}`},()=>sendPrivate(message.guild,pm.discord_user_id,`**Veilkeeper — private:**\n${pm.content}`,session.id,privateKnowledgeId));
  }
  await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-turn-audit"},async()=>db.audit(message.guild.id,session.id,"ai","gm","private_turn",{actor:message.author.id,events:result.events,state_review:result.state_review}));
  const lowConfidence=lowConfidenceReviewItems(result);
  if(lowConfidence.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-low-confidence-review"},()=>postGmLog({db,guild:message.guild,sessionId:session.id,title:"Private AI state review — GM attention",details:`Actor: ${speaker}\nPossible consequences deliberately **not committed** because confidence was below 55%:\n${lowConfidence.map(x=>`• ${x.category} (${x.confidence}%): ${x.reason}`).join("\n")}`}));
  if(applied.length||relApplied.length||handApplied.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"private-gm-log"},()=>postGmLog({db,guild:message.guild,sessionId:session.id,title:"Private GM state update",details:`Actor: ${speaker}\nEvents: ${applied.filter(x=>x.ok).map(x=>x.type).join(", ")||"none"}\nRelationships: ${relApplied.filter(x=>x.ok).length}\nHandouts: ${handApplied.filter(x=>x.ok).length}\nCanon proposals: ${canonProposals.filter(x=>x.ok).length}\nScene: ${result.state_review.scene.decision}${result.state_review.scene.label?` → ${result.state_review.scene.label}`:""}`}));
  if(result.state_review.scene.decision==="transition") await runPrivateSceneDirector({guild:message.guild,session,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,actorAssignment:controlled,sceneReview:result.state_review.scene});
  if(outputErrors.length) await message.reply(`⚠️ This private turn's campaign state **was committed**, but ${outputErrors.length} Discord delivery/logging step(s) failed. Do not retry the turn to repair delivery; ask a GM to resend or resync the affected output. References: ${outputErrors.map(x=>x.ref).join(", ")}`).catch(()=>{});
}

async function processPartyTurn(message,directMention){
  const campaign=db.getCampaign(message.guild.id);
  if(!campaign?.play_channel_id||message.channel.id!==campaign.play_channel_id) return;
  db.upsertPlayer(message.guild.id,message.author.id,message.member?.displayName||message.author.username);
  const session=db.getActiveSession(message.guild.id);
  if(!session) return;
  const pendingAtTurnStart=db.getPendingDirectorPass(session.id);
  if(pendingAtTurnStart) await runPendingDirectorPass(message.guild,session);
  const pendingTokenAtTurnStart=pendingAtTurnStart?`${pendingAtTurnStart.layer}:${pendingAtTurnStart.queued_at||""}:${pendingAtTurnStart.scene_label||""}:${pendingAtTurnStart.round_number||""}`:null;
  const {controlled,playerText,ambiguous,candidates}=resolveController(session,message);
  if(ambiguous){
    await message.reply(`You control multiple roles this session (${candidates.map(x=>x.name).join(", ")}). Prefix the message with the intended name, e.g. \`[${candidates[0].name}] ...\`.`);
    return;
  }
  const speaker=controlled?.name||message.member?.displayName||message.author.username;
  captureArcCandidate(db,message.guild.id,message.author.id,controlled?.npc_proxy?null:controlled?.character_id,message.id,playerText);
  db.addMessage({guildId:message.guild.id,sessionId:session.id,messageId:message.id,userId:message.author.id,speakerName:speaker,characterId:controlled?.character_id||null,visibility:"party",content:playerText});

  let should=false;
  try{
    should=await gm.shouldRespond({guildId:message.guild.id,message,mode:campaign.response_mode||config.defaultResponseMode,directMention});
  }catch(err){
    console.error("router",err); should=directMention;
  }
  if(!should) return;

  let result;
  try{
    await message.channel.sendTyping();
    const cleaned=playerText.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
    result=await gm.runTurn({guildId:message.guild.id,actorUserId:message.author.id,actorName:speaker,actorAssignment:controlled,messageText:cleaned||playerText,scope:"party"});
    if(!result.respond) return;
  }catch(err){
    console.error("GM turn generation failed",err);
    const ref=await safeStateError({guild:message.guild,error:err,context:`party-turn-generation:${message.author.id}`,sessionId:session.id});
    if(directMention) await message.reply(`⚠️ The GM engine hit an API/runtime error (${ref}). Your message was saved and no generated campaign state was committed; retrying is safe.`).catch(()=>{});
    return;
  }

  const scope={mode:"party",actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null};
  let mutation;
  try{
    mutation=commitTurnMutation({guild:message.guild,session,result,scope,speaker,label:"Pre-GM mutation",meta:{messageId:message.id,triggerText:playerText}});
  }catch(err){
    console.error("GM state mutation rolled back",err);
    const ref=await safeStateError({guild:message.guild,error:err,context:`party-turn-state:${message.author.id}`,sessionId:session.id});
    if(directMention) await message.reply(`⚠️ The generated GM state update was rejected and rolled back (${ref}). Your message is saved; no generated consequences were committed, so retrying is safe.`).catch(()=>{});
    return;
  }

  const {events:applied,relationships:relApplied,handouts:handApplied}=mutation;
  const outputErrors=[];
  const blockedState=blockedMutationRows(mutation);
  if(blockedState.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-blocked-state"},()=>notifyBlockedActions({guild:message.guild,session,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,rows:blockedState,context:"party turn"}));
  await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-event-publish"},()=>publishEventResults({db,guild:message.guild,results:applied}));
  for(const h of handApplied.filter(x=>x.ok)) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:`party-handout:${h.row.id}`},()=>deliverHandout({db,guild:message.guild,handout:h.row,format:"markdown"}));
  for(const r of applied.filter(x=>x.type==="canon"&&x.status==="conflict")) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"canon-conflict-party"},()=>postStateError({db,guild:message.guild,error:new Error(`Canon conflict ${r.conflict_id} requires GM resolution`),context:"canon-conflict-party",sessionId:session.id}));
  if(result.narration?.trim()){
    await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-narration"},async()=>{
      for(const c of splitDiscordText(result.narration)) await message.channel.send(c);
      db.addMessage({guildId:message.guild.id,sessionId:session.id,userId:client.user.id,speakerName:"Veilkeeper",visibility:"party",content:result.narration});
    });
    voice.narrate(message.guild,result.narration).then(r=>{
      if(!r.ok&&r.reason==="queue_full") console.warn(`Voice narration queue full in guild ${message.guild.id}; narration was not synthesized.`);
    }).catch(async err=>{
      console.error("Voice narration failed",err);
      await safeStateError({guild:message.guild,error:err,context:"voice-narration",sessionId:session.id});
    });
  }
  const privateMessages=allowedPrivateMessages(session,result.private_messages,scope);
  if(privateMessages.blocked.length){
    await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-private-message-scope-block"},async()=>{
      db.audit(message.guild.id,session.id,"system","veilkeeper","blocked_private_message_targets",{actor:message.author.id,targets:privateMessages.blocked.map(x=>x.discord_user_id)});
      await notifyBlockedActions({guild:message.guild,session,actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null,rows:privateMessages.blocked.map(x=>({type:"private_message",error:"Party-turn private output targeted a user outside the active session roster."})),context:"party private-message scope"});
    });
  }
  for(const pm of privateMessages.deliver){
    const targetA=db.activeAssignment(session.id,pm.discord_user_id);
    const targetNpc=db.npcProxyAssignments(session.id,pm.discord_user_id);
    const privateKnowledgeId=targetA?.character_id||(targetNpc.length===1?targetNpc[0].knowledge_id:null);
    await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:`party-private-message:${pm.discord_user_id}`},()=>sendPrivate(message.guild,pm.discord_user_id,`**Veilkeeper — private:**\n${pm.content}`,session.id,privateKnowledgeId));
  }
  await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-turn-audit"},async()=>db.audit(message.guild.id,session.id,"ai","gm","turn",{actor:message.author.id,events:result.events,state_review:result.state_review}));
  const lowConfidence=lowConfidenceReviewItems(result);
  if(lowConfidence.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-low-confidence-review"},()=>postGmLog({db,guild:message.guild,sessionId:session.id,title:"AI state review — GM attention",details:`Actor: ${speaker}\nThe following possible consequences were deliberately **not committed** because confidence was below 55%:\n${lowConfidence.map(x=>`• ${x.category} (${x.confidence}%): ${x.reason}`).join("\n")}`}));
  if(applied.length||relApplied.length||handApplied.length) await outputStep(outputErrors,{guild:message.guild,sessionId:session.id,context:"party-gm-log"},()=>postGmLog({db,guild:message.guild,sessionId:session.id,title:"GM state update",details:`Actor: ${speaker}\nEvents: ${applied.filter(x=>x.ok).map(x=>x.type).join(", ")||"none"}\nRelationships: ${relApplied.filter(x=>x.ok).length}\nHandouts: ${handApplied.filter(x=>x.ok).length}\nScene: ${result.state_review.scene.decision}${result.state_review.scene.label?` → ${result.state_review.scene.label}`:""}`}));
  const queued=queueDirectorAfterPartyTurn(db,session,message.author.id,result.state_review);
  const queuedToken=queued?`${queued.layer}:${queued.queued_at||""}:${queued.scene_label||""}:${queued.round_number||""}`:null;
  // Do not immediately charge/retry the exact same failed pending pass twice during one player message.
  // A newly queued/replaced pass still runs immediately; a failed pre-existing pass remains durable for a later turn.
  if(queued&&queuedToken!==pendingTokenAtTurnStart) await runPendingDirectorPass(message.guild,session);
  if(outputErrors.length) await message.reply(`⚠️ This turn's campaign state **was committed**, but ${outputErrors.length} Discord delivery/logging step(s) failed. Do not retry the turn to repair delivery; ask a GM to resend or run the relevant sync. References: ${outputErrors.map(x=>x.ref).join(", ")}`).catch(()=>{});
}

client.once("ready",()=>{
  console.log(`Veilkeeper v3.5.5 logged in as ${client.user.tag}`);
  console.log(`Voice narration: ${config.voiceEnabled?`enabled (${config.voiceName}/${config.voiceModel})`:"disabled"}.`);
  console.log(`Indexed ${content.chunks.length} Veiled City content chunks.`);
});

client.on("interactionCreate",async interaction=>{
  try{
    await handleCommand(interaction,{db,gm,voice});
  }catch(err){
    console.error(err);
    if(interaction.guild) await safeStateError({guild:interaction.guild,error:err,context:`interaction:${interaction.commandName||"unknown"}`,sessionId:db.getActiveSession(interaction.guildId)?.id||null});
    if(interaction.isRepliable()){
      if(interaction.deferred||interaction.replied) await interaction.editReply("An internal error occurred.").catch(()=>{});
      else await interaction.reply({content:"An internal error occurred.",ephemeral:true}).catch(()=>{});
    }
  }
});

client.on("messageCreate",async message=>{
  if(!message.guild||message.author.bot) return;
  const campaign=db.getCampaign(message.guild.id);
  if(!campaign) return;
  const directMention=message.mentions.has(client.user);
  const continuityOwner=db.getPlayerByPrivateChannel(message.guild.id,message.channel.id);
  if(message.channel.id===campaign.play_channel_id||continuityOwner?.discord_user_id===message.author.id){
    if(await routeDiscoveryMessage({db,message,deliver:async text=>{
      try{await message.author.send(text);}catch{await message.reply("Private knowledge delivery failed. Use /vc-intel discover; no campaign state was changed.");}
    }})) return;
  }

  // Low-cost rules desk is read-only with respect to campaign state and does not need the GM turn queue.
  if(campaign.rules_channel_id && message.channel.id===campaign.rules_channel_id){
    if(!looksLikeRulesQuestion(message.content,directMention)) return;
    try{
      await message.channel.sendTyping();
      const s=db.getActiveSession(message.guild.id);
      const a=s?db.controlledAssignment(s.id,message.author.id):null;
      const cleaned=message.content.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
      const r=await gm.answerRulesQuestion({guildId:message.guild.id,userId:message.author.id,userName:message.member?.displayName||message.author.username,question:cleaned||message.content,characterId:a?.character_id||null});
      const src=r.sources?.length?`\n\n_Reference: ${r.sources.join(", ")}_`:"";
      const basis=r.basis?`\n**Basis:** ${r.basis}`:"";
      await message.reply(`**Rules desk — ${r.classification}:** ${r.answer}${basis}${src}`.slice(0,1950));
      db.audit(message.guild.id,s?.id||null,"ai","rules","rules_answer",{user:message.author.id,sources:r.sources});
    }catch(err){
      console.error("Rules desk failed",err);
      const ref=await safeStateError({guild:message.guild,error:err,context:"rules-channel",sessionId:db.getActiveSession(message.guild.id)?.id||null});
      await message.reply(`⚠️ Rules desk error (${ref}). No campaign state was changed.`).catch(()=>{});
    }
    return;
  }

  const privateOwner=db.getPlayerByPrivateChannel(message.guild.id,message.channel.id);
  if(privateOwner && privateOwner.discord_user_id===message.author.id){
    await gmTurnQueue.enqueue(`guild:${message.guild.id}`,()=>processPrivateTurn(message,directMention)).catch(async error=>{
      log.error("Private turn failed",error);
      await safeStateError({guild:message.guild,error,context:"private-turn"});
    });
    return;
  }

  if(campaign.play_channel_id&&message.channel.id===campaign.play_channel_id){
    await gmTurnQueue.enqueue(`guild:${message.guild.id}`,()=>processPartyTurn(message,directMention)).catch(async error=>{
      log.error("Party turn failed",error);
      await safeStateError({guild:message.guild,error,context:"party-turn"});
    });
  }
});

process.on("SIGINT",()=>{ voice.destroy(); db.close(); client.destroy(); process.exit(0); });
process.on("SIGTERM",()=>{ voice.destroy(); db.close(); client.destroy(); process.exit(0); });

await client.login(config.discordToken);
