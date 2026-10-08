# VEILED CITY MULTIPLAYER DISCORD ENGINE v4.2.0

Stateful Discord GM bot for the Veiled City multiplayer Daggerheart campaign.

## v4.2.0 — Living City Phase B

Adds sourced districts, institutions with explicit report-based knowledge,
audience beliefs, case/evidence records, causal links, consensual commitments
and opt-in bounded institution opportunities. See [Living City](docs/LIVING_CITY.md).
These systems do not change PC mechanics, Veil Exposure or established canon.

## v4.1.0 — Living City Phase A

Adds a configurable fictional calendar, due-once civic schedules, sourced world
event index and GM-only `/vc-city` commands. No player mechanics or canon changes.
See [design, upgrade and deployment gates](docs/LIVING_CITY.md). Run
`npm run register` after restarting on the additive schema migration.

## v4.0.0 — Campaign simulation and audit fixes

Persistent NPC/faction agency now adds bounded background actions, fictional-time
delays, finite resources, obligations, rumors, awareness, scene residue,
relationship dimensions and GM review of consequential actions. The existing
NPC cognition foundation is retained. New GM-only `/vc-sim` commands configure
and inspect these systems; run `npm run register` after deployment.

Queue rejection handling, cross-server thread isolation, reply-failure duplicate
protection and mutation-ledger attribution are also corrected. See
[`docs/NPC_SIMULATION.md`](docs/NPC_SIMULATION.md) for setup, command examples,
mechanics, boundaries and coverage of the thirty suggestions.

GM-only `/vc-admin seed-data` replaces `seed-npc-cognition`. It imports every
file under `GM`, `GM_PRIVATE`, and `PLAYER` into privacy-scoped source/catalog
tables, seeds recognized runtime entities and matched character narratives,
and preserves existing campaign state. See [content seeding](docs/CONTENT_SEEDING.md).


## v3.8.0 — Persistent NPC Cognition

v3.8.0 establishes Veilkeeper's first persistent NPC cognition layer. Significant NPCs now have durable **profiles, subjective memories, knowledge/beliefs, goals, and retrieval state** that remain distinct from objective campaign facts and canon. An NPC can therefore remember incorrectly, believe a rumor, lack information the GM knows, or revise an agenda without rewriting campaign truth.

Veilkeeper retrieves only the NPC cognition relevant to the current scene/query rather than injecting every stored memory into each prompt. Retrieval weighs direct relevance, importance, confidence, recency, reinforcement, goals, activity tier, and active NPC-proxy context. The World Director receives a broader goal-aware packet for established active/supporting NPCs.

The cognition model includes Veiled City-specific boundaries for **hospitality, obligation/contract custom, supernatural impressions, thresholds, anchors, and the Veil**. Hospitality or shelter can inform remembered debt or contractual expectation only when established custom, invitation, exchange, oath, Court/Concord practice, or explicit terms justify it; ordinary courtesy is not automatically binding. Supernatural/Veil impressions remain subjective evidence rather than omniscience or automatic canon.

After upgrading, a GM should run `/vc-admin seed-data`. This includes the NPC cognition bootstrap and preserves already-seeded NPC state. It deliberately does not copy arbitrary global/player facts into every NPC's knowledge. Use `/vc-gm npc-state npc:<name>` to inspect the resulting GM-private profile, memories, beliefs, and goals.

See:
- `docs/NPC_COGNITION.md`
- `docs/UPGRADE_3.7.0_TO_3.8.0.md`
- `docs/CHANGELOG_v3.8.0_DISCORD.md`

## v3.7.0 — GM Operations, Recovery & Provenance

v3.7.0 adds the next operational layer for long-running campaigns: duplicate-delivery protection for mutating Discord interactions, a consolidated GM dashboard, first-class World Director controls/history, fact lifecycle/provenance, durable campaign backups with preview/restore, a structured authoritative mutation ledger, AI confidence handling, and `/vc-admin doctor` diagnostics.

New GM surfaces include `/vc-gm overview`, `/vc-director status|history|pause|resume|run`, `/vc-admin backup|backups|restore-preview|restore|doctor|ledger`, and `/vc-gm fact-edit|fact-archive|fact-promote`. Exact duplicate facts are deduplicated; facts retain source/session/provenance/confidence metadata. AI state reviews now include confidence, and changes below the 55% confidence floor are not committed as authoritative state; they are surfaced for human GM attention instead.

