# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.2.4

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.

## v3.2.4 — live character export

This release adds downloadable character-sheet exports generated directly from authoritative SQLite campaign state.

### Player export

```text
/vc-character export
```

Exports an owned character in `docx`, `json`, `markdown`, or `all`. The output reflects current resources, level, advancement state, equipment, hooks, and player/character-visible campaign knowledge. Player exports do not include GM-private information.

### GM export

```text
/vc-character export-gm character:"Character Name" format:all
```

GM/Admin only. Generates three deliberately separated bundles using the requested naming convention:

```text
GM_HOOKS_character
GM_PRIVATE_character
GM_CANON_character
```

Each can be JSON, Markdown, DOCX, or all three. `format:all` produces nine attachments total.

DOCX generation is local and deterministic; it requires no OpenAI request and no new npm package.

## Existing v3.2 systems

- Split Discord command roots compatible with Discord's 8,000-character command-size limit.
- AI-assisted character concepts with structured hook permissions.
- Deterministic combat state and Daggerheart Battle Point encounter construction.
- Validated character advancement.
- Campaign snapshots and rollback.
- Canon ledger and conflict resolution.
- Downtime/world turns.
- Grounded rules desk.
- Guest/drop-in PCs, party convergence, NPC proxy antagonists, private scenes, and visibility-aware knowledge.

## Upgrade from v3.2.3

Preserve `bot/.env` and `bot/data/veiled_city.sqlite`, then run from `bot/`:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because the Discord command definition changed.

See `docs/CHARACTER_EXPORT.md` and `docs/UPGRADE_3.2.3_TO_3.2.4.md`.
