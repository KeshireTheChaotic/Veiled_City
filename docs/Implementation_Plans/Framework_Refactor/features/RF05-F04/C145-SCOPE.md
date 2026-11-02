# RF05-F04 C145 — Route Intent roll operations through the existing pair

Route the original `reviewRollDeclaration` operation from the legacy Intent
dispatcher through one fixed Native source port and one fixed Intent consumer
port in the existing Daggerheart–Intent pair. The Native provider binds its
original function when its legacy module loads. Application composition
connects the fixed consumer before runtime dispatch; the roll adapter invokes
that Intent consumer port for captured-owner review.

The original roll review rule provider and function remain unchanged in the
root compatibility module. Intent continues to select preparation versus
human review using the same operation order, arguments, result and exception.
Both bindings only store the original function reference; they perform no
database access, roll, cost, publication or game-state mutation. No roll rules,
consent, source checks, dice, resource semantics, receipts, schema or
private-audience behavior change.

## Frozen production scope

- `bot/src/ai-intents.js`
- `bot/src/roll-declaration-review.js`
- `bot/src/application/composition/intent-native-rolls.js` (new)
- `bot/src/application/composition/runtime-initializers.js`
- `bot/src/application/composition/public.js`
- `bot/src/frameworks/daggerheart/contracts/intent-roll-review.js` (new)
- `bot/src/frameworks/daggerheart/public.js`
- `bot/src/frameworks/intent/contracts/native-roll-review.js` (new)
- `bot/src/frameworks/intent/public.js`
- `bot/src/framework-to-framework/daggerheart--intent/public.js`

Do not edit or stage the unrelated dirty roll-rule source owned by Agent C.
`roll-requests.js` is a read-only dependency; the Native review provider gets
only its fixed source binding in `roll-declaration-review.js`.

## Qualification

Create one fresh test under `bot/tests/ai-gm-2026-10/` for missing composition,
original provider initialization, fixed-pair error forwarding, replacement
refusal, and proof that the review adapter invokes the consumer port. Run that
test once, changed-file syntax checks, and the RF05 ratchet. Preserve the
existing provider-load transition because the legacy dispatcher still imports
the module for its provider binding. Register the Application composition as
the pair consumer and extend only the existing Daggerheart–Intent bridge
metadata row. Roll preparation remains on its existing legacy path pending
Agent C's paused roll-provider work.

## Deferred

Physical relocation/decomposition of the mixed Native roll provider composition
is deferred. Its root compatibility modules depend on several Native and
external-framework services; C145 does not claim that the underlying roll
provider implementation has moved into Daggerheart. Preparation remains on
the direct compatibility path, and the review provider remains a legacy module
loaded for its single source binding.
