# RF04-F06 C175 — Move the Session–World opening opportunity bridge

## Source scope

At base `37046e2a8a140bea36a1ecee01f8efc7b9116fee`, move the existing `openingWorldOpportunities` implementation from the root into `framework-to-framework/session--world/opening-opportunities.js`. Change only its three relative paths to Session and World `public.js`; keep the function body and its module-load `sessionOpeningWorld.bind({openingWorldOpportunities})` unchanged. Re-export that same function from the existing Session–World pair `public.js`, and change `gm.js` to import it from that pair public API.

The Session port and its consumers remain unchanged. Importing the pair public module evaluates the implementation once, preserving the existing binding lifecycle without a new initializer. The implementation continues to use only the Session and World public APIs; no root-module or private framework imports are added.

## Preserved saved references and behavior

Saved assembly plans retain `assembly_contract.public_opportunity_refs` as `{source_ref, signal_ref}` pairs. Session assembly certification and writer context resolve those references against currently authorized opportunity beats. Preserve the implementation output, beat identifiers, reference values, audience fields and authority flags; no saved-format migration is in scope.

The port bind receives the original `openingWorldOpportunities` function object. The pair public export is a direct re-export of that same binding, so `gm.js` retains the same implementation identity. The function port continues to forward the same arguments and results to Session consumers.

## Modified files

- `bot/src/opening-world-bridge.js` — removed after moving its implementation.
- `bot/src/framework-to-framework/session--world/opening-opportunities.js` — moved implementation with only three import-path changes.
- `bot/src/framework-to-framework/session--world/public.js` — direct re-export of `openingWorldOpportunities`.
- `bot/src/gm.js` — import repointed to the pair public API; call sites unchanged.
- `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` — removed only the two C175 transition records.
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C175-RETIRED.json` — archived both exact transition objects and the pre-removal manifest hash.
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C175-SCOPE.md` — this scope, hash and rollback record.
- `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` — registered only the observed `bot/src/gm.js` consumer for `session--world`; scope text identifies the opening opportunity function narrowly.

C164 is committed at the base above. Concurrent C165–C167 workflow relocations are preserved and were not edited by this slice. C175 archived and removed only transition IDs `3d6d458b6cf66b63e7dcc1b6a87b0cb9f8c7e3b34d601553bc169ed3a562d11f` (`LEGACY_MODULE_LOCATION`) and `85031f3f44b2e7afac9dffaea17b9f098bac23e569a9aba4d9642133e864ca26` (the existing GM import of the root module). `C175-RETIRED.json` records the pre-removal `TRANSITIONS.json` SHA-256 `3F5B101370F6254DBF1E30CC476134B8B37F66C907D3C7C5DF37EB3CE34304A7`; the resulting transitions file SHA-256 is `06E9301691F80CB764B7B04458306B42FCB7DE7DDBC8D3B130C6D654B6079FC8`.

## Source hashes

The original root file SHA-256 was `25A41588564217F1DA203EA291807E38B99CA5FCC991339BC840F557E38F00F6`. Removing import lines before hashing gives `D34BDE9602EA65F6C1851FA660B30E397DC7A928D6E44D53EFB94AA7B7BCF28B`; the moved implementation has the same non-import hash.

| File after C175 source edits | SHA-256 |
| --- | --- |
| `bot/src/framework-to-framework/session--world/opening-opportunities.js` | `BE86835D57589347157F40948507FFB24B2025571FE4F258128E0A2F86B8A3A0` |
| `bot/src/framework-to-framework/session--world/public.js` | `B0A55B6672EBE0CB20E6CA42A72EA6F2D71922A0648ECF1BB66C7943C7A58D92` |
| `bot/src/gm.js` | `41DF283F31B6B193DA80B4B7E07FAB39EDFAA0EB85A3533CB25C45BDC39CFE60` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `06E9301691F80CB764B7B04458306B42FCB7DE7DDBC8D3B130C6D654B6079FC8` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C175-RETIRED.json` | `42CDAF3DF6909DBAB0E3269E3579161C7769D7E166256AC27A2D3C84FADC4EE2` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `7B5C11CB428214E61B09C5A896BB3A58862C382D56053EB528BDDCE608930683` |

## Validation and rollback

The combined fresh C165–C167/C175 batch passed 4/4, including C175 1/1; exact command, counts, and prelaunch fingerprints are in `C175-RUN.json`. Its initial RF04 architecture gate reported only `UNREGISTERED_BRIDGE_CONSUMER` for the new `gm.js` pair-public import. The metadata repair added only `bot/src/gm.js` to the existing `session--world.consumers` list and added a narrow C175 description to that pair's scope. The existing pair `tests` list was left unchanged: the feature-local C175 test path/hash is recorded in `C175-RUN.json`, and its three-digit case suffix is outside the bridge registry test-selector format. The tester must rerun only the failed RF04 architecture gate; no post-repair gate pass is claimed. RF05's initial gate remains incomplete because of existing legacy module-location records. The metadata repair ran no tests or checkers. Static review confirmed the old root path is absent from production `src` imports and the moved function body hash is unchanged.

Rollback restores the root `opening-world-bridge.js` from base `37046e2a8a140bea36a1ecee01f8efc7b9116fee`, restores the `gm.js` import path, removes the pair public re-export and the moved pair implementation, and restores the two transition entries from the pre-removal manifest snapshot. Do not roll back C164 or the concurrent C165–C167 work.
