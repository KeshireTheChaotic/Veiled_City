/** Original campaign-row lookup on the caller connection; no transaction ownership or normalization. */
export function getCampaign(connection,guildId) {
    return connection.prepare("SELECT * FROM campaigns WHERE guild_id=?").get(guildId);
  }
