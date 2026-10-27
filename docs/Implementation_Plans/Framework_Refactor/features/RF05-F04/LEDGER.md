# RF05-F04 execution ledger

**Status:** PARTIAL — model selection and twenty-six public-API slices qualified; 47 assigned RF05-F04 transition entries remain.
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

## C11 — Operations turn-trace public API

The AsyncLocalStorage trace module moved byte-identically to Operations; GM now imports from Operations public, while the root compatibility path continues sharing the same instance. The fresh affected-code union passed **17/17** across eleven files, exit **0**, duration **1,435.4649 ms**; syntax passed **5/5**. A new async regression verified cross-await context sharing and guild filtering across both paths. The architecture ratchet remains failed with 580 modules, zero unowned, 2,745 imports, and 955 groups/errors; changed paths have no findings. The GM private-import transition was retired and preserved, while the root module-location assignment remains. **52** F04 entries remain. See `C11-SCOPE.md`, `C11-LEDGER.md`, `C11-RUN.json`, and `C11-RETIRED.json`. Release remains NOT AUTHORIZED.

## C12 — Operations metrics public API

The operational metrics module moved byte-identically to Operations (same git blob) and now uses the Operations-owned turn trace; GM imports metrics from Operations public, while the root compatibility path keeps one class and singleton for 16 other consumers. The frozen affected-GM union passed **21/21** across twelve files, exit **0**, duration **6,055.9301 ms**; syntax passed **5/5**. The new regression verifies identity, trace retry/stage accounting with guild filtering, and that snapshots/incidents retain no prompt or reference text. Architecture ratchet remains failed with 581 modules, zero unowned, 2,747 imports, and 955 groups/errors; changed paths have no findings. The GM private-import transition was retired and preserved; the root module-location assignment remains. **51** F04 entries remain. See `C12-SCOPE.md`, `C12-LEDGER.md`, `C12-RUN.json`, and `C12-RETIRED.json`. Release remains NOT AUTHORIZED.

## C13 — Knowledge authority projection public import

The application GM now imports the Knowledge-owned `projectAuthorityRecords` implementation through `frameworks/knowledge/public.js`; the root compatibility export remains. The final fresh test passed **2/2** (exit **0**, 607.07 ms) after correcting one test assertion to match the existing wildcard export. Changed-file syntax passed **2/2**. RF05 ratchet remains failed on **950** prior groups/errors, but the saved report shows zero active findings and zero transition errors for `gm.js`. The exact GM import transition was retired and preserved; **50 RF05-F04 assignments remain** (1 legacy location, 1 external capability owner, 48 private API imports). See `C13-SCOPE.md`, `C13-RUN.json`, `C13-RETIRED.json`, and `phases/RF05/rf05-f04-c13-*.log`. No provider, network, database, or Discord use. RF05 and release remain incomplete/not authorized.

### C14 — Knowledge context-memory contract public import

At base `58bb25b6ae61e86bcb5feaf94abaff945ae27949`, moved the GM's schema/prompt import to the existing Knowledge public API. `frameworks/knowledge/context-memory.js` now exports the exact module-level values already returned by its factory, so the root compatibility reader preserves object identity and prompt text. The fresh test passed **1/1**, exit **0**, **453.3739 ms**; changed JavaScript syntax passed **4/4**. Exact private-import transition `cdb8c39fc7d883493d37795de97e9b82e6fd68aa812b677c67dfd4d98b451399` is preserved in `C14-RETIRED.json`; **49 RF05-F04 assignments remain**. RF05 architecture ratchet still fails with 950 aggregate active groups/errors, zero unowned modules, 581 source modules and no new findings on C14 changed paths. No provider, network, database or Discord calls; costs $0. Details, hashes, output and rollback: `C14-SCOPE.md`, `C14-RUN.json`, `C14-RETIRED.json` and `phases/RF05/rf05-f04-c14-*.log`. RF05 incomplete; release NOT AUTHORIZED.

## C15 — Narrative v9 writer contract public API

