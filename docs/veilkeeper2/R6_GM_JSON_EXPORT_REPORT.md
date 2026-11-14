# R6 — native GM-private JSON exports

Completed slice, 2026-11-13. All R0–R8 major phases remain incomplete; no major-phase integration/push or production action occurred.

## Delivered

The native root now handles explicit `format:json` on existing `/vc-character export-gm` and `/vc character export-gm`. It selects one exact campaign character and requires observed, recent human-GM command authority from current campaign policy. Fresh member, role and channel access are fetched before preparation and again before upload. Cached administrator membership grants nothing by itself. One ephemeral attachment attempt returns the existing `GM_HOOKS`, `GM_PRIVATE` and `GM_CANON` v3.3.3 JSON packages with original filenames and trailing newlines.

New source readers preserve imported/resolved hooks, private facts/clocks/threads/references/relationships, current canon, conflicts and proposal statuses. Reads share the existing synchronous read-only SQLite snapshot with the canonical character projection. They perform no legacy backfill or acceptance writes. An unmaterialized legacy suggestion holds for reviewed migration; matching existing canon does not automatically accept it. Missing tables, malformed hook payloads, duplicate current canon, foreign conflict ancestry and oversized windows also hold. Unowned characters cannot accidentally match private rows through an empty account ID.

Source/declaration/policy/member changes suppress delivery. Durable receipts prevent another attachment attempt after an uncertain upload or cold replay. Exported secrets and proposals do not create memory, knowledge, canon authority or effects. Existing AI capabilities, stores and schemas are unchanged; no extra interaction listener was added.

## Files and audit

- `legacy-gm-export-readers.js`, `legacy-readonly-repository.js`: bounded campaign source facets and exact character selection.
- `gm-character-export.js`: existing package formatters, source fingerprint and aggregate2MB limit.
- `discord-gm-character-exports.js`, `discord-gm-authority.js`: private one-attempt delivery and exact GM export operation.
- `discord-interaction-router.js`, `native-root.js`: composition behind the existing native GM authority.
- `r6-gm-character-exports.test.mjs`, new GM fixture: fresh production table definitions and native SQLite with simulated Discord.
- `r6-character-exports.test.mjs`: previous GM fallback expectation now verifies the separate GM route discloses no files to an owner without GM authority.

Eight original persistence methods were independently parsed and hashed at mandatory pin1ba6c7e15db1a66ba34b36336f31437beffe44d6 and upstream15a8f44671f227c6bec69bf30744e03c5692809b: private facet reads, hooks, relationships, proposals and backfill. All eight bodies are unchanged; exact lines/hashes are in PIN_EVIDENCE. The new readers intentionally omit legacy read-side mutation and add reconciliation holds. Original `character-export.js` builds three GM packages; `commands.js` lines1235 onward defaults to all formats. This slice claims explicit JSON only.

## Actual verification

332 distinct checks across33 affected files are now passing. The dependent run recorded319 passing and one stale routing expectation failing out of320 (73817.5279ms); after changing that assertion, the affected case passed alone (776.3669ms). Unchanged passing cases were not rerun. Twelve GM-focused cases passed across the initial ten-case run (3154.6328ms) and changed/new targeted checks. The expanded first case additionally checks no memory or knowledge was minted and passed alone (807.6097ms). Do not sum assertion reruns as new distinct checks.

Initial fixture failures were a wrong schema URL, unscoped test fact, missing foreign campaign and Windows cleanup ordering for a second open SQLite connection. Corrected fixture setup and explicit connection close; final affected cases pass. These were test setup defects, not live evidence. Logs: `.reports/gm-export-dependent-tests-20261113.txt`; selector: R6_GM_JSON_EXPORT_AFFECTED_TESTS.json. SDK authorization/upload are simulated, not live human play or Discord delivery.

Read-only historical test-copy probe `.reports/gm-export-copy-20261113.json`: three files,23578bytes, nine imported hooks, zero private facts/current canon and two proposals; preparation3.8929ms. Main SQLite SHA remains0fe6f5c91a2df83aa7bfb92eb816630a110dfe435c8c1bc66065eea7361513bf. No owner identities/bodies logged, inference, Discord calls/sends or writes. This trusted probe verifies stored-data compatibility, not live GM authentication or native resource overlay.

Static graph:126 native modules,88 reachable,38 uncomposed,seven legacy imports,zero missing imports and exactly four generic tools. This proves static closure only.

## Holds, migration, rollback and next work

Default all/DOCX/Markdown GM export and remaining player formats/imports are not migrated. Native hook imports are not root-composed. Missing proposal materialization needs an explicit reviewed migration; this exporter never manufactures acceptance. Larger source windows require a reviewed bounded export design. Existing canon name matching is compatibility behavior, not identity or truth authority.

No schema/data migration was run. Rollback reverts the new router composition/readers/authority declaration while retaining original legacy data and all interaction receipts. Never erase journals to retry uncertain uploads. Existing exports are private files, not audience knowledge. No legacy handlers/tests were retired and no populated adoption or cutover is claimed.

Next R6: remaining export formats and authenticated imports with preserved private hooks/canon suggestions, followed by full command compatibility. Independently continue R3 current readiness/controller and R4/R5 conversational portrayal, NPC goals/knowledge and fictional pressure; these gates remain essential to human-GM behavior.
