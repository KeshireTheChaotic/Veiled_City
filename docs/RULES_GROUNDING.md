# Grounded Rules Desk — v3.2.0

The rules channel and `/vc-rules ask` now return an explicit authority label:

- **RAW** — directly established by the supplied Daggerheart SRD 2.0-derived reference material.
- **VEILED_CITY_HOUSE_RULE** — explicit Veiled City campaign rule.
- **HOMEBREW_CONTENT** — Veiled City custom ancestry/domain/card/equipment rule.
- **GM_RULING** — saved human-GM interpretation for this campaign.
- **PROVISIONAL_RULING** — available sources do not establish a confident answer; human GM/SRD confirmation is recommended.

Authority order is:

**Applicable saved GM ruling → exact explicit campaign override → verified RAW-derived rules → compatible Veiled City house/homebrew extension → identified provisional ruling.**

This is a conflict-resolution order, not permission to weaken an existing native gate. A manually reviewed roll source, player-owned consent, cost authorization, or committed native receipt remains required wherever its native service requires one. Explicit overrides must use a verified `override:` reference; ordinary house text does not silently displace RAW.

The rules model cannot mutate campaign state.

## Persistent GM rulings

Save or replace a campaign ruling:

`/vc-rules ruling key:<short-key> question:<question> ruling:<answer>`

View saved rulings:

`/vc-rules rulings`

These rulings are stored in SQLite and passed to both the rules desk and main GM when relevant.

The bundled rules baseline identifies itself as **Daggerheart SRD 2.0, August 25, 2026**. The official SRD remains the final external authority when a bundled derivative reference is incomplete.
