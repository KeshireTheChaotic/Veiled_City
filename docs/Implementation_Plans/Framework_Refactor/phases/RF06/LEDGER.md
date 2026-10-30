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
| RF06-F03 R07 | Operations diagnostic privacy adapter; unused root readers retired | ba765395 | 5/5 new + 7/7 affected passed, syntax13/13 |
| RF06-F03 R08 | Original reference message edit/create delivery | 0d3f7d2f | 7/7 passed, original body equal |
| RF06-F03 R09 | Exact acknowledgment/certainty/status helpers | 695987a9 | 5/5 passed, original bodies equal |
| RF06-F03 R10 | Original handout text views | 76a7be92 + fdceb53c whitespace fix | 6/6 passed, original bodies equal |
| RF06-F04 R11 | Original read-only command classification | 6b7fd0a0 | 7/7 passed |
| RF06-F04 R12 | Exact command receipt storage view, same connection | 102b2b0d | 5/5 new real SQLite/interface + 7/7 affected passed |
| RF06-F03 R13 | Original metrics/trace/latency/failure consumer; same singletons | 4d349c19 | 6/6 new + 12/12 affected passed, syntax18/18 |
| RF06-F03 R14 | Separate original Discord text consumer; channel API preserved | c2e5cc16 | 4/4 new + 12/12 affected passed |
| RF06-F03 R15 | Original closed lifecycle reader, root retired | 7593d5d9 | 6/6 passed, whole source equal |
| RF06-F03 R16 | Original native hook/deadline reader, root retired | 397e08aa | 6/6 passed, whole source equal |
| RF06-F04 R17 | Original voice command family | 57b0eb8c | 7/7 passed, original branch structure equal |
| RF06-F04 R18 | Private-channel/accessibility family + original preference store | 9678219a | 7/7 final passed, disposable SQLite/native privacy |
| RF06-F04 R19 | Named GM doctor adapter in Discord–Operations pair | 3eacf657 | 6/6 passed |
| RF06-F04 R20 | Four GM read displays + restricted Persistence view | 48974c01 | 6/6 passed, actual SQLite reads do not write |
| RF06-F05 R21 | Original config loader in bootstrap | 7d4e2993 + 05765cf4 coordination correction | 8/8 passed; mixed C85 commit documented |
| RF06-F03 R22 | Original read-only incident report in Operations | f3f4caf7 | 6/6 passed, whole source equal |
| RF06-F02 R23 | Four independent preference SQL methods, same connection | f42b7076 | 7/7 new + 12/12 affected passed;315 other methods unchanged |
| RF06-F02 R24 | Six original administrative SQL reads, same connection/dynamic readers | 5dda8fcf | 7/7 new + 6/6 affected passed;313 other methods unchanged |
| RF06-F02 R25 | Original campaign-row SQL reader on same connection/proxy | 60b685e3 | 6/6 final new + 7/7 affected passed;318 other methods unchanged |
| RF06-F04 R26 | Original campaign-status initialization/read command with qualified stores/pairs | 52abf143 | 7/7 passed, original body/remainder equality,syntax9/9 |
| RF06-F04 R27 | Original campaign setup with deferred original GM guard and one-method store | 6601f417 | 7/7 passed, original branch/remainder equality,syntax8/8 |
| RF06-F03 R28 | Original GM log delivery in Publication; same root/public function | 89d0c01b | 7/7 passed, whole original function/module proof,syntax4/4 |
| RF06-F03 R29 | Original operational error audit/GM-private delivery in Publication | 22947c77 | 7/7 passed, whole original function/module proof,syntax4/4 |
| RF06-F03 R30 | Original private relay with current source callback before each send | be877560 | 7/7 passed, whole original function/root proof,syntax4/4 |
| RF06-F03 R31 | Four original reference publication functions with unchanged proof callbacks | this R31 checkpoint | 7/7 passed, original functions/root proof,syntax4/4; external graph hold |
| RF06-F01 I01 | Current source/schema/method/caller inventory | 2b23b858 | Static Acorn extraction exit 0; no runtime tests/DB opens |

Feature scopes, full outcomes including initial failed test expectations, hashes, modified paths, rollback and limits are in ../../features/RF06-F05/R01-LEDGER.md, ../../features/RF06-F04/R02-LEDGER.md, ../../features/RF06-F03/R03-LEDGER.md and ../../features/RF06-F01/I01-LEDGER.md. Existing C148 and CHUNK01 remain separately qualified prior slices; this checkpoint does not replace their evidence.

## Current persistence boundary

Root db.js is a standalone compatibility facade. Baseline d6ec1467 has319 methods/412 direct class SQL sites. After R25,319 class methods remain,401 SQL sites stay in database.js,4 are in preferences,6 in administrative reads and1 in campaign configuration;318 other methods are structurally unchanged from R24. Migrations retain schema version 460; schema.sql SHA256 D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 unchanged. I01-STORAGE-MAP.json captures method parameters, SQL/table candidates, transaction and JSON operations, foreign-key clauses and syntactic caller candidates. The I01 static inventory opened no DB; later slices used only disposable test databases. See PERSISTENCE-BOUNDARY-INVENTORY.md.

## Architecture and coordination

After R31: shared RF05 ratchet exit1:1039 modules/4160 imports,0 unowned/1 active/0 errors,721 accepted,cycle60. Snapshot includes concurrent Agent A RF05 and external AF02 progress. Final R31 graph has one active external roll-requests to native-encounter-relations cycle and zero transition errors; no exception added and no R31 edge implicated. Separate snapshots do not qualify either full phase. R01's RF06 check exited 1 with 526 earlier-phase expired groups; RF06 was not rerun after unrelated changes and is not qualified. Current measurements include concurrent Agent A RF05 work and cannot be credited solely to Agent B. 23 exact obsolete registration/privacy/diagnostic transitions retired across these Agent B slices; no exception expansion.

Exclusive ownership coordinated through Agent A RF05 chat: Agent B owns commands.js, publishing.js, Discord public and feature-local RF06 artifacts; Agent A owns Narrative/GM/state/turn and explicitly scheduled Publication pair/API work. Shared transition/manifest windows pass explicitly at commit boundaries. Preserve all owner and other-agent dirty changes; commits stage only each slice's exact paths.

## Local holds and next work

Root privacy and operations diagnostic helpers are now retired after qualified pair/entrypoint adoption and zero active caller evidence. Existing publication uncertain-delivery, native effect/outbox transactions, stored proof readers and command receipt checks remain unchanged. Transaction-sensitive SQL migration requires exact caller/unit-of-work proof; RF05 completeness as a whole is not a prerequisite for independent slices.

Next exact feature: RF06-F03 R32 original journal delivery, subject to title/lifecycle/archive callback qualification, followed by additional independent command/publication boundaries. No full RF06 or RF07 completion claim. No live Discord/provider calls, production DB access, deployment, CI, push or merge. Release remains unauthorized.
