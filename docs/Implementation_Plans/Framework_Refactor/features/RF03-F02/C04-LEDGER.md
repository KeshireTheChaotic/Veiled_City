# RF03-F02 C04 ledger

Status: QUALIFIED native cost policy, group-feature direct adoption, and actual feature-window provider cold-import path.

Changed-code: move the pure feature cost calculation from `bot/src/native-feature-windows.js` to `bot/src/frameworks/daggerheart/feature-costs.js`; retain the provider export as a direct binding and update `native-group-features.js` to consume the native function directly. The exact old cycle transition was retired after its import edge disappeared; its full identity is preserved in `F02_C04_RETIRED.json`. No transaction or state mutation changes.

Test: `bot/tests/ai-gm-2026-10/rf03-f02-c04.test.mjs`, 3 passed/0 failed/0 skipped, exit 0, 61.3319 ms. Four changed JS/MJS syntax checks passed. RF03 ratchet passed: 394 modules, zero unowned, 2,320 imports, largest cycle 182, 2,600 accepted existing obligations, zero active groups/errors.

The original provider-import attempts failed before assertions because of the `RANGE_BANDS` cycle. C13 fixed the observed import-time cycle, and its fresh test now imports the actual `native-feature-windows.js` provider, exercises its feature-cost export, and invokes the lazy feature-reaction stakes adapter; see `F02_C13_TERMINAL.json`. The provider path is qualified for this import and these adapters only, not the full application startup or PvP runtime. C04's direct-native test remains 3/3 passed. Provider calls/spend remain zero; Codex usage UNMEASURED. Rollback only the C04/C13 native provider wiring, exact retired transition and their evidence. Release NOT AUTHORIZED.
