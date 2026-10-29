# C180 verification ledger

| Check | Command / scope | Result |
|---|---|---|
| Initial combined fresh batch | `node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf04-f03-c80.test.mjs tests/ai-gm-2026-10/rf04-f03-c81.test.mjs` from `bot/` | Exit 1. C180 failed one static string assertion; C181 passed. |
| Corrected C180 case | `node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='Knowledge evidence custody preserves privacy, source-bound status receipts, and Intent forwarding' tests/ai-gm-2026-10/rf04-f03-c80.test.mjs` from `bot/` | Exit 0; 1 passed, 0 failed. |
| Scoped syntax | `node --check` on the 21 changed JavaScript/test files; additionally each embedded child script was extracted and checked with `node --check --input-type=module` | 21/21 files passed; 2/2 embedded scripts passed. |
| RF04 ratchet | `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF04` from `bot/` | Exit 0; active groups 0; transition errors 0. |
| RF05 ratchet | `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF05` from `bot/` | Exit 1; 53 active groups and 53 transition errors. |

## Attribution

The C180 test's initial hash was `78E5E6C5BD16DEEBC945D8A2AF067711EA36C19EE7570160FA10CA03CCE3B68C`; its corrected, passing hash is `F1E025A11CE61A36B872DAF85641611789803AA155FB1F8088E3A41DE555E594`. The initial assertion expected a direct property-call spelling, while the frozen Intent caller uses a destructured binding. Only that assertion changed. The C181 test passed in the initial combined batch with hash `BCF9A54C493977424C52E6111602731204532479DA07BFD4E22AC59A5721F845`; it was not rerun.

Frozen C180/C181 source and registry hashes are listed in `C180-RUN.md` and `C181-SCOPE.md`. No source or transition metadata changed during verification. The setup copied 45 missing registered test-reference artifacts and preserved 42 pre-existing target artifacts; all are metadata/archive availability only and none were executed. The original LivePlay checkout was not modified. Exact run timestamps and persistent terminal log paths were not recorded.
