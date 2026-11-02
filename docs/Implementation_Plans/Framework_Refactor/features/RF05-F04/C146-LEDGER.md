# RF05-F04 C146 — Narrative delegation catalog

Status: source boundary committed; C146 metadata and qualification are in the
coordinated docs checkpoint. RF05 remains incomplete.

Source commit: `61a6fef2` (`RF05 F04 C146 move delegation catalog boundary`),
parent `75aff9729731b2f4374f47a5f94203e94619f134`.

## Delivered

- Moved the unchanged delegation eligibility catalog from
  `bot/src/delegation-catalog.js` to
  `bot/src/frameworks/narrative/delegation-catalog.js`, preserving the
  original sorted operation inventory, private-family filter and authority
  description.
- Kept the closed feature schema and `intentOperations` implementation in
  Intent. Fixed ports carry the original feature-key/operation readers to
  Narrative and the original catalog function back to Intent through the
  existing Intent–Narrative pair.
- Bound both directions in the existing Application initializer before
  dispatch. Removed only the two old direct imports and the root module
  location obligation.
- Updated the existing pair contract, Narrative ownership decision, exact
  relocation and new-source rows, bridge registry and RF05 ledgers.

## Preserved boundary

The catalog remains an eligibility inventory. It does not grant permission or
execution authority. Intent configuration and catalog operations retain their
arguments, results, sorting, filters, pagination, errors and database behavior.
Flags, review, consent, expiry, budgets, native execution, receipts, persistence,
SQLite schema, publication and narration were not changed.

## Qualification

- Fresh feature test: `node --test
  tests/ai-gm-2026-10/rf05-f04-c79.test.mjs` from `bot/` — 1 passed, 0 failed,
  0 skipped, exit 0, 1226.6827 ms. It verifies fail-closed composition,
  repeated binding, original source lists, exact catalog output, dispatcher
  filtering/pagination, no database reads, fixed-function refusal and import
  ownership. The initial fixture omitted the existing Intent–World Native
  source; after adding that fixture composition, the final test passed.
- Changed JavaScript/MJS syntax: 11/11 passed.
- RF05 architecture ratchet: exit 1; 1105 modules, 0 unowned, 4478 imports,
  586 accepted legacy occurrences, 0 transition errors and 2 active cycle
  findings. The remaining edges are `roll-requests.js:35` to
  `native-group-features.js` and `typed-roll-proof.js:11` to
  `roll-requests.js`, in Agent C's concurrent roll work. The first ratchet
  attempt also identified two invalid bridge consumer entries in this feature;
  those entries were removed and the final run has only the two cycle findings.
- No legacy suite, provider, live Discord service, production database,
  dependency graph regeneration or release qualification was run.

## Records, deferred work and rollback

Three exact live transition records were retired: the two old direct imports
and the legacy root module location. The frozen `RF05-F03/LOCAL_HOLDS.json`
and historical `DEPENDENCY_GRAPH.json` were left unchanged. Remaining Intent
and Narrative ownership obligations are not resolved by this feature. No
SQLite schema or saved state changed; release remains unauthorized.

Rollback only this slice by restoring the three transition records and the
root catalog module, reverting C146's pair/application/public/ownership changes,
and removing its new source ports, test and evidence. Preserve peer RF06/AF
changes and commits.

Next exact feature: RF05-F04 C147, selected from current ownership and bridge
obligations after peer registry and index coordination.
