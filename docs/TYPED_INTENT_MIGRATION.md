# Typed Intent Migration and Legacy Support

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Runtime authority call graph

`index.js` captures an immutable authored turn before routing. The message-span ledger currently consumes only explicit read-only recall; all remaining prose reaches semantic proposal and native acceptance. `state.js` sends accepted intents to action dependencies, rules arbitration and autonomous-world resolvers. Consequences are reconciled to native requests/receipts before the publication outbox.

General roleplay effects no longer call `worldRequirements()` or `interpretAuthoredText()` as authority. `player-language.js` remains for response obligation, invitation hints, dialogue/candidate context and creation of inert declaration records. `location-language.js` resolves already proposed referents and protected identity; it does not establish owner intent.

## Retained compatibility adapters

- Historical `scene_entry` records are readable only through `legacy_scene_entry_adapter`. The adapter rechecks owner, source ancestry, character, principal revision, session, scene, prior location, audience and destination before native travel. Its authorization receipt is not an outcome.
- `roll-language.js` retains exact owner phrases and slash/native review workflows for current pending requests. Production free-form message intake does not invoke it. Politeness, hypotheticals and model interpretation cannot spend Hope or roll dice.
- `consent-language.js` retains exact current proposal key, revision and terms matching. Production free-form message intake does not invoke it; explicit native commands/workflows remain available. Questions, counteroffers and partial agreement stay nonbinding.
- `dialogue-continuity.js` may capture verbatim authored speech for continuity, but cannot invent speech or authorize agreement.
- `authored-candidates.js` stores pending compatibility proposals only; it is not an execution path.

## Data and rollback

No SQL migration is required. Existing typed intents, legacy entry adapters, exact consent replies and native roll receipts remain readable. Unsafe legacy memory remains fail-closed. Rollback is a revert of the typed-intent phase commits; additive city records then remain inert audit history. Never migrate historical prose into fresh accepted intent, consent, spend, movement or outcome records.
