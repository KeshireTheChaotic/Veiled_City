# VEILED CITY MULTIPLAYER DISCORD ENGINE v8.4.0

## Current Version

**8.4.0** — Veilkeeper, a stateful Discord AI GM for multiplayer Veiled City
campaigns using Daggerheart. The version is maintained in
[bot/package.json](bot/package.json).

This release provides governed AI proposals, scoped context, native state commits,
review receipts and bounded fictional-time scheduling. Optional features default
off; AI delegation defaults to manual.

## Concept

Veilkeeper runs an ongoing occult-noir tabletop campaign through Discord.
Players describe actions, speak to NPCs, investigate leads and make
application-rolled checks. The AI GM interprets the fiction and proposes world
reactions; the application validates and records what actually happens.

SQLite preserves characters, attendance, discoveries, relationships, NPC memories,
goals, clocks, canon and campaign history between sessions. NPC beliefs remain
subjective: rumors, mistaken memories and incomplete evidence are not world truth.
Human GMs retain oversight, review, pause and recovery controls.

## Scope

- Multiplayer characters, advancement, guests, attendance and human-controlled proxies.
- Public table play and private player-to-GM channels with player/character-scoped knowledge.
- Native dice/resources, encounter/combat controls, evidence handouts, relationships, canon and downtime.
- Persistent NPC/faction cognition, rumors, investigations and fictional-time world reactions.
- Optional institutions, infrastructure, economy, conversations, pacing, negotiations and reviewed world authoring.
- Optional sourced goals/consequences, scene continuity, voluntary groups, strategies, personal arcs, discovery, long projects, memory consolidation and fair scheduling.
- Privacy-aware bulk seeding, inferred-draft review, audit receipts, snapshots and logical backups.
- Optional public voice narration; Discord text and application state remain authoritative.

The AI cannot invent dice results, authorize itself, silently overwrite canon,
choose voluntary PC actions or override an active human proxy. Major/ambiguous
changes require review. PC arc confirmation, project consent and private disclosure
remain authenticated owner decisions. Background work uses fictional opportunities,
not elapsed wall-clock time.

Gameplay/model requests can incur provider charges; voice is a separate opt-in
paid pathway. Offline validation uses dummy credentials and denies network access.
Enabled features still require established data, sources, resources and consent.

## Installation / Setup

### Requirements

- Node.js **22.16.0 or newer**, npm, and Git for repository updates.
- A Discord application/bot, bot token, application ID and target server.
- An OpenAI API key with access to your configured models.
- FFmpeg in `PATH` only for native voice playback.
- Persistent writable storage for SQLite and campaign content.

Use a development checkout for edits/tests. The existing production checkout is
`D:\Library\Veiled City`; it is a deployment destination, not a development workspace.

### 1. Install and configure

From the repository root in PowerShell:

