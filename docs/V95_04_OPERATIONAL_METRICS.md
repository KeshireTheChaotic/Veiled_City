# V95-04 operational instrumentation

Local offline qualification only. Version stays 10.0.0. No live Discord registration, production access or model spending is part of this phase.

## GM usage

`/vc-admin ops` returns a GM-only ephemeral JSON attachment. `/vc-admin ops incident:<opaque-reference>` inspects one bounded incident from the same guild and process. Manage Server or the configured GM role is required. References rotate after restart, are not source authority, and cannot execute a recovery. There is no party/player report surface. The command works without a session or registered player; it bypasses player upserts, command receipt capture and continuation publishing. Discord acknowledgement is the only request made by a report, never an AI request.

Snapshots contain only closed categories, numeric aggregates and salted opaque references. They exclude narration, prompts, arguments, character/user/channel IDs, source spans, native JSON, error messages, API keys and credentials. Native reports SELECT only operational columns. Existing restricted campaign records are not copied into telemetry. Querying a report never rolls, resumes, changes consent, reconciles a publication, clears Fear or edits game state.

## Measurements and interpretation

- `model_request`: one result per provider invocation, including failures, text and speech. SDK hidden retries are disabled; the existing configured retry ceiling (0–5, default 1) is implemented as observable bounded retries for transient provider errors. Structured-JSON and state-validation retries are separately counted; each additional provider invocation counts once, never as an invented successful response. Transient retry backoff is bounded at 1 second per retry and shares the original abort signal/deadline. A request count is an invocation attempt, not proof of an HTTP response or a billed charge.
- `input_tokens` / `output_tokens`: sums of valid provider-reported nonnegative integer fields only. Missing/invalid usage increments `usage_unknown`; explicit reported zero is different from missing usage. Failed calls and speech without token usage remain unknown. No token estimation from characters, cached text or secrets. SDK/provider-side invisible work and aborted network delivery cannot be inferred.
- Timings: router/other structured GM service, validation, native commit, outbox delivery, acknowledgement age and party/private turn envelopes. Nearest-rank p50/p95/p99 use the most recent 500 valid samples per stage; counts accumulate for the retained process lifetime. GM service timing includes provider/retry/JSON work, not earlier prompt assembly; envelope timing includes the broader turn. A missing measurement is null, not a fabricated zero. Native commit failures propagate normally and receive a failure timing.
- Narrative: protected output preparation attempts, prose suppression/quarantine and native neutral fallback. Ratios explicitly count attempts, including preview transactions that later roll back, NOT unique committed turns. Optional-field quarantine and successful bounded safe recovery are separate counters, not labelled neutral output. Persistent quarantine/review counts independently describe saved native state.
- Native health: Fear trigger/decision/effect statuses, private incoming defense/Armor choices, consent accept/decline/withdrawal, continuation/recovery status and saved delivery certainty. Counts of human mutation receipts and Fear review events are separate; they are not subjective live-quality scores. Command/turn replay counters do not execute another native effect.
- Delivery: actual acknowledged sends, demonstrably unsent failures and uncertain outcomes remain distinct. Persisted `delivering` is not assumed delivered on restart. Never use a report to force-resend an uncertain part. Runtime and interaction errors retain only closed codes and salted references; repeated handling of the same interaction error is counted once.

Retention is bounded to 100 guild buckets (oldest bucket eviction), a fixed stage allowlist, up to 32 configured model buckets plus unpriced, 500 latency samples per stage, and 50 recent incidents per guild. Snapshot reads do not allocate/evict buckets. No global cross-guild totals or stable cross-guild correlation are exposed. Runtime aggregates reset on restart; native status is re-read from existing receipts. Native detail is capped at 20 oldest pending records per category and 256 count groups; `native_counts_capped` explicitly signals the group bound. References identify only entries within this bounded projection; absent/evicted references return null.

Fear age is seconds since the actual saved native roll (`rolls.created_at`), not an invented gate due time. Other historical city records have no wall timestamp and report null age. Delivery age uses publication creation; turn recovery uses last update. All statuses, even retracted sources, are observational: saved effects remain immutable. Review instructions request exact native source/authority inspection, never invent a missing rule or bypass an owner choice. Detailed campaign investigation still uses existing authorized GM-native inbox/review commands; the operational attachment intentionally omits their private prose and raw keys.

