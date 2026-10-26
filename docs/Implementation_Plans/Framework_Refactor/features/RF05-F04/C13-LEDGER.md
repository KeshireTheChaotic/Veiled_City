# RF05-F04 C13 — Knowledge authority projection public import

**Status:** COMPLETE FOR THE SCOPED PUBLIC-IMPORT EDGE; RF05-F04 AND RF05 REMAIN INCOMPLETE.
**Base HEAD:** `ee5f5f24ff8ceec2a25292ce6ecc5030a69253e8`
**Branch:** `codex/clean-ai-gm-2026-10`
**Scope:** [`C13-SCOPE.md`](C13-SCOPE.md)

## Implementation and results

`gm.js` now imports `projectAuthorityRecords` through Knowledge public. The root compatibility reader remains unchanged, and its exact transition `44030eadc4099d258170c650827e85d01ff58bf128ca62652198f53ada5bbb06` is preserved in `C13-RETIRED.json`. The fresh test verifies GM module loading, the public import route, the Knowledge public wildcard export, and the compatibility-reader route.

The final repaired test run passed **2/2**, exit **0**, in **607.07 ms**. The initial run failed 1/2 because its assertion expected a named export where the existing public API uses `export *`; only the assertion changed, and the repaired whole file ran once. Changed-file syntax passed **2/2**. The RF05 ratchet failed at **950** existing groups/errors (581 modules, zero unowned); its report shows **zero active findings and zero transition errors for `gm.js`**. After retiring this exact edge, **50 RF05-F04 records** remain (1 legacy location, 1 external capability owner, 48 private API imports). Exact hashes and terminal outputs are in `C13-RUN.json` and `phases/RF05/rf05-f04-c13-*.log`.

No provider, network, production database, or Discord calls; cost is zero and Codex usage is unmeasured. Rollback restores only the GM import and this transition from the retained record. Release remains **NOT AUTHORIZED**.

## Evidence

No tests or syntax checks have run for this slice yet. No provider, network, production database, or Discord calls are authorized or planned. Cost is zero; Codex usage is unmeasured.

## Holds and rollback

Unrelated RF04/RF05 architecture debt remains deferred and does not block this import change. Rollback only this C13 import/transition/evidence slice; preserve all other worktree edits and the `c13-wip` stash. Release remains **NOT AUTHORIZED**.
