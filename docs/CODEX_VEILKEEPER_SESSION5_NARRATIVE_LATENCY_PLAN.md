# Codex Implementation Plan — Veilkeeper Session 5 Narrative Integrity and Turn Latency

**Prepared:** 2026-10-14<br>
**Repository:** https://github.com/KeshireTheChaotic/Veiled_City<br>
**Source baseline reviewed:** `main` at `e136a2858cc1c324a3bf2a727bb0c6c91fe0ef40`<br>
**Status:** Implementation plan only. No source, running bot, or campaign database has been modified.<br>
**Target:** Veiled City / Veilkeeper v10-era architecture.

> **Codex directive.** Execute tickets in dependency order. Start by refreshing `origin/main` and reconciling the actual source against this baseline. Work on a feature branch such as `codex/session5-narrative-latency`. Preserve existing campaign data, PC agency, epistemic isolation, native dice/mechanics, idempotent outbox and source authority. Do not deploy, restart the live bot, edit production environment variables, push into `main`, or alter production data without a separate explicit instruction. Finish with reproducible tests, a detailed implementation report, measured performance comparisons and rollout/rollback instructions. If a safety gate cannot pass, stop and report the precise blocker instead of weakening it.

## 0. User-authorized production database access: READ-ONLY ONLY

The owner explicitly permits Codex to **inspect the production SQLite database in read-only mode** for this investigation and performance diagnosis. This grants no permission to write, migrate, seed, vacuum, checkpoint, repair, or otherwise modify production state.

**Access boundaries and procedure:**

1. Determine the *actual* live DB path from the deployed `DATABASE_PATH` / launch context. The code's default is `bot/data/veiled_city.sqlite` relative to the bot process working directory; do **not** assume that default describes deployment. The reported Windows runtime source root was `D:\Library\Veiled City\bot`; treat that as a clue, not confirmation. Never echo secrets from `.env`.
2. Implement a **separate diagnostics-only reader** that does *not* instantiate `VeiledDB`, since `bot/src/db.js` constructor executes `PRAGMA journal_mode=WAL`, schema creation/migrations, and `PRAGMA user_version`. Instead create a separate `node:sqlite` `DatabaseSync` handle using the version-appropriate `{ readOnly: true }` option, and set the connection-local `PRAGMA query_only=ON`. Use prepared `SELECT` statements with bound parameters and bounded row limits. Restrict the reader to an allowlist of tables/columns or narrowly defined query methods; do not expose arbitrary SQL writes or shell access through the helper.
3. Where available, enforce read-only access with a dedicated Windows OS identity/ACL that can read the production DB and necessary existing WAL/SHM sidecars but has **no write/modify/delete rights** to the production DB, its sidecars or directory. Node's read-only option and `query_only` provide additional guards, not a substitute for ACLs. Explicitly verify the production reader cannot execute `INSERT`, `UPDATE`, `DELETE`, DDL, `VACUUM`, WAL checkpoint, `ATTACH` writes, or `PRAGMA journal_mode` changes. Verify no timestamps/hashes of DB/WAL/SHM are changed by diagnostics. Avoid opening SQLite CLI sessions with implicit write capability.
4. **Live WAL caveat:** read-only SQLite access may depend on an already available `-wal`/`-shm` and compatible permissions. Do not use `immutable=1` against a changing live DB: that can ignore concurrent WAL changes and give an inconsistent view. If strict read-only live opening fails, stop instead of changing filesystem permissions or sidecars. Request a production-managed, consistent SQLite online-backup **to a separate protected diagnostic location**; the backup process is outside Codex's authorization and must be approved separately. Codex may read that snapshot, not create/modify it on production.
5. No credential, user ID, character secret, player-private content, prompt, original fact text, or full database row may appear in committed files, console summaries exported into Git, unit fixtures, public Discord output, or model API requests for diagnosis. Keep evidence local and minimal; report identifiers hashed/redacted except those explicitly supplied for debugging. Inspect raw values only locally as necessary. Use synthetic equivalents for tests.
6. Read-only authorization is **not** permission for live model/API tests, live command execution, importing a state fixture into production, force pushing or bot restarts. Production DB is evidence, never a writable test fixture. Full tests must use disposable synthetic DBs and network-denied guards.

