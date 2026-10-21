# P06-F39 — ledger

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `479a7b432ceff6a753ef1dd32db34e61013929ac`.
- Occurrence: [`adversary:pale-court-thrall:break-the-hold`](../P06-F01/occurrences/adversary--pale-court-thrall--break-the-hold/SCOPE.md).
- Source and hashes: current source and exact template hashes are recorded in [scope](SCOPE.md).
- Changed modules: feature definitions/catalog, new GM-context rule projector, `native-adversary-context.js`, coverage map and fresh F39/catalog tests.
- Implementation commit/tested source SHA: `eb49d962659e70a29c1a2481a1a67fb37f78b2c7`.
- Frozen batch `p06-f39-20261021-a`: 37 fresh files, 136 tests, 135 pass / 1 stale isolation-count failure; exit 1. Repair changed only the F01 fresh catalog test expectation. `p06-f39-20261021-repair`: 3/3 pass, exit 0. Unique affected cases: 136/136 pass.
- Changed JS/MJS syntax: 6/6 pass; changed JSON parse: 2/2 pass. Input hashes and command/results: [targeted evidence](../../evidence/P06_F39_TARGETED.json).
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache use or savings claimed; Codex usage unavailable.
- Owner question/restriction: none proposed.
- Local holds: proof qualification/visibility, player-owned Presence Roll, and successful conflict-removal state/receipt replay. Persistent DB/Discord integration and whole-release qualification remain unverified.
- Critical blocker: none identified. Release authorization: false.
