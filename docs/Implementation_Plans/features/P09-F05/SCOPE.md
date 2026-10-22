# P09-F05 — Pilot: Professional Entry via ordinary advantage

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** LOCAL HOLD — per-encounter reset authorized; prepared-position predicate awaits owner clarification

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Complete the **currently cue-only** `adversary:aster-vale-contractor:professional-entry` path: "advantage on the first roll made to breach, restrain, or surprise a prepared position." Use the current verified Aster Vale Contractor and existing NPC roll/advantage rules; avoid a new bespoke advantage engine. Phase 6 exposes this cue but does *not* qualify the real modifier or first-use tracker.

## Required implementation and proof

- Require an actual current, qualified prepared position and applicable first qualifying roll. Source/scene/context evidence must substantiate eligibility; do not label every target "prepared" automatically.
- Establish per-source-instance one-use tracking and explicit expiry/reset boundaries only where supported by source and native event lifecycle. If first-use semantics remain ambiguous, hold only the numerical advantage, ask owner if an actual new rules interpretation is needed, and continue fiction.
- Native roll service—not model output—applies advantage once. No retroactive grant, forged roll or double consumption on replay.
- Preserve cue-only behavior while native eligibility is absent.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f05.test.mjs`: qualifying vs nonqualifying prepared position, first vs later roll, alternate tasks, unbound actor, stale scene, duplicate submission/replay, sourced advantage exactly once, ambiguous precondition held. No copy/import of P06 tests.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback new eligibility/advantage integration but preserve P06-F40 source cue and historical receipts. Do not mark effect-qualified until real roll modifier is exercised.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
