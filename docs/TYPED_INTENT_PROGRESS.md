# Typed Intent Refinement Progress

## T00 — reproducible baseline

Status: implementation inventory complete; baseline captured at `6c3167dbbf015739e1723272121552d60b9f2ec8`.

- [x] Preserve the modified 10.0.0 source on `codex/typed-intent-refinement`.
- [x] Record source, runtime, call graph, sinks, language consumers, records, and receipts.
- [x] Install locked dependencies and run focused offline checks.
- [x] Run the full offline validator and catalogue its independent pre-existing fixture failure.
- [x] Establish an executable T05a privacy red case.
- [x] Record the Tyrell target and the still-incomplete Billy end-to-end target.

## T05a — memory audience-isolation security gate

Status: security gate implemented and focused validation passed.

- [x] Derive persistence independently from party/player and recipient-bound private surfaces; unsupported/GM-only context cannot establish a memory.
- [x] Prevent private message text from contributing to party significance.
- [x] Bind saved summary text and provenance to the supporting surface.
- [x] Reject unsafe/legacy provenance during retrieval and prevent party-turn and cross-character reads.
- [x] Verify the inspected code has no `context_memory` path into NPC cognition or another summarizer.
- [x] Pass the focused audience-isolation, source, quality, format, syntax, typed-intent, GM-recovery, natural-language-scope, narrative-contract, and scene-entry checks.
- [x] Run the full offline validator and preserve its independent baseline failure without weakening assertions.

The fail-red baseline demonstrated that private-message-only text selected a party memory. The fail-green fixture now covers party narration, two separate private recipients, a second character owned by the same human, a forbidden cross-player private-scene message, unsafe legacy rows, surface-bound summaries, and absence of NPC-memory writes. Party generation retrieves only public/party memory; a private turn may additionally retrieve only its exact user/character scope. Retrieval also requires active, compatible source ancestry.

The full validator still stops at the previously catalogued `production-regression-test.mjs` compatibility assertion: its legacy fake authenticated turn omits required typed fields, causing a paid-retry count of two instead of the fixture's expected one. Direct runs also found that `relax-end-to-end-test.mjs` reaches three calls instead of one through the same obsolete fixture shape, and the pre-existing `autonomous-world-test.mjs` atomic-unsourced expectation no longer throws under the supplied modified typed-intent baseline. None of these independent failures was changed under this privacy-only ticket.

## T00.1 - authority stabilization and full-suite compatibility

Status: complete on 2026-10-10. Implementation commit: `c5242a490183d70f8d9d15b8bcbb716b85075b4c`; reviewed starting commit: `7786d560c9d69483684692e039c6ce27d8da13e4`. The progress-report commit is the commit containing this entry. Package version remains `10.0.0`.

Changed scope:

- Runtime: `bot/src/autonomous-world.js`, `bot/src/typed-intents.js`, `bot/src/gm.js`, and `bot/src/scene-entry.js`.
- Tests: `bot/scripts/movement-authorization-regression-test.mjs`, `autonomous-world-test.mjs`, `production-regression-test.mjs`, `relax-end-to-end-test.mjs`, `implementation-phase-c-test.mjs`, and `validate-offline.mjs`.
- Contract/release inventory: `CODEX_TYPED_INTENT_BRANCH_PLAN_v3.md`, `manifest.json`, and `MANIFEST.txt`.
- `bot/src/context-memory.js` was not changed; the completed T05a audience-isolation behavior remains in force.

Red-first evidence:

- `node scripts/production-regression-test.mjs` reproduced `turnCalls 2 !== 1`.
- `node scripts/relax-end-to-end-test.mjs` reproduced `3 !== 1` for the provider call count.
- `node scripts/autonomous-world-test.mjs` reproduced the missing expected exception for the unsourced movement proposal.
- The new targeted suite was run before the implementation and failed at SEC-01 because missing `player_intents` did not throw. This established that a narrative `scene_actions.move` could bypass typed authorization and mutate movement state.

Authority and native-effect diff:

- An executable move now requires a current, active, source-event-bound `typed_intent` for the same actor, principal, session, scene, audience, location and exact target. The typed intent must be immediate and have the existing `auto` resolution; conditional, quoted, blocked and roll-required proposals cannot execute movement.
- Missing, `null`, empty or observation-only `player_intents` cannot authorize a move. Target A cannot be redirected to target B, and an exterior approach cannot be upgraded to an interior arrival.
- The only compatibility path is an explicit `legacy_scene_entry` adapter. It revalidates the persisted owner-authored declaration, active source ancestry, actor/owner/principal revision, session, scene, audience, current location and target, then emits a durable `legacy_scene_entry_adapter` authorization receipt before native travel resolution.
- Valid unrelated legacy display fixtures may omit typed fields, but that omission is not converted into movement authority. Live structured output that omits required typed fields remains a contract failure.
- The three compatibility fixtures now use the current structured response shape and retain the original one-call expectations; no retry count was weakened.

Persistence, privacy and rollback:

- No database schema or migration changed. `legacy_scene_entry_adapter` is an additive city-record kind using existing persistence APIs. Example receipt fields include its stable record key, active source event, declaring character subject, session/scene, target, prior location, and principal-revision basis.
- Adapter receipts use `visibility=character` and `subject_key=<declaring character>`; they do not broaden a private declaration to party memory. T05a tests prove party/private surface separation, cross-character denial, safe summaries, legacy-row rejection and NPC isolation.
- Transactional negatives assert both the character location and proposed world entity roll back. `previewAuthoritativeMutation` uses the same authorization checks, creates no committed record, and consumes no RNG; native dice behavior is unchanged.
- Rollback is a revert of the T00.1 implementation/report commits. No schema rollback is necessary. Existing additive adapter receipts remain inert audit records unless a separately reviewed migration removes them.

Validation evidence:

- `npm ci`: PASS; 37 packages installed, 38 packages audited, 0 vulnerabilities.
- `npm run check`: PASS; JavaScript syntax/format coverage included 195 modules/scripts and 24 root Discord commands.
- Focused commands passed: `production-regression-test.mjs`, `relax-end-to-end-test.mjs`, `autonomous-world-test.mjs`, `movement-authorization-regression-test.mjs`, `memory-audience-isolation-test.mjs`, `typed-intents-regression-test.mjs`, and `implementation-phase-c-test.mjs`.
- `npm run validate`: PASS, 76/76 suites, including SEC-01 through SEC-09 and the unchanged T05a gate. The offline guard denied network access; `live_requests=0` and `billable_tokens=0`. No required security test was skipped.
- No bot was launched, no production campaign database was accessed, no deployment occurred, and no paid OpenAI request was made.

All T00.1 acceptance criteria are satisfied. T01 is the single recommended next phase and has not started. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Deferred findings

T01 through T08, including the general T05b lifecycle, have not started. The next authorized ticket after review is T01: stable source envelopes, separate proposal/acceptance APIs, and typed coverage without native-effect changes.

Legacy `context_memory` rows without the new native audience/provenance marker are deliberately omitted from player-turn retrieval. A reviewed migration or deletion policy belongs to T05b; silently blessing their historical scope would recreate the leak. Broader salience, expiry, correction/supersession, aliasing, and semantic retrieval also remain T05b work.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.
