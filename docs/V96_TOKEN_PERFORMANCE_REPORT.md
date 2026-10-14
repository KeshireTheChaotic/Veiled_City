# V96 token / performance baseline

## V96-07 synthetic call-path checkpoint

Starting `732936aac55e30e0b6200e4273f8a4d17a79c2d1`. Existing ordinary path counts remain **0 native queries / 1 direct combined / 2 assisted router+combined**; no model change or typical-turn saving claimed. Actual injected concurrent preparation of one native NPC cycle changed **2 requests → 1**, with one committed native tick before/after and zero additional request on completed-cycle restart. Sharing binds exact current request bytes and native opportunity, never outputs/effects. Distinct guilds/opportunities/owner context/models remain independent. Cancelled pre-dispatch requests make zero calls; actually received late usage is counted once and never turned into native effects.

Frozen eleven-case suite's actual source/commit/fake-delivery fixture: direct **53.9719 ms**, assisted **49.2060 ms**, **n=1 per flow**, hence each flow's nearest-rank p50/p95 is just its sole sample, not a useful distribution. Aggregate synthetic model stage **n=3**, p50 **0.5617 ms**, p95 **0.7073 ms**; **3 unknown usage**, **0 retries**, reported input/output/cache tokens **unknown**. No real-model latency, caching, narrative quality, cost or billing claim. Native/source/privacy/complete-response quality is deterministic regression evidence, not a prose rating. [Phase contract and official retry source](V96_07_REQUEST_CONTRACT.md), [qualification ledger](V96_PROGRESS.md). Earlier baseline measurements below remain historical.

Final V96-07 same-tree qualification: **146/146** mandatory offline suites, zero failed/not-run, both D08, **26/26** acceptance mappings, **393,892 ms**, check/manifest/diff integrity. This is authority/compatibility evidence, not measured live interactivity or model narrative quality. Real token/cost/cache/latency comparisons still require separate authorization and representative live measurements; none were performed.

## V96-06 paired synthetic checkpoint (unqualified)

Starting HEAD `9421b6e3dceeb0c1f5f86aa7f3c347b644833b25`. Same `MEASURE` fixture, twenty-four native facts, party/private combined turns; initial run before production edits, final focused run after scoped changes. Logs live outside the repository in TEMP (`veiled-v96-06-red.log`, `veiled-v96-06-final-focus.log`). Each measurement made **two synthetic requests total**, one per turn, **zero retry/repair**, **two unknown usage reports** and **no prompt-budget omissions**. Input/output/cached provider tokens are **unknown**, not reported zeros. Actual output-token/cost/live latency savings remain unknown.

| Observed local synthetic metric | Before | Checkpoint after |
| --- | --- | --- |
| Input characters, party/private | 55,660 / 55,662 | 49,602 / 49,604 |
| Instruction characters, party/private | 41,903 / 42,599 | 42,186 / 42,882 |
| Local full-turn milliseconds, party/private | 43.215 / 22.247 | 44.8389 / 22.6141 |
| Nearest-rank local full-turn p50/p95, n=2 | 22.247 / 43.215 | 22.6141 / 44.8389 |
| Injected model-stage p50/p95, n=2 | 0.6931 / 1.7764 ms | 0.5475 / 1.2628 ms |
| Local structured-stage p50/p95, n=2 | 0.7767 / 2.3383 ms | 0.6269 / 2.0810 ms |

These n=2 CPU/double timings are not useful real-model distributions and prove **no latency gain**. Input-character reduction is an observed fixture result, not tokens or billed savings. Instruction byte counts changed during the shared working-tree interval; external concurrent authority edits are unresolved, so this is a **provisional comparison**, not a controlled qualified performance claim. New reported-cache telemetry is tested using explicitly synthetic usage; actual provider cache utilization remains unknown.

Quality evidence is deterministic: exact source/scope conflicts, full detail retention after compaction, obscure clue/contradiction expansion, actual NPC goals, pending native context, owner/privacy/archive revalidation, scope/rule invalidation and complete real-schema compound repair. No qualitative real-model prose rating is claimed. No new lower normal-turn output ceiling is imposed without reported-usage/completeness evidence. See [phase contract and qualification hold](V96_06_CONTEXT_CONTRACT.md); previous historical baseline below is unchanged.

Final merged-tree V96-06 qualification passed **145/145** mandatory suites, both D08, zero failed/not-run, live/billable **0**, **398,802 ms**. This qualifies deterministic compatibility/authority, not real-model performance. Origin `d670fcd` is integrated; its original nine candidate tests and six separate supplemental cases are preserved. The provisional local before/after character/timing measurements above remain labeled synthetic and are not retroactively reclassified as controlled live evidence. Exact report digest and rollback are in the phase ledger.

