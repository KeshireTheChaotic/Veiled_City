# P10-F02 — Durable precommit revision fencing and bounded regeneration

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 3 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Make ordinary attendance and eligible input changes during the planner/writer await recoverable before effects, authored fiction, turn commitment or Discord sends exist. Preserve immutable authenticated session-start receipt and historical attempt receipts.

**Implementation.** Separate immutable `origin` authorization from a changeable assembly input *snapshot epoch*. Claim work atomically with a durable `(guild, session, epoch, snapshot_hash, lease/fence_token)` identity. Accept current input revisions only when no committed source-bound outputs exist. Coalesce changes encountered while the initial planner runs; when outdated result returns, persist redacted stale-epoch evidence and supersede **only proven uncommitted work**, then generate at most one new coalesced revision automatically. If churn continues, leave a targeted pending/review state; no unbounded loop. Check the fence transactionally at every post-`await` and before native write/author/publish. Preserve manual authorized `attempt:2` semantics instead of silently reusing it as an auto retry.

**Source seams.** `assemblyInputFingerprint`, `certifyAssemblyPlan`, `assertSessionOpeningAttempt`, `beginSessionOpeningAttempt`, `runSessionOpening`, plan persistence, approval/provenance record types. Update dependent saved readers additively and avoid altering old job data in place. If current architecture cannot prove no draft/world/turn commitment, hold rather than retry and record exact evidence that is missing.

**Tests.** Brand-new `p10-f02.test.mjs`: deterministic 0→1 and 0→1→2 check-in across unresolved planner, stale response discarded, legitimate replacement accepted, original receipt intact, no dupe model call for unchanged epoch, bounded calls for churn, concurrent process/connection fence claim, Director pause and changed owner principal before write. Assert real source functions and persisted rows, not only mocks.

**Gate.** No routine attendance-caused terminal `needs_review` before commitment; no false attempt-2 receipts; no execution after losing fence; old committed/uncertain data unchanged. Record model-call count and concurrent-worker limits honestly.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f02.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
