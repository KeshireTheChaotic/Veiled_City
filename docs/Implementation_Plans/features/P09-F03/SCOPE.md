# P09-F03 — Narrative freedom without implied mechanical authority

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — existing narrative/native boundaries statically audited; live model behavior remains unverified

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Separate **GM fictional interpretation and description** from executable feature selection. A review-only or cue-only feature may inform plausible NPC behavior, dialogue, environmental atmosphere, or an uncommitted threat without becoming an attack, PC condition, NPC teleportation, rule modifier, paid Fear action or secret disclosure.

## Required implementation and proof

- Allow contextual, organic NPC and environment descriptions based on GM-private source facts even when no feature-specific executor exists.
- Keep unresolved attempts as attempts; narrate realized effects only after corresponding authoritative receipts. Never narrate an attempted PC outcome as settled.
- Failed mechanical qualification holds only that effect and any dependent claim; independent legal fiction and decisions still proceed.
- Do not invent a broad creative blacklist, special prose-length cap, mandatory scripted narration or owner approval of ordinary GM fiction. Any novel creative restriction goes through `DECISION_GATES.md`.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f03.test.mjs` for changed narrative/arbitration contracts: GM cue works with no executor; no committed effect = no claimed PC injury/device failure; unsupported mechanic held locally while other fiction continues; no PC speech/movement or GM-secret disclosure. Use mock provider/Discord and wholly new fixtures.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback affected authoring/qualification bridge only. Preserve prior protections and do not bypass `narrative-integrity` or native publication gates.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