**Targeted DB forensics (do first):** inspect the live session and failed turn records, `turn_attempts`, relevant event/ledger/provenance records, the fact with ID `7e574351-5c9c-4417-a798-0270ee5fd1a5`, entity `1e941225-63ef-49eb-80bf-98ed64a97dd1`, record category/visibility/subject/source ancestry/archived status, `pvp_output_quarantine`, `candidate_claim_review`, `pvp_output_part`, saved delivery receipts, and assembly plan/delivery status. Derive column names from `PRAGMA table_info` before writing the query. Verify whether failure was absent/archived fact, exact proposed-content mismatch, or party-audience visibility mismatch; the existing diagnostic does **not** distinguish them. Correlate timestamps by session and message IDs. Do not promote any discovered secret into party context while logging.

## 1. Existing behavior to preserve and defects to reproduce

### Observed Session 5 incident

- Players Tyrell Williams and Billy Corgie check in after session start with `assembly:auto`.
- At 09:24 the player requests **“Set the scene”**. After a progress notice the reply becomes **“No additional character response has been established. Independently authorized actions remain in effect.”**
- At 09:26 the player asks **“What is my current situation?”**. Validation rejects a `disclosure` claim (`NARRATIVE_INTEGRITY`, category `scoped_disclosure`), error reference `d6293831`; no generated consequences commit.
- Session end archives only previously delivered, source-verified text, so the neutral response is repeated instead of a fresh recap.

### Confirmed code paths

- `bot/src/narrative-integrity.js` disclosure validation (around lines 263–274): rejects a missing/archived fact, an exact-content mismatch, or a fact invisible to the claim audience. It checks NPC knowledge and active evidence separately.
- `bot/src/state.js` around line 562: `validateCandidateClaims()` audits the **original** candidate annotations during transactional preview, even after publication projection has held unauthorized prose. `previewAuthoritativeMutation()` rolls back its provisional effects.
- `bot/src/narrative-integrity.js` `validateCandidateClaims()`: narrowly recovers unpublished world/status annotation categories `actor_status` and `uncertainty_framing`, but **not** `scoped_disclosure`.
- `bot/src/gm.js` around lines 758–845: failed preview can trigger a full replacement model request. Second-stage fallback handles only selected errors; repeated `scoped_disclosure` escapes and fails the turn. `recoverOptionalTurnFields()` currently excludes `NARRATIVE_INTEGRITY`.
- `bot/src/pvp-output.js` `prepareAuthorizedTurnOutput()`: unverified model prose is GM-only draft; only native-proven parts are published; if there are no parts, it publishes the hardcoded `neutral` string. This behavior applies **even when no PvP is occurring**.
- `bot/src/gm-world-narrative.js`: v1 closed scene atmosphere is extremely narrow (room hum, coffee, soft light, quiet pause); v2/v3 extend supported NPC dialogue, **not expressive whole-scene narration**.
- `bot/src/gm.js` around line 727: responsiveness is checked on the **candidate** `narration`, before projection can replace it with neutral text.
- `bot/src/commands.js` around lines 817–868: `assembly:auto` still requires `/vc-session assemble` to generate/deliver public opening and scoped hooks. The supplied transcript does not show that command, but verify command history before treating that as proven absent.
- Existing `candidate-claim-quarantine-test.mjs` and `v96-candidate-audit-test.mjs` reuse the laundromat / Night Owl / three knocks scenario, but exercise **world status** categories rather than the failed disclosure path.

### Architecture invariants — nonnegotiable

- No free text, JSON annotation, model safety label, arbitrary class of fact, fictional recap or GM assertion can mint an authoritative state effect or publication permission.
- Preserve native source/event ancestry, exact audience scope, PC ownership, consent, PvP authorship, scene continuity, dice, Hope/Fear/resources, obligations, custody, encounter state, separate personal/party knowledge and current lifecycle.
- Never simply disable `scoped_disclosure`, delete the candidate audit, change fact visibility, trust GM-only context as party-visible, or pass publication merely by removing `narrative_claims`.
- A genuinely unsupported committed disclosure or consequential mutation **must** fail and roll back. Independent previously committed native receipts must not be replayed or revoked to repair prose.
- Do not turn invalid source passages into player-facing error excerpts or archive them as new fiction.

## 2. Workstream A — Narrative correctness and engaging publication

### NAR-01 — Exact live reproduction and safely classified diagnostics (P0)

Use the restricted production reader to determine the precise failed disclosure predicate, without outputting the fact content into ordinary logs. Reproduce it in a synthetic fixture with the same audience relationships, exact-content handling, and `source_ref` type. Add an internal, redacted diagnostic reason code (e.g. `fact_missing`, `fact_archived`, `content_mismatch`, `audience_denied`) without leaking underlying fact content or audience identities. Verify no sensitive diagnostic reaches a public channel.

