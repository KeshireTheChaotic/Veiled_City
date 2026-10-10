# Codex kickoff — Veiled City Session 2 + v7 delta reconciliation (v8)

Use this prompt from the repository root while checked out on `codex/typed-intent-refinement`.

```text
You are repairing the Veiled City semantic typed-intent/Discord AI GM on codex/typed-intent-refinement.

READ FIRST: CODEX_TYPED_INTENT_DELTA_PLAN_v8.md, SESSION2_REGRESSION_MATRIX_v8.md, V7_V8_DELTA_MATRIX.csv, SOURCE_AUDIT_v8.md, docs/TYPED_INTENT_PROGRESS.md, docs/TYPED_INTENT_CONTRACTS.md, docs/TYPED_INTENT_RELEASE_10.0.0.md, and actual source, dice/SRD/house-rule documentation. The plan corresponds to reviewed HEAD 2dc347a77e1fd4988856b8e578e5c148fe82cb24 but must be reconciled to your ACTUAL newer HEAD and dirty worktree before edits. Do not reset/overwrite other work.

This package extends the previous v7 nine work packages (D00 through D08) with Session 2 fixes H01 through H05. The actual prior v7 ZIP is not mounted in this conversation; this plan retains its previously established phase inventory. If that ZIP is available in your worktree, compare its original detailed checklist first and record any omitted requirement.

MANDATORY ORDER: D00, H01, H02, H03, H04, H05, D01, D02, D03, D04, D05, D06, D07, D08. Carry completed source-backed functionality forward rather than rebuilding it. Make independently testable, reviewable commits and update docs/TYPED_INTENT_PROGRESS.md after each. Immediately proceed to next safe offline phase when green; stop only for a substantive unresolved authority, compatibility, safety, migration or test blocker.

MISSION: Make Session 2 ordinary roleplay playable without weakening protection. Owner-authored unchanged source -> exact occurrence proposals -> native accepted intents -> verified access/rules/consent -> real no-roll or pending request -> one native receipt -> audience-safe narration/private menu/outbox -> scoped memory. Never model-assert dice, spends, PC voluntary acts, NPC secret knowledge, or completion from mere narration.

FIRST REPRO: Use the supplied sanitized Session 2 chat and associated error text, plus deterministic synthetic structured model responses. Red-first tests must exercise source span mismatch, missing source substrings, target ambiguity, output narrative claim span mismatch, references review mismatch, >2,000-character Discord response, movement follow-up, contested PvP, Billy compound turn, duplicate same-message pending rolls, unserved private request, strict reconciliation and component privacy.

NEVER: start/restart/deploy the live bot; access prod .env/SQLite/WAL; issue paid OpenAI calls; register live Discord commands; merge/force-push; fabricate passing tests, source receipts or consent; weaken all-or-nothing native transactions. Keep test network disabled. An immutable authored source is the only declaration authority, not the GM's interpretation.

AFTER EACH PHASE: tests red first, implement, focused offline tests, npm run check, npm run validate, update manifest/contracts/progress/rollback as appropriate, commit. Record exact SHA and suite count. No tests skipped. Existing 85/85 report is historical, not a waiver of new replay tests.

FINISH WITH: phase-by-phase implemented/blocked matrix, source file paths and commit SHA, newly added test names plus actual commands/results, no-production/no-paid audit, migrations and rollbacks, four-PC session replay result and outstanding approval decisions. Leave actual deployment to owner.
```

> Reference archive: `Session(1).zip` has `Chat.txt` and `Associated Errors.txt`. If not present in the Codex checkout, place sanitized versions of those two text fixtures in the test fixture directory before executing D00. Do not copy player character packets into a public repository or use production character data without an explicit test-safe procedure.
