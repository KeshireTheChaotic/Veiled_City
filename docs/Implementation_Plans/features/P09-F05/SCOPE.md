# P09-F05 — Pilot: Professional Entry via ordinary advantage

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** IMPLEMENTED — GM-established scene evidence and per-encounter use; executor end-to-end remains unverified

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Complete the **currently cue-only** `adversary:aster-vale-contractor:professional-entry` path: "advantage on the first roll made to breach, restrain, or surprise a prepared position." Use the current verified Aster Vale Contractor and existing NPC roll/advantage rules; avoid a new bespoke advantage engine. Phase 6 exposes this cue but does *not* qualify the real modifier or first-use tracker.

## Required implementation and proof

- A prepared position is an established tactical condition, not merely an alert or hostile enemy. Explicit native encounter preparation evidence takes precedence when present; otherwise a GM-established scene fact captured in authoritative GM-only state may qualify. Evidence must predate modifier determination. With no evidence, hold only this passive modifier and continue the independent action normally.
- Qualifying action is breach, restraint, or surprise against the established position. The first qualifying roll per encounter is the only use; later rolls in that encounter receive no passive Advantage.
- Native roll services revalidate source, scene, target and encounter use, then apply Advantage and write an immutable use receipt in the same transaction as the roll. Replays cannot consume again. Historical roll readers remain valid if scene evidence is later retracted.
- Preserve cue-only behavior while native eligibility is absent.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f05.test.mjs`: closed proposal schemas, evidence/action/target checks, native-record precedence, stale scene, first vs later native d20, duplicate use and historical receipt after retraction. No copy/import of P06 tests.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback new eligibility/advantage integration but preserve P06-F40 source cue and historical receipts. Delta tests exercise the source/use contract and native d20, but do not execute a full database-backed Discord attack workflow.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
