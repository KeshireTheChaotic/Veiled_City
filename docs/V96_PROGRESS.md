# V96 progress — sequential local implementation

## Owner decision / checkpoint (2026-10-12)

V95-06 is **BYPASSED**, not completed. V96 is **not contingent on live-play testing** or a V95-06 completion commit. This supersedes predecessor-completion language in the supplied kickoff, implementation plan and BASE01 crosswalk. CI/live results remain unverified, not fabricated PASS. Push/deployment/production/Discord registration/paid calls remain separately unauthorized.

Actual local HEAD: `25f6d8013d0a6b07fca1e023d32d16de3e1eea25` (completed V95-05), branch `codex/typed-intent-refinement`, application version 10.0.0. Existing uncommitted V95 release/manifest documents and supplied V96 planning files preserved. No bot code, test registrations or configuration changed in this planning turn.

Read the three supplied V96 documents, current progress tail, V95 Fear integration/private UI/operational guides, release qualification and lean policy. Crosswalk inspection: **30 unique cases / nine phases**. Current runner still registers **132** suites. Existing compact report records **132/132 passed**, 0 failed/not-run, 366,060 ms, from the V95-05 run; inspected, **not rerun** and not claimed as V96 qualification. No paid/live performance baseline is available; counts/latency/token savings for V96 remain unknown until measured offline with labeled doubles or separately authorized live aggregates.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Phase state

| Phase | Cases | Status |
|---|---|---|
| V96-00 baseline/contracts | BASE01–02 | QUALIFIED — 133/133 offline suites; independent commit follows |
| V96-01 ordinary GM discretion | RULE01–04 | NOT STARTED |
| V96-02 native resolution/options | ROLL01–04 | NOT STARTED |
| V96-03 scoped review/continuation | HOLD01–03 | NOT STARTED |
| V96-04 semantic response/intake | SEM01–03 | NOT STARTED |
| V96-05 lexical/claim cleanup | SEM04–07 | NOT STARTED |
| V96-06 context/token optimization | TOK01–04 | NOT STARTED |
| V96-07 routing/retry/Director | TOK05–07 | NOT STARTED |
| V96-08 integrated qualification | QUAL01–03 | NOT STARTED |

Execution runbook: [V96_PRE_IMPLEMENTATION_PLAN.md](V96_PRE_IMPLEMENTATION_PLAN.md). The preceding planning record is historical; the owner subsequently authorized “Begin V96”. No document alone is implementation proof. Execution remains sequential with one validated local commit per phase; no push/live/production authorization.

## V96-00 — baseline and contracts (2026-10-12)

Starting HEAD `25f6d8013d0a6b07fca1e023d32d16de3e1eea25`; branch verified. Preserved dirty supplied V96 planning files, V95 bypass/qualification/pilot documents, README/progress and generated manifests. These documentation-only predecessors are intentionally included in the baseline handoff, not discarded or represented as V95-06 completion. No runtime code/configuration changed.

BASE01: actual current source arbitration, native effects, input routing, output sinks, local rules/house policy, flags and model paths inventoried in `V96_INTENT_AUTHORITY_AUDIT.md`. Generic RAW rolls already work; missing durable unsupported-action handling and candidate eligibility are distinct later work. `V96_RULE_DISCRETION_CONTRACT.md` pins authority, precedence, opt-in policy and rollback. `V96_TOKEN_PERFORMANCE_REPORT.md` distinguishes observed/inferred calls and unknown paid usage/latency; cache aggregate gap recorded.

BASE02: reusable `v96-corpus.mjs` contains 15 scenarios / four owners / prescribed 12-field rubric. `v96-baseline-test.mjs` exercises exact accepted source and non-immediate rejection without effects, a replay-safe real pending RAW roll, and actual combined `GMService.runTurn` with injected provider/metrics. No generated source or live traffic. Initial fixture run was 2/4 because its target used unsupported `kind:none/grounding:none`; corrected to the existing closed unknown-target contract, not a production relaxation. Focused run then **4/4**, exit 0, no skipped tests. This is baseline fixture qualification, not a reproduced gameplay defect or general semantic-quality claim.

No SQL migration or persistent production change. New suite registration is additive; every original mandatory suite/assertion retained. V96-01–08 remain unstarted pending the final V96-00 gate and independent commit. Full qualification result: pending.

T1 actual commands: guarded `node scripts/rules-adjudication-test.mjs` exit 0 (existing assertion script); guarded `v95-deprecation-coverage-test.mjs` **4/4**, exit 0; guarded `v9-release-qualification-test.mjs` **4/4**, exit 0. Each used `--import ./scripts/offline-guard.mjs`, no skips/network. Original reporter README preserved separately as `V95_VALIDATION_REPORTER_README.md`, not lost when importing supplied V96 index. Final executable/test inputs frozen for manifest sync and single T2.

Final T2 actual `node scripts/sync-release.mjs 10.0.0` synchronized **580** non-runtime files; `npm run validate` exit **0**, **133/133 mandatory suites**, **0 failed / 0 not-run**, **368,169 ms**. Included quality/format/syntax/schema checks and both D08 suites exit 0; all acceptance mappings passed. Report: local ignored `bot/.reports/offline-validation.json`; verbose log TEMP `veiled-v96-00-validate.log`. Network denied, live requests 0, billable tokens 0. `git diff --check` passed before qualification. Final result-only documentation and corrected local catalog spellings do not change executable/test inputs; resync/byte-hash/diff checks precede commit without a redundant T2.

BASE01–02 qualified; no runtime/schema migration, flags enabled, source/receipt rewrite, native effect or privacy change. Remaining implementation gaps belong to V96-01–08, not waived. Rollback removes only this phase's additive tests/docs/registration; retain all V95 native history and operational records. V96-01 may begin only after this independent commit exists.
