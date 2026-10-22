# P09-F04 — Typed generic mechanics proposal boundary

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — existing typed, closed native arbitration bridge statically audited

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Extend existing unified arbitration/native mechanical services with the **smallest typed operation bridge** needed for pilot features. The model may propose a source-backed candidate but cannot grant itself authority, determine dice, debit resources, impersonate a player or mint effect receipts. Preserve specialized adapters for edge cases until replaced by proven equivalent contracts.

## Required implementation and proof

- Audit and reuse existing actions/rolls, modifiers, damage, conditions, costs, clock and state receipt APIs; do not build a second Daggerheart engine.
- Candidate must bind validated actor/target/scene, exact source revision and rule refs, operation class, timing/trigger, preconditions, proposed costs, and desired effect. Server validates all terms against persisted authority, scene and capability, never trusting model-supplied flags or numeric payloads.
- A source excerpt or feature status *alone* is not authorization. Limit operations to known native primitives with validation appropriate to their effect; avoid arbitrary model-written database mutation or a universal dynamic DSL.
- Support safe atomic commit/idempotent replay and source-drift rejection; distinguish `fiction_ready`, `mechanic_accepted`, `await_owner`, `needs_rules_review`, and `blocked` without representing fictional readiness as applied effect.
- Preserve legacy receipt formats and their historical readers during migration. Avoid dual-writing duplicate payments/outcomes.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f04.test.mjs`: valid native reusable op; forged source/target/rule/modifier/cost rejected; stale actor/scene, wrong owner and hidden audience rejected; unqualified effect held; duplicate/replayed operation exactly once; dependency failure does not suppress independent legal fiction. Fresh disposable SQLite/injected clock and RNG only if changed modules require it.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback bridge/consumer additions together; keep historical readers and previously qualified specialized adapters. Do not disable native feature gates simply to make tests pass.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