**Acceptance:** deterministic synthetic fixture fails on the exact intended check, and the read-only production inspection provides a conclusive reason or an explicit evidence gap.

### NAR-02 — Quarantine only genuinely unpublished, independent invalid candidate annotations (P0)

Extend `validateCandidateClaims()` and the turn-preview integration to support *selective, proof-bound* quarantine for a rejected `scoped_disclosure` annotation **only if all** of the following can be independently proven:

- The rejected span exists only in held/unpublished candidate surfaces; no matching material or synonymous disclosure was promoted by a native-approved part, private message, stored context/knowledge, state event, handout, authoritative world addition, recap or outgoing publication.
- The specific fact/content claim is not a prerequisite for any staged mutation, action, native result, other annotation or model-produced output part. An ambiguous dependency is fatal rather than waived.
- The remaining **complete candidate** still passes all native claim, actor, source, ancestry, completeness, scope, PvP and mutation checks. Review remaining claims together, so removing one annotation cannot hide an undeclared material assertion or sibling violation.
- All original candidate bytes, output proof, source identity and recipient bindings are preserved in GM-private review, with redacted public/aggregate reporting. The model cannot set a `recoverable` flag or forge the projection.

Prefer a narrow explicit reject/quarantine result type with reason codes over a broad ignore list. Consider any raw text needing private scope review *unpublishable* regardless of annotation recovery. If separation cannot be formally proven, retain fatal rollback. Keep direct unprepared validation strict.

**Acceptance:** a held private disclosure no longer kills a completely independent, receipt-backed safe response; a secret disclosure on any authorized/public surface, ungrounded NPC knowledge, conflicting native event, or other-PC consequence still fails. No partial mutation survives failed validation.

### NAR-03 — Source-grounded, expressive environmental narration (P0; distinct from disclosure waiver)

Create a new **native source-bound scene-description lane** rather than trusting entire generated prose or endlessly adding canned strings. The output composer should take a typed, authenticated scene envelope: active scene/location and time, current roster/scene occupancy, recipient scope, authorized environmental observations and active evidence references, attribution, and permitted harmless sensory/atmospheric material. Support natural prose variation while keeping the proof boundary independent of model assertion:

- Treat verified observations and supported ordinary ambiance as different classes. An established sign, wet floor, door, noise, lighting and smell can become a scene sentence without making each adjective a status/canon mutation. Constrain source-backed claims to exact accessible evidence; no character-private facts in public narration.
- Add bounded renderer/composition grammar or another deterministically auditable semantic representation with typed claims and a receipt/source closure. Do **not** claim an LLM classifier or string matcher alone proves arbitrary unrestricted prose safe.
- Let GMs evoke setting, tension, spatial relations and sensible sensory details; separate an ephemeral, nonconsequential description from actual new state. Preserve explicit uncertain framing for hypotheses, impressions and rumors.
- Provide player-specific views when two PCs are not co-located or have different knowledge; avoid universal party omniscience. No forced PC feelings/actions or automatically completed movement.
- No other-PC dialogue, attack, bargain, damage, discovered secret, possession, status, arrival, NPC-private knowledge or result may be inferred from the description.
- Bind exact publication bytes to scene/recipient/source hashes and revalidate at outbox delivery/restart/archive. Keep private unapproved prose quarantined.

**Acceptance:** the synthetic Night Owl / Twenty-Four Spin scene provides a substantive, evocative description using only truly visible/sourced details; the same fixture with a Tyrell-only secret **never** includes that secret on the party surface. Varying safe atmosphere does not require new canon writes. A new fixture with no usable evidence returns a specific, scoped truthful limitation rather than the misleading universal neutral fallback.

### NAR-04 — Responsiveness after projection, not before (P0)

Define a **post-projection answer contract** for scene-setting, situation/observation, NPC conversation and ordinary player roleplay. Assess *authorized* output, not the held `result.narration` field. Identify the actual responding intent from grounded typed input. If projection produces only a neutral part on a scene/situation request, recompose from eligible native observations / approved atmosphere and the actor's own saved position; if that is impossible, return a truthful owner-safe explanation with what evidence is absent and how to proceed. No ungrounded original prose fallback, forged source, leaked private facts or extra state effect.

Guarantee the final public/private output has a real answer appropriate to the request and subject, while preserving agency. Distinguish ordinary observational prose, questions, action adjudication and state review. Add aggregate metric for `answerless_projection` and suppress the inaccurate `respond:true` success classification for neutral-only scene requests.

