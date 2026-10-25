# RF05-F04 C05 ledger — Intent contract public API

**Status:** COMPLETE FOR THIS CONSUMER-IMPORT SLICE; RF05-F04 remains partial.
**Base commit:** `caa88b2e0d0e26c6bc4e2ca3879359f1c3c50794`.

The Intent contract implementation now resides in `frameworks/intent/ai-intent-contracts.js` and is exported by the Intent public API. `gm.js` imports the existing prompt and schema through that API. The former root path remains a compatibility re-export for other production consumers. Export identity and schema behavior are preserved; these contracts remain proposals and do not authorize mechanics or PC actions.

The fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c05.test.mjs` passed **1/1**, exit **0**, duration **550.7978 ms**, one launch. Changed JavaScript syntax checks passed **5/5**, exit **0**. The RF05 ratchet failed as expected on **955** existing violation groups/transition errors, with **574** modules, **0** unowned, and **2,736** import occurrences. Changed-path inspection found no boundary finding for the GM's new public Intent import or the new Intent implementation/public module. The retained root compatibility path still has four exact cross-framework consumer findings (`delegation-catalog.js`, `ordinary-effects.js`, `seed-drafts.js`, and `simulation-schema.js`) plus its location obligation; those are outside this slice and remain assigned. No provider calls, tokens, model spend, network, or database access.

Only transition `9adda1062fb5ec114195328c1ff9008f15f9722203ff40fe98e27b719e6564b4` was retired and preserved in `C05-RETIRED.json`. The transition manifest SHA-256 after removal is `45390102A001F991450BD01CD88DB89CE3DFB3630697AB099058E975C96C6D86`; **58** RF05-F04 transition entries remain. Full file hashes and terminal outcomes are in `C05-RUN.json`.

Rollback only this C05 slice: restore the GM import and its exact transition; restore the former root implementation; remove the Intent public export, moved implementation, and C05-only test/evidence. Preserve the compatibility path for the other callers and all five pre-existing user edits. Release remains **NOT AUTHORIZED**.
