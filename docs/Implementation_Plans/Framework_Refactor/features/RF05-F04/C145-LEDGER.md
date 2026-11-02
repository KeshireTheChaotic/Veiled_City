# RF05-F04 C145 — Captured-owner roll review through Daggerheart–Intent

Status: complete, with full RF05 ratchet held by separate dirty source.

Starting HEAD: `305641096caf2dc38cf05e80262fae22e4fe751d`
Resulting C145 source commit: `10df9b6e2dd9b2ed6fe7323a16ffd7059069c214`.

## Delivered

- Added a fixed Native source port for the original `reviewRollDeclaration`
  function and a fixed Intent consumer port.
- Bound the source in the Native-owned legacy review module and connected the
  consumer through the existing Daggerheart–Intent pair from Application
  runtime composition.
- Routed only the Intent review adapter through that consumer. The existing
  roll preparation function and its provider path remain unchanged.
- Extended only the existing Daggerheart–Intent contract row and bridge notes.
  The legacy provider-load transition remains because `ai-intents.js` still
  imports the Native module during initialization.

## Contracts and behavior

The review provider function and Native rules are unchanged. The adapter keeps
the same operation selection, arguments, result and exception. The fixed ports
fail closed before composition and reject replacement. Composition stores a
function reference and performs no database access or state mutation. No
SQLite/schema, dice, consent, cost, receipt, publication or audience behavior
changed.

## Files changed

Production: `ai-intents.js`, `roll-declaration-review.js`,
`application/composition/intent-native-rolls.js`,
`application/composition/runtime-initializers.js`,
`application/composition/public.js`, the new Native and Intent roll-review
contracts, their two framework public APIs, and the existing
Daggerheart–Intent public bridge.

Evidence and registry: `rf05-f04-c78.test.mjs`, `C145-SCOPE.md`, this ledger,
the RF05 phase ledger, final and rejected-draft test/architecture logs,
`C145-HASHES.json`, `RF01/BRIDGE_CONTRACTS.json`, and `BRIDGE_REGISTRY.md`.

## Qualification

- Fresh test: `node --test tests/ai-gm-2026-10/rf05-f04-c78.test.mjs` — 3
  passed, 0 failed, 0 skipped, exit 0 (1255.268 ms).
- Changed-file syntax: 11/11 passed.
- RF05 architecture ratchet: exit 1; 1099 modules, 0 unowned, 4466 imports,
  589 accepted legacy, 0 transition errors, and 2 active
  `CYCLIC_IMPORT_EDGE` findings. Both are in Agent C's separate, uncommitted,
  user-paused roll-provider draft: `roll-requests.js` to
  `native-group-features.js`, and `typed-roll-proof.js` to `roll-requests.js`.
  C145 adds no active violation and changes no Agent C file. The findings are
  recorded as a qualification hold, not a pass.
- An exploratory test that invoked every runtime initializer stopped at an
  unrelated unprovided NPC strategy source. It was replaced with a feature
  test that exercises the C145 initializer and its exact Native dependency;
  the final fresh batch passed. Its initial output is retained separately.
- The first port draft attempted new Application imports from root legacy roll
  modules. The checker rejected those imports and the unregistered consumer;
  that draft was discarded. Final Application composition imports only the
  pair public API. The rejected-draft output is retained for traceability.

No legacy suite, live provider, Discord service, production database, schema
migration, or broad validation was run. Agent C's dirty source/test work and the
pre-existing dirty AF tests/disposable directory remain outside the C145 index
scope.

## Deferred and next

Roll request preparation remains on the direct compatibility path. Full physical
Native provider relocation remains deferred pending source decomposition and
pair contracts. Next exact feature: **RF05-F04 C146 — audit the frozen Narrative
delegation catalog dependency and route its original capability through the
existing Intent–Narrative pair without reclassifying its owner.**
