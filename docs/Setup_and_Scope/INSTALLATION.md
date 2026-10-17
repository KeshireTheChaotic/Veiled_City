# Initial setup — development or staging

## Requirements

- Git checkout of the specified branch, Node.js **22.16.0+**, npm and writable persistent SQLite storage.
- A Discord bot application and a guild where the installer can configure roles/channels.
- An OpenAI API project/key with access to the configured model IDs; API usage is billed separately from ChatGPT.
- Optional FFmpeg and Connect/Speak permission for voice playback.

Use an isolated development/staging checkout. Never install this unqualified snapshot over a running production instance solely because documentation is available.

## 1 — obtain the exact source

```powershell
git clone --branch codex/audience-first-narrative-v9 --single-branch https://github.com/KeshireTheChaotic/Veiled_City.git
Set-Location .\Veiled_City
git rev-parse HEAD
```

The audit snapshot SHA is `014bc39dadd4035b43649c2c24ef3508939b1c40`. If the remote branch advanced, pin/check out a separately reviewed commit before relying on the rest of this snapshot's statements.

## 2 — install and create local configuration

```powershell
Set-Location .\bot
npm ci
if (-not (Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
notepad .\.env
```

Required settings in `bot/.env`:

```dotenv
DISCORD_TOKEN=<local-bot-token>
DISCORD_CLIENT_ID=<discord-application-id>
DISCORD_GUILD_ID=<test-guild-id>
OPENAI_API_KEY=<private-project-api-key>
DATABASE_PATH=./data/veiled_city.sqlite
CONTENT_ROOT=../content
DEFAULT_RESPONSE_MODE=assisted
VOICE_ENABLED=false
```

Placeholders are illustrative. Do not commit or paste secrets into issue reports. Verify relative paths from **`bot/`**, the npm command root. For model, deadline and token settings consult [OPENAI_SETUP.md](OPENAI_SETUP.md) and the checked-out `bot/.env.example`.

## 3 — prepare Discord

Enable Message Content Intent for normal roleplay text. Invite with `bot` and `applications.commands` scopes, using minimum channel permissions; set up the public table, private per-player channels and GM-only diagnostic channels. See [DISCORD_SETUP.md](DISCORD_SETUP.md).

## 4 — local validation *before* connecting to live services

From `bot/`:

```powershell
npm run check
npm run quality
npm run format:check
npm run validate
```

`npm run validate` is the full offline mandatory suite. `npm run validate:extended` adds optional coverage. These are instructions to run locally; **this documentation rebuild did not execute them** and no pass is claimed for the pinned later branch. Investigate errors instead of treating old ledger passes as current.

## 5 — register and start only in approved test/staging environment

```powershell
npm run register
npm start
```

Command registration calls Discord and can change existing slash schemas; starting can issue real paid model requests. Do not run in production without separate qualification, backup and authorization. Run one bot process per campaign SQLite DB. If no guild ID is set, registration may target the global command scope; use a test guild for rapid iteration.

## 6 — configure campaign and begin play

Typical GM/admin first-run commands (fill real channels):

```text
/vc-campaign setup play_channel:#the-table gm_role:@GM mode:assisted
/vc-campaign channels rules_channel:#rules-questions case_board:#case-board journal:#party-journal known_npcs:#known-npcs known_locations:#known-locations gm_log:#gm-log state_errors:#state-errors
/vc-admin doctor
/vc-admin seed-data
```

Have each player import/create their character, register their private channel via `/vc-player private-channel`, and check in. Then use `/vc-session start`, `/vc-session present`, and GM `/vc-session assemble` as described in [PARTY_ASSEMBLY.md](PARTY_ASSEMBLY.md).

## Configuration and state checklist

- Store bot secrets and SQLite outside distributable packages; review storage permissions.
- Configure GM-only channels and test actual recipient access before any private output.
- Seed content additively; an imported file is not automatically canon, character knowledge or live placement.
- Treat advanced features and delegated execution as opt-in, with source/policy/consent gates independent of feature flags.
- Keep native outcomes and outbox receipts intact during startup, restart and recovery.
