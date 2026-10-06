# Discord Server Setup — Veilkeeper v3.1.2

This package uses a normal server-installed Discord bot plus slash commands and a Gateway connection. It does not need a public HTTP interaction endpoint.

## Private application setup
For a private Veilkeeper application, keep the Developer Portal **Installation → Install Link** set to **None**. Discord rejects a default authorization link for private apps.

Invite the bot manually from **OAuth2 → URL Generator**:

Scopes:
- `bot`
- `applications.commands`

Minimum bot permissions:
- View Channels
- Send Messages
- Read Message History

Recommended additional permissions:
- Connect / Speak (required only if v3.4.0 voice narration is enabled)
- Embed Links
- Attach Files
- Send Messages in Threads (only if you use threads later)

Do not grant Administrator.

## Message Content Intent
Under **Bot → Privileged Gateway Intents**, enable **Message Content Intent**. Veilkeeper needs ordinary message content for `#the-table`, `#rules-questions`, and registered private GM channels.

## IDs for `.env`
- `DISCORD_TOKEN`: Developer Portal → Bot → Token.
- `DISCORD_CLIENT_ID`: General Information → Application ID.
- `DISCORD_GUILD_ID`: enable Discord Developer Mode, right-click the server, Copy Server ID.

## Register commands
```bash
cd bot
npm install
npm run register
```

## Start
```bash
npm start
```

## Configure the server
Main table:
`/vc-campaign setup play_channel:#the-table mode:assisted`

Support channels:
`/vc-campaign channels` with the appropriate channel selections.

Each player then runs `/vc-player private-channel` in their own private channel.

See `SERVER_CHANNEL_SETUP.md` for the full category/channel layout and permission intent.


## NPC Proxy delivery prerequisite
No extra Discord permissions are required for v3.1.2. Configure a GM-only `#state-errors` channel, however, if you want the full delivery fail-safe: private GM channel → DM → sanitized relay package in `#state-errors`.

A guest does not need a private channel merely to receive the NPC package because DM is supported as the second delivery path. A private GM channel is recommended if the guest needs to send secret antagonist actions back to Veilkeeper during play.


## v3.4.0 voice narration

If voice is enabled, grant Veilkeeper **Connect** and **Speak** on the intended voice channel. Do not grant Administrator. Voice output is AI-generated and Discord text remains authoritative. See `VOICE_NARRATION.md`.
