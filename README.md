# Veiled City Multiplayer Discord

**VeilKeeper** is a stateful Discord GM bot for running **Veiled City**, a modern occult-noir campaign built on Daggerheart-style play. It combines Discord interaction, persistent SQLite campaign state, curated Veiled City setting content, and OpenAI-powered GM narration into a single self-hosted campaign engine.

Current release: **v3.6.0**

## Purpose

VeilKeeper is designed to let a Discord group run a long-lived Veiled City campaign without treating every AI response as disposable chat. The bot maintains authoritative campaign state between sessions and uses AI as a bounded GM layer around that state.

The project supports:

- persistent characters, sessions, resources, relationships, facts, clues, clocks, canon, handouts, encounters, and campaign history;
- public table play plus player-private scenes and GM-only information;
- Daggerheart-oriented dice, damage, stress, Hope, Fear, advancement, encounters, and downtime workflows;
- an autonomous **World Director** that reacts between player rounds, on scene transitions, and during extended **in-game** downtime;
- durable canon proposals and conflict handling instead of allowing private AI narration to rewrite campaign truth;
- guest characters and controlled NPC proxies for drop-in/drop-out multiplayer play;
- player-safe and GM-private character narrative Markdown;
- campaign exports, snapshots, rollback, and long-running continuity tools;
- optional Discord voice narration using OpenAI text-to-speech.

Discord text and the SQLite database remain authoritative. Voice narration and AI prose are presentation/adjudication layers, not the source of record.

## Scope

VeilKeeper is intentionally opinionated. It is built for **Veiled City** rather than as a generic Discord RPG framework.

Its scope includes:

- modern hidden-magic / urban occult campaign play;
- Veiled City player and GM content packaged under `content/`;
- multiplayer session continuity and privacy boundaries;
- AI-assisted GM adjudication constrained by structured state mutations;
- fictional-time world simulation.

A few important boundaries:

- **Real-world elapsed time never advances the campaign.** World Director actions are triggered by play state, scene changes, player-round cadence, or explicit mechanical downtime.
- Private scenes cannot directly modify global canon or unrelated player-private state.
- GM-only facts are excluded from player-facing fact, clue, export, and AI-context queries at the database boundary.
- Deterministic mechanics such as dice and tracked combat state are handled by application code rather than invented by the language model.
- Human GMs retain authority over canon conflicts, administrative operations, rollback, encounter construction, and other protected actions.

## Major Features

### Stateful AI GM

VeilKeeper uses the OpenAI Responses API for narration, NPC/world behavior, rules assistance, session assembly, encounter aftermath, handout generation, and other bounded GM tasks. Structured AI output is validated before authoritative mutations commit.

### Autonomous World Director

The World Director has three distinct cadences:

1. **Player-round director** — may move factions, NPCs, clocks, threats, or unresolved threads after all present player-controlled roles have acted.
2. **Scene-transition director** — evaluates world reactions when play genuinely moves into a new scene.
3. **Extended downtime director** — resolves wider world/faction movement after the GM explicitly resolves fictional downtime.

Failed director passes are durable and can be retried without silently disappearing.

### Mandatory Post-Turn Review

Normal AI GM turns must account for all relevant state categories, including:

- facts and clues;
- player resources;
- clocks;
- investigation threads;
- NPC and location references;
- relationships;
- handouts;
- canon;
- Veil Exposure;
- scene continuity.

Narration and structured state changes must agree before the turn is accepted.

### Privacy and Canon Boundaries

VeilKeeper distinguishes `public`, `party`, `player`, `character`, and `gm` visibility.

Player-facing fact access cannot opt into GM visibility. Private attempts to establish global canon create a **pending canon proposal** for human GM review instead of applying canon directly.

Configured GM/private channels are permission-validated in v3.6.0 so Discord channel permissions reinforce the database visibility model.

### Optional Voice Narration

VeilKeeper can join Discord voice and speak public GM narration through OpenAI text-to-speech.

Voice is optional and non-authoritative:

- private scenes are not auto-spoken;
- GM-only state is not auto-spoken;
- rules responses, errors, handouts, and hidden canon are excluded from automatic narration;
- `/vc-voice repeat` replays cached audio without purchasing another TTS generation.

Native installs require **FFmpeg** in `PATH`. The included Docker image installs FFmpeg automatically.

