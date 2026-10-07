/** Player-safe campaign-context package builder for external character concept generation. */
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { zipStore } from "./character-export.js";

function clip(v,n=5000){
  const s=String(v??"");
  return s.length>n?`${s.slice(0,n)}\n...[truncated]`:s;
}
function safeStem(v){
  return String(v||"Campaign").normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"Campaign";
}
function characterSummary(c){
  const d=c?.data||{};
  return {
    character_id:c?.id||null,name:c?.name||d.name||"Unknown",status:c?.status||"unknown",level:d.level??1,
    class:d.class||"",subclass:d.subclass||"",ancestry:d.ancestry||"",community:d.community||"",domains:d.domains||[],
    experiences:(d.experiences||[]).map(x=>typeof x==="string"?x:{name:x.name||"Experience",modifier:x.modifier??null})
  };
}
function sessionView(s){return {session_number:s.session_number,title:s.title||"",ended_at:s.ended_at,recap:clip(s.recap||"",5500)};}
function threadView(r){return {id:r.id,label:r.label,status:r.status,notes:clip(r.notes||"",1200),updated_at:r.updated_at};}
function refView(r){return {key:r.entity_key,name:r.display_name,summary:clip(r.summary||"",1600),updated_at:r.updated_at};}
function relationshipView(r){return {from_type:r.from_type,from_label:r.from_label||r.from_key,to_type:r.to_type,to_label:r.to_label||r.to_key,relationship_type:r.relationship_type,score:r.score,note:clip(r.note||"",900),updated_at:r.updated_at};}
function handoutView(h){return {id:h.id,title:h.title,kind:h.kind,authority:h.authority,case_key:h.case_key,npc_key:h.npc_key,location_key:h.location_key,canonical_facts:h.canonical_facts||[],content_excerpt:clip(h.content||"",1400),created_at:h.created_at};}

export function buildConceptCampaignContext({db,guildId,userId,historySessions=10}){
  const campaign=db.ensureCampaign(guildId);
  const active=db.getActiveSession(guildId);
  const party=db.getPartyState(guildId);
  const members=(party.members||[]).map(m=>db.getCharacter(m.character_id)).filter(Boolean).map(characterSummary);
  const liveRoster=active?db.roster(active.id).filter(r=>["present","guest","late"].includes(r.presence)&&r.character_id).map(r=>characterSummary(db.getCharacter(r.character_id))):[];
  const relationships=db.listRelationships(guildId,{includeGM:false}).filter(r=>["public","party"].includes(r.visibility)).map(relationshipView);
  const canon=db.listCanon(guildId,{includeGM:false,limit:500}).filter(r=>["public","party"].includes(r.visibility)).map(r=>({key:r.canon_key,value:r.value,visibility:r.visibility,session_id:r.session_id,provenance:r.provenance,created_at:r.created_at}));
  const handouts=db.listHandoutsFor(guildId,userId,{includeGM:false,limit:120}).filter(h=>["public","party"].includes(h.visibility)).map(handoutView);
  const downtime=db.playerSafeDowntime(guildId);
  return {
    export_meta:{schema:"veiled-city-character-concept-context-v3.3.3",visibility:"player_safe",exported_at:new Date().toISOString(),history_sessions:historySessions},
    campaign:{name:campaign.name||"Veiled City",veil_exposure:campaign.veil_exposure??0,party_established:Boolean(party.established),party_name:party.name||"",current_session:active?{number:active.session_number,title:active.title||"",assembly_phase:active.assembly_phase||""}:null},
    established_party:members,
    current_session_roster:liveRoster,
    recent_sessions:db.recentSessions(guildId,{limit:historySessions}).map(sessionView),
    recent_table_context:db.recentPartyMessages(guildId,{limit:40}).map(m=>({session_id:m.session_id,speaker:m.speaker_name,content:clip(m.content,1400),created_at:m.created_at})),
    active_and_historical_threads:db.playerSafeThreads(guildId,{limit:160}).map(threadView),
    known_npcs:db.listReferences(guildId,"npc",{publicOnly:true}).map(refView),
    known_locations:db.listReferences(guildId,"location",{publicOnly:true}).map(refView),
    relationship_graph:relationships,
    player_safe_canon:canon,
    player_safe_facts:db.playerSafeFacts(guildId,{limit:200}).map(f=>({category:f.category,key:f.fact_key,content:clip(f.content,1400),session_id:f.session_id,source:f.source,created_at:f.created_at})),
    player_safe_clocks:db.playerSafeClocks(guildId).map(c=>({key:c.clock_key,label:c.label,value:c.value,max_value:c.max_value,updated_at:c.updated_at})),
    evidence_handouts:handouts,
    downtime:downtime.cycle?{cycle:{label:downtime.cycle.label,status:downtime.cycle.status,summary:clip(downtime.cycle.summary||"",2500)},projects:downtime.projects.map(p=>({type:p.project_type,title:p.title,objective:p.objective,progress:p.progress,max_progress:p.max_progress,status:p.status,result:clip(p.result||"",1000)}))}:null
  };
}

