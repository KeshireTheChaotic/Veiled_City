# RF05-F06 execution ledger

**Status:** QUALIFIED CURRENT-CODE CHECKPOINT — RF05 PHASE INCOMPLETE / GATE FAILED.
**Base HEAD:** `9b69f51927fd5ec7e7b996c15c8f31ff2ae4d031`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Implementation and verification

One frozen changed-code union member was run: `rf05-f02-model-transport.test.mjs` passed **7/7**, exit **0**, duration **640.1087 ms**, one blocking launch. The test imports `GMService`; `gm.js` changed afterward in F04, so rerunning was justified. F01 (4/4), F03 (9/9), F04 (3/3), and F05 (3/3) focused fresh tests are carried forward from their exact passing records because their directly exercised production modules did not change afterward. Changed-code syntax passed **14/14**, exit **0**.

The original RF05 checkpoint ratchet exited **1**: 572 source modules, zero unowned, 2732 imports, largest cycle 181, 968 active violation groups, and 967 transition errors. After C05, the current RF05 ratchet exits **1**: **574** source modules, **zero unowned**, **2736** imports, largest cycle **181**, **955** active groups, and **955** transition errors. RF05-F03, F04, and F05 retain **289**, **58**, and **442** exact assignments respectively; earlier RF04 debt also remains expired under RF05. C05's new public Intent import has no changed-path boundary finding. This checkpoint does not qualify full RF05 isolation. See `RF05-F06-RUN.json` for current evidence and prior `rf05-f06-*` logs for historical results.

## Current-code refresh after RF05-F04 C05

After the Intent API change modified `gm.js`, the F06 transport test was run once: **7/7** passed, exit **0**, duration **559.3211 ms**. The three other fresh tests that import `GMService` and had last run against earlier GM bytes (RF05-F03 C02 and RF05-F04 C02/C03) were run together once: **3/3** passed, exit **0**, duration **794.1741 ms**. The new C05 regression already passed **1/1** against the same committed GM bytes. Current changed-code JavaScript syntax checks are **5/5** pass from C05. Current architecture result and all source/test hashes are summarized in `RF05-F06-RUN.json`'s `after_c05_refresh`. No provider, network, database, or legacy suite use.

After C06 changed `gm.js` again, one blocking affected-code union ran the transport regression, three prior GM consumer regressions, C05 Intent adoption, and new C06 schema adoption. It passed **12/12**, exit **0**, duration **3,381.2046 ms**; changed JavaScript syntax passed **5/5**. The RF05 ratchet remains failed on **955** existing groups/errors with 575 modules and zero unowned. See `RF05-F06-RUN.json`'s `after_c06_refresh`; no provider, network, database, or legacy suite use.

### Current-GM refresh after RF05-F04 C08

The World schema public-import change refreshed the affected-GM union once: **14/14** passed across eight fresh test files, exit **0**, duration **1,349.9331 ms**; changed JavaScript/MJS syntax passed **5/5**. The RF05 ratchet remains failed with 577 modules, zero unowned, 2,741 imports, and 955 active groups/errors. RF05-F04 has 55 assignments remaining. Detailed test/source hashes and the existing `city-depth.js` findings are in `features/RF05-F04/C08-RUN.json`; phase-wide changed-code union remains reserved for final F06 qualification after implementation work is complete.

## Holds and rollback

RF04 remains incomplete; RF05-F03 has 289 exact local holds, RF05-F04 has **57** remaining assigned transitions after C06, and RF05-F05 has 442. Revert only the eventual F06 evidence commit if needed; preserve the feature commits and pre-existing user edits. No provider spend or production access.

## Next step

RF05 remains incomplete. Preserve the dependency hold on RF06's exact domain interfaces and commit contract. Continue only with independently safe RF06 inventory/design work until RF05's required contracts are qualified.

### Current-GM refresh after RF05-F04 C07

The C07 Narrative public-contract change refreshed the current affected-GM union: **13/13** passed across seven fresh test files, exit **0**, duration **3,956.3878 ms**; changed JavaScript syntax passed **5/5**. The ratchet remains failed with 576 modules, zero unowned, 2,739 imports, and 955 existing groups/errors. RF05-F04 has 56 assignments remaining. Detailed C07 test/source hashes are in `features/RF05-F04/C07-RUN.json`; the phase-wide changed-code union remains reserved for final F06 qualification after implementation work is complete.

### Current GM and turn-commit refresh after RF05-F04 C09

The Intent decision-advisory move changed `gm.js` and `turn-orchestration.js`. The frozen affected-code union passed **15/15** across nine fresh tests, exit **0**, duration **1,367.1831 ms**; changed JavaScript/MJS syntax passed **7/7**. Architecture ratchet remains failed with 578 modules, zero unowned, 2,742 imports, and 955 groups/errors. RF05-F04 has 54 and RF05-F05 has 441 assignments remaining. Root compatibility source-location debt remains. See `features/RF05-F04/C09-RUN.json`; phase-wide union remains pending final F06 qualification.

### Current GM refresh after RF05-F04 C10

The GM arbitration schema import now uses Intent public. The complete affected-GM union passed **16/16** across ten fresh files, exit **0**, duration **1,419.9164 ms**; syntax passed **5/5**. RF05 ratchet remains failed with 579 modules, zero unowned, 2,743 imports, and 955 groups/errors. The GM public import/new module have no findings; three existing cross-framework consumer edges remain through the compatibility path. RF05-F04 has 53 assignments remaining. See `features/RF05-F04/C10-RUN.json`; final phase-wide union remains for F06 closeout.
