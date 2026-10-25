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
| RF05-F03 | PARTIAL — SCOPED SLICES QUALIFIED, 289 ASSIGNED TRANSITIONS LOCALLY HELD | Final frozen batch 9/9 pass, syntax 9/9 pass; no changed-path violations. See `RF05-F03-LEDGER.md`, `RF05-F03-RUN.json`, and `LOCAL_HOLDS.json`. |
| RF05-F04 | PARTIAL — MODEL-SELECTION + ONE PUBLIC API IMPORT QUALIFIED; 61 ASSIGNED ENTRIES REMAIN | Original fresh test 3/3 pass; C02 fresh test 1/1 pass; changed-path findings absent for C02. See `features/RF05-F04/LEDGER.md`, `RF05-F04-RUN.json`, and `features/RF05-F04/C02-RUN.json`. |
| RF05-F05 | PARTIAL — PURE MUTATION-RESULT AGGREGATION QUALIFIED; 442 ASSIGNED ENTRIES REMAIN | Fresh test 3/3 pass, syntax 3/3 pass; no changed-path findings. See `features/RF05-F05/LEDGER.md` and `RF05-F05-RUN.json`. |
| RF05-F06 | QUALIFIED CHECKPOINT — PHASE GATE FAILED | One changed-code union member 7/7 pass, syntax 14/14 pass; architecture gate fails on 967 prior transition errors. See `features/RF05-F06/LEDGER.md` and `RF05-F06-RUN.json`. |

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
