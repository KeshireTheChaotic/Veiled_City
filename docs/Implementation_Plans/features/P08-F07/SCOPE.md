# P08-F07 — Latency measurement and final changed-delta qualification

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** COMPLETE — OFFLINE MEASUREMENT PATH / UNION PASS; STAGING UNQUALIFIED  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F02…F06 safe implementations; any independent optimization may be deferred

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Measure and minimize opening orchestration cost **after correctness**, execute a single frozen union of all **fresh P08 affected-code tests**, and provide a reproducible offline handoff rather than claiming unobserved Discord/prose quality or production release readiness.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/assembly-publications.js`, `narrative-authority-context.js`, writer/brief adapter, `opening-entry.js`, `config.js` (only if needed); new tests `bot/tests/ai-gm-2026-10/p08-f07.test.mjs`

## Ordered implementation steps

1. Instrument with scoped structured data the timing of source selection, plan, authoring, native acceptance, outbox commit and first substantive publish, plus provider calls/tokens/cost *only where actually observable*. Record baseline and after counts for 0/1/2/5 check-ins; never invent latency reductions.
2. Retain the public-first source/causal barrier; evaluate **bounded private writer concurrency** only after required public scene identity is committed and if the outbox/source/recipient rechecks ensure idempotency. If unproven, hold optimization locally instead of risking leaks or duplicate effects.
3. Cache only genuinely immutable source-bound packets; identity should cover guild, session, scene, plan/source hashes, audience+recipient, principal/control revision and disclosure/visibility revision. No cross-owner secrets, mutable action outcomes, PC choices, dice, native receipts or faction clock snapshots may be replayed from an unsafe cache.
4. Avoid duplicating expensive planner/router/model calls to re-summarize existing certified hints. Preserve storytelling capability: no unapproved model downgrade or fixed narrative-length cap in a performance patch.
5. Create the new full-path P08 integration test for only changed production modules; run the **one final frozen P08 union** plus changed-JS syntax checks according to TEST_PROTOCOL. If feature batches previously failed, perform a batched repair and targeted rerun; never poll.
6. Capture actual command, inputs/test hashes, test counts/exit, source commit SHA, measured provider calls/cost, cache hit/invalidation facts, and still-unqualified areas in feature and phase ledgers. Report distinct state for static audit, offline delta, Discord staging, live provider and true release.
7. Write an explicit **not executed** staging acceptance script for a separately authorized real Discord/provider run: two owners, private threads, GM-only canary, returning party, crash/uncertain send, PC/spotlight rules and observed first-substantive latency. Do not run staging/CI, deploy, push or restart services without authorization.

## Brand-new affected-code tests

Create `bot/tests/ai-gm-2026-10/p08-f07.test.mjs` including an end-to-end deterministic fresh scenario (start empty → camera → check-ins → common incident → private narratives → acknowledged memory → resume), a privacy/authority replay scenario, and a provider-call counting matrix (0/1/2/5 PCs). It may import only newly changed production modules and new fakes. Final frozen batch is the union of `p08-f02`…`p08-f07` freshly authored affected-code tests **that were actually warranted by source modifications**, plus changed-file `node --check`; no old tests or broad validate. Document test inputs/test hashes and exit.

## Required aggregate acceptance matrix

1. GM-only canary never enters owner/public writer packets or sent units absent independent disclosure.
2. Zero-attendee camera is playable but does not complete future attendance-driven ensemble assembly.
3. Two check-ins generate one additive shared opportunity and distinct owner-private threads with no forced location, consent or affiliation.
4. Returning already-established party preserves individually saved positions and knowledge.
5. Native NPC cognition/subjective belief and relevant weighted fiction are honored without omniscient leaking.
6. Failed authoring yields truthful initial or late fallback, not fake hook success.
7. Uncertain sends, partial commits, restarts, duplicate check-ins and stale principals never blind-resend or force world effects.
8. No invented player speech, movement, emotion, dice, Fear spend, injury, or time/party changes.
9. Fixed native receipts remain verifiable and old saved readers remain compatible.
10. No unsupported claim of actual Discord responsiveness, prose quality, provider savings or release authorization.


## Acceptance / exit

The opening lifecycle now exposes source-selection, plan, authoring, native-acceptance, commit and publish metrics through bounded process-local telemetry. No optimization was applied without evidence. See [staging handoff](STAGING_ACCEPTANCE_NOT_EXECUTED.md); it is deliberately not run.

All safe scoped P08 features have accurate ledgers and completed affected-code test evidence, no unaddressed critical privacy/PC/receipt regression, qualified or explicitly held optimizations, measurable provider/latency results if instrumentation ran, and a separate live/staging release gate. P08 is **not** automatically product-certified.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.

## Corrective Follow-up — 2026-10-22

The one frozen corrective union and changed-file syntax pass are recorded in the P08/F02–F07 ledgers. It uses temporary SQLite and a mocked Discord interaction for command routing, but does not simulate a successful native outbox/Discord delivery or claim whole-lifecycle end-to-end acceptance. No provider, CI, live service or paid model was invoked. Keep staging/release unqualified.
