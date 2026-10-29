# C186 — Retire the root assembly-context composition module

**Status:** C186 source and exact transition/bridge-scope edits are implemented. All four production root callers now use their original owner routes and `bot/src/assembly-context.js` is removed. No C186 tests or checks were run; no test file is claimed. No package, bridge overview registry, baseline, or test-array changes were made.  
**Recovered checkout:** base `92de0048` (`codex/rf04-memory`) in `C:\Users\Keshi\.codex\worktrees\rf04-memory\Veiled_City`, recovered from the authorized stash application on 2026-10-29. C180/C181 and Knowledge memory-cluster changes are also present; preserve them independently. The original live playtree and old isolated checkout were not written by this continuation.  
**Proposed owner/slice:** Session, RF04-F04 C186. The exact Application, Narrative, and Publication caller migrations are listed below by existing transition ID. The two RF06 edges are narrow prerequisites to retire the Session root and fall within the existing 2026-10-28 authorization for exact RF06 prerequisites. The two RF05 edges remain within RF05’s active observed-work scope while RF04 is incomplete. This proposal adds no unrelated RF06 work or phase hold.

## Responsibility and bounded change

`bot/src/frameworks/session/assembly-context.js` already owns the assembly context factory and its rules. The root `bot/src/assembly-context.js` is a composition module: it creates one factory result at module evaluation, supplies current-scene, scene-presence, and World-opportunity callbacks, forwards the factory methods, re-exports Session’s existing `hookHash` and `assemblySourceError`, then binds five of its wrappers to `sessionAssemblyContextSource` at module evaluation. The Session-owned `createAssemblyContext`, `hookHash`, `assemblySourceError`, and the fixed source port already appear in Session’s public API.

Proposed new module: `bot/src/frameworks/session/assembly-context-service.js`. It should import the factory and capabilities directly from same-owner files:

- `createAssemblyContext` from `./assembly-context.js`;
- `currentScene` and `scenePresence` from `./scene-source.js`;
- `sessionOpeningWorld` from `./contracts/opening-world.js`;
- `sessionAssemblyContextSource` from `./contracts/opening-sources.js`.

It must not import `frameworks/session/public.js`, which will re-export the service and would create a public-barrel cycle. Allocate the same single `context` at module evaluation. Preserve the three exact lazy callbacks:

```js
currentScene: (...args) => currentScene(...args)
scenePresence: (...args) => scenePresence(...args)
openingWorldOpportunities: (...args) => sessionOpeningWorld.openingWorldOpportunities(...args)
```

Do not invoke a callback while allocating the context. In particular, keep World opportunity reads lazy: `assemblyInputs`, `certifyAssemblyPlan`, and `assemblyWriterBrief` invoke them only when those original functions run with their original arguments. `sessionOpeningWorld` is already bound at module evaluation by `framework-to-framework/session--world/opening-opportunities.js`; `gm.js` imports that adapter’s public module before `index.js` calls its application initializers. Preserve this provider timing and the original fail-closed port behavior; add no World adapter or initializer.

Keep the exact existing five-function Session slot binding at module evaluation, using the service’s original forwarding functions in the same order:

```js
sessionAssemblyContextSource.bind({
  assemblyInputFingerprint,
  certifyAssemblyPlan,
  assemblyPlanFreshness,
  assemblyHookSources,
  assemblyHookSelection
});
```

Export the root module’s eight assembly-context functions from the new service through `frameworks/session/public.js`: `assemblyHookSources`, `assemblyInputs`, `assemblyInputFingerprint`, `certifyAssemblyPlan`, `assemblyPlanFreshness`, `assemblyHookSelection`, `assemblyHookProjection`, and `assemblyWriterBrief`. Keep the existing public `createAssemblyContext`, `hookHash`, and `assemblySourceError` exports from the factory. Do not re-export or redefine `hookHash` or `assemblySourceError` from the service. The factory body, object shape/order, source IDs, `assembly_contract` version and `input_fingerprint`, freshness results, hook revision, public opportunity reference pairs, exception messages/codes, and all saved receipt/fingerprint behavior remain unchanged.

