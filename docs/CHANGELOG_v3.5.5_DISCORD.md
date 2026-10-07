# Veiled City v3.5.5 — Fact Listing & Privacy

- Renamed `/vc-gm fact` to `/vc-gm fact-add`.
- Added GM-only `/vc-gm fact-list` for browsing recorded campaign facts.
- `/vc-gm fact-list` supports visibility, category, player, text-search, and result-limit filters.
- Added player-facing `/vc-intel facts` for viewing recorded facts the invoking player/character is allowed to know.
- `/vc-intel clues` and `/vc-intel facts` now use a dedicated player-safe fact query with **no GM visibility override**.
- **GM-only facts cannot be returned to the player role**, even when they concern that player's character.
- Player-safe character exports and actor-visible AI fact context now use the same hardened visibility boundary.
- Added defense-in-depth protection that rejects a GM-only fact if it ever reaches the player-safe Discord formatter unexpectedly.
- Added regression coverage for public, party, player-private, character-private, other-player-private, and GM-only fact visibility.
- Added direct command-handler tests confirming `/vc-gm fact-list` is GM/admin-only and `/vc-intel facts` cannot expose GM facts.
- No database migration is required.
- Run `npm run register` once after upgrading because the Discord command schema changed.
