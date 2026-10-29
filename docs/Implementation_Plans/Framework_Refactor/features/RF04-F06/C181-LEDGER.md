# C181 verification ledger

| Check | Command / scope | Result |
|---|---|---|
| Initial combined fresh batch | `node --import ./scripts/offline-guard.mjs --test --test-concurrency=1 --test-reporter=tap tests/ai-gm-2026-10/rf04-f03-c80.test.mjs tests/ai-gm-2026-10/rf04-f03-c81.test.mjs` from `bot/` | C181 passed; overall batch exited 1 due to the C180 static assertion. |
| Corrected C180 case | Targeted C80 command recorded in `C180-LEDGER.md` | C180 passed 1/1. C181 was not rerun. |
| Scoped syntax | `node --check` on the 21 changed JavaScript/test files; additionally each embedded child script was checked as an ES module | 21/21 files passed; 2/2 embedded scripts passed. |
| RF04 ratchet | `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF04` from `bot/` | Exit 0; active groups 0; transition errors 0. |
| RF05 ratchet | `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF05` from `bot/` | Exit 1; 53 active groups and 53 transition errors. |

## Attribution

The qualifying C181 test hash is `BCF9A54C493977424C52E6111602731204532479DA07BFD4E22AC59A5721F845`. The test passed in the combined batch and was not rerun. The corrected C180 test hash is `F1E025A11CE61A36B872DAF85641611789803AA155FB1F8088E3A41DE555E594`; its initial hash is preserved in the run records as non-qualifying after the assertion mismatch.

The exact tested source and registry hashes are listed in `C181-RUN.md` and `C181-SCOPE.md`. No source or transition metadata changed during verification. The setup copied 45 missing registered test-reference artifacts and preserved 42 pre-existing target artifacts; they are metadata/archive availability only and were not executed. The original LivePlay checkout was not modified. Persistent terminal logs and exact run timestamps are unavailable.
