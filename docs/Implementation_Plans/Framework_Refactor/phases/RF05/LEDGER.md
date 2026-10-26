# RF05 — execution ledger

## Intake

- Actual start commit: `72479cbf51c6abe836e57335d3de5284c969e0e1`
- Branch: `codex/clean-ai-gm-2026-10`
- Worktree: five pre-existing user-edited source files and unrelated untracked RF04 diagnostic logs are preserved; they are outside RF05's changes.
- RF04 status: incomplete with explicit source-composition and coverage holds. RF05 work is limited to independently authorized ownership/transition slices and does not certify RF04.
- Phase authority: roadmap `Framework_Refactor/PHASE_DEPENDENCIES.md`; module/function assignments `FUNCTION_OWNERSHIP.md`, `SOURCE_RELOCATION_CROSSWALK.csv`, and the frozen transition manifest. No transition IDs, source edges, counts or deadlines may be changed for convenience.
- Critical blocker: none identified at intake.

## Feature status

| Feature | Status | Evidence |
|---|---|---|
| RF05-F01 | COMPLETE FOR SCOPED BOUNDARY | Four fresh tests passed in the final frozen batch; changed-file syntax passed; exact path and cross-import transitions were removed after the corresponding source occurrences disappeared. The RF05 ratchet remains failed on prior RF04 transition debt. See `RF05-F01-LEDGER.md` and `RF05-F01-RUN.json`. |
| RF05-F02 | COMPLETE FOR SCOPED RAW-TRANSPORT BOUNDARY | Final fresh test 7/7 pass, syntax 4/4 pass; architecture gate finds no changed-path violations but remains failed on prior RF04 debt. See `RF05-F02-LEDGER.md` and `RF05-F02-RUN.json`. |
| RF05-F03 | PARTIAL — SCOPED SLICES QUALIFIED, 289 ASSIGNED TRANSITIONS LOCALLY HELD | Final frozen batch 9/9 pass, syntax 9/9 pass; C02 guidance source move qualified, root compatibility-location transition remains active. See `RF05-F03-LEDGER.md`, `RF05-F03-RUN.json`, and `LOCAL_HOLDS.json`. |
| RF05-F04 | PARTIAL — MODEL-SELECTION + TWELVE PUBLIC-API SLICES QUALIFIED; 50 ASSIGNED ENTRIES REMAIN | Original test 3/3 pass; scoped C02–C13 API imports qualified; current Knowledge public import test passed 2/2. See `features/RF05-F04/LEDGER.md` and feature RUN records. |
| RF05-F05 | PARTIAL — PURE MUTATION-RESULT AGGREGATION QUALIFIED; 442 ASSIGNED ENTRIES REMAIN | Fresh test 3/3 pass, syntax 3/3 pass; no changed-path findings. See `features/RF05-F05/LEDGER.md` and `RF05-F05-RUN.json`. |
| RF05-F06 | QUALIFIED CHECKPOINT — PHASE GATE FAILED | One changed-code union member 7/7 pass, syntax 14/14 pass; architecture gate fails on 967 prior transition errors. See `features/RF05-F06/LEDGER.md` and `RF05-F06-RUN.json`. |

### RF05-F04 C07 — Narrative GM-world contract

The schema and prompt were isolated under Narrative ownership and exposed through its public API; the application GM now imports that contract publicly while the native renderer and compatibility exports remain intact. One frozen blocking fresh batch covering C07 and six affected current-GM tests passed **13/13**, exit **0**, in **3,956.3878 ms**. Changed JavaScript syntax passed **5/5**. The phase architecture ratchet remains failed on **955** prior groups/errors: 576 modules, zero unowned, 2,739 imports. C07 changed paths have no boundary findings. The exact retired transition is preserved in the feature evidence; **56** F04 assignments remain. See `features/RF05-F04/C07-RUN.json`. RF05 remains incomplete; release is NOT AUTHORIZED.

### RF05-F04 C08 — World minor-NPC schema public API

The unchanged World-owned proposal schema is separated from the mixed city-depth mutation module and published through World public; GM now uses that API. The frozen affected-GM union passed **14/14** across eight fresh files, exit **0**, duration **1,349.9331 ms**; syntax passed **5/5**. RF05 ratchet remains failed with 577 modules, zero unowned, 2,741 imports, and 955 active groups/errors. The GM public edge/new schema have no findings; five existing findings and two expired transitions remain on unchanged `city-depth.js` edges. The exact GM import transition was retired and preserved; 55 F04 assignments remain. See `features/RF05-F04/C08-RUN.json`. RF05 remains incomplete; release is NOT AUTHORIZED.

## Phase closeout

