# RF03-F02 C04 ledger

Status: QUALIFIED native cost policy and group-feature direct adoption; provider cold-import remains unqualified.

Changed-code: move the pure feature cost calculation from `bot/src/native-feature-windows.js` to `bot/src/frameworks/daggerheart/feature-costs.js`; retain the provider export as a direct binding and update `native-group-features.js` to consume the native function directly. The exact old cycle transition was retired after its import edge disappeared; its full identity is preserved in `F02_C04_RETIRED.json`. No transaction or state mutation changes.

Test: `bot/tests/ai-gm-2026-10/rf03-f02-c04.test.mjs`, 3 passed/0 failed/0 skipped, exit 0, 61.3319 ms. Four changed JS/MJS syntax checks passed. RF03 ratchet passed: 394 modules, zero unowned, 2,320 imports, largest cycle 182, 2,600 accepted existing obligations, zero active groups/errors.

Three provider-import attempts exited 1 before assertions because the larger feature-window graph still raises `ReferenceError: Cannot access 'RANGE_BANDS' before initialization` in `pvp-attacks.js`. The finalized tests import the new native function directly and qualify policy behavior only; provider startup remains unqualified. Full attempts and source hashes are in `phases/RF03/F02_C04_TERMINAL.json`; attempt logs are retained beside it. No provider calls or spend; Codex usage UNMEASURED. Rollback only this C04 source, caller/provider wiring, exact retired transition, test, and evidence. Release authorization: NOT AUTHORIZED.
