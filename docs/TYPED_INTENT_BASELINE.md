# Typed Intent Baseline

## Reproducible starting point

- Ticket: `T00`, followed only by the narrow `T05a` security gate.
- Working revision: `6c3167dbbf015739e1723272121552d60b9f2ec8` (`Intent Start`).
- Historical upstream reference recorded by the supplied bundle: `5b04fbee0aafce59c0bead15806245de513a9ea9`.
- Branch: `codex/typed-intent-refinement`.
- Package version: `10.0.0`.
- Runtime: Node.js `v24.19.0`; npm `12.1.0`.
- Plan SHA-256: `EDAD71E0DD93FBA73D43254BD781C76344E6A5215B950F5D73B965333F3784AA`.
- Source manifest SHA-256: `7225B32F30183FAD7CE38F26C50A60D98F2E24D28C708BB486CB5825030FD29C`.
- Source notes SHA-256: `BDF5D6D923565818E7BFFD38C54DC41B079458DC623CB3EBAE9B74B90A363D68`.

The starting revision is the supplied, modified typed-intent 10.0.0 source. It was not reset to the older upstream reference. No live bot, production directory, campaign database, Discord registration, or OpenAI request was used during this audit.

## Source and call graph inventory

The normal roleplay path is:

`index.js` message intake and span ledger -> authenticated context/world source capture -> `GMService.runTurn()` structured proposal -> typed-intent/context/world validation -> `previewAuthoritativeMutation()` rollback-only preview -> `commitGmTurn()` transaction -> native receipts and publication outbox.

Relevant responsibilities and sinks:

| Module | Current responsibility | Durable or consequential sink |
|---|---|---|
| `typed-intents.js` | Validates model-proposed player intent spans; persists interpreted intent/dialogue; completes eligible ordinary movement proposals | `typed_intent`, `typed_dialogue`; proposed `scene_actions` |
| `typed-mechanics.js` | Resolves accepted roll intents only at final commit | Native pending roll request/receipt |
| `context-memory.js` | Selects and stores descriptive durable memory | `context_memory` |
| `entity-memory.js` | Removes world additions that are neither named, targeted, used, nor established in narration | Mutates proposed `world_additions`; no direct DB sink |
| `gm.js` | Single structured semantic proposal, validation, preview, bounded recovery | No direct commit; calls rollback preview |
| `state.js` | Shared authoritative transaction and post-staging validation | Events, relationships, handouts, cognition, simulation, typed records, memory and audit receipts |
| `autonomous-world.js` | Captures authenticated world input, validates ordinary creation/action, and retrieves descriptive context | World events, autonomous entities/turn receipts, references, simulation entities |
| `message-span-ledger.js` | Legacy strong-boundary routing and accounting for native handlers | In-memory intake receipt passed to turn lifecycle |
| `player-language.js` | Legacy/coarse declaration classification and authenticated declaration capture | `player_declaration` world event |
| `roll-language.js` | Exact owner-authored collaboration/roll commands | Native roll contribution sources and native roll records |
| `consent-language.js` | Exact current-term owner consent/decline/defer replies | `owner_offer_reply`, `consent_reply`, then the relevant native service |
| `narrative-context.js` | Read-only referent interpretation constrained to visible sources | Character-scoped `narrative_context` only |
| `narrative-integrity.js` | Verifies consequential prose against visible authoritative/staged evidence | Rejects invalid narration; no direct sink |
| `turn-orchestration.js` | Final exactly-once transaction boundary, native dice, proposals and publication queue | Authoritative transaction, native roll receipts, outbox |

The legacy language consumers remain reachable as follows: `index.js` uses the span ledger; `authored-candidates.js`, `autonomous-world.js`, `dialogue-continuity.js`, and `scene-entry.js` use `player-language.js`; `index.js` routes exact roll and consent messages through their respective modules. These compatibility paths are intentionally not removed in T00/T05a.

## Existing records and receipts

The inspected path uses immutable/authenticated world events (`ai_gm_input`, `owner_context`, `player_declaration`, `roll_contribution`, and `owner_offer_reply`), interpreted records (`typed_intent`, `typed_dialogue`, `narrative_context`, and `context_memory`), autonomous-world receipts (`autonomous_entity`, `autonomous_turn`, plus arrival/action world events), native roll records, authoritative mutation audit records, and publication-outbox records. Canon, saved rulings, custody, consent, and native Daggerheart receipts remain separate authority lanes.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Baseline tests and findings

Setup and checks executed from `bot/` with the offline network guard:

- `npm ci`: passed; 37 packages installed, zero audit vulnerabilities.
- `npm run check`: passed; 193 JavaScript modules/scripts and 24 command schemas.
- `typed-intents-regression-test.mjs`: passed, including Tyrell's bolt and named-shop arrival fixtures.
- `gm-recovery-regression-test.mjs`: passed.
- `node scripts/validate-offline.mjs`: reached `production-regression-test.mjs` and failed at its one-call recovery assertion (`turnCalls` was 2, expected 1). The older fixture omits the newly required typed fields, so authenticated input fails typed-intent validation before optional post-turn-review quarantine can complete. This is an independent baseline compatibility failure and is not masked or repaired under T05a.

Direct execution during the final inventory exposed two additional independent compatibility failures that the ordered full runner does not reach: `relax-end-to-end-test.mjs` observes three calls instead of one for the same legacy typed-field/recovery mismatch, and `autonomous-world-test.mjs` no longer gets its expected `not authorization` exception for an older unsourced-action fixture. They are recorded for their owning later ticket and were not weakened under the privacy gate.

The Billy multi-action scenario is represented by the existing mixed-message/span and typed-intent roadmap fixtures but does not yet have end-to-end sequencing receipts for every subaction. That remains a later-ticket target; T05a must not implement it.

Confirmed P0 privacy red case: `context-memory.js` concatenates party/player prose with every `private_messages[].content` value to decide significance, then saves all selected memory at the turn's party visibility. `autonomousWorldContext()` subsequently trusts that broadened record. `memory-audience-isolation-test.mjs` makes this defect executable and fails on this baseline. `entity-memory.js` does not inspect private messages, and no direct `context_memory` input to NPC cognition was found.
