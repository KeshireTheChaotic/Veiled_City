/** Original administrative SQL reads; same caller connection and dynamic readers. No transaction ownership. */
export function listMutationLedger(connection,guildId,{limit=40,sourceLayer="",mutationType=""}={}){
    const cap=Math.max(1,Math.min(100,Number(limit)||40));
    return connection.prepare(`SELECT * FROM mutation_ledger WHERE guild_id=? AND (?='' OR source_layer=?) AND (?='' OR mutation_type=?) ORDER BY created_at DESC LIMIT ?`).all(guildId,sourceLayer,sourceLayer,mutationType,mutationType,cap);
  }

export function getBackup(connection,id){ const r=connection.prepare("SELECT * FROM campaign_backups WHERE id=?").get(id); return r?{...r,state:JSON.parse(r.state_json||"{}")} : null; }

export function listBackups(connection,guildId,limit=20){ return connection.prepare("SELECT id,label,reason,created_by,created_at FROM campaign_backups WHERE guild_id=? ORDER BY created_at DESC LIMIT ?").all(guildId,Math.max(1,Math.min(50,Number(limit)||20))); }

export function backupPreview(connection,guildId,id,getBackup,listPlayers,listGuildCharacters,listFactsForGM){
    const b=getBackup(id); if(!b||b.guild_id!==guildId) throw new Error("Backup not found.");
    const current={players:listPlayers(guildId).length,characters:listGuildCharacters(guildId,{includeClosed:true}).length,facts:listFactsForGM(guildId,{limit:100}).length,sessions:connection.prepare("SELECT count(*) n FROM sessions WHERE guild_id=?").get(guildId).n};
    const tables=b.state?.tables||{};
    const backup={players:(tables.players||[]).length,characters:(tables.characters||[]).length,facts:(tables.facts||[]).length,sessions:(tables.sessions||[]).length};
    return {backup:b,current,counts:backup};
  }

export function getSnapshot(connection,id){
    const r=connection.prepare("SELECT * FROM campaign_snapshots WHERE id=?").get(id);
    return r?{...r,state:JSON.parse(r.state_json)}:null;
  }

export function listSnapshots(connection,guildId,limit=12){
    return connection.prepare("SELECT id,label,reason,created_by,created_at FROM campaign_snapshots WHERE guild_id=? ORDER BY created_at DESC LIMIT ?").all(guildId,limit);
  }
