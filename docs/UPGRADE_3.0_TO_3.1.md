# Upgrade v3.0 → v3.1

1. Stop the v3.0 bot.
2. Back up `bot/data/veiled_city.sqlite` (and its `-wal` / `-shm` files if present).
3. Copy the old SQLite database into the v3.1 `bot/data/` directory if you are moving folders.
4. Copy your old `.env`, then add the optional v3.1 settings:
   ```env
   OPENAI_RULES_MODEL=gpt-6-luna
   RULES_MAX_OUTPUT_TOKENS=500
   MAX_RULES_CHUNKS=6
   ```
5. Run:
   ```bash
   cd bot
   npm install
   npm run check
   npm run test:offline
   npm run register
   npm start
   ```
6. On first start, v3.1 adds the new channel/message-scope columns and creates new reference/publishing tables. Existing v3.0 campaign, player, character, session, fact, thread, roll, and audit records remain.
7. In Discord configure support channels with `/vc campaign channels`.
8. Re-run `/vc player private-channel` only if a player's private channel has changed; existing private-channel IDs are preserved.
9. Run `/vc campaign sync` to publish any existing player-visible case threads/reference entries.

### Important privacy change
v3.1 stores explicit subject IDs on new private transcript messages. Existing v3.0 private transcript rows did not contain that field. They remain in the database for audit/history but are not selected as player-specific runtime context by the new scoped transcript query unless they can be associated through new v3.1 messages/facts. This intentionally favors secrecy over trying to guess ownership of legacy private rows.
