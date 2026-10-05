# Grounded Rules Desk — v3.2.0

The rules channel and `/vc rules ask` now return an explicit authority label:

- **RAW** — directly established by the supplied Daggerheart SRD 2.0-derived reference material.
- **VEILED_CITY_HOUSE_RULE** — explicit Veiled City campaign rule.
- **HOMEBREW_CONTENT** — Veiled City custom ancestry/domain/card/equipment rule.
- **GM_RULING** — saved human-GM interpretation for this campaign.
- **PROVISIONAL_RULING** — available sources do not establish a confident answer; human GM/SRD confirmation is recommended.

Authority order is:

**Saved GM ruling → RAW-derived rules → Veiled City house rule → Veiled City homebrew text → provisional ruling.**

The rules model cannot mutate campaign state.

## Persistent GM rulings

Save or replace a campaign ruling:

`/vc rules ruling key:<short-key> question:<question> ruling:<answer>`

View saved rulings:

`/vc rules rulings`

These rulings are stored in SQLite and passed to both the rules desk and main GM when relevant.

The bundled rules baseline identifies itself as **Daggerheart SRD 2.0, August 25, 2026**. The official SRD remains the final external authority when a bundled derivative reference is incomplete.
