# Veiled City Multiplayer Discord v3.8.0 — Validation Report

Validation date: 2026-10-07

## Verdict

**Application/source validation: PASS.** v3.8.0 establishes the first persistent NPC cognition phase: profiles/personality constraints, subjective memories, knowledge/beliefs, goals, relevance-ranked retrieval, automatic structured cognition updates, and a one-time seed path from existing Veiled City content/state.

## Canonical source

Implementation was based on GitHub `KeshireTheChaotic/Veiled_City` `main` at the v3.7.0 source state. Key source blob hashes (`db.js`, `gm.js`, `schema.sql`, `commands.js`, `command-definitions.js`, and `README.md`) were verified against the v3.7.0 packaging baseline before modification.

The GitHub connector available to this validation environment had read access but rejected repository writes with HTTP 403, so this report does **not** claim that v3.8.0 was pushed to GitHub. The release archive is the deliverable for this run.

## v3.8.0 implementation

- Added `npc_profiles`, `npc_memories`, `npc_knowledge`, `npc_goals`, and `seed_runs` tables.
- Database migration advances additively from schema 370 to **380**.
- NPC memories preserve subject, source, sentiment, importance, confidence, tags, lifecycle state, recall count, and recall timestamp.
- NPC knowledge separates `known`, `suspected`, `rumor`, `doubted`, and explicitly `unknown` information from objective campaign truth.
- NPC goals retain horizon, priority, progress, status, dependencies, acceptable methods, and rationale.
- NPC profiles retain stable portrayal, activity tier, capabilities, knowledge boundaries, and decision-profile setting lenses.
- Added deterministic relevance-ranked cognition retrieval for ordinary GM turns, private NPC-proxy context, and World Director context.
- Mandatory post-turn review now includes `npc_cognition` and cross-validates cognition output.
- Cognition changes commit transactionally with other authoritative GM state and are recorded in the mutation ledger.
- Added one-time GM command `/vc-admin seed-npc-cognition`.
- Added GM inspection command `/vc-gm npc-state`.
- One-time seed consumes packaged GM NPC dossiers plus already-structured campaign NPC references/relationships and deliberately avoids granting NPCs arbitrary global facts.
- Setting-specific prompt/state rules cover hospitality/reciprocity, contractual expectations, Court/Concord custom, supernatural impressions, thresholds, anchors, and the Veil without treating subjective impressions as canon.
- NPC cognition participates in campaign snapshots/backups and GM-full exports; player-safe exports exclude it.
- `/vc-admin doctor` recognizes schema 380 and reports cognition seed/profile state.

## Regression results

The complete application validation chain passed using temporary local SDK test doubles for unavailable external packages:

- `npm run lint`: **PASS**
- `npm run format:check`: **PASS**
- JavaScript syntax: **PASS** — 42 modules/scripts
- Discord command schema: **PASS** — 21 root commands
- `npm run test:offline`: **PASS**
- `npm run test:production`: **PASS**
- `npm run test:refactor`: **PASS**
- `npm run test:operations`: **PASS**
- `npm run test:cognition`: **PASS**

The cognition regression specifically verifies:

- one-time seeding and duplicate-seed rejection;
- dossier profiles/goals/knowledge boundaries;
- Veiled City contract/hospitality/Veil decision-profile lenses;
- existing relationship/reference bootstrap;
- subjective rumor vs objective fact separation;
- transactional AI memory/knowledge/goal persistence;
- mutation-ledger provenance;
- relevance-ranked compact retrieval;
- mandatory `npc_cognition` post-turn review consistency;
- inclusion in logical snapshots/backups;
- schema version 380.

## Migration validation

A database created from the unmodified v3.7.0 schema (`PRAGMA user_version=370`) was opened through the v3.8.0 `VeiledDB` startup path. Result: **PASS**.

- Existing campaign record preserved.
- Schema advanced to `user_version=380`.
- All five v3.8 cognition/seed tables were created and queryable.

## Dependency validation limitation

The validation environment could not complete a registry-backed `npm install`; repeated attempts timed out. Temporary local SDK doubles for `discord.js`, `openai`, `dotenv`, and `@discordjs/voice` were used only to exercise the existing offline/schema/regression test harness and were removed before packaging.

Therefore run the following on the connected deployment host before production restart:

```bash
cd bot
npm install
npm run audit:prod
npm run validate
npm run register
```

`npm run register` is required because v3.8.0 adds slash subcommands.

## Packaging requirements

The release must not contain `node_modules`, `.env`, SQLite runtime databases, logs, or validation test doubles. The existing GitHub README structure is preserved and updated only for v3.8.0-relevant information/current version.
