# adversary:static-wraith:ride-the-current — ledger

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS.

- Branch/implementation SHA: `codex/clean-ai-gm-2026-10` / `97f9f802f8e2aa4cd9b43dbccad3de326143893b`.
- Changed modules: native feature definition/catalog, Ride the Current cue projector, current adversary context, fresh F43 test and coverage mapping.
- Fresh tests: `p06-f43-20261021-a` covered 152 cases across 41 fresh files (151 pass, 1 stale F01 count assertion); only the changed F01 test reran and passed 3/3. Final unique mapped result: 152/152, exit 0.
- Changed JS/MJS syntax 5/5 and changed JSON parse 2/2 passed. Evidence and hashes: [P06-F43 targeted evidence](../../../../evidence/P06_F43_TARGETED.json).
- Handler: `adversary_ride_the_current_context`. Current verified GM-private adversary context presents the exact source cue with `execution_authorized=false`.
- Local holds: powered-device qualification, Close range proof, destination, movement mutation and replay-safe movement state.
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Owner questions/restrictions: none. Critical blocker: none. Release authorization: false.
