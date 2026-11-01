/** Original player-safe fact query on the caller connection; no GM inclusion switch. */
export function playerFactsFor(connection,guildId,userId,{characterId=null,category="",limit=80}={}) {
    const capped=Math.max(1,Math.min(200,Number(limit)||80));
    const wanted=String(category||"").trim().toLowerCase();
    return connection.prepare(`
      SELECT * FROM facts WHERE guild_id=? AND archived=0
       AND (
         visibility IN ('public','party')
         OR (visibility='player' AND subject_user_id=?)
         OR (visibility='character' AND subject_character_id=?)
       )
       AND (?='' OR lower(category)=?)
       ORDER BY created_at DESC LIMIT ?
    `).all(guildId,userId,characterId||"",wanted,wanted,capped);
  }
