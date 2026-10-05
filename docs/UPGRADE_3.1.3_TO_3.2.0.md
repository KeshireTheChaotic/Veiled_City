# Upgrade v3.1.3 → v3.2.0

## 1. Stop Veilkeeper

Stop the running bot before copying files.

## 2. Back up SQLite

Copy:

`bot/data/veiled_city.sqlite`

to a safe backup location.

## 3. Preserve configuration

Keep your populated:

`bot/.env`

v3.2.0 adds optional variables:

```env
OPENAI_CHARACTER_MODEL=gpt-6-luna
CHARACTER_MAX_OUTPUT_TOKENS=1800
OPENAI_DOWNTIME_MODEL=gpt-6.1-sol
DOWNTIME_MAX_OUTPUT_TOKENS=1800
```

If omitted, the package falls back to existing configured models as documented in `bot/.env.example`.

## 4. Replace application/content files

Copy the v3.2.0 package over the old application, while retaining `.env` and your SQLite database.

## 5. Validate and migrate

```powershell
cd bot
npm install
npm run check
npm run test:offline
npm run register
npm start
```

The SQLite migration is additive. Existing characters, sessions, encounters, NPC proxies, parties, private information, and campaign history are preserved.

`npm run register` is required because new slash commands were added.

## 6. Discord setup

No new channels, roles, intents, or bot permissions are required.

Recommended existing channels remain:

- `#the-table`
- `#rules-questions`
- `#case-board`
- `#party-journal`
- `#known-npcs`
- `#known-locations`
- player private GM channels
- `#gm-log`
- `#state-errors`