## Requirements

Choose either a direct Node.js install or Docker.

### Direct install

- **Node.js 22.16+**
- npm
- **FFmpeg** if voice narration will be used
- a Discord server where you can install/manage the bot
- an OpenAI API key with API billing enabled

### Docker

- Docker Engine / Docker Desktop
- Docker Compose
- a Discord server
- an OpenAI API key

The bot does **not** require a public HTTP interaction endpoint. It uses Discord's Gateway connection and slash commands.

## Discord Application Setup

Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications), then create a bot user.

Enable **Message Content Intent** under **Bot → Privileged Gateway Intents**. VeilKeeper needs ordinary message content for table play and registered private channels.

Invite the bot using **OAuth2 → URL Generator** with these scopes:

- `bot`
- `applications.commands`

Minimum bot permissions:

- View Channels
- Send Messages
- Read Message History

Recommended additional permissions:

- Embed Links
- Attach Files
- Send Messages in Threads, if you use threads
- Connect and Speak, if voice narration is enabled

**Do not grant Administrator.**

You will need:

- `DISCORD_TOKEN` — Bot token
- `DISCORD_CLIENT_ID` — Application ID
- `DISCORD_GUILD_ID` — optional but recommended during setup/testing because guild command registration is immediate

## Installation — Windows / Node.js

Clone or extract the project, then open PowerShell in the `bot` directory.

```powershell
cd "path\to\Veiled_City_Multiplayer_Discord\bot"
Copy-Item .env.example .env
notepad .env
```

At minimum, set:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_test_or_campaign_server_id
OPENAI_API_KEY=your_openai_api_key
```

Then install and validate:

```powershell
npm install
npm run audit:prod
npm run validate
npm run register
npm start
```

`npm run register` publishes the slash-command schema to Discord. If `DISCORD_GUILD_ID` is set, commands are registered directly to that server; otherwise global command propagation can take longer.

After the first registry-connected `npm install`, retain the generated `package-lock.json` so future deployments can use reproducible installs.

## Installation — Linux / macOS / Node.js

```bash
cd /path/to/Veiled_City_Multiplayer_Discord/bot
cp .env.example .env
$EDITOR .env

