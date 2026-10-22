# P10-F08 — Frozen acceptance, rollback and release boundaries

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 9 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Complete only the changed P10 implementation delta, with actual repeatable evidence, precise independent rollback paths and explicit unverified live limits.

**Verification.** Freeze production and new feature tests. Run ONE blocking union of only newly authored `bot/tests/ai-gm-2026-10/p10-fNN.test.mjs` files targeting actually changed P10 production code; do not execute legacy scripts/fixtures/goldens, npm test, npm run validate, CI or broad suites. Use `node --check` only on changed JS/MJS and required JSON parse checks. Follow `TEST_EXECUTION_NO_POLL.md`: never watch, poll or repeat status checks. A test not yet returned a final exit is `RUNNING / UNQUALIFIED`. On failure batch repairs and one justified targeted rerun rather than unbounded cycles.

**Evidence matrix.** Fill `P10_ACCEPTANCE_MATRIX.md` with A01–A20 as `PASS / FAIL / HELD / NOT RUN`, source/test hashes, actual tests and failure/hold reasons. Require rigorous proof for privacy/agency, source-bound receipts, exact Discord outbox, post-start cohort, no-location camera, and cross-process locks. Make explicit whether tests use one SQLite connection or independent connections/processes; do not call single-process mocks cross-process qualification. Document cost/calls/stage latency or `UNMEASURED`, and narrated-scene semantic review as unverified without approval.

**Rollback.** List files and migration compatibility per P10-F02–F07. Prefer additive data fields and feature-flagged changes with existing saved readers intact; never rollback by deleting delivered fiction, a committed native effect or uncertain send. Identify which newly introduced uncommitted revisions can be safely disabled without losing old acknowledgments. Do not auto-retire P08/P09 readers.

**Gate.** Each feature ledger and phase ledger has exact execution HEAD, statuses, terminal commands and counts, SHA256 hashes, modified paths, provider spend/latency evidence, remaining holds, owners' decisions, rollback and release status. **RELEASE NOT AUTHORIZED** until separately approved after further live qualification.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f08.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
