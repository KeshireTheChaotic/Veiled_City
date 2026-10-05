# Upgrade: v3.2.2 → v3.2.3

v3.2.3 is a structured-JSON reliability hotfix. It does not change the database schema or Discord command tree.

## Fixes

- Character descriptions containing double quotes, apostrophes, backslashes, braces, colons, and line breaks are now wrapped as JSON data before being included in the character-generation prompt.
- Character concepts use at least 3200 output tokens.
- Malformed or truncated structured model responses are detected and retried once automatically.
- The retry applies to all structured AI outputs, not only character concepts.

## Upgrade

1. Stop the bot.
2. Back up `bot/data/veiled_city.sqlite`.
3. Preserve `bot/.env` and the database.
4. Replace the v3.2.2 application files with v3.2.3.
5. Run:

```powershell
cd bot
npm install
npm run check
npm run test:offline
npm start
```

You do **not** need to run `npm run register` when upgrading directly from v3.2.2 because the Discord command definitions are unchanged.

## Optional `.env` update

Recommended:

```env
CHARACTER_MAX_OUTPUT_TOKENS=3200
STRUCTURED_JSON_RETRY_MAX_TOKENS=6000
```

If `CHARACTER_MAX_OUTPUT_TOKENS=1800` remains in the existing `.env`, character concepts still use a code-enforced minimum of 3200.
