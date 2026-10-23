# RF03-F02 corrective C03 ledger

Status: QUALIFIED / C03 only. Base commit: `ea1569a`.

## Scope and authority

Move existing native damage-passive policy and arithmetic only. Current source catalog, feature statuses, house erratum state, and all surrounding attack/transaction checks remain authoritative and unchanged.

## Implementation and test evidence

`frameworks/daggerheart/standard-damage-passives.js` now owns the existing fixed damage arithmetic and standard-damage passive policy. `native-feature-passives.js` still supplies current compiled feature source, hash, HR11 record reader, and the existing failure constructor; unrelated attack-presence logic stays in place.

Review while extracting exposed an existing supported combat trigger that read HR11 interpretation despite HR11's `review_only` status. In a live Green Root Host attack at the marked-HP threshold, the old branch could replace standard damage with `3d8+8` without an active erratum. The native handler now returns no passive while the required erratum is not `supported`; the feature and erratum catalogs themselves are unchanged. This applies the repository's existing inactive-by-default authority contract.

Requalification was needed after a downstream environment-contract import exposed module initialization cycles. Provider capability references are now resolved lazily, preserving exact behavior without startup access to an uninitialized hash binding. In the frozen union `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f02-c03.test.mjs bot/tests/ai-gm-2026-10/rf03-f04-c02.test.mjs`, the C03 file's four cases passed; overall union had 7 tests, 6 pass and 1 failed F04 provider-source assertion (exit 1, TAP 713.1247 ms). The failed F04 assertion was repaired and its single case passed in a targeted run; no C03 code changed afterward. Final C03 provider SHA-256 is `f4291dd088e391d5d415206e733132c1ae9a134221b839346600a2787c5f6c9b`; native module and test hashes are unchanged. Six affected JS/MJS syntax checks passed. RF03 gate exit 0: 390 sources, 0 unowned, 2,313 imports, largest cycle 182, 2,601 raw/accepted occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `2718db78779dbf5b0690f72cb2c0ca69339cc52dd6d1603fab0745c1be6a7bf9`. The earlier single-file 4/4 result is retained as pre-cycle-repair evidence; latest actual results and all attempts are in `F02_C03_TERMINAL.json`. Provider calls 0 / $0; Codex usage UNMEASURED. Native attack receipt and publication behavior outside this passive contract are not newly qualified.

Machine-readable final details: `phases/RF03/F02_C03_TERMINAL.json`, with concise final logs `f02-c03-final.log` and `f02-c03-final-gate.log`.

## Rollback

Revert the native module, provider composition, focused fresh test, and this evidence as one checkpoint. No persisted data change.