## Actual callers and owner-bound routes

Static production-source search found four imports of the root composition module:

| Current caller | Current use | Proposed route |
|---|---|---|
| `gm.js` | `assemblyInputs`, `hookHash`, `certifyAssemblyPlan` | Import those same Session public exports. `hookHash` already comes directly from the Session factory via Session public. |
| `commands.js` | `certifyAssemblyPlan`, `assemblyPlanFreshness` | Import the same two Session public exports. |
| `narrative-authority-context.js` | `assemblyWriterBrief` passed into Narrative’s context builder | Use the existing Narrative-owned `narrativeBridgeSessionSources.assemblyWriterBrief` method through a thin argument-forwarding helper. Extend that existing port and its existing Narrative–Session adapter binding with the original Session service export. |
| `pvp-output.js` | `assemblyHookSelection` in `prepareAssemblyOutput` | Use the existing Publication-owned `publicationSessionEvidence.assemblyHookSelection` method through a thin forwarding helper. Extend that existing port and its existing Publication–Session adapter binding with the original Session service export. |

The Narrative-owned port is `narrativeBridgeSessionSources` (`frameworks/narrative/contracts/bridge-sources.js`), already exported by Narrative public and bound by `connectNarrativeBridgeSessionSources()` in `framework-to-framework/narrative--session/public.js`. `initializePvpAgreements()` already calls that binder at `index.js` startup before GM service construction. Add only the `assemblyWriterBrief` method to that port and binder. Update the port/adapter scope comment to say it carries this callable Session assembly brief in addition to the existing opening readers. Do not add a Narrative port or initializer. The bridge registry currently labels `narrative--session` `CONTRACT_ONLY_UNWIRED`; this proposal does not promote the pair or claim broader integration qualification. Its existing scope can record this one exact Session-to-Narrative capability when implementation and test evidence are ready.

The Publication-owned port is `publicationSessionEvidence` (`frameworks/publication/contracts/session-evidence.js`), already exported by Publication public and bound by `connectPublicationSessionEvidence()` in `framework-to-framework/publication--session/public.js`. `initializePublicationSession()` already calls that binder at `index.js` startup before the database and GM service are constructed. Add only `assemblyHookSelection` to this port and binder. The pair registry already marks `publication--session` adopted for its stated evidence scope; a later C186 scope update should append this exact assembly-hook selection capability, without changing the pair’s test array, evidence counts, direction counts, or other consumers.

The existing `assemblyHookSelection` in `sessionAssemblyContextSource` remains bound to the original Session wrapper. The two new external ports should bind that same exported Session service function, then forward the original database, guild, session ID, scope, and optional plan arguments unchanged. They add no policy, error handling, cache, authority, or saved effect.

Two same-owner Session imports also contain the text `./assembly-context.js`: `frameworks/session/public.js` re-exports the canonical factory, and `frameworks/session/opening-cohort-state.js` imports its `assemblySourceError`. Those paths resolve to `frameworks/session/assembly-context.js` and must remain unchanged. No production script/tool/package entrypoint was found importing the root path beyond the four callers above. Fifteen test-tree files statically mention `assembly-context.js`; the repository test protocol forbids reusing, migrating, or repurposing legacy tests and fixtures, so those references are not runtime callers or C186 test inputs. The Session public entry is already registered in `RF01/PACKAGES.json`; the root file is not an exported package entry and no package change is needed.

## Module-load and saved-state review

The root allocates `context` once during module evaluation, before caller execution. The moved service should do the same. The local callbacks are wrappers, not eager reads; preserving them avoids changing module-load order or asking `openingWorldOpportunities` for data before a database and scope are supplied. The Session–World opportunity provider continues to bind from its existing module. The new Session service must bind `sessionAssemblyContextSource` at module evaluation as the root does today, so `assembly-planning`, opening workflows, and other current Session consumers see the same fixed provider before runtime calls.