- Phase status: INCOMPLETE / IN PROGRESS.
- RF05-F01 final fresh tests: 4/4 pass, exit 0, 65.9672 ms. Changed-code syntax: 4/4 checks pass, exit 0.
- RF05-F02 final fresh tests: 7/7 pass, exit 0, 657.8748 ms; one initial 6/7 run failed only because the delegate normalized default options, then passed after exact option forwarding. Changed-code syntax: 4/4 checks pass, exit 0.
- RF05-F03 final frozen tests: 9/9 pass, exit 0, 95.8206 ms. Changed-code syntax: 9/9 checks pass, exit 0. The prompt-budget test was rerun because the associated `gm.js` import path changed; it passed again.
- Latest phase-aware architecture ratchet after F05-F05: fail, exit 1; 572 source modules, zero unowned, 2732 imports, 968 active prior-phase groups and 967 transition errors. No F01–F05 changed-path violations or transition errors. RF04's gate passed at RF04, but unresolved RF04 records are expired under RF05; RF04 remains incomplete. RF05-F03 retains 289 locally documented exact assignments; F04 retains 62 and F05 retains 442. This failure does not stop independent RF05 work.
- Final RF05 checkpoint member `rf05-f02-model-transport.test.mjs`: 7/7 pass, exit 0, 640.1087 ms. It was rerun because its `GMService` production module `gm.js` changed in F04. Other unchanged feature-specific test evidence is carried forward without rerun. Final changed-code syntax: 14/14 pass. The architecture gate remains failed; RF05 is incomplete, and RF06's runtime implementation remains held on its declared phase dependency.
- Architecture and changed-code evidence: recorded per feature; the final union is reserved for RF05-F06.
- Release: NOT AUTHORIZED.
- Rollback: revert only RF05-specific commits in reverse order; do not reset or clean the checkout and do not revert pre-existing user changes.
- RF05-F04 has a qualified model-selection slice; continue its workflow decomposition and retain its 62 exact assigned transition obligations. RF05-F03 remains locally incomplete; its held transitions are not treated as resolved by later-phase work.

### RF05-F04 C02 checkpoint — Session public principal import

At base `e0bdf443a148b89f6642bbbd1c6d78e8b69576ec`, the application GM module now imports `conversationPrincipal` through the published Session interface. The fresh disposable-SQLite test passed 1/1 (single blocking launch, exit 0, 964.9156 ms); changed JavaScript syntax passed 2/2. This removes one exact RF05-F04 transition, preserving its entire original record in `features/RF05-F04/C02-RETIRED.json`; 61 F04 entries remain. The post-correction RF05 ratchet still exits 1 on 967 existing transition errors/groups, with 572 modules and zero unowned. The changed path has no active violation/error. See `features/RF05-F04/C02-RUN.json`; release remains NOT AUTHORIZED.

## Architecture gate correction — RF05-F03 test path

The bridge registry's `ai-provider--knowledge` entry referenced `rf05-f03-prompt-budget.test.mjs`, which the checker does not recognize as a fresh feature-test path. The test was renamed without content edits to `rf05-f03-c01.test.mjs`; registry, scope, and evidence references were updated. The test was not rerun because its contents and production dependencies are unchanged. Current RF03 and RF04 ratchets pass with zero active groups/errors. Current RF05 ratchet remains failed on **967** prior-phase groups and **967** transition errors (not 968); the extra group is removed. Exact outputs are the three `*-prompt-budget-path-correction-architecture.log` records under `phases/RF03`, `RF04`, and `RF05`. This correction does not resolve RF05 transition debt or complete RF04/RF05. Release remains NOT AUTHORIZED.

### RF05 gate update after RF04 Option B reassignment

The owner-approved metadata-only correction reassigned 12 exact Publication-owned consumer edges from RF04 to RF06-F03. The current RF05 ratchet now fails with 955 active violation groups and 955 transition errors (exit 1), down from 967. This is not RF05 completion: remaining RF04-era debt and RF05 feature obligations still fail the gate. No RF05 source or tests changed in this reconciliation; no tests were rerun.

### RF05-F04 C03 — World public civic-context import

On base commit `b4ac04107f6dd8492f55ccb9faf9275a1560dd60`, the application GM module adopted the already published World `cityContext` API. The final fresh test passed 1/1 (exit 0; 625.478 ms), with changed JavaScript syntax 2/2 pass. The exact obsolete import transition was retired and preserved; the RF05 gate remains failed at 955 active groups/errors with zero unowned modules and no active changed-path findings. RF05-F04 now has 60 assigned entries remaining. Details and hashes are in `features/RF05-F04/C03-RUN.json`; no provider or production database use. RF05 remains INCOMPLETE and release NOT AUTHORIZED.

