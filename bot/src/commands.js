/** Discord command schema and interaction dispatcher. Authorization and privacy checks belong at command boundaries; persistence belongs in VeiledDB. */
import {
  PermissionFlagsBits,
  AttachmentBuilder
} from "discord.js";
import { dualityRoll, parseDice } from "./dice.js";
import { establishFact } from "./epistemic.js";
import { indexWorldEvent } from "./city-calendar.js";
import { prepareRollRequest, pendingRollRequests, ownedRollRequest, formatRollRequest, publishRollAmendment } from "./roll-requests.js";
import { contributeRoll, adjudicateRollSource, applyRollOutcome } from "./roll-collaboration.js";
import { publishJournal, postJournalEntry, publishEventResults, postGmLog, postStateError, postPrivateRelay, syncConfiguredSurfaces, postPlayMessage, sendPlayerPrivate, deliverHandout, deliverQueuedTurn } from "./publishing.js";
import { EncounterLibrary, livePcRoster, partyTier, baseBattlePoints, DIFFICULTY_ADJUSTMENTS, autoBuildComposition, recomputeBudget, battlePointCost, HEAVY_ROLES, defaultObjective, manageWorldEncounter, recordWorldEncounterOutcome, validateWorldEncounterActivation, worldCombatantDrafts, bindWorldCombatants } from "./encounter.js";
import { prepareLevelup, applyLevelupToData, legalAdvancements, tierAchievement } from "./character-system.js";
import { buildCombatants, hpMarksForDamage, combatantLine } from "./combat.js";
import { applyAuthoritativeMutation } from "./state.js";
import { manageEvidence, evidenceView } from "./evidence-custody.js";
import { organizationRequest, organizationInbox } from "./owned-community.js";
import { normalizeDirectorConfidence } from "./director.js";
import { createPlayerExportFiles, createGmExportFiles } from "./character-export.js";
import { handoutFiles, handoutSummary } from "./handout.js";
import { createConceptContextPackage } from "./concept-context.js";
import { normalizeNarrativeMarkdown, narrativeRelativePath, createNarrativeExportPackage } from "./character-narrative.js";
import { buildSessionRosterReport, chunkRosterReport } from "./roster.js";
import { chunkDiscordLines } from "./discord/chunking.js";
import { assertGmOnlyChannel, assertPlayerPrivateChannel } from "./discord/privacy.js";
import { isExpectedError, PermissionError, NotFoundError, StateConflictError } from "./errors.js";
import { replayReceiptIfPresent, installReceiptCapture, isMutatingCommand } from "./idempotency.js";
import { runCampaignDiagnostics, formatDiagnostics } from "./operations/diagnostics.js";
import { buildGmOverview, formatGmOverview } from "./operations/overview.js";
import { seedData } from "./seed-data.js";
import { handleSeedCommand } from "./seed-commands.js";
import { KeyedSerialQueue } from "./serial-queue.js";
import { prepareNpcDirector, commitNpcDirector } from "./simulation.js";
import { publishSimulationHooks } from "./publishing.js";
import { handleSimulationCommand } from "./simulation-commands.js";
import { handleCityCommand } from "./city-commands.js";
import { handleStoryCommand } from "./story-commands.js";
import { recordCharacterArrival } from "./scene-continuity.js";
import { personalArc, discoverPersonal, personalInbox } from "./personal-continuity.js";
import { consentOffers } from "./consent-language.js";
import { sessionBrief, formatSessionBrief } from "./session-briefs.js";
import { formatDiscovery } from "./continuity-routing.js";
import { manageLongProject, projectPhaseRevision } from "./long-projects.js";
import { stateRevision } from "./ai-intents.js";
import { beginInteraction, acknowledgeRules, interactionFailure, interactionResponseExpired, replyOrEdit } from "./discord/interaction-lifecycle.js";
import { validateChannelRouting } from "./routing-diagnostics.js";

const interactionQueue=new KeyedSerialQueue();

export { buildCommands } from "./command-definitions.js";

function json(c){ return c?.data ?? {}; }
function exportAttachments(files){
  return files.map(f=>new AttachmentBuilder(f.buffer,{name:f.name}));
}

function findOwnedAnyCharacter(db,guildId,userId,query){
  const rows=db.listCharacters(guildId,userId,{includeClosed:true});
  const q=String(query||"").trim().toLowerCase();
  if(!q) return rows.find(c=>["active","reserve","guest"].includes(c.status)) ?? rows[0] ?? null;
  return rows.find(c=>c.name.toLowerCase()===q) ?? rows.find(c=>c.name.toLowerCase().includes(q)) ?? null;
}

function formatSheet(c){
  if(!c) return "No character found.";
  const d=json(c), r=d.resources||{};
  const domains=(d.domains||[]).join(", ")||"—";
  return [
    `**${c.name}** — ${d.class||"Class unset"}${d.subclass?` (${d.subclass})`:""}`,
    `${d.ancestry||"Ancestry unset"} • ${d.community||"Community unset"} • Level ${d.level||1}`,
    `Domains: ${domains}`,
    `HP ${r.hp?.current??"?"}/${r.hp?.max??"?"} • Stress ${r.stress?.current??"?"}/${r.stress?.max??6} • Hope ${r.hope??"?"} • Armor ${r.armor?.current??"?"}/${r.armor?.max??"?"}`,
    d.experiences?.length?`Experiences: ${d.experiences.map(e=>typeof e==="string"?e:`${e.name}${e.modifier!=null?` +${e.modifier}`:""}`).join("; ")}`:"",
    `Status: ${c.status}${c.is_guest?" (guest)":""}`
  ].filter(Boolean).join("\n");
}

