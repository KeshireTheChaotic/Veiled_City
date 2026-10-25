# RF05-F04 execution ledger

**Status:** PARTIAL — model selection and nine public-API slices qualified; 53 assigned RF05-F04 transition entries remain.
**Base HEAD:** `b515fdb1f48da98b66564010ed87930e07cf7338`
**Scope:** [`SCOPE.md`](SCOPE.md)

## Source evidence

`narrative-delegation.js` currently mixes application-owned player/task routing with a pure lane-to-model selector. `gm.js` is the only observed consumer of both exports. The framework ownership manifest assigns the source module to Narrative but classifies the coordination functions as application workflows. This slice separates the model selector without moving player-intent coordination or changing any selection rule.

## Implementation and verification

Moved the unchanged `narrativeModel` function body to `frameworks/narrative/model-selection.js` and exposed it through the existing Narrative public API. `gm.js` now composes that API with the application-owned `coordinateNarrative`; the old module retains only task coordination. The Narrative ownership README documents the split. No prompt, model, audience, native outcome, or player-control behavior changed.

Fresh test `bot/tests/ai-gm-2026-10/rf05-f04-model-selection.test.mjs`: **3/3 passed**, exit **0**, duration **65.2965 ms**, one launch. It covers protected/unprotected observation and every configured/fallback lane branch. Changed JavaScript syntax: **5/5 passed**, exit **0**. RF05 architecture ratchet: **failed**, exit **1**, with 571 modules, zero unowned, 2731 imports, 968 active historical violation groups, and 967 transition errors. Changed-path findings for the four changed runtime modules: **zero violations and zero transition errors**. The 62 exact entries assigned to RF05-F04 remain (1 legacy location, 1 external capability owner, 60 private API imports); this slice does not remove them. No provider calls, tokens, or spend. Exact outputs and hashes are in `RF05-F04-RUN.json` and `phases/RF05/rf05-f04-model-selection-*.log`.

## Holds and rollback

The remaining RF05-F04 workflow/source obligations are not resolved by this slice. Roll back only this feature's commit; preserve F01–F03, existing user edits, and RF04 diagnostic logs. Provider calls and spend are prohibited and remain zero.

## Next step

Continue RF05-F04 with the remaining independently supportable workflow decomposition; do not mark the feature complete from model selection alone.

## C02 — Session public principal adoption

At base `e0bdf443a148b89f6642bbbd1c6d78e8b69576ec`, `gm.js` now obtains `conversationPrincipal` from the existing Session public API. Fresh test `rf05-f04-c02.test.mjs` passed 1/1 (one blocking run, exit 0, 964.9156 ms); changed JS syntax passed 2/2. The test loads the actual GM service, checks compatibility export identity, and exercises the authenticated principal against disposable SQLite. No provider, network, Discord or production data was used.

The RF05 ratchet first reported the absent exact import as `UNUSED_TRANSITION` (968 transition errors). After deleting only that obsolete transition and preserving its full record in `C02-RETIRED.json`, the ratchet remains failed on 967 unrelated existing errors/groups; 572 modules remain owned, with zero unowned. There are now 61 RF05-F04 transition entries left from the previous 62. This is one qualified import slice; all remaining F04 work and the phase gate remain incomplete. See [`C02-RUN.json`](C02-RUN.json) for hashes, exact results and rollback. Next work must separately scope another source adoption/decomposition. Release remains NOT AUTHORIZED.

## C03 — World public civic-context adoption

`gm.js` now imports `cityContext` from the World public API. The fresh final test passed 1/1 (exit 0, 625.478 ms) after correcting a test-only expected query count; no production code changed between the initial failed test and the successful final run. Changed JavaScript syntax passed 2/2. The RF05 ratchet remains failed with 955 active groups and 955 transition errors; changed-path inspection found no `gm.js` violations. Exact transition `bc2b84be1b485b3cf0bcc69b77180fa5bbe85a0b48def3d1590cd8a18e18a4e4` was retired and preserved. 60 F04 entries remain. See `C03-SCOPE.md`, `C03-LEDGER.md`, `C03-RETIRED.json`, and `C03-RUN.json`. No provider spend; release remains NOT AUTHORIZED.

## C04 — Narrative public soft-guidance import

The GM now consumes the existing soft Director guidance through Narrative's public API. RF05-F03 C02 moved the exact constant; the root path remains as a compatibility re-export. The content hash matches its frozen owner-manifest source hash. Shared fresh test passed 1/1 (exit 0; 550.797 ms); changed-file syntax passed 5/5. The exact F04 private-import transition was retired and preserved in `C04-RETIRED.json`; the F03 source-location transition remains active. **59** RF05-F04 entries remain. See `C04-SCOPE.md`, `C04-LEDGER.md`, and `C04-RUN.json`; the RF05 gate remains failed on unrelated debt and release remains NOT AUTHORIZED.

Because `gm.js` changed after C02 and C03, their already-fresh feature tests were each re-run in a targeted shared-module batch. The Session-principal and World-context tests passed 1/1 each within the 9/9 batch (exit 0; 1,917.7243 ms total). Their current GM hash and test hashes are captured in the respective RUN files.

## C05 — Intent contract public API

