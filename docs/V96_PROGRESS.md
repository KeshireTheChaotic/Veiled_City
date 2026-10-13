# V96 progress — sequential local implementation

## Owner decision / checkpoint (2026-10-12)

V95-06 is **BYPASSED**, not completed. V96 is **not contingent on live-play testing** or a V95-06 completion commit. This supersedes predecessor-completion language in the supplied kickoff, implementation plan and BASE01 crosswalk. CI/live results remain unverified, not fabricated PASS. Push/deployment/production/Discord registration/paid calls remain separately unauthorized.

Actual local HEAD: `25f6d8013d0a6b07fca1e023d32d16de3e1eea25` (completed V95-05), branch `codex/typed-intent-refinement`, application version 10.0.0. Existing uncommitted V95 release/manifest documents and supplied V96 planning files preserved. No bot code, test registrations or configuration changed in this planning turn.

Read the three supplied V96 documents, current progress tail, V95 Fear integration/private UI/operational guides, release qualification and lean policy. Crosswalk inspection: **30 unique cases / nine phases**. Current runner still registers **132** suites. Existing compact report records **132/132 passed**, 0 failed/not-run, 366,060 ms, from the V95-05 run; inspected, **not rerun** and not claimed as V96 qualification. No paid/live performance baseline is available; counts/latency/token savings for V96 remain unknown until measured offline with labeled doubles or separately authorized live aggregates.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Phase state

| Phase | Cases | Status |
|---|---|---|
| V96-00 baseline/contracts | BASE01–02 | COMPLETED `884541f4bfd6c9b61bfa95bd679df9ed85ec6523` |
| V96-01 ordinary GM discretion | RULE01–04 | COMPLETED `c1e36e495bae7c21fb7fdf1fc319664ee6228c3e` |
| V96-02 native resolution/options | ROLL01–04 | COMPLETED `8b3ab34d559249ad2f35357d58e8cd832d8cd0b6` |
| V96-03 scoped review/continuation | HOLD01–03 | QUALIFIED — 136/136 offline suites; independent commit follows |
| V96-04 semantic response/intake | SEM01–03 | NOT STARTED |
| V96-05 lexical/claim cleanup | SEM04–07 | NOT STARTED |
| V96-06 context/token optimization | TOK01–04 | NOT STARTED |
| V96-07 routing/retry/Director | TOK05–07 | NOT STARTED |
| V96-08 integrated qualification | QUAL01–03 | NOT STARTED |

Execution runbook: [V96_PRE_IMPLEMENTATION_PLAN.md](V96_PRE_IMPLEMENTATION_PLAN.md). The preceding planning record is historical; the owner subsequently authorized “Begin V96”. No document alone is implementation proof. Execution remains sequential with one validated local commit per phase; no push/live/production authorization.

## V96-00 — baseline and contracts (2026-10-12)

Current V96-03 starting HEAD `8b3ab34d559249ad2f35357d58e8cd832d8cd0b6`, clean verified. [V96_ACTION_REVIEW.md](V96_ACTION_REVIEW.md) describes HOLD01–03, actual command adapters, non-actionable review/owner terminal source and narrow saved-rule recovery. Own focused **11/11**, combined V96-01–03 **35/35**, eight-suite T1 **60/60** runner cases, all exit 0/no skips. Final full T2 pending. No live/push/production work.

Latest V96-02 evidence and receipt/rollback crosswalk: [V96_NATIVE_ACTIONS.md](V96_NATIVE_ACTIONS.md). Starting SHA `c1e36e495bae7c21fb7fdf1fc319664ee6228c3e`; clean tree verified. Focused 7/7, T1 116/116 test-runner cases across eight impacted suites, exit 0/no skips (D04 and D08 are assertion scripts wrapped as one case each). Final T2 **135/135**, exit 0, **372,434 ms**, zero failed/not-run, both D08/static/acceptance checks passed; manifest sync **585** files and separate `npm run check` exit 0. Network denied, live/billable 0. Historical entries below retain chronology. Result-only docs/resync/integrity do not alter executable inputs; no redundant full run.

Starting HEAD `25f6d8013d0a6b07fca1e023d32d16de3e1eea25`; branch verified. Preserved dirty supplied V96 planning files, V95 bypass/qualification/pilot documents, README/progress and generated manifests. These documentation-only predecessors are intentionally included in the baseline handoff, not discarded or represented as V95-06 completion. No runtime code/configuration changed.

BASE01: actual current source arbitration, native effects, input routing, output sinks, local rules/house policy, flags and model paths inventoried in `V96_INTENT_AUTHORITY_AUDIT.md`. Generic RAW rolls already work; missing durable unsupported-action handling and candidate eligibility are distinct later work. `V96_RULE_DISCRETION_CONTRACT.md` pins authority, precedence, opt-in policy and rollback. `V96_TOKEN_PERFORMANCE_REPORT.md` distinguishes observed/inferred calls and unknown paid usage/latency; cache aggregate gap recorded.

BASE02: reusable `v96-corpus.mjs` contains 15 scenarios / four owners / prescribed 12-field rubric. `v96-baseline-test.mjs` exercises exact accepted source and non-immediate rejection without effects, a replay-safe real pending RAW roll, and actual combined `GMService.runTurn` with injected provider/metrics. No generated source or live traffic. Initial fixture run was 2/4 because its target used unsupported `kind:none/grounding:none`; corrected to the existing closed unknown-target contract, not a production relaxation. Focused run then **4/4**, exit 0, no skipped tests. This is baseline fixture qualification, not a reproduced gameplay defect or general semantic-quality claim.

No SQL migration or persistent production change. New suite registration is additive; every original mandatory suite/assertion retained. V96-01–08 remain unstarted pending the final V96-00 gate and independent commit. Full qualification result: pending.

