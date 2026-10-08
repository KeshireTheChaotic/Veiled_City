# Upgrade v3.2.0 → v3.2.1

This is a registration hotfix only. No database migration, Discord permission changes, channel changes, or `.env` changes are required.

## Preserve

Keep your existing:

- `bot/.env`
- `bot/data/veiled_city.sqlite`

## Upgrade

Replace the application/source files with v3.2.1, then from `bot/` run:

```powershell
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run check` now validates the Discord command schema, including the rule that all required options must appear before optional options.

## Fixed

`/vc character level-choose` previously placed required `domain_card` after optional `detail_one` and `detail_two`, causing Discord API error `50035 APPLICATION_COMMAND_OPTIONS_REQUIRED_INVALID`. v3.2.1 moves `domain_card` before all optional fields.
