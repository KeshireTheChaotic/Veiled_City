# P10-F01 — Source audit, incident reproduction and commitment-state taxonomy

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** SOURCE AUDIT COMPLETE / INCIDENT CAUSE UNPROVEN; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Determine the actual root-cause paths behind the October 22 `SESSION_OPENING` status before rewriting recovery. Build a deterministic, offline reproduction **design** for starting with zero attendees, checking in while the model planner is suspended at an explicit promise barrier, completing planner output and observing runner state. Specify a second case for post-start one-to-two owners and a third for an injected authoring error. Implement and run these as new targeted tests in F02/F05 only against production paths actually modified in P10. Distinguish hypothetical drift from observed test failure. Do not assert what production logs proved.

**Read and inspect.** `commands.js` session start/present/assemble; `session-opening.js`, `session-opening-runner.js`, `session-opening-recovery.js`, `session-opening-attendance.js`, `assembly-context.js`, `assembly-state.js`, `assembly-planning.js`, `assembly-publications.js`, `opening-entry*.js`, `opening-cohort-*.js`, `scene-setup.js`, outbox and stage metrics. Confirm actual HEAD symbols and serialized records. Read the P08 corrective ledger regarding unsent/ack camera and cohort holds.

**Design artifact.** Document exact before/after state transitions, immutable original start receipt, input fingerprint operands, model-await boundaries, durable attempt identity, writer draft/entity commitment, outbox turn/part IDs and Discord acknowledgment. Produce `current error → observed source violation → commitment tier → recovery authorization` decision table. Identify where `error.code='SESSION_OPENING'` hides the native validation reason without exposing secrets. Refine `P10_FAILURE_MATRIX.md` with verified facts and distinguish `REPRODUCED`, `PLAUSIBLE`, `UNKNOWN`.

**Runtime changes.** None in F01 unless a *pure redacted diagnostic* is necessary for a fresh test of current behavior. If modifying production, author `p10-f01.test.mjs` targeting that changed path. No inherited test execution.

**Gate.** F01 complete when the source trace, deterministic reproduction design and state/receipt matrix identify the evidence needed to prove a safe unsent branch. The reproduction runs only in the later feature that actually modifies the production seam; if not reproducible, record `UNREPRODUCED`, not `PASS`. Do not reclassify a send as unsent from missing logs.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f01.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
