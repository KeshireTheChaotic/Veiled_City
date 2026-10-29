# RF04-F04 C178 — Move Session opening composition into Session

**Status:** read-only scope proposal; no production or transition-manifest edits and no tests run.  
**Reviewed HEAD:** `8bd7667708cfa7eb38a9a21eec8fa30b9801075a`, with concurrent C165–C167/C175 working-tree changes and C176/C177 proposals present.  
**Authorization:** cite `phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md` for only the two exact RF06 caller repoints below; that authorization does not approve broader RF06 work.

## Proposed bounded change

Move the composition currently in root `bot/src/session-opening.js` into a new same-owner Session service, `bot/src/frameworks/session/session-opening-service.js`. The implementation factory already lives in `frameworks/session/session-opening.js`; the new service should assemble one instance from that factory and the existing Session-owned ports. It should import local modules/contracts directly, not `frameworks/session/public.js`, to avoid a public-barrel cycle.

Keep the current deferred `indexWorldEvent` callback and the existing complete seven-function `sessionOpeningSource.bind(...)` from C164. Bind those same seven names—`inspectSessionOpening`, `beginSessionOpeningAttempt`, `assertSessionOpeningAttempt`, `assertSessionOpeningFence`, `rebaseSessionOpening`, `bindSessionOpeningTurn`, and `rebindSessionOpeningRefresh`—from the canonical service object. Do not add `scheduleSessionOpening` or `assertSessionOpeningPublication` to this internal Session port.

Re-export the canonical `scheduleSessionOpening` and `assertSessionOpeningPublication` function objects from `frameworks/session/public.js`. `commands.js` should import `scheduleSessionOpening` through the Session public API. Extend the existing Publication-owned `publicationSessionEvidence` fixed port with `assertSessionOpeningPublication`; bind the exact canonical Session service function in the existing `publication--session` adapter, and make `pvp-output.js` call that port instead of importing the root Session module. The pair remains adopted; no new pair, fallback, or direct Publication-to-Session implementation import is needed.

After the importers are clear, remove root `bot/src/session-opening.js`. Do not change the factory implementation, the C164 port definition or complete binding, the existing Publication–Session composition initializer, or unrelated attendance/readiness work.

## Callers, ownership, and sequencing

The production root importers are:

| Caller | Owner and current use | Proposed boundary |
|---|---|---|
| `bot/src/commands.js` | Application; calls `scheduleSessionOpening` after GM authorization | Session public API; exact existing private-import transition below |
| `bot/src/pvp-output.js` | Publication; calls `assertSessionOpeningPublication` before publication | Existing `publicationSessionEvidence` port; the Publication–Session adapter binds the canonical Session function |
| `bot/src/assembly-readiness.js` | Session; calls `inspectSessionOpening` | Same-owner caller assigned to C177; move it to `sessionOpeningSource.inspectSessionOpening` before deleting the root module |

Search found no root `session-opening.js` imports in `bot/scripts`, `bot/tooling`, or `bot/package.json`. The package entry is `node src/index.js`; framework and pair public entry points already appear in `RF01/PACKAGES.json`. Other Session consumers—opening runner/recovery, assembly planning/state, and opening entry—already use `sessionOpeningSource`.

Sequence C178 after C177 removes the remaining `assembly-readiness.js` root import and after C176's attendance edit to `commands.js`, or coordinate the separate command import hunks with those owners. C176 and C177 own those files and are excluded from this scope. The shared checkout is not clean; recompute source hashes immediately before any later implementation and preserve the concurrent files.

## Existing ports and startup

`sessionOpeningSource` in `frameworks/session/contracts/opening-sources.js` already has the seven exact operations above, is exported from Session `public.js`, and is bound as a complete map by the current root composition. C164's change makes these internal Session readers available without adding a new Session port.

`publicationSessionEvidence` in `frameworks/publication/contracts/session-evidence.js` currently fixes five Session reader functions. `framework-to-framework/publication--session/public.js` binds those functions, and `application/composition/publication-session.js` exposes the existing initializer. Production `index.js` calls `initializePublicationSession()` before runtime interaction handling. C178 adds only the saved opening-publication assertion to that existing fixed contract and adapter. `pvp-output.js` may load the port at module evaluation, but it must call it only during output; the app initializer binds it before runtime. Session event issuance remains deferred through `sessionWorldEvents`, preserving the current module-load binding lifecycle without a database operation during composition.

The pair registry's `publication--session` consumer remains `bot/src/application/composition/publication-session.js`; `pvp-output.js` calls its own Publication public port and does not import the pair public module. Update only the pair's narrow scope description and existing C178 test evidence if needed; do not add unrelated consumers, directions, pairs, or test-selector exceptions.

## Function identity and persisted opening receipts

Export the factory's canonical functions directly, without another `(...args) => ...` wrapper. Bind those same function references to `sessionOpeningSource` and to `publicationSessionEvidence`. This gives command code, Session readers, and the Publication adapter the same service implementation references. The existing factory functions close over their injected collaborators and do not depend on a call-site `this` value.

Relocation must leave saved data and checks unchanged:

