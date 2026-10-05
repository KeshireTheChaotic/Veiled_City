# Upgrade v3.3.0 → v3.3.1

Preserve:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Replace the application/content files with v3.3.1, then run from `bot/`:

```bash
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-character context-export` and `/vc-character import-gm-hooks` were added.

The database migration is additive. v3.3.1 adds the `character_gm_hooks` table. Existing characters, sessions, canon, relationships, handouts, and campaign state are unchanged.

No new Discord permissions, channels, `.env` values, or API keys are required. Context exports and GM-hook imports are local and create no OpenAI API usage.