**Acceptance:** both Session 5 prompts produce meaningful, correct actor-visible output; neutral-only publication for these prompts becomes a tracked failure/recovery, not a success.

### NAR-05 — Assembly-ready opening and archiving (P1)

Surface the existing `/vc-session assemble` requirement clearly when `assembly:auto` is pending and players are present; avoid treating `present` as having completed assembly. Provide GM-only assembly status and a safe option to invoke/continue idempotent assembly. Do not generate duplicate public opening or private hooks, or automatically expose them in a spontaneous scene-setting reply. Preserve established-party rejoin behavior. Confirm the exact Session 5 assembly state from read-only evidence.

Archived recap must continue to certify actual delivered text; do not invent a recap from failed raw model output. Once substantive narration is delivered, archive it normally. Avoid publishing the neutral acknowledgment as if it were a useful historical scene recap without a truthful label.

## 3. Workstream B — Measure and reduce end-to-end response latency

### Known latency characteristics to verify at runtime

- Routine GM already defaults to `OPENAI_ROUTINE_GM_MODEL=gpt-6-luna`, router to `OPENAI_ROUTER_MODEL=gpt-6-luna`, complex Director to `OPENAI_GM_MODEL=gpt-6.1-sol`. `OPENAI_REASONING_EFFORT=low` by default. Check **effective deployed settings**, not only `.env.example`.
- `GM_PROGRESS_AFTER_MS=20000` currently posts exactly the observed progress notice if GM generation has not finished; changing only this timer is *not* a response-speed fix.
- `GM_TURN_DEADLINE_MS=120000`, `ROUTER_DEADLINE_MS=20000`, `OPENAI_MAX_RETRIES=1`; structured-output repairs and a full validation retry can add provider round trips. The router runs before GM generation. The keyed serial queue and pending World Director can also add wall time.
- In `bot/src/index.js`, a pending Director pass can be awaited *before* routing and GM output. Do not remove independent in-world consequences merely to improve speed.
- `bot/src/operational-metrics.js` already tracks bounded stage p50/p95/p99 and token usage, but model timings alone are insufficient to diagnose capture→first Discord-visible output.

### LAT-01 — Baseline instrumentation with no secrets (P0, first performance ticket)

Measure per logical turn (synthetic turn key, no raw user IDs/content):

1. Discord received→queue wait→authenticated native span handling→pre-Director wait/execution→router dispatch/response→context build/selection→GM provider request(s)→isolated NPC writer if used→native preview/validation→commit→outbox queue/delivery→first authorized Discord publication.
2. Counts: model calls and duration by request purpose/model, total input/output/cached/reasoning tokens where reported, retries (provider/parse/validation), error categories, neutral/projection quarantine frequency, local SQLite reads/query latency, queue depth and duration, pending Director work, private fan-out, voice excluded from text latency.
3. End-to-end p50/p90/p95/p99, and percent of turns that exceed 10/20/30 seconds. Separate routine observational requests from mechanical rulings, first-session assembly, complicated scene transitions and network/provider failures. Record time to **first substantive** publication, not mere typing/progress message.
4. Use existing GM-only operational diagnostics as the starting point, extend redacted aggregate counters where needed; no raw prompts, secrets, fact text or player identifiers in metrics. Production live metrics may be observed read-only; fresh test calls require separate approval.

Generate a repeatable baseline CSV/JSON **without private campaign data**, using synthetic test fixtures and aggregate production timings where available. Set initial SLA as **provisional**: routine p50 < 10 s, p95 < 20 s, fewer than 5% routine turns need a progress notice, with no reduction in accepted safety/response quality. If the baseline shows an infrastructure limitation, report the actual achievable target rather than inventing improvements.

### LAT-02 — Eliminate unnecessary serial provider calls (P0)

- Profile the separate `GMService.shouldRespond()` call. Preserve nonlexical RP engagement and actual participant/source authority. Only bypass the router for **unambiguously authenticated** direct bot mentions / dedicated GM commands or other demonstrably correct deterministic cases; never use a loose keyword classifier as gameplay authority.
- Shadow-test OpenAI's **Decisions API** (`gpt-6-luna` public beta) as a lower-latency, **engagement-only** router. It is documented as ~10× faster than Responses for typed classifications, but test real correspondence on the bot's scene/OOC/roleplay/indirect-request fixtures first. Requires SDK compatibility and feature flag. A routing score must not adjudicate mechanics, disclosure, NPC identity or PC intent. Default to the proven existing router on uncertainty/refusal/error; do not lose in-character turns due to false negatives.
- Check whether pre-Director work can occur **after** initial player-visible response when independent, without violating scene chronology, causal order, committed effect or concurrency. If not, keep it serialized and show separate measured duration. No speculative parallel DB mutations.
- Prevent redundant full GM generation for safely quarantinable *unpublished* output defects after NAR-02. Preserve bounded retries for genuinely consequential errors and malformed JSON. Compare the number of provider requests per completed turn before/after.
- Cache only immutable/static content with explicit revision and tenant/scope invalidation. Do not cache actor-private fact projections across owners or scenes. Respect V96-06 required context and the comprehensive structured-output schema.