Extracted only the existing immutable v9 act-kind/native-clause schema values, writer response schema, and two instructions into Narrative-owned modules. The root modules remain compatibility re-exports; GM now uses Narrative public for the actual writer packet. No compiler, native validation, player control, audience, mechanics, receipts, or narrative wording changed. A fresh test exercised `GMService.generateNarrative` with a mocked provider and verified the actual schema and both instruction strings; **1/1 passed**, exit **0**, **609.2199 ms**. Syntax passed **9/9**. The exact GM private-import transition is preserved and retired; **48 RF05-F04 assignments remain**.

The RF05 ratchet remains failed with **950** aggregate groups/errors, zero unowned modules, 584 source modules, and no new findings on C15 changed paths; raw and accepted legacy occurrence totals each fell by one. Exact sources/tests/log/report hashes, results, rollback and costs are in `C15-RUN.json`. One provider-call boundary was mocked; paid provider use/tokens/spend, network, production DB and Discord use were all zero. RF05-F04 and RF05 remain incomplete; release is NOT AUTHORIZED.
## C16 — Narrative interpretation contract public API

Moved the exact interpretation schema and read-only interpretation instructions into Narrative-owned modules and exported them through Narrative public. The root `narrative-context.js` re-exports the same object/string identities and retains source capture, visibility, and validation. GM contract imports now use Narrative public; GM runtime helper imports remain on the compatibility path. No prompt wording, validation, privacy, mechanics, or player authority behavior changed.

Fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c16.test.mjs`: **1/1 passed**, exit **0**, one blocking launch, **491.6591 ms**. Changed JavaScript/MJS syntax: **6/6 passed**, exit **0**. The RF05 ratchet remains **failed**, exit **1**, at **950** active groups and **950** transition errors (586 modules, zero unowned, 2,758 imports, largest cycle 181), unchanged in group/error count from C15. The two new Narrative modules have no cross-framework dependencies; pre-existing findings on `gm.js` and `narrative-context.js` remain. No transition is retired because the compatibility module still serves runtime functions; **48 RF05-F04 assignments remain**. Test, source, syntax, architecture, and report hashes are in `C16-RUN.json`. No provider, network, production database, Discord, or CI access; provider cost $0. RF05-F04 and RF05 remain incomplete; release NOT AUTHORIZED.

Rollback only C16 by restoring the prior GM imports and definitions and removing the two contract modules/public exports. No persisted state changed.
## C17 — Narrative authority instruction public API

Moved the existing delegated GM writer instruction string unchanged into a Narrative-owned contract module, exported it from Narrative public, and switched the application GM's actual writer request to that API. The compatibility module re-exports the same string and keeps authoring/validation behavior. No instruction text or narrative boundaries changed.

The first frozen run passed 10/11 cases; the new test compared the production v9 response schema to a separate v8 schema. The assertion was corrected to use the actual v9 contract, with no production change caused by that test failure. The final fresh union of C16, C17, and the changed-GM P10-F08 regression passed **11/11** across three files, exit **0**, one blocking launch, **8,521.2785 ms**. Changed JavaScript/MJS syntax passed **9/9**, exit **0**. The RF05 ratchet remains failed at **950** groups and **950** transition errors, unchanged; 587 source modules, zero unowned, 2,761 imports, largest cycle 181. The new Narrative contract module adds no cross-framework dependency. No transition retired; **48 F04 assignments remain**. Exact hashes and failure/final logs are in `C17-RUN.json`. One mocked writer request, zero paid provider calls/tokens/spend, network, production database, Discord, or CI. RF05 remains incomplete; release NOT AUTHORIZED.

Rollback only C17 by restoring the prior GM import/string declaration and removing its Narrative module/export/test/evidence. No saved state changed.

## C18 — Narrative integrity instruction public API

Moved the existing narrative-claim instruction string unchanged into a Narrative-owned module and exported it through Narrative public. GM now imports the instruction publicly; the compatibility module re-exports the same string and retains schema/validator behavior. A comparison against the exact declaration at base HEAD passed; both values have SHA-256 `ff0a370d63e9a1e8ad7834cce5ec626077bc8804d8022adb916c62f89bdffb96`.

The frozen fresh union of all 18 current GM-dependent files passed **36/36**, exit **0**, one blocking launch, **17,868.0517 ms**. Changed JavaScript/MJS syntax passed **12/12**, exit **0**. RF05 architecture ratchet remains failed at **950** groups/errors, unchanged from C17; 588 source modules, zero unowned, 2,764 imports, largest cycle 181. The new Narrative contract module introduces no cross-framework dependency. No transition retired; 48 F04 assignments remain. Exact hashes and terminal data are in `C18-RUN.json`. No paid provider calls, tokens, spend, network, production database, Discord, or CI. RF05-F04 and RF05 remain incomplete; release NOT AUTHORIZED.

Rollback only C18 by restoring the prior GM import and root string declaration and removing C18's new module/API/test/evidence. No persistent state changed.

## C19 — World autonomy prompt public API

Published the existing World-owned autonomous-world instruction value through World public and switched the application GM to that API. The root compatibility module preserves the same value identity and existing World runtime functions. Exact comparison with base HEAD passed; baseline/current prompt SHA-256 is `0f5372c6e0b10f4cdaa86ee7cdcf4e91d39cd70150b21b1477c001d89a83cf1f`.

The frozen fresh union of 19 GM-dependent files passed **37/37**, exit **0**, one blocking launch, **17,944.705 ms**. Changed JS/MJS syntax passed **16/16**. RF05 architecture ratchet remains failed at **950** groups and **950** transition errors, unchanged from C18; 589 source modules, zero unowned, 2,767 imports, largest cycle 181. The new World contract module adds no cross-framework dependency. No transition retired; **48 F04 assignments remain**. Exact hashes and results are in `C19-RUN.json`. No paid provider calls, tokens, spend, network, production database, Discord, or CI. RF05-F04/RF05 remain incomplete; release NOT AUTHORIZED.

Rollback C19 only by restoring the old GM import/root declaration and removing the World contract module/public export/test/evidence. No persisted state changed. Commit is unavailable because `.git/index.lock` creation is denied by the execution environment; unrelated dirty work remains untouched.

## C20 — World simulation prompt public API

Moved only the existing World simulation instruction string into a World-owned module and exposed it through World public. The root compatibility module preserves the same prompt identity; its mixed World/Intent schema contracts remain there. Exact comparison with the base declaration passed; prompt SHA-256 is `ef71ac0e0eb039dc6742d98802d144df27bc5249d72ead54d021c0489d30dfe7`.

The frozen fresh union of 20 GM-dependent files passed **38/38**, exit **0**, one blocking launch, **18,370.7892 ms**. Changed JavaScript/MJS syntax passed **19/19**. The RF05 architecture ratchet remains failed at **950** active groups and **950** transition errors, unchanged from C19; 590 source modules, zero unowned, 2,770 imports, largest cycle 181. The new World prompt module adds no cross-framework dependency. No transition retired; **48 F04 assignments remain**. Hashes and terminal results are in `C20-RUN.json`. No paid provider calls, tokens, spend, network, production database, Discord, or CI. RF05-F04/RF05 remain incomplete; release NOT AUTHORIZED.

Rollback C20 only by restoring the old GM import/root prompt declaration and removing C20 module/public export/test/evidence. No persistent state changed. Git commit remains unavailable because the execution environment denies `.git/index.lock` creation; unrelated worktree edits remain untouched.

## C21 — World simulation update schema public API

Published the data-only simulation update schema through World public, preserving identity through the root compatibility export; GM now consumes the public contract. The 21-file fresh union initially passed 38/39 in 19,012.2857 ms. Its only failure was C20's stale static import-shape assertion after the valid combined import; no production defect was found. After updating that test assertion, its complete file passed 1/1 in 450.5643 ms. The union plus the focused repair provides 39/39 effective current-code passes across two launches, not a single all-green batch. Syntax passed 21/21. RF05 remains at 950 aggregate violations/errors with zero unowned and no changed-path findings; no transition retired and 48 F04 entries remain. See `C21-RUN.json`. No live provider/service usage; release NOT AUTHORIZED.

Rollback C21 only by restoring the old GM schema import and compatibility declaration and removing the World module/public export/test/evidence. No persistent state changed. Git commit remains unavailable because the environment denies `.git/index.lock` creation; preserve all unrelated dirty edits.

## C22 — Narrative material-claim schema public contract

Moved only the data-only material claim schema to Narrative ownership and exposed it through Narrative public. The compatibility module preserves identical schema identity and retains all native/evidence validation; GM uses public schema plus the existing compatibility validator. The fresh 22-file GM-dependent union passed **27/27**, exit **0**, 14,098.6494 ms; syntax passed **5/5**. RF05 ratchet remains failed at 950 active groups/errors, 592 modules, zero unowned, 2,775 imports, largest cycle 181. The console summary omitted changed-path findings, so none are inferred. No transition retired; 48 F04 assignments remain. See `C22-RUN.json`. No provider or external service use; release NOT AUTHORIZED.

Rollback C22 by restoring the old GM schema import and compatibility declaration and removing only this schema module/public export/test/evidence. No persistent state changed.

## C23 — NPC Director schema bridge attempt deferred

The attempted bridge passed 28/28 fresh cases but failed architectural acceptance: the World-owned historical `simulation-schema.js` compatibility reader would import its Intent/World pair adapter. The bridge implementation, test, and package/registry adoption were withdrawn; the existing pair record is restored to `PROPOSED_NO_API`. After withdrawal, RF05 returned to 950 active groups/errors, zero unowned, 592 modules and 2,775 imports. This local hold defers only the compatibility-reader ownership question; C24 proceeds with the independently safe World-only action catalog. See `C23-RUN.json`. Release NOT AUTHORIZED.

## C24 — World action catalog extraction

Moved the existing action and major-impact arrays to a World-owned module and published them through World public. `simulation.js` preserves exact compatibility identity. The fresh C24 test passed **1/1**, exit **0**, 511.4329 ms; syntax passed **5/5**. RF05 aggregate gate remains failed at 950 active groups/errors, 593 modules, zero unowned, 2,777 imports and largest cycle 181. The new catalog/public export have no reported findings; pre-existing `simulation.js` violations remain. No transition retired; 48 F04 entries remain. See `C24-RUN.json`. Release NOT AUTHORIZED.

Rollback C24 by restoring both catalog arrays in `simulation.js` and removing its import, World public export and the C24-owned test/module/evidence. No persisted state changed.

## C25 — World NPC action proposal schema

Moved only the World-owned `npcActionSchema` into World public. The simulation compatibility module re-exports the same object and retains the combined Director schema with its existing Intent contract. Fresh test passed **1/1**, exit **0**, 96.2373 ms; syntax passed **4/4**. RF05 ratchet remains at 950 active groups/errors, 594 modules, zero unowned, 2,779 imports and largest cycle 181. The new schema has no reported finding; the old simulation-schema location and Intent import remain. No transition retired; 48 F04 assignments remain. See `C25-RUN.json`. Release NOT AUTHORIZED.

## C26 — World Director review-category contract

Moved the ordered review category list into the World Director cadence module and exposed it through World public. `director.js` re-exports the exact same value and retains review validation; GM imports the categories publicly. The fresh 25-file shared-GM union passed **30/30**, exit **0**, 14,511.683 ms; syntax passed **5/5**. RF05 ratchet remains at 950 active groups/errors, 594 modules, zero unowned, 2,780 imports and largest cycle 181. No new contract finding; the legacy `director.js` location remains. No transition retired; 48 F04 entries remain. See `C26-RUN.json`. Release NOT AUTHORIZED.

## C27 — Intent authored-candidate schema contract

Moved the candidate schemas and source-span prompt to Intent public while preserving identical compatibility exports and leaving persistence in place. The fresh 26-file shared-GM union passed **31/31**, exit **0**, 14,716.6291 ms; syntax passed **5/5**. RF05 ratchet returned to 950 active groups/errors after retiring the exact GM-to-compatibility transition `ee1f7416c348e4db4a44c8ed308f6a5d0ff9204fd7013c95e033bfef188b168f`; the new Intent contract paths have no findings. 47 F04 assignments remain. See `C27-RUN.json` and `C27-RETIRED.json`. Release NOT AUTHORIZED.

## C28 — World proposal schemas public contract

Moved the three data-only World proposal schemas to World public, preserving compatibility identity and keeping all runtime authority and persistence in place. The fresh 27-file shared-GM union passed **32/32**, exit **0**, 14,950.2107 ms; syntax passed **5/5**. RF05 ratchet remains at 950 active groups/errors, 596 modules, zero unowned, 2,785 imports, and largest cycle 181. New schema/public paths have no findings; prior autonomous-world.js findings remain. No transition retired; 47 F04 assignments remain. See `C28-RUN.json`. Release NOT AUTHORIZED.

## C29 — World private seed proposal contract

Moved only the bounded private-world-seed schema/instruction contract to World public. The root module retains source verification and native capability flow with identical compatibility exports; GM consumes the schema publicly. Fresh test **2/2** passed (exit 0; 643.2196 ms), syntax **4/4** passed, architecture remains at 950 groups/errors with zero unowned. 47 F04 assignments remain. See `C29-RUN.json`; release not authorized.

## C30 — World post-turn review contract

Moved the pure structured-review validator to World public and switched GM to the public export while preserving director.js compatibility identity. Fresh C30 and P10-F08 batch passed **12/12**, syntax **4/4**. The first gate found the exact now-unused GM-to-director transition; after preserving and retiring it, RF05 remains at 950 aggregate groups/errors, 598 modules, and zero unowned. 46 F04 assignments remain. See `C30-RUN.json` and `C30-RETIRED.json`. Release not authorized.

## C31 — World history context reader

Moved bounded historical summary retrieval to World public and switched GM to the public contract. The first C31/P10 batch passed 11/12; all 9 P10-F08 cases passed. The only failure was a test expectation that overlooked one summary fitting the 10k budget; the failed C31 case passed 1/1 in a targeted repair run. Do not represent the evidence as one green union. Syntax passed 4/4. After retiring the exact unused GM-to-city-civic transition, RF05 remains at 950 groups/errors, 599 modules, zero unowned; 45 F04 assignments remain. See C31 RUN and RETIRED records. Release not authorized.

## 2026-10-26 C23 reopened and resolved

Audit proved only GM imported the static simulation schema; it was not a saved-receipt reader or executable entrypoint. Revised scope retires that source after its sole caller adopts the Intent–World pair, preserving exact serialized schema fingerprint 10bbb4dcf1ee42ef7e0b65eb9a6a98db5a27f28ddc64bd5b704c02c117c31024, nested World/Intent object identity and current public World exports. Six wholly new actual GM/schema/transport tests passed 6/6, exit 0, TAP 1367.0752 ms; changed-file syntax 3/3. Five total mocked provider dispatches across GM cases; identical concurrent callers share one request, refusals stay one and malformed JSON retains two attempts. Native SQLite state unchanged by planning. Three exact obsolete records retired with originals retained. RF04 ratchet exit0; RF05 exit1 on 944 expired groups/errors, 603 modules, zero unowned, 2797 imports, largest SCC181. Prior withdrawn attempt and obsolete-reader test results remain historical, not current acceptance. Source/test/log hashes and replacement matrix: C23-REOPENED-RUN.json. C23 hold resolved; RF04/RF05 remain incomplete. Provider cost $0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.

## 2026-10-26 C26 Knowledge-owned context selection / saved World history

Original ContextPlanner class body now executes in Knowledge using its own evidence/cluster/authority modules and fixed original World history consumer through existing pair. Application root remains same-class alias, no frozen owner reclassification. Saved C31 World history extraction adopted unchanged after exact committed-body equality review; other saved GM switches/public edits preserved separately. Seven new plus final affected C22 seven14/14pass exit0 TAP2448.1588ms; syntax10/10; one frozen batch/no repairs. C22 whole current final file7/7passes after associated Knowledge initializer change, closing prior split-final-file gap. Actual native dossiers→NPC-owned context excluding global/otheractor before ranking, private owner/recipient exact facts, page/budget/omissions/input bounds, native civic summary→GM-only context, original source retraction/restart and summary query/aggregate bounds exercised.4exact application-policy imports retired. RF04 passes685modules/0unowned/2992imports/2085rawaccepted/2cycles/largest144/0activeerrors; RF05 remains733expiredgroups/errors.2068exact open/323resolved since audit. No inherited tests executed; source hashes reflect preserved working tree, no full phase/live/release qualification. Evidence C26-RUN.json. Provider0tokens0cost$0; CodexUNMEASURED; RELEASE NOT AUTHORIZED.
