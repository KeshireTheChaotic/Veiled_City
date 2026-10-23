# RF03 prerequisite ledger

Status: **PREREQUISITE HOLD — RF03-F01 through RF03-F06 NOT STARTED**.

Actual branch `codex/clean-ai-gm-2026-10`; intake/result HEAD unchanged at `08372894bc097abe7e537b0924f020261034de5e`. Worktree clean before this preflight. Only this scope/ledger and PREFLIGHT.json are added; no implementation/source or historical evidence is changed. No checkpoint commit created.

## Actual evidence review

Read RF02 phase scope/ledger, every RF02 feature ledger, LOCAL_HOLDS, active architectural rules, RF01 enforcement policy and the supplied RF03 kickoff. Read actual six RF02 terminal JSON records and verified their log digests and equality with FINAL_EVIDENCE. Existing tests: 4+5+4+5+6+11 = **35 prior passing tests**, each recorded exit 0. These tests were **not executed again**. Latest frozen source/config hash drift: **zero**.

Read-only blocking checks, started `2026-10-23T17:27:39.1805617Z`, completed `2026-10-23T17:27:41.5044912Z`:

| Command | Actual terminal exit | Result |
|---|---:|---|
| npm --prefix bot run architecture:check | 0 | RF02 mode; 385 sources, zero unowned, zero active violation groups/errors; 2813 counted legacy obligations accepted |
| node bot/tooling/architecture/check-boundaries.mjs --ratchet --phase RF03 | 1 | 75 active violation groups and 75 expired RF02 transition errors; only 2738 counted obligations remain accepted |

No tests/watch/polling or broad validation. Full command summaries, exact affected record IDs/paths/owners/deadlines and hash verification are in PREFLIGHT.json. Original dependency component remains 211 modules.

## Missing prerequisites and sequencing decision

1. **RF02 completion at the new RF03 gate is not established.** RF02 explicitly records representative migrations only: six retired paths and two partial character extractions among 32 original candidates. RF02 F02–F05 retain named holds; F06 qualifies those selected slices rather than the full inventory.
2. **Expired exceptions prevent RF03-mode acceptance.** Operations 27, character 12, Discord 31, content 5: 75 records across 26 original paths. Examples include character-system.js, character export/narrative/observation workflows, content-packages.js, metrics/trace/latency, channel privacy/chunking/lifecycle and command/menu code. Deadlines were not silently renewed.
3. **Required integration readiness remains unresolved.** RF02-F04 defers the character-system native authority interface to RF03-F01; other holds defer entitled persistence/knowledge views, world/source/revision integration, shared observer identity, and publication/channel/lifecycle injection to RF04–RF07. The only implemented pair public entrypoints currently present are discord--publication and narrative--session, recorded as contract-only/unwired. No verified character--daggerheart adapter is present. That absence is not evidence the integrations are impossible; it identifies the exact next interface work and the circular sequencing requirement that needs an owner decision.
4. **Synchronous transaction expectations exist and must be retained.** Source inspection of db.js transaction(fn) confirms BEGIN IMMEDIATE at outer depth, nested SAVEPOINT/RELEASE, Promise rejection, rollback and original-error rethrow. Architectural rules require the same shared atomic unit of work. No SQLite connection or transaction was executed; this is static evidence, not runtime receipt/rollback qualification. Do not describe the existing transaction mechanism as missing.

The kickoff expressly conditions RF03 source authorization on RF02 completion and forbids silently finishing RF02 under RF03. Therefore source implementation remains held. A separately authorized RF02 prerequisite closure, or an explicit owner reconciliation of the listed carry-forwards with the new gate, is needed. This review does not choose a blanket exception extension or introduce new gameplay restrictions.

## Changes, cost, rollback and release

Changed modules: none. Relocations/interfaces/facades: none. New test executions: zero. Provider calls/tokens/spend: 0/0/$0; Codex cost UNMEASURED. Existing immutable content caching untouched. No production database access, live sends, paid models, CI, push/PR/merge, deployment or restart. RF04 not started.

Rollback is limited to removing the three new RF03 preflight documentation files after preserving any owner edits; no source/data rollback, reset or clean operation is required. No code rollback was performed. **RELEASE NOT AUTHORIZED.**

