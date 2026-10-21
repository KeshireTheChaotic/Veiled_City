# adversary:pale-court-thrall:break-the-hold — ledger

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS.

- Branch/implementation SHA: `codex/clean-ai-gm-2026-10` / `eb49d962659e70a29c1a2481a1a67fb37f78b2c7`.
- Changed modules: native feature definitions/catalog, new source rule projector, native adversary provenance context, coverage map, and fresh F39/catalog tests.
- `p06-f39-20261021-a`: 37 mapped fresh files, 136 tests, 135 passed and one stale isolation count failed; exit 1. Only the repaired fresh F01 catalog test reran as `p06-f39-20261021-repair`, passing 3/3, exit 0. Unique affected cases: 136/136 pass.
- Changed JS/MJS syntax: 6/6 pass; changed JSON parse: 2/2 pass. Hashes and exact results: [P06-F39 evidence](../../../../evidence/P06_F39_TARGETED.json).
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache savings claimed; Codex usage unavailable.
- Local hold: proof qualification/visibility, the PC's optional Presence Roll, and successful conflict-removal state/receipt replay are not implemented by this cue. No roll or PC action is inferred.
- Questions/restrictions: none proposed. Critical blocker: none. Release authorization: false.
