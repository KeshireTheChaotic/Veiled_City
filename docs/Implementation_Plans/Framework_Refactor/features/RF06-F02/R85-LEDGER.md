# RF06-F02 R85 — Publication diagnostic SQL extraction complete

Only `database.js` import and the two original method bodies changed; the new `publication-diagnostic-repository.js` executes both original SELECTs using the supplied `this.db` connection. The class signatures and command callers remain unchanged. No schema, public API, registry or transition changes.

From `bot/`: `node --test tests/ai-gm-2026-10/rf06-f02-r85.test.mjs tests/ai-gm-2026-10/rf06-f04-c84.test.mjs` — exit 0, 9/9 passed (4 new, 5 affected), 0 failed/skipped/cancelled. Disposable SQLite cases cover guild scoping, exact projections and ordering, cap, payload exclusion, caller-transaction visibility and rollback, reopen, and driver receiver/error identity. The five affected R84 cases preserve GM authorization, materialization/read/format ordering, private chunking, reply failure handling and saved rows. Syntax checks 3/3 and changed-path `git diff --check` passed.

SHA-256: `database.js` `80ca2abdb94487cfc31d041e18eccabac8760bd22b4e3fc166c055dce432a660`; repository `bc3bc82bde4d22ba22dd07e13ebf02eba3a51f3bdbecb00251ad4b743b2679f4`; test `1af5b2c8cc262e637b40400b534897a38872cc3310258d0f572c3b9437412cb3`.

This does not qualify publication writes, delivery uncertainty, the complete Persistence class, production databases, live Discord or the full RF06 gate. Next exact feature: RF06-F01 I03 inventory CSV backfill, then continue the remaining RF06-F02 candidates by exact read/write and transaction contract.