### RF05-F03 C02 / RF05-F04 C04 — Narrative public guidance

At base commit `0ea8d924149b36a6ae938d83463bf91e48c61732`, the unchanged Director guidance value moved into Narrative and is exported from its public API. The root path remains as a compatibility re-export for three existing tests, leaving the F03 source-location transition active. One fresh test passed 1/1 (exit 0; 550.797 ms); changed-file syntax passed 5/5. The RF05 ratchet remains failed at 955 active groups and 955 transition errors, with zero unowned modules and no active findings on changed paths. Only the exact F04 GM-import transition was retired. RF05-F03 has 289 and RF05-F04 has 59 assigned entries remaining. Evidence and hashes are in `features/RF05-F03/C02-RUN.json` and `features/RF05-F04/C04-RUN.json`. No model calls or spend; RF05 remains incomplete and release NOT AUTHORIZED.

A targeted shared-GM recheck then ran the RF05-F02 transport, RF05-F04 C02 Session-principal, and RF05-F04 C03 World-context tests once after `gm.js` changed. The batch passed **9/9**, exit **0**, duration **1,917.7243 ms**. No legacy suites or broad validation ran; no provider calls or spend. Detailed test hashes and per-feature counts are in the affected feature RUN files.

### RF05-F04 C05 — Intent public contract

The GM now imports Intent prompt/schema contracts through the Intent public API; the unchanged implementation moved byte-for-byte into the Intent framework and the old root file remains a compatibility re-export. Fresh test `rf05-f04-c05.test.mjs` passed **1/1**, exit **0**, in **550.7978 ms**; changed JavaScript syntax passed **5/5**. Transition `9adda1062fb5ec114195328c1ff9008f15f9722203ff40fe98e27b719e6564b4` was retired and preserved; 58 RF05-F04 entries remain. The RF05 ratchet remains failed on 955 pre-existing violation groups/errors, with 574 modules and zero unowned modules. Four existing framework consumers still use the root compatibility re-export and are not qualified by C05. See the feature's `C05-RUN.json` and supporting scope/ledger/retired record. No provider calls, network, or database access; release remains NOT AUTHORIZED.

The F06 changed-GM checkpoint was refreshed against C05: `rf05-f02-model-transport.test.mjs` passed **7/7** (exit **0**, 559.3211 ms), and the three stale GM-consumer tests passed **3/3** (exit **0**, 794.1741 ms). C05's own test passed 1/1; C05 syntax passed 5/5. The current ratchet is 574 modules, zero unowned, 2736 imports, and 955 active groups/errors (exit 1). See `features/RF05-F06/RF05-F06-RUN.json` for the current refresh. RF05 remains incomplete and release is NOT AUTHORIZED.

The subsequent C06 public-schema adoption refreshed the affected-GM union once: **12/12** passed across six fresh test files, exit **0**, duration **3,381.2046 ms**; syntax passed **5/5**. Current ratchet is 575 modules, zero unowned, 2,738 imports, and 955 existing groups/errors (exit 1). RF05-F04 has 57 assignments remaining. See the `after_c06_refresh` evidence in `features/RF05-F06/RF05-F06-RUN.json`; RF05 remains incomplete and release is NOT AUTHORIZED.

### RF05-F04 C06 — Narrative schema public API

The self-contained schema module moved byte-for-byte into Narrative and the GM now imports its two schema contracts via Narrative public API. A single frozen fresh batch ran the new C06 test and five existing fresh tests whose shared `GMService` dependency changed: **12/12** passed, exit **0**, duration **3,381.2046 ms**; changed JavaScript syntax passed **5/5**. The current RF05 ratchet exits **1** with 575 modules, zero unowned, 2,738 imports, and 955 existing active groups/errors. The GM schema edge is absent; two root compatibility consumers remain. Exact transition is preserved in C06 retired evidence; 57 RF05-F04 entries remain. RF05 remains incomplete and release is NOT AUTHORIZED.

Because `gm.js` changed after the earlier RF05-F06 checkpoint, its recorded changed-code union does not qualify the current bytes. The targeted affected tests above are current evidence; the phase-wide changed-code union must be frozen and run at the next RF05-F06 qualification attempt after implementation work is complete.

### RF05-F04 C07 — Narrative GM-world contract

The schema and prompt were isolated under Narrative ownership and exposed through its public API; the application GM now imports that contract publicly while the native renderer and compatibility exports remain intact. One frozen blocking fresh batch covering C07 and six affected current-GM tests passed **13/13**, exit **0**, in **3,956.3878 ms**. Changed JavaScript syntax passed **5/5**. The phase architecture ratchet remains failed on **955** prior groups/errors: 576 modules, zero unowned, 2,739 imports. C07 changed paths have no boundary findings. The exact retired transition is preserved in the feature evidence; **56** F04 assignments remain. See `features/RF05-F04/C07-RUN.json`. RF05 remains incomplete; release is NOT AUTHORIZED.

