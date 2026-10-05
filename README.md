# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.3.1

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.

## v3.3.1 — External Character Concept Context

The unreliable in-bot character concept generator remains removed. Instead, players can now export a current, player-safe campaign package for use with ChatGPT or another capable external AI:

```text
/vc-character context-export [history_sessions]
```

The ZIP contains the bundled Veiled City Player Compendium plus current campaign continuity: recent session recaps, established party/current roster, active cases, known NPCs/locations, public/party relationships, player-safe canon/facts/clocks, evidence, and downtime state.

The export intentionally excludes GM-only data and character-private information so a new/replacement PC does not inherit secrets from an older PC.

The included AI instructions ask the external model to produce:

```text
CHARACTER_<Name>.json
GM_HOOKS_<Name>.json
```

The player imports the character normally:

```text
/vc-character import
```

After review, the GM imports the separate hook proposal package:

```text
/vc-character import-gm-hooks
```

Imported hooks and relationship suggestions remain GM-private. Suggested canon is **not** automatically canonized; the GM must deliberately promote accepted facts with `/vc-canon set`.

## Upgrade from v3.3.0

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

No new channels, Discord permissions, API keys, or `.env` settings are required. Character-context export and GM-hook import are local operations with no OpenAI API cost.

See:

- `docs/CHARACTER_CONCEPT_CONTEXT.md`
- `docs/UPGRADE_3.3.0_TO_3.3.1.md`
- `docs/BOT_COMMANDS.md`
