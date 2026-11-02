# R2 — persistent knowledge authority

Completed implementation slice; the full R2 acceptance gate remains open.

## Delivered files and behavior

- `bot/src/v2/knowledge-store.js`: dedicated SQLite knowledge history, current revision pointers, native evidence replay identities and separate model proposal storage. Atomic revision comparison rejects stale writers; historical bodies remain available to native review. Current context reads require the head revision. Opening a legacy database is refused before schema initialization.
- `bot/src/v2/knowledge-authority.js`: model suggestions remain GM-private proposals, never accepted facts. Native acceptance requires matching committed evidence authority, exact disclosure scope and distinct human review for canon. Identity needs independent GM origin. Acknowledged disclosure requires delivered-message evidence with the exact recipient set. Corrections preserve epistemic type and audience, retain history, and cannot revive a retracted claim. Evidence is reread before storage.
- `bot/src/v2/kernel.js`: optional knowledge proposal authority behind the existing `knowledge_propose` capability. The interface still exposes exactly four generic capabilities; native acceptance and raw storage are not AI tools.
- `bot/tests/veilkeeper2/r2-knowledge.test.mjs`: eight fresh cases using real disposable SQLite files and new injected native evidence readers.

## Actual validation

Initial combined run: 15/17 passed, including all nine kernel tests. Two knowledge tests failed during cleanup because Windows still held open SQLite files. Their behavior assertions passed, but the run was recorded as failed. The test cleanup order was corrected; only the changed knowledge suite was rerun: **8/8 passed**, zero skips or failures, 154.2497 ms. Current unique coverage is **17/17** across kernel and knowledge suites. Initial and final output and execution metadata are retained in `R2_KNOWLEDGE_*OUTPUT.txt` and `R2_KNOWLEDGE_*EVIDENCE.json`. Exact source/test/document hashes are in `R2_KNOWLEDGE_HASHES.json`.

Covered behavior includes reopen persistence, concurrent stale-writer rejection, immutable native evidence, replay after correction/retraction, legacy database refusal, proposal isolation, private owner canon requests, separate human canon acceptance, identity origin, delivery uncertainty/wrong recipients, and changing evidence. No old tests were imported or run. No live Discord, provider, production database or real native evidence adapter was exercised. SQLite persistence is proven for this repository, not whole-runtime durability.

## Holds, migration and recovery

No legacy data was migrated or deleted. No production configuration or runtime path changed. No deployment or push occurred. Rollback consists of leaving the opt-in v2 code unused; the legacy entrypoint and storage remain intact. The dedicated knowledge file is additive and must not be substituted for the campaign database. Schema upgrades, backup/restore and full semantic migration still require R7/R8 qualification.

The authority depends on trusted native evidence and owner-request readers. Production adapters, transactional linkage to authoritative game receipts and delivery acknowledgements remain pending; synthetic evidence does not prove those integrations. Native history/proposal access is not player-authorized access. Context selection must still use the metadata-first audience authority. Corrections currently preserve scope rather than implicitly granting new disclosure. Weighted recall, import/export, complete identity relationships and direct generic context retrieval integration remain R2 work. Real providers, consequential prose review, rules parity, autonomy, Discord transport and full durable replay remain later gates.

**Next exact work:** finish R2 generic scoped context/knowledge integration and weighted recall/import-export acceptance; then R3 deterministic rules behind `action_propose`. R0 dynamic-contract and R1 adapter holds remain open. R3–R8 are not complete.
