# C179 — Retire the root city-civic composition shim

**Status:** read-only source and transition review; proposal only. No runtime, manifest, or test files changed and no tests/checks run for this design.  
**Reviewed HEAD:** `8bd7667708cfa7eb38a9a21eec8fa30b9801075a` (`codex/clean-ai-gm-2026-10`), 2026-10-29. Shared worktree contains concurrent C176/C177 work; source hashes below describe the observed worktree, not clean HEAD files.  
**Proposed owner/slice:** World, RF04-F01, C179. The existing Intent and Application import edges are exact prerequisites: RF05-F02 and RF06-F04 respectively.  
**Applicable authorization:** `phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` (2026-10-28) authorizes only exact RF06 migrations needed to close RF04, each with its own caller/saved-reader review, scope, records, evidence, and rollback. This proposal includes only the one `city-commands.js` import edge that prevents retirement of this World root. RF04 scope permits RF05 work while RF04 is incomplete; it does not broaden any other migration.

## Proposed bounded change

Delete the four-line compatibility/composition module `bot/src/city-civic.js`. The implementation already resides in `bot/src/frameworks/world/city-civic.js`, and World’s public API already exports its civic functions and the related infrastructure/history functions.

Move the existing one-time `worldCityCivicSource.bind({updateCityCivic})` from the root shim into the canonical World module. Import `worldCityCivicSource` directly from `./contracts/root-sources.js` in `frameworks/world/city-civic.js` and bind its existing exported `updateCityCivic` function there at module evaluation. Do not import through `frameworks/world/public.js` from the canonical module: the public barrel re-exports the canonical module, so a direct local contract import avoids a barrel cycle. `root-sources.js` and the World public exports already contain the needed port and function names and need no change for this design.

Repoint the two World-owned consumers and one Application consumer to `frameworks/world/public.js`:

- `city-consequences.js`: `changeCityService`, `transmitCityBelief`.
- `simulation.js`: `applyNpcServiceOutcome`.
- `city-commands.js`: `CIVIC_KINDS`, `updateCityCivic`, `connectCity`, `changeCityService`, `reviewCivicChange`, `transmitCityBelief`, `historyContext`.

For `ai-intents.js`, route the existing `attemptCityInfluence` call through the existing Intent-owned `intentWorldOperations` fixed port. Extend that port by the one observed operation, import the same original World function in the existing `intent--world` adapter, and include it in that adapter’s one existing bind. Replace the direct root import with the same thin port-forwarding style already used for the other operations in `ai-intents.js`. This uses the existing World-to-Intent pair and adds no new adapter, port, startup initializer, or public barrel. A narrower new consumer is not justified by the observed call graph: this is one more World operation invoked by Intent, while the existing Intent port already carries World operation, receipt, and lookup functions.

`frameworks/world/public.js` already re-exports `CIVIC_KINDS`, `updateCityCivic`, `reviewCivicChange`, `transmitCityBelief`, and `attemptCityInfluence` from the canonical civic module; it also re-exports `connectCity`, `changeCityService`, `applyNpcServiceOutcome`, and `historyContext` from their current World modules. No exports need to be added.

## Caller, identity, and module-load evidence

A production-source search over `bot/src`, `bot/scripts`, and `bot/tooling` found these four importers of the root module: `ai-intents.js:22`, `city-consequences.js:4`, `city-commands.js:7`, and `simulation.js:13`. `frameworks/world/public.js:95` is the existing canonical civic export, not a root consumer. No fifth runtime importer was found. Historical test and inventory mentions are not production importers and are outside this retirement’s proof boundary.

The root currently imports `worldCityCivicSource` and `updateCityCivic` through World public and binds the function once at module evaluation (`city-civic.js:2-4`). The port is also consumed by `connectKnowledgeWorldCommunity()` in the existing Knowledge–World adapter (`framework-to-framework/knowledge--world/public.js:43-45`); `initializeKnowledgeWorld()` calls that adapter (`application/composition/knowledge-world.js:6-15`). The canonical module can preserve the exact provider object and function identity by binding its own `updateCityCivic` export to the same existing singleton port. The function implementation and `CIVIC_KINDS` array remain defined and exported once from the canonical module; do not wrap, clone, or reconstruct either.

