# RF03-F03 corrective C13 ledger

Status: QUALIFIED / C13 only. Base commit: `03642a9`.

## Scope and authority

Extract only deterministic mapping from already saved native dice and current PC data to existing death-move outcome labels. No state transition or new move is added.

## Implementation and test evidence

`frameworks/daggerheart/pc-death-outcomes.js` now owns the exact mapping from saved Duality/Hope results to current move outcomes. `pc-death.js` still chooses dice only after the owner selects a move and retains all source, state, transaction, mutation, and receipt writes. The verifier uses the same native mapping as the write path.

Fresh batch `node --test --test-reporter=tap --test-concurrency=1 bot/tests/ai-gm-2026-10/rf03-f03-c13.test.mjs`: exit 0, 3 passed, 0 failed/skipped, TAP duration 61.2216 ms, blocking wall 239 ms; log SHA-256 `579169c0813039a9aef4a1e5207b4eba6bfd771d3c4c9bd00342ee6d1a5a0b05`. Three changed JS/MJS syntax checks passed. RF03 ratchet exit 0: 392 source modules, 0 unowned, 2,316 imports, largest cycle 182, 2,601 raw/accepted transition occurrences, 0 active groups, 0 transition errors; gate log SHA-256 `cd618396fb644a30234418a0592dc360e78ef6770d2d2dfa84460636352aee2f`. Source SHA-256: provider `ec63e0573f1aed13f3dbcbdf2bd83a8d2b12e968de1d833254c7e73576d1034b`; native module `bd4098c32c7280995aff3be3bd7d4268243ed9bd4a6653815186c4fd4a8814a5`; test `33c31a6ec702c6a348e38f7c8ee5b3140d30b42be06621c10ff82e6607350fef`. Provider calls 0 / $0; Codex usage UNMEASURED.

These cases qualify result arithmetic, not saved-roll/owner-source ancestry, mutation rollback, recovery, or restart replay. Full evidence: `phases/RF03/F03_C13_TERMINAL.json` and concise logs.

## Rollback

Revert the native outcome mapping, provider delegation, tests and evidence together. No database changes.
