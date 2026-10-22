# P08-F06 — Truthful story coverage, entry fallback and review states

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** COMPLETE — SAFE FALLBACK / TRUTHFUL COVERAGE; PROVIDER AND DISCORD UNVERIFIED  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F03; independent parts can follow F02

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Separate **transport success**, **native accepted prose**, **dramatic intent addressed** and **actually revealed player hook**, and provide safe owner-specific late-entry orientation if authoring fails; never substitute fallback for a claimed delivered substantive scene.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/pvp-output.js`, `session-opening-runner.js`, `opening-entry-context.js`, `opening-entry.js`, `assembly-publications.js`, `assembly-state.js`, relevant `commands.js` status reporting

## Ordered implementation steps

1. Inspect `assembly_evidence`: at the reference SHA `hook_verified:false` is independent of selected source and `narrative_verified` means accepted native narrative part. Keep these semantics; do not relabel an atmospheric paragraph as an achieved character hook.
2. Add non-authoritative, provenance-bound diagnostics such as `dramatic_coverage: grounded|partial|unverified` and structured reasons tied to certified P08-F03 goals, source refs, audience and accepted native units. Diagnostic quality signals must **not** be permission for a native effect, knowledge grant or player-directed narrative claim.
3. Never accept a keyword match, raw plan text, model self-rating, or writer intention as reliable proof that the scene created a playable opportunity. Qualify source-based coverage/actual accepted content separately; ambiguous semantic quality is `unverified`, not a false pass.
4. Update GM/status surfaces so `delivered`, `fallback_delivered`, `native narrative accepted`, `coverage assessed`, `hook revealed (if independently authorized)` and `hold/unknown delivery` remain distinct. Do not change old ack records' meaning retroactively.
5. In `prepareOpeningEntryOutput()` and `deliverOpeningEntry()`, implement a source-safe, truthful orientation fallback for absent/invalid writer prose, using `openingEntryProjection()` and current owner rights with the ordinary verified outbox. Avoid dumping raw hook texts if not entitled. Mark fallback incomplete for dramatic coverage; preserve player choice, current saved position and uncertainty.
6. Protect review-only/uncertain publishes from blind replay on restart. Keep previously delivered materials intact; degraded writer can still give an owner a meaningful truthful orientation and subsequent opportunity without requiring new creative restrictions.
7. If a proposed mandatory prose form, length or compelled hook disclosure appears necessary, record explicit DECISION_GATES owner question and hold *only* that restriction.

## Brand-new affected-code tests

Create `bot/tests/ai-gm-2026-10/p08-f06.test.mjs`: accepted atmospheric but off-topic text vs substantive incident; partially accepted units; quarantined GM secret; writer exception/timeout; owner with no source; fallback with stale identity; unknown Discord delivery and exact verified ack after restart. Assert honest status transitions, no forged `hook_verified`, no duplicate text, and no false `VERIFIED_SCENE_DELIVERED` for fallback-only content.



## Acceptance / exit

Unqualified prose/failed writer does not silently count as achieved dramatic objective; late-entry owner can obtain a truthful, source-bound fallback when a safe send is available. Unknown sends remain review-held. Reporting remains meaningful rather than mechanical censorship.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.

## Corrective Follow-up — 2026-10-22

Keep native narrative acceptance, transport acknowledgement, dramatic coverage, hook selection/revelation, fallback and review as separate states. Cohort status explicitly says delivery acknowledgement does not verify dramatic fulfillment. No keyword coverage, model self-evaluation, hard quota or fixed prose form was added. Corrective evidence is in `bot/tests/ai-gm-2026-10/p08-f06-correction.test.mjs`; full restart/outbox/late-owner delivery state transitions remain unqualified.
