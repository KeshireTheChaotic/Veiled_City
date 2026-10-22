# P09-F08 — Freeze, evidence, and bounded retirement decision

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — evidence consolidated; no retirements recommended; release remains unqualified

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Gather truthful feature-by-feature evidence for changed P09 contracts, compare to reference baselines and Phase 6 documented behavior, and identify—not automatically delete—redundant per-feature infrastructure. Do not claim global feature support, narrative improvement, latency gains or release readiness without corresponding evidence.

## Required implementation and proof

- Freeze changed contracts and run only the union of **fresh P09 tests** touching production code actually modified in this phase. Record actual tested HEAD/worktree fingerprint, input hashes, commands, exit, pass/fail/skip, unverified cases, and local holds.
- Compare mocked provider-call count, context/token proxy measurements (clearly labeled), arbitration and user-visible timing with actual baseline when available. No provider spend; if baseline unavailable, record `UNMEASURED`, not a savings claim.
- Identify per-feature registrations, exact contexts and wrappers that could be retired after confirmed callsite/receipt dependency inspection. Keep source hashes, historical readers, special effect adapters and P06 occurrence ledgers intact. Propose deletions as a **separate approved migration**, unless already independently proven safe and within the feature's authorized scope.
- Update phase/feature ledgers and README Phase 9 link. Do not change old P00–P06 historical outcomes, claim P07/P08 completion, trigger CI, push, merge or deploy.

## Fresh changed-code-only testing

Fresh `bot/tests/ai-gm-2026-10/p09-f08.test.mjs` only if P09-F08 modifies production code. Otherwise compile existing P09 fresh-test terminal evidence **without executing legacy tests**. No full suite/CI. Whole-system live Discord, provider behavior, production DB and release remain UNQUALIFIED.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Final rollback matrix per feature and optional retirement candidates. No legacy reader/receipt deletions under this plan unless separately authorized and proven compatible.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