Source: local `25f6d8013d0a6b07fca1e023d32d16de3e1eea25`; 2026-10-12. No production, credentials or real provider inspected. V96-00 does not optimize context or change models. Version 10.0.0.

## Call-path inventory

| Turn category | Count / conditions | Evidence strength |
|---|---|---|
| Native exact roll/consent/owner UI/review | Zero provider calls in native service path | Static integration plus mandatory native/UI regressions; source acceptance baseline grants no effects |
| Authenticated combined GM turn | 1 provider request on first successful schema/validation pass | Actual injected `GMService.runTurn`, `v96-baseline-test` |
| Optional router + GM | Normally 2, not 1 | Static `shouldRespond` then `runTurn`; direct mention/invitation bypass router |
| Multi-clause turn | Same combined GM request; no extraction call per clause | Static shared `player_intents` schema; later compound semantic qualification required |
| Private GM DM | Normally 1 combined turn, plus genuine scene-transition director if due | Static `processPrivateTurn`, not a live measurement |
| PvP roll/defense/Fear native route | Zero provider calls for native operations; a later fiction turn is distinct | Existing native v94/V95 service tests; not all scene narration is free |
| Optional World Director | Additional request per genuine queued layer/pass; possible NPC simulation work too | Durable round/scene cadence, `runPendingDirectorPass`; not silently counted as ordinary 1-call flow |
| Rules desk / handout / NPC / aftermath / downtime / recap | Additional specialized requests when invoked | Static GM methods; no live invocation here |
| JSON repair / provider retry / validation recovery | Additional bounded attempts, not new logical turns | `requestModel` retry 0–5 (default 1), SDK retries disabled; two JSON attempts; shared deadlines and existing recovery tests |

Actual per-guild flags/operator overrides are **unknown**. Static defaults: GM `gpt-6.1-sol`, router `gpt-6-luna`, routine GM falls back to router/luna; `runTurn` uses `routineGmModel || gmModel`. This baseline does not alter or endorse a model choice. Defaults are not evidence of deployed settings. No automatic downgrade is authorized.

## What is measured vs unknown

`v96-baseline-test` records one request for a complete synthetic reflective turn. Provider usage is absent from `FakeResponses`: **1 unknown usage, 0 reported usage**. Input/output/cached token totals, real-model p50/p95, cache hit ratio and billed cost remain **unknown**, not zero. Prompt characters and in-process request/structured-stage timings are emitted as aggregate-only diagnostics in the TEMP test log. They measure a deterministic double and local CPU, not model token consumption or player-live latency. No invented usage or token-saving percentage is used.

The pre-V96 final offline validator measured 132/132 subprocesses in 366,060 ms. That is test runtime, **not** GM latency. Baseline source/input fingerprint and qualification are in `V9_5_QUALIFICATION.md`. V96 adds one suite; phase results live in `V96_PROGRESS.md` / `TYPED_INTENT_PROGRESS.md`.

Observed focused sample (TEMP `veiled-v96-00-focused.log`, exit 0): prompt **15,827 characters**, one request, unknown usage 1. Double request p50/p95 **0.7513 ms**, structured-GM p50/p95 **1.3253 ms**, each n=1. These are local synthetic-stage measurements, not full player-turn latency or a statistically useful model distribution. Subsequent identical fixtures may have normal CPU timing variance; no latency optimization is claimed.

Existing metrics expose request counts, reported input/output, unknown usage, retries, failures and nearest-rank p50/p95/p99 over bounded process-lifetime samples; estimate rates are operator-configured, explicitly NOT charges. Cache usage is consumed for cost estimation but is not yet separately retained as a reported aggregate: record as a V96-06 measurement gap. Current narrative ratios count preparation attempts, including previews, not unique committed turns. Native health queries are read-only.

## Later comparison contract

Use identical source/schema/audience scenarios before/after; measure calls, actual reported usage (or explicitly labeled prompt character estimates), cache/unknown usage, bounded retries, full-turn latency, quarantines/fallbacks and omissions. Record action capture, owner agency, rule parity, obscure clue/NPC motive recall, complete compound output and independent actions. Do not infer quality from fewer tokens or faster canned responses. Optimize only after V96-01–05 qualify. Preserve mandatory rules/receipts and audience/source-aware retrieval; rollback an optimization that loses continuity or response duty. Real narrative quality/cost/latency claims need a separately authorized staging pilot, not a V96 prerequisite.
