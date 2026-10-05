# Upgrade v3.2.4 → v3.3.0

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Replace application/content files with v3.3.0 while preserving:
   - `bot/.env`
   - `bot/data/veiled_city.sqlite`
4. Optionally add to `.env`:

```env
OPENAI_HANDOUT_MODEL=gpt-6-luna
HANDOUT_MAX_OUTPUT_TOKENS=1200
OPENAI_AFTERMATH_MODEL=gpt-6-luna
AFTERMATH_MAX_OUTPUT_TOKENS=1800
ENCOUNTER_AFTERMATH_MODE=auto
```

5. From `bot/` run:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because the Discord command set changed.

## Existing characters

Run once after the bot starts:

```text
/vc-relationship import-hooks
```

This backfills structured relationships from existing character hooks. It is idempotent per character: already-imported characters are skipped.

## Removed command

`/vc-character concept` and its draft/accept helpers have been removed. Use `/vc-character create` or `/vc-character import` with a prepared character packet.

## Database migration

Migration is additive. v3.3.0 creates relationship, handout, and encounter-aftermath tables and adds encounter start-state storage. Existing characters, canon, snapshots, encounters, NPC proxies, and campaign history remain intact.
