# RF04-F04 C178 — Session opening service relocation

**Status:** source freeze ready for fresh focused qualification. No tests executed and no commit created by this implementation task.

## Delivered change

Moved Session opening composition from root `bot/src/session-opening.js` to `bot/src/frameworks/session/session-opening-service.js`. The service creates the same factory instance from Session-owned implementation and ports, exports the original nine forwarding functions, and completes the existing seven-function `sessionOpeningSource.bind(...)` at module load. Its imports are local; it does not import the Session public barrel. The wrapper function block is byte-for-byte equivalent after line-ending normalization (SHA-256 `9DEE364387911D2177E3B1A139110A4F419DFAED4787ED2DD658DF3B4A2C159E`).

The Session public API now exports those functions. `commands.js` obtains `scheduleSessionOpening` from Session public. Publication's existing fixed Session evidence port now includes `assertSessionOpeningPublication`; the existing `publication--session` adapter binds that exact Session export, and `pvp-output.js` calls the Publication port. The application composition initializer and startup order remain unchanged.

The service imports `createSessionOpening` from `./session-opening.js`, `sessionWorldEvents` from `./contracts/world-events.js`, and the assembly/opening sources from `./contracts/opening-sources.js`. It retains the original deferred `indexWorldEvent` callback and exact seven-key Session bind. It does not add the two publication/command functions to that internal port.

## Saved opening state and identity

The factory implementation and all saved-state checks are unchanged. Existing `session_opening_job`, authenticated schedule receipts, attempt/source/context hashes, deterministic `opening-epoch:${key}:${attempts}:1` event IDs, `native_opening_epoch` details, superseded-attempt generation records, and transaction/reset behavior remain intact. `session_opening_turn` retains its turn-keyed receipt and optional epoch hash. Publication assertion still validates the saved turn against the active attempt source and origin/context hashes, turn ID, and optional epoch hash, including the existing no-proof early return.

The public exports, Session fixed slot, and Publication fixed slot reference the same exported wrapper function objects. The Session module-load bind remains complete before runtime operations. Publication's existing initializer binds the extended port before interactions; `bot/src/index.js` and `bot/src/application/composition/publication-session.js` were not changed.

## Changed files

- `bot/src/session-opening.js` — removed after its two production importers were repointed.
- `bot/src/frameworks/session/session-opening-service.js` — new Session-owned composition.
- `bot/src/frameworks/session/public.js` — exports the Session service functions.
- `bot/src/commands.js` — imports `scheduleSessionOpening` from Session public.
- `bot/src/frameworks/publication/contracts/session-evidence.js` — adds the existing assertion to the fixed evidence contract.
- `bot/src/framework-to-framework/publication--session/public.js` — binds the same Session assertion function.
- `bot/src/pvp-output.js` — calls the Publication evidence port.
- `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` — removes only the three archived C178 records.
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C178-RETIRED.json` — exact removed records and pre-removal manifest hash.
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C178-SCOPE.md` — this scope, identity, state, and rollback record.
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C178-SESSION-OPENING-SERVICE-PROPOSAL.md` — implementation status update to the accepted proposal.

## Exact transition retirement

`C178-RETIRED.json` preserves the three complete entries, with `original_manifest_sha256` `5115CB46C388535F80AEEEE71171C762DD505C2ECD4219553AA0B2EA9FB87065`:

- `ba61f0b77ec82677a78063972586ee30bfa12e26a0b2cd050356be5dc1f62dca` — root Session module location.
- `e5287346b89cee15e273fb1de342d981aac14e221383c56a0f168d521b1fa410` — Application import of the root Session module.
- `50b2669b983a484d56388ad6a75a9e3607232f32f7ef9075cd4837964cf28ec5` — Publication import of the root Session module.

No other transition entries were edited. The manifest remained valid JSON with 1,215 entries at the C178 checkpoint; its post-C178/pre-C179 SHA-256 was `15F93A2EDC985B90BA663EA4E80B97CDEC31B012D75F0F865043D96C2674F7B0`.

## Source hashes

| File | Before C178 | Frozen source SHA-256 |
|---|---|---|
| `bot/src/session-opening.js` | `CA3282EDCEE8504A18CE9F2D8F2AC34694F94543E022D2FE2175C17F17E04AC3` | removed |
| `bot/src/frameworks/session/session-opening-service.js` | — | `61605ACD19B96B417BFB9169CAB52EB32A8B16D99157BA1BA16175C6B92A88BD` |
| `bot/src/frameworks/session/public.js` | `02440FFB15588608D85B7D7B42E948BB61A210CE2BC60AB67F0DE76202BF822F` | `0A62E97C65E8B22ECC19D47CBB8462080444AE7BD7C5503E8B9B5B748460CB32` |
| `bot/src/commands.js` | `F810BD96FA08E97043E50343704231AD4B3F098D0ABC43415D68D52FDAC595BA` | `42EEB87B18D2FA64BA571803889652035DD9ECCF40B7864451A0C8BEDF3E4EF7` |
| `bot/src/pvp-output.js` | `AB9A3886BCCD9CA20DFE7C54AD43F24BCDFA56CCCD1AB611BA3DB2712443EF4B` | `807FFFA3C38D33D4C8F52484F7DF13AE4FE1DB1826A1A7DDF9501DDABD189AAD` |
| `bot/src/frameworks/publication/contracts/session-evidence.js` | `31B015292F59E78D083975F060AC58563A0DAFFFCC68E02C4B95C0CFD9BAACFF` | `A8DEDCB66DEF13846B039FAC3144CA72E017E7D86BD521FC8CC502A1DBDD0BED` |
| `bot/src/framework-to-framework/publication--session/public.js` | `7AB25BEFF2E88736AD10D64A287363E45F140375768485E25A82C63D9D7C2595` | `AEFAD05296273B736859F2EA54B24B01A2C6B0D2C9231F4E1B74498239F12AEE` |
| `bot/src/application/composition/publication-session.js` | `F6E82A683E16C61BBCF446A7F8965420D8F0C2D09BE92D3B9A4F50EFBCE1FCD9` | unchanged |
| `bot/src/index.js` | `F6253ECD98B6D6449800435C0A96B2AD5F82A7417EE355A848EE7C46814AD7D8` | unchanged |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C178-RETIRED.json` | — | `D4A0C9F432F589637A41006A2E4813500D3859252F507D3C85C4D02C338D634C` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `5115CB46C388535F80AEEEE71171C762DD505C2ECD4219553AA0B2EA9FB87065` | `15F93A2EDC985B90BA663EA4E80B97CDEC31B012D75F0F865043D96C2674F7B0` |

The initial `commands.js` and Session public hashes include the committed C176/C177 imports and exports. Their changes in this scope are limited to the C178 additions/removal.

## Qualification, rollback, and deferred work

The implementation task ran no tests or architecture gates. A fresh C178-focused test and requested gates remain with the test owner. Static inspection found no remaining production imports of root `session-opening.js`; `commands.js` now uses Session public, while `pvp-output.js` uses Publication's fixed port. `git diff --check` reported no whitespace errors (only standard line-ending normalization notices).

Rollback restores the exact three records from `C178-RETIRED.json`, restores root `session-opening.js` from the pre-C178 source, restores the two importer paths, removes the new Session service and exports, and returns the Publication evidence port/adapter to five functions. Preserve C176/C177 and all concurrent work. No staging or commit was performed.
