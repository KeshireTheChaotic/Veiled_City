# P06-F43 — ledger

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `4f4b504908f0c50c63094f8e52f9f81e0189119f`.
- Occurrence: [`adversary:static-wraith:ride-the-current`](../P06-F01/occurrences/adversary--static-wraith--ride-the-current/SCOPE.md).
- Source/template hashes: in [scope](SCOPE.md).
- Implementation commit: `97f9f802f8e2aa4cd9b43dbccad3de326143893b`.
- Changed modules: native feature definition/catalog, exact Ride the Current cue projector, current adversary context, coverage, fresh F43 test and F01 catalog counts.
- Tests: frozen run `p06-f43-20261021-a`, 152 cases across 41 fresh files (151 pass, 1 stale F01 count failure); changed F01 test rerun 3/3. Unique cases 152/152; exit 0 after targeted repair.
- Changed JS/MJS syntax 5/5 and changed JSON parse 2/2 passed; evidence: [P06-F43](../../evidence/P06_F43_TARGETED.json).
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Owner question/restriction: none proposed.
- Local holds: powered-device and Close range proof, movement/destination state, and replay.
- Critical blocker: none. Release authorization: false.