T1 actual commands: guarded `node scripts/rules-adjudication-test.mjs` exit 0 (existing assertion script); guarded `v95-deprecation-coverage-test.mjs` **4/4**, exit 0; guarded `v9-release-qualification-test.mjs` **4/4**, exit 0. Each used `--import ./scripts/offline-guard.mjs`, no skips/network. Original reporter README preserved separately as `V95_VALIDATION_REPORTER_README.md`, not lost when importing supplied V96 index. Final executable/test inputs frozen for manifest sync and single T2.

Final T2 actual `node scripts/sync-release.mjs 10.0.0` synchronized **580** non-runtime files; `npm run validate` exit **0**, **133/133 mandatory suites**, **0 failed / 0 not-run**, **368,169 ms**. Included quality/format/syntax/schema checks and both D08 suites exit 0; all acceptance mappings passed. Report: local ignored `bot/.reports/offline-validation.json`; verbose log TEMP `veiled-v96-00-validate.log`. Network denied, live requests 0, billable tokens 0. `git diff --check` passed before qualification. Final result-only documentation and corrected local catalog spellings do not change executable/test inputs; resync/byte-hash/diff checks precede commit without a redundant T2.

BASE01–02 qualified; no runtime/schema migration, flags enabled, source/receipt rewrite, native effect or privacy change. Remaining implementation gaps belong to V96-01–08, not waived. Rollback removes only this phase's additive tests/docs/registration; retain all V95 native history and operational records. V96-01 may begin only after this independent commit exists.

## V96-01 — ordinary GM discretion (2026-10-12)

Starting SHA / completed V96-00: **`884541f4bfd6c9b61bfa95bd679df9ed85ec6523`**, verified clean before phase. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

Red-first: `v96-rules-discretion-test.mjs` production `applyAuthoritativeMutation` candidate test **0/1**, exit 1, `Closed semantic intent schema required`. Subsequent targeted negatives exposed missing saved-rule fallback (`roll_pending` instead of review), missing pre-RNG evidence revalidation (Missing expected exception), native missing-trait review becoming a blocked capability hold, and manual authority not overriding the opt-in flag (one request instead of zero). All reproduced locally before their fixes; an initial CAS fixture lacked `roll_collaboration`, corrected before recording the actual missing-exception reproduction. Logs are TEMP `veiled-v96-01-*-red.log`; no live model traffic.

Production changes: `gm-action-ruling.js` adds a closed v1 proposal and GM-private immutable-terms checkpoint, current source/owner/scene/audience/location/evidence/rule validation, bounded read-only context and default-off `gm_discretion`. `typed-intents.js` accepts additive closed candidate forms without replacing existing schemas. `state.js` calls the same `adjudicateAcceptedIntent` / `prepareRollRequest`, saves zero-cost no-roll outcomes, respects dependency/PvP/window ownership and preserves independent ordinary paths. `gm.js` supplies proposals/evidence in the existing combined request. `rules-arbitration.js` optionally links the exact ruling to the request; `roll-collaboration.js` revalidates that link/context before any owner cost or RNG. Manual world authority overrides opt-in. Every supplied rule reference is validated; generic SRD fallback applies only when none were specified, never to mask a nonexistent special rule.

RULE01: real zero-mutation/no-dice no-roll receipt; RULE02: mundane improvised standard action/native Difficulty/private pending request, exact replay/restart and actual one-call GM preview → commit; RULE03: unsupported feature/Shadow Tell, resource/damage/custody/special effect and PC-conflict routes cannot mint effects; RULE04: invalid/provisional refs, spoofed model authority/foreign owner, private audience, scene/source/context/rule revision, manual/off mode and native missing-trait review negatives. Focused **14/14**, exit 0, 0 skipped. Native request/adjudication/accepted action receipts, not the proposal checkpoint's historical preparation status, own the current outcome lifecycle.

T1 guarded production suites: typed intent lifecycle, rules arbitration and compound action assertion scripts exit 0; continuation **28/28**, PC resource authority/FH40 **26/26**, cross-actor authored output **6/6**, both standalone D08 exit 0. These are actual impacted integration results, not the upcoming T2. Final full gate pending. No native arithmetic, PvP rules, published history, SQL schema, paid endpoint or production setting changed. Scoped unsupported checkpoints remain non-actionable; richer owner review/reconciliation/continuation is V96-03, not falsely claimed here. Native options/results qualification remains V96-02.

Final review reopened three exact negative contrasts before committing: same-timestamp saved-rule text edits, converting historical no-roll completion into new ruling authority, and silently adopting an existing native pending request under different terms. Each first failed with Missing expected exception, then passed with native rule-content digest and strict existing-history/request binding checks. Already committed outcomes/old pending requests are unchanged. Focused final **17/17**, exit 0, no skips. The first T2 attempt was deliberately INTERRUPTED (exit 1, 109/134 passed, 25 not-run, no reported failed child) to fix the content-revision boundary; it is NOT a completed qualification. No validator process remained afterward. Actual executable changes justify a fresh full final gate under lean policy; no passing run is being repeated merely for prose.

Final T2: `node scripts/sync-release.mjs 10.0.0` **582** files; `npm run validate` exit **0**, **134/134 mandatory suites**, **0 failed / 0 not-run**, **371,398 ms**. Static quality/format/syntax/schema, all historical assertions/acceptance mappings and both D08 passed in that same final executable tree. Network denied, live requests 0, billable tokens 0. Logs TEMP `veiled-v96-01-validate-final.log`, final JSON copied to TEMP after completion. Final result-only docs require manifest byte/hash/diff checks, not duplicate full validation. RULE01–04 qualified. Independent local commit follows; V96-02 is next, not yet started. No push/deployment or live operations.
