import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const guildId=process.argv[2];
const mode=(process.argv[3]||"full").toLowerCase(); // full | player
if(!guildId) {
  console.error("Usage: node scripts/export-campaign.mjs <guildId> [full|player]");
  process.exit(2);
}
const dbPath=path.resolve(process.cwd(),process.env.DATABASE_PATH||"./data/veiled_city.sqlite");
const db=new DatabaseSync(dbPath,{readOnly:true});
const all=(sql,...a)=>db.prepare(sql).all(...a);
const one=(sql,...a)=>db.prepare(sql).get(...a);

const sessions=mode==="player"
  ? all("SELECT id,guild_id,session_number,title,assembly_mode,assembly_phase,status,started_at,ended_at,recap FROM sessions WHERE guild_id=? ORDER BY session_number",guildId)
  : all("SELECT * FROM sessions WHERE guild_id=? ORDER BY session_number",guildId);
const sessionIds=sessions.map(x=>x.id);
const placeholders=sessionIds.length?sessionIds.map(()=>"?").join(","):"''";
const exportObj={
  export_version:"3.5.1",
  visibility:mode==="player"?"player_safe":"gm_private_full",
  exported_at:new Date().toISOString(),
  campaign:one("SELECT * FROM campaigns WHERE guild_id=?",guildId),
  players:all("SELECT guild_id,discord_user_id,display_name,accessibility_json FROM players WHERE guild_id=?",guildId),
  characters:all("SELECT * FROM characters WHERE guild_id=?",guildId),
  sessions,
  presence:sessionIds.length?all(`SELECT * FROM session_presence WHERE session_id IN (${placeholders})`,...sessionIds):[],
  assignments:sessionIds.length?all(`SELECT * FROM session_characters WHERE session_id IN (${placeholders})`,...sessionIds):[],
  npc_proxies:mode!=="player" && sessionIds.length?all(`SELECT * FROM npc_proxies WHERE session_id IN (${placeholders})`,...sessionIds):[],
  encounters:mode!=="player" && sessionIds.length?all(`SELECT * FROM encounters WHERE session_id IN (${placeholders})`,...sessionIds):[],
  encounter_combatants:mode!=="player" && sessionIds.length?all(`SELECT * FROM encounter_combatants WHERE session_id IN (${placeholders})`,...sessionIds):[],
  facts:mode==="player"
    ? all("SELECT * FROM facts WHERE guild_id=? AND visibility IN ('public','party')",guildId)
    : all("SELECT * FROM facts WHERE guild_id=?",guildId),
  clocks:mode==="player"
    ? all("SELECT * FROM clocks WHERE guild_id=? AND visibility IN ('public','party')",guildId)
    : all("SELECT * FROM clocks WHERE guild_id=?",guildId),
  threads:mode==="player"
    ? all("SELECT * FROM threads WHERE guild_id=? AND visibility IN ('public','party')",guildId)
    : all("SELECT * FROM threads WHERE guild_id=?",guildId),
  messages:mode==="player"
    ? all("SELECT * FROM messages WHERE guild_id=? AND visibility='party'",guildId)
    : all("SELECT * FROM messages WHERE guild_id=?",guildId),
  rolls:all("SELECT * FROM rolls WHERE guild_id=?",guildId),
  canon:mode==="player" ? all("SELECT * FROM canon_events WHERE guild_id=? AND status='current' AND visibility IN ('public','party')",guildId) : all("SELECT * FROM canon_events WHERE guild_id=?",guildId),
  rules_rulings:all("SELECT * FROM rules_rulings WHERE guild_id=? AND active=1",guildId),
  downtime_cycles:all("SELECT * FROM downtime_cycles WHERE guild_id=?",guildId),
  downtime_projects:mode==="player" ? all("SELECT * FROM downtime_projects WHERE guild_id=? AND visibility IN ('public','party')",guildId) : all("SELECT * FROM downtime_projects WHERE guild_id=?",guildId),
  relationships:mode==="player" ? all("SELECT * FROM relationships WHERE guild_id=? AND visibility IN ('public','party')",guildId) : all("SELECT * FROM relationships WHERE guild_id=?",guildId),
  handouts:mode==="player" ? all("SELECT * FROM handouts WHERE guild_id=? AND status='active' AND visibility IN ('public','party')",guildId) : all("SELECT * FROM handouts WHERE guild_id=?",guildId),
  character_narratives:mode!=="player" ? all("SELECT * FROM character_narratives WHERE guild_id=?",guildId) : [],
  encounter_aftermath:mode!=="player" ? all("SELECT * FROM encounter_aftermath WHERE guild_id=?",guildId) : []
};
if(mode!=="player") {
  exportObj.audit_log=all("SELECT * FROM audit_log WHERE guild_id=?",guildId);
  exportObj.canon_conflicts=all("SELECT * FROM canon_conflicts WHERE guild_id=?",guildId);
  exportObj.character_drafts=all("SELECT * FROM character_drafts WHERE guild_id=?",guildId);
  exportObj.levelup_drafts=all("SELECT * FROM levelup_drafts WHERE guild_id=?",guildId);
  exportObj.snapshots=all("SELECT id,guild_id,label,reason,created_by,created_at FROM campaign_snapshots WHERE guild_id=? ORDER BY created_at",guildId);
}

const out=path.resolve(process.cwd(),`./data/veiled-city-${guildId}-${mode}-${Date.now()}.json`);
fs.writeFileSync(out,JSON.stringify(exportObj,null,2));
console.log(out);
db.close();
