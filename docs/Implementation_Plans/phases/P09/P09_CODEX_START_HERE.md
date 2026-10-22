# P09 — Codex handoff (additive; does not replace historical CODEX_START_HERE)

Repository: `KeshireTheChaotic/Veiled_City`  
Branch: `codex/clean-ai-gm-2026-10`  
Planning reference: `81569d08699343e401fc11ba1eaed0f10b4fd37a`

## Paste into Codex

```text
Implement P09 — AI-first feature interpretation and native mechanical validation, using docs/Implementation_Plans/phases/P09/SCOPE.md and the eight P09-Fxx SCOPE/LEDGER pairs.

Begin at the actual checkout HEAD on codex/clean-ai-gm-2026-10, anchored for planning to 81569d08699343e401fc11ba1eaed0f10b4fd37a. Do not reset dirty work or assume the checkout still matches the anchor. If P09 documents are absent, install the accompanying additive plan first; do not overwrite historical plans.

First read the full docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md; then README.md, CODEX_START_HERE.md, DECISION_GATES.md, TEST_PROTOCOL.md, TEST_EXECUTION_NO_POLL.md, the P09 phase SCOPE/LEDGER and only the active feature SCOPE/LEDGER. The owner spec governs creativity; source/native authority governs actual effects.

P09 goal: GM PRIVATE structured/Markdown source -> AI GM contextual feature interpretation/proposal -> independent native validation -> exactly-once state/receipt -> entitled narration. Stop requiring dedicated executable feature code for *fictional understanding*, but never let model prose or source text authorize HP, Fear, Stress, Hope, attacks, modifiers, consent, movement, clocks or other persistent effects. Preserve existing native readers/handlers while migrating.

Execute small feature slices P09-F01 to P09-F08. Audit first, then targeted retrieval, fiction-vs-effect separation, bounded typed proposal bridge, one pilot at a time (Professional Entry, Pack Pressure, Feedback), and evidence freeze. Do NOT mass-promote 92 review-only entries, rebuild the engine or replace the catalog with another per-feature registry. A supported catalog cue is not proof of a supported mechanic. P07/P08 are not established by the reference repository; do not invent them.

For any new restriction on creative narration, NPC/faction agency, spontaneous minor invention or pacing: ask owner a precise question, hold only that restriction, and continue safe work. Hold ambiguous mechanics locally without fabricating source authority. Stop globally only for an uncontainable critical blocker.

Fresh changed-production-code tests ONLY under bot/tests/ai-gm-2026-10/, one new test file per changed feature and new cross-boundary tests as necessary. Never run, import, copy or repurpose old tests, fixtures, suite registries, npm test, npm run validate, or inherited CI. Freeze each feature before one scoped blocking test batch; NEVER WATCH OR POLL; if detached, do independent work and collect one terminal result at a natural checkpoint. Record exact SHA, new tests, commands, hashes, counts, real exits, cost/calls and holds in both feature and phase ledgers.

Use a single Codex worker, zero subagents by default. No provider spend, CI trigger, production DB access, push/merge, restart, deploy or release without separate owner authorization. Maintain independently reversible diffs and saved receipt compatibility. Work from code present, not assumptions from historical phase documents.

Finish with changed-path report, terminal targeted test evidence, feature ledger statuses, measurable call-count/latency results or UNMEASURED, P06 parity/receipt proof or explicit local holds, rollback, unanswered owner questions, and release NOT AUTHORIZED unless separately approved.
```

## Integrate into existing plan index

Append one entry to `docs/Implementation_Plans/README.md` under `## Phases` (do not replace old phase historical claims):

```markdown
- [P09 — AI-first feature interpretation and native mechanical validation](phases/P09/SCOPE.md): Read scoped GM Private feature rules, preserve narrative freedom and validate mechanical effects through existing native services; pilot Professional Entry, Pack Pressure and Feedback. P07/P08 are not implied or declared complete by P09.
```

Update `CODEX_START_HERE.md` only as a small additive pointer for subsequent phases, leaving historic P00–P06 text intact. Neither the planning baseline nor this document authorizes implementation, code push, production access, provider spend or release independently.
