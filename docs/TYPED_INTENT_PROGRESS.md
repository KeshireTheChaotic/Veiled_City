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

## Deferred findings

T01 through T08, including the general T05b lifecycle, have not started. The next authorized ticket after review is T01: stable source envelopes, separate proposal/acceptance APIs, and typed coverage without native-effect changes.

Legacy `context_memory` rows without the new native audience/provenance marker are deliberately omitted from player-turn retrieval. A reviewed migration or deletion policy belongs to T05b; silently blessing their historical scope would recreate the leak. Broader salience, expiry, correction/supersession, aliasing, and semantic retrieval also remain T05b work.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.