```powershell
Set-Location .\bot
npm install
if (!(Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

Edit `bot/.env` locally:

```dotenv
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
OPENAI_API_KEY=your_api_key
DATABASE_PATH=./data/veiled_city.sqlite
CONTENT_ROOT=../content
DEFAULT_RESPONSE_MODE=assisted
VOICE_ENABLED=false
```

The guild ID scopes registration to one server; omitting it registers global
commands. Model names, reasoning/context/token limits, aftermath mode and voice
settings are listed in [bot/.env.example](bot/.env.example). Configure models your
account can use.

Run npm commands from `bot` so relative paths resolve correctly. Never commit
real credentials or runtime SQLite files. Preserve `bot/.env`,
`bot/data/veiled_city.sqlite` and local campaign content during upgrades.

### 2. Prepare Discord

Enable **Message Content Intent** in the application's bot settings. Invite the bot
with the `bot` and `applications.commands` scopes.

Grant View Channels, Send Messages, Read Message History, Embed Links and Attach
Files where needed; add Connect and Speak for voice. Do not grant Administrator
merely to run Veilkeeper.

Create a table channel, optional rules/reference channels, GM-only log/error
channels and one private channel per player. Private channels must exclude other
players; the application validates private delivery permissions.
See [Discord setup](docs/DISCORD_SETUP.md) and
[channel layout](docs/SERVER_CHANNEL_SETUP.md).

### 3. Validate, register and start

From `bot`:

```powershell
npm run validate
npm run register
npm start
```

Validation is offline. Registration contacts Discord and replaces the command
schema in the selected scope. Starting connects the bot to Discord; gameplay can
then make paid model calls. Run one bot instance per production database.
After updates, restart the existing instance rather than launching a second copy;
re-register commands when their schema changes.

### 4. Configure the campaign and seed content

As a GM/admin in Discord, replace these channel/role selections with your own:

```text
/vc-campaign setup play_channel:#the-table gm_role:@GM mode:assisted
/vc-campaign channels rules_channel:#rules-questions case_board:#case-board journal:#party-journal known_npcs:#known-npcs known_locations:#known-locations gm_log:#gm-log state_errors:#state-errors
/vc-admin doctor
/vc-admin seed-data
```

Seeding archives found files under `GM`, `GM_PRIVATE` and `PLAYER`, and
materializes recognized data while preserving established state. Unmatched private
character material remains GM-only. Templates/drafts do not establish live
occupancy, membership, PC consent or AI authority. Inspect
`/vc-admin seed-drafts` rather than approving everything blindly.
See [content seeding](docs/CONTENT_SEEDING.md).

Players create/import characters and register their private channels. Start a
session with `/vc-session start title:Opening Night`. Players then check in using
`/vc-session present`; the GM can run `/vc-session assemble`.
AI scene generation incurs normal configured provider usage.

### 5. Enable optional features and AI management

Enable all 21 optional city/story flags:

```text
/vc-city flags json:{"institutions":true,"opportunities":true,"economy":true,"minor_npcs":true,"adaptive_context":true,"conversations":true,"pacing":true,"negotiations":true,"voice_direction":true,"authoring":true,"emergent_goals":true,"consequences":true,"scene_continuity":true,"emergent_groups":true,"strategies":true,"personal_arcs":true,"discovery":true,"long_projects":true,"conflict_mediation":true,"memory_consolidation":true,"activity_density":true}
```

Flags do not authorize AI execution. Start with review-only proposals:

```text
/vc-story delegation json:{"mode":"suggest_only","allow":[],"max_operations":1,"max_cost":0,"expires_minute":null}
/vc-story expansion-status
/vc-story ai-inbox
```

For delegated routine work, first inspect `/vc-city status`. Replace `1440`
below with an expiry **after the current fictional minute**. This narrow example
permits goal proposals and reversible memory maintenance:

```text
/vc-story delegation json:{"mode":"routine_delegated","allow":["goal.propose","memory.consolidate","memory.revise","memory.revert"],"max_operations":1,"max_cost":0,"expires_minute":1440}
/vc-director resume
```

Limits bound delegated fictional work, not API spending. Broaden the allowlist
deliberately using the [complete feature/delegation matrix and rollout
guide](docs/END_TO_END_IMPLEMENTATION.md). Major review, native mechanics, source
checks, ownership and consent remain binding. Discovery is read-only.

Revoke delegation:

```text
/vc-story delegation json:{"mode":"manual","allow":[],"max_operations":1,"max_cost":0,"expires_minute":null}
```

`/vc-director pause` pauses automatic director passes. Turning off flags or
revoking policy is not a blanket cancellation/refund of legacy human-approved work;
inspect/cancel queued work through native review or strategy controls.

### 6. Optional voice narration

Set `VOICE_ENABLED=true` and `VOICE_MODE=narrative` in `bot/.env`, ensure
FFmpeg is available, and restart. Join the desired Discord voice channel, then:

```text
/vc-voice configure mode:narrative
/vc-voice join
/vc-voice status
```

`voice_direction` enables approved delivery guidance, not TTS itself. Automatic
voice excludes private scenes and GM-only material. Narration is skipped before
synthesis when the bot has no voice connection. `/vc-voice repeat` replays cached
audio without a new TTS request. See [voice narration](docs/VOICE_NARRATION.md).

## Useful Player Commands

Use Discord's option picker for attachments and character selections. Placeholders
such as `<id>` must be replaced; JSON responses need current keys/revisions from
the relevant inbox. Player commands expose only authorized knowledge.

| Task | Command / example |
| --- | --- |
| Create / import a character | `/vc-character create name:Alex`; `/vc-character import file:<character.json>` |
| Inspect / select / export | `/vc-character list`; `/vc-character sheet`; `/vc-character select character:Alex`; `/vc-character export format:all` |
| Register your private channel | Run `/vc-player private-channel` inside that private channel |
| Response preferences | `/vc-player accessibility length:compact mechanics:standard screen_reader:true` |
| Check in / arrive late | `/vc-session present character:Alex`; `/vc-session arrive character:Alex` |
| Absence / early departure | `/vc-session absent mode:offscreen`; `/vc-session leave mode:offscreen` |
| Authorize a human PC proxy | `/vc-session absent mode:proxy proxy:@TrustedPlayer` |
| Roll Duality Dice | `/vc-roll duality modifier:2` |
| Ask about rules | `/vc-rules ask question:<question>` |
| Review campaign knowledge | `/vc-intel recap`; `/vc-intel facts`; `/vc-intel clues`; `/vc-intel caseboard` |
| Read continuity / leads | `/vc-intel continuity`; `/vc-intel discover json:{"mode":"leads","query":"visitor"}` |
| Respond to an arc invitation/candidate | `/vc-intel arc json:<owned response with key/revision>` |
| Retrieve evidence | `/vc-handout list`; `/vc-handout show id:<id>`; `/vc-handout export id:<id> format:all` |
| Submit downtime work | `/vc-downtime project type:research title:Study objective:Trace the visitor` |
| Inspect / consent to long projects | `/vc-downtime status`; `/vc-downtime long-project-status`; `/vc-downtime long-project json:<owned proposal or phase response>` |
| Begin advancement | `/vc-level level-up character:Alex` (then `/vc-level level-choose` and `/vc-level level-confirm`) |
| Accept / decline an NPC proxy offer | `/vc-npc claim npc:<name>`; `/vc-npc decline npc:<name>` |
| Retrieve / release your NPC packet | `/vc-npc packet npc:<name>`; `/vc-npc release npc:<name>` |
| Join voice / replay narration | `/vc-voice join`; `/vc-voice repeat` |

During an active session, describe actions in the configured table channel or your
registered private GM channel. With discovery enabled, “What do I know about the
visitor?” uses a grounded, private, read-only route. Arc/project invitations are
optional; an AI proposal is never your consent.

## Useful GM / Admin Commands

GM operations require Discord Manage Server permission or the configured GM role.
JSON commands use typed native contracts, not arbitrary database patches.
Some commands below need additional required options selected in Discord.

| Task | Command / example |
| --- | --- |
| Campaign setup / status | `/vc-campaign setup`; `/vc-campaign status` |
| Configure / republish channels | `/vc-campaign channels`; `/vc-campaign sync` |
| Session lifecycle / roster | `/vc-session start`; `/vc-session assemble`; `/vc-session roster`; `/vc-session end` |
| Dashboard / health | `/vc-gm overview`; `/vc-admin doctor` |
| Seed content / inspect drafts | `/vc-admin seed-data`; `/vc-admin seed-drafts draft_id:<id>` (omit ID to list) |
| Add / edit seed drafts | `/vc-admin seed-add json:<typed draft>`; `/vc-admin seed-edit draft_id:<id> json:<replacement>` |
| Approve / reject / remove drafts | `/vc-admin seed-approve draft_id:<id>`; `/vc-admin seed-reject draft_id:<id>`; `/vc-admin seed-remove draft_id:<id>` |
| Inspect NPC cognition | `/vc-gm npc-state npc:<name>` |
| List / add facts | `/vc-gm fact-list`; `/vc-gm fact-add content:<text> visibility:gm` |
| Establish / review canon | `/vc-canon set key:<key> value:<value>`; `/vc-canon conflicts`; `/vc-canon proposals` |
| Encounters / combat | `/vc-encounter build`; `/vc-encounter start`; `/vc-combat combatants`; `/vc-combat damage` |
| Generate / store evidence | `/vc-handout generate` (AI); `/vc-handout create` (no generation call) |
| Open / resolve downtime | `/vc-downtime open`; `/vc-downtime resolve minutes:1440` (explicit fictional duration) |
| Director status / history | `/vc-director status`; `/vc-director history` |
| Pause / resume / request review | `/vc-director pause`; `/vc-director resume`; `/vc-director run reason:<fictional reason>` |
| Simulation / queued-action review | `/vc-sim status`; `/vc-sim review action_id:<id> decision:reject` |
| City clock / feature flags | `/vc-city status`; `/vc-city flags json:<boolean flags>` |
| AI eligibility / receipts | `/vc-story expansion-status`; `/vc-story ai-inbox` |
| Configure delegation | `/vc-story delegation json:<policy>` |
| Approve / reject / modify / defer AI proposals | `/vc-story ai-review json:<key, decision, expected_revision>`; modify also needs `replacement_intent` |
| Inspect scenes / manage plans | `/vc-story scene-view`; `/vc-story strategy json:<native operation>` |
| Explain provenance | `/vc-story why json:{"event_key":"<event-key>"}` |
| Durable backup / listing | `/vc-admin backup label:Before changes`; `/vc-admin backups` |
| Preview / restore | `/vc-admin restore-preview backup_id:<id>`; `/vc-admin restore backup_id:<id>` |
| Snapshot / audit ledger | `/vc-admin snapshot label:Checkpoint`; `/vc-admin ledger` |
| Pause / disconnect voice | `/vc-voice pause`; `/vc-voice leave` |

Refresh inboxes before review: stale revisions, revoked roles, changed sources or
proxies, and expired delegation can invalidate approval. Reopen read-only inboxes
to repair missing notices; do not replay successful mutations or costs.
Back up before significant changes and preview restores.

### Further Reading

- [Systems-to-players features, enablement commands, phase evidence and limits](docs/SYSTEMS_TO_PLAYERS_IMPLEMENTATION.md)
- [Systems-to-players behavioral gap audit](docs/SYSTEMS_TO_PLAYERS_GAP_ANALYSIS.md)
- [Current AI management, complete feature matrix, rollout and recovery](docs/END_TO_END_IMPLEMENTATION.md)
- [Command reference](docs/BOT_COMMANDS.md) — includes historical sections; current slash options are defined in [command-definitions.js](bot/src/command-definitions.js)
- [Content seeding](docs/CONTENT_SEEDING.md) and [NPC cognition](docs/NPC_COGNITION.md)
- [NPC simulation](docs/NPC_SIMULATION.md), [World Director](docs/WORLD_DIRECTOR.md) and [Living City](docs/LIVING_CITY.md)
- [GM operations](docs/GM_OPERATIONS.md), [optional story tools](docs/NEXT_EXPANSION.md) and [voice narration](docs/VOICE_NARRATION.md)
