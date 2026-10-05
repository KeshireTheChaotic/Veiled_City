# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.2.0

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.

## v3.2.0 focus — campaign integrity and full lifecycle support

v3.2.0 adds seven major systems:

1. **AI-assisted character concepts** — `/vc character concept` turns a plain-English concept into a Level 1 draft with structured hooks and explicit player/GM permissions.
2. **Deterministic combat state** — adversary HP, Stress, thresholds, conditions/effects, status, Fear, and non-binding spotlight counts live in SQLite rather than model memory.
3. **Validated level-ups** — `/vc character level-up`, `level-choose`, and `level-confirm` enforce tier achievements, advancement slots, domain access, and mandatory domain-card progression.
4. **Snapshots and rollback** — automatic snapshots surround sessions and major mutations; GM commands can create/list/restore snapshots.
5. **Canon ledger** — durable canon is versioned; contradictory proposals create pending conflicts instead of silently overwriting established facts.
6. **Downtime/world turns** — between-session projects can be submitted and resolved with visibility-aware results and world consequences.
7. **Grounded rules desk** — answers are labeled RAW, Veiled City House Rule, Homebrew Content, GM Ruling, or Provisional Ruling. Saved human-GM rulings have precedence.

All v3.1.3 features remain: Battle Point encounter building, guest/drop-in PCs, party convergence, private scenes, NPC proxy antagonists, reference channels, and low-cost rules questions.

## Architecture

**Discord is the interface. SQLite is authoritative state. The language model proposes fiction; application code owns persistent mechanics.**

The final Daggerheart rules do not use a mandatory initiative/action-token tracker. Veilkeeper therefore records encounter **spotlight counts only as a fairness aid** and never treats them as turns or action limits.

## Fast setup

1. Read `docs/DISCORD_SETUP.md`, `docs/SERVER_CHANNEL_SETUP.md`, and `docs/OPENAI_SETUP.md`.
2. Copy `bot/.env.example` to `bot/.env` and fill credentials.
3. Install/register/start:
   ```bash
   cd bot
   npm install
   npm run check
   npm run test:offline
   npm run register
   npm start
   ```
4. Configure your existing v3.1 support channels with `/vc campaign setup` and `/vc campaign channels`.
5. No new Discord channels or permissions are required for v3.2.0.

## New documentation

- `docs/CHARACTER_CONCEPT_WIZARD.md`
- `docs/LEVEL_UP.md`
- `docs/COMBAT_STATE.md`
- `docs/SNAPSHOTS_AND_ROLLBACK.md`
- `docs/CANON_LEDGER.md`
- `docs/DOWNTIME.md`
- `docs/RULES_GROUNDING.md`
- `docs/UPGRADE_3.1.3_TO_3.2.0.md`

## Upgrade

Back up `bot/data/veiled_city.sqlite`, preserve your existing `bot/.env`, replace the application/content files, then run:

```bash
cd bot
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because the slash-command tree changed. Database migration is additive and existing v3.1.3 campaigns/characters remain valid.
