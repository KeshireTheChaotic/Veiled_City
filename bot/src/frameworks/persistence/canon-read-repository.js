/** Original canon read SQL on caller connection; no proposal, resolution or write authority. */
export function listCanon(connection,guildId,{includeGM=false,limit=100}={}){
    const sql=includeGM?"SELECT * FROM canon_events WHERE guild_id=? AND status='current' ORDER BY canon_key LIMIT ?":"SELECT * FROM canon_events WHERE guild_id=? AND status='current' AND visibility IN ('public','party') ORDER BY canon_key LIMIT ?";
    return connection.prepare(sql).all(guildId,limit);
  }

export function listCanonConflicts(connection,guildId){ return connection.prepare("SELECT cc.*,ce.value existing_value FROM canon_conflicts cc LEFT JOIN canon_events ce ON ce.id=cc.existing_event_id WHERE cc.guild_id=? AND cc.status='pending' ORDER BY cc.created_at").all(guildId); }