### RF05-F04 C09 — Intent decision-advisory public boundary

The decision-advisory implementation moved unchanged into Intent; GM and turn-commit consumers now use Intent public, and the old path remains as a compatibility re-export. The final affected-code test union passed 15/15 across nine fresh files (exit 0, 1,367.1831 ms); syntax passed 7/7. An initial batch exposed one outdated import-shape assertion; after that test-only adjustment, the whole union passed against the final test bytes. RF05 ratchet remains failed at 578 modules, zero unowned, 2,742 imports, 955 groups/errors; zero changed-path findings. Two exact private-import transitions were retired, leaving 54 RF05-F04 and 441 RF05-F05 records. The root location hold remains active. See `features/RF05-F04/C09-RUN.json`. RF05 remains incomplete; release NOT AUTHORIZED.

### RF05-F04 C10 — Intent GM-arbitration public import

Moved the import-free arbitration contract byte-identically into Intent and switched only GM to Intent public; kept the root compatibility path for other consumers. Fresh changed-code union passed 16/16 across ten files (exit 0, 1,419.9164 ms); syntax passed 5/5. No inherited arbitration tests ran. RF05 ratchet remains failed at 579 modules, zero unowned, 2,743 imports, and 955 active groups/errors. The GM public edge/new module have no findings; three unchanged World consumers still have compatibility-path boundary findings. Retired and preserved one exact F04 transition; 53 F04 assignments remain. See `features/RF05-F04/C10-RUN.json`. RF05 remains incomplete; release NOT AUTHORIZED.

### RF05-F04 C11 — Operations turn-trace public import

Moved the AsyncLocalStorage trace module byte-identically into Operations and routed the GM import through Operations public. Fresh affected-code union passed 17/17 across eleven files (exit 0, 1,435.4649 ms); syntax passed 5/5. The new regression verified shared context identity across async awaits and guild filtering through both public and compatibility paths. RF05 ratchet remains failed with 580 modules, zero unowned, 2,745 imports, and 955 groups/errors; C11 paths have no findings. The exact GM import transition is retired and preserved; root location hold remains. RF05-F04 has 52 assignments remaining. See `features/RF05-F04/C11-RUN.json`. RF05 remains incomplete; release NOT AUTHORIZED.

### RF05-F04 C12 — Operations metrics public import

Moved the operational metrics module byte-identically into Operations and routed the GM import through Operations public; the moved module now shares the Operations-owned turn trace. Fresh affected-code union passed 21/21 across twelve files (exit 0, 6,055.9301 ms); syntax passed 5/5. The new regression verified public/compatibility identity, trace retry and stage accounting, and that telemetry snapshots retain no prompt or reference text. RF05 ratchet remains failed with 581 modules, zero unowned, 2,747 imports, and 955 groups/errors; C12 paths have no findings. The exact GM import transition is retired and preserved; root location hold remains. RF05-F04 has 51 assignments remaining. See `features/RF05-F04/C12-RUN.json`. RF05 remains incomplete; release NOT AUTHORIZED.

### RF05-F02 C02 — Restore deferred Responses-client validation

Reconciliation found RF04-F04 C08/C09 failing at HEAD because RF05-F02 added a construction-time Responses-client check. Removed only that check, restoring dispatch-time failure. 28/28 across 15 files, exit 0; RF04 ratchet passes, RF05 955 groups/errors unchanged, no changed-path findings. See `features/RF05-F02/C02-LEDGER.md`. Release NOT AUTHORIZED.

### RF05-F04 C13 — Knowledge authority projection public import

`gm.js` now imports `projectAuthorityRecords` through Knowledge public; the root compatibility reader remains. The fresh repaired test passed **2/2**, exit **0**, **607.07 ms**; changed-file syntax passed **2/2**. The first test attempt failed 1/2 because its assertion expected a named export instead of the existing wildcard route; the assertion alone was corrected before the final whole-file run. The RF05 architecture ratchet remains failed at 950 groups/errors, with zero unowned and zero `gm.js` changed-path findings. Exact transition `44030eadc4099d258170c650827e85d01ff58bf128ca62652198f53ada5bbb06` was preserved and retired; 50 RF05-F04 assignments remain. Hashes, logs, costs and rollback are in `features/RF05-F04/C13-RUN.json`. No provider/network/database/Discord calls. RF05 remains INCOMPLETE; release NOT AUTHORIZED.
