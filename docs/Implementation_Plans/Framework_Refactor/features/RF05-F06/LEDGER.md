# RF05-F06 execution ledger

**Status:** QUALIFIED CHECKPOINT — RF05 PHASE INCOMPLETE / GATE FAILED.
**Base HEAD:** `9b69f51927fd5ec7e7b996c15c8f31ff2ae4d031`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Implementation and verification

One frozen changed-code union member was run: `rf05-f02-model-transport.test.mjs` passed **7/7**, exit **0**, duration **640.1087 ms**, one blocking launch. The test imports `GMService`; `gm.js` changed afterward in F04, so rerunning was justified. F01 (4/4), F03 (9/9), F04 (3/3), and F05 (3/3) focused fresh tests are carried forward from their exact passing records because their directly exercised production modules did not change afterward. Changed-code syntax passed **14/14**, exit **0**.

The current RF05 architecture ratchet exited **1**: 572 source modules, zero unowned, 2732 imports, largest cycle 181, 968 active violation groups, and 967 transition errors. RF05-F03, F04, and F05 retain 289, 62, and 442 exact assignments respectively; earlier RF04 debt also remains expired under RF05. No changed-path violation or transition error was found in RF05's modified modules. This checkpoint does not qualify full RF05 isolation. See `RF05-F06-RUN.json` and the `rf05-f06-*` terminal logs for exact evidence.

## Holds and rollback

RF04 remains incomplete; RF05-F03 has 289 exact local holds, RF05-F04 has 62 remaining assigned transitions, and RF05-F05 has 442. Revert only the eventual F06 evidence commit if needed; preserve the feature commits and pre-existing user edits. No provider spend or production access.

## Next step

RF05 remains incomplete. Preserve the dependency hold on RF06's exact domain interfaces and commit contract. Continue only with independently safe RF06 inventory/design work until RF05's required contracts are qualified.
