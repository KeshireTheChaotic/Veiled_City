# Grounded Rules Desk — v3.2.0

The rules channel and `/vc-rules ask` now return an explicit authority label:

- **RAW** — directly established by the supplied Daggerheart SRD 2.0-derived reference material.
- **VEILED_CITY_HOUSE_RULE** — explicit Veiled City campaign rule.
- **HOMEBREW_CONTENT** — Veiled City custom ancestry/domain/card/equipment rule.
- **GM_RULING** — applicable saved scoped GM interpretation for this campaign; a model role label is not native adjudicator authority.
- **PROVISIONAL_RULING** — available sources do not establish a confident answer; human GM/SRD confirmation is recommended.

Authority order is:

**Applicable saved GM ruling → exact explicit campaign override → verified RAW-derived rules → compatible Veiled City house/homebrew extension → identified provisional ruling.**

This is a conflict-resolution order, not permission to weaken an existing native gate. Safety/consent, native ownership, factual/source authority and committed-receipt integrity always constrain execution. A current native GM ruling may be AI- or human-authenticated where the concrete adapter supports it; do not forge human review for an AI decision. Required player choices/cost authorization and unsupported-adapter holds remain intact. Explicit overrides require a verified `override:` reference or source-pinned native owner erratum in its exact feature scope; ordinary house text does not silently displace RAW. Shared runtime application policy v2 projects this same order to GM and Rules Desk calls.

The rules model cannot mutate campaign state.

## Persistent GM rulings

Save or replace a campaign ruling:

`/vc-rules ruling key:<short-key> question:<question> ruling:<answer>`

View saved rulings:

`/vc-rules rulings`

These rulings are stored in SQLite and passed to both the rules desk and main GM when relevant.

The bundled rules baseline identifies itself as **Daggerheart SRD 2.0, August 25, 2026**. The official SRD remains the final external authority when a bundled derivative reference is incomplete.