### LAT-03 — Faster model / reasoning configuration experiments (P1; benchmark-gated)

The current default routine model is already **GPT-6 Luna**, which is substantially cheaper than GPT-6.1 Sol. Prefer keeping Luna for normal table narration instead of indiscriminately downgrading quality. Evaluate in *offline replay or explicitly authorized staging*, in this order:

- A: current `gpt-6-luna`, reasoning `low`, current request path (baseline).
- B: `gpt-6-luna`, reasoning `none` for **routine response generation only**, if current provider/API support and tests confirm that schema completion, authored intent extraction, disclosure isolation and narrative quality do not regress. Keep higher effort on hard adjudication. Use per-operation efforts rather than blindly applying one global value.
- C: same Luna GM, faster engagement router via a validated Decisions API path, or eliminated router for proven-safe cases.
- D: limited, explicit complexity escalation to `gpt-6.1-sol` for a difficult GM ruling or genuinely complex world pass, never as automatic retry of invalid secret claims and never based on raw model self-rating. Measure marginal latency, errors and price before enabling.

Do not reduce maximum output tokens speculatively: V96-06 explicitly found the combined structured GM response requires a complete schema and has no validated lower safe ceiling. Instead reduce redundant output and sequential round trips when verified safe. Keep `OPENAI_REQUEST_TIMEOUT_MS`, retries and full operation deadline bounded; do not merely suppress the progress message or silently increase the deadline. No paid A/B API testing until separately authorized.

**Reference prices (OpenAI public model pages, October 2026; check again before a live pricing decision):** `gpt-6-luna` standard $0.10 input / $0.50 output per million tokens; `gpt-6.1-sol` standard $2.00 input / $10.00 output per million tokens. The price ratio is 20:1 at equal token usage, but neither price nor relative model size guarantees a specific measured latency. Rates vary by processing mode and caching.

### LAT-04 — Progress-notice UX without hiding poor latency (P1)

Use typing indicators while processing. Keep an *accurate and configurable* delayed message only for genuinely slow turns, preferably after the provisional p95 threshold once benchmarks support it. Distinguish “generation in progress” from “publication/committed state” without inventing state guarantees. Avoid duplicate progress replies on retried or resumed turns. A progress message must stop when the turn is delivered/failed and should not be counted as substantive response. Consider a configurable progress-notice disable option for operators who prefer typing-only feedback; never treat disabling it as performance improvement.

**Acceptance:** ordinary turns under the target latency never post the 20-second message; over-threshold and failed turns retain correct, nonmisleading status; no duplicate notifications or stale timers.

## 4. Workstream C — Tests and release gates

### Required negative/positive matrix

Build new **red-before-green** test cases for every tuple below in both `party` and `private` scopes where meaningful:

- Fact present/absent, archived/active, current/retracted ancestry; proposed exact-match vs mismatch; visibility public/party/player/character/GM; acting Tyrell vs Billy, narrator vs known NPC; existing NPC source knowledge vs GM-only knowledge; shared scene vs separated PCs.
- Rejected private-only candidate annotation with **independent** safe narration and native receipt, plus disallowed event dependency, sibling claim, material paraphrase, invalid PvP owner clause and post-projection secret leak.
- Actual `GMService.runTurn()`→preview→commit→outbox→restart→revalidation→archive for a full scene request and a situation request; both must receive meaningful authorized text, not a generic neutral fallback.
- Pending vs completed auto-assembly; repeated `/vc-session assemble`, delivered/not-delivered private hooks; returning party unchanged.
- Provider error, incomplete structured output, correction exhaustion, deadline, router false positive/negative, partial outbox delivery, restart/replay/idempotence and no repeated resource effects.
- Fast-route semantic equivalence across paraphrases, indirect NPC approaches, player-only chat, OOC, in-character monologues, rules questions and authenticated bot mention; refusal/error defaults to safe engagement behavior.
- Performance tests use controlled fake provider waits and counters, not paid calls. The latency target and no-increase-in-provider-calls should be verified with measurements; artificial mocks do not prove real latency.

