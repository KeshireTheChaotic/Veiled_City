/** Original SQL for player preferences only; caller supplies the same connection and original player reader. No transaction ownership. */
export function getPlayer(connection,guildId,userId){
    return connection.prepare("SELECT * FROM players WHERE guild_id=? AND discord_user_id=?")
      .get(guildId,userId);
  }

export function getPlayerByPrivateChannel(connection,guildId,channelId){
    return connection.prepare("SELECT * FROM players WHERE guild_id=? AND private_channel_id=?")
      .get(guildId,channelId);
  }

export function setPrivateChannel(connection,guildId,userId,channelId){
    connection.prepare(`
      UPDATE players SET private_channel_id=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND discord_user_id=?
    `).run(channelId,guildId,userId);
  }

export function setAccessibility(connection,guildId,userId,patch,readPlayer){
    const p=readPlayer(guildId,userId);
    if (!p) throw new Error("Player not registered.");
    const current=JSON.parse(p.accessibility_json||"{}");
    const next={...current,...patch};
    connection.prepare(`
      UPDATE players SET accessibility_json=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND discord_user_id=?
    `).run(JSON.stringify(next),guildId,userId);
    return next;
  }
