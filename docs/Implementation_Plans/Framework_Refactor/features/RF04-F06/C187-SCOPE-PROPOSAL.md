# C187 scope proposal: retire the conversation principal shim

## Boundary and evidence

The target is the two-line `bot/src/conversation-principal.js` re-export of Session's `conversation-principal.js`. The implementation remains Session-owned and exports the existing `conversationPrincipal` and `historicalOwnerPrincipal` functions. Its database reads and SHA-256 revision calculation happen inside calls; module evaluation only loads `node:crypto` and defines functions. Keep the original function objects and semantics. In particular, `historicalOwnerPrincipal` is read-only receipt ancestry and must not be treated as current control, consent, spending, or action authority.

Session already exports both functions from `frameworks/session/public.js`. The production bootstrap imports `conversationPrincipal` in `index.js`, and that file also calls the existing initialization functions for composition pairs before runtime setup. The Session principal reader itself is not a bound provider. No `bot/scripts` or `bot/tooling` runtime import of the shim was found. Historical test/source assertions are not runtime consumers.

## Current callers and minimal routes

| Caller owner | Current direct importer(s) | Route after shim retirement |
|---|---|---|
| Application/bootstrap | `index.js` | Import `conversationPrincipal` from Session public. |
| Intent | `ai-intents.js`, `authored-candidates.js`, `authored-turn-envelope.js`, `gm-arbitration-output.js`, `semantic-engagement.js`, `typed-intents.js` | Add/reuse one Intent-owned Session principal consumer slot and connect it in an existing Intent–Session composition initializer. No equivalent Intent pair was found. |
| Publication | `discovery-delivery.js`, `native-outcome-output.js`, `pvp-output.js` | Add/reuse one Publication-owned Session principal consumer slot and bind through Publication–Session composition. `publicationSession` already exists; inspect its complete capability surface before adding a separate slot. |
| Narrative | `fresh-npc-authoring.js`, `gm-world-scope.js`, `narrative-authority-context.js`, `narrative-context.js`, `narrative-pvp.js`, `narrative-salience.js`, `narrative-tasks.js`, `nonmaterial-grammar.js`, `scene-description.js`, `scene-fiction-context.js` | Route through the existing Narrative context capability (`conversationPrincipal`) and its composition source. Narrative's builder already requires this capability; verify each caller is covered by that builder before editing. Do not add a framework-to-framework import. |
| Daggerheart | `pc-death.js` (`historicalOwnerPrincipal`) | Reuse existing `nativePrincipals` consumer port and `connectNativePrincipals()` binding, which already supplies both Session functions. Replace the root import with the bound Daggerheart contract. |
| Discord | `pvp-menu.js` | Add/reuse a Discord-owned Session principal consumer and bind at application composition. No existing Discord principal pair was found. |
| Session | `scene-setup.js`, `opening-attendance.js` | Change to the same-owner relative implementation import, or Session public if required by local conventions; preserve same function identity. |

Existing consumer-owned routes already demonstrate the pattern and should remain: Character `characterSession`, Knowledge `knowledgeSessionScene`, World `worldConversationPrincipal`, NPC `npcSessionPrincipal`, and Daggerheart `nativePrincipals`/`nativeEnvironmentSession`. They import Session public only inside their explicit framework-to-framework composition modules.

There are 20 direct source importers (including the bootstrap and two Session-local consumers). The transition manifest contains 21 relevant entries: one legacy module-location record and 20 importer records. Exact importer record IDs, in the caller-table order above, are:

* Application: `57ff2a4b6aa2bb20554bc5b74df0d97fa432e9a8be6229f152d3d1c7c3dd063e`
* Intent: `ff0b2e2556843f894c7aaa46773fcc89e9cf40395508b52df0b47085148e58a7`, `4ca0c0bcf8012e22d8c63af6aea18c384e8618f28d0edf330e634f9eb6e53165`, `eb2b4f0837335f2c5ec4242d326e44ad2dbfc7a6222a64314260a87fc7b81b4f`, `efbca00bfa10b7f45b5b83194fb07149fe1698e30f1add895ae50097c7f5d42f`, `9219bbf7d18f9e7c54a012a7c33bb2cf914ee986949e27d692628f9fd1816e78`, `a6e4631050198c5c5d27181b80fdad57b464dcffa15451fd888508d8a28c36c9`
* Publication: `a4a6d87030b1d9fc24d0274c7f5534799270c4388644416b59221a5416db164c`, `bfb47872f2b2553f741c0938bbbf735efbf3ea109fbe90bbbfcffccca12412cc`, `156d464499e98db5fee20e1a24e803868b8e089a8f0ed47cb194aaa045ff50d1`
* Narrative: `2cedf70acf5197230ae4891a39dc86766d26c39ecaf0618a1eba435ed139ec42`, `a09eb4fd9e092da16f47498c2d9f279cd7aef716893c03a2fe5d73deedd46313`, `2d17b4542a60e0bd5ff0ce50323c56932bede39eb8c5c4a0e444c28419d0ced1`, `ddf794227673bf0418aed19bfc2dba009402f34bdf1cb6e36c83efb30b9a544d`, `37c3a78ea178f997425f16773fc4336812674f4f1f70481d307a87ada85ec4b4`, `ea6385bd51b6455c547ad8b087ca74cb55e8946ec40ae3a37232437bdbeb9ad5`, `4a0974f0b01db39a2f9e75c9d32f961724b69425b6771cd5323dd60a083d03b2`, `945b96424a5356ed938306319f901661b2b0168fab696b1b555f93b6d385103f`, `676762c0cb264ea8e781bc4af193cd958560df2f2ace7aac87b9f625721691f9`, `c125a1f8f6dac4096888fb190ecd410c62de011ebafa541819fdae3fb13aa9a0`
* Daggerheart: `cc7da07870e8df6f5455dc7aab5046ec1995cb8acb6c5ff29090d00337528cfc`
* Discord: `3a5b4961a95a3cf17e89ddec8b70ef4efbc82c185a1e067290482b3b94377c16`
* Session-local: no current transition records were found for the two direct relative imports; confirm the manifest's importer set before retirement.
* Legacy module-location record: `0fc04e071159e0c0b93cd44aa24be93d7e8b8c106fdcad8d332e25806fe817d0`

Retire only manifest records whose exact imports are removed by the approved migration, plus the legacy location record after deleting the shim. Do not retire records merely because another owner has a similar function name.

## Blockers and acceptance boundary

There is no demonstrated standalone-runtime blocker for Session's own reader or `index.js`: both can import the public Session source directly, and startup already loads the composition registry. Intent and Discord require an explicit consumer-owned binding if they call the principal outside Narrative's injected context. Publication should first reuse the existing `publicationSession` capability surface if it semantically covers the call sites; otherwise add only the missing principal field. No hidden root-shim fallback or blanket cross-framework import is acceptable.

The next concrete design check is to trace the listed Intent, Publication, Narrative, and Discord call sites to their exact factories/composition initializers and verify the stated capabilities cover their signatures. Then implement only those bounded consumer slots/import substitutions, test production composition, and retire the exact manifest entries. This proposal changes no runtime source, manifests, or tests.
