/** Original NPC cognition list queries on caller connection; no writes or belief/canon policy. */
export function listNpcMemories(connection,guildId,npcKey,{status="",limit=100,queryTokens=[]}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||100));
    const wanted=[...new Set(queryTokens.map(String))].slice(0,20);
    const relevance=wanted.length?wanted.map(()=>"CASE WHEN instr(lower(content||' '||subject_key||' '||tags_json),?)>0 THEN 1 ELSE 0 END").join("+"):"0.0";
    return connection.prepare(`SELECT * FROM npc_memories WHERE guild_id=? AND npc_key=?
      AND (?='' OR status=? OR (?='retrievable' AND status IN ('active','challenged')))
      ORDER BY (${relevance}) DESC,importance DESC,created_at DESC LIMIT ?`)
      .all(guildId,String(npcKey||"").toLowerCase(),status,status,status,...wanted.map(token=>token.toLowerCase()),cap)
      .map(r=>({...r,tags:JSON.parse(r.tags_json||"[]")}));
  }

export function listNpcKnowledge(connection,guildId,npcKey,{beliefState="",limit=100,queryTokens=[]}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||100));
    const wanted=[...new Set(queryTokens.map(String))].slice(0,20);
    const relevance=wanted.length?wanted.map(()=>"CASE WHEN instr(lower(content||' '||knowledge_key),?)>0 THEN 1 ELSE 0 END").join("+"):"0.0";
    return connection.prepare(`SELECT * FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND (?='' OR belief_state=?)
      ORDER BY (${relevance}) DESC,updated_at DESC LIMIT ?`)
      .all(guildId,String(npcKey||"").toLowerCase(),beliefState,beliefState,...wanted.map(token=>token.toLowerCase()),cap);
  }