The existing Intent prompt, schema, validator, and operation contracts now live under Intent ownership. `gm.js` imports the same schema and prompt through Intent's public API; the root file remains a compatibility re-export for other production consumers. The fresh C05 test passed **1/1** (exit **0**, one launch, **550.7978 ms**); changed JavaScript syntax passed **5/5**. The RF05 ratchet remains failed with **955** pre-existing groups/errors, **574** modules, and zero unowned modules. The new GM public import has no boundary finding; four other framework consumers still use the root compatibility path and remain held under their exact existing transitions. Exact transition `9adda1062fb5ec114195328c1ff9008f15f9722203ff40fe98e27b719e6564b4` was retired and preserved; **58** F04 entries remain. See `C05-SCOPE.md`, `C05-LEDGER.md`, `C05-RETIRED.json`, and `C05-RUN.json`. No provider, network, or database use; release remains NOT AUTHORIZED.

After C05 changed `gm.js`, the fresh C02 and C03 import tests and the shared C04 Narrative-guidance test were each rerun once in one blocking three-test batch. All **3/3** passed (exit **0**, total **794.1741 ms**). C05's own fresh test had already passed against these same GM bytes. The current GM hash is recorded in all affected RUN files; this closes stale test evidence without rerunning tests whose associated production code did not change.

## C06 — Narrative proposal-schema public API

Moved the unchanged, data-only Narrative schema module into the Narrative framework, explicitly exported all 19 contracts, retained the root compatibility re-export, and switched the two GM schema imports to Narrative public API. The new fresh test plus the five existing fresh tests importing current `GMService` passed **12/12** in one frozen batch (exit **0**, **3,381.2046 ms**); changed JavaScript syntax passed **5/5**. RF05 ratchet remains failed on **955** existing groups/errors, with 575 modules and zero unowned. The exact GM import finding/error is gone; two existing consumers still use the compatibility path. Exact transition `eba1e3e1be87a71d8f22b88a6c02da7e495f5ce53f41f75c699bab80934481b1` is retired and preserved. **57** RF05-F04 assignments remain. See `C06-SCOPE.md`, `C06-LEDGER.md`, `C06-RETIRED.json`, and `C06-RUN.json`. No provider/network/database use; release remains NOT AUTHORIZED.

## C07 — Narrative GM-world contract public API

The existing closed GM-world schema and prompt now live under Narrative ownership and are published through its public API. `gm.js` imports that API; the native renderer retains rendering, validation, storage, receipts, and compatibility exports. The fresh C07 regression plus six tests affected by the shared GM service passed **13/13**, exit **0**, in one blocking launch (**3,956.3878 ms**). Changed JavaScript syntax passed **5/5**. The RF05 ratchet remains failed on 955 existing groups/errors with 576 modules and zero unowned; changed paths have no findings. Transition `cc8076bdca29df6585e651bdf86e712bcfbf8fbf7bbc52f37b0a30f248a87f7d` was retired and preserved. **56** F04 assignments remain. Details and hashes: `C07-SCOPE.md`, `C07-RUN.json`, `C07-RETIRED.json`. Release remains NOT AUTHORIZED.

## C08 — World minor-NPC schema public API

The data-only World-owned `minorNpcSchema` now has its own World module and public export. `city-depth.js` retains mutation and persistence code plus the same compatibility object; `gm.js` uses World public. One frozen fresh union of eight changed-code test files passed **14/14**, exit **0**, duration **1,349.9331 ms**; syntax passed **5/5**. The architecture ratchet remains failed with 577 modules, zero unowned, 2,741 imports, and 955 active groups/errors. The GM public edge and new schema have no findings. Existing `city-depth.js` debt remains: five violation findings/two transition errors on unchanged location/edges. Transition `41a184d8e346809f13aa4feaf6a4c65501a4b20b1c040844046b09f4f857e886` is retired and preserved; **55** F04 entries remain. See `C08-SCOPE.md`, `C08-LEDGER.md`, `C08-RUN.json`, and `C08-RETIRED.json`. Release remains NOT AUTHORIZED.

## C09 — Intent decision-advisory boundary

The decision-advisory implementation moved byte-identically into Intent, both GM and turn-commit consumers use Intent public, and the root reader is retained as a compatibility re-export. Final affected-code batch passed **15/15** across nine fresh files, exit **0**, duration **1,367.1831 ms**; syntax passed **7/7**. One earlier batch found a stale C05 import-shape assertion; only that assertion was broadened and the complete union rerun against the final test bytes. Architecture ratchet remains failed with 578 modules, zero unowned, and 955 existing groups/errors; zero changed-path findings. Two private-import transitions were retired and preserved. The root location transition remains active. RF05-F04 has **54** and RF05-F05 has **441** assignments remaining. See `C09-SCOPE.md`, `C09-LEDGER.md`, `C09-RUN.json`, and `C09-RETIRED.json`. Release remains NOT AUTHORIZED.

## C10 — Intent GM-arbitration contract

The import-free arbitration contract moved byte-identically to Intent. The GM now imports it through Intent public; the root path remains a compatibility re-export for other consumers. Fresh changed-code batch passed **16/16** across ten files, exit **0**, duration **1,419.9164 ms**; syntax passed **5/5**. No inherited arbitration tests were run. The architecture ratchet remains failed at 579 modules, zero unowned, 2,743 imports, and 955 existing groups/errors. The new module and GM public import have no findings; three existing World consumers still trigger compatibility-path cross-framework findings. Transition `57e5bc30d209d7aa530428a034da2bc8fb26acf52065b046d599bb46c3d167cb` is retired and preserved; root location hold remains. **53** F04 assignments remain. See `C10-SCOPE.md`, `C10-LEDGER.md`, `C10-RUN.json`, and `C10-RETIRED.json`. Release remains NOT AUTHORIZED.
