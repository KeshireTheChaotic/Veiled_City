import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { dualityRoll, parseDice } from "./dice.js";
import { publishJournal, postJournalEntry, publishEventResults, postGmLog, postStateError, postPrivateRelay, syncConfiguredSurfaces, postPlayMessage, sendPlayerPrivate } from "./publishing.js";
import { EncounterLibrary, livePcRoster, partyTier, baseBattlePoints, DIFFICULTY_ADJUSTMENTS, autoBuildComposition, recomputeBudget, battlePointCost, HEAVY_ROLES, defaultObjective } from "./encounter.js";
import { validateConceptDraft, prepareLevelup, applyLevelupToData, legalAdvancements, tierAchievement } from "./character-system.js";
import { buildCombatants, hpMarksForDamage, combatantLine } from "./combat.js";
import { applyGMEvents } from "./state.js";

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
          .addStringOption(o=>o.setName("character").setDescription("Character name").setRequired(true)))
        .addSubcommand(s=>s.setName("concept").setDescription("Draft a level-1 character from a plain-English description")
          .addStringOption(o=>o.setName("description").setDescription("Character concept, tone, background, capabilities, hooks").setRequired(true)))
        .addSubcommand(s=>s.setName("concept-status").setDescription("Show your latest AI-assisted character draft"))
        .addSubcommand(s=>s.setName("concept-accept").setDescription("Validate and create your latest character concept draft"))
        .addSubcommand(s=>s.setName("level-up").setDescription("Start a validated level-up draft")
          .addStringOption(o=>o.setName("character").setDescription("Owned character name").setRequired(true)))
        .addSubcommand(s=>s.setName("level-choose").setDescription("Choose the two advancements and mandatory new domain card")
          .addStringOption(o=>o.setName("advancement_one").setDescription("First advancement").setRequired(true).addChoices(
            {name:"Increase two traits",value:"traits"},{name:"+1 HP slot",value:"hp"},{name:"+1 Stress slot",value:"stress"},{name:"Increase two Experiences",value:"experience"},{name:"Additional domain card",value:"domain"},{name:"+1 Evasion",value:"evasion"},{name:"Upgrade subclass",value:"subclass"},{name:"+1 Proficiency (costs both)",value:"proficiency"},{name:"Multiclass (costs both)",value:"multiclass"}))
          .addStringOption(o=>o.setName("advancement_two").setDescription("Second advancement").setRequired(true).addChoices(
            {name:"Increase two traits",value:"traits"},{name:"+1 HP slot",value:"hp"},{name:"+1 Stress slot",value:"stress"},{name:"Increase two Experiences",value:"experience"},{name:"Additional domain card",value:"domain"},{name:"+1 Evasion",value:"evasion"},{name:"Upgrade subclass",value:"subclass"},{name:"+1 Proficiency (costs both)",value:"proficiency"},{name:"Multiclass (costs both)",value:"multiclass"}))
          .addStringOption(o=>o.setName("domain_card").setDescription("Mandatory new domain card name").setRequired(true))
          .addStringOption(o=>o.setName("detail_one").setDescription("Targets/details for first advancement"))
          .addStringOption(o=>o.setName("detail_two").setDescription("Targets/details for second advancement"))
          .addStringOption(o=>o.setName("domain").setDescription("Card domain; required for official/non-bundled cards"))
          .addIntegerOption(o=>o.setName("card_level").setDescription("Card level; required for official/non-bundled cards").setMinValue(1).setMaxValue(10))
          .addStringOption(o=>o.setName("tier_experience").setDescription("New +2 Experience required at levels 2, 5, and 8")))
        .addSubcommand(s=>s.setName("level-confirm").setDescription("Commit your ready level-up draft")))
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
        .addSubcommand(s=>s.setName("start").setDescription("Mark the planned encounter active and initialize combatants"))
        .addSubcommand(s=>s.setName("end").setDescription("End the current encounter"))
        .addSubcommand(s=>s.setName("combatants").setDescription("Show deterministic adversary HP/Stress/conditions"))
        .addSubcommand(s=>s.setName("damage").setDescription("Apply rolled damage to an adversary using thresholds")
          .addStringOption(o=>o.setName("target").setDescription("Combatant name or 8-char ID").setRequired(true))
          .addIntegerOption(o=>o.setName("amount").setDescription("Rolled incoming damage").setMinValue(0).setRequired(true)))
        .addSubcommand(s=>s.setName("heal").setDescription("Restore adversary HP")
          .addStringOption(o=>o.setName("target").setDescription("Combatant name or 8-char ID").setRequired(true))
          .addIntegerOption(o=>o.setName("hp").setDescription("HP to restore").setMinValue(1).setRequired(true)))
        .addSubcommand(s=>s.setName("stress").setDescription("Mark or clear adversary Stress")
          .addStringOption(o=>o.setName("target").setDescription("Combatant name or 8-char ID").setRequired(true))
          .addIntegerOption(o=>o.setName("delta").setDescription("Positive marks Stress; negative clears").setRequired(true)))
        .addSubcommand(s=>s.setName("condition").setDescription("Add/remove an adversary condition")
          .addStringOption(o=>o.setName("target").setDescription("Combatant name or 8-char ID").setRequired(true))
          .addStringOption(o=>o.setName("condition").setDescription("Condition name").setRequired(true))
          .addBooleanOption(o=>o.setName("remove").setDescription("Remove instead of add")))
        .addSubcommand(s=>s.setName("combatant-status").setDescription("Set adversary active/defeated/escaped/removed")
          .addStringOption(o=>o.setName("target").setDescription("Combatant name or 8-char ID").setRequired(true))
          .addStringOption(o=>o.setName("status").setDescription("New status").setRequired(true).addChoices({name:"Active",value:"active"},{name:"Defeated",value:"defeated"},{name:"Escaped",value:"escaped"},{name:"Removed",value:"removed"}))))
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
          .addIntegerOption(o=>o.setName("disadvantage").setDescription("Disadvantage d6 count"))
          .addBooleanOption(o=>o.setName("reaction").setDescription("Reaction roll: does not generate Hope/Fear or count spotlight")))
        .addSubcommand(s=>s.setName("damage").setDescription("Roll damage/other dice")
          .addStringOption(o=>o.setName("dice").setDescription("e.g. 2d8+3").setRequired(true))))
      .addSubcommandGroup(g=>g.setName("rules").setDescription("Grounded rules desk and persistent GM rulings")
        .addSubcommand(s=>s.setName("ask").setDescription("Ask a concise Daggerheart/Veiled City rules question")
          .addStringOption(o=>o.setName("question").setDescription("Rules question").setRequired(true)))
        .addSubcommand(s=>s.setName("ruling").setDescription("GM: save/replace an authoritative campaign ruling")
          .addStringOption(o=>o.setName("key").setDescription("Short stable key, e.g. veil-camera").setRequired(true))
          .addStringOption(o=>o.setName("question").setDescription("Question this ruling answers").setRequired(true))
          .addStringOption(o=>o.setName("ruling").setDescription("Authoritative campaign ruling").setRequired(true)))
        .addSubcommand(s=>s.setName("rulings").setDescription("Show saved campaign rulings")))
      .addSubcommandGroup(g=>g.setName("downtime").setDescription("Formal between-session projects and world turns")
        .addSubcommand(s=>s.setName("open").setDescription("GM: open a between-session downtime cycle")
          .addStringOption(o=>o.setName("label").setDescription("Downtime label"))
          .addStringOption(o=>o.setName("notes").setDescription("GM notes")))
        .addSubcommand(s=>s.setName("project").setDescription("Submit a character downtime project")
          .addStringOption(o=>o.setName("type").setDescription("Project type").setRequired(true).addChoices({name:"Recovery",value:"recovery"},{name:"Investigation",value:"investigation"},{name:"Crafting",value:"crafting"},{name:"Ritual",value:"ritual"},{name:"Relationship",value:"relationship"},{name:"Income/upkeep",value:"income"},{name:"Surveillance",value:"surveillance"},{name:"Research",value:"research"},{name:"Long-term project",value:"project"},{name:"Other",value:"other"}))
          .addStringOption(o=>o.setName("title").setDescription("Short project title").setRequired(true))
          .addStringOption(o=>o.setName("objective").setDescription("What you are trying to accomplish").setRequired(true))
          .addStringOption(o=>o.setName("character").setDescription("Owned character; defaults to first active/reserve"))
          .addIntegerOption(o=>o.setName("countdown").setDescription("Project countdown/progress target").setMinValue(1).setMaxValue(20))
          .addStringOption(o=>o.setName("visibility").setDescription("Who can know about this project").addChoices({name:"Party",value:"party"},{name:"Character private",value:"character"},{name:"Player private",value:"player"})))
        .addSubcommand(s=>s.setName("status").setDescription("Show current downtime projects available to you"))
        .addSubcommand(s=>s.setName("resolve").setDescription("GM: resolve the current downtime cycle and world turn")))
      .addSubcommandGroup(g=>g.setName("canon").setDescription("Authoritative campaign canon and conflict resolution")
        .addSubcommand(s=>s.setName("set").setDescription("GM: establish a durable canon value")
          .addStringOption(o=>o.setName("key").setDescription("Stable key, e.g. npc.mara-voss.surname").setRequired(true))
          .addStringOption(o=>o.setName("value").setDescription("Canon value").setRequired(true))
          .addStringOption(o=>o.setName("visibility").setDescription("Visibility").addChoices({name:"Party",value:"party"},{name:"Public",value:"public"},{name:"GM only",value:"gm"})))
        .addSubcommand(s=>s.setName("status").setDescription("Show current canon visible to you"))
        .addSubcommand(s=>s.setName("conflicts").setDescription("GM: list pending canon conflicts"))
        .addSubcommand(s=>s.setName("resolve").setDescription("GM: resolve a canon conflict")
          .addStringOption(o=>o.setName("conflict_id").setDescription("Conflict ID/prefix").setRequired(true))
          .addStringOption(o=>o.setName("resolution").setDescription("Resolution").setRequired(true).addChoices({name:"Keep existing",value:"existing"},{name:"Accept proposed",value:"proposed"},{name:"Use custom value",value:"custom"}))
          .addStringOption(o=>o.setName("custom_value").setDescription("Required for custom"))))
      .addSubcommandGroup(g=>g.setName("admin").setDescription("GM state snapshots and rollback")
        .addSubcommand(s=>s.setName("snapshot").setDescription("Create a manual campaign-state snapshot")
          .addStringOption(o=>o.setName("label").setDescription("Snapshot label"))
          .addStringOption(o=>o.setName("reason").setDescription("Reason")))
        .addSubcommand(s=>s.setName("snapshots").setDescription("List recent campaign snapshots"))
        .addSubcommand(s=>s.setName("rollback").setDescription("Restore a snapshot; creates a pre-rollback safety snapshot")
          .addStringOption(o=>o.setName("snapshot_id").setDescription("Snapshot ID/prefix").setRequired(true))))
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

