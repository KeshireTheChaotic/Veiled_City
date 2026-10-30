# RF06 — SQLite, publication, Discord commands and composition

**Status: partial implementation; independent slices active alongside RF05.** User authorization on 2026-10-30 replaces the old blanket phase-entry hold. Transaction-sensitive repository changes still require their specific qualified domain and synchronous commit contracts.

## Completed independent slices

| Feature | Delivered boundary | Commit | Fresh evidence |
| --- | --- | --- | --- |
| RF06-F05 R01 | Schema-only registration through Discord public; stable executable/env/routes | 06dad37a | 6/6 passed, syntax passed |
| RF06-F04 R02 | Existing command root/group aliases decoded inside Discord | d6ec1467 | 4/4 passed, syntax passed |
| RF06-F03 R03 | Original channel privacy validators inside Discord; commands adopts public | 4f1d459e | 7/7 final passed, syntax/source equality passed |
| RF06-F01 I01 | Current source/schema/method/caller inventory | this documentation checkpoint | Static Acorn extraction exit 0; no runtime tests/DB opens |

Feature scopes, full outcomes including initial failed test expectations, hashes, modified paths, rollback and limits are in ../../features/RF06-F05/R01-LEDGER.md, ../../features/RF06-F04/R02-LEDGER.md, ../../features/RF06-F03/R03-LEDGER.md and ../../features/RF06-F01/I01-LEDGER.md. Existing C148 and CHUNK01 remain separately qualified prior slices; this checkpoint does not replace their evidence.

## Current persistence boundary

Root db.js is a standalone compatibility facade. frameworks/persistence/database.js contains 319 methods and 412 direct SQL call sites at inspected d6ec1467. Migrations retain schema version 460; schema.sql SHA256 D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 unchanged. I01-STORAGE-MAP.json captures method parameters, SQL/table candidates, transaction and JSON operations, foreign-key clauses and syntactic caller candidates. No database was opened. See PERSISTENCE-BOUNDARY-INVENTORY.md.

## Architecture and coordination

After R03: RF05 ratchet exit 0, 963 modules, zero unowned/active/transition errors, 780 accepted legacy occurrences, one cycle of 62. R01's RF06 check exited 1 with 526 earlier-phase expired groups; RF06 was not rerun after unrelated changes and is not qualified. Current measurements include concurrent Agent A RF05 work and cannot be credited solely to Agent B. Three exact obsolete registration/command privacy transitions retired; no exception expansion.

Exclusive ownership coordinated through Agent A RF05 chat: Agent B owns commands.js, publishing.js, Discord public and feature-local RF06 artifacts; Agent A owns Narrative/GM/state/turn and explicitly scheduled Publication pair/API work. Shared transition/manifest windows pass explicitly at commit boundaries. Preserve all owner and other-agent dirty changes; commits stage only each slice's exact paths.

## Local holds and next work

Keep the root privacy compatibility reader for publication/index/diagnostics until qualified pair/entrypoint adoption. Existing publication uncertain-delivery, native effect/outbox transactions, stored proof readers and command receipt checks remain unchanged. Transaction-sensitive SQL migration requires exact caller/unit-of-work proof; RF05 completeness as a whole is not a prerequisite for independent slices.

Next exact feature: RF06-F03 R04 qualified Discord–Publication privacy/transport adapter, followed by additional independent command/publication boundaries. No full RF06 or RF07 completion claim. No live Discord/provider calls, production DB access, deployment, CI, push or merge. Release remains unauthorized.
