# C177 scope: Move assembly readiness into Session

Base revision: `8bd7667708cfa7eb38a9a21eec8fa30b9801075a` (C165-C167 checkpoint). This source change was made after C176's in-progress attendance source edits; shared file hashes below include those existing C176 changes.

## Delivered change

Moved `assemblyReadiness` from `bot/src/assembly-readiness.js` to `bot/src/frameworks/session/assembly-readiness.js`. Its exported function body is byte-identical to the prior source. Only the original root imports were replaced with destructured functions from the existing local Session contract slots: `assemblyDeliverySummary`, `assemblyPlanFreshness`, and `inspectSessionOpening`.

Re-exported `assemblyReadiness` from Session's public API and changed the sole production caller in `commands.js` to import it there. C176's attendance exports and command imports in those shared files were preserved. The Session public entry was already registered in `PACKAGES.json`, so C177 required no package registry update.

## Behavior and provider reachability

The projection still reads saved plan, delivery, opening-job, and roster state only. It preserves the exact `SESSION_OPENING` catch and `source_review_required` result, lets other failures propagate, and returns the same guidance/status data without writes or new receipts.

Importing Session public API does not initialize the provider slots. Production startup continues to load the existing providers: `index.js` imports `pvp-output.js`, which imports root `assembly-state.js`, `assembly-context.js`, and `session-opening.js`; `commands.js` also retains its other context and session-opening imports. These root providers bind the three slot functions before command calls. The new Session module imports its local contract directly, avoiding a public-barrel cycle and any new Session-to-root dependency.

## Transition retirement

Archived and removed exactly these two obsolete records in `C177-RETIRED.json`:

| Record | Meaning |
|---|---|
| `57c6e53aebef3e50e6c531a18403543f8d9ff9eb5b4d6872ec10f99b2b4ed362` | Root Session readiness module location |
| `0de71e70d0c729c9aa6ac1df2ffe12e96d0de9323c8b85c07cca0aca83b375e7` | Commands importing the root readiness implementation |

The archive records the pre-removal transition-manifest SHA-256: `DF348CA18178A9BA0E5DC0F2A1D28EF69DF39F2611DDEB1FAAA2BCE862A103CB`. Post-removal manifest SHA-256: `5115CB46C388535F80AEEEE71171C762DD505C2ECD4219553AA0B2EA9FB87065`.

## Modified paths

- Removed `bot/src/assembly-readiness.js`.
- Added `bot/src/frameworks/session/assembly-readiness.js`.
- Updated `bot/src/frameworks/session/public.js` and `bot/src/commands.js`.
- Updated `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` and added `C177-RETIRED.json`.

## Frozen source SHA-256

| File | SHA-256 |
|---|---|
| `bot/src/frameworks/session/assembly-readiness.js` | `e72d393199878023587144c9d85c08532042acc36f2cb9af46fb77a489c51307` |
| `bot/src/frameworks/session/public.js` | `02440ffb15588608d85b7d7b42e948bb61a210ce2bc60ab67f0de76202bf822f` |
| `bot/src/commands.js` | `f810bd96fa08e97043e50343704231ad4b3f098d0abc43415d68d52fdac595ba` |

## Rollback and next phase

Rollback only C177 by restoring the former root `assembly-readiness.js`, restoring the original imports in that file and `commands.js`, removing the Session public re-export, and restoring the two exact archived records. Preserve C176 changes in `commands.js` and Session public API.

No tests or commits were made for C177. Next exact phase: run the fresh combined C176/C177 composition tests and the authorized RF04 ratchet; no historical suites are in scope.
