# RF03-F02 corrective C03 ledger

Status: QUALIFIED / C03 only. Base commit: `ea1569a`.

## Scope and authority

Move existing native damage-passive policy and arithmetic only. Current source catalog, feature statuses, house erratum state, and all surrounding attack/transaction checks remain authoritative and unchanged.

## Implementation and test evidence

`frameworks/daggerheart/standard-damage-passives.js` now owns the existing fixed damage arithmetic and standard-damage passive policy. `native-feature-passives.js` still supplies current compiled feature source, hash, HR11 record reader, and the existing failure constructor; unrelated attack-presence logic stays in place.

Review while extracting exposed an existing supported combat trigger that read HR11 interpretation despite HR11's `review_only` status. In a live Green Root Host attack at the marked-HP threshold, the old branch could replace standard damage with `3d8+8` without an active erratum. The native handler now returns no passive while the required erratum is not `supported`; the feature and erratum catalogs themselves are unchanged. This applies the repository's existing inactive-by-default authority contract.

Final frozen fresh test: `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f02-c03.test.mjs`; terminal exit 0, 4 passed, 0 failed, 0 skipped, TAP duration 366.8908 ms, blocking wall time 542 ms; log SHA-256 `4a30c99f531527b763370944fdc464c38979fa35cabcbc26873d010482fd8581`. A prior frozen 3-case batch passed before the HR11 guard was added; it is retained as pre-fix evidence in `f02-c03.log`, and the changed implementation was requalified by the final batch. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 387 source modules, 0 unowned, 2,309 imports, largest cycle 182, 2,601 raw/accepted legacy occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `62b8341286817509e911f00befa101c153bc9d34d6d4666132b2d1d02eeeaa0d`. Source SHA-256: provider `760a149328c83ff8e322e9df00ea800b81bcaf738688b018cde759148bc890eb`; native module `00ae964aa24ae4bd1af3209c1998ff7a35dcabb9d7f9c287a14c7e595b2fb0d4`; test `2eb202aaf7996e8c98a09d48ae0bcc22e47fc2d496bbcae5e084e8f3a1cf1d09`. Provider calls 0 / $0; Codex usage UNMEASURED. Native attack receipt and publication behavior outside this passive contract are not newly qualified.

Machine-readable final details: `phases/RF03/F02_C03_TERMINAL.json`, with concise final logs `f02-c03-final.log` and `f02-c03-final-gate.log`.

## Rollback

Revert the native module, provider composition, focused fresh test, and this evidence as one checkpoint. No persisted data change.
