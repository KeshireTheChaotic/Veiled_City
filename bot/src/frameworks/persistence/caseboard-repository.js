/** Original active player-visible thread SELECT on the caller connection. */
export function listVisibleActiveThreads(connection,guildId,userId) {
    return connection.prepare(`
      SELECT * FROM threads WHERE guild_id=? AND status='active'
        AND (visibility IN ('public','party') OR (visibility='player' AND subject_user_id=?))
      ORDER BY updated_at DESC
    `).all(guildId,userId);
  }
