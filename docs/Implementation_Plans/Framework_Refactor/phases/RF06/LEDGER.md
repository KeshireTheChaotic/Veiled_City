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
| RF06-F03 R31 | Four original reference publication functions with unchanged proof callbacks | f6b5f41e | 7/7 passed, original functions/root proof,syntax4/4; external graph hold |
| RF06-F03 R32 | Original journal delivery with unchanged archive callback/lifecycle reader | f17c541a | 7/7 passed, two original functions/root proof,syntax4/4; external graph hold |
| RF06-F03 R33 | Original play-channel publisher with unchanged proof callbacks/trace/log order | 2f00af23 | 7/7 passed, whole function/root proof,syntax4/4 |
| RF06-F03 R34 | Original private-player publisher, same validation/permission/uncertainty semantics | 1428ed20 | 14/14 fresh+affected passed,whole function/root proof,syntax4/4 |
| RF06-F04 R35 | Original GM overview adapter through existing Discord–Operations pair | 8133eac6 | 6/6 final passed,syntax3; C98 intermediate graph qualified |
| RF06-F04 R36 | Original GM fact-list display through fixed read view | 05ca78a3 | 6/6 passed incl actualSQLite,syntax7,originalbranchAST proof |
| RF06-F04 R37 | Original private GM cognition display through four-read view | e5ee650c | 6/6 passed incl actualSQLite,syntax7,originalbranchAST proof |
| RF06-F04 R38 | Three original fact display text helpers in Discord | 36fd54d3 | 7/7passed,syntax4,whole function/rootAST proof |
| RF06-F04 R39 | Original continuing-party status through two-method view | cfca6e14 | 6/6passed incl actualSQLite,syntax7,originalbranchAST |
| RF06-F04 R40 | Original session-roster adapter through existing pair | 3fa2a61b | 6/6passed,syntax5,originalguard/report/chunker proof |
| RF06-F04 R41 | Original Director-history private display through fixed read view | cde2b74e | 6/6passed incl actualSQLite,syntax7,originalbranchAST |
| RF06-F04 R42 | Original Director-status through two-method view | eab23475 | 6/6passed,syntax7,originalbranchAST; fingerprints unchanged on resume |
| RF06-F05 R43 | Original SIGINT/SIGTERM registration in bootstrap | 222f79c4 | 5/5passed,syntax3,exact callbacks/restindexAST |
| RF06-F04 R44 | Original export attachment construction in Discord | 07326425 | 5/5passed,syntax4,whole helper/rootAST proof |
| RF06-F04 R45 | Twelve original command attachment constructors through Discord | 0e3ab1bf | 4/4passed,syntax4,argument/restrootAST proof |
| RF06-F04 R46 | Original lazy GM access predicate through same campaign reader | 449e487a | 11/11fresh+affected passed,syntax8,guard/restrootAST; oneSDKobligation retired |
| RF06-F04 R47 | Original saved-rulings view and stateless reply/edit helper in Discord | 3f9e4714 | 8/8passed incl actualSQLite,syntax9,bodies/restsourceAST |
| RF06-F02 R48 | Two original saved-ruling SQL readers, same connection/proxy | 3c642327 | 15/15new+affected passed,syntax3,317othermethodsASTunchanged |
| RF06-F02 R49 | Original GM-fact SQL query, same connection/proxy | d04d2541e568b3324ba9198da0f3f60e6698ada1 | 13/13new+affected,syntax3,318othermethodAST unchanged |
| RF06-F02 R50 | Original NPC memory/knowledge list SQL readers, same connection/proxy | f86467f9207b9ff6c4a19816ac84a18c000d7627 | 7/7new repaired;6affected passed initially;syntax3;317otherAST exact |
| RF06-F02 R51 | Original NPC profile SQL readers; fuzzy lookup unchanged | 95c5c4e4fffd567af6340e8b0e3c616c53be5b7b | 20/20new+affected;syntax3;317otherAST exact |
| RF06-F04 R52 | Original downtime/relationship text in Discord; original destination preserved | 2aea3cc57b2f043bdfec8f1b1970228ceba5ac9d | 6/6fresh repaired+5/5affected;syntax4;whole/restAST exact |
| RF06-F03 R53 | Original handout SDK constructor through fixed Discord–Publication consumer | ca2a9941f69b97d4719caee3b2ee067afcecc3f0 | 10/10fresh+affected after boundary repair;syntax6;root/initializerAST exact |
| RF06-F04 R54 | Owner-private character list read/view through existing pair | f5d5c28ff6e98b4f08f7b8a10f577bc0d19b0828 | 6/6fresh;syntax7;whole/restcommandAST exact |
| RF06-F02 R55 | Original owner-scoped character list SQL on same connection | 3c7ffbb8df04e7abb1071b54736d15d7c9ba9797 | 11/11fresh+affected;syntax3;318othermethodAST exact |
| RF06-F04 R56 | Original NPC proxy packet/control display in Discord | 92dc0457d46278839b337535dda3544cc1756173 | 6/6fresh;syntax4;whole/restcommandAST exact |
| RF06-F04 R57 | Original canon status/conflict read displays through existing pair | 4a88cccbdf4edce180347da9e8041701dad4592d | 6/6fresh;syntax7;whole/restcommandAST+GMguard exact |
| RF06-F02 R58 | Original canon status/conflict SQL readers, same connection | 308886d62d2ef8c0aedfefb83e6987e19bc2ce5b | 12/12fresh+affected;syntax3;317othermethodAST exact |
| RF06-F04 R59 | Original level-up draft text with same composed rule callbacks | this R59 checkpoint | 6/6fresh;syntax4;wholeformatter/restcommandAST exact |
| RF06-F01 I01 | Current source/schema/method/caller inventory | 2b23b858 | Static Acorn extraction exit 0; no runtime tests/DB opens |