## Optional pricing configuration

Operator configuration: `MODEL_PRICING_JSON` is JSON keyed by the exact configured model name, with `input` and `output` USD per million reported tokens; optional `cached_input` uses a provider-reported cached token count. For example, an OFFLINE ILLUSTRATION, not real market rates:

```json
{"offline-example":{"input":2,"output":8,"cached_input":1}}
```

Default `{}` means no price estimate, not free usage. Rates must be finite/nonnegative, at most 1e9, with at most 32 model entries. Unknown model names are collapsed to `unpriced`, not retained from untrusted request fields. Missing usage is excluded from cost estimates. If cached usage is absent, the full reported input uses the configured input rate. Historical estimates retain the rates in effect when recorded. Reports always say **estimates, NOT billed charges**. No online pricing lookup, provider billing query, fallback model or paid test is performed.

## MET coverage crosswalk

All cases execute in `bot/scripts/v95-operational-metrics-test.mjs` (15 behavioral tests; registered as a mandatory suite). Each row lists the production boundary, not just a helper name.

| Case | Executed assertions / adapter |
|---|---|
| MET01 | `GMService.requestStructured/requestModel`: malformed JSON retry = 2 requests, 1 retry, 20 reported input / 4 output; transient 429 = 2 calls, 1 failure, 2 unknown-usage responses. Configured cached pricing = $0.00023 illustrative estimate. Speech = 1 request / unknown tokens. |
| MET02 | Structured router/GM timing, actual `commitGmTurn` transaction/outbox plus wrapper failure propagation; native resources unchanged and one publication queued. |
| MET03 | `prepareAuthorizedTurnOutput` quarantines original cross-actor apology and emits native neutral projection; aggregate counters/ratios and read-only quarantine status exclude the prose. |
| MET04 | Real bilateral PvP choices/rolls create native due Fear; `applyFearMove` rejects unsupported resource effect and preserves `needs_review`; report/inspection never reconcile or forgive it. |
| MET05 | Real owner consent signatures count accepted, declined and revoked-withdrawal without owner IDs, through `reviewPvp/respondPvp`. Native historical consent is not revalidated or granted by a report. |
| MET06 | Offline guard denies network; injected provider/speech fixtures only, no model fallback, explicit unknown usage and disabled hidden SDK retries. |
| MET07 | Actual `handleCommand` denies a non-GM before writes/ack; GM receives ephemeral attachment; default-deny service, guild-bound incident lookup. |
| MET08 | Actual `deliverTurnOutbox`: uncertain send once, no resend after query/restart; acknowledged delivery separately counted. Expired interaction error counted once with closed code. |
| MET09 | 1,000 concurrent synthetic events with 100-sample bound: p50=950, p95=995, p99=999; guild/incident eviction and read-copy isolation. |
| MET10 | Native report + authorized/unauthorized Discord command preserve SQLite `total_changes`; no model access, continuation execution, dice or effects. |
| MET11 | Secret markers in prompts, model names, raw errors, source prose and private targets never appear in aggregate/incident attachments. References are salted and guild-bound; arbitrary stages/codes cannot retain secret labels. |
| MET12 | Temporary SQLite reopen retains native Fear and uncertain delivery statuses while a new collector resets timing and rotates references. Missing historical age stays unknown. |

## Persistence, rollback and remaining limits

No schema migration, new database telemetry table, resource/roll/consent rule change or campaign-data rewrite. Gameplay receipts remain the only authority. Rollback is a code revert of this phase; native historical outcomes remain usable. Removing the newly registered slash option from a live server is a separately authorized command-registration operation, not done here. Pricing configuration is optional and contains rates, not credentials; no real `.env` was read or edited.

Offline deterministic fixtures prove these instrumentation paths, not live latency, actual provider charges, Discord accessibility, staging quality scores or unlimited database load. Aggregates are intentionally not durable billing records. General telemetry never imports native private diagnostics; authorized GM recovery must inspect the real native inbox separately. V95-05 deprecation and V95-06 live pilot remain unstarted. Actual final gate results are recorded in `TYPED_INTENT_PROGRESS.md`.
