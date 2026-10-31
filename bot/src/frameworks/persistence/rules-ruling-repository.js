/** Original saved-ruling SQL reads on caller connection; no transaction ownership or normalization changes. */
export function searchRulesRulings(connection,guildId,query=""){
    const q=String(query).toLowerCase();
    return connection.prepare("SELECT * FROM rules_rulings WHERE guild_id=? AND active=1 ORDER BY updated_at DESC").all(guildId)
      .filter(r=>!q||q.includes(r.ruling_key)||r.question.toLowerCase().split(/\\s+/).some(w=>w.length>4&&q.includes(w))).slice(0,8);
  }

export function getRulesRuling(connection,guildId,key){return connection.prepare("SELECT * FROM rules_rulings WHERE guild_id=? AND ruling_key=? AND active=1").get(guildId,key)||null;}