The authoritative mutation ledger records human command operations and AI/world-director mutations with actor/source context, interaction/message provenance, confidence, rationale, trigger text, and before/after state where available. World Director passes now have persistent operational history and can be paused without advancing the campaign through real-world time.

See:
- `docs/GM_OPERATIONS.md`
- `docs/WORLD_DIRECTOR.md`
- `docs/UPGRADE_3.6.0_TO_3.7.0.md`
- `docs/CHANGELOG_v3.7.0_DISCORD.md`

## v3.6.0 — Production Refactor & Privacy Enforcement

v3.6.0 is a behavior-preserving maintainability/security refactor based on the v3.5.5 expanded audit. Discord output chunking is centralized and lossless, GM/private channel registration is permission-validated, GM fact filtering occurs in SQL before limits, runtime configuration fails fast on invalid numeric/enum values, and direct SQLite access outside `VeiledDB` has been removed.

The slash-command declaration tree is now separated from runtime command execution. A new dependency-free `npm run quality` gate enforces module responsibility headers and the DB abstraction boundary, while `npm run test:refactor` covers the audit regressions. `LOG_LEVEL` is now an active runtime setting.

Discord policy decision: `/vc-gm` remains discoverable when Discord exposes it because Veilkeeper supports a custom GM role that may not hold Discord's Manage Server permission. Execution remains strictly GM/admin-authorized. GM-only **data and configured channels** are enforced separately.

See:
- `docs/CODE_STANDARDS.md`
- `docs/UPGRADE_3.5.5_TO_3.6.0.md`
- `docs/CHANGELOG_v3.6.0_DISCORD.md`


## v3.5.5 — Fact Listing & Visibility Hardening

v3.5.5 renames the GM fact write command to `/vc-gm fact-add`, adds GM-only `/vc-gm fact-list`, and adds player-safe `/vc-intel facts`. Player-facing fact queries now use a dedicated database boundary that cannot opt into GM-only visibility; `/vc-intel facts`, `/vc-intel clues`, player exports, and actor-visible AI context all use that boundary.

GM-only facts remain visible to `/vc-gm fact-list` but are deterministically excluded from player-role fact/clue listings.

Upgrade notes:
- `docs/UPGRADE_3.5.4_TO_3.5.5.md`
- `docs/CHANGELOG_v3.5.5_DISCORD.md`

## v3.5.4 — Private Player Canon Proposals

v3.5.4 makes explicit private player requests for campaign canon durable and reviewable. Veilkeeper now records the request in the existing canon-proposal queue, confirms privately that canon itself was not changed, and posts the proposal to the configured GM log. GM review continues through `/vc-canon proposals` and `/vc-canon proposal-resolve`.

Important: configure the GM log with `/vc-campaign channels gm_log:#your-gm-log`. If GM-log delivery is unavailable, the proposal remains safely queued and Veilkeeper records a state-error fallback reference.

Upgrade notes:
- `docs/UPGRADE_3.5.3_TO_3.5.4.md`
- `docs/CHANGELOG_v3.5.4_DISCORD.md`

## v3.5.3 — GM Session Roster

v3.5.3 adds GM-only `/vc-session roster`, an ephemeral authoritative view of the active session's Discord player → character/control mapping. It includes primary and guest PCs, attendance/absence handling, PC proxies, active NPC proxies, pending NPC proxy offers, and warnings for present players without an active PC/guest assignment.

See:
- `docs/UPGRADE_3.5.2_TO_3.5.3.md`
- `docs/CHANGELOG_v3.5.3_DISCORD.md`

## v3.5.2 — Production Test Teardown Fix

v3.5.2 fixes `npm run test:production` printing `PASS` but remaining alive on some systems. The voice repeat regression could start a real `@discordjs/voice` AudioPlayer and leave its global audio-cycle timer active after assertions completed. The test now keeps repeat-queue validation deterministic without starting real playback, explicitly destroys all VoiceNarrator test instances, and yields one event-loop turn before completion.

This is a test-harness maintenance release. There are no database, slash-command, gameplay, GM/world-director, privacy, or production voice behavior changes.

See:
- `docs/UPGRADE_3.5.1_TO_3.5.2.md`
- `docs/CHANGELOG_v3.5.2_DISCORD.md`

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
