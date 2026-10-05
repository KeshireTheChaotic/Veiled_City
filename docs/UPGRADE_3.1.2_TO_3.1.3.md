# Upgrade v3.1.2 → v3.1.3

v3.1.3 replaces the legacy solo encounter assumptions with a multiplayer Battle Point encounter builder.

## Before upgrading
1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Preserve your existing `bot/.env`.

## Install
Replace the application/content files with v3.1.3, then restore your `.env` and SQLite database.

Run:

```bash
cd bot
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc encounter` commands are new.

## Database migration
The new `encounters` table is additive. Existing campaigns, characters, sessions, NPC proxies, party state, private knowledge, and published references are preserved.

## No new Discord channels or permissions
The encounter builder is GM-only and uses existing Veilkeeper permissions. No additional server setup is required.

## No new API billing requirement
Battle Point construction and encounter persistence are deterministic/local. `/vc encounter` commands do not require an additional AI model call.

## Removed legacy content
The package no longer includes `DAGGERHEART_SOLO_RULES.md` or `SOLO_ENCOUNTER_GUIDE.md`. References are replaced by multiplayer operating and encounter guides.
