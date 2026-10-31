/** Original owner-scoped character list query on caller connection. */
export function listCharacters(connection,guildId,ownerUserId,{includeClosed=true}={}){
    let sql="SELECT * FROM characters WHERE guild_id=? AND owner_user_id=?";
    if(!includeClosed) sql+=" AND status IN ('active','reserve','guest')";
    sql+=" ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'reserve' THEN 1 WHEN 'guest' THEN 2 ELSE 3 END,name";
    return connection.prepare(sql).all(guildId,ownerUserId).map(c=>({...c,data:JSON.parse(c.character_json)}));
  }