function contextMarkdown(ctx){
  const lines=[
    `# ${ctx.campaign.name} — Character Concept Context`,`**PLAYER SAFE — generated from current campaign state.**`,``,
    `This is a continuity packet for designing a NEW player character who can enter the campaign naturally. It intentionally excludes GM-only information and character-private secrets.`,``,
    `## Current Campaign`,`- Veil Exposure: ${ctx.campaign.veil_exposure}/6`,`- Established party: ${ctx.campaign.party_established?ctx.campaign.party_name||"Yes":"No"}`,
    ctx.campaign.current_session?`- Active session: #${ctx.campaign.current_session.number} ${ctx.campaign.current_session.title||""} (${ctx.campaign.current_session.assembly_phase})`:`- Active session: none`,``,
    `## Established Party`,...(ctx.established_party.length?ctx.established_party.map(c=>`- **${c.name}** — Level ${c.level} ${c.class}${c.subclass?` / ${c.subclass}`:""}; ${c.ancestry}${c.community?` • ${c.community}`:""}; domains ${(c.domains||[]).join(" / ")||"—"}`):["- None established."]),``,
    `## Recent Sessions`,...(ctx.recent_sessions.length?ctx.recent_sessions.flatMap(s=>[`### Session ${s.session_number}${s.title?`: ${s.title}`:""}`,s.recap||"No recap recorded.",``]):["No completed session recaps are recorded.",``]),
    `## Current Case Threads`,...(ctx.active_and_historical_threads.filter(t=>["active","dormant"].includes(t.status)).map(t=>`- **${t.label}** [${t.status}]${t.notes?`: ${t.notes}`:""}`)),``,
    `## Known NPCs`,...(ctx.known_npcs.map(n=>`- **${n.name}** — ${n.summary||"Known to the party."}`)),``,
    `## Known Locations`,...(ctx.known_locations.map(n=>`- **${n.name}** — ${n.summary||"Known to the party."}`)),``,
    `## Relationship Graph`,...(ctx.relationship_graph.length?ctx.relationship_graph.map(r=>`- **${r.from_label}** — ${r.relationship_type} (${r.score>=0?"+":""}${r.score}) → **${r.to_label}**${r.note?`: ${r.note}`:""}`):["- No party-visible structured relationships recorded."]),``,
    `## Player-Safe Canon`,...(ctx.player_safe_canon.length?ctx.player_safe_canon.map(c=>`- \`${c.key}\`: ${c.value}`):["- No structured canon entries recorded."]),``,
    `## Evidence & Handouts`,...(ctx.evidence_handouts.length?ctx.evidence_handouts.map(h=>`- **${h.title}** [${h.authority}]${h.canonical_facts.length?`: ${h.canonical_facts.join("; ")}`:""}`):["- No party-visible evidence handouts recorded."])
  ];
  return lines.join("\n");
}

