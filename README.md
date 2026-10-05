# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.3.0

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.

## v3.3.0 — Evidence, relationships, and encounter consequences

This release adds three campaign-state systems intended for long-running investigative play:

- **Handouts & Evidence** — Veilkeeper can create evidence during narration, or the GM can create/generate it explicitly. Every handout has authority and visibility metadata and can be delivered or exported without making hidden source facts player-visible.
- **Relationship Graph** — durable character/NPC/faction/location relationships are stored as structured edges with type, intensity, visibility, and notes. New characters seed their hook relationships automatically; existing characters can be backfilled once with `/vc-relationship import-hooks`.
- **Encounter Aftermath** — ending an encounter can automatically generate and apply aftermath consequences, require GM confirmation, or skip aftermath entirely.

The unreliable `/vc-character concept` command has been removed. Character creation/import remains available through `/vc-character create` and `/vc-character import`.

## New commands

### Handouts / evidence

```text
/vc-handout generate
/vc-handout create
/vc-handout list
/vc-handout show
/vc-handout export
/vc-handout deliver
/vc-handout archive
```

`generate` uses the configured low-cost handout model. `create` and all export/rendering operations are local and make no OpenAI call.

### Relationship graph

```text
/vc-relationship list
/vc-relationship set
/vc-relationship adjust
/vc-relationship import-hooks
```

Run `import-hooks` once after upgrading if the campaign already contains characters created before v3.3.0. Reruns safely skip characters already imported.

### Encounter aftermath

```text
/vc-encounter end [aftermath:auto|confirm|none]
/vc-encounter aftermath-status
/vc-encounter aftermath-confirm
/vc-encounter aftermath-discard
```

Default behavior is controlled by `ENCOUNTER_AFTERMATH_MODE`. `auto` applies consequences immediately after a pre-aftermath snapshot. `confirm` stores a pending draft for a GM to review. `none` simply ends the encounter.

## Optional `.env` settings

```env
OPENAI_HANDOUT_MODEL=gpt-6-luna
HANDOUT_MAX_OUTPUT_TOKENS=1200
OPENAI_AFTERMATH_MODEL=gpt-6-luna
AFTERMATH_MAX_OUTPUT_TOKENS=1800
ENCOUNTER_AFTERMATH_MODE=auto
```

No new API key, Discord permission, or Discord channel is required.

## Upgrade from v3.2.4

Preserve:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Then run from `bot/`:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-character concept` was removed and the `/vc-handout`, `/vc-relationship`, and encounter-aftermath commands were added.

See:

- `docs/HANDOUTS_AND_EVIDENCE.md`
- `docs/RELATIONSHIP_GRAPH.md`
- `docs/ENCOUNTER_AFTERMATH.md`
- `docs/UPGRADE_3.2.4_TO_3.3.0.md`
- `docs/BOT_COMMANDS.md`
