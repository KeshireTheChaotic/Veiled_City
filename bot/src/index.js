import "dotenv/config";
import path from "node:path";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { loadConfig } from "./config.js";
import { VeiledDB } from "./db.js";
import { ContentIndex } from "./content.js";
import { GMService } from "./gm.js";
import { handleCommand } from "./commands.js";
import { applyGMEvents } from "./state.js";
import { publishEventResults, postGmLog, postStateError } from "./publishing.js";

const config=loadConfig();
const db=new VeiledDB(config.dbPath,path.resolve(process.cwd(),"./sql/schema.sql"));
const content=new ContentIndex(config.contentRoot);
const gm=new GMService({db,content,config});

const client=new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages],
  partials:[Partials.Channel]
});

async function sendPrivate(guild,userId,text,sessionId=null,characterId=null){
  const p=db.getPlayer(guild.id,userId);
  if(p?.private_channel_id){
    try{
      const ch=await guild.channels.fetch(p.private_channel_id);
      if(ch?.isTextBased()){
        await ch.send(text);
        db.addMessage({guildId:guild.id,sessionId,userId:client.user.id,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content:text});
        return true;
      }
    }catch{}
  }
  try{
    const member=await guild.members.fetch(userId);
    await member.send(text);
    db.addMessage({guildId:guild.id,sessionId,userId:client.user.id,speakerName:"Veilkeeper",visibility:characterId?"character":"player",subjectUserId:characterId?null:userId,subjectCharacterId:characterId,content:text});
    return true;
  }catch{
    console.warn(`Could not deliver private GM message to ${userId}.`);
    return false;
  }
}

