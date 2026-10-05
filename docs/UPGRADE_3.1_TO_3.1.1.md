# UPGRADE v3.1 → v3.1.1

v3.1.1 is an additive patch focused on party assembly, convergence, and late/guest/replacement character entry.

## 1. Stop Veilkeeper

Stop the existing bot before replacing files.

## 2. Back up the database

Copy:

`bot/data/veiled_city.sqlite`

to a safe backup location.

## 3. Replace application files

Replace the v3.1 bot source/docs/content with the v3.1.1 package.

Keep your existing:
- `bot/.env`
- `bot/data/veiled_city.sqlite`

Do **not** overwrite either with a blank/example file.

## 4. Optional `.env` additions

v3.1.1 adds:

```env
OPENAI_ASSEMBLY_MODEL=gpt-6-luna
ASSEMBLY_MAX_OUTPUT_TOKENS=1200
```

Both are optional. If `OPENAI_ASSEMBLY_MODEL` is omitted, Veilkeeper uses `OPENAI_ROUTER_MODEL`.

No new API key is required.

## 5. Install/check

```powershell
cd bot
npm install
npm run check
npm run test:offline
```

## 6. Re-register Discord commands

Required because `/vc` gained new subcommands/options:

```powershell
npm run register
```

## 7. Start

```powershell
npm start
```

The database migration runs automatically and adds:
- campaign persistent party state;
- session assembly mode;
- session assembly phase;
- private stored assembly plan.

Existing campaign/character/session data is preserved.

## 8. No new Discord permissions required

The existing v3.1 permissions are sufficient:
- View Channels
- Send Messages
- Read Message History
- optional Embed Links / Attach Files / Send Messages in Threads

Message Content Intent remains required for normal roleplay processing.

## 9. No new Discord channels required

Party assembly uses:
- `#the-table` for the public opening;
- each player's registered private GM channel for private entry hooks;
- `#gm-log` for operational logging.

If a player has not registered a private channel, Veilkeeper attempts a Discord DM instead.

## 10. First use

```text
/vc-session start assembly:auto
```

Players check in, then:

```text
/vc-session assemble
```

See `docs/PARTY_ASSEMBLY.md`.
