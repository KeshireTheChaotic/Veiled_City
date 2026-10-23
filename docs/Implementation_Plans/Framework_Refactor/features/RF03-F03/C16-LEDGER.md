# RF03-F03 C16 ledger

Status: NATIVE LIFECYCLE QUALIFIED / PROVIDER ADOPTION PARTIAL. Base `840c8e75a9f0cc354c904ca141e38089e43929eb`. Static source review began while the independent F01-C07 batch was frozen; implementation started only after its final result was collected.

Current `pc-death.js` contains eleven exported lifecycle functions plus source/choice/mutation helpers. C13 eligibility/outcome mapping remains single-sourced. Sources needed: historical owner principal, current scene, event index. Native dependencies needed: incoming/PvP damage, accepted action, ally healing and interrupt/damage settlement. Missing qualification is complete lifecycle/receipt/rollback evidence, not a missing game rule.

The complete lifecycle body now lives in `daggerheart/pc-death-rules.js`; `pc-death.js` binds the exact source and native verification callbacks lazily and retains all public exports. Fresh test file `rf03-f03-c16.test.mjs` includes ten SQLite/source-boundary cases. No native responsibility or transition deadline deferred.

Frozen fresh test10/10 passed,exit0,737.4518ms; four changed syntax checks passed. Owner/review/source/revision; native Critical/Death/Hope allocation; Avoid Death permanent slot; rollback; reopen/replay; Blaze approval/automatic-Critical/once-only completion; healing-backed wake and corrupted mutation ancestry covered. Exact native body unchanged against HEAD. Incoming/PvP damage, source principal/authored action, healing and downstream Blaze roll creation are explicit fixture capabilities; their implementations are not qualified here.

Initial architecture gate exit1 reported two UNUSED_TRANSITION records after the removed pc-native-eligibility import/re-export. Both exact originals preserved in F03_C16_RETIRED.json and retired without changing baseline/IDs/maxima. Architecture-only rerun exit0:406sources,zero unowned,2346imports,SCC182,2598accepted older occurrences,zero active groups/errors. Passing tests were not rerun. Full source/body/log hashes, actual terminal outcomes and timestamps: F03_C16_TERMINAL.json/F03_C16_RUN.json.

Provider cost0; Codex usage UNMEASURED; no new owner decision required; RF03 incomplete and release NOT AUTHORIZED.
