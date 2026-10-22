# P09-F02 — Targeted GM Private rule and feature retrieval

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — TARGETED SOURCE-BOUND CONTEXT DELTA PASSED; LIVE MODEL SEMANTICS UNQUALIFIED.

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Implement a minimal, audience-safe retrieval path for *current* adversary and environment features using existing `ContentIndex`, `EncounterLibrary`, `content/GM_PRIVATE/ADVERSARIES/adversaries.json`, `content/GM_PRIVATE/ENVIRONMENTS/environments.json` and scene bindings. Structured JSON remains authoritative for numerical rules; Markdown supplies authored GM prose and contextual guidance. Resolve contradictory texts through existing rule priority, not model improvisation.

## Required implementation and proof

- Select only bound active actor/scene/environment sources, relevant feature text, applicable rulings and necessary audience scope. Avoid whole `AI_DM_COMPENDIUM.md` injection.
- Supply exact source identity, hashes/revision, actor binding, encounter/scene, GM-only visibility and an explicit `not_execution_authority` marker.
- Reject forged actor/template identifiers, stale revisions, path traversal and wrong-guild/audience access; do not leak a GM-private rule or hidden fact in player-facing output.
- Retain provisional/GM-only invented fiction separately from canonical feature mechanics; no implicit status promotion.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f02.test.mjs` against only modified modules and new local fakes: exact bound retrieval, stale source, inactive/unbound actor, no full-compendium dump, wrong audience/guild, conflicting source and current update invalidation. No real providers or DB.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback only the new targeted retrieval integration; restore prior qualified context path and retain stored readers and private-content boundaries.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