### Mandatory qualification

Run relevant focused tests; then the full existing repo-specific `npm run check`, `npm run validate`, D08 security/observability and campaign isolation, PvP authorship, scene continuity, narrative inference, native effect, publication/outbox, state rollback, source integrity and character knowledge tests. Keep test registry, source manifest and historical regressions intact. Run network-denied tests on synthetic temp databases. Document every altered test expectation; do not weaken a negative test to make the build green. Track any compatibility/migration changes before rollout.

Collect a concise outcome report including baseline/head SHA, changed modules, exact reproduction status, read-only diagnostic findings (redacted), safety matrix results, end-to-end p50/p95, model calls/turn and token-cost estimates, neutral-output rate, test suite counts, rollback steps and unresolved risks. **No claim of a production speedup until measured in an approved live/staging deployment.**

## 5. Recommended commit order and rollout

| Order | Ticket(s) | Output | Gate |
| --- | --- | --- | --- |
| 1 | RO-01, NAR-01, LAT-01 | Safe production read-only incident diagnosis + synthetic failing tests + baseline | No prod mutation/secret leakage; reproduction confirmed |
| 2 | NAR-02 | Narrow unpublished `scoped_disclosure` quarantine/recovery | All disclosure/commit/PvP negative cases green |
| 3 | NAR-03, NAR-04 | Source-bound expressive scene output and post-projection response obligation | Both Session 5 prompts answered safely; no neutral-only successes |
| 4 | NAR-05 | Assembly readiness and recap experience | No duplicate opening/private hooks, archive preserves proven text |
| 5 | LAT-02 | Reduced unnecessary router/generation requests | Quality/security equivalence; measured fewer calls |
| 6 | LAT-03, LAT-04 | Benchmark-gated model tier/effort selection and user-facing progress UX | Latency/cost improve without model or security regressions |
| 7 | REL-01 | Integrated validation, staged canary plan, rollback | Full suites green, operational proof complete |

**Rollout and rollback:** Keep all new output and routing paths behind default-off feature flags. First run synthetic/offline qualification, then request owner approval for any billable staging and live canary. Canary with one test guild and opt-in participants; monitor p95 end-to-end, neutral/answerless rate, source rejects, cost, retries and publisher revalidation. On regression revert flag configuration/code while preserving already committed native effects, receipts, schemas, records and publication hashes. Never roll back production DB to make an output test pass or rewrite previously delivered party text.

**Final Codex deliverables:** code + tests on an isolated branch, updated docs/config examples, read-only diagnostic report with redaction, performance baseline and comparison, explicit feature-flag rollout plan, tests/coverage table, and clear `READY` / `BLOCKED` decision. Do not silently merge or deploy.

## 6. Source references for Codex

- Commit baseline: https://github.com/KeshireTheChaotic/Veiled_City/commit/e136a2858cc1c324a3bf2a727bb0c6c91fe0ef40
- Narrative checks: `bot/src/narrative-integrity.js`, `bot/src/state.js`, `bot/src/turn-recovery.js`, `bot/src/pvp-output.js`
- GM & model routing: `bot/src/gm.js`, `bot/src/index.js`, `bot/src/config.js`, `bot/src/operational-metrics.js`, `bot/src/prompt-budget.js`
- Scene presentation: `bot/src/gm-world-narrative.js`, `bot/src/nonmaterial-grammar.js`, `bot/src/commands.js`, `bot/src/publication-outbox.js`
- SQLite persistence: `bot/src/db.js` (**do not instantiate against production when read-only**)
- Existing tests: `bot/scripts/candidate-claim-quarantine-test.mjs`, `bot/scripts/v96-candidate-audit-test.mjs`, related `v96-*`, `v9-*`, `d08-*` security suites
- Existing contract: `docs/V96_05R_OUTPUT_CONTRACT.md`, `docs/V96_06_CONTEXT_CONTRACT.md`, `docs/V96_PROGRESS.md`, `docs/OPENAI_SETUP.md`
- OpenAI latency: https://developers.openai.com/api/docs/guides/latency-optimization
- OpenAI Decisions beta: https://developers.openai.com/api/docs/guides/decisions
- Model reference: https://developers.openai.com/api/docs/models/gpt-6-luna and https://developers.openai.com/api/docs/models/gpt-6.1-sol