function formatConceptDraft(row){
  if(!row) return "No pending character concept draft.";
  const d=row.draft||{}; const hooks=d.hook_proposals||[];
  return [
    `**Character Draft — ${d.name||"Unnamed"}**`,
    `${d.class||"?"}${d.subclass?` / ${d.subclass}`:""} • ${d.ancestry||"?"} • ${d.community||"?"}`,
    `Domains: ${(d.domains||[]).join(" / ")||"—"}`,
    `Experiences: ${(d.experiences||[]).join("; ")||"—"}`,
    `Cards: ${(d.domain_cards||[]).map(x=>typeof x==="string"?x:x.name).join("; ")||"—"}`,
    d.home?`Home: ${d.home}`:"", d.person?`Person: ${d.person}`:"", d.obligation?`Obligation: ${d.obligation}`:"",
    d.unresolved_incident?`Unresolved incident: ${d.unresolved_incident}`:"",
    hooks.length?`**Hook permissions**\n${hooks.map(h=>`• **${h.classification.replaceAll("_"," ")}** — ${h.text}`).join("\n")}`:"",
    d.mechanical_notes?`Mechanical notes: ${d.mechanical_notes}`:"",
    `Draft ID: \`${row.id.slice(0,8)}\``
  ].filter(Boolean).join("\n").slice(0,1900);
}

