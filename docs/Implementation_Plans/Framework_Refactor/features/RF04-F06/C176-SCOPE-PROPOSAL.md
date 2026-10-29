# C176 — Retire the Session opening-attendance composition root

**Status:** read-only scope proposal; no production implementation or qualification.  
**Reviewed checkout:** `37046e2a8a140bea36a1ecee01f8efc7b9116fee` on `codex/clean-ai-gm-2026-10`, with concurrent C165–C167 and C175 working-tree changes present.  
**Owner authorization:** `phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` (2026-10-28).  
**Feature owner:** Session. **Proposed slice:** RF04-F04 C176, including the single exact RF06-F04 prerequisite import repoint authorized by that owner decision.

## Purpose and bounded change

Retire the 10-line root composition module `bot/src/session-opening-attendance.js`. The registration, carry, receipt verification, and opening-entry-opportunity implementations already live in Session at `bot/src/frameworks/session/opening-attendance.js`; C04 qualified those existing receipt semantics. C176 moves only the module-level Session composition into a Session-owned service and points the one production caller at Session's public API.

Proposed new file: `bot/src/frameworks/session/opening-attendance-service.js`.

That service will import only same-owner modules:

- `createOpeningAttendance` from `./opening-attendance.js`;
- `sessionWorldEvents` from `./contracts/world-events.js`;
- `sessionOpeningAttendanceSource` from `./contracts/opening-sources.js`.

It will create one module-level attendance service with the existing deferred `indexWorldEvent` callback, bind the same `inspectOpeningEntryOpportunity` function to the existing attendance source port at module evaluation, and expose the four original named functions unchanged in signature and forwarding behavior: `registerOpeningAttendance`, `carryOpeningAttendance`, `inspectOpeningEntryOpportunity`, and `prepareOpeningEntryOpportunity`. `frameworks/session/public.js` will re-export those four functions directly from the new service and retain its existing `createOpeningAttendance` export from `opening-attendance.js`.

`commands.js` will import its existing three attendance functions from `frameworks/session/public.js`, merged into an existing Session public import. It will retain its current C165–C167 workflow imports and all other concurrent edits. The root file will be removed; no forwarding shim is proposed.

## Caller and module-evaluation review

Static search of `bot/src`, `bot/scripts`, `bot/tooling`, and `bot/package.json` found one production reverse importer: `bot/src/commands.js`, which uses `registerOpeningAttendance`, `carryOpeningAttendance`, and `prepareOpeningEntryOpportunity`. The fourth export, `inspectOpeningEntryOpportunity`, is supplied through `sessionOpeningAttendanceSource` to the existing Narrative–Session bridge; that consumer does not import the root file. No script, tooling, or package entrypoint refers to the root path.

The Session service must import its factory and ports by direct local paths, never through `frameworks/session/public.js`. This avoids a `public.js -> service -> public.js` evaluation cycle. The two port objects are the existing singleton exports; importing them directly preserves their identity. The World-event callback must continue to look up `sessionWorldEvents.indexWorldEvent` when invoked, so normal composition may bind the event issuer after module evaluation. Binding `sessionOpeningAttendanceSource` remains a module-load action, using the exact service function exported publicly.

Re-exporting the service from the Session public barrel will evaluate that service whenever the barrel is evaluated. Static inspection shows this adds only the existing service allocation and fixed port binding, with no database operation or provider/service startup. The fresh changed-code test for C176 should verify the uncomposed fail-closed port behavior, normal composed event issuance, single source binding, and the preserved registration/carry/entry receipt behavior. This import-timing observation is a test obligation, not evidence of a current defect.

Existing test files still contain direct imports or source-shape assertions for `session-opening-attendance.js`. They are historical references and are not production callers. Do not run, migrate, edit, or repurpose them under the repository test protocol. Any new C176 test must import the new Session public API and only the production modules changed by C176.

## Exact transition records and authority

Retire only these two existing transition records, together with their source changes:

| Transition ID | Existing edge | Assignment and C176 treatment |
|---|---|---|
| `241656707ebf1d55740dddd7437ee28474587d249cc6de96661ab1f8d260836e` | `LEGACY_MODULE_LOCATION`: `bot/src/session-opening-attendance.js` | Owner `session`; assigned `RF04-F04`; retire when the composition is physically relocated and the root path is absent. |
| `00f30243a5aea5f94236f27af728028537df58e502ade94b3a450d3d3e804afb` | `IMPORTS_PRIVATE_API`: `bot/src/commands.js` → `bot/src/session-opening-attendance.js` (`./session-opening-attendance.js`) | Owner `application`; assigned `RF06-F04`; retire when commands use the Session public API. This exact prerequisite is covered by the 2026-10-28 owner authorization to migrate only RF06 dependencies needed to close RF04, preserving standalone DB construction and saved formats. |

