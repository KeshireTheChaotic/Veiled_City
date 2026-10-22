# P10-F03 — Exact-state opening recovery and transport integrity

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 3 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Do not let a generic `needs_review` status permanently starve openings which can be *proven* safe to resume, while preserving strict exactly-once publication and no resend of uncertain Discord messages.

**Implementation.** Define state-aware transitions for `precommit_stale`, `writer_draft_only`, `established_fiction`, `committed_payload_known_unsent`, `committed_payload_unknown`, `delivering/uncertain`, `delivered` and `blocked_revocation`. Read actual outbox and native `turn`/`assembly_delivery`/attempt ancestry before choosing a recovery. A committed unsent message must be sent verbatim with no model; an uncertain message cannot be blindly resent; a delivered slot stays acknowledged. Provide authenticated, version-checked recovery review for GM with meaningful per-slot choices. No duplicate `prepareAssemblyOutput()` after a committed turn; preserve legacy receipt readers and partial multi-owner acknowledgments. Cross-process recovery must use transaction boundaries and unique exact identities.

**Source seams.** `session-opening-recovery.js`, `assembly-publications.js`, `assembly-state.js`, outbox/publishing and `commands.js` assemble; any durable migration must be additive with older records readable. A recovery transition must not infer that a stored draft equals committed fiction or that absence of `discord_message_id` proves no send.

**Tests.** New `p10-f03.test.mjs`: exact committed-unsent after restart replays prepared payload 1×/0 model calls; uncertain send held 0×; acknowledged private message persists when other owner fails; stale recipient/current source blocks; manual review unauthorized user blocked; legacy persisted evidence still readable. Use actual production receipt/outbox seams with mock Discord.

**Gate.** Table-driven proof of every disposition, absence of unbounded retries, durable cross-process claim, and no reauthoring/resend of any uncertain/delivered part.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f03.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
