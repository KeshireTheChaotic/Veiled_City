# V96 token / performance baseline

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
