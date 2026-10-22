# P10-F06 — Initial position explanation without forced placement

**Phase:** [P10](../../phases/P10/SCOPE.md)  
**Repository/branch:** `KeshireTheChaotic/Veiled_City` / `codex/clean-ai-gm-2026-10`  
**Planning reference:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` — verify actual execution HEAD  
**Status:** OFFLINE DELTA PASS / 2 FEATURE CASES; execution evidence is in this feature's LEDGER.md. Original requirements below remain the work order.
**Executor:** Codex Luna, Medium; one worker, default zero subagents

**Mandatory governance:** Read full [owner behavior](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), P10 [phase scope](../../phases/P10/SCOPE.md), [failure matrix](../../phases/P10/P10_FAILURE_MATRIX.md), [acceptance matrix](../../phases/P10/P10_ACCEPTANCE_MATRIX.md), [decision gates](../../DECISION_GATES.md), [test protocol](../../TEST_PROTOCOL.md) and [no-poll policy](../../TEST_EXECUTION_NO_POLL.md). Protect PC agency, secrets, canon, mechanical/native state and Discord exactly-once receipts. Do not add narrative restrictions without owner decision.

**Objective.** Distinguish an actually unresolved saved location from missing scene-setup prerequisites so players do not receive unhelpful `needs native setup/history review` without operator diagnostics; allow independent camera openings when PCs are unplaced.

**Implementation.** Make `prepareSceneSetup()` optionally return an internal typed diagnostic (`not_in_assembly_phase`, `position_already_set`, `placement_history_requires_review`, `encounter_active`, `scene_continuity_disabled`, `no_eligible_safe_locations`, `owner_invalid`, `setup_offer_available`), preserving its existing public call compatibility or evolving it additively. Avoid exposing private history, hidden location keys or other PC data to unauthorized users. Owner prompt distinguishes what the player may confirm, what must remain GM-reviewed, and a permitted decline without changing the PC position. No automatic fake arrival, travel, offscreen move, shared scene presence or location fabrication. If history is uncertain, preserve it; only a deliberate new owner-authored declaration with native adjudication can change movement. Keep independent third-person world-camera narration possible with `location=null`.

**Source seams.** `scene-setup.js`, `scene-continuity.js`, `commands.js`, native scene context and opening writer. Do not expand initial location offers to hazardous, restricted, hidden, movement-cost or context-ineligible places; do not silently enable disabled continuity flags.

**Tests.** New `p10-f06.test.mjs`: empty locations; feature disabled; history exists; eligible owner choices shared/private/decline; invalid other-owner confirmation; genuinely placed PC; zero-attendee/unplaced third-person camera; no PC effects or location mutations on mere check-in.

**Gate.** Owner gets truthful least-privilege guidance and no player is positioned by the GM. Missing setup options never silence a valid world camera.

**Protocol:** New fresh test `bot/tests/ai-gm-2026-10/p10-f06.test.mjs` ONLY if production changed; brand-new feature fixtures; original production imports; offline/mock/no provider/prod database. One frozen blocking batch with no polling. Record actual run ID, source/test hashes, command, terminal result and rollback in this feature's ledger. No push, merge, deployment, CI trigger, live access or release by this scope.