npm install
npm run audit:prod
npm run validate
npm run register
npm start
```

If voice narration is enabled, ensure `ffmpeg` is installed and available in `PATH`.

## Installation — Docker

Copy and configure the environment file first:

```bash
cp bot/.env.example bot/.env
$EDITOR bot/.env
```

Then from the project root:

```bash
docker compose build
docker compose run --rm veilkeeper npm run register
docker compose up -d
```

Follow logs with:

```bash
docker compose logs -f veilkeeper
```

The Compose configuration persists the SQLite database under `bot/data/`.

## Initial Campaign Configuration

After VeilKeeper is online, configure the main play channel:

```text
/vc-campaign setup play_channel:#the-table mode:assisted
```

You can optionally specify a human GM role through the `gm_role` option.

Configure support channels as needed. At minimum, a GM log and state-error channel are strongly recommended:

```text
/vc-campaign channels gm_log:#gm-log state_errors:#state-errors
```

VeilKeeper validates GM/private channel permissions before accepting sensitive channel configuration.

Each player should run the following **inside their own Discord-private channel**:

```text
/vc-player private-channel
```

Then verify campaign configuration:

```text
/vc-campaign status
```

## Response Modes

VeilKeeper supports three table response modes:

| Mode | Behavior |
| --- | --- |
| `mention` | Lowest API usage. Normal chat is ignored unless VeilKeeper is explicitly invoked. |
| `assisted` | Recommended default. Obvious in-character actions/questions are routed; casual chatter is normally ignored. |
| `active` | Every play-channel message is cheaply classified for possible GM response. |

Configure the mode with `/vc-campaign setup`.

## Useful Commands

A few common commands:

```text
/vc-session start
/vc-session roster
/vc-character create
/vc-character import
/vc-intel facts
/vc-intel clues
/vc-gm fact-add
/vc-gm fact-list
/vc-canon proposals
/vc-encounter build
/vc-downtime resolve
/vc-admin snapshot
/vc-voice join
```

GM/admin commands require Discord **Manage Server** or the configured GM role.

See [`docs/BOT_COMMANDS.md`](docs/BOT_COMMANDS.md) for the complete command reference.

## Project Layout

```text
Veiled_City_Multiplayer_Discord/
├── bot/
│   ├── src/                 Discord, state, AI, persistence, and GM runtime
│   ├── scripts/             Validation, regression tests, export utilities
│   ├── data/                Runtime SQLite database location
│   ├── .env.example         Environment template
│   └── package.json
├── content/
│   ├── PLAYER/              Player-readable setting/rules material
│   ├── GM_PRIVATE/          GM-only mysteries, NPCs, factions, adversaries, etc.
│   ├── CARDS/               Custom domains/cards and related data
│   ├── ENGINE/              AI-GM constitution, persistence/routing rules
│   └── STATE/               Campaign-state templates
├── docs/                    Deployment, commands, security, upgrades, design docs
├── Dockerfile
└── docker-compose.yml
```

## Persistent Data and Backups

The default database is:

```text
bot/data/veiled_city.sqlite
```

Back it up regularly, especially before upgrading.

For a simple file-level backup, stop VeilKeeper first because SQLite WAL mode may create active `-wal` and `-shm` files while the process is running.

Never commit these to a public repository:

- `bot/.env`
- `DISCORD_TOKEN`
- `OPENAI_API_KEY`
- live campaign databases or backups containing private campaign information

## Validation and Development Checks

v3.6.0 includes dependency-free source-quality checks plus regression suites.

Run the complete application validation set with:

```bash
cd bot
npm run validate
```

Individual checks are available as:

```bash
npm run lint
npm run format:check
npm run check
npm run test:offline
npm run test:production
npm run test:refactor
npm run audit:prod
```

The refactor quality gate enforces module responsibility headers and prevents production modules from bypassing the database abstraction with direct SQLite access.

## Updating

Before upgrading:

1. Stop VeilKeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Preserve `bot/.env`.
4. Replace the application/content files with the new release.
5. Run `npm install` or rebuild the Docker image.
6. Run `npm run validate`.
7. Run `npm run register` **only when the release changes the Discord command schema**.
8. Start VeilKeeper again.

Release-specific instructions are in `docs/UPGRADE_*.md`.

## OpenAI Configuration and Cost Control

VeilKeeper uses the OpenAI API, which is billed separately from a ChatGPT subscription.

The bot keeps token usage bounded by sending focused campaign context rather than the full campaign corpus on every turn. Separate model settings are available for GM narration, routing, summaries, rules, assembly, NPC proxy generation, downtime, handouts, aftermath, and optional voice.

See [`docs/OPENAI_SETUP.md`](docs/OPENAI_SETUP.md) for model configuration and cost-control guidance.

## Security and Privacy

VeilKeeper treats Discord permissions and application-level visibility as complementary boundaries.

Important practices:

- keep GM log and state-error channels GM-only;
- make each player's registered private channel invisible to other players;
- do not grant the bot Administrator;
- keep `.env` and live SQLite files out of Git;
- use a dedicated OpenAI project/API key when practical;
- rotate credentials immediately if exposed;
- review [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) before hosting a live campaign.

## Documentation

Useful project documentation includes:

- [`docs/BOT_COMMANDS.md`](docs/BOT_COMMANDS.md) — slash-command reference
- [`docs/DISCORD_SETUP.md`](docs/DISCORD_SETUP.md) — Discord application/server setup
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Node and Docker deployment
- [`docs/OPENAI_SETUP.md`](docs/OPENAI_SETUP.md) — API/model configuration
- [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) — information boundaries and secrets
- [`docs/WORLD_DIRECTOR.md`](docs/WORLD_DIRECTOR.md) — autonomous GM/world-director behavior
- [`docs/VOICE_NARRATION.md`](docs/VOICE_NARRATION.md) — optional TTS narration
- [`docs/CODE_STANDARDS.md`](docs/CODE_STANDARDS.md) — source organization and quality standards

## Release Status

**v3.6.0** is the production-refactor release. It centralizes Discord output handling, hardens sensitive-channel validation and fact visibility, moves fact filtering into SQL, standardizes runtime configuration validation, removes direct SQLite access outside the database abstraction, and adds source-quality/regression gates.

See [`VALIDATION_REPORT.md`](VALIDATION_REPORT.md) for the release validation record.
