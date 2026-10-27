# RF05-F04 C31 ledger

**Status:** LOCALLY QUALIFIED WITH SPLIT REPAIR EVIDENCE; RF05-F04 INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C31-SCOPE.md`](C31-SCOPE.md)

## Implementation

Moved `historyContext` into World public. The `city-civic.js` compatibility export preserves the same function identity, and GM now imports the public contract. Query terms, record limits, de-duplication, summary authority label, event projection, and aggregate text budget are unchanged. The exact GM-to-city-civic transition was retired after the checker reported it unused; original data is preserved in `C31-RETIRED.json`.

## Verification

The first frozen batch ran C31 plus P10-F08: **11/12 passed**, exit **1**; all **9/9 P10-F08** cases passed. The single C31 failure was an over-strict test expectation: one summary correctly fit under the aggregate budget. Only that failed case was rerun after the test-only correction: **1/1 passed**, exit **0**, 463.2178 ms. Effective C31 evidence is 3/3 cases across the original run and targeted repair, not one fully green C31 launch. Changed JavaScript syntax passed **4/4**. Initial RF05 ratchet reported 951 transition errors due the now-unused exact GM edge; after preserving and retiring it, the final ratchet remains failed on aggregate debt at 950 groups/errors, 599 modules, 0 unowned, 2,793 imports, largest cycle 181.

See `C31-RUN.json` and the named terminal logs. Provider calls/tokens/spend: **0 / 0 / $0**; Codex usage **UNMEASURED**. No external services.

## Rollback and limits

Restore the helper implementation in `city-civic.js`, restore the GM import, remove World module/public/test/evidence, and restore the exact transition from `C31-RETIRED.json`. No persisted data changed. RF05-F04 has **45** assignments left. Release is **NOT AUTHORIZED**.