function formatLevelupDraft(draft,character){
  if(!draft) return "No pending level-up draft.";
  const p=draft.choices?.plan;
  const achievement=tierAchievement(draft.to_level);
  return [
    `**Level Up — ${character?.name||"Character"} ${draft.from_level} → ${draft.to_level}**`,
    `Tier achievement: ${achievement.new_experience?"new Experience +2; ":""}${achievement.proficiency?"+1 Proficiency; ":""}${achievement.clear_trait_marks?"clear marked traits":"none"}`,
    `Legal advancements: ${legalAdvancements(draft.to_level).join(", ")}`,
    p?`Selected: ${p.advancements.join(" + ")}\nMandatory card: ${p.automatic_domain_card.name} (${p.automatic_domain_card.domain} ${p.automatic_domain_card.level})\nStatus: **${draft.status}**`:`Use \`/vc character level-choose\` to choose two advancements and the mandatory domain card.`,
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
  const current=db.db.prepare("SELECT * FROM published_messages WHERE guild_id=?").all(guild.id);
  for(const row of current){
    if(target.has(`${row.channel_id}:${row.message_id}`)) continue;
    try{const ch=await guild.channels.fetch(row.channel_id); const m=await ch?.messages?.fetch(row.message_id); if(m) await m.delete();}catch{}
  }
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
        `Veil Exposure: ${c.veil_exposure}/6 • Fear: ${c.fear??0}/12`,
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
      db.ensureCampaign(interaction.guildId);
      db.snapshotCampaign(interaction.guildId,{label:"Pre-session",reason:"Automatic snapshot before session start",createdBy:interaction.user.id});
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
      const activeBefore=db.getActiveSession(interaction.guildId);
      db.snapshotCampaign(interaction.guildId,{label:`Pre-end Session ${activeBefore?.session_number||""}`.trim(),reason:"Automatic snapshot before session end",createdBy:interaction.user.id});
      const recap=await gm.summarizeSession(interaction.guildId);
      const s=db.endSession(interaction.guildId,recap);
      db.addFact(interaction.guildId,{category:"recap",key:`session-${s.session_number}-recap`,content:recap,visibility:"party",sessionId:s.id,source:"system"});
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
      db.snapshotCampaign(interaction.guildId,{label:`Pre-${status} ${c.name}`,reason:`Automatic snapshot before marking ${c.name} ${status}`,createdBy:interaction.user.id});
      db.setCharacterStatus(c.id,status,s?.id||null);
      if(s){
        db.db.prepare("UPDATE session_characters SET left_at=CURRENT_TIMESTAMP WHERE session_id=? AND character_id=? AND left_at IS NULL").run(s.id,c.id);
      }
      await interaction.reply(`**${c.name}** is now marked **${status}**. You may create/select another character immediately; the GM will bring them in when the fiction allows.`);
      return true;
    }

    if(group==="character"&&sub==="concept"){
      await interaction.deferReply({ephemeral:true});
      const description=interaction.options.getString("description",true);
      const draft=await gm.draftCharacterConcept({guildId:interaction.guildId,userId:interaction.user.id,userName:interaction.member?.displayName||interaction.user.username,description});
      const validation=validateConceptDraft(draft);
      const row=db.createCharacterDraft(interaction.guildId,interaction.user.id,description,draft);
      const note=validation.ok?"\n\n✅ Draft passes v3.2 level-1 structural validation. Review it, then use /vc character concept-accept.":`\n\n⚠️ Draft needs revision before acceptance:\n${validation.errors.map(x=>`• ${x}`).join("\n")}\nRun /vc character concept again with the correction in your description.`;
      await interaction.editReply((formatConceptDraft(row)+note).slice(0,1950));
      return true;
    }
    if(group==="character"&&sub==="concept-status"){
      const row=db.latestCharacterDraft(interaction.guildId,interaction.user.id,{status:"draft"});
      await interaction.reply({content:formatConceptDraft(row),ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="concept-accept"){
      const row=db.latestCharacterDraft(interaction.guildId,interaction.user.id,{status:"draft"});
      if(!row) throw new Error("No pending character concept draft.");
      const v=validateConceptDraft(row.draft); if(!v.ok) throw new Error(`Draft is not valid: ${v.errors.join("; ")}`);
      const d=structuredClone(row.draft);
      d.class=v.normalizedClass||d.class;
      d.hook_permissions=(d.hook_proposals||[]).map(h=>({text:h.text,classification:h.classification}));
      d.gm_hooks=(d.hook_proposals||[]).filter(h=>h.classification!=="established").map(h=>h.text);
      const c=db.createCharacter(interaction.guildId,interaction.user.id,d.name,d);
      db.setCharacterDraftStatus(row.id,"accepted");
      db.audit(interaction.guildId,null,"player",interaction.user.id,"character_concept_accept",{character_id:c.id,draft_id:row.id});
      await interaction.reply({content:`Created **${c.name}** from the approved concept draft.\n\n${formatSheet(c)}`,ephemeral:true});
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
      if(!draft) throw new Error("No pending level-up draft. Start with `/vc character level-up`.");
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
      await interaction.reply({content:formatLevelupDraft(ready,c)+"\n\nUse `/vc character level-confirm` to commit this level-up.",ephemeral:true});
      return true;
    }
    if(group==="character"&&sub==="level-confirm"){
      const draft=db.latestLevelupDraft(interaction.guildId,interaction.user.id);
      if(!draft||draft.status!=="ready"||!draft.choices?.plan) throw new Error("No ready level-up draft. Use `/vc character level-choose` first.");
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
        db.snapshotCampaign(interaction.guildId,{label:`Pre-encounter ${e.encounter_number}`,reason:"Automatic snapshot before encounter start",createdBy:interaction.user.id});
        e=db.setEncounterStatus(e.id,"active");
        const combatants=db.initializeCombatants(e.id,buildCombatants(e,lib));
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
        const target=interaction.options.getString("target",true); const c=db.findCombatant(e.id,target); if(!c) throw new Error("Combatant not found. Use `/vc encounter combatants` for IDs.");
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
      const reaction=interaction.options.getBoolean("reaction")||false;
      const r=dualityRoll({
        modifier:interaction.options.getInteger("modifier")||0,
        experience:interaction.options.getInteger("experience")||0,
        advantage:interaction.options.getInteger("advantage")||0,
        disadvantage:interaction.options.getInteger("disadvantage")||0
      });
      db.addRoll(interaction.guildId,s.id,interaction.user.id,a?.character_id||null,reaction?"reaction":"duality",{...r,reaction});
      let resourceNote="";
      if(!reaction){
        if(a?.character_id && ["Hope","Critical"].includes(r.duality)){
          const updated=db.updateCharacterData(a.character_id,data=>{
            data.resources=data.resources||{}; data.resources.hope=Math.min(6,Number(data.resources.hope||0)+1);
            if(r.duality==="Critical"){
              data.resources.stress=data.resources.stress||{current:0,max:6};
              data.resources.stress.current=Math.max(0,Number(data.resources.stress.current||0)-1);
            }
          });
          resourceNote=` • Hope ${updated.data.resources.hope}/6${r.duality==="Critical"?"; cleared 1 Stress":""}`;
        }else if(r.duality==="Fear"){
          const fear=db.changeFear(interaction.guildId,1); resourceNote=` • GM Fear ${fear}/12`;
        }
        const e=db.getCurrentEncounter(s.id);
        if(e?.status==="active"&&a?.character_id) db.recordSpotlight(e.id,a.character_id);
      }
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
      await interaction.deferReply();
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
      await interaction.reply({content:`Saved **GM_RULING** \`${row.ruling_key}\`: ${row.ruling}`,ephemeral:true});
      return true;
    }
    if(group==="rules"&&sub==="rulings"){
      const rows=db.searchRulesRulings(interaction.guildId,"");
      await interaction.reply({content:rows.length?`**Campaign GM Rulings**\n${rows.map(r=>`• \`${r.ruling_key}\` — ${r.question}: **${r.ruling}**`).join("\n")}`.slice(0,1950):"No saved GM rulings.",ephemeral:true});
      return true;
    }

    if(group==="downtime"&&sub==="open"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      if(db.getActiveSession(interaction.guildId)) throw new Error("Downtime can only be opened between sessions.");
      const last=db.db.prepare("SELECT id FROM sessions WHERE guild_id=? AND status='ended' ORDER BY session_number DESC LIMIT 1").get(interaction.guildId);
      const cycle=db.openDowntime(interaction.guildId,{label:interaction.options.getString("label")||"Between Sessions",sourceSessionId:last?.id||null,notes:interaction.options.getString("notes")||"",openedBy:interaction.user.id});
      await interaction.reply({content:`Opened downtime cycle **${cycle.label}**. Players may submit projects with \`/vc downtime project\`.`,ephemeral:false});
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
      db.db.prepare("UPDATE downtime_cycles SET status='resolving' WHERE id=?").run(cycle.id);
      await interaction.deferReply({ephemeral:true});
      const resolved=await gm.resolveDowntime({guildId:interaction.guildId,cycle:{...cycle,status:"resolving"},projects});
      const byId=new Map(projects.map(p=>[p.id,p]));
      for(const r of resolved.project_results||[]){
        const p=byId.get(r.project_id); if(!p) continue;
        const progress=Math.max(0,Math.min(p.max_progress,Number(p.progress||0)+Number(r.progress_delta||0)));
        const status=r.status==="completed"||progress>=p.max_progress?"completed":r.status;
        db.updateDowntimeProject(p.id,{progress,status,result:r.result||""});
        const msg=`**Downtime — ${p.title}**\n${r.result||"Resolved."}\nProgress: ${progress}/${p.max_progress} • ${status}`;
        if(p.visibility==="party") await postJournalEntry({db,guild:interaction.guild,title:`Downtime: ${p.title}`,content:msg});
        else await sendPlayerPrivate({db,guild:interaction.guild,userId:p.discord_user_id,content:msg,sessionId:null,characterId:p.visibility==="character"?p.character_id:null});
      }
      const eventResults=applyGMEvents(db,interaction.guildId,cycle.source_session_id||null,resolved.events||[],{mode:"party",actorUserId:null,actorCharacterId:null});
      await publishEventResults({db,guild:interaction.guild,results:eventResults});
      for(const r of eventResults.filter(x=>x.type==="canon"&&x.status==="conflict")) await postStateError({db,guild:interaction.guild,error:new Error(`Pending canon conflict ${r.conflict_id}`),context:"downtime-canon-conflict",sessionId:cycle.source_session_id||null});
      const done=db.resolveDowntimeCycle(cycle.id,resolved.summary||"");
      await postGmLog({db,guild:interaction.guild,title:`Downtime resolved — ${done.label}`,details:`${resolved.summary||""}\nWorld moves: ${(resolved.world_moves||[]).join("; ")||"none"}`});
      db.snapshotCampaign(interaction.guildId,{label:`Post-downtime ${done.label}`,reason:"Automatic snapshot after downtime resolution",createdBy:interaction.user.id});
      await interaction.editReply(`Downtime resolved. **${projects.length}** project(s) processed. Party-visible results were posted to the journal; private results were delivered privately.`);
      return true;
    }

    if(group==="canon"&&sub==="set"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const s=db.getActiveSession(interaction.guildId);
      const r=db.proposeCanon(interaction.guildId,{key:interaction.options.getString("key",true),value:interaction.options.getString("value",true),visibility:interaction.options.getString("visibility")||"party",sessionId:s?.id||null,sourceType:"human_gm",sourceId:interaction.user.id,provenance:"/vc canon set"});
      if(r.status==="conflict") await interaction.reply({content:`⚠️ Canon conflict created: \`${r.conflict.id.slice(0,8)}\`\nExisting: ${r.existing.value}\nProposed: ${r.conflict.proposed_value}\nResolve with \`/vc canon resolve\`.`,ephemeral:true});
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
    if(group==="canon"&&sub==="resolve"){
      if(!isGM(db,interaction)) throw new Error("GM/admin permission required.");
      const rows=db.listCanonConflicts(interaction.guildId); const row=byPrefix(rows,interaction.options.getString("conflict_id",true)); if(!row) throw new Error("Pending canon conflict not found.");
      db.snapshotCampaign(interaction.guildId,{label:`Pre-canon ${row.canon_key}`,reason:`Before resolving canon conflict ${row.id}`,createdBy:interaction.user.id});
      const event=db.resolveCanonConflict(interaction.guildId,row.id,{resolution:interaction.options.getString("resolution",true),customValue:interaction.options.getString("custom_value")||"",actorId:interaction.user.id});
      await postGmLog({db,guild:interaction.guild,title:"Canon conflict resolved",details:`${row.canon_key} → ${event?.value||"existing canon retained"}`});
      await interaction.reply({content:`Resolved **${row.canon_key}** → ${event?.value||row.existing_value}`,ephemeral:true});
      return true;
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
        const fear=db.changeFear(interaction.guildId,delta);
        db.audit(interaction.guildId,s?.id||null,"human_gm",interaction.user.id,"fear_delta",{delta,fear});
        await interaction.reply({content:`Fear ${delta>=0?"+":""}${delta} → **${fear}/12**.`,ephemeral:true});
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