const characterImportExample={
  name:"NEW CHARACTER NAME",level:1,class:"",subclass:"",ancestry:"",community:"",domains:[],traits:{},resources:{hp:{current:0,max:0},stress:{current:0,max:6},hope:2,armor:{current:0,max:0}},experiences:[],domain_cards:[],inventory:[],evasion:0,proficiency:1,thresholds:{major:0,severe:0},background:"",home:"",person:"",obligation:"",opening_status:"",goals:[],unresolved_incident:"",gm_hooks:[],faction_connections:[],entry_hooks:[],exit_hooks:[],hook_permissions:[],notes:""
};
const gmHooksExample={
  schema:"veiled-city-gm-hooks-import-v3.3.3",
  character_name:"NEW CHARACTER NAME",
  hooks:[{
    key:"stable-short-key",title:"GM-facing hook title",type:"relationship",premise:"A possible hidden complication that fits current player-visible campaign facts without claiming unrevealed canon.",permission:"open_question",suggested_entry:"How this hook could bring the character into an active case.",targets:[{type:"npc",label:"Known NPC Name",relationship_type:"contact",score:1,note:"Why this connection is useful."}],notes:"GM-only proposal; optional."
  }],
  canon_suggestions:[{key:"character.new-character.open-question",value:"A possible future canon answer, not authoritative until the GM chooses it.",reason:"Why it fits current campaign continuity."}]
};

function aiInstructions(){
  return `# AI Instructions — Create a Veiled City Character for This Campaign\n\nYou are helping a player create a NEW Level 1 Veiled City player character for an already-running multiplayer Daggerheart campaign.\n\n## Source priority\n1. CAMPAIGN_CONTEXT.json / CAMPAIGN_CONTEXT.md describe the CURRENT player-visible campaign.\n2. REFERENCE/PLAYER_COMPENDIUM.md is the bundled Veiled City player rules and setting reference.\n3. Do not invent Veiled City mechanics that conflict with those files. If an official Daggerheart class detail is not in the package and you are uncertain, say so rather than fabricating it.\n\n## Design goals\n- Make the new PC feel as though they belong in the campaign NOW, not at campaign start.\n- Use current cases, known factions, NPCs, locations, party composition, and relationships to identify natural entry points.\n- Avoid duplicating another PC's exact role unless the player explicitly wants overlap.\n- Do not assume the new PC knows character-private facts. This export intentionally contains only campaign-safe context.\n- Preserve player agency: do not decide hidden answers to the new PC's personal mysteries in the player-facing character file.\n- Prefer 2-5 useful entry/stay hooks tied to current narrative conditions.\n\n## Required output\nCreate at least TWO JSON files:\n\n### 1. CHARACTER_<Name>.json\nMust be directly importable by the player with /vc-character import. Follow SCHEMAS/CHARACTER_IMPORT_EXAMPLE.json. Populate mechanics only from the supplied rules/context or reliable Daggerheart knowledge.\n\n### 2. GM_HOOKS_<Name>.json\nThis is a SEPARATE GM-facing proposal package. Follow SCHEMAS/GM_HOOKS_IMPORT_EXAMPLE.json exactly. The player should pass this file to the campaign GM for /vc-character import-gm-hooks.\n\nGM hooks may propose:\n- ties to CURRENT NPCs, factions, locations, cases, evidence, or relationships;\n- reasons the new PC can enter the current narrative;\n- complications, debts, rivals, missing persons, obligations, or faction interest;\n- open questions the GM may answer later.\n\nGM hooks MUST NOT:\n- claim access to hidden campaign information not present in this package;\n- overwrite established player-safe canon;\n- secretly redefine existing PCs;\n- declare a suggested hidden answer authoritative.\n\nAny canon_suggestions are GM REVIEW ONLY. They are imported into a dedicated proposal queue, not automatically entered into the canon ledger. The GM reviews them with /vc-canon proposals and resolves them with /vc-canon proposal-resolve.\n\n## Freeform narrative Markdown\nWhen useful narrative does not fit the structured JSON fields, also create these files using the exact package paths:\n\n### 3. PLAYER/PLAYERS/<Name>.md\nPlayer-safe prose such as voice, appearance, habits, expanded background, or characterization. Do not place GM-only secrets here.\n\n### 4. GM_PRIVATE/PLAYERS/GM_PRIVATE_<Name>.md\nGM-only prose for hidden character-specific narrative that does not belong in structured GM hooks or canon proposals. Do not duplicate mechanics. Speculative mystery answers remain proposals unless the GM promotes them through the canon workflow.\n\nThe player can import PLAYER narrative as the optional narrative attachment on /vc-character import or later with /vc-character narrative-import scope:player. The GM can import GM-private narrative as the optional narrative attachment on /vc-character import-gm-hooks or later with /vc-character narrative-import scope:gm_private.\n\nYou may also create a DOCX for human reading, but JSON remains authoritative for mechanics/resources. These Markdown files are supplemental narrative context.\n`;
}

