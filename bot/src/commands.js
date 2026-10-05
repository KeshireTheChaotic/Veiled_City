import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { dualityRoll, parseDice } from "./dice.js";
import { publishJournal, postGmLog, postStateError, postPrivateRelay, syncConfiguredSurfaces, postPlayMessage, sendPlayerPrivate } from "./publishing.js";
import { EncounterLibrary, livePcRoster, partyTier, baseBattlePoints, DIFFICULTY_ADJUSTMENTS, autoBuildComposition, recomputeBudget, battlePointCost, HEAVY_ROLES, defaultObjective } from "./encounter.js";

export function buildCommands(){
  return [
    new SlashCommandBuilder()
      .setName("vc")
      .setDescription("Veiled City multiplayer campaign commands")
      .addSubcommandGroup(g=>g.setName("campaign").setDescription("Campaign setup and status")
        .addSubcommand(s=>s.setName("setup").setDescription("Configure this server")
          .addChannelOption(o=>o.setName("play_channel").setDescription("Main in-character play channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
          .addRoleOption(o=>o.setName("gm_role").setDescription("Optional human-GM/admin role"))
          .addStringOption(o=>o.setName("mode").setDescription("AI response policy").addChoices(
            {name:"Active router",value:"active"},{name:"Assisted",value:"assisted"},{name:"Mention only",value:"mention"})))
        .addSubcommand(s=>s.setName("status").setDescription("Show campaign configuration"))
        .addSubcommand(s=>s.setName("channels").setDescription("Configure Veilkeeper support channels")
          .addChannelOption(o=>o.setName("rules_channel").setDescription("Low-cost rules questions channel").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("case_board").setDescription("Auto-published active/resolved case threads").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("journal").setDescription("Automatic session recap journal").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("known_npcs").setDescription("Auto-published player-known NPCs").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("known_locations").setDescription("Auto-published discovered locations").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("gm_log").setDescription("GM-only operational log").addChannelTypes(ChannelType.GuildText))
          .addChannelOption(o=>o.setName("state_errors").setDescription("GM-only runtime/state error log").addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(s=>s.setName("sync").setDescription("Republish current case/NPC/location state to configured channels")))
      .addSubcommandGroup(g=>g.setName("session").setDescription("Session attendance and lifecycle")
        .addSubcommand(s=>s.setName("start").setDescription("Start a new session")
          .addStringOption(o=>o.setName("title").setDescription("Optional session title"))
          .addStringOption(o=>o.setName("assembly").setDescription("How unrelated PCs converge").addChoices(
            {name:"Auto (recommended)",value:"auto"},
            {name:"Already together",value:"already_together"},
            {name:"Shared incident",value:"shared_incident"},
            {name:"Common client",value:"common_client"},
            {name:"Crossed cases",value:"crossed_cases"},
            {name:"Mutual threat",value:"mutual_threat"},
            {name:"Faction summons",value:"faction_summons"},
            {name:"Chain of contacts",value:"chain_contacts"},
            {name:"Rescue",value:"rescue"},
            {name:"Debt / favor",value:"debt_favor"},
            {name:"Manual GM assembly",value:"manual"})))
        .addSubcommand(s=>s.setName("assemble").setDescription("Generate and launch the opening convergence scene"))
        .addSubcommand(s=>s.setName("assembly-status").setDescription("Show GM-private convergence status and plan"))
        .addSubcommand(s=>s.setName("converged").setDescription("Mark that immediate PC objectives now overlap"))
        .addSubcommand(s=>s.setName("end").setDescription("End the active session and generate a recap"))
        .addSubcommand(s=>s.setName("present").setDescription("Join the active session")
          .addStringOption(o=>o.setName("character").setDescription("Owned character name; defaults to first active character")))
        .addSubcommand(s=>s.setName("absent").setDescription("Mark yourself absent")
          .addStringOption(o=>o.setName("mode").setDescription("What happens to your PC").setRequired(true).addChoices(
            {name:"Offscreen (default/safest)",value:"offscreen"},
            {name:"Background only",value:"background"},
            {name:"Human proxy controls PC",value:"proxy"}))
          .addUserOption(o=>o.setName("proxy").setDescription("Required for proxy mode"))
          .addStringOption(o=>o.setName("note").setDescription("Optional logistical note")))
        .addSubcommand(s=>s.setName("arrive").setDescription("Join after being late/absent")
          .addStringOption(o=>o.setName("character").setDescription("Character to enter with")))
        .addSubcommand(s=>s.setName("leave").setDescription("Leave early")
          .addStringOption(o=>o.setName("mode").setDescription("What happens to your PC").setRequired(true).addChoices(
            {name:"Offscreen",value:"offscreen"},
            {name:"Background only",value:"background"},
            {name:"Human proxy controls PC",value:"proxy"}))
          .addUserOption(o=>o.setName("proxy").setDescription("Required for proxy mode"))))
      .addSubcommandGroup(g=>g.setName("character").setDescription("Character lifecycle")
        .addSubcommand(s=>s.setName("create").setDescription("Create a basic character record")
          .addStringOption(o=>o.setName("name").setDescription("Character name").setRequired(true))
          .addStringOption(o=>o.setName("class").setDescription("Daggerheart class"))
          .addStringOption(o=>o.setName("subclass").setDescription("Subclass"))
          .addStringOption(o=>o.setName("ancestry").setDescription("Veiled City ancestry"))
          .addStringOption(o=>o.setName("community").setDescription("Community"))
          .addStringOption(o=>o.setName("domains").setDescription("Comma-separated domains")))
        .addSubcommand(s=>s.setName("import").setDescription("Import a player-safe character JSON")
          .addAttachmentOption(o=>o.setName("file").setDescription("Character JSON file").setRequired(true)))
        .addSubcommand(s=>s.setName("list").setDescription("List your characters"))
        .addSubcommand(s=>s.setName("select").setDescription("Use a character in the current session")
          .addStringOption(o=>o.setName("character").setDescription("Character name").setRequired(true)))
        .addSubcommand(s=>s.setName("sheet").setDescription("Show your current or named character")
          .addStringOption(o=>o.setName("character").setDescription("Character name")))
        .addSubcommand(s=>s.setName("retire").setDescription("Retire a character")
          .addStringOption(o=>o.setName("character").setDescription("Character name").setRequired(true)))
        .addSubcommand(s=>s.setName("death").setDescription("Mark a character dead after resolving the death move")
          .addStringOption(o=>o.setName("character").setDescription("Character name").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("guest").setDescription("Guest and drop-in characters")
        .addSubcommand(s=>s.setName("create").setDescription("Create a one-shot/guest character")
          .addStringOption(o=>o.setName("name").setDescription("Guest character name").setRequired(true))
          .addUserOption(o=>o.setName("player").setDescription("Player who will control this guest")))
        .addSubcommand(s=>s.setName("claim").setDescription("Claim/select a guest character for this session")
          .addStringOption(o=>o.setName("character").setDescription("Guest character name").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("npc").setDescription("Guest-controlled NPC antagonist proxy")
        .addSubcommand(s=>s.setName("offer").setDescription("Offer a sanitized NPC proxy package to a guest player")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true))
          .addUserOption(o=>o.setName("player").setDescription("Guest player").setRequired(true))
          .addStringOption(o=>o.setName("control").setDescription("How much of this NPC the guest controls").setRequired(true).addChoices(
            {name:"Portrayal only",value:"portrayal"},{name:"Tactical (recommended)",value:"tactical"},{name:"Full NPC",value:"full_npc"}))
          .addStringOption(o=>o.setName("objective").setDescription("Optional current objective the guest is allowed to know"))
          .addStringOption(o=>o.setName("gm_notes").setDescription("Optional GM-only source notes; sanitized before delivery")))
        .addSubcommand(s=>s.setName("proxy").setDescription("Immediately assign an NPC antagonist to a guest player")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true))
          .addUserOption(o=>o.setName("player").setDescription("Guest player").setRequired(true))
          .addStringOption(o=>o.setName("control").setDescription("How much of this NPC the guest controls").setRequired(true).addChoices(
            {name:"Portrayal only",value:"portrayal"},{name:"Tactical (recommended)",value:"tactical"},{name:"Full NPC",value:"full_npc"}))
          .addStringOption(o=>o.setName("objective").setDescription("Optional current objective the guest is allowed to know"))
          .addStringOption(o=>o.setName("gm_notes").setDescription("Optional GM-only source notes; sanitized before delivery")))
        .addSubcommand(s=>s.setName("claim").setDescription("Accept an NPC proxy offer")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true)))
        .addSubcommand(s=>s.setName("decline").setDescription("Decline an NPC proxy offer")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true)))
        .addSubcommand(s=>s.setName("release").setDescription("End an NPC proxy assignment")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true)))
        .addSubcommand(s=>s.setName("status").setDescription("Show NPC proxy assignments available to you"))
        .addSubcommand(s=>s.setName("packet").setDescription("Re-send your sanitized NPC control packet")
          .addStringOption(o=>o.setName("npc").setDescription("NPC/antagonist name").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("encounter").setDescription("GM-only Daggerheart Battle Point encounter builder")
        .addSubcommand(s=>s.setName("build").setDescription("Build a multiplayer encounter from the live session roster")
          .addStringOption(o=>o.setName("difficulty").setDescription("Encounter length/difficulty adjustment").addChoices(
            {name:"Easy / shorter (-1 BP)",value:"easy"},{name:"Standard",value:"standard"},{name:"Hard / longer (+2 BP)",value:"hard"}))
          .addStringOption(o=>o.setName("tier").setDescription("Adversary tier; auto uses the highest present PC tier").addChoices(
            {name:"Auto",value:"auto"},{name:"Tier 1",value:"1"},{name:"Tier 2",value:"2"},{name:"Tier 3",value:"3"},{name:"Tier 4",value:"4"}))
          .addStringOption(o=>o.setName("style").setDescription("Composition style").addChoices(
            {name:"Balanced",value:"balanced"},{name:"Boss",value:"boss"},{name:"Swarm",value:"swarm"},{name:"Strike team",value:"strike_team"},{name:"Hunt",value:"hunt"}))
          .addStringOption(o=>o.setName("objective").setDescription("Player-facing scene objective"))
          .addStringOption(o=>o.setName("environment").setDescription("Veiled City environment name; blank chooses a tier-appropriate one")))
        .addSubcommand(s=>s.setName("status").setDescription("Show the GM-private current encounter budget and composition"))
        .addSubcommand(s=>s.setName("adjust").setDescription("Adjust Battle Point assumptions")
          .addStringOption(o=>o.setName("difficulty").setDescription("Replace the difficulty adjustment").addChoices(
            {name:"Easy / shorter (-1 BP)",value:"easy"},{name:"Standard",value:"standard"},{name:"Hard / longer (+2 BP)",value:"hard"}))
          .addBooleanOption(o=>o.setName("boost_damage").setDescription("Apply +1d4/+2 damage to all adversaries (-2 BP)"))
          .addIntegerOption(o=>o.setName("custom_delta").setDescription("Additional GM BP adjustment (positive or negative)"))
          .addBooleanOption(o=>o.setName("rebalance").setDescription("Rebuild composition to the new budget (planned encounters only)"))
          .addStringOption(o=>o.setName("reason").setDescription("Optional GM note for custom adjustment")))
        .addSubcommand(s=>s.setName("add").setDescription("Add an adversary to the current encounter")
          .addStringOption(o=>o.setName("adversary").setDescription("Veiled City adversary name").setRequired(true))
          .addIntegerOption(o=>o.setName("quantity").setDescription("Units; for Minions this means party-sized groups").setMinValue(1).setMaxValue(10)))
        .addSubcommand(s=>s.setName("remove").setDescription("Remove an adversary from the current encounter")
          .addStringOption(o=>o.setName("adversary").setDescription("Adversary name").setRequired(true))
          .addIntegerOption(o=>o.setName("quantity").setDescription("Units/groups to remove").setMinValue(1).setMaxValue(10)))
        .addSubcommand(s=>s.setName("start").setDescription("Mark the planned encounter active"))
        .addSubcommand(s=>s.setName("end").setDescription("End the current encounter")))
      .addSubcommandGroup(g=>g.setName("party").setDescription("Persistent working-group state")
        .addSubcommand(s=>s.setName("establish").setDescription("Mark present PCs as a continuing party")
          .addStringOption(o=>o.setName("name").setDescription("Optional party/team name")))
        .addSubcommand(s=>s.setName("status").setDescription("Show established party status")))
      .addSubcommandGroup(g=>g.setName("player").setDescription("Player preferences")
        .addSubcommand(s=>s.setName("private-channel").setDescription("Use this channel for your private GM information"))
        .addSubcommand(s=>s.setName("accessibility").setDescription("Set response/accessibility preferences")
          .addStringOption(o=>o.setName("length").setDescription("GM response length").addChoices(
            {name:"Compact",value:"compact"},{name:"Standard",value:"standard"},{name:"Descriptive",value:"descriptive"}))
          .addStringOption(o=>o.setName("mechanics").setDescription("Mechanical detail").addChoices(
            {name:"Full",value:"full"},{name:"Standard",value:"standard"},{name:"Narrative only",value:"narrative"}))
          .addBooleanOption(o=>o.setName("screen_reader").setDescription("Prefer screen-reader-friendly formatting"))))
      .addSubcommandGroup(g=>g.setName("roll").setDescription("Deterministic dice")
        .addSubcommand(s=>s.setName("duality").setDescription("Roll Daggerheart Duality Dice")
          .addIntegerOption(o=>o.setName("modifier").setDescription("Trait/other modifier"))
          .addIntegerOption(o=>o.setName("experience").setDescription("Experience modifier"))
          .addIntegerOption(o=>o.setName("advantage").setDescription("Advantage d6 count"))
          .addIntegerOption(o=>o.setName("disadvantage").setDescription("Disadvantage d6 count")))
        .addSubcommand(s=>s.setName("damage").setDescription("Roll damage/other dice")
          .addStringOption(o=>o.setName("dice").setDescription("e.g. 2d8+3").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("rules").setDescription("Low-cost player-safe rules desk")
        .addSubcommand(s=>s.setName("ask").setDescription("Ask a concise Daggerheart/Veiled City rules question")
          .addStringOption(o=>o.setName("question").setDescription("Rules question").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("intel").setDescription("Player-safe campaign information")
        .addSubcommand(s=>s.setName("recap").setDescription("Show the latest saved recap"))
        .addSubcommand(s=>s.setName("clues").setDescription("Show clues available to you"))
        .addSubcommand(s=>s.setName("caseboard").setDescription("Show active player-visible threads")))
      .addSubcommandGroup(g=>g.setName("gm").setDescription("Human GM/admin tools")
        .addSubcommand(s=>s.setName("fear").setDescription("Record a Fear change")
          .addIntegerOption(o=>o.setName("delta").setDescription("Positive or negative change").setRequired(true)))
        .addSubcommand(s=>s.setName("fact").setDescription("Add a campaign fact")
          .addStringOption(o=>o.setName("content").setDescription("Fact text").setRequired(true))
          .addStringOption(o=>o.setName("visibility").setDescription("Who may know it").setRequired(true).addChoices(
            {name:"Party",value:"party"},{name:"Public",value:"public"},{name:"Specific player",value:"player"},{name:"GM only",value:"gm"}))
          .addUserOption(o=>o.setName("player").setDescription("Required for player visibility"))))
  ].map(x=>x.toJSON());
}

function json(c){ return c?.data ?? {}; }
function formatSheet(c){
  if(!c) return "No character found.";
  const d=json(c), r=d.resources||{};
  const domains=(d.domains||[]).join(", ")||"—";
  return [
    `**${c.name}** — ${d.class||"Class unset"}${d.subclass?` (${d.subclass})`:""}`,
    `${d.ancestry||"Ancestry unset"} • ${d.community||"Community unset"} • Level ${d.level||1}`,
    `Domains: ${domains}`,
    `HP ${r.hp?.current??"?"}/${r.hp?.max??"?"} • Stress ${r.stress?.current??"?"}/${r.stress?.max??6} • Hope ${r.hope??"?"} • Armor ${r.armor?.current??"?"}/${r.armor?.max??"?"}`,
    d.experiences?.length?`Experiences: ${d.experiences.join("; ")}`:"",
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
  if(!s) throw new Error("No active session.");
  return s;
}
function findGuest(db,guildId,name,userId){
  const q=name.toLowerCase();
  const rows=db.db.prepare(`
    SELECT * FROM characters WHERE guild_id=? AND is_guest=1 AND status='guest'
      AND (owner_user_id IS NULL OR owner_user_id=?)
  `).all(guildId,userId);
  const r=rows.find(x=>x.name.toLowerCase()===q)||rows.find(x=>x.name.toLowerCase().includes(q));
  return r?{...r,data:JSON.parse(r.character_json)}:null;
}

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
    offered?`\n**To accept:** \`/vc npc claim npc:${proxy.npc_name}\`\n**To decline:** \`/vc npc decline npc:${proxy.npc_name}\``:
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

export async function handleCommand(interaction,{db,gm}){
  if(!interaction.isChatInputCommand()||interaction.commandName!=="vc") return false;
  if(!interaction.guildId) { await interaction.reply({content:"Veiled City commands must be used in a server.",ephemeral:true}); return true; }
  await ensurePlayer(db,interaction);
  const group=interaction.options.getSubcommandGroup();
  const sub=interaction.options.getSubcommand();
  try{
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
      const ch=(id)=>id?`<#${id}>`:"—";
      await interaction.reply({content:[
        `**${c.name}**`,
        `Play: ${ch(c.play_channel_id)} • Mode: **${c.response_mode}**`,
        `Rules: ${ch(c.rules_channel_id)} • Case board: ${ch(c.case_board_channel_id)} • Journal: ${ch(c.journal_channel_id)}`,
        `Known NPCs: ${ch(c.known_npcs_channel_id)} • Known locations: ${ch(c.known_locations_channel_id)}`,
        `GM log: ${ch(c.gm_log_channel_id)} • State errors: ${ch(c.state_errors_channel_id)}`,
        `Veil Exposure: ${c.veil_exposure}/6`,
        `Session: ${s?`#${s.session_number} ${s.title||""} • ${s.assembly_phase||"assembly"}`:"none active"}`,
        `Party: ${db.getPartyState(interaction.guildId).established?"established":"not established"}`
      ].join("\n"),ephemeral:true});
      return true;
    }
    if(group==="campaign"&&sub==="channels"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const get=(n)=>interaction.options.getChannel(n)?.id;
      const c=db.configureChannels(interaction.guildId,{
        rulesChannelId:get("rules_channel"),caseBoardChannelId:get("case_board"),journalChannelId:get("journal"),
        knownNpcsChannelId:get("known_npcs"),knownLocationsChannelId:get("known_locations"),
        gmLogChannelId:get("gm_log"),stateErrorsChannelId:get("state_errors")
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
      const s=db.startSession(interaction.guildId,interaction.options.getString("title")||"",assembly);
      // Known players default to absent/offscreen until they opt in.
      for(const p of db.listPlayers(interaction.guildId)) db.setPresence(s.id,p.discord_user_id,"absent","offscreen",null,"Not checked in.");
      const next=s.assembly_phase==="party"
        ?"Returning established party: check in with `/vc session present`."
        :assembly==="manual"
          ?"Manual assembly selected; the human GM introduces the PCs."
          :"After expected players check in, the GM runs `/vc session assemble`.";
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
      const recap=await gm.summarizeSession(interaction.guildId);
      const s=db.endSession(interaction.guildId,recap);
      db.addFact(interaction.guildId,{category:"recap",key:`session-${s.session_number}-recap`,content:recap,visibility:"party",sessionId:s.id,source:"system"});
      await publishJournal({db,guild:interaction.guild,session:s,recap});
      await postGmLog({db,guild:interaction.guild,sessionId:s.id,title:`Session ${s.session_number} ended`,details:"Player-safe recap generated and campaign state closed."});
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
      await interaction.reply({content:`Created:\n${formatSheet(c)}\n\nUse \`/vc character import\` for a fully populated sheet or \`/vc character select\` during a session.`,ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="import"){
      const a=interaction.options.getAttachment("file",true);
      if(!a.name?.toLowerCase().endsWith(".json")) throw new Error("Import requires a .json file.");
      const res=await fetch(a.url);
      if(!res.ok) throw new Error("Could not download the attachment.");
      const data=await res.json();
      const c=db.importCharacter(interaction.guildId,interaction.user.id,data);
      await interaction.reply({content:`Imported **${c.name}**.`,ephemeral:true});
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
    if(group==="character"&&["retire","death"].includes(sub)){
      const c=db.findOwnedCharacter(interaction.guildId,interaction.user.id,interaction.options.getString("character",true));
      if(!c) throw new Error("Character not found.");
      const s=db.getActiveSession(interaction.guildId);
      const status=sub==="death"?"dead":"retired";
      db.setCharacterStatus(c.id,status,s?.id||null);
      if(s){
        db.db.prepare("UPDATE session_characters SET left_at=CURRENT_TIMESTAMP WHERE session_id=? AND character_id=? AND left_at IS NULL").run(s.id,c.id);
      }
      await interaction.reply(`**${c.name}** is now marked **${status}**. You may create/select another character immediately; the GM will bring them in when the fiction allows.`);
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
        e=db.setEncounterStatus(e.id,"active");
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_start",{encounter_id:e.id,budget:e.budget_bp,spent:e.spent_bp});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:`Encounter #${e.encounter_number} started`,details:`${e.spent_bp}/${e.budget_bp} BP • ${e.objective}`});
        await interaction.reply({content:`Encounter #${e.encounter_number} is now **active**. ${e.spent_bp>e.budget_bp?`⚠️ Composition is ${e.spent_bp-e.budget_bp} BP over budget.`:""}`,ephemeral:true}); return true;
      }
      if(sub==="end"){
        let e=db.getCurrentEncounter(session.id); if(!e) throw new Error("No planned or active encounter.");
        e=db.setEncounterStatus(e.id,"ended");
        db.audit(interaction.guildId,session.id,"human_gm",interaction.user.id,"encounter_end",{encounter_id:e.id});
        await postGmLog({db,guild:interaction.guild,sessionId:session.id,title:`Encounter #${e.encounter_number} ended`,details:`Final composition budget: ${e.spent_bp}/${e.budget_bp} BP.`});
        await interaction.reply({content:`Encounter #${e.encounter_number} ended.`,ephemeral:true}); return true;
      }
    }

    if(group==="party"&&sub==="establish"){
      if(!isGM(db,interaction)) throw new Error("Only a GM/admin may establish the continuing party.");
      const s=requireSession(db,interaction.guildId);
      const plan=db.getAssemblyPlan(s.id)||{};
      const party=db.establishParty(interaction.guildId,s.id,{name:interaction.options.getString("name")||"",bonds:plan.bonds||[]});
      const memberNames=(party.members||[]).map(m=>m.name);
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
      db.setPrivateChannel(interaction.guildId,interaction.user.id,interaction.channelId);
      await interaction.reply({content:"This channel is now your preferred private GM channel. Ensure only you, the bot, and any intended human GM can read it.",ephemeral:true});
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

    if(group==="roll"&&sub==="duality"){
      const s=requireSession(db,interaction.guildId);
      const a=db.controlledAssignment(s.id,interaction.user.id);
      const r=dualityRoll({
        modifier:interaction.options.getInteger("modifier")||0,
        experience:interaction.options.getInteger("experience")||0,
        advantage:interaction.options.getInteger("advantage")||0,
        disadvantage:interaction.options.getInteger("disadvantage")||0
      });
      db.addRoll(interaction.guildId,s.id,interaction.user.id,a?.character_id||null,"duality",r);
      const adv=r.adv_dice.length?` • d6 [${r.adv_dice.join(", ")}] = ${r.adv_net>=0?"+":""}${r.adv_net}`:"";
      await interaction.reply(`🎲 **Duality:** Hope **${r.hope}** / Fear **${r.fear}**${adv} • modifiers ${r.modifier+r.experience>=0?"+":""}${r.modifier+r.experience} → **${r.total} — ${r.duality}**`);
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
      await interaction.deferReply();
      const r=await gm.answerRulesQuestion({
        guildId:interaction.guildId,userId:interaction.user.id,userName:interaction.member?.displayName||interaction.user.username,
        question:interaction.options.getString("question",true),characterId:a?.character_id||null
      });
      const src=r.sources?.length?`\n\n_Reference: ${r.sources.join(", ")}_`:"";
      await interaction.editReply(`**Rules desk:** ${r.answer}${src}`);
      return true;
    }

    if(group==="intel"&&sub==="recap"){
      const row=db.db.prepare("SELECT * FROM sessions WHERE guild_id=? AND status='ended' ORDER BY session_number DESC LIMIT 1").get(interaction.guildId);
      await interaction.reply({content:row?.recap||"No completed-session recap yet.",ephemeral:true});
      return true;
    }
    if(group==="intel"&&sub==="clues"){
      const s=db.getActiveSession(interaction.guildId);
      const a=s?db.controlledAssignment(s.id,interaction.user.id):null;
      const rows=db.factsFor(interaction.guildId,interaction.user.id,{characterId:a?.character_id||null,includeGM:false,limit:80}).filter(x=>x.category==="clue");
      await interaction.reply({content:rows.length?rows.map(x=>`• ${x.content}`).join("\n"):"No recorded clues are available to you.",ephemeral:true});
      return true;
    }
    if(group==="intel"&&sub==="caseboard"){
      const rows=db.db.prepare(`
        SELECT * FROM threads WHERE guild_id=? AND status='active'
          AND (visibility IN ('public','party') OR (visibility='player' AND subject_user_id=?))
        ORDER BY updated_at DESC
      `).all(interaction.guildId,interaction.user.id);
      await interaction.reply({content:rows.length?rows.map(x=>`• **${x.label}**${x.notes?`: ${x.notes}`:""}`).join("\n"):"No active recorded threads.",ephemeral:true});
      return true;
    }

    if(group==="gm"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      if(sub==="fear"){
        const s=db.getActiveSession(interaction.guildId);
        const delta=interaction.options.getInteger("delta",true);
        db.audit(interaction.guildId,s?.id||null,"human_gm",interaction.user.id,"fear_delta",{delta});
        await interaction.reply({content:`Recorded Fear change: ${delta>=0?"+":""}${delta}. (Fear remains a table resource; this command logs rather than automates spending.)`,ephemeral:true});
        return true;
      }
      if(sub==="fact"){
        const vis=interaction.options.getString("visibility",true);
        const target=interaction.options.getUser("player");
        if(vis==="player"&&!target) throw new Error("Specific-player visibility requires a player.");
        const s=db.getActiveSession(interaction.guildId);
        db.addFact(interaction.guildId,{category:"fact",key:`human-${Date.now()}`,content:interaction.options.getString("content",true),visibility:vis,subjectUserId:target?.id||null,sessionId:s?.id||null,source:"human_gm"});
        await interaction.reply({content:"Fact recorded.",ephemeral:true});
        return true;
      }
    }
  } catch(err){
    const msg=err.message||String(err);
    const expected=/required|not found|unavailable|no active session|already active|only a gm|gm\/admin permission|manage server|choose another player|requires a proxy|must include|import requires|could not download|no active owned character|at least two present|manual assembly|already in established-party|invalid assembly|npc proxy|offered to another player|not releasable/i.test(msg);
    if(!expected && interaction.guild){
      await postStateError({db,guild:interaction.guild,error:err,context:`command:/vc ${group||""} ${sub||""}`,sessionId:db.getActiveSession(interaction.guildId)?.id||null});
    }
    const payload={content:`⚠️ ${msg}`,ephemeral:true};
    if(interaction.deferred||interaction.replied) await interaction.editReply(payload.content);
    else await interaction.reply(payload);
    return true;
  }
  return true;
}
