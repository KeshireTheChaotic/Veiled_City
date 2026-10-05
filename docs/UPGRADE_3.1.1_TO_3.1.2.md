# Upgrade v3.1.1 → v3.1.2

v3.1.2 adds guest-controlled NPC antagonist proxies. The SQLite migration is additive.

## 1. Stop Veilkeeper
Stop the Node process or Docker container before replacing files.

## 2. Back up state
Back up:

`bot/data/veiled_city.sqlite`

Also keep your existing populated:

`bot/.env`

Do not replace either with a blank package copy.

## 3. Replace application files
Replace the v3.1.1 application/source/docs with v3.1.2, then restore/carry forward the two files above.

## 4. Optional `.env` additions
These are optional. If omitted, NPC proxy packet generation falls back to the existing assembly/router model.

```env
OPENAI_NPC_PROXY_MODEL=gpt-6-luna
NPC_PROXY_MAX_OUTPUT_TOKENS=1200
```

## 5. Reinstall/check/register
From `bot`:

```powershell
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc` gained the new `npc` command group.

## 6. Discord setup
No new permissions or channels are required.

However, for the requested delivery fallback, **configure `#state-errors`** using `/vc campaign channels`. If the guest has neither a registered private GM channel nor open DMs, Veilkeeper posts the sanitized NPC package there so an admin GM can relay it.

Each recurring player/guest should ideally have a private channel and run:

`/vc player private-channel`

## 7. Existing characters/campaign state
No character JSON changes are required. Existing PCs, guests, party state, facts, and sessions remain compatible.
