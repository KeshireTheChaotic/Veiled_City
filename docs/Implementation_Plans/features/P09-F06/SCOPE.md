# P09-F06 — Pilot: Pack Pressure via verified position

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Status:** COMPLETE — retained native path with proxy exclusion; targeted modifier tests passed

**Phase:** [P09](../../phases/P09/SCOPE.md)  
**Owner behavior:** [OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md)  
**Gates:** [DECISION_GATES.md](../../DECISION_GATES.md); [TEST_PROTOCOL.md](../../TEST_PROTOCOL.md); [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md)

## Deliverable and scope

Route `adversary:pale-court-thrall:pack-pressure` through the new generic candidate bridge only where doing so preserves the **existing** source-qualified passive. The currently supported modifier uses live Thralls in the target's actual zone as a conservative range proof and caps bonus at +2; do not weaken its trust boundary.

## Required implementation and proof

- Reuse `nativeAttackPassives` and current live combatant/presence/range/scene relations rather than accepting model claims of ally proximity.
- Verify no bonus when unsupported, +1 with one qualifying ally, +2 cap with two or more; exclude absent, defeated, proxied, wrong-scene, inaccessible or nonallied combatants.
- Apply only to the actual eligible Thrall attack before the native roll; no double modifier, guessed Very Close range, forged character reaction or cloned benefit.
- Preserve existing behavior if generic integration is ineligible or locally held; do not regress already supported attacks.

## Fresh changed-code-only testing

Brand-new `bot/tests/ai-gm-2026-10/p09-f06.test.mjs`: zero/one/two qualifying allies, cap, wrong-zone/dead/proxied/hidden ally, target mismatch, replay/no duplicate bonus, existing equivalent native result. Test only touched production paths.

## Boundaries, local holds, and rollback

- Never fabricate permission from a model response or a source excerpt. A mechanically unqualified effect remains held, not silently applied or narrated as committed.
- PC actions, dice, resource choices and consent remain owner-controlled. Keep GM-private data and other players' secrets audience-scoped, and preserve old receipt readers, outbox idempotency and valid native outcomes.
- Do not add creative/GM-autonomy restrictions without the `DECISION_GATES.md` owner question. Isolated holds do not freeze unrelated safe work.
- Rollback only the bridge adapter, retain existing `pack_pressure` native handler while equivalence remains unverified.
- Do not execute old tests/fixtures, run `npm test` or `npm run validate`, poll running tests, spend with providers, trigger CI, push/merge/deploy, or access production DB without separate authorization.

## Exit criteria

1. Scope's promised behavior is demonstrated in actual changed production code or recorded as a precise local hold with supporting source evidence.
2. New feature-local tests of changed code have terminal exit results recorded in this feature's ledger (documentation-only changes legitimately have no runtime tests).
3. Affected codepaths keep PC agency, authoritative source/rules, privacy, idempotency and previously qualified handler behavior.
4. Actual baseline SHA, changed files, replay limitations, cost and rollback are recorded. Passing targeted tests never implies whole-release qualification.