The World-to-Intent adapter currently binds `intentWorldOperations` from the original World functions (`framework-to-framework/intent--world/public.js:26-29`). `initializeWorldExecution()` already calls `connectIntentWorldOperations()` (`application/composition/world-execution.js:1-9`), and `index.js` invokes `initializeWorldExecution()` before `initializeKnowledgeWorld()` and before Discord handling (`index.js:44-57`). `ai-intents.js` already forwards its other World operation calls through this same fixed port (`ai-intents.js:34-35`); its influence handler calls `attemptCityInfluence` at line 326. Add the operation to that existing binding rather than changing startup order. The added call will have the same fail-closed-before-composition behavior as the existing methods on this port; production startup already composes it before handling interactions. Static review found no module-load caller of `attemptCityInfluence` or `updateCityCivic`.

The production changes must preserve original function bodies, named export identity, the original `CIVIC_KINDS` array identity, argument order/spread and return/throw behavior, the `updateCityCivic` source-slot binding, and all saved civic/service/transmission effects. No database format, schema, rules, authority, costs, receipts, command response, or bootstrap order change is proposed.

## Exact transition records

Retire only these three records when the source changes are complete and their exact objects are saved in the C179 retirement archive:

| ID | Record | Assignment and treatment |
|---|---|---|
| `73addb073f481529f50a9510f974368b57d0aa3cca02d5ef1a31f079070507b2` | `LEGACY_MODULE_LOCATION`, `bot/src/city-civic.js` | World / RF04-F01; retire when the four-line root is physically absent and its binding has moved to the canonical World module. |
| `778dc7b714618af8b2b3459f2df224ebc0788cbd6bcdbaecd56349f9c3dd45ba` | `DIRECT_CROSS_FRAMEWORK_IMPORT`, `ai-intents.js` → root `city-civic.js` | Intent / RF05-F02; retire when the same function is consumed through the existing Intent-owned fixed port and its World adapter binding. RF05 work may proceed while RF04 is incomplete under the current phase scope. |
| `3bf69e61c8b8a45d60e0ad61389c6f6d1b13e989206450f2dee635c6c129bdc6` | `IMPORTS_PRIVATE_API`, `city-commands.js` → root `city-civic.js` | Application / RF06-F04; retire when the command imports the existing World public API. This is the one exact RF06 prerequisite migration in the proposed slice, covered only by the owner authorization cited above. |

The same-owner imports in `city-consequences.js` and `simulation.js` have no matching transition record to retire. Do not add or broaden records for them. Do not retire the separate `city-consequences.js` module-location record or unrelated civic records. Confirm all three IDs still exist unchanged immediately before a later implementation, since the shared transition manifest is currently dirty from concurrent work.

## Verification plan (deferred; not executed)

The repository `TEST_PROTOCOL.md` prohibits legacy suite reuse and polling. After C176/C177 work is frozen and the source batch is authorized for execution, author one fresh C179 test under `bot/tests/ai-gm-2026-10/` that imports changed production modules only and covers: the source port’s single canonical provider and original-function identity; the existing Intent port’s pre-composition failure and startup adapter’s binding of the same `attemptCityInfluence`; the influence intent’s unchanged payload key and result behavior; and a focused civic command/consequence/simulation case verifying their public exports resolve to the original implementations without changing saved outcomes. Use feature-local fakes or disposable SQLite only as needed; no network or production database.

Freeze that changed-code set once, then use one blocking fresh test invocation. Syntax-check only changed JS/MJS. Run only the specifically authorized RF04 architecture ratchet after source and fixture authoring. Record source/test/input SHA-256 values, full command, count, exit status and per-case results, and archive only the three exact transition objects. Do not run, import, migrate, or repurpose historical suites or fixtures. No C179 verification is claimed by this design.

## Source snapshot and hashes

Hashes are SHA-256 over the current shared worktree on reviewed HEAD `8bd7667708cfa7eb38a9a21eec8fa30b9801075a`; concurrent changes are present. Recompute the full C179 touched-source set immediately before implementation and preserve those concurrent edits.