The prerequisite authorization supersedes the general RF06 entry hold only for this exact dependency. It grants no broader RF06 work. RF05's scope permits separately authorized work while RF04 remains incomplete; that statement does not itself authorize unrelated import edges. No transition is added, broadened, waived, or reassigned in this proposal.

## Behavior and compatibility constraints

C176 is a relocation and public-import change. Keep `opening-attendance.js` implementation bytes unchanged. Preserve:

- one Session attendance service instance and the existing fixed Session/World event-consumer and opening-source port instances;
- existing deferred World-event binding and module-load opening-source binding;
- the four exported function names, their argument forwarding, return values, and exception behavior;
- receipt/event/mutation keys, hashes, issuer, visibility, status transitions, duplicate/replay behavior, transactions, and owner/source verification;
- saved `opening_attendance_registration`, `opening_attendance_carry`, and `opening_entry_opportunity` rows and historical acknowledgments as read today;
- attendance as an operational declaration only, without inferred arrival, placement, consent, execution, or publication.

No database schema, gameplay rule, narrative policy, saved-format migration, command wording, CLI/package script, release manifest, or unrelated root module is in scope.

## Source snapshot and hashes

These hashes describe the reviewed working tree, including unrelated in-progress `commands.js` edits. Recompute the full touched-source set when C165–C167 and C175 are frozen; do not use a mismatch to overwrite or reset concurrent changes.

| Reviewed file | SHA-256 |
|---|---|
| `bot/src/session-opening-attendance.js` | `7A4BAB0BFA963F43C427108BDD5B536F7FBD0BAD325FAEC79B228468C50404A2` |
| `bot/src/commands.js` | `2004F88499ED1793AF813CCFCBDDC0D49046CFD690F1BC0D849C90C2580DC05C` |
| `bot/src/frameworks/session/opening-attendance.js` | `BCC34FF0E8E6B383578E6F5F1492934D582B0C996F912360A24BC050F488C09F` |
| `bot/src/frameworks/session/contracts/world-events.js` | `F39C313903F71E327A6C1718ED644FE100A54F39751BA7978896ADF26850667D` |
| `bot/src/frameworks/session/contracts/opening-sources.js` | `DFBE2241D9D45E25C41D2D468696C383D786349DDA764197978C2F621C7C03CB` |
| `bot/src/frameworks/session/public.js` | `2F5CF9B0288565729EBD0F2C8535A0C999A673DE63CDC5DD0E7C1FA2F3B43FBF` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `06E9301691F80CB764B7B04458306B42FCB7DE7DDBC8D3B130C6D654B6079FC8` |

The root service destination does not yet exist. `commands.js`, the transition manifest, C165–C167 relocation files, and the C175 scope are already dirty/untracked in the shared worktree; C176 implementation must preserve those changes and apply only its attendance import hunk and two exact transition retirements.

## Verification plan (deferred)

No tests, syntax checks, architecture checks, or test imports were run for this proposal. `TEST_PROTOCOL.md` prohibits historical test reuse and requires new changed-code-only tests, with one frozen blocking batch and no polling. The current instruction is to keep the C165–C167/C175 combined batch frozen and not start C176 source edits or tests until that source freeze is lifted.

After the freeze lifts, the C176 implementation batch should add a new focused test under `bot/tests/ai-gm-2026-10/` covering public export identity, module-load source binding, World-event composition, and existing SQLite receipt/replay behavior against saved-shape fixtures generated in the new test. Then syntax-check only the changed JS/MJS, run that new test once as a blocking command, and run the specifically authorized RF04 architecture ratchet. Record exact changed-source/test/input hashes, actual outcomes, and the transition retirement archive. This proposal supplies design only and makes no qualification claim.

## Rollback

Reverse only C176's four source actions: restore `bot/src/session-opening-attendance.js` from the reviewed snapshot, remove `opening-attendance-service.js`, remove only the four C176 re-exports from Session `public.js`, and restore the `commands.js` attendance import while preserving every concurrent workflow import and other `commands.js` edit. Restore exactly the two transition records from the C176 pre-retirement manifest snapshot and remove the C176 retirement archive/evidence. Do not reset, clean, or revert the shared tree, C165–C167, C175, or unrelated user work.

## Current result and next exact slice

C176 is source-mapped and authorized as one RF04-owned retirement plus its explicitly authorized RF06 prerequisite caller repoint. No production blocker or behavior defect was demonstrated by static review. The only present execution constraint is the requested C165–C167/C175 source freeze; C176 remains unimplemented and unqualified until that batch is released. Next exact slice: implement and qualify this bounded C176 source batch after the freeze is lifted. RF04 and release remain incomplete / unauthorized respectively.

