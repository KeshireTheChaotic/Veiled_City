# RF06 remaining work and prerequisites — I03 source snapshot

Snapshot HEAD: `305641096caf2dc38cf05e80262fae22e4fe751d`; source fingerprint `4559ca22cd64145f1e551ba88a7fd5bdf2272d69c3baa0ae2710848add71994c`. [I03-INVENTORY.json](I03-INVENTORY.json) records every captured source hash and dirty path. Agents A/C held source writes during capture. C's Native roll-request/collaboration/typed-proof drafts were explicitly **untested** at capture; inclusion in this graph is not completion evidence for those drafts. This is a timestamped working-tree snapshot, not a claim that concurrent work remains unchanged afterward.

The scanner evaluates no application module and opens no database. Its class/repository footprint recognizes `.db` and `connection` receivers; arbitrary aliases are not resolved. Callers are syntactic candidates, including unrelated objects with matching method names. SELECT syntax does not prove a read-only method, valid audience, same connection or atomic unit of work. Review labels describe limits of this extraction, not demonstrated defects or rejection of already qualified code.

## Storage evidence

| Captured measure | Result |
| --- | --- |
| VeiledDB class members | 319 |
| Recognized SQL sites in class | 389 |
| Recognized SQL sites in directly imported `*-repository.js` files | 23 |
| Historical class + imported-repository footprint | 412 |
| Other recognized SQL candidates outside that footprint | 5 |
| Class sites by syntax | 218 SELECT;120 write/schema;38 dynamic review;7 other review;6 transaction control |
| Imported repository sites by syntax | 17 SELECT;4 dynamic review;2 write/schema |
| Members calling `this.transaction` | 7 |
| External syntactic calls named `transaction` | 305; not 305 verified VeiledDB transactions |
| All syntactic storage-method callers | 5,741 |

The seven class self-transaction members are migrateSchema, advanceSimulationClock, setDirectorState, completeDirectorPass, changeFear, upsertRelationship and importCharacterGmHooks. Native/application transaction callers require their own callback/effect/receipt review; this list is not the entire transaction map.

The five additional candidates are environment-access-rules and environment-binding-rules (Native SELECTs), World established-fact-proof (SELECT), Persistence relationship-reader (SELECT) and diagnostic-snapshot (PRAGMA review). These are outside the class/direct-imported-repository footprint, not necessarily outside Persistence ownership. Unknown aliases can hide further sites; no total-all-SQL claim is made.

Schema source SHA-256 remains `d3a69c4c55a876b087556ab7f291265a684c4287233b1651b1692be34781e374`; database.js still assigns `PRAGMA user_version=460`. No installed or production database version was inspected. I01's historical method/serialization/schema map remains intact; I03 supplements it with current source evidence.

## Hubs and phase requirements still open

Import/obligation numbers below are raw source-graph occurrences, not a full ratchet pass or a count of unique frameworks.

| Source | Bytes | Imports | Raw obligations | Required disposition |
| --- | ---: | ---: | ---: | --- |
| db.js facade | 305 | 2 | 0 | One static runtime importer remains: index.js. Preserve compatibility; zero violations is not zero callers. |
| Persistence database.js | 180,675 | 25 | 0 | RF06-F02 remains incomplete: connection/migrations/transaction coordinator and hundreds of SQL sites still share the class. Legal ownership does not prove decomposition. |
| publishing.js | 14,874 | 24 | 3 | RF06-F03: legacy location and original Discord chunking/Operations metric imports; preserve cold composition and delivery behavior when adopting ports. |
| publication-outbox.js | 11,037 | 14 | 7 | RF06-F03: chunking/authorship/metrics/Director imports and cycles with output/authorship; exact uncertain-delivery/ack/retry contracts required. |
| native-publications.js | 14,808 | 12 | 13 | RF06-F03: Native notice/round/arbitration/attack/damage sources and cycles; no generic writer/repository migration from the diagnostic proof. |
| pvp-output.js | 68,393 | 36 | 10 | RF06-F03: authorship/notice/metrics/chunking/arbitration sources and cycles; source certification and private authority stay intact. |
| commands.js | 186,457 | 127 | 44 | RF06-F04 remains incomplete: 43 private API edges plus legacy location. Continue cohesive command adapters as their exact owner contracts become available. |
| Discord command-definitions.js | 74,457 | 1 | 0 | Already cohesive Discord registration data separated from execution. Preserve the public schema; do not fragment solely for line count. Root command-definitions.js is absent. |
| index.js | 53,443 | 46 | 22 | RF06-F05: eager setup and private Native/GM/Publication/runtime imports remain. Preserve startup/default paths/order and compose proven public contracts. |
| runtime-initializers.js | 5,935 | 54 | 0 | Application composition is legitimate here; many pair imports alone are not a decomposition defect. |

The raw source graph has 1,096 modules, 4,456 imports, zero unowned modules and one 51-module cycle. It still has 591 raw violations. This snapshot is not the full bridge-registry/transition ratchet and does not establish RF06/RF07 completion.

RF06-F06 fresh delta evidence exists per feature, but no final phase union or live qualification is claimed. RF06-F07 facade/shim retirement remains gated by the reverse graph, supported external APIs and saved readers. No broad legacy validation, CI, registration, provider or deployment run is warranted by this inventory.

## Qualified boundaries and next decisions

1. **Next exact feature: RF06-F02 R86, select the next bounded diagnostic read from the committed inventory.** R85 moved only listPendingPublications and heldNativeNotices onto the existing caller connection; its tests cover transaction visibility/rollback/reopen and affected R84 guard/order/private cases. Do not broaden this into enqueue/claim/ack/reservation/retry/reconciliation writers. Inspect current caller and transaction evidence before choosing another method.
2. **Do not split the intel registration callback merely to create a small next slice.** It is a 2,023-byte, ten-subcommand pure callback inside an already single-owner catalog. Its extraction would not remove the runtime private edges or transaction-sensitive responsibilities identified above. Revisit schema partitioning only for a concrete registration/interface requirement.
3. **Larger publication moves depend on exact sources, not all of RF05.** Existing source ports may support individual edges, but cold binding, identity, source validation, original transaction callpoints and output uncertainty still need evidence for each migration. R65/R66/R67 qualify their documented withdrawal/group-owner/cancellation reservation paths only; R68's environment-trace reservation/choice remains held.
4. **Keep Native state and SQL correlated.** The SELECT labels, syntactic absence of a writer, public export names, and zero file-level violations do not authorize splitting native effects, immutable receipts, outbox claims, snapshot restoration or archive acknowledgement across independent commits/connections.
5. **Revisit startup from current import evidence.** The facade's lone index.js importer and existing public Persistence class may offer an independent F05 adoption after class-identity/startup/path proof. Other index Native/GM imports wait only for their own proven interfaces. Do not remove the supported facade just because an internal importer moves.

The objective remains the full RF06 architecture and behavior-preserving exit, not the set of small deltas already completed.
