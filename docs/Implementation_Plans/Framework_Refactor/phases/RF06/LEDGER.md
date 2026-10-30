# RF06 — SQLite, publication, Discord commands and composition

**Status: partial implementation; independent slices active alongside RF05.** User authorization on 2026-10-30 replaces the old blanket phase-entry hold. Transaction-sensitive repository changes still require their specific qualified domain and synchronous commit contracts.

## Completed independent slices

| Feature | Delivered boundary | Commit | Fresh evidence |
| --- | --- | --- | --- |
| RF06-F05 R01 | Schema-only registration through Discord public; stable executable/env/routes | 06dad37a | 6/6 passed, syntax passed |
| RF06-F04 R02 | Existing command root/group aliases decoded inside Discord | d6ec1467 | 4/4 passed, syntax passed |
| RF06-F03 R03 | Original channel privacy validators inside Discord; commands adopts public | 4f1d459e | 7/7 final passed, syntax/source equality passed |
| RF06-F03 R04 | Qualified Discord–Publication channel/permission consumer | 9492e39b | 7/7 passed, syntax11/11 |
| RF06-F04 R05 | Original character/encounter record views in Discord | 34793277 | 5/5 passed, original bodies equal |
| RF06-F04 R06 | Original ephemeral reply transport compatibility | d88bb55e | 6/6 passed, original body equal |
| RF06-F03 R07 | Operations diagnostic privacy adapter; unused root readers retired | this R07 checkpoint | 5/5 new + 7/7 affected passed, syntax13/13 |
| RF06-F03 R08 | Original reference message edit/create delivery | 0d3f7d2f | 7/7 passed, original body equal |
| RF06-F03 R09 | Exact acknowledgment/certainty/status helpers | 695987a9 | 5/5 passed, original bodies equal |
| RF06-F03 R10 | Original handout text views | 76a7be92 + fdceb53c whitespace fix | 6/6 passed, original bodies equal |
| RF06-F04 R11 | Original read-only command classification | 6b7fd0a0 | 7/7 passed |
| RF06-F04 R12 | Exact command receipt storage view, same connection | this R12 checkpoint | 5/5 new real SQLite/interface + 7/7 affected passed |
| RF06-F03 R13 | Original metrics/trace/latency/failure consumer; same singletons | this R13 checkpoint | 6/6 new + 12/12 affected passed, syntax18/18 |
| RF06-F01 I01 | Current source/schema/method/caller inventory | this documentation checkpoint | Static Acorn extraction exit 0; no runtime tests/DB opens |

Feature scopes, full outcomes including initial failed test expectations, hashes, modified paths, rollback and limits are in ../../features/RF06-F05/R01-LEDGER.md, ../../features/RF06-F04/R02-LEDGER.md, ../../features/RF06-F03/R03-LEDGER.md and ../../features/RF06-F01/I01-LEDGER.md. Existing C148 and CHUNK01 remain separately qualified prior slices; this checkpoint does not replace their evidence.

## Current persistence boundary

Root db.js is a standalone compatibility facade. frameworks/persistence/database.js contains 319 methods and 412 direct SQL call sites at inspected d6ec1467. Migrations retain schema version 460; schema.sql SHA256 D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 unchanged. I01-STORAGE-MAP.json captures method parameters, SQL/table candidates, transaction and JSON operations, foreign-key clauses and syntactic caller candidates. No database was opened. See PERSISTENCE-BOUNDARY-INVENTORY.md.

## Architecture and coordination

After R13: RF05 ratchet exit0, 995 modules, zero unowned/active/errors, 743 accepted legacy occurrences, one cycle of 60. R01's RF06 check exited 1 with 526 earlier-phase expired groups; RF06 was not rerun after unrelated changes and is not qualified. Current measurements include concurrent Agent A RF05 work and cannot be credited solely to Agent B. Fifteen exact obsolete registration/privacy/diagnostic transitions retired across these Agent B slices; no exception expansion.

Exclusive ownership coordinated through Agent A RF05 chat: Agent B owns commands.js, publishing.js, Discord public and feature-local RF06 artifacts; Agent A owns Narrative/GM/state/turn and explicitly scheduled Publication pair/API work. Shared transition/manifest windows pass explicitly at commit boundaries. Preserve all owner and other-agent dirty changes; commits stage only each slice's exact paths.

## Local holds and next work

Root privacy and operations diagnostic helpers are now retired after qualified pair/entrypoint adoption and zero active caller evidence. Existing publication uncertain-delivery, native effect/outbox transactions, stored proof readers and command receipt checks remain unchanged. Transaction-sensitive SQL migration requires exact caller/unit-of-work proof; RF05 completeness as a whole is not a prerequisite for independent slices.

Next exact feature: RF06-F03 R14 original Discord text splitting consumer, followed by additional independent command/publication boundaries. No full RF06 or RF07 completion claim. No live Discord/provider calls, production DB access, deployment, CI, push or merge. Release remains unauthorized.
