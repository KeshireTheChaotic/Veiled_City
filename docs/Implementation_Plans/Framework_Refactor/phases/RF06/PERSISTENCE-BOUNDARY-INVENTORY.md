# RF06 persistence boundary inventory

**Current static inventory complete:** see [RF06-F01 I01](../../features/RF06-F01/I01-LEDGER.md) and its [method/caller/schema map](../../features/RF06-F01/I01-STORAGE-MAP.json).

At d6ec14676df36ed014660b15fd59d133c55aaeec, root db.js is a compatibility facade; implementation is frameworks/persistence/database.js: 319 methods, 412 direct SQL call sites, 2,640 split lines. Schema migration assigns version 460; schema.sql hash D3A69C4C55A876B087556AB7F291265A684C4287233B1651B1692BE34781E374 is unchanged. No DB was opened.

Keep the existing synchronous connection/transaction/savepoint contract. Correlated native outcomes, immutable receipts, outbox claims and archive/memory acknowledgment must not be independently committed. Preserve historical JSON/assembly/snapshot readers. Method-level extraction requires specific qualified caller contracts and fresh rollback/recovery evidence; unrelated transport, command and inventory work can proceed alongside RF05. Static ownership/relocation alone does not qualify persistence isolation or release.
