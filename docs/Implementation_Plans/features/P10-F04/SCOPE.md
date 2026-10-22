# P10-F04 — Shared camera and additive cohort liveness

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 3 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** An original opening that cannot produce a verified public camera must not permanently block all later shared-world narration. Preserve independent character locations and private facts, and avoid duplicate public scenes when a real shared camera was already delivered.

**Implementation.** Audit `initialCameraAcknowledged()` and the `['completed','needs_narrative_review']` gate. Distinguish `verified shared camera acknowledged`, `only administrative/fallback orientation delivered`, `no public publication`, `uncertain public send`, and `source invalid`. Allow a new, independent, authenticated shared-camera job for later cohorts after **proven absence of a valid initial shared camera**, not by pretending the old job succeeded. This must be bounded, source-scoped, audience-validated and assigned its own outbox and receipt keys. If the original public send is uncertain, do not mint a competing scene; hold or publish a clearly distinct *new* nonduplicate opportunity only if such separation can be natively proven and is safe. Do not force 2+ player co-location, cooperation, movement, arrival or membership. For 0 attendees permit world-camera fiction; after 1 or 2 owners permit a relevant public incident independently of private hooks.

**Source seams.** `opening-cohort-runner.js`, `opening-cohort-state.js`, `assembly-state.js`, `pvp-output.js`, `assembly-context.js`, `commands.js`. Preserve the P08 revision-bound unsent cohort work and scoped world-Director beats; do not copy GM planner goals into public writer packets.

**Tests.** New `p10-f04.test.mjs`: 0-attendee successful camera; 0-attendee orientation only then two late check-ins; failed initial precommit no-camera then two owners; separate locations; original camera actually acknowledged (no duplicate); original send uncertain (hold); restart/concurrent cohorts; owner and GM secret canaries excluded from party output. Verify no inferred PC presence.

**Gate.** A new playable shared-camera scene is reachable after an objectively absent original, not dependent on an impossible `completed` state; all public/owner audience firewalls and legacy proofs remain intact.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f04.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
