# Upgrade: v3.5.4 → v3.5.5

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and preserve `.env`.
3. Overlay the v3.5.5 package files.
4. From `bot/`, run `npm install`.
5. Run `npm run audit:prod`, `npm run check`, `npm run test:offline`, and `npm run test:production`.
6. Run `npm run register` once. This release renames `/vc-gm fact` to `/vc-gm fact-add` and adds `/vc-gm fact-list` plus `/vc-intel facts`, so Discord must receive the updated command schema.
7. Start Veilkeeper.

No database migration is required. Existing facts and visibility values are preserved.

### Command changes

- Old: `/vc-gm fact`
- New write command: `/vc-gm fact-add`
- New GM browser: `/vc-gm fact-list [visibility] [category] [player] [search] [limit]`
- New player-safe browser: `/vc-intel facts`

`/vc-intel facts` returns only `category=fact` rows the invoking player is authorized to know. GM-only facts are excluded at the database query boundary and cannot be requested through the player command. `/vc-intel clues` uses the same hardened visibility boundary.
