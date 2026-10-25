# RF05-F04 C07 — Narrative GM-world contract public API

**Status:** COMPLETE FOR SCOPED GM IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `c227a66763839d4132e767665e0ee02fa8bb3534`
**Scope:** [`C07-SCOPE.md`](C07-SCOPE.md)

The existing closed GM-world schema and prompt now live in `frameworks/narrative/gm-world-contract.js`. Narrative's public API exports those exact contracts. `gm.js` imports through that API; `gm-world-narrative.js` retains rendering, source validation, storage, receipt behavior, and compatibility exports. The new data module depends only on Narrative's existing proposal schema. No narrative behavior or Daggerheart authority changed.

Fresh changed-code regression `rf05-f04-c07.test.mjs`, together with six fresh tests affected by the shared `GMService` import, passed **13/13** in one blocking batch (exit **0**, **3,956.3878 ms**, one launch). Changed JavaScript syntax passed **5/5** (exit **0**). The tests covered GM service loading, schema/prompt identity and shape, and the Narrative public import path. Test source hashes and exact invocations are in [`C07-RUN.json`](C07-RUN.json).

RF05 architecture ratchet failed (exit **1**) on existing debt: 576 source modules, zero unowned, 2,739 imports, largest cycle 181, 955 active violation groups and 955 transition errors. The changed GM edge and new contract have zero findings. Transition `cc8076bdca29df6585e651bdf86e712bcfbf8fbf7bbc52f37b0a30f248a87f7d` was retired only after the GM public import was confirmed; the original record is preserved in `C07-RETIRED.json`. There are **56** RF05-F04 assignments remaining. Provider/network/database use and provider cost: zero; Codex usage is unmeasured. Release is **NOT AUTHORIZED**.

Rollback by reverting only the C07 implementation/evidence commit. Preserve earlier feature commits, transition history, user changes, and unrelated diagnostic logs. This scoped slice does not close RF05-F04 or qualify the phase gate.