Feature scopes, full outcomes including initial failed test expectations, hashes, modified paths, rollback and limits are in ../../features/RF06-F05/R01-LEDGER.md, ../../features/RF06-F04/R02-LEDGER.md, ../../features/RF06-F03/R03-LEDGER.md and ../../features/RF06-F01/I01-LEDGER.md. Existing C148 and CHUNK01 remain separately qualified prior slices; this checkpoint does not replace their evidence.

## Current persistence boundary

Root db.js is a standalone compatibility facade. Baseline d6ec1467 has319 methods/412 direct class SQL sites. After R58,319 class methods remain,391 SQL sites stay in database.js; repositories preferences4/admin6/campaign1/savedrulings2/GMfacts1/NPCcognition2/NPCprofiles2/characterlist1/canonreads2 preserve total412;317 other method ASTs unchanged from R55. Migrations retain schema version 460; schema.sql SHA256 D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 unchanged. I01-STORAGE-MAP.json captures method parameters, SQL/table candidates, transaction and JSON operations, foreign-key clauses and syntactic caller candidates. The I01 static inventory opened no DB; later slices used only disposable test databases. See PERSISTENCE-BOUNDARY-INVENTORY.md.

## Architecture and coordination

After R59: shared RF05 ratchet exit0,1085 modules/4340 imports,0active/0errors,641 accepted,cycle55. Snapshot includes concurrent Agent A RF05 and external AF02 progress. R31/R32 snapshots recorded one external AF02 roll-requests cycle; Agent A C95 resolves that edge without exception expansion. Current snapshot includes concurrent C118 and prepared R60 progress with zero registry errors. Separate snapshots do not qualify either full phase. R01's RF06 check exited 1 with 526 earlier-phase expired groups; RF06 was not rerun after unrelated changes and is not qualified. Current measurements include concurrent Agent A RF05 work and cannot be credited solely to Agent B. 25 exact obsolete registration/privacy/diagnostic transitions retired across these Agent B slices; no exception expansion.

Exclusive ownership coordinated through Agent A RF05 chat: Agent B owns commands.js, publishing.js, Discord public and feature-local RF06 artifacts; Agent A owns Narrative/GM/state/turn and explicitly scheduled Publication pair/API work. Shared transition/manifest windows pass explicitly at commit boundaries. Preserve all owner and other-agent dirty changes; commits stage only each slice's exact paths.

## Local holds and next work

Root privacy and operations diagnostic helpers are now retired after qualified pair/entrypoint adoption and zero active caller evidence. Existing publication uncertain-delivery, native effect/outbox transactions, stored proof readers and command receipt checks remain unchanged. Transaction-sensitive SQL migration requires exact caller/unit-of-work proof; RF05 completeness as a whole is not a prerequisite for independent slices.

Next exact feature: RF06-F05 R60 frozen client-ready callback checkpoint; handout migration locally held, followed by additional independent command/publication boundaries. No full RF06 or RF07 completion claim. No live Discord/provider calls, production DB access, deployment, CI, push or merge. Release remains unauthorized.
