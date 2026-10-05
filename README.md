# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.1.3

A deployable Discord multiplayer layer for the Veiled City Daggerheart campaign package.

## v3.1.3 focus — Multiplayer Encounter Builder
v3.1.3 drops the legacy solo encounter-balancing mode and adds deterministic multiplayer encounter construction using Daggerheart Battle Points.

New in v3.1.3:
- `/vc encounter build` budgets opposition from the **live present-PC roster**.
- Base Battle Points use `(3 × PCs) + 2`.
- Easy/standard/hard encounter adjustments are supported.
- Official role costs are encoded for Minion, Social, Support, Horde, Ranged, Skulk, Standard, Leader, Bruiser, and Solo adversaries.
- Composition modifiers are derived for 2+ Solos, boosted damage, lower-tier adversaries, and encounters without a heavy role.
- Tier auto-selection uses the highest tier represented by present PCs.
- Minions are budgeted as party-sized groups.
- Veiled City adversary JSON now includes Battle Point metadata.
- Encounter plans persist in SQLite and are passed to the AI GM as GM-private authoritative state.
- Objectives and Veiled City environments are stored alongside opposition.
- `/vc encounter add`, `remove`, `adjust`, `status`, `start`, and `end` support human-GM control.
- Legacy one-PC encounter instructions have been removed.

v3.1.2 NPC Proxy, v3.1.1 party assembly, and all v3.1 Discord quality/cost features remain intact.

## Architecture
**Discord is the interface. SQLite is authoritative state. The language model is the GM, not the database.**

Dice, attendance, character ownership, encounter budgets, encounter composition, and lifecycle state are deterministic application data. The model cannot silently change them.

## Fast setup
1. Read `docs/DISCORD_SETUP.md` and `docs/SERVER_CHANNEL_SETUP.md`.
2. Read `docs/OPENAI_SETUP.md`.
3. Copy `bot/.env.example` to `bot/.env` and fill credentials.
4. Install/register/start:
   ```bash
   cd bot
   npm install
   npm run check
   npm run test:offline
   npm run register
   npm start
   ```
5. Configure the main table and support channels as in v3.1.2.
6. Start sessions normally.
7. Before a planned combat, use `/vc encounter build` and review with `/vc encounter status`.
8. Mark the encounter active with `/vc encounter start` and close it with `/vc encounter end`.

## Encounter Builder
Read `docs/ENCOUNTER_BUILDER.md`.

## Upgrade
From v3.1.2, read `docs/UPGRADE_3.1.2_TO_3.1.3.md`.
Back up `bot/data/veiled_city.sqlite` before first v3.1.3 start. The database migration is additive.
