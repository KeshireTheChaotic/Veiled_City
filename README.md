# VEILED CITY MULTIPLAYER DISCORD ENGINE v3.3.2

A deployable Discord multiplayer GM layer for **Veiled City**, using Daggerheart SRD 2.0 as its mechanical baseline.

## v3.3.2 — Canon Proposal Review

External character creation introduced in v3.3.1 can propose GM-only campaign hooks and possible canon. v3.3.2 adds a formal review lifecycle so those suggestions no longer require manual promotion with `/vc-canon set`.

After importing `GM_HOOKS_<Name>.json` with:

```text
/vc-character import-gm-hooks
```

review imported canon suggestions with:

```text
/vc-canon proposals
```

and resolve one with:

```text
/vc-canon proposal-resolve
```

The GM may **accept**, **reject**, or **accept an edited value**. Acceptance writes through the normal authoritative canon ledger. If the proposal contradicts an existing canon key, Veilkeeper creates a linked canon conflict instead of overwriting it. Resolving that conflict automatically updates the originating proposal to accepted or rejected.

Pending/conflicted canon proposals are also excluded from normal AI-GM hook context, so an unreviewed external suggestion cannot leak into narration as if it were true. Proposal records retain character association, reason, source, current/proposed value, conflict linkage, final value, resolution note, and audit timestamps. Existing v3.3.1 canon-suggestion hooks are backfilled into the proposal queue automatically; if an identical value is already current canon, the backfilled proposal is recognized as accepted.

GM character exports now include canon-proposal history in `GM_CANON_<Character>.*`.

## Upgrade from v3.3.1

Preserve:

```text
bot/.env
bot/data/veiled_city.sqlite
```

Then run:

```bash
cd bot
npm install
npm run check
npm run test:offline
npm run register
npm start
```

`npm run register` is required because `/vc-canon` gained two subcommands. The database migration is additive and requires no manual conversion.

See:

- `docs/CANON_LEDGER.md`
- `docs/CHARACTER_CONCEPT_CONTEXT.md`
- `docs/UPGRADE_3.3.1_TO_3.3.2.md`
- `docs/BOT_COMMANDS.md`
