# RF05-F04 C146 — Route the Narrative delegation catalog through its pair

Move the Narrative-owned delegation catalog from the legacy source root into
the Narrative framework. Keep Intent's closed operation definitions in Intent
and expose only the feature-key and operation-list readers through the existing
Intent–Narrative pair. Route Intent's catalog reads back through a fixed
read-only Intent consumer. Application's existing Narrative initializer binds
both directions before runtime dispatch.

## Frozen source behavior and boundary

The original `delegationCatalog()` enumerates every key in `INTENT_PAYLOADS`,
collects `intentOperations(feature)`, deduplicates and sorts the resulting
`feature.operation` identifiers, filters the fixed private-eligible families,
and returns the existing authority description. Intent's configuration and
catalog operation call this function; those calls must retain their exact
arguments, result shape, ordering, filters, pagination, errors and database
behavior. The catalog remains permission eligibility only. Existing flags,
review, consent, expiry, budgets and native execution checks retain their
current owners and behavior.

The root module currently imports Intent's compatibility contract directly,
while the Intent dispatcher directly imports the Narrative-owned root module.
The pair will mediate both reads: Intent provides only feature keys and the
original `intentOperations` function; Narrative provides only the original
delegation catalog function. No contract exposes execution, persistence,
policy mutation or authority to grant permission.

## Frozen production scope

- `bot/src/ai-intents.js`
- `bot/src/delegation-catalog.js` (remove after migrating its sole source caller)
- `bot/src/frameworks/intent/ai-intent-contracts.js`
- `bot/src/frameworks/intent/contracts/narrative-delegation-source.js` (new)
- `bot/src/frameworks/intent/contracts/narrative-delegation-catalog.js` (new)
- `bot/src/frameworks/narrative/contracts/intent-delegation-source.js` (new)
- `bot/src/frameworks/narrative/delegation-catalog.js` (new owner location)
- `bot/src/frameworks/intent/public.js`
- `bot/src/frameworks/narrative/public.js`
- `bot/src/framework-to-framework/intent--narrative/public.js`
- `bot/src/application/composition/intent-narrative.js`

Application already calls `initializeIntentNarrative()` from the runtime
initializer before dispatch. Extend that initializer only; no extra runtime
sequence or database call is needed. Preserve the pair's existing context,
communication and engagement bindings.

## Qualification and records

Create a fresh Intent catalog test under `bot/tests/ai-gm-2026-10/` for
fail-closed ports before composition, repeated Application binding, actual
Intent catalog results against the frozen original formula, filtering and
pagination, and refusal to replace either original function. Also check that
the catalog source has no Intent deep import and that Intent has no direct
Narrative import. Run the new feature test, syntax-check changed JavaScript,
and run the RF05 boundary ratchet once after the source is frozen. Record the
real ratchet result, including any unrelated committed or dirty cycle holds.

Retire only the existing transition records for the two removed direct imports
and the legacy module location. Keep the existing Intent–Narrative pair and
update only its contract row, the exact ownership/crosswalk rows, and the
feature and RF05 ledgers. Do not regenerate the dependency graph while other
agents have unrelated source drafts in this shared checkout.

The RF05-F03 `LOCAL_HOLDS.json` is a frozen, unrebased source snapshot; its
matching historical entries remain there. The live transition retirements are
recorded only in RF01 `TRANSITIONS.json`.

## Explicitly unchanged and deferred

The closed Intent schema, private-family list, catalog result, delegation
configuration/persistence, adapter availability calculation, runtime flags,
native rules, consent, budgets, receipts, database schema, publication and
narration do not change. This feature does not move or broaden other delegation
policy code, nor does it claim that the remaining Intent or Narrative
frameworks are fully isolated.

Starting source checkpoint: `c2fdbd48816164e7da8288b5f1e2f7580c30ec0a`.
