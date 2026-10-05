# Upgrade v3.2.3 → v3.2.4

v3.2.4 adds downloadable live character exports.

## Preserve

Keep your existing:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Back up the database before upgrading.

## Install

Replace the application/content files with v3.2.4, then from `bot/` run:

```powershell
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` **is required** because `/vc-character export` and `/vc-character export-gm` are new slash subcommands.

## Database / Discord setup

- Database migration: none.
- New Discord channels: none.
- New bot permissions: none.
- New API key/model settings: none.
- Additional npm dependencies: none.

## New commands

```text
/vc-character export
/vc-character export-gm
```

See `docs/CHARACTER_EXPORT.md`.
