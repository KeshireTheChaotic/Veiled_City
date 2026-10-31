# RF06 persistence boundary inventory

**Baseline static inventory complete:** see [RF06-F01 I01](../../features/RF06-F01/I01-LEDGER.md) and its [method/caller/schema map](../../features/RF06-F01/I01-STORAGE-MAP.json).

At d6ec14676df36ed014660b15fd59d133c55aaeec, root db.js is a compatibility facade; implementation is frameworks/persistence/database.js: 319 methods, 412 direct SQL call sites, 2,640 split lines. Schema migration assigns version 460; schema.sql hash D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 is unchanged. No DB was opened.

Keep the existing synchronous connection/transaction/savepoint contract. Correlated native outcomes, immutable receipts, outbox claims and archive/memory acknowledgment must not be independently committed. Preserve historical JSON/assembly/snapshot readers. Method-level extraction requires specific qualified caller contracts and fresh rollback/recovery evidence; unrelated transport, command and inventory work can proceed alongside RF05. Static ownership/relocation alone does not qualify persistence isolation or release.

## Qualified current decomposition

RF06-F02 R23 is complete: getPlayer/getPlayerByPrivateChannel/setPrivateChannel/setAccessibility SQL moved into player-preferences-repository.js, using the same class connection and current getPlayer dispatch. VeiledDB retains319 methods;315 others are structurally unchanged. Class SQL sites408 plus repository4 preserve original total412. Schema460/hash unchanged; real disposable SQLite preference/receipt/reopen/rollback evidence is in [R23 ledger](../../features/RF06-F02/R23-LEDGER.md). I01 remains an immutable baseline snapshot. No correlated native/turn/receipt repository extraction is authorized by this preference slice.

RF06-F02 R24 is complete: six original administrative backup/snapshot/ledger reads moved into administrative-read-repository.js. Same connection and current class preview callbacks retained. Class402 + preference4 + administrative6 SQL sites preserve total412;319 methods retained and313 other methods unchanged from R23. Real disposable SQLite no-write/transaction/reopen and affected command evidence in [R24 ledger](../../features/RF06-F02/R24-LEDGER.md). Creation/restore/native/correlated SQL remains in place.

RF06-F02 R25 is complete: only original getCampaign SELECT moved to campaign-configuration-repository.js on same instrumented connection. Class401 + preference4 + administrative6 + campaign1 preserve total412. All318 other method ASTs/signatures unchanged from R24, including native/configuration/ensure/snapshot/transaction writes. [R25 ledger](../../features/RF06-F02/R25-LEDGER.md) records actual SQLite instrumentation, caller transaction/reopen and affected preference evidence. No wider native repository contract qualified.

RF06-F02 R48 complete: original searchRulesRulings/getRulesRuling reads in rules-ruling-repository.js on caller connection/proxy.319methods retained/317otherASTsunchanged;class399+preferences4+admin6+campaign1+savedrulings2=412SQLsites. Schema460/hash unchanged. [R48 evidence](../../features/RF06-F02/R48-LEDGER.md) records15/15new+affected actualSQLite/proxy/rollback/reopen tests. Native/receipt/outbox writes still untouched and held.

RF06-F02 R49 complete: original listFactsForGM read in gm-fact-repository.js, same connection/proxy and filters-before-limit.319methods/318otherASTsunchanged;class398+repos14=412SQLsites. [R49 evidence](../../features/RF06-F02/R49-LEDGER.md) records13/13new+affected actualSQLite/default/filter/getter/rollback/proxy/reopen checks. Schema460/hash unchanged; no fact/native/evidence/receipt/outbox write migration.