function splitDiscord(text){
  return String(text||"").match(/[\s\S]{1,1900}(?:\n|$)/g)||[String(text||"")];
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

client.once("ready",()=>{
  console.log(`Veilkeeper v3.1.3 logged in as ${client.user.tag}`);
  console.log(`Indexed ${content.chunks.length} Veiled City content chunks.`);
});

client.on("interactionCreate",async interaction=>{
  try{
    await handleCommand(interaction,{db,gm});
  }catch(err){
    console.error(err);
    if(interaction.guild) await postStateError({db,guild:interaction.guild,error:err,context:`interaction:${interaction.commandName||"unknown"}`,sessionId:db.getActiveSession(interaction.guildId)?.id||null});
    if(interaction.isRepliable()){
      if(interaction.deferred||interaction.replied) await interaction.editReply("An internal error occurred.");
      else await interaction.reply({content:"An internal error occurred.",ephemeral:true});
    }
  }
});

client.on("messageCreate",async message=>{
  if(!message.guild||message.author.bot) return;
  const campaign=db.getCampaign(message.guild.id);
  if(!campaign) return;
  const directMention=message.mentions.has(client.user);

  // v3.1 low-cost rules desk. This does not need an active session and cannot mutate campaign state.
  if(campaign.rules_channel_id && message.channel.id===campaign.rules_channel_id){
    if(!looksLikeRulesQuestion(message.content,directMention)) return;
    try{
      await message.channel.sendTyping();
      const s=db.getActiveSession(message.guild.id);
      const a=s?db.controlledAssignment(s.id,message.author.id):null;
      const cleaned=message.content.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
      const r=await gm.answerRulesQuestion({guildId:message.guild.id,userId:message.author.id,userName:message.member?.displayName||message.author.username,question:cleaned||message.content,characterId:a?.character_id||null});
      const src=r.sources?.length?`\n\n_Reference: ${r.sources.join(", ")}_`:"";
      await message.reply(`**Rules desk:** ${r.answer}${src}`);
      db.audit(message.guild.id,s?.id||null,"ai","rules", "rules_answer",{user:message.author.id,sources:r.sources});
    }catch(err){
      console.error("Rules desk failed",err);
      const ref=await postStateError({db,guild:message.guild,error:err,context:"rules-channel",sessionId:db.getActiveSession(message.guild.id)?.id||null});
      await message.reply(`⚠️ Rules desk error (${ref}). No campaign state was changed.`);
    }
    return;
  }

  // v3.1 two-way player-private scenes.
  const privateOwner=db.getPlayerByPrivateChannel(message.guild.id,message.channel.id);
  if(privateOwner && privateOwner.discord_user_id===message.author.id){
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
    db.addMessage({guildId:message.guild.id,sessionId:session.id,messageId:message.id,userId:message.author.id,speakerName:speaker,characterId:controlled?.character_id||null,visibility:vis,subjectUserId:vis==="player"?message.author.id:null,subjectCharacterId:vis==="character"?controlled.character_id:null,content:playerText});
    try{
      await message.channel.sendTyping();
      const cleaned=playerText.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
      const result=await gm.runTurn({guildId:message.guild.id,actorUserId:message.author.id,actorName:speaker,actorAssignment:controlled,messageText:cleaned||playerText,scope:"private"});
      if(!result.respond) return;
      const applied=applyGMEvents(db,message.guild.id,session.id,result.events,{mode:"private",actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null});
      if(result.narration?.trim()){
        for(const c of splitDiscord(result.narration)) await message.channel.send(c.trim());
        db.addMessage({guildId:message.guild.id,sessionId:session.id,userId:client.user.id,speakerName:"Veilkeeper",visibility:vis,subjectUserId:vis==="player"?message.author.id:null,subjectCharacterId:vis==="character"?controlled.character_id:null,content:result.narration});
      }
      for(const pm of result.private_messages||[]){
        if(!pm.discord_user_id||!pm.content?.trim()) continue;
        const targetA=db.activeAssignment(session.id,pm.discord_user_id);
        const targetNpc=db.npcProxyAssignments(session.id,pm.discord_user_id);
        const privateKnowledgeId=targetA?.character_id||(targetNpc.length===1?targetNpc[0].knowledge_id:null);
        await sendPrivate(message.guild,pm.discord_user_id,`**Veilkeeper — private:**\n${pm.content}`,session.id,privateKnowledgeId);
      }
      db.audit(message.guild.id,session.id,"ai","gm","private_turn",{actor:message.author.id,events:result.events});
      if(applied.length) await postGmLog({db,guild:message.guild,sessionId:session.id,title:"Private GM state update",details:`Actor: ${speaker}\nEvents: ${applied.map(x=>x.type).join(", ")}`});
    }catch(err){
      console.error("Private GM turn failed",err);
      const ref=await postStateError({db,guild:message.guild,error:err,context:`private-turn:${message.author.id}`,sessionId:session.id});
      await message.reply(`⚠️ Private GM engine error (${ref}). Your message was saved; no successful state mutation was assumed.`);
    }
    return;
  }

  // Main party table.
  if(!campaign.play_channel_id||message.channel.id!==campaign.play_channel_id) return;
  db.upsertPlayer(message.guild.id,message.author.id,message.member?.displayName||message.author.username);
  const session=db.getActiveSession(message.guild.id);
  if(!session) return;
  const {controlled,playerText,ambiguous,candidates}=resolveController(session,message);
  if(ambiguous){
    await message.reply(`You control multiple roles this session (${candidates.map(x=>x.name).join(", ")}). Prefix the message with the intended name, e.g. \`[${candidates[0].name}] ...\`.`);
    return;
  }
  const speaker=controlled?.name||message.member?.displayName||message.author.username;
  db.addMessage({guildId:message.guild.id,sessionId:session.id,messageId:message.id,userId:message.author.id,speakerName:speaker,characterId:controlled?.character_id||null,visibility:"party",content:playerText});

  let should=false;
  try{
    should=await gm.shouldRespond({guildId:message.guild.id,message,mode:campaign.response_mode||config.defaultResponseMode,directMention});
  }catch(err){
    console.error("router",err); should=directMention;
  }
  if(!should) return;

  try{
    await message.channel.sendTyping();
    const cleaned=playerText.replaceAll(`<@${client.user.id}>`,"").replaceAll(`<@!${client.user.id}>`,"").trim();
    const result=await gm.runTurn({guildId:message.guild.id,actorUserId:message.author.id,actorName:speaker,actorAssignment:controlled,messageText:cleaned||playerText,scope:"party"});
    if(!result.respond) return;
    const applied=applyGMEvents(db,message.guild.id,session.id,result.events,{mode:"party",actorUserId:message.author.id,actorCharacterId:controlled?.character_id||null});
    await publishEventResults({db,guild:message.guild,results:applied});
    if(result.narration?.trim()){
      for(const c of splitDiscord(result.narration)) await message.channel.send(c.trim());
      db.addMessage({guildId:message.guild.id,sessionId:session.id,userId:client.user.id,speakerName:"Veilkeeper",visibility:"party",content:result.narration});
    }
    for(const pm of result.private_messages||[]){
      if(!pm.discord_user_id||!pm.content?.trim()) continue;
      const targetA=db.activeAssignment(session.id,pm.discord_user_id);
      const targetNpc=db.npcProxyAssignments(session.id,pm.discord_user_id);
      const privateKnowledgeId=targetA?.character_id||(targetNpc.length===1?targetNpc[0].knowledge_id:null);
      await sendPrivate(message.guild,pm.discord_user_id,`**Veilkeeper — private:**\n${pm.content}`,session.id,privateKnowledgeId);
    }
    db.audit(message.guild.id,session.id,"ai","gm","turn",{actor:message.author.id,events:result.events});
    if(applied.length) await postGmLog({db,guild:message.guild,sessionId:session.id,title:"GM state update",details:`Actor: ${speaker}\nEvents: ${applied.map(x=>x.type).join(", ")}`});
  }catch(err){
    console.error("GM turn failed",err);
    const ref=await postStateError({db,guild:message.guild,error:err,context:`party-turn:${message.author.id}`,sessionId:session.id});
    if(directMention) await message.reply(`⚠️ The GM engine hit an API/runtime error (${ref}). Your message was saved; no successful state mutation was assumed.`);
  }
});

process.on("SIGINT",()=>{ db.close(); client.destroy(); process.exit(0); });
process.on("SIGTERM",()=>{ db.close(); client.destroy(); process.exit(0); });

await client.login(config.discordToken);
