# Upgrade v3.2.1 → v3.2.2

## Why this patch exists

v3.2.1 corrected a required-option ordering problem, but Discord then rejected the single `/vc` tree with:

```text
APPLICATION_COMMAND_TOO_LARGE
Command exceeds maximum size (8000)
```

Discord applies the 8,000-character limit **per root slash command**. Veilkeeper had grown to 73 subcommands under one `/vc` root.

## What changed

The command tree is now split into 17 root commands. The underlying handlers, database schema, campaign state, and gameplay behavior are unchanged.

Common command translations:

```text
/vc campaign ...       → /vc-campaign ...
/vc session ...        → /vc-session ...
/vc character ...      → /vc-character ...
/vc character level-*  → /vc-level level-*
/vc encounter build    → /vc-encounter build
/vc encounter combatants/damage/heal/stress/condition/combatant-status
                        → /vc-combat ...
/vc rules ...          → /vc-rules ...
/vc admin ...          → /vc-admin ...
```

See `BOT_COMMANDS.md` for the full mapping.

## Upgrade procedure

1. Stop the running bot.
2. Back up:
   - `bot/.env`
   - `bot/data/veiled_city.sqlite`
3. Replace v3.2.1 program files with v3.2.2.
4. Restore/preserve your existing `.env` and SQLite database.
5. Run:

```powershell
cd "D:\Library\Veiled City\bot"
npm install
npm run check
npm run test:offline
npm run register
npm start
```

A successful `npm run check` now prints each root command and its calculated Discord character count. Every command must be below `8000/8000`.

A successful registration should report:

```text
Registered 17 root command(s) to guild <guild id>.
```

## No additional setup

There is no database migration and no change to Discord permissions, channels, Message Content Intent, OpenAI billing, or API credentials.