async function ensurePlayer(db,interaction){
  return db.upsertPlayer(interaction.guildId,interaction.user.id,interaction.member?.displayName||interaction.user.username);
}
function isGM(db,interaction){
  if(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  const c=db.getCampaign(interaction.guildId);
  return !!(c?.gm_role_id && interaction.member?.roles?.cache?.has(c.gm_role_id));
}
function requireSession(db,guildId){
  const s=db.getActiveSession(guildId);
  if(!s) throw new NotFoundError("No active session.");
  return s;
}
function findGuest(db,guildId,name,userId){ return db.findGuestCharacter(guildId,name,userId); }

function presentRoster(db,sessionId){
  return db.roster(sessionId).filter(r=>["present","guest","late"].includes(r.presence) && r.character_id);
}

function encounterSummary(e){
  if(!e) return "No planned or active encounter.";
  const mods=(e.adjustments||[]).map(x=>`${x.delta>=0?"+":""}${x.delta} ${x.label}`).join("; ")||"none";
  const comp=(e.composition||[]).map(x=>{
    const qty=x.type==="Minion"?`${x.quantity} group(s) / ${x.unit_count} bodies`:`${x.quantity}×`;
    return `• ${x.name} — ${x.type} T${x.tier} — ${qty} — ${x.spent_bp} BP`;
  }).join("\n")||"• none";
  return [
    `**Encounter #${e.encounter_number} — ${e.status.toUpperCase()}**`,
    `PCs: **${e.pc_count}** • Tier: **${e.tier}** • Style: **${e.style}** • Difficulty: **${e.difficulty}**`,
    `Battle Points: base **${e.base_bp}** → budget **${e.budget_bp}** • spent **${e.spent_bp}** • remaining **${e.budget_bp-e.spent_bp}**`,
    `Adjustments: ${mods}`,
    `Environment: ${e.environment_name||"—"}`,
    `Objective: ${e.objective||"—"}`,
    `Composition:\n${comp}`,
    e.notes?`Notes: ${e.notes}`:""
  ].filter(Boolean).join("\n").slice(0,1900);
}

function encounterLibrary(gm){ return new EncounterLibrary(gm.content.root); }
function refreshEncounterBudget(e){
  const r=recomputeBudget(e);
  return {...e,budget_bp:r.budget,spent_bp:r.spent,adjustments:r.derived};
}

function compactAssemblyStatus(db,guildId,session){
  const plan=db.getAssemblyPlan(session.id)||{};
  const roster=presentRoster(db,session.id);
  const lines=[
    `**Session ${session.session_number} Assembly**`,
    `Mode: **${session.assembly_mode||"auto"}** • Phase: **${session.assembly_phase||"assembly"}**`,
    `Present: ${roster.length?roster.map(r=>r.name).join(", "):"none"}`,
    `Plan: ${plan.public_opening?"generated":"not generated"}`,
  ];
  if(plan.convergence_goal) lines.push(`Convergence goal: ${plan.convergence_goal}`);
  if(plan.bonds?.length) lines.push(`Proposed practical links:\n${plan.bonds.slice(0,6).map(b=>`• ${b.from_character} → ${b.to_character}: ${b.reason}`).join("\n")}`);
  if(plan.gm_notes) lines.push(`GM notes: ${plan.gm_notes}`);
  return lines.join("\n").slice(0,1900);
}

async function launchArrival({db,gm,guild,userId,character,reason}){
  const session=db.getActiveSession(guild.id);
  if(!session||session.assembly_mode==="manual"||session.assembly_mode==="already_together") return {planned:false};
  try{
    const entry=await gm.planArrival({guildId:guild.id,userId,characterId:character.id,reason});
    const privateText=entry.private_hook?.trim()
      ?`**Veilkeeper — entry hook for ${character.name}:**\n${entry.private_hook}`
      :"";
    let privateDelivery={ok:true,via:"none"};
    if(privateText) privateDelivery=await sendPlayerPrivate({db,guild,userId,content:privateText,sessionId:session.id,characterId:character.id});
    if(entry.public_entry?.trim()) await postPlayMessage({db,guild,content:entry.public_entry,sessionId:session.id});
    db.audit(guild.id,session.id,"ai","assembly","arrival_plan",{userId,characterId:character.id,reason,connection_reason:entry.connection_reason,private_delivery:privateDelivery.via});
    return {planned:true,entry,privateDelivery};
  }catch(err){
    await postStateError({db,guild,error:err,context:`arrival-plan:${character.name}`,sessionId:session.id});
    return {planned:false,error:err};
  }
}

function npcControlLabel(level){
  return {portrayal:"Portrayal only",tactical:"Tactical",full_npc:"Full NPC"}[level]||level;
}

function formatNpcProxyPacket(proxy,{offered=false}={}){
  const p=proxy.player_packet||{};
  const list=(title,items)=>Array.isArray(items)&&items.length?`\n**${title}**\n${items.map(x=>`- ${x}`).join("\n")}`:"";
  const controls={
    portrayal:"You control this NPC's dialogue, demeanor, social choices, and portrayal. Veilkeeper retains tactics/mechanics unless the GM explicitly expands your authority.",
    tactical:"You control this NPC's dialogue, movement, listed abilities, and tactical choices. Veilkeeper adjudicates mechanics, dice, consequences, and the rest of the world.",
    full_npc:"You control this NPC's voluntary decisions, dialogue, movement, tactics, and use of listed capabilities. You still control only this NPC—not the GM, other NPCs, world truth, or campaign state."
  };
  const dos=[
    "Portray the assigned NPC consistently with this packet and what they legitimately learn during play.",
    "Pursue the listed objective as strongly or cautiously as makes sense for the NPC.",
    "Use only the capabilities, resources, contacts, and knowledge supplied here or legitimately gained in-scene.",
    "State the NPC's intended actions clearly; Veilkeeper resolves mechanics and consequences.",
    "Ask Veilkeeper or the human GM when the packet does not establish what the NPC knows or can do.",
    "Keep NPC-private information private until the NPC deliberately reveals it or events expose it."
  ];
  const donts=[
    "Do not use player/OOC knowledge, GM information, or another character's private information unless this NPC independently knows it.",
    "Do not invent new powers, equipment, minions, contracts, immunities, escape routes, or faction authority.",
    "Do not dictate a PC's thoughts, dialogue, choices, damage, death, or outcome; declare only what this NPC attempts.",
    "Do not alter clocks, facts, relationships, resources, mystery answers, or campaign state directly.",
    "Do not reveal hidden faction plans, future scenes, mystery solutions, or unrelated NPC secrets that are not explicitly in this packet.",
    "Do not override Veilkeeper's deterministic dice/mechanical adjudication or treat disagreement as permission to retcon an outcome.",
    "Do not permanently kill, retire, transform, redeem, or remove this NPC from the campaign unless play mechanics or the human GM explicitly authorize it."
  ];
  return [
    `# VEILED CITY — NPC PROXY PACKAGE`,
    `**NPC:** ${proxy.npc_name}`,
    `**Control:** ${npcControlLabel(proxy.control_level)}`,
    `**Status:** ${offered?"Offered — not active until claimed":"Active"}`,
    controls[proxy.control_level]||"",
    p.public_identity?`\n**Who You Are**\n${p.public_identity}`:"",
    p.portrayal?`\n**Portrayal**\n${p.portrayal}`:"",
    p.current_objective?`\n**Current Objective**\n${p.current_objective}`:"",
    list("What This NPC Knows",p.known_information),
    list("Relevant Relationships",p.relationships),
    list("Capabilities You May Use",p.capabilities),
    list("Limits / Vulnerabilities",p.limitations),
    list("Scene Cues",p.scene_cues),
    `\n## DO`,dos.map(x=>`- ${x}`).join("\n"),
    `\n## DON'T`,donts.map(x=>`- ${x}`).join("\n"),
    offered?`\n**To accept:** \`/vc-npc claim npc:${proxy.npc_name}\`\n**To decline:** \`/vc-npc decline npc:${proxy.npc_name}\``:
      `\nWhen posting as this NPC, prefix with \`${proxy.npc_name}:\` or \`[${proxy.npc_name}]\` if you also control another character. If this is your only active role, ordinary #the-table messages default to this NPC.`
  ].filter(Boolean).join("\n").slice(0,12000);
}

async function deliverNpcProxyPacket({db,guild,proxy,offered=false}){
  const content=formatNpcProxyPacket(proxy,{offered});
  const delivery=await sendPlayerPrivate({db,guild,userId:proxy.discord_user_id,content,sessionId:proxy.session_id,characterId:proxy.knowledge_id});
  if(delivery.ok) return delivery;
  const relay=await postPrivateRelay({
    db,guild,userId:proxy.discord_user_id,sessionId:proxy.session_id,
    title:`NPC proxy packet could not be delivered — ${proxy.npc_name}`,
    context:`npc-proxy:${proxy.npc_name}`,
    content
  });
  return relay.ok?relay:{ok:false,via:"unavailable",ref:relay.ref,content};
}

function formatLevelupDraft(draft,character){
  if(!draft) return "No pending level-up draft.";
  const p=draft.choices?.plan;
  const achievement=tierAchievement(draft.to_level);
  return [
    `**Level Up — ${character?.name||"Character"} ${draft.from_level} → ${draft.to_level}**`,
    `Tier achievement: ${achievement.new_experience?"new Experience +2; ":""}${achievement.proficiency?"+1 Proficiency; ":""}${achievement.clear_trait_marks?"clear marked traits":"none"}`,
    `Legal advancements: ${legalAdvancements(draft.to_level).join(", ")}`,
    p?`Selected: ${p.advancements.join(" + ")}\nMandatory card: ${p.automatic_domain_card.name} (${p.automatic_domain_card.domain} ${p.automatic_domain_card.level})\nStatus: **${draft.status}**`:`Use \`/vc-level level-choose\` to choose two advancements and the mandatory domain card.`,
    `Draft ID: \`${draft.id.slice(0,8)}\``
  ].join("\n").slice(0,1900);
}

function customDomainCards(gm){
  try{return JSON.parse(gm.content.read("CARDS/domain_cards.json")||"{}");}catch{return {};}
}

function byPrefix(rows,id){
  const q=String(id||"").trim().toLowerCase();
  return rows.find(r=>String(r.id).toLowerCase()===q)||rows.find(r=>String(r.id).toLowerCase().startsWith(q));
}

function visibleDowntimeProjects(db,cycle,userId,isGm){
  const rows=db.listDowntimeProjects(cycle.id);
  if(isGm) return rows;
  const owned=new Set(db.listCharacters(cycle.guild_id,userId,{includeClosed:true}).map(c=>c.id));
  return rows.filter(r=>r.visibility==="party"||r.discord_user_id===userId||owned.has(r.character_id));
}

function downtimeStatusText(cycle,projects){
  if(!cycle) return "No open downtime cycle.";
  const lines=projects.map(p=>`• \`${p.id.slice(0,8)}\` **${p.title}** [${p.project_type}] — ${p.progress}/${p.max_progress} — ${p.status}${p.result?`\n  ${p.result}`:""}`);
  return [`**${cycle.label}** — ${cycle.status}`,cycle.notes||"",lines.length?lines.join("\n"):"No submitted projects."].filter(Boolean).join("\n").slice(0,1900);
}

async function deletePublishedNotInSnapshot({db,guild,snapshot}){
  const target=new Set((snapshot?.state?.tables?.published_messages||[]).map(r=>`${r.channel_id}:${r.message_id}`));
  const current=db.listPublishedMessages(guild.id);
  for(const row of current){
    if(target.has(`${row.channel_id}:${row.message_id}`)) continue;
    try{const ch=await guild.channels.fetch(row.channel_id); const m=await ch?.messages?.fetch(row.message_id); if(m) await m.delete();}
    catch{ /* Snapshot restore tolerates already-deleted/inaccessible historical Discord messages. */ }
  }
}


function factList(text){return String(text||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean);}
function chunkTextLines(lines,maxChars=1900){ return chunkDiscordLines(lines,maxChars); }

function factScopeLabel(row){
  if(row.visibility==="gm") return "GM";
  if(row.visibility==="player") return row.subject_user_id?`PLAYER <@${row.subject_user_id}>`:"PLAYER";
  if(row.visibility==="character") return row.subject_character_id?`CHARACTER ${row.subject_character_id.slice(0,8)}`:"CHARACTER";
  return String(row.visibility||"party").toUpperCase();
}
function gmFactLine(row){return `• **[${factScopeLabel(row)}] [${String(row.category||"fact").toUpperCase()}]** \`${row.fact_key}\` — ${row.content} _(${row.source||"unknown"}, ${row.confidence??100}% confidence)_`;}
function playerFactLine(row){
  if(row.visibility==="gm") throw new Error("GM-only fact reached a player-safe fact formatter.");
  const scope=["player","character"].includes(row.visibility)?"PRIVATE":String(row.visibility||"party").toUpperCase();
  return `• **[${scope}]** ${row.content}`;
}
function activeCharacterForUser(db,guildId,userId){
  const s=db.getActiveSession(guildId); if(s){const a=db.activeAssignment(s.id,userId); if(a) return db.getCharacter(a.character_id);}
  return db.listCharacters(guildId,userId,{includeClosed:false})[0]||null;
}
function handoutVisibleTo(db,guildId,userId,handout,isGm=false){
  if(!handout||handout.guild_id!==guildId) return false; if(isGm) return true;
  if(["public","party"].includes(handout.visibility)) return true;
  if(handout.visibility==="player") return handout.subject_user_id===userId;
  if(handout.visibility==="character"){const c=activeCharacterForUser(db,guildId,userId); return !!c&&c.id===handout.subject_character_id;}
  return false;
}
function relationshipLine(r){return `• \`${r.id.slice(0,8)}\` **${r.from_label||r.from_key}** — ${r.relationship_type} (${r.score>=0?"+":""}${r.score}) → **${r.to_label||r.to_key}**${r.note?` — ${r.note}`:""}`;}
function resolveEndpoint(db,guildId,type,value){
  if(type==="character"){const c=db.findGuildCharacter(guildId,value,{includeClosed:true}); if(!c) throw new Error(`Character endpoint not found: ${value}`); return {key:c.id,label:c.name};}
  return {key:db.relationshipEntityKey(type,value),label:String(value).trim()};
}
function latestEncounterForSession(db,sessionId){return db.listEncounters(sessionId)[0]||null;}

async function applyEncounterAftermath({db,guild,encounter,draft,actorId}){
  if(db.getEncounterAftermath(encounter.id)?.status==="applied") return {events:[],relationships:[],handouts:[],outputErrors:[]};
  db.snapshotCampaign(guild.id,{label:`Pre-aftermath encounter ${encounter.encounter_number}`,reason:"Automatic snapshot before encounter aftermath",createdBy:actorId});
  const scope={mode:"party",actorUserId:null,actorCharacterId:null};
  const mutation=db.transaction(()=>{
    const applied=applyAuthoritativeMutation(db,{narrative:draft,guildId:guild.id,sessionId:encounter.session_id,events:draft.events||[],relationships:draft.relationships||[],handouts:draft.handouts||[],scope,source:"encounter_aftermath"});
    db.setEncounterAftermathStatus(encounter.id,"applied");
    return applied;
  });
  const {events,relationships,handouts}=mutation;
  const outputErrors=[];
  const out=async(context,fn)=>{
    try{return await fn();}
    catch(err){
      const ref=await postStateError({db,guild,error:err,context,sessionId:encounter.session_id});
      outputErrors.push({context,ref});
      return null;
    }
  };
  await out("encounter-aftermath-publish",()=>publishEventResults({db,guild,results:events}));
  for(const h of handouts.filter(x=>x.ok)) await out(`encounter-aftermath-handout:${h.row.id}`,()=>deliverHandout({db,guild,handout:h.row,format:"markdown"}));
  for(const r of events.filter(x=>x.type==="canon"&&x.status==="conflict")) await out("encounter-aftermath-canon",()=>postStateError({db,guild,error:new Error(`Canon conflict ${r.conflict_id} requires GM resolution`),context:"encounter-aftermath-canon",sessionId:encounter.session_id}));
  if(draft.player_summary?.trim()){
    await out("encounter-aftermath-play",()=>postPlayMessage({db,guild,content:`**Encounter Aftermath**
${draft.player_summary}`,sessionId:encounter.session_id}));
    await out("encounter-aftermath-journal",()=>postJournalEntry({db,guild,title:`Encounter ${encounter.encounter_number} Aftermath`,content:draft.player_summary}));
  }
  await out("encounter-aftermath-gm-log",()=>postGmLog({db,guild,sessionId:encounter.session_id,title:`Encounter #${encounter.encounter_number} aftermath applied`,details:`Events: ${events.length}
Relationships: ${relationships.filter(x=>x.ok).length}
Handouts: ${handouts.filter(x=>x.ok).length}
${draft.gm_notes||""}`}));
  return {events,relationships,handouts,outputErrors};
}

/**
 * Dispatch one `/vc-*` interaction. Runtime authorization is enforced here even
 * when Discord command visibility permits a user to discover a command.
 *
 * @returns {Promise<boolean>} True when the interaction was handled.
 */
export async function handleCommand(interaction,{db,gm,voice=null}){
  beginInteraction(interaction);
  // Acknowledge rules before queued work, SQLite, snapshots, permissions or model requests.
  const rules=interaction.isChatInputCommand()&&(interaction.commandName==="vc-rules"
    ||interaction.commandName==="vc"&&interaction.options.getSubcommandGroup()==="rules");
  if(rules&&interaction.guildId) await acknowledgeRules(interaction,interaction.options.getSubcommand());
  // A duplicate that arrives during an awaited response must see the first
  // delivery's receipt before it can execute the command body.
  try{
    if(!interaction?.id) return await executeCommand(interaction,{db,gm,voice});
    return await interactionQueue.enqueue(`${interaction.guildId}:${interaction.id}`,
      ()=>executeCommand(interaction,{db,gm,voice}));
  }catch(error){throw interactionFailure(interaction,error);}
}

async function executeCommand(interaction,{db,gm,voice=null}){
  if(!interaction.isChatInputCommand()) return false;
  const commandName=interaction.commandName;
  if(commandName!=="vc"&&!commandName.startsWith("vc-")) return false;
  if(!interaction.guildId) { await interaction.reply({content:"Veiled City commands must be used in a server.",ephemeral:true}); return true; }
  let group;
  let sub;
  if(commandName==="vc"){
    // Compatibility with any stale pre-3.2.2 guild command until Discord replaces it.
    group=interaction.options.getSubcommandGroup();
    sub=interaction.options.getSubcommand();
  }else{
    const root=commandName.slice(3);
    group=root==="level"?"character":root==="combat"?"encounter":root;
    sub=interaction.options.getSubcommand();
  }
  if((group!=="story"&&!(group==="admin"&&["seed-drafts","seed-package-preview","seed-package-export"].includes(sub))&&!(group==="intel"&&["discover","continuity","organizations","brief","recap"].includes(sub))
    &&!(group==="handout"&&sub==="evidence")&&!(group==="downtime"&&sub==="long-project-status")
    &&!(group==="roll"&&["pending","result"].includes(sub)))||isMutatingCommand(group,sub)) await ensurePlayer(db,interaction);
  if(await replayReceiptIfPresent({db,interaction,group,sub})) return true;
  const restoreReceiptCapture=installReceiptCapture({db,interaction,group,sub});
  try{
    if(group==="intel"&&["organization","organizations"].includes(sub)){
      const result=sub==="organization"?organizationRequest(db,interaction.guildId,interaction.user.id,JSON.parse(interaction.options.getString("json",true)))
        :organizationInbox(db,interaction.guildId,interaction.user.id);
      await interaction.reply({ephemeral:true,content:"Private owner proposals and explicit participation; no automatic funds, NPC appointments or world changes.",
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"organization-continuity.json"})]});return true;
    }
    if(group==="downtime"&&sub==="long-project"){
      const result=manageLongProject(db,interaction.guildId,interaction.user.id,JSON.parse(interaction.options.getString("json",true)),{gm:isGM(db,interaction)});
      await interaction.reply({ephemeral:true,content:"Private long-project continuity; no automatic PC costs or benefits.",
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"long-project.json"})]});return true;
    }
    if(group==="downtime"&&sub==="long-project-status"){
      const rows=db.longProjectInbox(interaction.guildId,interaction.user.id,{gm:isGM(db,interaction)})
        .map(row=>({...row,expected_revision:stateRevision(row),phase_revision:row.kind==="long_project"?projectPhaseRevision(row):null}));
      await interaction.reply({ephemeral:true,content:"Private project proposals and current phase revisions; accept-proposal and consent use /vc-downtime long-project.",
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(rows,null,2)),{name:"long-project-status.json"})]});return true;
    }
    if(group==="intel"&&sub==="continuity"){
      const result=personalInbox(db,interaction.guildId,interaction.user.id).concat(
        db.getCityCalendar(interaction.guildId).flags.natural_language===true?consentOffers(db,interaction.guildId,interaction.user.id).map(row=>
          ({kind:"owner_offer",key:row.record_key,expected_revision:row.revision,terms:row.terms,authority:"Nonbinding current proposal; respond freely. Exact revision/terms are necessary for consequential consent."})):[]);
      await interaction.reply({ephemeral:true,content:"Private continuity inbox and current revision-bound terms. What do you want to say or clarify? Native commands remain available.",
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"continuity-inbox.json"})]});return true;
    }
    if(group==="intel"&&["arc","discover"].includes(sub)){
      const input=JSON.parse(interaction.options.getString("json")||"{}");
      if(sub==="discover") for(const key of ["query","mode"]){const value=interaction.options.getString(key);if(value!==null&&value!==undefined) input[key]=value;}
      const result=sub==="arc"?personalArc(db,interaction.guildId,interaction.user.id,input):discoverPersonal(db,interaction.guildId,interaction.user.id,input);
      await interaction.reply({ephemeral:true,allowedMentions:{parse:[]},content:sub==="discover"?formatDiscovery(db,interaction.guildId,interaction.user.id,result):"Character-private continuity; recorded knowledge only.",
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"personal-continuity.json"})]});return true;
    }
    if(group==="admin"&&(["seed-drafts","seed-add","seed-edit","seed-remove","seed-approve","seed-reject"].includes(sub)||sub.startsWith("seed-package-"))){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required.");
      return await handleSeedCommand(interaction,{db});
    }
    if(group==="city") return await handleCityCommand(interaction,{db,gm});
    if(group==="story") return await handleStoryCommand(interaction,{db,gm});
    if(group==="sim") return await handleSimulationCommand(interaction,{db,isGm:isGM(db,interaction),sub});
    if(group==="director"){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required.");
      const session=db.getActiveSession(interaction.guildId);
      if(sub==="status"){
        const state=session?db.getDirectorState(session.id):null;
        await interaction.reply({content:[
          `**World Director** — ${db.isDirectorPaused(interaction.guildId)?"PAUSED":"active"}`,
          session?`Session ${session.session_number} • Round cadence ${state.round_number} • Scene ${state.scene_number}${state.scene_label?` (${state.scene_label})`:""}`:"No active session.",
          state?.pending_pass?`Pending: **${state.pending_pass.layer}** — ${state.pending_pass.reason||"no reason recorded"}`:"Pending: none",
          state?`Completed passes: round ${state.pass_counts?.round||0}, scene ${state.pass_counts?.scene||0}, downtime ${state.pass_counts?.downtime||0}`:""
        ].filter(Boolean).join("\n"),ephemeral:true}); return true;
      }
      if(sub==="history"){
        const rows=db.listDirectorHistory(interaction.guildId,interaction.options.getInteger("limit")||15);
        const chunks=chunkTextLines(rows.length?["**World Director History**",...rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.layer}** • ${r.status} • ${r.acted?"acted":"no move"} • ${r.created_at}\n  ${r.rationale||r.error||"No rationale recorded."}`)]:["No director history recorded yet."]);
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true}); return true;
      }
      if(sub==="pause"){ db.setDirectorPaused(interaction.guildId,true); await interaction.reply({content:"World Director automatic passes are **paused**. Player turns continue normally; pending director state is preserved.",ephemeral:true}); return true; }
      if(sub==="resume"){ db.setDirectorPaused(interaction.guildId,false); await interaction.reply({content:"World Director automatic passes are **resumed**. Any durable pending pass will run on the next normal director opportunity.",ephemeral:true}); return true; }
      if(sub==="run"){
        if(!session) throw new NotFoundError("No active session.");
        const reason=interaction.options.getString("reason")||"Manual GM-requested world review.";
        await interaction.deferReply({ephemeral:true});
        const result=normalizeDirectorConfidence(await gm.runWorldDirector({guildId:interaction.guildId,layer:"manual",trigger:{reason,requested_by:interaction.user.id}}));
        let mutation={events:[],relationships:[],handouts:[]};
        if(result.act){
          db.snapshotCampaign(interaction.guildId,{label:"Pre-manual-director",reason,createdBy:interaction.user.id});
          mutation=applyAuthoritativeMutation(db,{narrative:result,guildId:interaction.guildId,sessionId:session.id,events:result.events||[],relationships:result.relationships||[],handouts:result.handouts||[],npcMemories:result.npc_memories||[],npcKnowledge:result.npc_knowledge||[],npcGoals:result.npc_goals||[],simulationUpdates:result.simulation_updates||[],scope:{mode:"party",actorUserId:null,actorCharacterId:null},source:"world_director_manual",provenance:{interactionId:interaction.id,actorId:interaction.user.id,triggerText:reason,rationale:result.gm_notes||"",confidence:result.confidence??100}});
          await publishEventResults({db,guild:interaction.guild,results:mutation.events||[]});
          for(const h of (mutation.handouts||[]).filter(x=>x.ok)) await deliverHandout({db,guild:interaction.guild,handout:h.row,format:"markdown"});
          if(String(result.public_narration||"").trim()) await postPlayMessage({db,guild:interaction.guild,sessionId:session.id,content:result.public_narration});
        }
        db.recordDirectorHistory(interaction.guildId,{sessionId:session.id,layer:"manual",trigger:{reason,requested_by:interaction.user.id},acted:!!result.act,rationale:result.gm_notes||"",publicNarration:result.public_narration||"",mutationSummary:{events:mutation.events?.length||0,relationships:mutation.relationships?.length||0,handouts:mutation.handouts?.length||0}});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:"World Director — manual",details:`Reason: ${reason}\n${result.gm_notes||"No GM note."}`});
        await interaction.editReply(result.act?"Manual World Director pass completed and committed.":"Manual World Director pass completed; no world move was warranted.");
        return true;
      }
    }

    if(group==="voice"){
      if(!voice) throw new Error("Voice subsystem is unavailable in this runtime.");
      if(sub==="status"){
        const st=voice.status(interaction.guildId);
        const where=st.channelId?`<#${st.channelId}>`:"not connected";
        await interaction.reply({content:[
          `**Veilkeeper Voice** — ${st.enabled?"enabled":"disabled"}`,
          `Connection: ${where} • Mode: **${st.mode}**`,
          `Model: **${st.model}** • Voice: **${st.voice}** • Speed: **${st.speed}×**`,
          `Playback: ${st.paused?"paused":"ready"} • Queue: ${st.queued} • Last narration cached: ${st.hasLast?"yes":"no"}`,
          `FFmpeg: ${st.ffmpeg?"detected":"NOT FOUND"}`,
          `Voice output is AI-generated.`
        ].join("\n"),ephemeral:true});
        return true;
      }
      if(sub==="join"){
        const ch=interaction.member?.voice?.channel;
        if(!ch) throw new Error("Join the voice channel you want Veilkeeper to use, then run this command again.");
        await interaction.deferReply({ephemeral:true});
        const st=await voice.join(interaction.guild,ch,{allowMove:isGM(db,interaction)});
        await interaction.editReply(`Veilkeeper joined **${ch.name}** for AI-generated narration. Mode: **${st.mode}** • Voice: **${st.voice}**. Discord text remains the authoritative campaign record.`);
        return true;
      }
      if(sub==="repeat"){
        const r=voice.repeat(interaction.guildId,{requesterUserId:interaction.user.id,requesterChannelId:interaction.member?.voice?.channelId||null});
        await interaction.reply({content:`Replaying the last narration (${r.segments} audio segment${r.segments===1?"":"s"}) from cache; no new speech-generation request was made.`,ephemeral:true});
        return true;
      }
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required for this voice control.");
      if(sub==="leave"){ voice.leave(interaction.guildId); await interaction.reply({content:"Veilkeeper disconnected from voice.",ephemeral:true}); return true; }
      if(sub==="pause"){ voice.pause(interaction.guildId); await interaction.reply({content:"Voice narration paused.",ephemeral:true}); return true; }
      if(sub==="resume"){ voice.resume(interaction.guildId); await interaction.reply({content:"Voice narration resumed.",ephemeral:true}); return true; }
      if(sub==="configure"){
        const mode=interaction.options.getString("mode");
        const voiceName=interaction.options.getString("voice");
        const speed=interaction.options.getNumber("speed");
        const instructions=interaction.options.getString("instructions");
        if(mode) voice.setMode(interaction.guildId,mode);
        if(voiceName) voice.setVoice(interaction.guildId,voiceName);
        if(speed!=null) voice.setSpeed(interaction.guildId,speed);
        if(instructions!=null) voice.setInstructions(interaction.guildId,instructions);
        const st=voice.status(interaction.guildId);
        await interaction.reply({content:`Runtime voice settings updated: mode **${st.mode}**, voice **${st.voice}**, speed **${st.speed}×**. These runtime overrides reset when Veilkeeper restarts; set the matching .env values for permanent defaults.`,ephemeral:true});
        return true;
      }
      if(sub==="narrate"){
        await interaction.deferReply({ephemeral:true});
        const r=await voice.narrate(interaction.guild,interaction.options.getString("text",true),
          {force:true,visibility:"party",npcKey:interaction.options.getString("npc")||null});
        if(!r.ok){
          const reason={not_connected:"Veilkeeper is not connected to voice. Use /vc-voice join first.",queue_full:"Voice narration queue is full. Wait for current narration to finish.",cancelled:"Voice narration was cancelled because the voice connection changed.",disabled:"Voice narration is disabled.",empty:"Narration text was empty after speech-safe cleanup."}[r.reason]||`Voice narration unavailable (${r.reason||"unknown"}).`;
          throw new Error(reason);
        }
        await interaction.editReply(`Queued one-off AI narration (${r.segments} segment${r.segments===1?"":"s"}).`);
        return true;
      }
    }

    if(group==="campaign"&&sub==="setup"){
      if(!isGM(db,interaction)) throw new Error("Manage Server or the configured GM role is required.");
      const ch=interaction.options.getChannel("play_channel",true);
      const role=interaction.options.getRole("gm_role");
      const mode=interaction.options.getString("mode")||process.env.DEFAULT_RESPONSE_MODE||"assisted";
      const c=db.configureCampaign(interaction.guildId,{playChannelId:ch.id,gmRoleId:role?.id||null,responseMode:mode});
      await interaction.reply({content:`Configured **${c.name}**. Play channel: <#${ch.id}>. Response mode: **${c.response_mode}**.`,ephemeral:true});
      return true;
    }
    if(group==="campaign"&&sub==="status"){
      const c=db.ensureCampaign(interaction.guildId);
      const s=db.getActiveSession(interaction.guildId);
      const routing=validateChannelRouting(c);
      const ch=(id)=>id?`<#${id}>`:"—";
      await interaction.reply({content:[
        `**${c.name}**`,
        `Play: ${ch(c.play_channel_id)} • Mode: **${c.response_mode}**`,
        `Rules: ${ch(c.rules_channel_id)} • Case board: ${ch(c.case_board_channel_id)} • Journal: ${ch(c.journal_channel_id)}`,
        `Known NPCs: ${ch(c.known_npcs_channel_id)} • Known locations: ${ch(c.known_locations_channel_id)}`,
        `GM log: ${ch(c.gm_log_channel_id)} • State errors: ${ch(c.state_errors_channel_id)}`,
        `Veil Exposure: ${c.veil_exposure}/6 • Fear: ${c.fear??0}/12`,
        `Session: ${s?`#${s.session_number} ${s.title||""} • ${s.assembly_phase||"assembly"}`:"none active"}`,
        ...(s?(()=>{ const d=db.getDirectorState(s.id); return [`World Director: round ${d.round_number||1} • scene ${d.scene_number||1}${d.scene_label?` (${d.scene_label})`:""} • pending **${d.pending_pass?.layer||"none"}**`]; })():[]),
        `Party: ${db.getPartyState(interaction.guildId).established?"established":"not established"}`,
        `Channel routing: ${routing.ok?"valid":`INVALID (${routing.conflicts.map(row=>row.roles.join("/")).join(", ")})`}`
      ].join("\n"),ephemeral:true});
      return true;
    }
    if(group==="campaign"&&sub==="channels"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const get=(n)=>interaction.options.getChannel(n);
      const campaign=db.getCampaign(interaction.guildId);
      for(const channel of [get("gm_log"),get("state_errors")].filter(Boolean)){
        assertGmOnlyChannel({guild:interaction.guild,channel,gmRoleId:campaign?.gm_role_id||null});
      }
      const c=db.configureChannels(interaction.guildId,{
        rulesChannelId:get("rules_channel")?.id,caseBoardChannelId:get("case_board")?.id,journalChannelId:get("journal")?.id,
        knownNpcsChannelId:get("known_npcs")?.id,knownLocationsChannelId:get("known_locations")?.id,
        gmLogChannelId:get("gm_log")?.id,stateErrorsChannelId:get("state_errors")?.id
      });
      await interaction.deferReply({ephemeral:true});
      await syncConfiguredSurfaces({db,guild:interaction.guild});
      await interaction.editReply("Support channels saved. Existing player-visible case threads/NPCs/locations were synchronized where configured.");
      await postGmLog({db,guild:interaction.guild,title:"Channel configuration updated",details:`Updated by ${interaction.user.username}.`});
      return true;
    }
    if(group==="campaign"&&sub==="sync"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      await interaction.deferReply({ephemeral:true});
      await syncConfiguredSurfaces({db,guild:interaction.guild});
      await interaction.editReply("Configured case-board and reference surfaces synchronized from authoritative SQLite state.");
      return true;
    }

    if(group==="session"&&sub==="start"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may start sessions.");
      const assembly=interaction.options.getString("assembly")||"auto";
      db.ensureCampaign(interaction.guildId);
      db.snapshotCampaign(interaction.guildId,{label:"Pre-session",reason:"Automatic snapshot before session start",createdBy:interaction.user.id});
      const s=db.startSession(interaction.guildId,interaction.options.getString("title")||"",assembly);
      // Known players default to absent/offscreen until they opt in.
      for(const p of db.listPlayers(interaction.guildId)) db.setPresence(s.id,p.discord_user_id,"absent","offscreen",null,"Not checked in.");
      const next=s.assembly_phase==="party"
        ?"Returning established party: check in with `/vc-session present`."
        :assembly==="manual"
          ?"Manual assembly selected; the human GM introduces the PCs."
          :"After expected players check in, the GM runs `/vc-session assemble`.";
      await interaction.reply(`**Session ${s.session_number} started${s.title?`: ${s.title}`:""}.** Assembly: **${assembly}**. ${next}`);
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:`Session ${s.session_number} started`,details:`${s.title||"Untitled session"}
Assembly mode: ${assembly}
Initial phase: ${s.assembly_phase}`});
      return true;
    }
    if(group==="session"&&sub==="assemble"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may assemble a party.");
      const s=requireSession(db,interaction.guildId);
      if(s.assembly_mode==="manual") throw new Error("This session is set to manual assembly.");
      if(s.assembly_phase==="party") throw new Error("The session is already in established-party phase.");
      await interaction.deferReply({ephemeral:true});
      const plan=await gm.planAssembly({guildId:interaction.guildId,mode:s.assembly_mode});
      db.setAssemblyPlan(s.id,plan);
      const delivery=[];
      for(const e of plan.character_entries||[]){
        const row=presentRoster(db,s.id).find(r=>r.discord_user_id===e.discord_user_id);
        if(!row) continue;
        const d=await sendPlayerPrivate({
          db,guild:interaction.guild,userId:e.discord_user_id,
          content:`**Veilkeeper — private opening hook for ${e.character_name}:**\n${e.private_hook}`,
          sessionId:s.id,characterId:row.character_id
        });
        delivery.push(`${e.character_name}: ${d.ok?d.via:"FAILED"}`);
      }
      if(plan.public_opening?.trim()) await postPlayMessage({db,guild:interaction.guild,content:plan.public_opening,sessionId:s.id});
      db.audit(interaction.guildId,s.id,"ai","assembly","assembly_plan",{mode:s.assembly_mode,delivery,bonds:plan.bonds});
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:"Party convergence launched",details:`Mode: ${s.assembly_mode}\n${plan.gm_notes||""}\nPrivate delivery: ${delivery.join(", ")||"none"}`});
      await interaction.editReply(`Convergence scene launched in the play channel.\n\n${compactAssemblyStatus(db,interaction.guildId,db.getSession(s.id))}\n\nPrivate hook delivery: ${delivery.join(", ")||"none"}`);
      return true;
    }
    if(group==="session"&&sub==="assembly-status"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may view the private assembly plan.");
      const s=requireSession(db,interaction.guildId);
      await interaction.reply({content:compactAssemblyStatus(db,interaction.guildId,s),ephemeral:true});
      return true;
    }
    if(group==="session"&&sub==="roster"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may view the session roster.");
      const s=requireSession(db,interaction.guildId);
      const lines=buildSessionRosterReport(db,interaction.guildId,s);
      const chunks=chunkRosterReport(lines);
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true});
      return true;
    }
    if(group==="session"&&sub==="converged"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may change convergence phase.");
      const s=requireSession(db,interaction.guildId);
      db.setAssemblyPhase(s.id,"converged");
      await postPlayMessage({db,guild:interaction.guild,content:"*The characters' immediate objectives now clearly overlap. Whether they continue together beyond this problem remains their choice.*",sessionId:s.id});
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:"Party convergence reached",details:"Assembly phase changed to converged. Long-term party membership remains player-controlled."});
      await interaction.reply({content:"Assembly phase set to **converged**.",ephemeral:true});
      return true;
    }

    if(group==="session"&&sub==="end"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may end sessions.");
      await interaction.deferReply();
      const activeBefore=db.getActiveSession(interaction.guildId);
      db.snapshotCampaign(interaction.guildId,{label:`Pre-end Session ${activeBefore?.session_number||""}`.trim(),reason:"Automatic snapshot before session end",createdBy:interaction.user.id});
      const recap=await gm.summarizeSession(interaction.guildId);
      const s=db.endSession(interaction.guildId,recap);
      db.addFact(interaction.guildId,{category:"recap",key:`session-${s.session_number}-recap`,content:recap,visibility:"party",sessionId:s.id,source:"system",
        provenance:{epistemic:{kind:"testimony",perspective:"narrator recap; consult original sources, not new truth",source_refs:[]},session_id:s.id,authority:"Non-authoritative synthesis; original messages/facts retained"}});
      await publishJournal({db,guild:interaction.guild,session:s,recap});
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:`Session ${s.session_number} ended`,details:"Player-safe recap generated and campaign state closed."});
      db.snapshotCampaign(interaction.guildId,{label:`Post-session ${s.session_number}`,reason:"Automatic snapshot after session end",createdBy:interaction.user.id});
      await interaction.editReply(`**Session ${s.session_number} ended.**\n\n${recap}`);
      return true;
    }
    if(group==="session"&&["present","arrive"].includes(sub)){
      const s=requireSession(db,interaction.guildId);
      const q=interaction.options.getString("character");
      const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,q);
      if(!c) throw new Error("No active owned character found. Create/import one or specify a character.");
      db.setPresence(s.id,interaction.user.id,sub==="arrive"?"late":"present","offscreen",null,sub==="arrive"?"Arrived during session.":"");
      db.assignCharacter(s.id,interaction.user.id,c.id,{role:"primary",controlPolicy:"player_only"});
      recordCharacterArrival(db,interaction.guildId,c,interaction.user.id,interaction.id);
      let suffix="";
      const returning=db.partyHasCharacter(interaction.guildId,c.id);
      const shouldPlan=sub==="arrive" || (s.assembly_phase==="party" && !returning && s.assembly_mode!=="already_together");
      if(shouldPlan){
        await interaction.deferReply({ephemeral:true});
        const result=await launchArrival({db,gm,guild:interaction.guild,userId:interaction.user.id,character:c,reason:sub==="arrive"?"late arrival":"new character joining an established party"});
        suffix=result.planned?" An entry hook was sent privately and an opening was posted at the table.":" Entry planning was unavailable; the GM can introduce the character manually.";
        await interaction.editReply(`**${c.name}** is now present in Session ${s.session_number}.${suffix}`);
      }else{
        await interaction.reply(`**${c.name}** is now present in Session ${s.session_number}.`);
      }
      return true;
    }
    if(group==="session"&&["absent","leave"].includes(sub)){
      const s=requireSession(db,interaction.guildId);
      const mode=interaction.options.getString("mode",true);
      const proxy=interaction.options.getUser("proxy");
      if(mode==="proxy"&&!proxy) throw new Error("Proxy mode requires a proxy player.");
      if(proxy?.id===interaction.user.id) throw new Error("Choose another player as proxy.");
      const presence=sub==="leave"?"left_early":"absent";
      const note=interaction.options.getString("note")||"";
      db.setPresence(s.id,interaction.user.id,presence,mode,proxy?.id||null,note);
      const a=db.activeAssignment(s.id,interaction.user.id);
      if(a){
        if(mode==="background") db.assignCharacter(s.id,interaction.user.id,a.character_id,{role:"primary",controlPolicy:"background_safe"});
        if(mode==="proxy") db.assignCharacter(s.id,interaction.user.id,a.character_id,{role:"primary",controlPolicy:"proxy",proxyUserId:proxy.id});
      }
      const text=mode==="offscreen"?"PC is offscreen and protected from AI control."
        :mode==="background"?"PC may appear only as harmless background presence; no consequential AI control."
        :`PC may be controlled this session by <@${proxy.id}>.`;
      await interaction.reply({content:`Attendance updated: **${presence}**. ${text}`,ephemeral:false});
      return true;
    }

    if(group==="character"&&sub==="create"){
      const name=interaction.options.getString("name",true);
      const data={
        class:interaction.options.getString("class")||"",
        subclass:interaction.options.getString("subclass")||"",
        ancestry:interaction.options.getString("ancestry")||"",
        community:interaction.options.getString("community")||"",
        domains:(interaction.options.getString("domains")||"").split(",").map(x=>x.trim()).filter(Boolean)
      };
      const c=db.createCharacter(interaction.guildId,interaction.user.id,name,data);
      await interaction.reply({content:`Created:\n${formatSheet(c)}\n\nUse \`/vc-character import\` for a fully populated sheet or \`/vc-character select\` during a session.`,ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="import"){
      const a=interaction.options.getAttachment("file",true);
      if(!a.name?.toLowerCase().endsWith(".json")) throw new Error("Import requires a .json file.");
      const res=await fetch(a.url);
      if(!res.ok) throw new Error("Could not download the attachment.");
      const data=await res.json();
      const narrative=interaction.options.getAttachment("narrative");
      let narrativeMarkdown=null;
      if(narrative){
        if(!narrative.name?.toLowerCase().endsWith(".md")) throw new Error("Character narrative must be a .md file.");
        const nr=await fetch(narrative.url); if(!nr.ok) throw new Error("Could not download the narrative attachment.");
        narrativeMarkdown=normalizeNarrativeMarkdown(await nr.text());
      }
      const c=db.importCharacter(interaction.guildId,interaction.user.id,data);
      let narrativeNote="";
      if(narrativeMarkdown){
        db.upsertCharacterNarrative(interaction.guildId,c.id,"player",narrativeMarkdown,{sourceFilename:narrative.name,importedBy:interaction.user.id});
        narrativeNote=` Player narrative imported as \`${narrativeRelativePath(c.name,"player")}\`.`;
      }
      await interaction.reply({content:`Imported **${c.name}**.${narrativeNote}`,ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="context-export"){
      const history=interaction.options.getInteger("history_sessions")||10;
      const pkg=createConceptContextPackage({db,contentRoot:gm.content.root,guildId:interaction.guildId,userId:interaction.user.id,historySessions:history});
      const s=db.getActiveSession(interaction.guildId);
      db.audit(interaction.guildId,s?.id||null,"player",interaction.user.id,"character_concept_context_export",{history_sessions:history,files:pkg.files});
      await interaction.reply({content:`Player-safe character-creation context package generated from the **current campaign state** with the last **${history}** completed session recap(s). Upload this ZIP to ChatGPT and follow the included AI instructions.`,files:[new AttachmentBuilder(pkg.buffer,{name:pkg.name})],ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="import-gm-hooks"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required to import GM-only character hooks.");
      const a=interaction.options.getAttachment("file",true);
      if(!a.name?.toLowerCase().endsWith(".json")) throw new Error("GM hook import requires a .json file.");
      const res=await fetch(a.url); if(!res.ok) throw new Error("Could not download the GM hook attachment.");
      const packet=await res.json();
      if(packet.schema && !["veiled-city-gm-hooks-import-v3.3.1","veiled-city-gm-hooks-import-v3.3.2","veiled-city-gm-hooks-import-v3.3.3"].includes(packet.schema)) throw new Error(`Unsupported GM hook schema: ${packet.schema}`);
      const name=interaction.options.getString("character")||packet.character_name;
      if(!String(name||"").trim()) throw new Error("The GM hook package must include character_name or you must provide the character option.");
      const c=db.findGuildCharacter(interaction.guildId,name,{includeClosed:true}); if(!c) throw new Error(`Campaign character not found: ${name}`);
      const narrative=interaction.options.getAttachment("narrative");
      let narrativeMarkdown=null;
      if(narrative){
        if(!narrative.name?.toLowerCase().endsWith(".md")) throw new Error("GM-private narrative must be a .md file.");
        const nr=await fetch(narrative.url); if(!nr.ok) throw new Error("Could not download the GM-private narrative attachment.");
        narrativeMarkdown=normalizeNarrativeMarkdown(await nr.text());
      }
      db.snapshotCampaign(interaction.guildId,{label:`Pre-GM-hook import ${c.name}`,reason:"Before importing external character concept GM hooks",createdBy:interaction.user.id});
      const result=db.importCharacterGmHooks(interaction.guildId,c,packet);
      let narrativeImported=false;
      if(narrativeMarkdown){
        db.upsertCharacterNarrative(interaction.guildId,c.id,"gm_private",narrativeMarkdown,{sourceFilename:narrative.name,importedBy:interaction.user.id});
        narrativeImported=true;
      }
      const s=db.getActiveSession(interaction.guildId);
      db.audit(interaction.guildId,s?.id||null,"human_gm",interaction.user.id,"character_gm_hooks_import",{character_id:c.id,file:a.name,narrative_file:narrative?.name||null,...result});
      await postGmLog({db,guild:interaction.guild,sessionId:s?.id||null,title:`GM hooks imported — ${c.name}`,details:`Hooks/suggestions stored: ${result.hooks}
GM-private relationships created/updated: ${result.relationships}
Canon suggestions stored for review: ${result.canon_suggestions}
Source file: ${a.name}${narrativeImported?`\nGM-private narrative: ${narrativeRelativePath(c.name,"gm_private")}`:""}`});
      await interaction.reply({content:`Imported GM-only concept material for **${c.name}**. **${result.hooks}** hook/suggestion record(s), **${result.relationships}** GM-private relationship edge(s), and **${result.canon_suggestions}** canon suggestion(s).${narrativeImported?` GM-private Markdown was also imported as \`${narrativeRelativePath(c.name,"gm_private")}\`.`:""} Canon suggestions are **not authoritative** and are withheld from normal AI-GM hook context until reviewed with \`/vc-canon proposals\` and \`/vc-canon proposal-resolve\`.`,ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="narrative-import"){
      const scope=interaction.options.getString("scope",true);
      const query=interaction.options.getString("character",true);
      const gm=isGM(db,interaction);
      if(scope==="gm_private"&&!gm) throw new Error("GM/admin permission required for GM-private narrative imports.");
      const c=gm?db.findGuildCharacter(interaction.guildId,query,{includeClosed:true}):findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,query);
      if(!c) throw new Error("Character not found or unavailable.");
      if(!gm&&c.owner_user_id!==interaction.user.id) throw new Error("You may only import player narrative for your own character.");
      const a=interaction.options.getAttachment("file",true);
      if(!a.name?.toLowerCase().endsWith(".md")) throw new Error("Narrative import requires a .md file.");
      const res=await fetch(a.url); if(!res.ok) throw new Error("Could not download the Markdown attachment.");
      const md=normalizeNarrativeMarkdown(await res.text());
      db.snapshotCampaign(interaction.guildId,{label:`Pre-narrative import ${c.name}`,reason:`Before ${scope} Markdown narrative import`,createdBy:interaction.user.id});
      db.upsertCharacterNarrative(interaction.guildId,c.id,scope,md,{sourceFilename:a.name,importedBy:interaction.user.id});
      const sess=db.getActiveSession(interaction.guildId);
      db.audit(interaction.guildId,sess?.id||null,gm?"human_gm":"player",interaction.user.id,"character_narrative_import",{character_id:c.id,scope,file:a.name,path:narrativeRelativePath(c.name,scope)});
      if(scope==="gm_private") await postGmLog({db,guild:interaction.guild,sessionId:sess?.id||null,title:`GM-private narrative imported — ${c.name}`,details:`Stored as ${narrativeRelativePath(c.name,scope)}\nSource: ${a.name}`});
      await interaction.reply({content:`Imported **${scope==="gm_private"?"GM-private":"player-safe"}** Markdown narrative for **${c.name}**. Standard path: \`${narrativeRelativePath(c.name,scope)}\`.`,ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="narrative-export"){
      const scope=interaction.options.getString("scope")||"player";
      const gm=isGM(db,interaction);
      if(["gm_private","all"].includes(scope)&&!gm) throw new Error("GM/admin permission required to export GM-private narrative.");
      const q=interaction.options.getString("character");
      const sess=db.getActiveSession(interaction.guildId);
      let c=null;
      if(q) c=gm?db.findGuildCharacter(interaction.guildId,q,{includeClosed:true}):findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,q);
      if(!c&&!q&&sess){const a=db.activeAssignment(sess.id,interaction.user.id); if(a) c=db.getCharacter(a.character_id);}
      if(!c&&!q) c=findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,"");
      if(!c) throw new Error("Character not found or unavailable.");
      if(!gm&&c.owner_user_id!==interaction.user.id) throw new Error("You may only export your own player narrative.");
      const pkg=createNarrativeExportPackage({db,guildId:interaction.guildId,character:c,scope});
      db.audit(interaction.guildId,sess?.id||null,gm?"gm":"player",interaction.user.id,"character_narrative_export",{character_id:c.id,scope,files:pkg.files});
      await interaction.reply({content:`Narrative Markdown export for **${c.name}**. The ZIP preserves the standard \`PLAYER/PLAYERS\` and/or \`GM_PRIVATE/PLAYERS\` paths.`,files:[new AttachmentBuilder(pkg.buffer,{name:pkg.name})],ephemeral:true});
      return true;
    }

    if(group==="character"&&sub==="list"){
      const rows=db.listCharacters(interaction.guildId,interaction.user.id,{includeClosed:true});
      await interaction.reply({content:rows.length?rows.map(c=>`• **${c.name}** — ${c.status}${c.is_guest?" / guest":""}`).join("\n"):"You have no characters yet.",ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="select"){
      const s=requireSession(db,interaction.guildId);
      const previous=db.activeAssignment(s.id,interaction.user.id);
      const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,interaction.options.getString("character",true));
      if(!c) throw new Error("Character not found or unavailable.");
      db.setPresence(s.id,interaction.user.id,"present","offscreen");
      db.assignCharacter(s.id,interaction.user.id,c.id,{role:"primary",controlPolicy:"player_only"});
      if(previous?.character_id && previous.character_id!==c.id && s.assembly_mode!=="manual"){
        await interaction.deferReply({ephemeral:true});
        const result=await launchArrival({db,gm,guild:interaction.guild,userId:interaction.user.id,character:c,reason:"replacement or character switch"});
        await interaction.editReply(`You are now playing **${c.name}**.${result.planned?" Veilkeeper prepared a fictionally appropriate entry.":" The GM should introduce the change when fictionally appropriate."}`);
      }else{
        await interaction.reply({content:`You are now playing **${c.name}**.`,ephemeral:true});
      }
      return true;
    }
    if(group==="character"&&sub==="sheet"){
      const s=db.getActiveSession(interaction.guildId);
      let c;
      const q=interaction.options.getString("character");
      if(q) c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,q);
      else if(s) {
        const a=db.controlledAssignment(s.id,interaction.user.id);
        c=a?db.getCharacter(a.character_id):null;
      }
      if(!c) c=db.listCharacters(interaction.guildId,interaction.user.id,{includeClosed:false})[0];
      await interaction.reply({content:formatSheet(c),ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="export"){
      const q=interaction.options.getString("character");
      const s=db.getActiveSession(interaction.guildId);
      let c=q?findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,q):null;
      if(!c&&s){ const a=db.activeAssignment(s.id,interaction.user.id); if(a) c=db.getCharacter(a.character_id); }
      if(!c) c=findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,"");
      if(!c) throw new Error("No owned character found to export.");
      const format=interaction.options.getString("format")||"docx";
      const files=createPlayerExportFiles({db,guildId:interaction.guildId,character:c,format});
      db.audit(interaction.guildId,s?.id||null,"player",interaction.user.id,"character_export",{character_id:c.id,format,files:files.map(x=>x.name)});
      await interaction.reply({content:`Current player-safe export for **${c.name}** (${format}).`,files:exportAttachments(files),ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="export-gm"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required for GM-private character exports.");
      const c=db.findGuildCharacter(interaction.guildId,interaction.options.getString("character",true),{includeClosed:true});
      if(!c) throw new Error("Campaign character not found.");
      const format=interaction.options.getString("format")||"all";
      const files=createGmExportFiles({db,guildId:interaction.guildId,character:c,format});
      const s=db.getActiveSession(interaction.guildId);
      db.audit(interaction.guildId,s?.id||null,"gm",interaction.user.id,"character_export_gm",{character_id:c.id,format,files:files.map(x=>x.name)});
      await interaction.reply({content:`GM-private export for **${c.name}**. Do not share these files with the player unless the information has been revealed in play.`,files:exportAttachments(files),ephemeral:true});
      return true;
    }
    if(group==="character"&&["retire","death"].includes(sub)){
      const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,interaction.options.getString("character",true));
      if(!c) throw new Error("Character not found.");
      const s=db.getActiveSession(interaction.guildId);
      const status=sub==="death"?"dead":"retired";
      db.snapshotCampaign(interaction.guildId,{label:`Pre-${status} ${c.name}`,reason:`Automatic snapshot before marking ${c.name} ${status}`,createdBy:interaction.user.id});
      db.setCharacterStatus(c.id,status,s?.id||null);
      if(s){
        db.markSessionCharacterLeft(s.id,c.id);
      }
      await interaction.reply(`**${c.name}** is now marked **${status}**. You may create/select another character immediately; the GM will bring them in when the fiction allows.`);
      return true;
    }

    if(group==="character"&&sub==="level-up"){
      const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,interaction.options.getString("character",true));
      if(!c) throw new Error("Character not found or unavailable.");
      const from=Number(c.data?.level||1); if(from>=10) throw new Error("This character is already level 10.");
      const draft=db.createLevelupDraft(interaction.guildId,interaction.user.id,c.id,from,from+1,{legal_advancements:legalAdvancements(from+1),tier_achievement:tierAchievement(from+1)});
      await interaction.reply({content:formatLevelupDraft(draft,c),ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="level-choose"){
      const draft=db.latestLevelupDraft(interaction.guildId,interaction.user.id);
      if(!draft) throw new Error("No pending level-up draft. Start with `/vc-level level-up`.");
      const c=db.getCharacter(draft.character_id); if(!c||c.owner_user_id!==interaction.user.id) throw new Error("Level-up character is unavailable.");
      const plan=prepareLevelup(c,{
        advancementOne:interaction.options.getString("advancement_one",true),
        advancementTwo:interaction.options.getString("advancement_two",true),
        detailOne:interaction.options.getString("detail_one")||"",
        detailTwo:interaction.options.getString("detail_two")||"",
        domainCard:interaction.options.getString("domain_card",true),
        domain:interaction.options.getString("domain")||"",
        cardLevel:interaction.options.getInteger("card_level"),
        tierExperience:interaction.options.getString("tier_experience")||"",
        customCards:customDomainCards(gm)
      });
      const ready=db.updateLevelupDraft(draft.id,{...draft.choices,plan},"ready");
      await interaction.reply({content:formatLevelupDraft(ready,c)+"\n\nUse `/vc-level level-confirm` to commit this level-up.",ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="level-confirm"){
      const draft=db.latestLevelupDraft(interaction.guildId,interaction.user.id);
      if(!draft||draft.status!=="ready"||!draft.choices?.plan) throw new Error("No ready level-up draft. Use `/vc-level level-choose` first.");
      const c=db.getCharacter(draft.character_id); if(!c||c.owner_user_id!==interaction.user.id) throw new Error("Level-up character is unavailable.");
      db.snapshotCampaign(interaction.guildId,{label:`Pre-level ${c.name}`,reason:`Before ${c.name} level ${draft.from_level}→${draft.to_level}`,createdBy:interaction.user.id});
      const next=applyLevelupToData(c.data,draft.choices.plan);
      const updated=db.updateCharacterData(c.id,d=>{for(const k of Object.keys(d)) delete d[k]; Object.assign(d,next);});
      db.updateLevelupDraft(draft.id,draft.choices,"applied");
      db.audit(interaction.guildId,null,"player",interaction.user.id,"character_level_up",{character_id:c.id,from:draft.from_level,to:draft.to_level,plan:draft.choices.plan});
      await interaction.reply({content:`✅ **${updated.name}** is now **Level ${updated.data.level}**. A pre-level snapshot was created automatically.\n\n${formatSheet(updated)}`,ephemeral:true});
      return true;
    }

    if(group==="guest"&&sub==="create"){
      if(!isGM(db,interaction) && interaction.options.getUser("player")?.id && interaction.options.getUser("player").id!==interaction.user.id)
        throw new Error("Only a GM/admin may create a guest for another player.");
      const owner=interaction.options.getUser("player")?.id||interaction.user.id;
      const c=db.createCharacter(interaction.guildId,owner,interaction.options.getString("name",true),{}, {guest:true});
      await interaction.reply(`Created guest character **${c.name}** for <@${owner}>.`);
      return true;
    }
    if(group==="guest"&&sub==="claim"){
      const s=requireSession(db,interaction.guildId);
      const c=findGuest(db,interaction.guildId,interaction.options.getString("character",true),interaction.user.id);
      if(!c) throw new Error("Guest character not found or not assigned to you.");
      db.setPresence(s.id,interaction.user.id,"guest","offscreen");
      db.assignCharacter(s.id,interaction.user.id,c.id,{role:"guest",controlPolicy:"player_only"});
      if(s.assembly_phase!=="assembly" && s.assembly_mode!=="manual"){
        await interaction.deferReply({ephemeral:true});
        const result=await launchArrival({db,gm,guild:interaction.guild,userId:interaction.user.id,character:c,reason:"guest character drop-in"});
        await interaction.editReply(`You are now playing guest character **${c.name}** for this session.${result.planned?" Veilkeeper prepared an entry hook.":""}`);
      }else{
        await interaction.reply(`You are now playing guest character **${c.name}** for this session.`);
      }
      return true;
    }

    if(group==="npc"&&["offer","proxy"].includes(sub)){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may assign an NPC proxy.");
      const session=requireSession(db,interaction.guildId);
      const npcName=interaction.options.getString("npc",true).trim();
      const target=interaction.options.getUser("player",true);
      const control=interaction.options.getString("control",true);
      const objective=interaction.options.getString("objective")||"";
      const gmNotes=interaction.options.getString("gm_notes")||"";
      db.upsertPlayer(interaction.guildId,target.id,target.globalName||target.username);
      await interaction.deferReply({ephemeral:true});
      const generated=await gm.createNpcProxyPacket({guildId:interaction.guildId,userId:target.id,npcName,controlLevel:control,objective,gmNotes});
      const gmNote=generated.gm_note||"";
      const playerPacket={...generated}; delete playerPacket.gm_note;
      const status=sub==="offer"?"offered":"active";
      const proxy=db.upsertNpcProxy(interaction.guildId,session.id,{npcName,userId:target.id,controlLevel:control,status,playerPacket,gmNote});
      const delivery=await deliverNpcProxyPacket({db,guild:interaction.guild,proxy,offered:status==="offered"});
      db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,sub==="offer"?"npc_proxy_offer":"npc_proxy_assign",{npc:npcName,target_user_id:target.id,control,status,delivery:delivery.via});
      await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:sub==="offer"?"NPC proxy offered":"NPC proxy assigned",details:`NPC: ${npcName}\nPlayer: ${target.username} (${target.id})\nControl: ${control}\nDelivery: ${delivery.via}${gmNote?`\nPacket-generation note: ${gmNote}`:""}`});
      const relayText=delivery.via==="state_errors"?` Private delivery was blocked, so the sanitized package was posted to #state-errors for an admin GM to relay (ref ${delivery.ref}).`:delivery.ok?` Package delivered via **${delivery.via.replace("_"," ")}**.`:` Delivery failed and #state-errors is not configured/reachable; relay the package manually from this command's GM context.`;
      await interaction.editReply(`${status==="offered"?"Offered":"Assigned"} **${npcName}** to <@${target.id}> with **${npcControlLabel(control)}** control.${relayText}`);
      return true;
    }
    if(group==="npc"&&sub==="claim"){
      const session=requireSession(db,interaction.guildId);
      const proxy=db.findNpcProxy(session.id,interaction.options.getString("npc",true),{userId:interaction.user.id,statuses:["offered"]});
      if(!proxy) throw new Error("No matching NPC proxy offer was found for you.");
      const active=db.activateNpcProxy(proxy.id,interaction.user.id);
      db.audit(interaction.guildId,session.id,"player",interaction.user.id,"npc_proxy_claim",{npc:active.npc_name,control:active.control_level});
      await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:"NPC proxy claimed",details:`${interaction.user.username} accepted ${active.npc_name} (${active.control_level}).`});
      await interaction.reply({content:`You now control **${active.npc_name}** at **${npcControlLabel(active.control_level)}** level for this session. Use the supplied packet as the limit of your NPC knowledge/authority.`,ephemeral:true});
      return true;
    }
    if(group==="npc"&&sub==="decline"){
      const session=requireSession(db,interaction.guildId);
      const proxy=db.findNpcProxy(session.id,interaction.options.getString("npc",true),{userId:interaction.user.id,statuses:["offered"]});
      if(!proxy) throw new Error("No matching NPC proxy offer was found for you.");
      const declined=db.declineNpcProxy(proxy.id,interaction.user.id);
      db.audit(interaction.guildId,session.id,"player",interaction.user.id,"npc_proxy_decline",{npc:declined.npc_name});
      await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:"NPC proxy declined",details:`${interaction.user.username} declined ${declined.npc_name}.`});
      await interaction.reply({content:`Declined **${declined.npc_name}**.`,ephemeral:true});
      return true;
    }
    if(group==="npc"&&sub==="release"){
      const session=requireSession(db,interaction.guildId);
      const query=interaction.options.getString("npc",true);
      let proxy;
      if(isGM(db,interaction)) proxy=db.findNpcProxy(session.id,query,{statuses:["offered","active"]});
      else proxy=db.findNpcProxy(session.id,query,{userId:interaction.user.id,statuses:["offered","active"]});
      if(!proxy) throw new Error("NPC proxy assignment not found or not releasable by you.");
      const released=db.releaseNpcProxy(proxy.id);
      db.audit(interaction.guildId,session.id,isGM(db,interaction)?"human_gm":"player",interaction.user.id,"npc_proxy_release",{npc:released.npc_name});
      await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:"NPC proxy released",details:`${released.npc_name} is no longer human-controlled. Released by ${interaction.user.username}.`});
      await interaction.reply({content:`NPC proxy control of **${released.npc_name}** has ended. Veilkeeper resumes normal GM control of that NPC.`,ephemeral:true});
      return true;
    }
    if(group==="npc"&&sub==="status"){
      const session=requireSession(db,interaction.guildId);
      const rows=isGM(db,interaction)?db.listNpcProxies(session.id,{statuses:["offered","active"]}):db.listNpcProxies(session.id,{userId:interaction.user.id,statuses:["offered","active"]});
      const lines=rows.map(p=>`• **${p.npc_name}** — ${p.status} — ${npcControlLabel(p.control_level)}${isGM(db,interaction)?` — <@${p.discord_user_id}>`:""}`);
      await interaction.reply({content:lines.length?`**NPC Proxy Assignments**\n${lines.join("\n")}`:"No active/offered NPC proxy assignments are visible to you.",ephemeral:true});
      return true;
    }
    if(group==="npc"&&sub==="packet"){
      const session=requireSession(db,interaction.guildId);
      const proxy=db.findNpcProxy(session.id,interaction.options.getString("npc",true),{userId:interaction.user.id,statuses:["offered","active"]});
      if(!proxy) throw new Error("No matching NPC proxy assignment was found for you.");
      const delivery=await deliverNpcProxyPacket({db,guild:interaction.guild,proxy,offered:proxy.status==="offered"});
      if(delivery.ok) await interaction.reply({content:`NPC package for **${proxy.npc_name}** re-sent via **${delivery.via.replace("_"," ")}**.`,ephemeral:true});
      else await interaction.reply({content:`Could not privately deliver the packet. Reference: ${delivery.ref||"unavailable"}. Ask the admin GM to relay it from #state-errors.`,ephemeral:true});
      return true;
    }

    if(group==="encounter"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const session=requireSession(db,interaction.guildId);
      const lib=encounterLibrary(gm);
      if(sub==="world"){
        const input=JSON.parse(interaction.options.getString("json",true));
        const result=manageWorldEncounter(db,interaction.guildId,input,interaction.user.id,lib);
        await interaction.reply({ephemeral:true,content:`World encounter ${result.status}: ${result.record_key}. Combat is not forced.`,
          files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"world-encounter.json"})]});return true;
      }
      if(sub==="build"){
        const roster=livePcRoster(db,session.id);
        if(roster.length<2) throw new Error("The multiplayer encounter builder requires at least two present player characters.");
        const difficulty=interaction.options.getString("difficulty")||"standard";
        const style=interaction.options.getString("style")||"balanced";
        const tierOpt=interaction.options.getString("tier")||"auto";
        const tier=tierOpt==="auto"?partyTier(roster):Number(tierOpt);
        const base=baseBattlePoints(roster.length);
        let budget=base+(DIFFICULTY_ADJUSTMENTS[difficulty]??0);
        let composition=[]; let temp=null; let calc=null;
        for(let i=0;i<4;i++){
          composition=autoBuildComposition({adversaries:lib.adversaries,tier,budget,pcCount:roster.length,style});
          temp={tier,base_bp:base,difficulty,custom_adjustment_bp:0,damage_boosted:0,composition};
          calc=recomputeBudget(temp);
          if(calc.budget===budget) break;
          budget=calc.budget;
        }
        const envQ=interaction.options.getString("environment");
        const env=lib.findEnvironment(envQ,tier);
        if(envQ&&!env) throw new Error(`Environment not found at Tier ${tier}: ${envQ}`);
        const objective=interaction.options.getString("objective")||defaultObjective(style);
        const existing=db.getCurrentEncounter(session.id);
        if(existing && existing.status==="active") throw new Error("An encounter is already active. End it before building the next encounter.");
        if(existing && existing.status==="planned") db.setEncounterStatus(existing.id,"ended");
        const e=db.createEncounter(interaction.guildId,session.id,{
          tier,pc_count:roster.length,difficulty,style,base_bp:base,budget_bp:calc.budget,spent_bp:calc.spent,
          objective,environment_name:env?.name||"",composition,adjustments:calc.derived,
          notes:`Auto-built from live roster: ${roster.map(r=>`${r.name} L${r.data?.level||1}`).join(", ")}`
        });
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_build",{encounter_id:e.id,tier,pc_count:roster.length,budget:e.budget_bp,spent:e.spent_bp,style,difficulty});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:`Encounter #${e.encounter_number} built`,details:`Tier ${tier} • ${roster.length} PCs • ${e.spent_bp}/${e.budget_bp} BP • ${style}/${difficulty}`});
        await interaction.reply({content:encounterSummary(e),ephemeral:true});
        return true;
      }
      if(sub==="status"){
        const e=db.getCurrentEncounter(session.id);
        await interaction.reply({content:encounterSummary(e),ephemeral:true}); return true;
      }
      if(sub==="adjust"){
        let e=db.getCurrentEncounter(session.id); if(!e) throw new Error("No planned or active encounter.");
        const difficulty=interaction.options.getString("difficulty")||e.difficulty;
        const boost=interaction.options.getBoolean("boost_damage");
        const custom=interaction.options.getInteger("custom_delta");
        const reason=interaction.options.getString("reason")||"";
        const patch={difficulty,damage_boosted:boost===null?!!e.damage_boosted:boost,custom_adjustment_bp:custom===null?e.custom_adjustment_bp:custom,notes:reason?`${e.notes||""}\nAdjustment: ${reason}`.trim():e.notes};
        let trial={...e,...patch}; let calc=recomputeBudget(trial);
        let composition=e.composition;
        const rebalance=interaction.options.getBoolean("rebalance")||false;
        if(rebalance){
          if(e.status!=="planned") throw new Error("Rebalance is only allowed before an encounter starts.");
          composition=autoBuildComposition({adversaries:lib.adversaries,tier:e.tier,budget:calc.budget,pcCount:e.pc_count,style:e.style});
          trial={...trial,composition}; calc=recomputeBudget(trial);
        }
        e=db.updateEncounter(e.id,{...patch,composition,budget_bp:calc.budget,spent_bp:calc.spent,adjustments:calc.derived});
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_adjust",{encounter_id:e.id,difficulty:e.difficulty,boosted_damage:!!e.damage_boosted,custom:e.custom_adjustment_bp,budget:e.budget_bp,spent:e.spent_bp,rebalance});
        await interaction.reply({content:encounterSummary(e),ephemeral:true}); return true;
      }
      if(sub==="add"){
        let e=db.getCurrentEncounter(session.id); if(!e) throw new Error("No planned or active encounter.");
        const a=lib.findAdversary(interaction.options.getString("adversary",true)); if(!a) throw new Error("Adversary not found in Veiled City content.");
        if(a.tier>e.tier) throw new Error(`Tier ${a.tier} adversary exceeds this Tier ${e.tier} encounter. Build/adjust at the higher tier instead.`);
        const qty=interaction.options.getInteger("quantity")||1;
        const comp=structuredClone(e.composition||[]); const cost=battlePointCost(a.type);
        let row=comp.find(x=>x.name===a.name);
        if(!row){ row={name:a.name,type:a.type,tier:a.tier,bp_cost:cost,quantity:0,unit_count:0,spent_bp:0}; comp.push(row); }
        row.quantity+=qty; row.unit_count+=a.type==="Minion"?qty*e.pc_count:qty; row.spent_bp+=qty*cost;
        const calc=recomputeBudget({...e,composition:comp});
        e=db.updateEncounter(e.id,{composition:comp,budget_bp:calc.budget,spent_bp:calc.spent,adjustments:calc.derived});
        await interaction.reply({content:encounterSummary(e),ephemeral:true}); return true;
      }
      if(sub==="remove"){
        let e=db.getCurrentEncounter(session.id); if(!e) throw new Error("No planned or active encounter.");
        const q=interaction.options.getString("adversary",true).toLowerCase(); const qty=interaction.options.getInteger("quantity")||1;
        const comp=structuredClone(e.composition||[]); const row=comp.find(x=>x.name.toLowerCase()===q)||comp.find(x=>x.name.toLowerCase().includes(q));
        if(!row) throw new Error("That adversary is not in the current encounter.");
        const remove=Math.min(qty,row.quantity); row.quantity-=remove; row.unit_count-=row.type==="Minion"?remove*e.pc_count:remove; row.spent_bp-=remove*row.bp_cost;
        if(row.quantity<=0) comp.splice(comp.indexOf(row),1);
        const calc=recomputeBudget({...e,composition:comp});
        e=db.updateEncounter(e.id,{composition:comp,budget_bp:calc.budget,spent_bp:calc.spent,adjustments:calc.derived});
        await interaction.reply({content:encounterSummary(e),ephemeral:true}); return true;
      }
      if(sub==="start"){
        let e=db.getCurrentEncounter(session.id); if(!e||e.status!=="planned") throw new Error("No planned encounter is available to start.");
        validateWorldEncounterActivation(db,interaction.guildId,e);
        db.snapshotCampaign(interaction.guildId,{label:`Pre-encounter ${e.encounter_number}`,reason:"Automatic snapshot before encounter start",createdBy:interaction.user.id});
        const combatants=db.transaction(()=>{
          e=db.setEncounterStatus(e.id,"active");
          db.captureEncounterStartState(e.id);
          e=db.getEncounter(e.id);
          const rows=db.initializeCombatants(e.id,worldCombatantDrafts(db,interaction.guildId,e,buildCombatants(e,lib)));
          bindWorldCombatants(db,interaction.guildId,e,rows);return rows;
        });
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_start",{encounter_id:e.id,budget:e.budget_bp,spent:e.spent_bp,combatants:combatants.length});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:`Encounter #${e.encounter_number} started`,details:`${e.spent_bp}/${e.budget_bp} BP • ${e.objective}\nDeterministic combatants initialized: ${combatants.length}`});
        await interaction.reply({content:`Encounter #${e.encounter_number} is now **active** with **${combatants.length}** tracked adversary combatants. ${e.spent_bp>e.budget_bp?`⚠️ Composition is ${e.spent_bp-e.budget_bp} BP over budget.`:""}`,ephemeral:true}); return true;
      }
      if(sub==="combatants"){
        const e=db.getCurrentEncounter(session.id); if(!e||e.status!=="active") throw new Error("No active encounter.");
        const rows=db.listCombatants(e.id);
        const roster=db.roster(session.id); const counts=e.combat_state?.spotlight?.counts||{};
        const spotlight=roster.filter(r=>r.character_id&&["present","guest","late"].includes(r.presence)).map(r=>`${r.name}: ${counts[r.character_id]||0}`).join(" • ")||"none";
        const body=rows.length?rows.map(combatantLine).join("\n"):"No adversary combatants initialized.";
        await interaction.reply({content:`**Encounter #${e.encounter_number} Combat State**\nFear: **${db.getCampaign(interaction.guildId)?.fear||0}/12**\nSpotlight actions: ${spotlight}\n\n${body}`.slice(0,1950),ephemeral:true});
        return true;
      }
      if(["damage","heal","stress","condition","combatant-status"].includes(sub)){
        const e=db.getCurrentEncounter(session.id); if(!e||e.status!=="active") throw new Error("No active encounter.");
        const target=interaction.options.getString("target",true); const c=db.findCombatant(e.id,target); if(!c) throw new Error("Combatant not found. Use `/vc-combat combatants` for IDs.");
        let next=c; let detail="";
        if(sub==="damage"){
          const amount=interaction.options.getInteger("amount",true); const marks=hpMarksForDamage(c,amount);
          const hp=Math.max(0,c.hp_current-marks); next=db.updateCombatant(c.id,{hp_current:hp,status:hp<=0?"defeated":c.status});
          detail=`${amount} damage → ${marks} HP marked`;
        }else if(sub==="heal"){
          const hp=interaction.options.getInteger("hp",true); next=db.updateCombatant(c.id,{hp_current:Math.min(c.hp_max,c.hp_current+hp),status:c.status==="defeated"?"active":c.status}); detail=`restored ${hp} HP`;
        }else if(sub==="stress"){
          const delta=interaction.options.getInteger("delta",true); next=db.updateCombatant(c.id,{stress_current:c.stress_current+delta}); detail=`Stress ${delta>=0?"+":""}${delta}`;
        }else if(sub==="condition"){
          const name=interaction.options.getString("condition",true).trim(); const remove=interaction.options.getBoolean("remove")||false; let cond=[...(c.conditions||[])];
          if(remove) cond=cond.filter(x=>x.toLowerCase()!==name.toLowerCase()); else if(!cond.some(x=>x.toLowerCase()===name.toLowerCase())) cond.push(name);
          next=db.updateCombatant(c.id,{conditions:cond}); detail=`${remove?"removed":"added"} condition/effect: ${name}`;
        }else{
          const status=interaction.options.getString("status",true); next=db.updateCombatant(c.id,{status}); detail=`status → ${status}`;
        }
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,`combat_${sub}`,{encounter_id:e.id,combatant_id:c.id,detail});
        await interaction.reply({content:`${detail}\n${combatantLine(next)}`,ephemeral:true});
        return true;
      }
      if(sub==="end"){
        let e=db.getCurrentEncounter(session.id); if(!e) throw new Error("No planned or active encounter.");
        const mode=interaction.options.getString("aftermath")||gm.config.encounterAftermathMode||"auto";
        e=db.setEncounterStatus(e.id,"ended");
        recordWorldEncounterOutcome(db,interaction.guildId,e);
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_end",{encounter_id:e.id,aftermath_mode:mode});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:`Encounter #${e.encounter_number} ended`,details:`Final composition budget: ${e.spent_bp}/${e.budget_bp} BP.
Aftermath mode: ${mode}`});
        if(mode==="none"){
          await interaction.reply({content:`Encounter #${e.encounter_number} ended. Aftermath generation skipped.`,ephemeral:true}); return true;
        }
        await interaction.deferReply({ephemeral:true});
        const draft=await gm.buildEncounterAftermath({guildId:interaction.guildId,encounter:e});
        db.createEncounterAftermath(e.id,interaction.guildId,session.id,draft,"pending");
        if(mode==="confirm"){
          await interaction.editReply(`Encounter #${e.encounter_number} ended. **Aftermath awaiting GM confirmation.**

${draft.player_summary||"No player-safe summary."}

GM notes: ${draft.gm_notes||"—"}
Use \`/vc-encounter aftermath-confirm\` or \`/vc-encounter aftermath-discard\`.`.slice(0,1950)); return true;
        }
        await applyEncounterAftermath({db,guild:interaction.guild,encounter:e,draft,actorId:interaction.user.id});
        await interaction.editReply(`Encounter #${e.encounter_number} ended and aftermath was applied automatically.`); return true;
      }
      if(["aftermath-status","aftermath-confirm","aftermath-discard"].includes(sub)){
        const e=latestEncounterForSession(db,session.id); if(!e) throw new Error("No encounter exists in this session.");
        const a=db.getEncounterAftermath(e.id);
        if(sub==="aftermath-status"){
          await interaction.reply({content:a?`**Encounter #${e.encounter_number} aftermath — ${a.status}**
${a.draft.player_summary||"No summary."}
${isGM(db,interaction)&&a.draft.gm_notes?`
GM notes: ${a.draft.gm_notes}`:""}`.slice(0,1950):"No aftermath draft exists for the latest encounter.",ephemeral:true}); return true;
        }
        if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
        if(!a||a.status!=="pending") throw new Error("No pending aftermath exists for the latest encounter.");
        if(sub==="aftermath-discard"){
          db.setEncounterAftermathStatus(e.id,"discarded");
          await interaction.reply({content:`Encounter #${e.encounter_number} aftermath discarded; no proposed consequences were applied.`,ephemeral:true}); return true;
        }
        await interaction.deferReply({ephemeral:true});
        const applied=await applyEncounterAftermath({db,guild:interaction.guild,encounter:e,draft:a.draft,actorId:interaction.user.id});
        const warning=applied.outputErrors.length?` State was committed, but ${applied.outputErrors.length} delivery/logging step(s) failed (${applied.outputErrors.map(x=>x.ref).join(", ")}); do not confirm again.`:"";
        await interaction.editReply(`Encounter #${e.encounter_number} aftermath confirmed and applied.${warning}`); return true;
      }
    }

    if(group==="relationship"){
      if(sub==="list"){
        const q=interaction.options.getString("character");
        let c=q?findOwnedAnyCharacter(db,interaction.guildId,interaction.user.id,q):activeCharacterForUser(db,interaction.guildId,interaction.user.id);
        if(isGM(db,interaction)&&q) c=db.findGuildCharacter(interaction.guildId,q,{includeClosed:true})||c;
        let rows=db.listRelationships(interaction.guildId,{includeGM:isGM(db,interaction),characterId:c?.id||null,userId:interaction.user.id});
        if(c) rows=rows.filter(r=>r.from_key===c.id||r.to_key===c.id||r.source_character_id===c.id);
        await interaction.reply({content:rows.length?rows.slice(0,30).map(relationshipLine).join("\n").slice(0,1950):"No matching relationships are recorded.",ephemeral:true}); return true;
      }
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      if(sub==="set"){
        const ft=interaction.options.getString("from_type",true), tt=interaction.options.getString("to_type",true);
        const from=resolveEndpoint(db,interaction.guildId,ft,interaction.options.getString("from",true));
        const to=resolveEndpoint(db,interaction.guildId,tt,interaction.options.getString("to",true));
        const row=db.upsertRelationship(interaction.guildId,{fromType:ft,fromKey:from.key,fromLabel:from.label,toType:tt,toKey:to.key,toLabel:to.label,relationshipType:interaction.options.getString("relation",true),score:interaction.options.getInteger("score",true),visibility:interaction.options.getString("visibility")||"party",note:interaction.options.getString("note")||"",source:"human_gm",sourceCharacterId:ft==="character"?from.key:null});
        await interaction.reply({content:`Saved relationship:\n${relationshipLine(row)}`,ephemeral:true}); return true;
      }
      if(sub==="adjust"){
        const q=interaction.options.getString("id",true).toLowerCase(); const rows=db.listRelationships(interaction.guildId,{includeGM:true}); const row=rows.find(r=>r.id.toLowerCase().startsWith(q)); if(!row) throw new Error("Relationship ID not found.");
        const next=db.adjustRelationship(row.id,interaction.options.getInteger("delta",true)); await interaction.reply({content:`Updated relationship:\n${relationshipLine(next)}`,ephemeral:true}); return true;
      }
      if(sub==="import-hooks"){
        const q=interaction.options.getString("character"); let cid=null; if(q){const c=db.findGuildCharacter(interaction.guildId,q,{includeClosed:true}); if(!c) throw new Error("Campaign character not found."); cid=c.id;}
        const result=db.importExistingHookRelationships(interaction.guildId,{characterId:cid});
        await interaction.reply({content:`Hook relationship backfill complete. Characters processed: **${result.processed}** • new relationship edges: **${result.created}** • already imported/skipped: **${result.skipped}**. This importer is one-time per character.`,ephemeral:true}); return true;
      }
    }

    if(group==="handout"){
      const gmUser=isGM(db,interaction);
      if(sub==="custody"||sub==="evidence"){
        const result=sub==="custody"?manageEvidence(db,interaction.guildId,JSON.parse(interaction.options.getString("json",true)),interaction.user.id,{gm:gmUser})
          :evidenceView(db,interaction.guildId,interaction.options.getString("id",true),interaction.user.id,{gm:gmUser});
        await interaction.reply({ephemeral:true,content:"Scoped evidence continuity; custody and interpretations do not establish guilt or canon.",
          files:[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:"evidence-continuity.json"})]});return true;
      }
      if(sub==="list"){
        const c=activeCharacterForUser(db,interaction.guildId,interaction.user.id);
        const rows=db.listHandoutsFor(interaction.guildId,interaction.user.id,{characterId:c?.id||null,includeGM:gmUser,limit:40});
        await interaction.reply({content:rows.length?rows.map(h=>`• \`${h.id.slice(0,8)}\` **${h.title}** — ${h.kind} / ${h.authority} / ${h.visibility}`).join("\n").slice(0,1950):"No visible handouts/evidence are recorded.",ephemeral:true}); return true;
      }
      if(["show","export"].includes(sub)){
        const h=db.findHandout(interaction.guildId,interaction.options.getString("id",true)); if(!h||!handoutVisibleTo(db,interaction.guildId,interaction.user.id,h,gmUser)) throw new Error("Handout not found or not visible to you.");
        if(sub==="show"){await interaction.reply({content:handoutSummary(h).slice(0,1950),ephemeral:true});return true;}
        const format=interaction.options.getString("format")||"markdown"; const files=handoutFiles(h,format); await interaction.reply({content:`Evidence export: **${h.title}** (${format}).`,files:exportAttachments(files),ephemeral:true});return true;
      }
      if(!gmUser) throw new Error("GM/admin permission required.");
      if(sub==="archive"||sub==="deliver"){
        const h=db.findHandout(interaction.guildId,interaction.options.getString("id",true)); if(!h) throw new Error("Handout not found.");
        if(sub==="archive"){db.archiveHandout(h.id);await interaction.reply({content:`Archived **${h.title}**.`,ephemeral:true});return true;}
        const result=await deliverHandout({db,guild:interaction.guild,handout:h,format:"markdown"}); await interaction.reply({content:`Delivery ${result.ok?"completed":"failed"} via **${result.via}**.`,ephemeral:true}); return true;
      }
      if(["create","generate"].includes(sub)){
        const title=interaction.options.getString("title",true); const visibility=interaction.options.getString("visibility")||"party"; const authority=interaction.options.getString("authority")||"canonical";
        const targetUser=interaction.options.getUser("player")?.id||null; const cq=interaction.options.getString("character"); const targetChar=cq?db.findGuildCharacter(interaction.guildId,cq,{includeClosed:true}):null;
        if(visibility==="player"&&!targetUser) throw new Error("Specific player visibility requires the player option.");
        if(visibility==="character"&&!targetChar) throw new Error("Specific character visibility requires the character option.");
        let row;
        if(sub==="create"){
          const facts=factList(interaction.options.getString("facts")||"");
          row=db.createHandout(interaction.guildId,{sessionId:db.getActiveSession(interaction.guildId)?.id||null,title,kind:interaction.options.getString("kind")||"document",authority,visibility,subjectUserId:targetUser,subjectCharacterId:targetChar?.id||null,content:interaction.options.getString("content",true),canonicalFacts:facts,source:"human_gm"});
        }else{
          await interaction.deferReply({ephemeral:true});
          const draft=await gm.generateHandout({guildId:interaction.guildId,userId:targetUser,characterId:targetChar?.id||null,title,kind:interaction.options.getString("kind",true),facts:factList(interaction.options.getString("facts",true)),authority,visibility,caseKey:interaction.options.getString("case")||"",npcKey:interaction.options.getString("npc")||"",locationKey:interaction.options.getString("location")||""});
          row=db.transaction(()=>{
            const source=indexWorldEvent(db,interaction.guildId,{key:`gm-artifact-input:${interaction.id}`,kind:"gm_artifact_source",
              title:"Authenticated GM-supplied artifact facts; generated presentation is not truth",source_id:interaction.user.id,
              visibility,subject_key:targetChar?.id||targetUser||undefined,details:{canonical_facts:draft.canonical_facts,declared_by:interaction.user.id}},interaction.user.id);
            return db.createHandout(interaction.guildId,{sessionId:db.getActiveSession(interaction.guildId)?.id||null,title:draft.title,
              kind:draft.kind,authority:draft.authority,visibility:draft.visibility,subjectUserId:draft.target_user_id||null,
              subjectCharacterId:draft.target_character_id||null,content:draft.player_visible_text,canonicalFacts:draft.canonical_facts,
              caseKey:draft.case_key,npcKey:draft.npc_key,locationKey:draft.location_key,source:"ai_handout",
              metadata:{generated:true,epistemic:{kind:"testimony",source_refs:[source.event_key],perspective:`gm:${interaction.user.id}`},
                authority:"Only exact human-supplied canonical_facts authorized; generated presentation is not additional truth"}});
          });
        }
        const delivery=await deliverHandout({db,guild:interaction.guild,handout:row,format:"markdown"});
        const msg=`Created **${row.title}** (\`${row.id.slice(0,8)}\`) and ${delivery.ok?`delivered via ${delivery.via}`:"stored it; delivery was unavailable"}.`;
        if(interaction.deferred) await interaction.editReply(msg); else await interaction.reply({content:msg,ephemeral:true}); return true;
      }
    }

    if(group==="party"&&sub==="establish"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may establish the continuing party.");
      const s=requireSession(db,interaction.guildId);
      const plan=db.getAssemblyPlan(s.id)||{};
      const priorParty=db.getPartyState(interaction.guildId);
      const party=db.establishParty(interaction.guildId,s.id,{name:interaction.options.getString("name")||"",bonds:plan.bonds||[]});
      const memberNames=(party.members||[]).map(m=>m.name);
      if(!priorParty.established && Number(db.getCampaign(interaction.guildId)?.fear||0)===0) db.changeFear(interaction.guildId,memberNames.length);
      if(!memberNames.length) throw new Error("No present characters are available to establish as a party.");
      db.addFact(interaction.guildId,{
        category:"party",key:`party-established-${s.id}`,
        content:`An ongoing working group has been established among ${memberNames.join(", ")}${party.name?` under the name "${party.name}"`:""}.`,
        visibility:"party",sessionId:s.id,source:"human_gm"
      });
      await postPlayMessage({db,guild:interaction.guild,content:`**Working group established:** ${party.name?`**${party.name}** — `:""}${memberNames.join(", ")}. Future sessions may treat these characters as an existing team unless the fiction changes.`,sessionId:s.id});
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:"Continuing party established",details:`Members: ${memberNames.join(", ")}\nProposed bonds retained: ${(party.bonds||[]).length}`});
      await interaction.reply({content:"Continuing party state saved.",ephemeral:true});
      return true;
    }
    if(group==="party"&&sub==="status"){
      const party=db.getPartyState(interaction.guildId);
      const s=db.getActiveSession(interaction.guildId);
      const members=party.members?.length?party.members.map(m=>m.name).join(", "):"none";
      const bonds=party.bonds?.length?party.bonds.slice(0,5).map(b=>`• ${b.from_character} → ${b.to_character}: ${b.reason}`).join("\n"):"No stored practical links.";
      await interaction.reply({content:[
        `**Continuing Party**`,
        `Established: **${party.established?"yes":"no"}**${party.name?` • Name: **${party.name}**`:""}`,
        `Members: ${members}`,
        s?`Current session phase: **${s.assembly_phase}**`:"",
        bonds
      ].filter(Boolean).join("\n").slice(0,1900),ephemeral:true});
      return true;
    }

    if(group==="player"&&sub==="private-channel"){
      const campaign=db.getCampaign(interaction.guildId);
      assertPlayerPrivateChannel({guild:interaction.guild,channel:interaction.channel,userId:interaction.user.id,gmRoleId:campaign?.gm_role_id||null});
      db.setPrivateChannel(interaction.guildId,interaction.user.id,interaction.channelId);
      await interaction.reply({content:"This channel passed Veilkeeper's privacy validation and is now your preferred private GM channel.",ephemeral:true});
      return true;
    }
    if(group==="player"&&sub==="accessibility"){
      const patch={};
      for(const k of ["length","mechanics"]) { const v=interaction.options.getString(k); if(v) patch[k==="length"?"response_length":k]=v; }
      const sr=interaction.options.getBoolean("screen_reader"); if(sr!==null) patch.screen_reader=sr;
      const next=db.setAccessibility(interaction.guildId,interaction.user.id,patch);
      await interaction.reply({content:`Accessibility preferences: \`${JSON.stringify(next)}\``,ephemeral:true});
      return true;
    }

    if(group==="roll"&&["pending","result"].includes(sub)){
      const rows=sub==="result"?[ownedRollRequest(db,interaction.guildId,interaction.user.id,interaction.options.getString("request",true))]
        :pendingRollRequests(db,interaction.guildId,interaction.user.id);
      const chunks=chunkTextLines((rows.map(row=>formatRollRequest(row,{user:interaction.user.id})).join("\n\n")||"No current pending roll requests.").split("\n"));
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const content of chunks.slice(1)) await interaction.followUp({content,ephemeral:true});return true;
    }
    if(group==="roll"&&sub==="adjudicate"){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required to adjudicate rules and feasibility.");
      const source=adjudicateRollSource(db,interaction.guildId,JSON.parse(interaction.options.getString("json",true)),interaction.user.id);
      await interaction.reply({content:`Saved reviewed roll source ${source.event_key}. No PC resource or roll was changed.`,ephemeral:true});return true;
    }
    if(group==="roll"&&sub==="contribute"){
      const row=contributeRoll(db,interaction.guildId,interaction.user.id,JSON.parse(interaction.options.getString("json",true)));
      const chunks=chunkTextLines(formatRollRequest(row,{user:interaction.user.id}).split("\n"));
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const content of chunks.slice(1)) await interaction.followUp({content,ephemeral:true});
      if(interaction.guild) await publishRollAmendment(db,interaction.guildId,row,async(user,content,sessionId,characterId)=>
        (await sendPlayerPrivate({db,guild:interaction.guild,userId:user,content,sessionId,characterId})).ok);
      return true;
    }
    if(group==="roll"&&sub==="request"){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required to adjudicate requests.");
      const row=prepareRollRequest(db,interaction.guildId,JSON.parse(interaction.options.getString("json",true)),interaction.user.id);
      const chunks=chunkTextLines(formatRollRequest(row).split("\n"));
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const content of chunks.slice(1)) await interaction.followUp({content,ephemeral:true});return true;
    }
    if(group==="roll"&&sub==="duality"){
      const s=requireSession(db,interaction.guildId);
      const a=db.controlledAssignment(s.id,interaction.user.id);
      const reaction=interaction.options.getBoolean("reaction")||false;
      if(a?.character_id&&db.getCityCalendar(interaction.guildId).flags.roll_requests===true
        &&pendingRollRequests(db,interaction.guildId,interaction.user.id).length)
        throw new StateConflictError("A sheet-derived request is pending. Raw rolls cannot resolve or bypass it; seek native request adjudication.");
      const r=dualityRoll({
        modifier:interaction.options.getInteger("modifier")||0,
        experience:interaction.options.getInteger("experience")||0,
        advantage:interaction.options.getInteger("advantage")||0,
        disadvantage:interaction.options.getInteger("disadvantage")||0
      });
      db.transaction(()=>{
        db.addRoll(interaction.guildId,s.id,interaction.user.id,a?.character_id||null,reaction?"reaction":"duality",{...r,reaction});
        applyRollOutcome(db,interaction.guildId,s.id,a?.character_id?[a.character_id]:[],r,{reaction});
      });
      const updated=a?.character_id?db.getCharacter(a.character_id):null;
      const resourceNote=reaction?"":r.duality==="Fear"?` • GM Fear ${db.getCampaign(interaction.guildId).fear}/12`
        :updated?` • Hope ${updated.data.resources.hope}/6${r.duality==="Critical"?"; cleared 1 Stress":""}`:"";
      const adv=r.adv_dice.length?` • d6 [${r.adv_dice.join(", ")}] = ${r.adv_net>=0?"+":""}${r.adv_net}`:"";
      await interaction.reply(`🎲 **${reaction?"Reaction":"Duality"}:** Hope **${r.hope}** / Fear **${r.fear}**${adv} • modifiers ${r.modifier+r.experience>=0?"+":""}${r.modifier+r.experience} → **${r.total} — ${r.duality}**${resourceNote}`);
      return true;
    }
    if(group==="roll"&&sub==="damage"){
      const s=requireSession(db,interaction.guildId);
      const a=db.controlledAssignment(s.id,interaction.user.id);
      const r=parseDice(interaction.options.getString("dice",true));
      db.addRoll(interaction.guildId,s.id,interaction.user.id,a?.character_id||null,"dice",r);
      await interaction.reply(`🎲 **${r.expression}:** [${r.dice.join(", ")}] ${r.modifier?`${r.modifier>0?"+":""}${r.modifier}`:""} = **${r.total}**`);
      return true;
    }

    if(group==="rules"&&sub==="ask"){
      const s=db.getActiveSession(interaction.guildId);
      const a=s?db.controlledAssignment(s.id,interaction.user.id):null;
      if(!interaction.deferred&&!interaction.replied) await acknowledgeRules(interaction,sub);
      const r=await gm.answerRulesQuestion({
        guildId:interaction.guildId,userId:interaction.user.id,userName:interaction.member?.displayName||interaction.user.username,
        question:interaction.options.getString("question",true),characterId:a?.character_id||null
      });
      const src=r.sources?.length?`\n\n_Reference: ${r.sources.join(", ")}_`:"";
      const basis=r.basis?`\n**Basis:** ${r.basis}`:"";
      await interaction.editReply(`**Rules desk — ${r.classification}:** ${r.answer}${basis}${src}`.slice(0,1950));
      return true;
    }
    if(group==="rules"&&sub==="ruling"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      db.snapshotCampaign(interaction.guildId,{label:"Pre-rules ruling",reason:"Automatic snapshot before changing authoritative GM rules rulings",createdBy:interaction.user.id});
      const row=db.upsertRulesRuling(interaction.guildId,{key:interaction.options.getString("key",true),question:interaction.options.getString("question",true),ruling:interaction.options.getString("ruling",true),createdBy:interaction.user.id});
      await replyOrEdit(interaction,{content:`Saved **GM_RULING** \`${row.ruling_key}\`: ${row.ruling}`,ephemeral:true});
      return true;
    }
    if(group==="rules"&&sub==="rulings"){
      const rows=db.searchRulesRulings(interaction.guildId,"");
      await replyOrEdit(interaction,{content:rows.length?`**Campaign GM Rulings**\n${rows.map(r=>`• \`${r.ruling_key}\` — ${r.question}: **${r.ruling}**`).join("\n")}`.slice(0,1950):"No saved GM rulings.",ephemeral:true});
      return true;
    }

    if(group==="downtime"&&sub==="open"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      if(db.getActiveSession(interaction.guildId)) throw new Error("Downtime can only be opened between sessions.");
      const last=db.latestEndedSession(interaction.guildId);
      const cycle=db.openDowntime(interaction.guildId,{label:interaction.options.getString("label")||"Between Sessions",sourceSessionId:last?.id||null,notes:interaction.options.getString("notes")||"",openedBy:interaction.user.id});
      await interaction.reply({content:`Opened downtime cycle **${cycle.label}**. Players may submit projects with \`/vc-downtime project\`.`,ephemeral:false});
      return true;
    }
    if(group==="downtime"&&sub==="project"){
      const cycle=db.currentDowntime(interaction.guildId); if(!cycle||cycle.status!=="open") throw new Error("No open downtime cycle.");
      const q=interaction.options.getString("character"); const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,q); if(!c) throw new Error("No eligible owned character found.");
      const row=db.addDowntimeProject(cycle.id,interaction.guildId,{userId:interaction.user.id,characterId:c.id,type:interaction.options.getString("type",true),title:interaction.options.getString("title",true),objective:interaction.options.getString("objective",true),maxProgress:interaction.options.getInteger("countdown")||4,visibility:interaction.options.getString("visibility")||"party"});
      await interaction.reply({content:`Submitted **${row.title}** for **${c.name}** (${row.project_type}, ${row.max_progress}-step project).`,ephemeral:row.visibility!=="party"});
      return true;
    }
    if(group==="downtime"&&sub==="status"){
      const cycle=db.currentDowntime(interaction.guildId); if(!cycle){await interaction.reply({content:"No open downtime cycle.",ephemeral:true}); return true;}
      await interaction.reply({content:downtimeStatusText(cycle,visibleDowntimeProjects(db,cycle,interaction.user.id,isGM(db,interaction))),ephemeral:true});
      return true;
    }
    if(group==="downtime"&&sub==="resolve"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      if(db.getActiveSession(interaction.guildId)) throw new Error("Resolve downtime between sessions, not during an active session.");
      const cycle=db.currentDowntime(interaction.guildId); if(!cycle||cycle.status!=="open") throw new Error("No open downtime cycle.");
      const projects=db.listDowntimeProjects(cycle.id); if(!projects.length) throw new Error("No downtime projects were submitted.");
      db.snapshotCampaign(interaction.guildId,{label:`Pre-downtime ${cycle.label}`,reason:"Automatic snapshot before downtime resolution",createdBy:interaction.user.id});
      await interaction.deferReply({ephemeral:true});

      // Generate both layers before committing either one, so a model/API failure cannot leave a half-resolved downtime cycle.
      const resolved=await gm.resolveDowntime({guildId:interaction.guildId,cycle:{...cycle,status:"resolving"},projects});
      const director=db.isDirectorPaused(interaction.guildId)
        ?{act:false,public_narration:"",private_messages:[],events:[],handouts:[],relationships:[],gm_notes:"World Director was paused by the GM; downtime world movement was intentionally skipped."}
        :normalizeDirectorConfidence(await gm.runWorldDirector({
          guildId:interaction.guildId,layer:"downtime",cycle:{...cycle,status:"resolving"},projects,
          trigger:{cycle_label:cycle.label,project_summary:resolved.summary||"",project_results:resolved.project_results||[]}
        }));
      const directorHasOutputs=(director.events||[]).length||(director.relationships||[]).length||(director.handouts||[]).length||(director.npc_memories||[]).length||(director.npc_knowledge||[]).length||(director.npc_goals||[]).length||(director.simulation_updates||[]).length||(director.private_messages||[]).length||String(director.public_narration||"").trim();
      if(!director.act&&directorHasOutputs) throw new Error("Downtime world director returned act=false with non-empty outputs.");
      const npcPrepared=await prepareNpcDirector({db,gm,guildId:interaction.guildId,layer:"downtime",
        cycleKey:`downtime:${cycle.id}`,query:`${cycle.label} ${resolved.summary||""}`,minutes:interaction.options.getInteger("minutes")||0});

      const byId=new Map(projects.map(p=>[p.id,p]));
      const projectOutputs=[];
      const committed=db.transaction(()=>{
        for(const r of resolved.project_results||[]){
          const p=byId.get(r.project_id); if(!p) continue;
          const progress=Math.max(0,Math.min(p.max_progress,Number(p.progress||0)+Number(r.progress_delta||0)));
          const status=r.status==="completed"||progress>=p.max_progress?"completed":r.status;
          const updated=db.updateDowntimeProject(p.id,{progress,status,result:r.result||""});
          projectOutputs.push({project:updated,message:`**Downtime — ${p.title}**\n${r.result||"Resolved."}\nProgress: ${progress}/${p.max_progress} • ${status}`});
        }
        const dscope={mode:"party",actorUserId:null,actorCharacterId:null};
        const projectMutation=applyAuthoritativeMutation(db,{narrative:resolved,guildId:interaction.guildId,sessionId:cycle.source_session_id||null,events:resolved.events||[],relationships:resolved.relationships||[],handouts:resolved.handouts||[],scope:dscope,source:"downtime_project",provenance:{actorType:"ai",actorId:"downtime",interactionId:interaction.id,triggerText:cycle.label,rationale:resolved.summary||"",confidence:100}});
        const directorMutation=director.act?applyAuthoritativeMutation(db,{narrative:director,guildId:interaction.guildId,sessionId:cycle.source_session_id||null,events:director.events||[],relationships:director.relationships||[],handouts:director.handouts||[],npcMemories:director.npc_memories||[],npcKnowledge:director.npc_knowledge||[],npcGoals:director.npc_goals||[],simulationUpdates:director.simulation_updates||[],scope:dscope,source:"world_director_downtime",provenance:{actorType:"ai",actorId:"world_director",interactionId:interaction.id,triggerText:cycle.label,rationale:director.gm_notes||"",confidence:director.confidence??100}}):{events:[],relationships:[],handouts:[],npcMemories:[],npcKnowledge:[],npcGoals:[]};
        if(cycle.source_session_id) db.completeDirectorPass(cycle.source_session_id,"downtime");
        const combinedSummary=[resolved.summary||"",director.act?director.gm_notes||"":""].filter(Boolean).join("\n\n");
        const done=db.resolveDowntimeCycle(cycle.id,combinedSummary);
        commitNpcDirector(db,npcPrepared);
        return {projectMutation,directorMutation,done};
      });
      const {projectMutation,directorMutation,done}=committed;
      db.recordDirectorHistory(interaction.guildId,{sessionId:cycle.source_session_id||null,layer:"downtime",trigger:{cycle_label:cycle.label,paused:db.isDirectorPaused(interaction.guildId)},acted:!!director.act,rationale:director.gm_notes||"",publicNarration:director.public_narration||"",mutationSummary:{events:(directorMutation.events||[]).filter(x=>x.ok).length,relationships:(directorMutation.relationships||[]).filter(x=>x.ok).length,handouts:(directorMutation.handouts||[]).filter(x=>x.ok).length,npc_memories:(directorMutation.npcMemories||[]).filter(x=>x.ok).length,npc_knowledge:(directorMutation.npcKnowledge||[]).filter(x=>x.ok).length,npc_goals:(directorMutation.npcGoals||[]).filter(x=>x.ok).length},status:db.isDirectorPaused(interaction.guildId)?"skipped":"completed"});
      const eventResults=[...(projectMutation.events||[]),...(directorMutation.events||[])];
      const handoutResults=[...(projectMutation.handouts||[]),...(directorMutation.handouts||[])];
      const outputErrors=[];
      const out=async(context,fn)=>{
        try{return await fn();}
        catch(err){const ref=await postStateError({db,guild:interaction.guild,error:err,context,sessionId:cycle.source_session_id||null});outputErrors.push({context,ref});return null;}
      };
      for(const item of projectOutputs){
        if(item.project.visibility==="party") await out(`downtime-project:${item.project.id}`,()=>postJournalEntry({db,guild:interaction.guild,title:`Downtime: ${item.project.title}`,content:item.message}));
        else await out(`downtime-project-private:${item.project.id}`,()=>sendPlayerPrivate({db,guild:interaction.guild,userId:item.project.discord_user_id,content:item.message,sessionId:null,characterId:item.project.visibility==="character"?item.project.character_id:null}));
      }
      await out("downtime-event-publish",()=>publishEventResults({db,guild:interaction.guild,results:eventResults}));
      await out("downtime-npc-hooks",()=>publishSimulationHooks({db,guild:interaction.guild}));
      for(const h of handoutResults.filter(x=>x.ok)) await out(`downtime-handout:${h.row.id}`,()=>deliverHandout({db,guild:interaction.guild,handout:h.row,format:"markdown"}));
      for(const r of eventResults.filter(x=>x.type==="canon"&&x.status==="conflict")) await out("downtime-canon-conflict",()=>postStateError({db,guild:interaction.guild,error:new Error(`Pending canon conflict ${r.conflict_id}`),context:"downtime-canon-conflict",sessionId:cycle.source_session_id||null}));
      if(director.act&&String(director.public_narration||"").trim()) await out("downtime-director-journal",()=>postJournalEntry({db,guild:interaction.guild,title:`World Movement — ${cycle.label}`,content:director.public_narration}));
      const validPlayers=new Set(db.listPlayers(interaction.guildId).map(p=>p.discord_user_id));
      for(const pm of director.private_messages||[]){
        if(!validPlayers.has(pm.discord_user_id)){
          await out("downtime-director-private-blocked",()=>postGmLog({db,guild:interaction.guild,sessionId:cycle.source_session_id||null,title:"Blocked Veilkeeper action — downtime director",details:`Private message target ${pm.discord_user_id} is not a registered campaign player; delivery was blocked.`}));
          continue;
        }
        const ch=db.findOwnedCharacter(interaction.guildId,pm.discord_user_id,"");
        await out(`downtime-director-private:${pm.discord_user_id}`,()=>sendPlayerPrivate({db,guild:interaction.guild,userId:pm.discord_user_id,content:`**Veilkeeper — private world movement:**\n${pm.content}`,sessionId:null,characterId:ch?.id||null}));
      }
      await out("downtime-gm-log",()=>postGmLog({db,guild:interaction.guild,sessionId:cycle.source_session_id||null,title:`Downtime resolved — ${done.label}`,details:`Project layer: ${resolved.summary||"none"}\nWorld Director: ${director.act?(director.gm_notes||"acted"):"no autonomous world move warranted"}`}));
      await out("downtime-post-snapshot",async()=>db.snapshotCampaign(interaction.guildId,{label:`Post-downtime ${done.label}`,reason:"Automatic snapshot after downtime project + world-director resolution",createdBy:interaction.user.id}));
      const warning=outputErrors.length?` State was committed, but ${outputErrors.length} delivery/logging step(s) failed (${outputErrors.map(x=>x.ref).join(", ")}); do not resolve again.`:"";
      await interaction.editReply(`Downtime resolved. **${projects.length}** project(s) processed, followed by the autonomous in-world downtime director pass.${director.act?" The world advanced in response to the fictional downtime interval.":" No additional world move was warranted."}${warning}`);
      return true;
    }

    if(group==="canon"&&sub==="set"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const s=db.getActiveSession(interaction.guildId);
      const r=db.proposeCanon(interaction.guildId,{key:interaction.options.getString("key",true),value:interaction.options.getString("value",true),visibility:interaction.options.getString("visibility")||"party",sessionId:s?.id||null,sourceType:"human_gm",sourceId:interaction.user.id,provenance:"/vc-canon set"});
      if(r.status==="conflict") await interaction.reply({content:`⚠️ Canon conflict created: \`${r.conflict.id.slice(0,8)}\`\nExisting: ${r.existing.value}\nProposed: ${r.conflict.proposed_value}\nResolve with \`/vc-canon resolve\`.`,ephemeral:true});
      else await interaction.reply({content:`Canon **${r.status}**: \`${interaction.options.getString("key",true).toLowerCase()}\` = ${interaction.options.getString("value",true)}`,ephemeral:true});
      return true;
    }
    if(group==="canon"&&sub==="status"){
      const rows=db.listCanon(interaction.guildId,{includeGM:isGM(db,interaction),limit:100});
      await interaction.reply({content:rows.length?`**Campaign Canon**\n${rows.map(r=>`• \`${r.canon_key}\` = ${r.value}${r.visibility==="gm"?" *(GM)*":""}`).join("\n")}`.slice(0,1950):"No structured canon entries yet.",ephemeral:true});
      return true;
    }
    if(group==="canon"&&sub==="conflicts"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const rows=db.listCanonConflicts(interaction.guildId);
      await interaction.reply({content:rows.length?`**Pending Canon Conflicts**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.canon_key}**\n  existing: ${r.existing_value}\n  proposed: ${r.proposed_value}`).join("\n")}`.slice(0,1950):"No pending canon conflicts.",ephemeral:true});
      return true;
    }
    if(group==="canon"&&sub==="proposals"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const status=interaction.options.getString("status")||"actionable";
      const characterName=interaction.options.getString("character");
      let characterId=null;
      if(characterName){
        const c=db.findGuildCharacter(interaction.guildId,characterName,{includeClosed:true});
        if(!c) throw new Error(`Campaign character not found: ${characterName}`);
        characterId=c.id;
      }
      const rows=db.listCanonProposals(interaction.guildId,{status,characterId,limit:30});
      const body=rows.map(r=>{
        const state=r.status.toUpperCase();
        const current=r.current_value!=null?`\n  current: ${r.current_value}`:"";
        const reason=r.reason?`\n  why: ${r.reason}`:"";
        const source=r.source==="player_private_scene"
          ?`player/private${r.proposed_by_user_id?` by <@${r.proposed_by_user_id}>`:""}`
          :`import/${r.source||"character-hook"}`;
        return `• \`${r.id.slice(0,8)}\` **${r.character_name}** • ${state} • ${source}\n  \`${r.canon_key}\` → ${r.proposed_value}${current}${reason}`;
      }).join("\n");
      await interaction.reply({content:rows.length?`**Canon Proposals — ${status}**\n${body}`.slice(0,1950):`No ${status} canon proposals found.`,ephemeral:true});
      return true;
    }
    if(group==="canon"&&sub==="proposal-resolve"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const rows=db.listCanonProposals(interaction.guildId,{status:"all",limit:100});
      const row=byPrefix(rows,interaction.options.getString("proposal_id",true)); if(!row) throw new Error("Canon proposal not found.");
      db.snapshotCampaign(interaction.guildId,{label:`Pre-proposal ${row.canon_key}`,reason:`Before resolving canon proposal ${row.id}`,createdBy:interaction.user.id});
      const result=db.resolveCanonProposal(interaction.guildId,row.id,{resolution:interaction.options.getString("resolution",true),customValue:interaction.options.getString("custom_value")||"",visibility:interaction.options.getString("visibility")||null,actorId:interaction.user.id,note:interaction.options.getString("note")||""});
      const p=result.proposal;
      if(result.status==="conflict"){
        await postGmLog({db,guild:interaction.guild,title:"Canon proposal conflict",details:`${p.character_name}: ${p.canon_key} → ${p.proposed_value}${p.proposed_by_user_id?`\nProposed by: <@${p.proposed_by_user_id}>`:""}\nConflict ${result.conflict.id.slice(0,8)} created for GM resolution.`});
        await interaction.reply({content:`⚠️ Proposal \`${p.id.slice(0,8)}\` conflicts with existing canon. Canon conflict \`${result.conflict.id.slice(0,8)}\` was created. Resolve it with \`/vc-canon proposal-resolve\` (same proposal) or \`/vc-canon resolve\`.`,ephemeral:true});
      }else{
        await postGmLog({db,guild:interaction.guild,title:`Canon proposal ${result.status}`,details:`${p.character_name}: ${p.canon_key}${p.proposed_by_user_id?`\nProposed by: <@${p.proposed_by_user_id}>`:""}\nProposal: ${p.proposed_value}\nResolution: ${p.resolution_value||"rejected"}`});
        await interaction.reply({content:`Canon proposal \`${p.id.slice(0,8)}\` **${result.status}** for **${p.character_name}**.${p.resolution_value?`\n\`${p.canon_key}\` = ${p.resolution_value}`:""}`,ephemeral:true});
      }
      return true;
    }
    if(group==="canon"&&sub==="resolve"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const rows=db.listCanonConflicts(interaction.guildId); const row=byPrefix(rows,interaction.options.getString("conflict_id",true)); if(!row) throw new Error("Pending canon conflict not found.");
      db.snapshotCampaign(interaction.guildId,{label:`Pre-canon ${row.canon_key}`,reason:`Before resolving canon conflict ${row.id}`,createdBy:interaction.user.id});
      const event=db.resolveCanonConflict(interaction.guildId,row.id,{resolution:interaction.options.getString("resolution",true),customValue:interaction.options.getString("custom_value")||"",actorId:interaction.user.id});
      const proposalNote=row.source_type==="canon_proposal"&&row.source_id?` Imported proposal \`${row.source_id.slice(0,8)}\` was updated automatically.`:"";
      await postGmLog({db,guild:interaction.guild,title:"Canon conflict resolved",details:`${row.canon_key} → ${event?.value||"existing canon retained"}${proposalNote}`});
      await interaction.reply({content:`Resolved **${row.canon_key}** → ${event?.value||row.existing_value}.${proposalNote}`,ephemeral:true});
      return true;
    }

    if(group==="admin"&&["backup","backups","restore-preview","restore","doctor","ledger","seed-data"].includes(sub)){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required.");
      if(sub==="backup"){
        const row=db.createBackup(interaction.guildId,{label:interaction.options.getString("label")||"Manual backup",reason:interaction.options.getString("reason")||"Manual GM backup",createdBy:interaction.user.id});
        await interaction.reply({content:`Backup created: \`${row.id.slice(0,8)}\` **${row.label}**`,ephemeral:true}); return true;
      }
      if(sub==="backups"){
        const rows=db.listBackups(interaction.guildId,20);
        await interaction.reply({content:rows.length?`**Campaign Backups**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.label}** — ${r.created_at}${r.reason?` — ${r.reason}`:""}`).join("\n")}`.slice(0,1950):"No campaign backups yet.",ephemeral:true}); return true;
      }
      const backupId=interaction.options.getString("backup_id");
      if(sub==="restore-preview"){
        const row=byPrefix(db.listBackups(interaction.guildId,50),backupId); if(!row) throw new NotFoundError("Backup not found.");
        const preview=db.backupPreview(interaction.guildId,row.id);
        await interaction.reply({content:`**Restore Preview — ${row.label}**\nBackup: ${preview.counts.players} players • ${preview.counts.characters} characters • ${preview.counts.facts} facts • ${preview.counts.sessions} sessions\nCurrent: ${preview.current.players} players • ${preview.current.characters} characters • ${preview.current.facts}+ facts • ${preview.current.sessions} sessions\nRestore creates a pre-restore safety snapshot.`,ephemeral:true}); return true;
      }
      if(sub==="restore"){
        const row=byPrefix(db.listBackups(interaction.guildId,50),backupId); if(!row) throw new NotFoundError("Backup not found.");
        await interaction.deferReply({ephemeral:true});
        db.restoreBackup(interaction.guildId,row.id,{actorId:interaction.user.id});
        await syncConfiguredSurfaces({db,guild:interaction.guild});
        await postGmLog({db,guild:interaction.guild,title:"Campaign backup restored",details:`Restored backup ${row.id.slice(0,8)} — ${row.label}. A safety snapshot was created first.`});
        await interaction.editReply(`Restored backup \`${row.id.slice(0,8)}\` **${row.label}**. A pre-restore safety snapshot was created automatically.`); return true;
      }
      if(sub==="seed-data"){
        await interaction.deferReply({ephemeral:true});
        const counts=seedData({db,content:gm.content,guildId:interaction.guildId,actorId:interaction.user.id});
        const message=[
          "**Content seed complete.** A pre-seed safety snapshot was created.",
          `Files imported: **${counts.files}** (shared **${counts.party}**, character-only **${counts.character}**, GM-only **${counts.gm}**).`,
          `Structured entries: **${counts.catalog}**; runtime entities: **${counts.entities}**; references: **${counts.references}**; narratives: **${counts.narratives}**.`,
          `New NPC profiles: **${counts.cognition?.profiles||0}**; binary files archived: **${counts.binary}**.`,
          `Bulk projections: **${counts.bulk.sources}** files / **${counts.bulk.entries}** entries; library entries: **${counts.bulk.library}**; review drafts: **${counts.bulk.drafts}**.`,
          `Missing dossier fields backfilled: **${counts.bulk.fields}**.`,
          "Review inferred/typed drafts with /vc-admin seed-drafts; use seed-edit, seed-add, seed-remove, seed-approve, or seed-reject.",
          `Existing files skipped: **${counts.skipped}**; changed sources requiring review: **${counts.changed}**.`,
          `Unmatched character files retained GM-only: **${counts.unmatched}**; narrative conflicts/oversize: **${counts.narrativeConflicts}**.`,
          "Existing campaign state is preserved. GM sources never become party knowledge or canon automatically."
        ].join("\n");
        await interaction.editReply(message);
        await postGmLog({db,guild:interaction.guild,title:"Campaign content seeded",details:message});
        return true;
      }
      if(sub==="ledger"){
        const rows=db.listMutationLedger(interaction.guildId,{limit:interaction.options.getInteger("limit")||30,sourceLayer:interaction.options.getString("layer")||""});
        const chunks=chunkTextLines(rows.length?["**Authoritative Mutation Ledger**",...rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.mutation_type}** • ${r.source_layer} • confidence ${r.confidence}% • ${r.created_at}\n  ${r.rationale||r.entity_key||"No rationale recorded."}`)]:["No mutation-ledger entries recorded yet."]);
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true}); return true;
      }
      if(sub==="doctor"){
        const report=await runCampaignDiagnostics({db,guild:interaction.guild});
        const chunks=chunkTextLines(formatDiagnostics(report));
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true}); return true;
      }
    }

    if(group==="admin"&&sub==="snapshot"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const row=db.snapshotCampaign(interaction.guildId,{label:interaction.options.getString("label")||"Manual snapshot",reason:interaction.options.getString("reason")||"Manual GM snapshot",createdBy:interaction.user.id});
      await interaction.reply({content:`Snapshot created: \`${row.id.slice(0,8)}\` **${row.label}**`,ephemeral:true});
      return true;
    }
    if(group==="admin"&&sub==="snapshots"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const rows=db.listSnapshots(interaction.guildId,12);
      await interaction.reply({content:rows.length?`**Recent Snapshots**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.label}** — ${r.reason||""} — ${r.created_at}`).join("\n")}`.slice(0,1950):"No snapshots yet.",ephemeral:true});
      return true;
    }
    if(group==="admin"&&sub==="rollback"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const snap=byPrefix(db.listSnapshots(interaction.guildId,100),interaction.options.getString("snapshot_id",true)); if(!snap) throw new Error("Snapshot not found.");
      const full=db.getSnapshot(snap.id);
      await interaction.deferReply({ephemeral:true});
      await deletePublishedNotInSnapshot({db,guild:interaction.guild,snapshot:full});
      db.restoreSnapshot(interaction.guildId,snap.id,{actorId:interaction.user.id});
      await syncConfiguredSurfaces({db,guild:interaction.guild});
      await postGmLog({db,guild:interaction.guild,title:"Campaign rollback",details:`Restored snapshot ${snap.id.slice(0,8)} — ${snap.label}. A pre-rollback safety snapshot was created automatically.`});
      await interaction.editReply(`Restored snapshot \`${snap.id.slice(0,8)}\` **${snap.label}**. A pre-rollback safety snapshot was created automatically.`);
      return true;
    }

    if(group==="intel"&&(sub==="brief"||sub==="recap"&&db.getCityCalendar(interaction.guildId).flags.session_briefs===true)){
      const packet=sessionBrief(db,interaction.guildId,{mode:sub==="brief"?"character":"shared",user:interaction.user.id});
      await interaction.reply({content:formatSessionBrief(packet),ephemeral:true,allowedMentions:{parse:[]},
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(packet,null,2)),{name:"scoped-session-brief.json"})]});return true;
    }
    if(group==="intel"&&sub==="recap"){
      const row=db.latestEndedSession(interaction.guildId);
      await interaction.reply({content:row?.recap||"No completed-session recap yet.",ephemeral:true});
      return true;
    }
    if(group==="intel"&&sub==="clues"){
      const s=db.getActiveSession(interaction.guildId);
      const a=s?db.controlledAssignment(s.id,interaction.user.id):null;
      const rows=db.playerFactsFor(interaction.guildId,interaction.user.id,{characterId:a?.character_id||null,category:"clue",limit:80});
      const chunks=chunkTextLines(rows.length?["**Clues Available to You**",...rows.map(playerFactLine)]:["No recorded clues are available to you."]);
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true});
      return true;
    }
    if(group==="intel"&&sub==="facts"){
      const s=db.getActiveSession(interaction.guildId);
      const a=s?db.controlledAssignment(s.id,interaction.user.id):null;
      const rows=db.playerFactsFor(interaction.guildId,interaction.user.id,{characterId:a?.character_id||null,category:"fact",limit:80});
      const chunks=chunkTextLines(rows.length?["**Facts Available to You**",...rows.map(playerFactLine)]:["No recorded facts are available to you."]);
      await interaction.reply({content:chunks[0],ephemeral:true});
      for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true});
      return true;
    }
    if(group==="intel"&&sub==="caseboard"){
      const rows=db.listVisibleActiveThreads(interaction.guildId,interaction.user.id);
      await interaction.reply({content:rows.length?rows.map(x=>`• **${x.label}**${x.notes?`: ${x.notes}`:""}`).join("\n"):"No active recorded threads.",ephemeral:true});
      return true;
    }

    if(group==="gm"){
      if(!isGM(db,interaction)) throw new PermissionError("GM/admin permission required.");
      if(sub==="overview"){
        const chunks=chunkTextLines(formatGmOverview(buildGmOverview(db,interaction.guildId),{formatFact:gmFactLine}));
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true}); return true;
      }
      if(sub==="delivery-status"){
        const rows=db.listPendingPublications(interaction.guildId,{limit:interaction.options.getInteger("limit")||30});
        const lines=rows.length?["**Pending/uncertain turn delivery**",...rows.map(row=>
          `• turn \`${row.turn_id.slice(0,8)}\` part ${row.ordinal+1} · ${row.surface} · **${row.status}** · attempts ${row.attempt_count}${row.last_failure?` · ${row.last_failure.slice(0,160)}`:""}`)]:["No pending turn delivery rows."];
        const chunks=chunkTextLines(lines);await interaction.reply({content:chunks[0],ephemeral:true});
        for(const chunk of chunks.slice(1))await interaction.followUp({content:chunk,ephemeral:true});return true;
      }
      if(sub==="delivery-resend"){
        const key=interaction.options.getString("turn",true).toLowerCase();
        const attempts=db.listRecoverableTurns(interaction.guildId,{limit:100}).filter(row=>row.turn_id.toLowerCase().startsWith(key));
        if(attempts.length!==1)throw new StateConflictError("Provide one unique pending turn ID prefix.");
        const result=await deliverQueuedTurn({db,guild:interaction.guild,turnId:attempts[0].turn_id,
          forceUncertain:interaction.options.getBoolean("force_uncertain")===true});
        await interaction.reply({content:result.pending.length?
          `Delivery retry completed with ${result.pending.length} part(s) still pending or uncertain. No mechanics or GM generation reran.`:
          "Committed narration delivery completed. No mechanics or GM generation reran.",ephemeral:true});return true;
      }
      if(sub==="npc-state"){
        const profile=db.findNpcProfile(interaction.guildId,interaction.options.getString("npc",true));
        if(!profile) throw new NotFoundError("NPC cognition profile not found. Run /vc-admin seed-data or use the NPC in play first.");
        const memories=db.listNpcMemories(interaction.guildId,profile.npc_key,{status:"active",limit:20});
        const knowledge=db.listNpcKnowledge(interaction.guildId,profile.npc_key,{limit:30});
        const goals=db.listNpcGoals(interaction.guildId,profile.npc_key,{limit:20});
        const lines=[
          `**NPC Cognition — ${profile.display_name}**`,
          `${profile.role||"Role unspecified"} • activity: **${profile.activity_tier}** • source: ${profile.source}`,
          profile.public_identity?`Public identity: ${profile.public_identity}`:"",
          profile.portrayal?`Portrayal: ${profile.portrayal}`:"",
          `Decision profile: ${JSON.stringify(profile.decision_profile||{})}`,
          profile.knowledge_boundaries?.length?`Knowledge boundaries: ${profile.knowledge_boundaries.join("; ")}`:"Knowledge boundaries: none recorded",
          "**Active Goals**",
          ...(goals.length?goals.map(g=>`• [${g.priority}] **${g.title||g.goal_key}** (${g.horizon}/${g.status}) — ${g.objective}`):["• none"]),
          "**Knowledge / Beliefs**",
          ...(knowledge.length?knowledge.map(k=>`• **${k.belief_state}** ${k.knowledge_key} (${k.confidence}%)${k.is_secret?" • secret":""} — ${k.content}`):["• none"]),
          "**Memories**",
          ...(memories.length?memories.map(m=>`• **${m.memory_type}** [importance ${m.importance}, confidence ${m.confidence}] — ${m.content}`):["• none"])
        ].filter(Boolean);
        const chunks=chunkTextLines(lines);
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true}); return true;
      }
      if(sub==="fact-edit"||sub==="fact-archive"||sub==="fact-promote"){
        const row=db.findFactForGM(interaction.guildId,interaction.options.getString("fact_id",true)); if(!row) throw new NotFoundError("Fact not found.");
        if(sub==="fact-archive"){
          db.archiveFact(interaction.guildId,row.id); db.recordMutation(interaction.guildId,{sessionId:row.session_id,actorType:"human_gm",actorId:interaction.user.id,sourceLayer:"command",sourceInteractionId:interaction.id,mutationType:"fact_archive",entityKey:row.id,rationale:"GM archived fact",before:row,after:{archived:true}});
          await interaction.reply({content:`Archived fact \`${row.id.slice(0,8)}\` without deleting its provenance.`,ephemeral:true}); return true;
        }
        if(sub==="fact-edit"){
          const vis=interaction.options.getString("visibility"); const target=interaction.options.getUser("player"); if(vis==="player"&&!target&&!row.subject_user_id) throw new Error("Player visibility requires a target player.");
          const updated=db.updateFact(interaction.guildId,row.id,{content:interaction.options.getString("content")??row.content,visibility:vis??row.visibility,subjectUserId:vis==="player"?(target?.id||row.subject_user_id):(vis?null:undefined)});
          db.recordMutation(interaction.guildId,{sessionId:row.session_id,actorType:"human_gm",actorId:interaction.user.id,sourceLayer:"command",sourceInteractionId:interaction.id,mutationType:"fact_edit",entityKey:row.id,visibility:updated.visibility,rationale:"GM edited fact",before:row,after:updated});
          await interaction.reply({content:`Updated fact \`${row.id.slice(0,8)}\` (${updated.visibility}).`,ephemeral:true}); return true;
        }
        const target=interaction.options.getString("target",true);
        if(target==="established"){
          establishFact(db,interaction.guildId,row.id,interaction.user.id);
          await interaction.reply({content:`Established fact \`${row.id.slice(0,8)}\` by saved GM ruling; visibility unchanged.`,ephemeral:true});return true;
        }
        if(target==="canon"){
          const result=db.proposeCanon(interaction.guildId,{key:row.fact_key,value:row.content,visibility:"party",sessionId:row.session_id,sourceType:"human_gm",sourceId:row.id,provenance:`Promoted from fact ${row.id}`});
          db.recordMutation(interaction.guildId,{sessionId:row.session_id,actorType:"human_gm",actorId:interaction.user.id,sourceLayer:"command",sourceInteractionId:interaction.id,mutationType:"fact_promote_canon",entityKey:row.fact_key,visibility:"party",rationale:"GM promoted fact to canon",before:row,after:result});
          await interaction.reply({content:result.status==="conflict"?`Fact promotion created canon conflict \`${result.conflict.id.slice(0,8)}\` for **${row.fact_key}**.`:`Promoted fact \`${row.id.slice(0,8)}\` to campaign canon.`,ephemeral:true}); return true;
        }
        const updated=db.updateFact(interaction.guildId,row.id,{visibility:target,subjectUserId:null,subjectCharacterId:null});
        db.recordMutation(interaction.guildId,{sessionId:row.session_id,actorType:"human_gm",actorId:interaction.user.id,sourceLayer:"command",sourceInteractionId:interaction.id,mutationType:"fact_promote",entityKey:row.id,visibility:target,rationale:`GM promoted fact visibility to ${target}`,before:row,after:updated});
        await interaction.reply({content:`Promoted fact \`${row.id.slice(0,8)}\` to **${target}** visibility.`,ephemeral:true}); return true;
      }
      if(sub==="fear"){
        const s=db.getActiveSession(interaction.guildId);
        const delta=interaction.options.getInteger("delta",true);
        const fear=db.changeFear(interaction.guildId,delta);
        db.audit(interaction.guildId,s?.id||null,"human_gm",interaction.user.id,"fear_delta",{delta,fear});
        await interaction.reply({content:`Fear ${delta>=0?"+":""}${delta} → **${fear}/12**.`,ephemeral:true});
        return true;
      }
      if(sub==="fact-add"){
        const vis=interaction.options.getString("visibility",true);
        const target=interaction.options.getUser("player");
        if(vis==="player"&&!target) throw new Error("Specific-player visibility requires a player.");
        const s=db.getActiveSession(interaction.guildId);
        db.addFact(interaction.guildId,{category:"fact",key:`human-${Date.now()}`,content:interaction.options.getString("content",true),visibility:vis,subjectUserId:target?.id||null,sessionId:s?.id||null,source:"human_gm",provenance:{interaction_id:interaction.id,actor_user_id:interaction.user.id,command:"/vc-gm fact-add"},confidence:100});
        await interaction.reply({content:`Fact recorded as **${vis}** visibility.`,ephemeral:true});
        return true;
      }
      if(sub==="fact-list"){
        const rows=db.listFactsForGM(interaction.guildId,{
          visibility:interaction.options.getString("visibility")||"all",
          category:interaction.options.getString("category")||"",
          subjectUserId:interaction.options.getUser("player")?.id||"",
          search:interaction.options.getString("search")||"",
          limit:interaction.options.getInteger("limit")||50
        });
        const chunks=chunkTextLines(rows.length?[`**Campaign Facts — ${rows.length} shown**`,...rows.map(gmFactLine)]:["No matching campaign facts found."]);
        await interaction.reply({content:chunks[0],ephemeral:true});
        for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true});
        return true;
      }
    }
  } catch(err){
    if(interactionResponseExpired(interaction,err)) throw interactionFailure(interaction,err);
    const msg=err.message||String(err);
    if(!isExpectedError(err) && interaction.guild && isMutatingCommand(group,sub)){
      await postStateError({db,guild:interaction.guild,error:err,context:`command:/vc ${group||""} ${sub||""}`,sessionId:db.getActiveSession(interaction.guildId)?.id||null});
    }
    const payload={content:`⚠️ ${msg}`,ephemeral:true};
    try{await replyOrEdit(interaction,payload);}
    catch(responseError){throw interactionFailure(interaction,err,{phase:"error-response",responseError});}
    return true;
  } finally {
    restoreReceiptCapture();
  }
  return true;
}
