# RF05-F04 C24 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C24-SCOPE.md`](C24-SCOPE.md)

## Implementation

Moved the exact existing autonomous action and major-impact arrays to `frameworks/world/action-catalog.js`. World public exports those values, and `simulation.js` imports and re-exports the same array objects for historical readers. The NPC Director schema still uses the same World arrays. No runtime action, cost, validation, or effect logic changed.

## Verification

Fresh test `rf05-f04-c24.test.mjs` passed **1/1**, exit **0**, 511.4329 ms. It verifies identity through World public and the simulation compatibility exports, and verifies the existing NPC Director schema uses those exact vocabularies. Syntax passed **5/5**. RF05 ratchet remains failed at **950** active groups/errors, with **593** modules, **0** unowned, **2,777** imports and largest cycle 181; the new action-catalog and World public export have no reported findings. Existing `simulation.js` violations remain. No transition retired; 48 F04 entries remain. Hashes and terminal evidence are in [`C24-RUN.json`](C24-RUN.json).

## Rollback and limits

Restore the catalog declarations in `simulation.js`, remove its import/re-export and World public export, and delete only C24's test/evidence. No behavior or persistent data change is intended. No external services. Release remains NOT AUTHORIZED.
