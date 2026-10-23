# RF03-F02 C04 ledger

Status: QUALIFIED native cost function only; provider cold-import remains unqualified.

Changed-code intent: move the pure feature cost calculation from `bot/src/native-feature-windows.js` to `bot/src/frameworks/daggerheart/feature-costs.js`; retain the existing provider export as a direct binding for compatibility with current callers. No transaction or state mutation changes.

Test: `bot/tests/ai-gm-2026-10/rf03-f02-c04.test.mjs`, 3 passed/0 failed/0 skipped, exit 0, 59.7413 ms. Three changed JS/MJS syntax checks passed. RF03 ratchet passed: 394 modules, zero unowned, 2,320 imports, largest cycle 182, 2,601 accepted existing obligations, zero active groups/errors.

Two earlier attempts exited 1 before assertions because importing the legacy feature-window provider traversed a cold-import cycle and raised `ReferenceError: Cannot access 'RANGE_BANDS' before initialization` in `pvp-attacks.js`. The finalized tests import the new native function directly and qualify its policy behavior only. Provider startup remains unqualified. Full attempts and source hashes are in `phases/RF03/F02_C04_TERMINAL.json`; attempt logs are retained beside it. No provider calls or spend; Codex usage UNMEASURED. Rollback only this C04 source, provider wiring, test, and evidence. Release authorization: NOT AUTHORIZED.