| Reviewed source | SHA-256 |
|---|---|
| `bot/src/city-civic.js` | `7557FAF272194591577249FA34E110EA8FCB955510EAC3F44AC3C9BFA46624C3` |
| `bot/src/frameworks/world/city-civic.js` | `D721729B1C14121AE017F20DBA38D7A342D6F7EE718C87C08B4DE8E53141462B` |
| `bot/src/frameworks/world/contracts/root-sources.js` | `4641E48642D8221FE89F6636522A5EA0E826596E7717A16E164A56B956E8F829` |
| `bot/src/frameworks/world/public.js` | `837C163EDDFA8D40F00E3BF0C76D786293DD7BAA1A412A87E701D39498DC192A` |
| `bot/src/frameworks/intent/contracts/world-operations.js` | `7FD9567B8E32E18C1103C3EA11066A02ABD98B1744651365574971867E893D5D` |
| `bot/src/frameworks/intent/public.js` | `5F3B8F5B273616BA550B63A17C8267792D8F1CDDBE255762FC8F39FF12CA5E3A` |
| `bot/src/framework-to-framework/intent--world/public.js` | `871E116445E4324CA43D0C34E44E995CC7E3DC881649479504CEDFF92B516A8E` |
| `bot/src/ai-intents.js` | `11213AECA2AF3A567BC75FFCDC505BE1A25D5B17BE4FC65CC734A799870B1E4D` |
| `bot/src/city-consequences.js` | `80E781383E0893BF7187ED7A34D3D3FEB4A4170BB135B8FC30E63C1A360FFE23` |
| `bot/src/city-commands.js` | `CD859BE56E1EE0FD1A31BA540EA6788472A94EBAC41372199C2C9FA60C12DA75` |
| `bot/src/simulation.js` | `F30DF1C8FA1DAC8848BD70F72139740E0455FA945295D6FAA31A598B0E173FF1` |
| `bot/src/application/composition/world-execution.js` | `4D2400AEB428A31BF3A8C920A13D305B6501E08DD8ED72DC37E28D695F1A1997` |
| `bot/src/application/composition/knowledge-world.js` | `3D1B229D19697D0BBDEF24B71A03A34C5873AA8804327365C514605A77071502` |
| `bot/src/framework-to-framework/knowledge--world/public.js` | `849A927D415F37BD0A6FB71396BB8A0D98EE51B22FCA637302EEBD2C136A857F` |
| `bot/src/index.js` | `F6253ECD98B6D6449800435C0A96B2AD5F82A7417EE355A848EE7C46814AD7D8` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `5115CB46C388535F80AEEEE71171C762DD505C2ECD4219553AA0B2EA9FB87065` |
| `docs/Implementation_Plans/TEST_PROTOCOL.md` | `25D216F1DA8EB6A09C34E7C192A6E805AEBFF7B775623C216F320C1EAC2BE423` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/SCOPE.md` | `2CB8C51146661A4177213A1B8A0CF6D07CD6DF2A3813D3AD623D3762266A468B` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` | `CE8D33E0577AC25A356ACE960B39DE70CC147965D1CEB6C5A92CED5F8293B479` |

## Rollback and next step

If C179 implementation must be reversed, restore only the root compatibility file and its original one-time binding from the snapshot, remove only the canonical-module bind, restore the `ai-intents.js` import/call, the Intent port key and adapter binding, and the three consumer imports. Restore exactly the three transition objects from the C179 retirement archive and remove only C179-specific test/evidence/scope files. Do not reset, clean, or revert C176/C177, the shared transition changes, or unrelated user work.

**Assessment:** Source ownership and public exports support this bounded retirement. The three exact cross-boundary records explain the only consumer migrations needed; no gameplay/saved-state blocker was found in static review. RF05 permits this supported work while RF04 remains incomplete; only the single Application/RF06 edge relies on the exact prerequisite authorization. No implementation, tests, or qualification are claimed here.

**Next exact phase:** once the shared C176/C177 source batch is frozen and the parent releases this slice, implement and qualify C179 as scoped above; retain RF04-incomplete and release-unauthorized status until their separate evidence gates are met.
