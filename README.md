# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.5.1

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.



## v3.5.1 — Dependency Security Maintenance

v3.5.1 updates the Discord runtime dependency set after fresh npm installs of v3.5.0 began reporting known transitive security advisories. `discord.js` is updated from 14.22.1 to 14.27.0, and npm overrides pin the supported Node 22-compatible `undici` line to 6.29.0 and `ws` to 8.22.0. No campaign schema, command, GM/world-director, or gameplay behavior changes are introduced.

A new `npm run audit:prod` command checks production dependencies at `moderate` severity or higher. Existing v3.5.0 databases and `.env` files can be retained unchanged.

See:
- `docs/UPGRADE_3.5.0_TO_3.5.1.md`
- `docs/CHANGELOG_v3.5.1_DISCORD.md`

## v3.5.0 — Autonomous World Director

v3.5.0 adds a proactive **fictional-time** GM/world-director layer while keeping player agency and deterministic combat controls intact. Veilkeeper may now perform bounded world reactions after a completed player-round cadence, at actual scene transitions, and when a GM resolves extended in-game mechanical downtime. It never advances the world merely because real-world time passed.

Normal AI turns now require a schema-backed post-turn state review for facts/clues, resources, clocks, threads, references, relationships, handouts, canon, Veil Exposure, and scene continuity. State-review/mutation mismatches receive one corrective retry and are rejected before commit if still inconsistent. Forbidden scoped actions are blocked and disclosed privately to the acting player and in detail to the GM log.

See:
- `docs/WORLD_DIRECTOR.md`
- `docs/UPGRADE_3.4.1_TO_3.5.0.md`
- `docs/CHANGELOG_v3.5.0_DISCORD.md`

## v3.4.1 — Production Hardening

v3.4.1 serialized multiplayer GM turns, made AI state mutations atomic, separated authoritative state commits from fallible Discord publishing, tightened private-scene/canon isolation, and hardened voice queue ordering/access controls.

See:
- `docs/UPGRADE_3.4.0_TO_3.4.1.md`
- `docs/CHANGELOG_v3.4.1_DISCORD.md`

## v3.4.0 — Discord Voice Narration

v3.4.0 adds optional AI-generated narration in Discord voice channels while keeping Discord text and SQLite as the authoritative campaign record. Public `#the-table` GM narration can be synthesized through OpenAI's speech endpoint and played through Discord using `/vc-voice`. Private scenes, GM-only material, rules answers, handouts, errors, and hidden canon are excluded from automatic voice output.

Voice is disabled by default. Native installs require **FFmpeg** in `PATH`; the Docker image installs FFmpeg automatically. After setting `VOICE_ENABLED=true`, join the desired voice channel and run `/vc-voice join`. Built-in OpenAI voices and eligible sample-based custom voice IDs are supported.

See:

- `docs/VOICE_NARRATION.md`
- `docs/UPGRADE_3.3.3_TO_3.4.0.md`
- `docs/CHANGELOG_v3.4.0_DISCORD.md`

## v3.3.3 — Character Narrative Markdown

v3.3.3 adds a dedicated freeform narrative layer for character information that should be available to Veilkeeper but does not fit the structured character JSON.

Standard portable paths are:

```text
PLAYER/PLAYERS/<Character_Name>.md
GM_PRIVATE/PLAYERS/GM_PRIVATE_<Character_Name>.md
```

Import/update them with `/vc-character narrative-import`, or attach them directly to `/vc-character import` and `/vc-character import-gm-hooks`. Export them with `/vc-character narrative-export`; the returned ZIP preserves the standard directory layout.

Runtime narrative is stored in SQLite and included in snapshots/rollback. Veilkeeper uses it as supplemental context during ordinary GM turns, party assembly, character arrivals, encounter aftermath, and relevant downtime. **Structured JSON remains authoritative for mechanics/resources; the canon ledger remains authoritative for durable world truth. GM-private Markdown is never player-visible by default.**

The external `/vc-character context-export` package now instructs ChatGPT/other assistants to generate these Markdown files when useful alongside `CHARACTER_<Name>.json` and `GM_HOOKS_<Name>.json`.

## v3.3.3 historical upgrade notes

Preserve:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Then run:

```bash
cd bot
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-character` gained two subcommands and new optional attachment fields. The database migration is additive and requires no manual conversion.

See:

- `docs/CHARACTER_NARRATIVE_MARKDOWN.md`
- `docs/CHARACTER_CONCEPT_CONTEXT.md`
- `docs/CANON_LEDGER.md`
- `docs/UPGRADE_3.3.2_TO_3.3.3.md`
- `docs/BOT_COMMANDS.md`
