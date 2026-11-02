/** Original read-only delivery diagnostics on the owning SQLite connection. */
export function heldNativeNotices(connection,guildId){
  return connection.prepare(`SELECT kind,record_key,status FROM city_records WHERE guild_id=?
    AND kind IN ('roll_publication','roll_party_publication','pvp_status_publication','pvp_projection_publication','pvp_fear_publication','gm_arbitration_publication')
    AND status!='delivered' AND json_extract(data_json,'$.turn_id') IS NULL ORDER BY rowid LIMIT 100`).all(guildId);
}

export function listPendingPublications(connection,guildId,{limit=50}={}){
  return connection.prepare(`SELECT id,guild_id,turn_id,surface,ordinal,visibility,target_user_id,target_character_id,channel_id,
    payload_hash,status,discord_message_id,attempt_count,last_failure,created_at,updated_at FROM publication_outbox
    WHERE guild_id=? AND status!='delivered' ORDER BY created_at,ordinal LIMIT ?`).all(guildId,Math.max(1,Math.min(100,Number(limit)||50)));
}
