# Typed Intent Refinement Release Qualification — 10.0.0

## Outcome

T00/T00.1, T01, T02, T03, T04, T04.1, T05a/T05b, T06, T07 and T08 pass the default offline validation gate. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Safety and authority changes

- Immutable authenticated raw source envelopes, exact offsets, additive consumed-span annotations, fallible proposals and separately accepted typed intents.
- General roleplay routing no longer depends on phrase/verb matching for authority. Exact current owner roll/consent and reviewed historical scene-entry adapters remain native-gated.
- Grounded rule precedence, real pending roll requests, no-roll/native receipts, claimed-outcome isolation and Daggerheart mechanics delegated to existing native services.
- Ordered compound actions plus optional multi-actor scene windows with dependency, consent, audience, conflict, optimistic-concurrency and exactly-once rules.
- Parent/audience-scoped memory identity and epistemic revision lifecycle, preserving the completed T05a private-memory isolation gate.
- Receipt-first consequence reconciliation before audience-scoped transactional publication.

## Persistence and migration

There is no SQL schema migration. New records use the existing additive city-record/event stores: `authored_turn`, `authored_turn_envelope`, `semantic_intent_proposal`, `typed_intent`, `native_adjudication`, `action_outcome_receipt`, `compound_action`, `scene_action_window`, `scene_action_participant`, `scene_action_resolution`, `memory_identity`, `memory_revision` and `turn_consequence_reconciliation`.

Legacy unsafe context memories remain fail-closed. Historical scene-entry/roll/consent records remain readable only through their reviewed adapters and cannot become fresh authority.

## Validation evidence

- Baseline before T01: 76 suites.
- Final default gate: 85 suites, including every phase-owned regression suite.
- `npm ci`, `npm run check`, `npm run validate`, manifest integrity and diff checks are required.
- Offline guard: network denied, dummy provider credentials, zero live requests and zero billable tokens.
- No production database or live bot is used during qualification. Optional live semantic evaluation was not run because the implementation contract forbade paid/model calls.

Release-blocking counters are false success, mis-scoped NPC knowledge, unnecessary/missing roll, duplicate receipt, invalid cross-player conflict, secret leak, unauthorized effect and skipped security suite. Semantic omissions, semantic overreach and false refusal are tracked separately.

## Known bounded limitations

- Tests use hand-authored synthetic fixtures and provider doubles; unrestricted natural-language accuracy is not claimed.
- Special card mechanics and Help alongside net disadvantage still require the saved human-GM ruling already documented by the project.
- Existing exact native consent and collaboration adapters intentionally remain conservative.
- Shared action windows open only when a caller identifies meaningful overlap; harmless conversation is not delayed.

## Deployment and rollback

Deploy by pulling the validated `codex/typed-intent-refinement` branch/commit into the production checkout without replacing `.env` or `veiled_city.sqlite`. Do not start VeilKeeper automatically. Run `npm ci --ignore-scripts` and `npm run check` in the production `bot` directory if dependencies changed.

Rollback by returning the production checkout to the pre-release commit. No database downgrade is required; additive records remain inert to older code. Preserve a campaign backup before first live use, and do not delete new records during rollback.
