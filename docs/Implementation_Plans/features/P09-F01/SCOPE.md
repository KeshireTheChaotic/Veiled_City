# P09-F01 — Current-HEAD audit and responsibility map

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — documentation-only current-HEAD source and responsibility audit.

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Inventory native-feature registration, GM Private retrieval, GM arbitration, existing native validators, execution receipts and publication paths **at the actual checkout HEAD**. Distinguish (a) fiction-only cues, (b) already executable mechanics, (c) review-only mechanics, and (d) legacy readers. Compare descriptions to `GM_PRIVATE` structured sources and Phase 6 occurrence ledgers. Produce a dependency graph and migration matrix for the three pilot abilities. Use the 153 / 61 / 92 catalog counts as a verified *reference-SHA* starting point, not as permanent invariants.

## Required implementation and proof

- Produce a source-linked matrix with owner, source, live-context prerequisites, allowed fictional use, validator, mutation, replay and audience per feature family.
- Explicitly identify the P06-F40 Professional Entry cue's held qualifying-event/first-use/Advantage integration, the existing Pack Pressure attack modifier, and the existing Feedback reaction/effect path.
- Identify reusable native services and exact source/adapter gaps before proposing new abstractions; read only relevant historical code as archaeology.
- Provide small independently reversible implementation slices with failure isolation and rollback. No production code modifications for this feature.

## Fresh changed-code-only testing

- Planning-only deliverable; no fresh runtime tests unless this feature actually changes production code. Static claims must cite exact inspected file/line or symbol and verified HEAD.
- Do not promote unsupported capabilities, change the catalog, or infer all supported descriptors execute effects.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Deliver a truthful audit/migration matrix in `docs/Implementation_Plans/features/P09-F01/LEDGER.md` (or an adjacent evidence document) and update the phase ledger. If source discrepancies exist, hold that exact occurrence and continue. Rollback is documentation-only.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
