# P09-F07 — Pilot: Feedback reaction and equipment consequence

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — existing owner-choice Feedback adapter retained; static audit only

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Migrate or bridge `adversary:static-wraith:feedback` without weakening its existing **owner-controlled** reaction/effect path. It triggers on qualifying visible owned electronic-device use, invokes an owner Instinct Reaction Roll (Difficulty 12) and conditionally applies Stress/device shutdown through native receipts.

## Required implementation and proof

- Keep exact current live actor/device, visibility, equipped ownership and trigger proof, NPC Stress/cost verification and capacity checks.
- Only the authenticated PC owner makes the reaction roll and any elective choices. The model must not invent dice, auto-fail, pay a cost, reset equipment, bypass Stress-overflow resolution, or infer hidden-device use.
- Apply one Stress and device disabled state on proven failure only, no negative effect on proven success; use existing native receipts and exactly-once mutation.
- Keep `Feedback`'s specialized adapter until the generic bridge proves behavior equivalence including historical pending invitation and saved replay.
- Do not broaden this feature into arbitrary device interference.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f07.test.mjs`: visible/hidden device, owner mismatch, success/failure, missing reaction, capacity boundary, owner withdrawal, duplicate event, stale device, source drift, pending/saved receipt replay and private publication. Only modified paths/new fakes.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- On failure, restore old path intact; do not rewrite or drop existing owner reaction or device-effect receipts.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
