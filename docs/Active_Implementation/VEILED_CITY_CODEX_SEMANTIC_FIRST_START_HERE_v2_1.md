# Veiled City — Semantic-first, low-usage Codex startup card

**Version:** 2.1 | **Run from:** `D:\Library\Development\Veiled_City`

## Required files

- `VEILED_CITY_COST_OPTIMIZED_IMPLEMENTATION_PLAN_v2_1_SEMANTIC_FIRST.md` (**authoritative execution order**)
- `VEILED_CITY_WORLD_DIRECTOR_BIDIRECTIONAL_DESIGN_v1_2.md` (technical World Director requirements)

Previous v2.0/v1.3 startup prompts are superseded **for sequencing**. Finish semantic work **before** beginning any other feature implementation. No requested workstream, including semantic quality, is a planned deferral.

## Paste into Codex

```text
Coordinate and implement Veiled City's full v2.1 semantic-first plan.
Read VEILED_CITY_COST_OPTIMIZED_IMPLEMENTATION_PLAN_v2_1_SEMANTIC_FIRST.md
and VEILED_CITY_WORLD_DIRECTOR_BIDIRECTIONAL_DESIGN_v1_2.md.

MANDATORY FIRST: W0 inspect the exact current branch, preserve user edits,
baseline the existing tests and enumerate semantic residuals. Then execute
W1 SEMANTIC IMPROVEMENTS FIRST, addressing N05/N06, NC20-NC22, N13/N14/N15
and current failing semantic/intent/source/audience/task-completeness cases.
Reuse qualified S0-S6, R0-R6 and D0-D3; do not rebuild or remerge the
already integrated semantic branch. Implement fixes, run focused deterministic
red/green tests, merge semantic changes and pass the same-SHA S-GATE.
Do not implement World Director, OpeningDirector, UA expansion, mechanics
catalog or PvP/Fear until S-GATE is green and recorded.

Minimize Codex usage: one coordinator plus at most TWO concurrently active,
short-lived subagents; during W1 they must work only on disjoint semantic
areas. Spawn zero agents if serial work is more economical. Use cheap capable
worker models with low effort as feasible, no LLM calls for local deterministic
tests, and the cheapest supported small model only for essential real-provider
tests under an explicit request/token cap. No paid model judge loops.

After S-GATE, implement all remaining W2-W7 scope in this effort: authorship
firewall, unified arbitration, World Director with bidirectional narrative
bridge and weighted GM invention/canon, OpeningDirector, full native feature
coverage, autonomous PvP/death and pre-roll Fear, and final exact-tree tests.
No implementation deferments. Missing authoritative rules or owner-policy
sources are honest blockers; never fabricate mechanics or waive agency.

Worktrees only for independent file ownership. Each child tests and commits;
coordinator reviews, merges promptly into the integration branch, reruns
affected tests and removes a clean worktree. Maintain one
NO_DEFERRALS_LEDGER.md with semantic first, tests, merged SHAs, actual usage,
remaining blockers. Do not push/deploy/access production DB without approval.

Begin W0 then W1 semantic changes NOW, not a planning-only response. Report
semantic failures, fixes, tests, S-GATE SHA, real spawned agents and usage
before scheduling W2.
```

## Acceptance order

`W0 baseline → W1 semantic S0–S4 + S-GATE → W2 native authority/authorship → W3 World Director ↔ narrative and features → W4 OpeningDirector → W5 PvP/death/Fear → W6 complete native catalog/integration → W7 final qualification`.

The first merge must be semantic. If S-GATE cannot pass due to a real unresolved source, privacy, consent or test problem, report a precise blocker and do not quietly substitute nonsemantic tasks or claim completion.