## Owner-authorized prerequisite reconciliation — 2026-10-23

Current result supersedes the prerequisite hold only; historical evidence above is retained. Base 08372894bc097abe7e537b0924f020261034de5e. Of 75 expired RF02 records, four outstanding locations were resolved by unchanged moves and 71 independently evidenced future dependencies received exact accountable RF03–RF06 deadlines. Zero uncertain records. Two additional resolved private imports retired. Every retained ID, edge, baseline identity, owner and maximum occurrence count is unchanged; frozen baseline unchanged. No new records. Individual original/new deadlines, evidence and authorization: RF02/TRANSITION_RECONCILIATION.json and .md. Deferred modules remain unisolated until their named future features; this is scoped RF02 completion, not architectural isolation.

Fresh reconciliation batch: 10 passed, zero failed, exit 0, 5441.5323 ms; nine changed-file syntax checks passed. RF02 and RF03 phase ratchets exit 0; strict exit 1 expected on 2807 remaining counted obligations. Zero new boundary violations, unowned modules, integrity errors or active-phase overdue records. Source count386; largest component211 unchanged. Actual commands, dates, hashes and exits: RF02/RECONCILIATION_TERMINAL.json and RECONCILIATION_RESULT.json. Prior35 passing tests were not rerun. Pre-test audit-helper syntax error was repaired before the frozen batch; it was not a test result.

Changed production: four pure helper relocations, Discord public exports and commands/registration imports; new fail-closed transition-audit tooling. No native rules, receipt formats, schema, transaction or gameplay changes. No old-path facade. Registration was not executed. Provider calls/tokens/cost0/0/$0; Codex cost UNMEASURED. Immutable-content caching unchanged. Local holds: individually accountable later-phase debt and unverified live behavior. Rollback: revert the reconciliation checkpoint as one unit, restoring moves/imports and exact transition deadlines together; never reset user edits or alter data. RELEASE NOT AUTHORIZED.

## F01 first qualified slice

Base 1db80db. Dice and SRD reference implementations moved unchanged into daggerheart; 12 consumer imports/re-exports now use its registered public API. No old-path wrappers. Four resolved transition records retired; 2803 remaining occurrences, zero new/active violations, zero unowned or integrity errors, SCC211 unchanged. Fresh rf03-f01.test.mjs: six passed, zero failed/skipped, exit0, 88.4015ms; 15 changed JS/MJS syntax checks exit0; RF03 ratchet exit0. Source hashes/commands in phases/RF03/F01_TERMINAL.json; log rf03-f01.log. No live SRD fetch; two synthetic fetches coalesced for concurrent mock lookups, cached/retry behavior tested. Provider0/$0, Codex UNMEASURED.

Status PARTIAL WITH ISOLATED HOLDS: resource/effect transaction paths, typed roll provenance and character-system advancement still coupled through scene, intent, publication and PC authority. These must be extracted through actual ports; current pure dice tests do not qualify them. No behavior/schema/receipt/RNG changes. Next independent feature: combat and source-catalog slice. Rollback first F01 checkpoint as a unit including imports and retired metadata. RF04 NOT STARTED. RELEASE NOT AUTHORIZED.

## F02 qualified arithmetic and presentation separation

Base479d366. Native combat math relocated; Discord combatantLine extracted before move, commands compose both public APIs. Exact encounter budget/tier/role arithmetic extracted into daggerheart/encounter-budget.js; encounter.js retains real source/scene/state orchestration, importing and re-exporting only extracted native functions, not forwarding a monolith. Two transition records retired; zero new violations/unowned/integrity errors, 2801 raw remaining occurrences, SCC211 unchanged. Fresh rf03-f02.test.mjs six passed, zero failed/skipped, exit0, 66.8884ms; 12 syntax checks exit0, RF03 architecture exit0. Hashes and terminal evidence F02_TERMINAL.json. Catalog baseline153 =78supported/75review_only; definitions untouched, SHA in F02_CATALOG_BASELINE.json.

