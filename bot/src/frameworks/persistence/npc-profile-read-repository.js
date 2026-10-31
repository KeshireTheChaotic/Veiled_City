/** Original NPC profile SQL readers on the caller connection. */
export function getNpcProfile(connection,guildId,npcKey){
    const r=connection.prepare("SELECT * FROM npc_profiles WHERE guild_id=? AND npc_key=?").get(guildId,String(npcKey||"").trim().toLowerCase());
    return r?{...r,decision_profile:JSON.parse(r.decision_profile_json||"{}"),knowledge_boundaries:JSON.parse(r.knowledge_boundaries_json||"[]"),capabilities:JSON.parse(r.capabilities_json||"[]")} : null;
  }

export function listNpcProfiles(connection,guildId,{activityTier="",limit=200,offset=0}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||200));
    const start=Math.max(0,Math.min(5000,Math.trunc(Number(offset)||0)));
    const rows=connection.prepare(`SELECT * FROM npc_profiles WHERE guild_id=? AND (?='' OR activity_tier=?) ORDER BY display_name,npc_key LIMIT ? OFFSET ?`)
      .all(guildId,activityTier,activityTier,cap,start);
    return rows.map(r=>({...r,decision_profile:JSON.parse(r.decision_profile_json||"{}"),knowledge_boundaries:JSON.parse(r.knowledge_boundaries_json||"[]"),capabilities:JSON.parse(r.capabilities_json||"[]")}));
  }
