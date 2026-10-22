# P10 — Reliable, playable, audience-first session openings

**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Reference SHA:** `08e965bbfb1920ac2492a2350a17e5f9785d253a` (planning snapshot, not a checkout reset instruction)  
**Status:** OFFLINE DELTA IMPLEMENTED — final 27/27 fresh tests pass; live/semantic holds in LEDGER.md; release not authorized
**Executor:** Codex Luna, Medium reasoning; one serial worker, zero subagents by default

## Problem statement / incident

On October 22, 2026, Discord showed an active Session 1 launched in automatic assembly, a roster with six pre-check-in entries, one post-start character check-in, then `Native opening: needs_review. Attempts: 1. Review reference: SESSION_OPENING.` Billy Corgie's private channel received a template containing two verbatim owner `entry_hooks`, an unknown saved position, and a generic question, **not** a playable scene. No public shared scene was observed. `No active session` appeared before start and is not by itself a bug. The source and persisted runtime trace have **not** proven the exact exception or whether a Discord send was previously committed. Do not promote the most likely race hypothesis to confirmed incident cause without reproducing it.

The current runner binds an `assemblyInputFingerprint()` (which includes mutable attendance, character principal/control revision and world context) to one opening attempt, and reasserts it after `await gm.planAssembly` and between private/public publication slots. `/vc-session present` changes that input set. Exceptions can be reduced to generic `SESSION_OPENING` and a sticky `needs_review`. Existing post-start owner entry and additive cohort work cannot always repair a missing shared camera. The owner entry path silently catches writer errors, then can publish `opening_entry_orientation` fallback. Scene setup without verified choices prints `needs native setup/history review`, with no causal detail to the operator.