PARTIAL WITH LOCAL HOLDS: catalog compiler still imports narrative hash/intent error; encounter source binding, native feature eligibility and conditions remain coupled. No classifications enabled. No full encounter/feature equivalence claimed. Rollback F02 checkpoint including imports/metadata together; no data rollback. Provider0/$0; Codex UNMEASURED. RELEASE NOT AUTHORIZED.

## F03 qualified proof and arithmetic slice

Base8bea508. Extracted fear-reservation-proof.js (read-only ancestry and reserved-funds calculation) and pc-resources.js (existing Hope cap/pool/marked-slot arithmetic). Existing producer keeps world indexing; pc-effects calls extracted arithmetic inside its unchanged transaction after owner/source/replay checks. pc-native-eligibility preserves death proof at caller. No changed receipt fields, source IDs, effect keys, SQL or costs.

First fresh F03 batch: six tests, five passed/one failed, exit1,70.1802ms. Failure was a test assumption: malformed original mutation throws TypeError before domain ancestry error; both fail closed. Production behavior preserved. Repaired only that assertion; targeted failed-test-name execution passed1/failed0,exit0,65.8643ms; five unchanged passing cases not rerun. Unique qualified cases6. Seven changed syntax checks passed; RF03 ratchet exit0, no new/unowned/integrity violations. F03_TERMINAL.json plus F03_REPAIR_TERMINAL.json retain both real outcomes/hashes.

PARTIAL WITH LOCAL HOLDS: pvp-fear-moves retains grounded targets, private AUTO_FE capability, publication receipt dependencies, native effect/recovery and world state mutation in original module. Moving it wholesale would mix more than two owners and may duplicate module-private authority; it is not claimed isolated. Consent/death/PvP live runners remain unqualified; proof tests are not spend/notice/transaction integration evidence. No gameplay change. Rollback F03 checkpoint as a unit. Provider0/$0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.

## F04 necessary native eligibility extracted

Base0d34643. environment-eligibility.js owns the exact existing encounter/profile/source/review eligibility predicate; native-environment-context.js invokes it before activation and review SQL, which remain unchanged. Current-encounter read remains short-circuited until active campaign/session encounter eligibility. Four fresh tests passed, zero failed/skipped, exit0,61.5875ms; four changed syntax checks passed; RF03 ratchet exit0. F04_TERMINAL.json records tested hashes and terminal outcomes. No predicate grants an effect, disclosure, PC presence or resources.

PARTIAL WITH LOCAL HOLD: native-environment-instance and scene producer still require verifiedWorldAuthoringContext opaque authority, audience mint/revalidation, scene identity, source index and persistence mutation/record ancestry. Its world public producer and separate native catalog/reference port are not isolated; an honest daggerheart--world adapter cannot import those legacy implementations. Smallest remaining implementation: extract the existing profile/provenance repository interface and world authoring state into world, expose native descriptor reads via Daggerheart, map exactly those two public views in daggerheart--world, and compose audience/session/persistence separately at application workflow while retaining the same transaction and receipt fields. No fabricated public evidence or adapter is claimed. Independent F05 command mapping proceeds. Rollback F04 checkpoint including caller/predicate/exports; no DB changes. Provider0/$0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.

## F05 command integration adopted

Base599f2eb. Existing commands now consume daggerheart--discord/nativeCombatantLine. Pair owns explicit native-state-to-Discord field projection; Discord retains text rendering. No new rejection, gameplay rule, extra native validation, publication authorization or acknowledgment fabrication. Existing registry record updated with actual command consumer and fresh test reference; other proposed pairs unchanged. Two tests passed/zero failed/skipped,exit0,415.3442ms; three syntax checks and RF03 ratchet passed. F05_TERMINAL.json hashes/results.

PARTIAL WITH LOCAL HOLDS: intent--daggerheart and daggerheart--narrative effect/receipt adapters are not adopted. typed-mechanics currently coordinates accepted-intent source, consent, roll contribution, native effects and publication reservation inside commitGmTurn; splitting that workflow requires explicit authenticated intent and committed-receipt ports rather than a facade. Existing lifecycle remains intact. This pair only qualifies command combat display, not PvP menus, declarations or dice execution. Rollback F05 checkpoint including registry/policy/imports/pair. Provider0/$0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.
