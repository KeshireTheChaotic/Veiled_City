# RF04-F01 C179 — World city-civic composition retirement

**Status:** source and scoped metadata changes implemented in the shared worktree, unstaged and uncommitted. The three transition records have been archived and removed after the parent checkpoint commit and C178 metadata handoff. No C179 tests, syntax checks, architecture ratchet, or runtime composition checks were run. No C179 files were staged or committed.

## Delivered changes

- Removed the four-line root `bot/src/city-civic.js` compatibility/export/registration module.
- Moved its existing `worldCityCivicSource.bind({updateCityCivic})` registration to canonical `frameworks/world/city-civic.js`, importing the existing source port directly from the local `contracts/root-sources.js`.
- Repointed `city-consequences.js`, `simulation.js`, and `city-commands.js` imports to existing World public exports. Their non-import bodies are unchanged.
- Extended the existing Intent-owned `intentWorldOperations` port with only `attemptCityInfluence`; the existing Intent–World adapter binds the original World export, and `ai-intents.js` forwards its existing influence call through the port. `initializeWorldExecution()` and startup order were not changed.
- Updated the Intent port and adapter comments to describe callable city influence accurately.

`attemptCityInfluence` is a callable, state-changing World operation. Its existing implementation validates the already-resolved NPC action and source evidence, and on the same path may transmit the audience response, update the receiver record, write the transmission and `influence_action` records, and add the original audit entry in its existing transaction. The port forwards the original function and arguments synchronously; it adds no policy, resource charge, saved record, or effect. After composition, the original function's return value, exceptions, actor argument, database writes, and transaction behavior remain the function's responsibility. Before composition, the existing fixed port fails closed; production startup already binds this port through `initializeWorldExecution()` before handling interactions.

The World civic implementation, `CIVIC_KINDS` array, public exports, and related infrastructure/history functions remain canonical and are neither wrapped nor copied. The World civic source port still receives the exact original `updateCityCivic` function. No saved format, schema, gameplay rule, permission, command text, adapter pair, bootstrap call, or unrelated caller changed.

## Modified files and current SHA-256

| File | SHA-256 / status |
|---|---|
| `bot/src/city-civic.js` | deleted; reviewed pre-change SHA-256 `7557FAF272194591577249FA34E110EA8FCB955510EAC3F44AC3C9BFA46624C3` |
| `bot/src/frameworks/world/city-civic.js` | `58978B94887AF235701C2FAADA650F4FE033606FDB1417330C7A9A1AB84E0D41` |
| `bot/src/frameworks/intent/contracts/world-operations.js` | `26F2AAEF19254E9D2A132EEC7CFB226125B583997FEDA759DD704B07200FB878` |
| `bot/src/framework-to-framework/intent--world/public.js` | `B66A21DD299E21C557FF34A1375C9B9C2DD887D212EABE654F611482103CA1FD` |
| `bot/src/ai-intents.js` | `EDC85BDE196DD0BB4B979D26A1AA818EBFFE3A8780EEF9AEEE18C73100A1881B` |
| `bot/src/city-consequences.js` | `FF15C8A693B0E6EEF7EA48D17B491CAF34E1FB49A5790145498267EAF70A7EA3` |
| `bot/src/city-commands.js` | `031B58DD128BCEE1C408DD0628196CBD5838642B90BC8930EF23875D9A94927E` |
| `bot/src/simulation.js` | `0FA98B0D1AF52858675F5C96E25DFF3A6E8EC84217294D29EADF5AFDC2437C1C` |

`git diff --check` on these C179 source paths returned no whitespace errors. It emitted only Git's configured LF-to-CRLF working-copy notices. This is not test or runtime evidence. The C176/C177 staged checkpoint and unrelated dirty files remain preserved.

Metadata changed after the C178 handoff:

| File | SHA-256 |
|---|---|
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `F79F8E728FCF039868D44F62BF01B8DB41A12E85030627A7E8FA0769C517B459` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `547C6FCD09E78E6A02FCF644301152297937F21EDEA954263A832E6F09F3E69C` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C179-RETIRED.json` | `75349AF5828AEF2ED9DA10846933509D08210EE7A30F12B576346D05AF37ED53` |

## Transition records and deferred qualification

These exact records were archived in `C179-RETIRED.json` and removed from `RF01/TRANSITIONS.json`:

- `73addb073f481529f50a9510f974368b57d0aa3cca02d5ef1a31f079070507b2` — World root module location.
- `778dc7b714618af8b2b3459f2df224ebc0788cbd6bcdbaecd56349f9c3dd45ba` — Intent direct cross-framework import.
- `3bf69e61c8b8a45d60e0ad61389c6f6d1b13e989206450f2dee635c6c129bdc6` — Application import of the World private root API.

No other records were retired. The authorized exact RF06 prerequisite was limited to the listed command import edge. The archive records the complete original objects and pre-removal manifest SHA-256 `15F93A2EDC985B90BA663EA4E80B97CDEC31B012D75F0F865043D96C2674F7B0`. The post-removal manifest SHA-256 is `F79F8E728FCF039868D44F62BF01B8DB41A12E85030627A7E8FA0769C517B459` (1,212 entries remain).

The existing adopted `intent--world` scope in `RF01/BRIDGE_CONTRACTS.json` now records this one callable operation. The entry's status, directions, consumers, observed graph metadata, evidence reference, and tests array were not changed. Its post-edit SHA-256 is `547C6FCD09E78E6A02FCF644301152297937F21EDEA954263A832E6F09F3E69C`; `C179-RETIRED.json` SHA-256 is `75349AF5828AEF2ED9DA10846933509D08210EE7A30F12B576346D05AF37ED53`.

The test owner has drafted and reviewed the new changed-code-only C179 cases under `bot/tests/ai-gm-2026-10/`; this implementation task did not execute them. The batch covers World source-port identity and one-time binding; Intent port fail-closed-before-composition and original-function binding through the current adapter; unchanged influence payload/actor/return/error forwarding; and focused caller coverage for existing civic/service outcomes. Qualification remains one frozen blocking batch under `TEST_PROTOCOL.md`, syntax checks only on changed JS/MJS, and the specifically authorized RF04 ratchet. Preserve exact source/test/input hashes and individual results in the C179 run record. No legacy suites or historical fixtures were used here.

## Rollback and next exact phase

Rollback only C179 by restoring the deleted root module, removing the canonical World binding/import, restoring the original `ai-intents.js` root import and direct call, removing `attemptCityInfluence` from the Intent port and adapter binding, restoring the three caller import paths, restoring the three exact transition records from `C179-RETIRED.json`, and removing only the appended sentence from the `intent--world` scope. Preserve C176/C177 and C178 work and unrelated narrative changes.

**Next exact phase:** the test owner qualifies the frozen C179 source and metadata set with the new focused batch under `TEST_PROTOCOL.md`, then runs the specifically authorized RF04 ratchet. C179 is not qualified yet. RF04 remains incomplete and release remains unauthorized.
