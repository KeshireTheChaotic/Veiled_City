# C163 scope: Publication opening egress slots

Frozen source revision: `8de8007a701897dc8687cab148fdddfb388b1ee8`.

## Authorized slice

Expose only the five publication functions used by opening-entry and opening-cohort workflows through Publication-owned fixed ports. Publication implementations remain at their root paths. No workflow moves, transition records, test files, waivers, or unrelated narrative files are in scope.

## Provider and consumer reasoning

`createFunctionPort` binds a complete named provider map in one call. The five functions are implemented in three separate modules, so one five-function slot cannot be safely bound by each provider module. C163 therefore uses three fixed slots in `frameworks/publication/contracts/opening-egress.js`: the three output-preparation functions from `pvp-output.js`, `queueTurnPublications` from `publication-outbox.js`, and `deliverQueuedTurn` from `publishing.js`. Each slot binds the original function references at the end of its provider module and forwards calls without changing arguments or results.

The application-owned consumers are `opening-entry.js` and `opening-cohort-runner.js`. Each imports Publication's public slots and substitutes only the prior direct imports. Importing either workflow by itself remains possible, but calling a slot-backed operation requires application composition to have loaded all three existing provider modules. Production `index.js` imports `publishing.js`, `pvp-output.js`, and `publication-outbox.js` before the application starts serving commands; `tests/ai-gm-2026-10/compose-startup.mjs` loads the same modules before composed test calls. Their providers bind the original functions once at module load. No public API import is assumed to load providers, and no application-to-root import or fallback was added.

Existing callers without `compose-startup.mjs` were inspected. `p08-f04.test.mjs` calls `runOpeningCohort` only with manual/party session phases; those paths return before publication output, queueing, or delivery. `p08-f06-correction.test.mjs` only reads status. `rf04-f04-c13.test.mjs` imports workflow modules for export/source checks. The other direct workflow execution fixtures either import `compose-startup.mjs` themselves or import `p10-fixture.mjs`, which does. No current production caller invokes a slot-backed workflow operation outside the `index.js` startup composition.

## Frozen implementation files and SHA-256

Hashes cover the working-tree source after C163 edits.

| File | SHA-256 |
|---|---|
| `bot/src/pvp-output.js` | `ab9a3886bccd9ca20dfe7c54ad43f24bcdfa56cccd1ab611ba3db2712443ef4b` |
| `bot/src/publication-outbox.js` | `0364f4fca81ef17fc8dfb9a794b2d28b987c64182fe609ecff8c6756768e1a26` |
| `bot/src/publishing.js` | `e2a1e362b2948fea29d7f92de30977706a0efcfbd120c4fe4c03eb38bbc61e89` |
| `bot/src/opening-entry.js` | `04e4020c817eb8a1eaade3ff31b3f856edceff63a129d0141e25dc44d49ae800` |
| `bot/src/opening-cohort-runner.js` | `fbebd632c49ac04829cf70d1a9c0bc99fef3f8e455744d0dab1b2eb1cf42d969` |
| `bot/src/frameworks/publication/public.js` | `064efbb532e5ad11123f04a536e641250c3093b18c1d769bac075108b47d4630` |
| `bot/src/frameworks/publication/contracts/opening-egress.js` | `c54b2b57b20552f42dc7a678759644c52196bbd33934eeaa8ddfbcf83fb030bf` |

## Evidence and deferred work

Tests were not executed by instruction. No claims of runtime or architecture qualification are made. `TRANSITIONS.json` was not edited. C164 and later slices remain deferred; C164's proposed `assembly-state.js` move needs a separate ownership resolution because its current `assembly-delivery.js` dependency is application-owned.

## Coordinated metadata update

After the implementer source freeze, the coordinator preserved the six now-unused workflow-to-publication import records in C163-RETIRED.json and removed exactly those entries from RF01/TRANSITIONS.json. The pre-removal manifest hash includes the separate C161 compatibility repair. No root module location was retired by C163, and the provider implementations remain at their existing paths. Earlier statements about no metadata/test edits describe the implementer handoff, not final coordinated qualification.