## Governing contract

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` IN FULL. AI GM must be **audience-first, creative-first, agency-preserving**: inventive ordinary fiction, independent NPC/faction behavior, weighted persistence and organic leads; PCs alone decide their actions, words, feelings, intentions, locations, spending, disclosures and consent. Native services validate Daggerheart dice, Fear, spotlight, effects, damage and receipts. GM-only hooks, relationship and canon proposals are secret infrastructure, not public character material. Audience isolation applies before model input, before native scene establishment and again at Discord publication. No fallback writer can bypass these requirements.

Read `content/ENGINE/AI_GM_CONSTITUTION.md` for native authority (not as replacement for the owner spec). Respect `docs/Implementation_Plans/README.md and CODEX_START_HERE.md, DECISION_GATES.md, TEST_PROTOCOL.md, TEST_EXECUTION_NO_POLL.md`. P08/P09 ledger claims remain historical; do not overwrite or relabel their outcomes. A new narrative restriction, compulsory cadence, reduced writer expressiveness or cheaper-model downgrade needs owner approval under DECISION_GATES.

## Desired end-state

1. Starting automatic Session 1 with zero check-ins is legal. An entitled public-camera opportunity may be narrated without asserting any PC appears there, sees it or accepted the invitation. The application need not wait on all players to begin meaningful world activity.
2. Players who check in during or after planning receive correctly scoped, non-duplicated private opportunities, and when relevant may collectively receive a legitimate new shared-camera hook; neither check-in nor cohort grants co-location/party status.
3. **Mutable input revision drift before commitment** becomes bounded native rebase/replan rather than a terminal review by default. Source changes at the publication/transport boundary still enforce strict quarantine.
4. Unknown/uncertain Discord sends stay held, without blind retries; known committed, delivered and failed-unsent states have independent, idempotent, source-valid paths.
5. The normal private opener is original prose: immediate environment, a particular sensory cue, believable NPC activity/dialogue, a nonbinding prompt or tension. Its owner hook influences direction without being dumped verbatim or treated as verified outcome.
6. A missing `character.data.location` triggers intelligible owner-safe setup guidance/GM diagnostics rather than a general failure; it never licenses AI assignment of PC placement, nor freezes unrelated camera fiction.
7. Operators see exact stage and categorized hold information without sensitive prompt, provider, private hooks or GM-only details. Actual user-facing latency and writer calls are measured, not invented.

## Protected invariants (non-negotiable)

- No NPC/AI speaks, acts, thinks, feels, moves, spends or consents for a PC. Do not override ownership/proxies/guest controls.
- No native event, roleplay movement, die roll, Daggerheart effect, damage or resource mutation from planner/writer content alone.
- Start receipt, opening job source, authoring receipts, per-turn commitment and Discord outbox statuses remain independently auditable; no false generated/delivered/verified claims.
- No duplicate send after `uncertain` or `delivering`; never conflate `precommit_stale`, `postcommit_unsent` and `send_uncertain`.
- Keep legacy saved readers, exact historical attempt receipts and manual replacement authority. Do not force original attempt-2 semantics onto autonomous rebases.
- Never let owner-private hook text, hidden GM material or another player's position flow into party camera content or cross-recipient model packets; revalidate recipients at send time.
- Previously acknowledged fictional observations/memory, weighted salience and history cannot be rewritten by recovery. New ordinary invention stays provisional/authorized.
- Director pause, concurrent GM commands, actor availability, scene revisions and auth changes must fence pending writes.
- GM status/report messages are operational only and never count as delivered story.

## Features and ordering

| Slice | Scope | Main changed seams (verify at actual HEAD) | Acceptance evidence |
|---|---|---|---|
| [P10-F01](../../features/P10-F01/SCOPE.md) | Baseline, reproduction and failure taxonomy | `commands.js`, `session-opening*.js`, `assembly-context.js`, `opening-entry*.js`, current diagnostics | Repro/decision matrix, no assumed root cause |
| [P10-F02](../../features/P10-F02/SCOPE.md) | Precommit revision fencing / bounded rebase | `session-opening.js`, `session-opening-runner.js`, `assembly-context.js`, `assembly-planning.js` | Mid-planner 0→1→2 check-in works without duplicate fiction |
| [P10-F03](../../features/P10-F03/SCOPE.md) | Recovery by exact delivery/commit state | `session-opening-recovery.js`, `assembly-publications.js`, `assembly-state.js`, `publication-outbox.js` | Unsents recover; uncertain sends never replay |
| [P10-F04](../../features/P10-F04/SCOPE.md) | Shared camera / additive cohort liveness | `opening-cohort-*`, `assembly-state.js`, `commands.js`, `pvp-output.js` | Failed unsent original cannot permanently starve shared narrative |
| [P10-F05](../../features/P10-F05/SCOPE.md) | Private authored opening vs truthful fallback | `opening-entry-*`, `narrative-authority.js`, `pvp-output.js`, `gm.js` | Billy-style hooks become prose; errors traceable, privacy intact |
| [P10-F06](../../features/P10-F06/SCOPE.md) | Initial-position diagnostics / unplaced camera | `scene-setup.js`, `scene-continuity.js`, check-in handler | Missing location never assigns a PC or silences ordinary world fiction |
| [P10-F07](../../features/P10-F07/SCOPE.md) | Operator diagnostics & measured latency | `commands.js`, `operational-metrics.js`, lifecycle/status helpers | Exact hold class, calls/timing, no routine empty progress reply |
| [P10-F08](../../features/P10-F08/SCOPE.md) | Freeze, cross-boundary tests, rollback | New P10 tests + ledgers | Qualified changed delta only, explicit live holds |

Execute sequentially by feature unless safe, independent documentation is available. First reconcile the actual HEAD and check file drift. Never assume these suggested files are exhaustive or unchanged.

## State design constraints / recovery policy

Design and document a transition table in F01 before touching state machine code. Requirements:

- **Queued/never attempted:** schedule once under original authenticated GM receipt; planner may begin from verified current inputs.
- **Planning stale and no committed turn or send:** terminate/supersede the obsolete precommit worker through a source-bound native receipt, atomically acquire a new revision/fence, and perform at most one bounded immediate regenerated plan for the coalesced revision. If further churn occurs, mark a narrow `precommit_rebase_pending`/review condition without an endless retry loop. The original attempt remains in history. If existing `attempts<=2` means manual replacement, introduce an independent revision/epoch/child record rather than fabricating manual attempt 2.
- **Writer draft exists but no established fiction/turn:** inspect draft, world entity/scene claims and receipt ancestry. Only supersede on *proof* of no committed outcome; keep established facts/provisional world records and old saved readers intact.
- **Committed turn, known demonstrably unsent:** recover the exact prepared payload with native delivery authorization and no fresh AI generation; require precise recipient/auth/scene revalidation.
- **Delivered:** retain exact acknowledged Discord message and provenance; no duplicate send, no change to delivered history.
- **Uncertain/in-flight transport:** hold exact recipient+turn+part; no automatic retry; authenticated verification/reconciliation only.
- **Provider failed before commitment:** user may receive truthful non-dramatic orientation if necessary, but automatic reopening remains possible only within source-validated no-send boundaries. Never label fallback as authored scene.
- **Paused or revoked:** no commit or send; retain diagnostics and immutable receipts, resume only through authenticated current-source revalidation.

Use SQLite transactions/fences and durable unique identities for cross-process worker consistency. Existing `WeakMap` single-flight dedupe is an optimization, not a correctness guarantee. For unverified transport never trust in-process timestamps as proof of delivery absence.

## Phase-level tests and acceptance

Author fresh, changed-code-only test files under `bot/tests/ai-gm-2026-10/p10-fNN.test.mjs` with original fixtures using disposable SQLite and fake Discord/provider. Do **not** run/import/copy/modify inherited tests or `bot/scripts/*-test.mjs`. No `npm test`, `npm run validate`, CI or historical suite. Run one **blocking** batch per frozen feature, no watching/polling, then one final frozen union of only newly authored P10 tests. Record exact commands, hashes, terminal results and how tests prove the changed production path, not mocks alone. `node --check` changed JS/MJS. No paid model or network by default.

Required critical scenarios are enumerated in [P10_ACCEPTANCE_MATRIX.md](P10_ACCEPTANCE_MATRIX.md). Critical regressions include PC ownership, leaks between audiences, forgery of authenticated receipt or action authority, or duplicate send after uncertainty; treat them as a hold on the unsafe slice, not as acceptable fallback.

## Authorization, performance and delivery limits

Production DB access (including read-only), production server logs, real Discord, paid providers, push/merge, restart, deploy, release and CI triggers are **not** authorized by this plan. If owner separately grants read-only production DB inspection: use a narrowly scoped `mode=ro` connection or a read-only snapshot, set `PRAGMA query_only=ON`, preserve consistency with WAL-aware SQLite reads (do not assume `immutable=1` sees current WAL state), never checkpoint or mutate anything, and redact/private-scope output. Do not call the connection writable by accident. Never treat a reproduction with fake transports as actual Discord proof.

Measure old vs changed stage timings only where same-context baseline exists: check-in→first useful playable narration, `opening_plan`, `opening_authoring`, `opening_commit`, `opening_publish`, provider requests, calls/tokens (or `UNMEASURED`). Prefer a small number of targeted AI calls and native deterministic work, but do not sacrifice expressiveness or swap to a less creative model without owner decision. No invented latency target or savings claims.

## Deliverables / exit

- Feature SCOPE/LEDGER P10-F01 … F08 with truthful, current status and exact changed paths.
- Failures classified from saved evidence, with documented replay/rollback boundaries and precommit rebase fencing.
- Working opening path with 0 initial attendees, concurrent check-in and safe independent camera/cohort, owner-private authored scene, comprehensible setup status.
- New targeted source/race/privacy/recovery/fallback tests and frozen union with exact pass/fail counts, source/test hashes and no-poll logs.
- Report on model calls, measured latency (or `UNMEASURED`), acknowledged versus uncertain sends, source authority, limits and isolated holds.
- Rollback per feature and compatible historical readers; **RELEASE NOT AUTHORIZED** absent separate approval. An offline pass is not live prose quality, real Discord, cross-process production or deployment qualification.
