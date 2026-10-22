# P08 — Codex medium-reasoning handoff

> **Task:** Implement P08 **only**. This is a proposed source change, not an approved deployment. The generated P08 package is a **plan artifact**, not changes already committed to the repo.

**Repo:** `KeshireTheChaotic/Veiled_City`  
**Branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `81569d08699343e401fc11ba1eaed0f10b4fd37a` (at package creation the branch exactly matched).  
**Active phase:** `docs/Implementation_Plans/phases/P08/SCOPE.md` + `/LEDGER.md` and features `P08-F01` through `P08-F07` with separate SCOPE/LEDGER.

## Copy/paste into Luna 6 medium Codex

```text
Work in KeshireTheChaotic/Veiled_City on codex/clean-ai-gm-2026-10, reference SHA 81569d08699343e401fc11ba1eaed0f10b4fd37a.

Implement only the attached P08 OpeningDirector × Audience-First Integration work order, following repo conventions. Preserve existing P00–P06 histories and do not create a P07. First verify checkout branch, HEAD and dirty tree and preserve user edits. Read docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md IN FULL before changes, followed by README.md, CODEX_START_HERE.md, TEST_PROTOCOL.md, TEST_EXECUTION_NO_POLL.md, DECISION_GATES.md, then P08 SCOPE/LEDGER and the active P08-F01…F07 feature pair. The owner's audience-first, creative-first, agency-preserving intent governs. ENGINE constitution is complementary, not a replacement.

Use one serial coordinator and zero subagents unless independently necessary. Advance F01 crosswalk (docs only) → F02 GM-secret/knowledge boundary → F03 certified narrative brief → F04 authenticated post-start ensemble/cohort → F05 NPC/faction/continuity opening signals → F06 honest coverage and entry fallback → F07 measured latency and frozen offline qualification. Fix F02 before exposing more planning context to any player-facing writer. Each feature owns separate Markdown SCOPE.md/LEDGER.md, documenting verified code findings, SHA, file diff, real tests and hashes, actual model/cost/timing measurements, holds, questions and rollback.

Never give AI permission to decide PC actions, speech, feelings, dice/resources, locations, affiliation or consent; never invent mechanical effects or tell secrets to wrong audiences. Retain native source grants, GM secrets, NPC belief separation, provisional invention, weighted continuity, audience/recipient revalidation, delivered-fiction memory and exactly-once outbox semantics. Preserve freeform creative narration and NPC/faction autonomy. Ask owner before adding any new narrative or autonomy restriction; hold only that restriction and continue other safe work.

Write wholly NEW affected-code-only tests under bot/tests/ai-gm-2026-10/p08-f0N.test.mjs (F01 documentation-only: no test). New fixtures only, mocked provider and Discord, disposable SQLite, zero network/provider/production DB. Never import/copy/run legacy test suites or fixtures, npm test, npm run validate, historical CI or golden outputs. Freeze each feature and run its fresh affected-code tests in ONE blocking batch without polling/watching; node --check only changed JS/MJS. Do one final frozen union across newly written P08 affected-code tests, recording commands, hashes, counts and final exits. Never mistake still-running tests for passing ones.

Isolate noncritical holds and continue independent work; stop globally only for critical cannot-proceed safety/authority failures. No push, merge, deploy, service restart, production DB access, CI trigger, paid models or live Discord without separate authorization. Do not silently mutate already acknowledged fiction or retry uncertain sends.

After EACH feature update both feature and phase ledgers. Final response must list exact checkout/head, changed code, results of new test batches, provider/caching/latency evidence, unresolved local holds, owner restriction questions, rollback boundaries and NOT CERTIFIED release status. Offline tests are not a release certificate.
```

## Importing this package into repository

1. Copy the provided repository-shaped `docs/Implementation_Plans/phases/P08/` and `docs/Implementation_Plans/features/P08-F01/` … `P08-F07/` into the checkout **without overwriting any preexisting files**. If a conflicting P08 already exists locally, stop only the conflicting copy and reconcile manually rather than dropping existing work.
2. Add a single link to the phase under the `## Phases` list in `docs/Implementation_Plans/README.md`: `- [P08 — OpeningDirector × Audience-First Integration](phases/P08/SCOPE.md): Join certified dramatic intent, private hook authority, attendance cohorts, world pressure, truthful coverage and latency qualification.` The historical README/CODEX_START_HERE must not be rewritten to mark earlier phases untested or rerun them.
3. The downloaded ZIP contains **documentation only**: no production patches, tests, CI, deployment or database artifacts. Codex must create actual changes/tests based on verified current source.
4. On completion update only the active P08 scope/ledgers, relevant phase index and independently justified production/test paths. Preserve all prior records; source controls actual gameplay state.

## Stop and decision gates

- Security/authority critical: actual privacy leak, PC ownership breach, fabricated effects or irrecoverable receipt uncertainty → hold unsafe operation and record exact scope. Global stop only if no independent safe work can continue.
- Isolated lack of valid disclosure authority, known source, suitable actor cognition, performance optimization proof or owner consent for **new creative restrictions** → `HELD`, explain alternative and continue other safe work.
- A feature passes only on observed changed-code results. Full release, live provider, true Discord timing and subjective narration quality remain `NOT CERTIFIED` absent separate authorization.