The Narrative context builder invokes `assemblyWriterBrief` only for an assembly or cohort-assembly request. Publication calls `assemblyHookSelection` inside `prepareAssemblyOutput`. App/GM callers use the existing functions at their current request points. Keep all of those function signatures and synchronous return/throw paths. Preserve the factory bodies byte-for-byte and only relocate the composition. In particular retain `hookHash(JSON.stringify(value))`, source identifiers derived from the same source text, the version-2 assembly contract and input fingerprint, the exact `{source_ref, signal_ref}` public opportunity references, the private-hook selection revision, and the output fields that persist `hook_revision` and `hook_source_refs`. No schema, receipt key, visibility, owner check, campaign rule, writer prompt, replay behavior, or persistence path changes.

Existing startup already provides both consumer bindings before service construction: `initializePvpAgreements()` at `index.js:49` binds the Narrative–Session port, and `initializePublicationSession()` at `index.js:84` binds the Publication–Session port. The existing Session–World opportunity module binds `sessionOpeningWorld` at module evaluation. C186 requires no `index.js`, application initializer, Session–World adapter, database, or package-entry change. No module-load call is added; callbacks remain lazy.

## Exact transition records and authority

Archive and retire only these five existing records after implementation and the exact callers/ports are reviewed:

| Transition ID | Existing record | Owner and assigned feature |
|---|---|---|
| `d031c373914e6b5518cd27ab767de30d7d4e79290668fb680eee946b76599bfb` | `LEGACY_MODULE_LOCATION`: `bot/src/assembly-context.js` | Session, RF04-F04. Retire after the composition physically lives in Session and the root path is removed. |
| `6841e271008a4a7279cd88683e8ea6f02ce196c8613897381e1b08aca0f096b7` | `IMPORTS_PRIVATE_API`: `commands.js` → root `assembly-context.js` | Application, RF06-F04. This exact command import is one prerequisite to close the Session root and is within the cited authorization only at that scope. |
| `eda6b56e9b95802d5fd4fdd72f69422f23f5968d2c19396f2b1621b447d2bbcc` | `IMPORTS_PRIVATE_API`: `gm.js` → root `assembly-context.js` | Application, RF05-F04. Repoint to Session public under existing RF05 scope. |
| `a330a3f20285379c60d735c2fbd89856921aaaeb77479fff52f9221ca21a49ca` | `DIRECT_CROSS_FRAMEWORK_IMPORT`: `narrative-authority-context.js` → root `assembly-context.js` | Narrative, RF05-F03. Route the one Session writer-brief call through Narrative’s existing fixed port and the existing Narrative–Session adapter. |
| `41890ada13fdd84ca44666a639d5ceca515de4e57ca555914eb40017c61fef0a` | `DIRECT_CROSS_FRAMEWORK_IMPORT`: `pvp-output.js` → root `assembly-context.js` | Publication, RF06-F03. Route the one Session hook-selection call through Publication’s existing fixed port and the existing Publication–Session adapter. This exact prerequisite is within the cited RF06 authorization. |

The owner authorization dated 2026-10-28 covers only the exact RF06 prerequisites needed for RF04 closure, with each prerequisite separately scoped, tested, archived, and rolled back. C186 proposes only the exact `commands.js` and `pvp-output.js` edges above. RF04 scope and current owner direction allow supported RF05 work while RF04 is incomplete; the `gm.js` and Narrative edges are the exact existing RF05 obligations in the table. Do not add transition records, change baselines, retire any Session root consumer not listed, or weaken an unrelated owner boundary.

## Future verification scope (not executed)

