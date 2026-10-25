# RF05-F03 — prompt-budget and Knowledge disclosure boundary

## Objective

Relocate the observed prompt-budget implementation into AI-provider and replace its Knowledge disclosure import with an exact two-framework adapter in `framework-to-framework/ai-provider--knowledge/`. Also relocate the independently assigned, pure read-only `scene-observation-route.js` classifier into Narrative and migrate its sole `gm.js` consumer through the Narrative public API. Remove both old root source paths after observed production callers migrate.

## Behavioral contract

Preserve the existing functions and results for request-local budgeting, complete-record omission counts, exact serialization references, context-plan/session projection, descriptive roster fields, and fact provenance. Only the `factVisibleTo` predicate determines whether a source detail can be referenced by the same request's mandatory GM-private fact section. The pair must inject the current Knowledge public predicate; do not allow caller override or broaden who can see a fact. No persistent data is rewritten. No extra narrative or gameplay limitation is introduced.

The provider module may import neutral Node crypto and its own modules. It must not import Knowledge. The pair adapter alone may import exactly the AI-provider and Knowledge public APIs. Application `gm.js` may call the AI-provider public budgeting functions and the AI-provider--Knowledge pair API. The pair's registry entry, public package path, consumer, and fresh test must match actual source.

The scene-observation classifier remains a conservative read-only optimization selector. It must not infer player intent, authorize action/effects/consent, or change which requests reach the existing semantic GM path.

## Test and execution rules

Author new deterministic tests at `bot/tests/ai-gm-2026-10/rf05-f03-prompt-budget.test.mjs` and `rf05-f03-scene-observation.test.mjs`. Exercise the moved functions and actual pair wrapper: authorized versus unauthorized private recipient visibility, mismatch/source staleness rejection, lossless mandatory native fact retention, session/context/roster projections, complete optional record selection and omission counts, safe mandatory-overflow failure, and unchanged read-only query admission. No DB, provider, Discord, historical test/fixture, broad suite, CI, production data, remote services, or polling. Run each new test file once in a frozen blocking batch, plus changed-file syntax and the RF05 architecture ratchet.

## Exit evidence

Record exact tests/terminal results, code and evidence hashes, architecture findings on touched paths and phase-wide status, rollback, zero provider spend, and limitations. The full RF05 phase remains incomplete if earlier transition debt persists; this feature does not remove unrelated RF04 holds.

The frozen transition manifest currently has 289 additional RF05-F03 records outside the explicitly implemented prompt-budget, Knowledge pair, and read-only scene-observation slices. Keep them itemized in `LOCAL_HOLDS.json`; they are not waived by these tests, and RF05-F03 must remain PARTIAL until that debt is individually resolved or assigned by owner authorization.