- `session_opening_job` origin, source-event, start-mutation, attempt, context, epoch, visibility, and issuer fields remain identical; `inspectSessionOpening` must continue validating the authenticated `session_opening_schedule` receipt.
- A rebase keeps the deterministic `opening-epoch:${key}:${attempts}:1` event identity, `native_opening_epoch` details, and `session_opening_generation` record for the superseded uncommitted attempt. Existing plan-reset and transaction behavior stay unchanged.
- `bindSessionOpeningTurn` keeps the `session_opening_turn` row keyed by turn ID with version, job, origin hash, context hash, turn, and optional epoch hash.
- `assertSessionOpeningPublication` continues to compare the bound turn receipt against the current job's attempt source, origin/context hashes, turn ID, and optional epoch hash before Publication proceeds. Preserve the no-proof early return and all existing errors/status checks.
- No schema or saved-format migration is proposed. Existing assembly plan JSON, refresh review, generation, and publication receipt readers remain unchanged.

The public contract change exposes the existing saved-proof assertion through the Publication-owned fixed port. It does not add publication authority or weaken source, audience, transaction, retry, or receipt checks.

## Exact transition records

Retire only these three existing records after C176/C177 prerequisites are complete, C178 sources are implemented and reviewed, and the retirement archive contains the exact records:

| ID | Record and edge | Owner assignment |
|---|---|---|
| `ba61f0b77ec82677a78063972586ee30bfa12e26a0b2cd050356be5dc1f62dca` | `LEGACY_MODULE_LOCATION`: `bot/src/session-opening.js` | Session, RF04-F04 |
| `e5287346b89cee15e273fb1de342d981aac14e221383c56a0f168d521b1fa410` | `IMPORTS_PRIVATE_API`: `commands.js` → `session-opening.js` | Application, RF06-F04 exact prerequisite |
| `50b2669b983a484d56388ad6a75a9e3607232f32f7ef9075cd4837964cf28ec5` | `DIRECT_CROSS_FRAMEWORK_IMPORT`: `pvp-output.js` → `session-opening.js` | Publication, RF06-F03 exact prerequisite |

The `assembly-readiness.js` → `session-opening.js` edge is same-owner Session traffic and has no matching transition record; C177 owns that caller migration. Do not add or broaden a transition to cover it. Keep the existing RF06 prerequisite authorization's exact-edge and saved-format limits.

## Source snapshot

These hashes describe the reviewed shared working tree, not a clean C178 implementation base. Files marked dirty by concurrent work must be rechecked before source changes.

| Reviewed file | SHA-256 |
|---|---|
| `bot/src/session-opening.js` | `CA3282EDCEE8504A18CE9F2D8F2AC34694F94543E022D2FE2175C17F17E04AC3` |
| `bot/src/frameworks/session/session-opening.js` | `BD51DA108D8FE4CE33A056EBE1DE2F58A2225B3656C1A1E8E730E7664CBB67F0` |
| `bot/src/frameworks/session/contracts/opening-sources.js` | `DFBE2241D9D45E25C41D2D468696C383D786349DDA764197978C2F621C7C03CB` |
| `bot/src/frameworks/session/contracts/world-events.js` | `F39C313903F71E327A6C1718ED644FE100A54F39751BA7978896ADF26850667D` |
| `bot/src/frameworks/session/public.js` | `D624768460C552CCB3F11317963DB4E24D073B3276E2B3280FC7A14535EE4360` |
| `bot/src/frameworks/publication/contracts/session-evidence.js` | `31B015292F59E78D083975F060AC58563A0DAFFFCC68E02C4B95C0CFD9BAACFF` |
| `bot/src/framework-to-framework/publication--session/public.js` | `7AB25BEFF2E88736AD10D64A287363E45F140375768485E25A82C63D9D7C2595` |
| `bot/src/application/composition/publication-session.js` | `F6E82A683E16C61BBCF446A7F8965420D8F0C2D09BE92D3B9A4F50EFBCE1FCD9` |
| `bot/src/pvp-output.js` | `AB9A3886BCCD9CA20DFE7C54AD43F24BCDFA56CCCD1AB611BA3DB2712443EF4B` |
| `bot/src/commands.js` | `B1854EDB54A15966ADCF7AB72EDEC96940444AB8F51D20E93973EDA71FAC0F8D` |
| `bot/src/assembly-readiness.js` | `C5CEEDE5D8EAF61A6A50FEB02B5F6578D40FBE8220D60214267AAFA4C8224D87` |
| `bot/src/index.js` | `F6253ECD98B6D6449800435C0A96B2AD5F82A7417EE355A848EE7C46814AD7D8` |
| `RF01/BRIDGE_CONTRACTS.json` | `7B5C11CB428214E61B09C5A896BB3A58862C382D56053EB528BDDCE608930683` |
| `RF01/PACKAGES.json` | `7D71B745CF0AE9E6F75E40A8704B0CCCE717A89C4927EC057458B5E1B82F111A` |
| `RF01/TRANSITIONS.json` | `DF348CA18178A9BA0E5DC0F2A1D28EF69DF39F2611DDEB1FAAA2BCE862A103CB` |

## Deferred qualification and rollback

This proposal makes no test or architecture qualification claim. A later C178 implementation should add fresh tests for direct public function identity, the complete C164 Session bind, Publication's fixed evidence bind, preserved saved epoch/turn receipt checks, and the authorized command/publication call paths. Use only new feature-local fixtures and a disposable database. Repoint only the two exact cross-owner edges and record actual results and hashes.

Rollback removes the C178 service module and its Session public exports, restores the root composition and both importer paths, restores the prior five-function Publication evidence port and adapter binding, and restores only the three C178 transition records from its retirement archive. Do not roll back C176/C177, C165–C167, C175, or other shared work.