The current `TEST_PROTOCOL.md` requires new changed-code-only tests under `bot/tests/ai-gm-2026-10/`, one frozen blocking batch, syntax checks only on changed JS/MJS, and the specifically authorized RF04 architecture ratchet. Parent reports C180/C181 fresh verification complete; C186 remains untested and no qualification claim is made. This implementation step deliberately runs no tests or checks.

After the shared batch is frozen and C186 implementation is authorized, the C186 test should exercise: single early context allocation; no invocation of the three callbacks during module evaluation; lazy World opportunity access only when an existing context function runs; identity and exact five-method Session slot binding; and original argument/result/error forwarding through the existing Narrative and Publication ports after their current startup binders run. A focused factory-backed case should preserve the generated input fingerprint, public source-reference pair, private hook revision, and Publication evidence hook keys from actual functions using new feature-local fakes/disposable storage only. It must not import or adapt the fifteen legacy test-tree references. Record exact changed-source/test/input hashes, command, count, exit code, and skipped/failed cases; a passing delta remains limited evidence, not release certification.

## Source snapshot and hashes

The following earlier table records the reviewed pre-implementation snapshot and is retained as audit evidence. Current C186 implementation hashes are listed after it; they cover only files changed for this partial source step, not locked callers or shared metadata.

| Reviewed file | SHA-256 |
|---|---|
| `bot/src/assembly-context.js` | `47182F554C19421BA6AFF09AF3C5EF6AB344A7AFF94946B50C010773FDC8C931` |
| `bot/src/frameworks/session/assembly-context.js` | `BC2AF10A4FE58715DB0BACC9C2874B6459A53BEE14AFA373CAFEBBA6A8D9DF88` |
| `bot/src/frameworks/session/assembly-context-service.js` | **not present; proposed destination** |
| `bot/src/frameworks/session/public.js` | `0A62E97C65E8B22ECC19D47CBB8462080444AE7BD7C5503E8B9B5B748460CB32` |
| `bot/src/frameworks/session/contracts/opening-sources.js` | `15608F99AAA16A97AE9D9B3C9DAD5ECE96A6A12AA461CB7DDFCB53702370DD96` |
| `bot/src/frameworks/session/contracts/opening-world.js` | `78DC6DD1BDF7E9255CB581FBC70DEFF7C16ACB9FDBB72DCFC47100E35F614DEA` |
| `bot/src/frameworks/session/scene-source.js` | `4CC1D11A21C2F886A6F7D29FDDB7017D343FA84231B7751DB571C4D2D9271FCC` |
| `bot/src/gm.js` | `41DF283F31B6B193DA80B4B7E07FAB39EDFAA0EB85A3533CB25C45BDC39CFE60` |
| `bot/src/commands.js` | `F9EA588F9AA638757DE60A558FA2917069FB56FED3AACD8C5B7D7B155A253D0E` |
| `bot/src/narrative-authority-context.js` | `1232B4D17D17779C2C0CBA7E99F243F590D2F06A6934E84A1F8BEDDC1A98F176` |
| `bot/src/pvp-output.js` | `87395D7657BC0340DDE60267AF11C156179F170E0B1BF8DBE9150FEB0B6B3484` |
| `bot/src/frameworks/narrative/contracts/bridge-sources.js` | `9965F9598B861DF3959F8AB13ED59EC821542198CC612632F0ACA92CB9FCC8DA` |
| `bot/src/framework-to-framework/narrative--session/public.js` | `FC1EE7621049D8AC344DB9DAB23015D6240922DC205B037715EEC8B2C41A9FF3` |
| `bot/src/application/composition/pvp-agreements.js` | `7B35EBEE90874EEA17D2A05CF3D6A0E375F2BBF747FBE73FD8EC40A9FA9FA0DA` |
| `bot/src/frameworks/publication/contracts/session-evidence.js` | `1962D8CE6C51844529AA77841E8AD85E930ACC3485963A65AF0F1C0905F6D4DB` |
| `bot/src/framework-to-framework/publication--session/public.js` | `FD25611F63582D2414790C3FF0EECF9935C405DAC5439044FC93D71EFF959692` |
| `bot/src/application/composition/publication-session.js` | `3362B604B43CF49403ADFC84D80524AF803984EA529B163464CA527FE11C2C0C` |
| `bot/src/framework-to-framework/session--world/opening-opportunities.js` | `BE86835D57589347157F40948507FFB24B2025571FE4F258128E0A2F86B8A3A0` |
| `bot/src/framework-to-framework/session--world/public.js` | `B0A55B6672EBE0CB20E6CA42A72EA6F2D71922A0648ECF1BB66C7943C7A58D92` |
| `bot/src/world-narrative-bridge.js` | `37735C8109B0A5D1FEE9EEEB8D89AEF7C7E2A1E25D5640A9ED07B6CC928A9FAA` |
| `bot/src/frameworks/narrative/context-builder.js` | `F616242F488B1E52FD1C57B29856ACE8FC336D875EDC29D37BB6964814ACD7C1` |
| `bot/src/frameworks/narrative/public.js` | `7132845DAA454DBDAB8D8984D5920A8726822E0CC83A880AE46F2BBB7532E2D8` |
| `bot/src/frameworks/publication/public.js` | `DB501A3967E97542FB6039E601176E975233EF0718A3EDCFCC236850BB10FF6F` |
| `bot/src/application/composition/public.js` | `410532ECF98E2E4C91317C6E7F340D253932AAC0CD6AA3D697FBA5D0779D5643` |
| `bot/src/index.js` | `A656368320EA3FE491C73228946C4C363C270676379B15CDA710953CA73C467E` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `372C731C38F8D720EC261AB14A5C55DF41E4BB66669F1431A77087AC3C7D057E` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `2F985F93A4ED81C8F2A8204301DBA9421F60BBF43F02608E1EF7A9E0F437B714` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json` | `94A4CB92D35E450A169B0B8B2ABE0D98FC2366BEDF720A269E631A2E4A476933` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/INTAKE_OWNERSHIP_DEPENDENCIES.json` | `1B5960A09DE431590F8180C68C61A7BECB7567945D8B335F2D8BDB4D388188EE` |
| `docs/Implementation_Plans/Framework_Refactor/SOURCE_RELOCATION_CROSSWALK.csv` | `B94EF761096C6F477B19E47791F11F3FE174E531BB31B4C229F50DB888D5E942` |
| `docs/Implementation_Plans/TEST_PROTOCOL.md` | `9840EB011223BE3864D3714EC9468A382EBE260FB5442B546A8415D8027C51C2` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/SCOPE.md` | `309753DC27363DD2F5B437FAE78F7C0838FA6EC5BD1F7AA247D589497602CD2E` |
| `docs/Implementation_Plans/Framework_Refactor/phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` | `79818D987B9B92D9F552575DCB39684546B4C27006B117519136A45B69F53372` |

## Current implementation snapshot

The service is in `frameworks/session/assembly-context-service.js`, retaining the same single factory allocation, three deferred callbacks, eight forwarding methods, and exact five-method module-load bind. Session public exports those methods while retaining its factory/hash/error exports. `commands.js` and `gm.js` import their original functions from Session public. Narrative's `narrative-authority-context.js` calls the same Session writer brief through the existing Narrative-owned bridge port; Publication's `pvp-output.js` calls the same hook selection through the existing Publication-owned evidence port. The two existing adapters bind the methods before application runtime services are constructed. The root composition file is deleted after all four production callers were removed. Exactly the five transition records listed in `C186-RETIRED.json` were removed; the existing Narrative–Session and Publication–Session contract scopes were narrowed to describe only these methods, retaining prior adoption state and all test arrays.

| Changed source file | SHA-256 |
|---|---|
| `bot/src/assembly-context.js` | `4B56B95772C4E8F526818B6CFCD940724EFACC4F7192CEE7D15781408C00622A` |
| `bot/src/frameworks/session/assembly-context-service.js` | `21ABDBB470E2798C0DC82BB929002855360949B7B8798AE474066CEC516CC011` |
| `bot/src/frameworks/session/public.js` | `21C815339073E887E3D51D8BD3E54E34C7F75376D28BE0A48AF1EDAA681168F4` |
| `bot/src/commands.js` | `790CA179F067C8A6286BF795826071ACA0AEFFF635C0B3F3ABFA7B77050C3815` |
| `bot/src/frameworks/narrative/contracts/bridge-sources.js` | `37F9D511B6BE08403D1B9C5FC69536AC60216F75FFDE9CC6D774D5CA87459D70` |
| `bot/src/framework-to-framework/narrative--session/public.js` | `94B2F6D7BAA879546C8A26DF5B9C1C35EB885B68F26F643DDE5BC32AF111DEC3` |
| `bot/src/frameworks/publication/contracts/session-evidence.js` | `140F8BD2491817A7E957DED6468CC6F2428C0DF273DF84E5DA889F1497C3B687` |
| `bot/src/framework-to-framework/publication--session/public.js` | `FF3D7F1518D3D74F322F24BAE3EF33B695D689128D430ABC3D4F89BBAF1E8CCD` |
| `bot/src/pvp-output.js` | `16C62DA017F711236A02294BA89B4F1FE51FB610672403DC4FA89606437996F3` |
| `bot/src/gm.js` | `13A46A79661DA63DA8C87549CF016FD520A8D5339E399643D189BA3F052F4AF9` |
| `bot/src/narrative-authority-context.js` | `02D45A2AB154F8D59F5064DF654C96DE6C3CEBD0D28678E779454947956A55FE` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `A49DABC3EE914501DF2F690AC570C51347255E22327B40CDBC0B2F9A71B49AB8` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `ED0C32AF0ADDDD2083E6341DE2A2FE048622A62EDABABF9D2FDA1A77A35987F3` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C186-RETIRED.json` | `6F723967685A5D3EC12DA20B94C761449FEA5470C536A7041146305058A94285` |