function gmImportInstructions(){
  return `# GM Import Instructions\n\nAfter the player creates the character externally:\n\n1. Player imports CHARACTER_<Name>.json with:\n   /vc-character import\n   If PLAYER/PLAYERS/<Name>.md exists, attach it as the optional narrative file or import it later with /vc-character narrative-import scope:player.\n\n2. The GM reviews GM_HOOKS_<Name>.json. These are PROPOSALS, not hidden truth.\n\n3. If acceptable, the GM imports it with:\n   /vc-character import-gm-hooks file:<GM_HOOKS file>\n   If GM_PRIVATE/PLAYERS/GM_PRIVATE_<Name>.md exists, attach it as the optional narrative file or import it later with /vc-character narrative-import scope:gm_private.\n\nThe hook import stores hooks as GM-private character hooks and creates listed relationship targets with GM visibility. canon_suggestions enter the GM-only proposal queue and DO NOT automatically become authoritative canon. Review with /vc-canon proposals, then accept/reject/edit with /vc-canon proposal-resolve. If an accepted proposal contradicts current canon, Veilkeeper creates a normal canon conflict and keeps the proposal linked to that conflict until it is resolved.\n\nNarrative Markdown is supplemental. Structured character JSON remains authoritative for mechanics/resources, and the canon ledger remains authoritative for durable world truth.\n`;
}

export function createConceptContextPackage({db,contentRoot,guildId,userId,historySessions=10}){
  const ctx=buildConceptCampaignContext({db,guildId,userId,historySessions});
  const compendiumPath=path.join(contentRoot,"PLAYER","PLAYER_COMPENDIUM.md");
  const compendium=fs.existsSync(compendiumPath)?fs.readFileSync(compendiumPath,"utf8"):"# Veiled City Player Compendium\n\nBundled player compendium was not found. Ask the GM for the player-safe rules package.";
  const entries=[
    ["README.md",`# Veiled City Character Concept Context Package\n\nGenerated ${ctx.export_meta.exported_at}.\n\nUpload this ZIP to ChatGPT or another capable AI, then describe the kind of character you want to play. Start with AI_CHARACTER_CREATION_INSTRUCTIONS.md.\n\nThis package is PLAYER SAFE and intentionally excludes GM-only state and character-private secrets.\n`],
    ["AI_CHARACTER_CREATION_INSTRUCTIONS.md",aiInstructions()],
    ["CAMPAIGN_CONTEXT.md",contextMarkdown(ctx)],
    ["CAMPAIGN_CONTEXT.json",JSON.stringify(ctx,null,2)+"\n"],
    ["REFERENCE/PLAYER_COMPENDIUM.md",compendium],
    ["SCHEMAS/CHARACTER_IMPORT_EXAMPLE.json",JSON.stringify(characterImportExample,null,2)+"\n"],
    ["SCHEMAS/GM_HOOKS_IMPORT_EXAMPLE.json",JSON.stringify(gmHooksExample,null,2)+"\n"],
    ["SCHEMAS/NARRATIVE_MARKDOWN_PATHS.md",`# Freeform Character Narrative Paths\n\nUse these files only for prose not represented cleanly in JSON.\n\n- Player-safe: \`PLAYER/PLAYERS/<Character_Name>.md\`\n- GM-only: \`GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md\`\n\nStructured JSON controls mechanics/resources. The canon ledger controls durable world truth.\n`],
    ["GM_IMPORT_INSTRUCTIONS.md",gmImportInstructions()]
  ];
  const zip=zipStore(entries);
  return {name:`VEILED_CITY_CHARACTER_CONCEPT_CONTEXT_${safeStem(ctx.campaign.name)}.zip`,buffer:zip,context:ctx,files:entries.map(([name])=>name)};
}
