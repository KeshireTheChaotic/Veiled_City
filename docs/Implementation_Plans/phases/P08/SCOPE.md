# P08 — OpeningDirector × Audience-First Integration

**Status:** CORRECTIVE COMPLETION DELTA PARTIALLY VERIFIED; OPENING / PRIVATE DELIVERY / RESTART ACCEPTANCE UNQUALIFIED
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference source SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a` (GitHub branch comparison verified identical during planning; Codex re-verifies checkout)  
**Scope:** One self-contained **P08** under the existing `docs/Implementation_Plans/` hierarchy. No separate P0–P6 initiative; preserve historic P00–P06. P07 was not present at this reference and is **not** created or renumbered here.

## Governing owner specification

[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) is the full owner's desired behavior; it is not a claim that the code already achieves it. `content/ENGINE/AI_GM_CONSTITUTION.md` supplies complementary native operational authority. Audience-first, creative-first, agency-preserving is the governing narrative philosophy: compelling situated opening scenes, agency-preserving player opportunities, autonomously motivated NPCs, legitimate emergent invention, weighted continuity, fair spotlight and truthful Daggerheart authority.

## Goal

Unify native OpeningDirector planning with audience-first narrative authoring for the initial shared camera, owner-private entry, post-start multiplayer cohort assembly and established-party resumption. The planner coordinates dramatic *intent*; the writer creates immersive *fiction* for an actually entitled audience; native source/agency/mechanical authority validates and commits; transport acknowledgements and delivered-fiction memory remain authoritative. Keep unrevealed GM Hooks/Relationships/proposed Canon hidden.

## Current integration risks — static source findings at reference SHA, not runtime certification

- `assembly-context.js`: GM-only sheet `gm_hooks` appears in `assemblyHookSources()` owner-character source array although player export drops that field (P08-F02).
- `gm.js` plans `convergence_goal`, `bonds`, per-PC `stay_reason`/`private_hook`/proposals, but `pvp-output.js`'s v2 authoring route substitutes generic `describe_scene` and `assemblyWriterBrief()` omits the dramatic convergence purpose (P08-F03).
- `commands.js` runs first opening immediately at session start, including empty roster; check-ins use `deliverOpeningEntry()` and do not automatically invoke coordinated ensemble planning. Preserve the intentional zero-attendee camera while adding source-safe later coordination (P08-F04).
- `opening-world-bridge.js` supplies only bounded existing signals, not a full scoped synthesis of NPC motive/faction pressure; protect actor-local knowledge (P08-F05).
- `assembly_evidence` reports native prose acceptance separately from hook verification but cannot yet establish dramatic-purpose coverage. Late entry holds when no native authored prose is accepted (P08-F06).
- The public-first, one-slot-at-a-time authoring pattern needs measured—not guessed—latency/provide-call qualification (P08-F07).

## Independent P08 features

- [P08-F01 — Reference reconciliation and source-to-authority map](../../features/P08-F01/SCOPE.md)
- [P08-F02 — GM-private hook and knowledge firewall](../../features/P08-F02/SCOPE.md)
- [P08-F03 — Certified dramatic brief to the audience-first writer](../../features/P08-F03/SCOPE.md)
- [P08-F04 — Start/check-in cohort assembly and immutable receipts](../../features/P08-F04/SCOPE.md)
- [P08-F05 — Living-world agenda, cognition and continuity at openings](../../features/P08-F05/SCOPE.md)
- [P08-F06 — Truthful story coverage, entry fallback and review states](../../features/P08-F06/SCOPE.md)
- [P08-F07 — Latency measurement and final changed-delta qualification](../../features/P08-F07/SCOPE.md)

## Execution order and dependencies

`F01 baseline (documentation) → F02 privacy → F03 sourced writer brief → F04 cohort assembly → F05 living-world pressure → F06 diagnostics/fallback → F07 measurement/qualification`.

Run one coordinator / zero subagents by default. Independent F05 or F06 work may proceed across an isolated F04 noncritical hold when their required source/permission contracts are complete. **Never expose extra GM/private data in order to unblock a narrative feature.** Freeze each implementing feature's diff/tests before executing one batch. Existing P00–P06 targeted passes are historical, not P08 acceptance evidence.

## Repository process requirements

1. Inspect actual worktree, preserve uncommitted user edits and source readers. Before any edit, read the full owner spec, then `README.md`, `CODEX_START_HERE.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md`, and `DECISION_GATES.md`; subsequently read only active scopes/ledgers and relevant source. Existing `CODEX_START_HERE.md` instructions for historical P00–P06 do not cause those phases to be rerun for this **express P08 work order**.
2. Each feature and this phase maintain a **separate scope and ledger**, recording SHA, changed paths, sourced conclusions, new affected-code test commands, terminal results and hashes, actual cost/cache metrics, unresolved source/owner holds and rollback. See [LEDGER.md](LEDGER.md).
3. Only tests wholly written for currently modified production code under `bot/tests/ai-gm-2026-10/p08-f0N.test.mjs`. Use new offline fakes, temporary SQLite, injected deterministic clock/dice, simulated Discord and mocked provider. No inherited tests/fixtures/suites, `npm test`, `npm run validate`, or CI. A documentation-only F01 has no tests.
4. Run once per frozen feature in a blocking execution or repository-approved detached completion protocol. **No test watches/polls.** One final frozen union of only new affected-code tests. `node --check` only changed JS/MJS. A pending run is **RUNNING / UNQUALIFIED**, not passed.
5. Ask owner before a *new restriction* on natural prose, minor invention, NPC/faction autonomy, fixed pacing or creative-quality-degrading model choice. Existing PC control, rules truth, privacy, canon, provenance and replay restrictions are mandatory without reapproval. Locally hold missing sources and unrelated blockers; stop globally only for critical safety/state/cannot-continue authority problems.
6. Do not push/merge, deploy/restart, access production DB, trigger CI, test paid models, or claim staging/Discord/prose/live latency proof without separate approval. Zero subagents by default; do not consume model time to poll jobs.

## Exit and acceptance

All safe implementing P08 features have truthful completed ledgers, with fresh affected-code unit/cross-boundary tests verifying the P08-F07 acceptance matrix. The initial camera, later cohort shared incident, owner-private thread, established-party resume, GM-secret isolation, NPC motive, optional invention/memory and native delivery receipts are consistent. Missing semantic/narrative-quality proof or staging access is explicitly marked **UNQUALIFIED**, not concealed. No automatic product certification or release permission.

## Test-runner no-poll rule

Follow [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md) in full. One frozen batch per feature, no status checks during execution, collect final exit code once; after final freeze run the union of new P08 tests with source/test hashes. No legacy validation.

## Corrective Follow-up — 2026-10-22

Baseline is actual branch `codex/clean-ai-gm-2026-10` at `d52c5ac52f7a993e642af7d11a93101351717ea1` with preserved, unrelated user-owned untracked planning documents. This is a delta under F02–F07, not a new phase. Correct nested/export metadata classification and remove free-form planner goal text from writer packets; derive writer cues only from audience-validated world opportunities. Repair `/vc-session assemble` cohort reachability, find the original zero-attendee camera by immutable attempt/turn/outbox provenance, use a SQLite `BEGIN IMMEDIATE` claim with revision-bound unsent refresh history, honor Director pause, scope planner world agenda to session/scene, and report transport separately from unverified dramatic fulfillment.

Only fresh corrective tests under `bot/tests/ai-gm-2026-10/` are in scope. Final run `p08-corrective-delta-20261022-01` passed 7 tests and changed-file `node --check`; test details and exact hashes are in affected feature ledgers. Three earlier attempts failed only on test fixture construction and were repaired before the final pass. This delta does not establish a positive acknowledged camera→cohort delivery, cross-process race behavior, restart recovery, stale principal revocation during a real writer await, or semantic narrative fulfillment. Those remain local acceptance holds; P08 is not release qualified.

### Expanded qualification follow-up — 2026-10-22

The previous corrective final union predates expanded owner-entry and lifecycle test changes. F02 now has one focused passing changed-code test for nested audience filtering through `openingEntryProjection`. F04’s expanded test/worker command has no terminal result and is recorded RUNNING / UNQUALIFIED; no final corrective union has been run for these changes. Keep A6 cross-process behavior and F02 accepted-output/fallback delivery as local holds; do not claim P08 corrective acceptance complete or release qualified.

### Latest corrective result — 2026-10-22

This handoff adds result rows to the acceptance matrix. F03 remains held because the native Director bridge produced zero beats from two accepted fixture units; actual writer packet and source-specific throughline acceptance are not demonstrated. F04 passed two focused offline SQLite tests for mixed receipt truth, stale callback rejection and pause-after-delivery without replay. S04 is partial (two connections, sequential callbacks). This does not qualify live publication or release. See existing F03/F04/F07/phase ledgers for exact hashes and cost evidence.