Metadata changed only after the explicit C186 release: `RF01/TRANSITIONS.json` archives/removes the five IDs above, and `RF01/BRIDGE_CONTRACTS.json` updates the two existing pair scopes. `BRIDGE_REGISTRY.md`, `PACKAGES.json`, test arrays, evidence counts, and baselines were not changed for C186. The root file was deleted; its pre-C186 source hash in the reviewed proposal snapshot was `47182F554C19421BA6AFF09AF3C5EF6AB344A7AFF94946B50C010773FDC8C931`.

`git diff --check` passed for these C186 files. No syntax check, test, architecture ratchet, staging, or commit was run. The other dirty/staged files in the worktree belong to concurrent authorized work and are not included in this C186 snapshot.

## Rollback and next exact phase

Rollback only C186: restore `bot/src/assembly-context.js` to its pre-C186 source hash `47182F554C19421BA6AFF09AF3C5EF6AB344A7AFF94946B50C010773FDC8C931`; remove `assembly-context-service.js` and its Session public export; restore the root imports in `commands.js`, `gm.js`, and `pvp-output.js`, and the root `assemblyWriterBrief` import in `narrative-authority-context.js`; remove only the C186 Narrative and Publication port keys, binders, and call-forwarding helper; restore the five records from `C186-RETIRED.json` to `TRANSITIONS.json`; and restore only the two prior pair-scope strings in `BRIDGE_CONTRACTS.json`. Preserve all C182–C185 and unrelated staged/dirty work.

**Next exact phase:** the tester authors the C186 changed-code case on the frozen combined source batch; only after the tester and parent authorize that validation step should C186 tests and the RF04 architecture ratchet run. This source/metadata implementation step did not run tests, syntax checks, or ratchets, and does not claim release qualification. Parent handles staging and commit under the coordinated combined-source workflow.
