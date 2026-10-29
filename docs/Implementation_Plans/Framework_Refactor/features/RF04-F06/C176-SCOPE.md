# RF04-F04 C176 — Session opening-attendance service ownership

**Status:** source migration and exact transition retirement complete; unqualified pending changed-code verification.  
**Base checkout:** `8bd7667708cfa7eb38a9a21eec8fa30b9801075a` (parent checkpoint, 2026-10-29).  
**Feature owner:** Session. **Authorized prerequisite:** exact RF06-F04 command import repoint under `phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` (owner authorization dated 2026-10-28).  
**Source-only result:** C176 source and metadata edits are present and unstaged. No tests or checks were run; no commit was made.

## Delivered source change

Moved the module-level attendance composition from root `bot/src/session-opening-attendance.js` into Session-owned `bot/src/frameworks/session/opening-attendance-service.js`. The new service imports the existing factory from `./opening-attendance.js` and the existing singleton ports from `./contracts/world-events.js` and `./contracts/opening-sources.js`. It preserves the deferred World-event callback, module-load opening-source binding, one attendance service instance, and the four existing exports and forwarding functions.

`bot/src/frameworks/session/public.js` directly exports those four service functions while retaining the existing `createOpeningAttendance` factory export. `bot/src/commands.js` imports its existing three attendance functions through the Session public API, merged into its existing Session import. The former root file is removed. Concurrent C165–C167 changes in `commands.js` remain intact. C177's source edits have not begun.

No attendance logic, transaction, receipt, saved row, schema, command behavior, gameplay, release manifest, or test file changed. Static search after the source edit found no remaining `session-opening-attendance.js` reference in `bot/src`, `bot/scripts`, `bot/tooling`, or `bot/package.json`. Existing historical test files still refer to that path and were not edited or run under `TEST_PROTOCOL.md`.

## Exact transitions retired

C176 archived and removed only these two existing records from `RF01/TRANSITIONS.json`:

| ID | Record | Reason |
|---|---|---|
| `241656707ebf1d55740dddd7437ee28474587d249cc6de96661ab1f8d260836e` | `LEGACY_MODULE_LOCATION` for `bot/src/session-opening-attendance.js`, owner Session, assigned RF04-F04 | The composition is now physically inside Session and the root path is absent. |
| `00f30243a5aea5f94236f27af728028537df58e502ade94b3a450d3d3e804afb` | `IMPORTS_PRIVATE_API` from `bot/src/commands.js` to the root path, owner application, assigned RF06-F04 | Commands now import the Session public API. The owner-authorized exact-prerequisite migration covers this edge only. |

`C176-RETIRED.json` preserves both exact objects and the pre-removal manifest SHA-256. The RF06 prerequisite authorization supersedes the general RF06 entry hold only for this migration; it does not authorize broader RF06 runtime work. No other transition was changed.

## Module evaluation and compatibility review

The new service imports the factory and ports directly from same-owner modules, avoiding a cycle through `frameworks/session/public.js`. Both ports remain the existing module singletons. The public barrel now evaluates the service when imported, performing only the prior singleton allocation and source-port bind; it does not open the database or start providers. The `indexWorldEvent` callback resolves the event consumer when called, so ordinary startup can still bind the World issuer later.

Static review found no database or gameplay change. Existing C04 semantics remain the intended contract: source-bound owner receipts, exact registration/carry behavior and acknowledgments, and attendance without inferred arrival or placement. C176 does not independently qualify those behaviors after moving the composition; fresh changed-code verification remains required, including module-load source binding, fail-closed uncomposed ports, composed event issuance, and preserved SQLite receipt/replay behavior.

## Changed files

- Added `bot/src/frameworks/session/opening-attendance-service.js`.
- Updated `bot/src/frameworks/session/public.js` with four direct re-exports.
- Updated `bot/src/commands.js` to use the Session public API; concurrent staged C165–C167 imports are preserved.
- Deleted `bot/src/session-opening-attendance.js`.
- Updated `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json`, removing only the two C176 records.
- Added `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C176-RETIRED.json`.
- Added this implementation scope. `C176-SCOPE-PROPOSAL.md` remains the historical planning record.

No test file, `bot/package.json`, `manifest.json`, or `MANIFEST.txt` was modified.

## Source and metadata hashes

| Current file | SHA-256 |
|---|---|
| `bot/src/commands.js` | `B1854EDB54A15966ADCF7AB72EDEC96940444AB8F51D20E93973EDA71FAC0F8D` |
| `bot/src/frameworks/session/public.js` | `D624768460C552CCB3F11317963DB4E24D073B3276E2B3280FC7A14535EE4360` |
| `bot/src/frameworks/session/opening-attendance-service.js` | `CE618A7B561C8B7974BE1338667708F853A5DA46138458D70BC3A8A10DE39607` |
| Removed `bot/src/session-opening-attendance.js` (pre-move source) | `7A4BAB0BFA963F43C427108BDD5B536F7FBD0BAD325FAEC79B228468C50404A2` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `DF348CA18178A9BA0E5DC0F2A1D28EF69DF39F2611DDEB1FAAA2BCE862A103CB` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C176-RETIRED.json` | `C5C9647B5AE785B90AD0698DA1F7043020D876284806CA60D51CEF4BDB38C944` |

Pre-removal `TRANSITIONS.json` SHA-256: `06E9301691F80CB764B7B04458306B42FCB7DE7DDBC8D3B130C6D654B6079FC8`.

## Verification, limitations, and rollback

No C176 tests, syntax checks, architecture checks, or runtime composition checks were run. The C165–C167/C175 combined fresh test batch and its gate-only repair were completed separately before C176 source work; they do not qualify C176. No production defect was demonstrated by this source review. Remaining limitation: the C176 public re-export changes when the existing source binding is evaluated; static review found no caller that invokes the bound function during module evaluation, but a new focused test is still required.

Rollback only C176: restore `bot/src/session-opening-attendance.js` from the pre-move source above; remove `opening-attendance-service.js`; remove only the four C176 exports from Session `public.js`; restore the command import from the root while retaining other command edits; restore the two exact transition records from `C176-RETIRED.json` and the pre-removal manifest snapshot; remove the C176 archive and implementation scope. Do not reset, clean, or revert the parent checkpoint, C165–C167, C175, or unrelated narrative work.

**Next exact phase:** hand the shared `commands.js` and Session `public.js` files to the C177 owner. Run C176's fresh changed-code test and authorized RF04 gate only when the parent releases the test batch. RF04 remains incomplete; release is not authorized.

