# Veilkeeper 2.0 — current phase status

Goal remains **R0–R8**, active and incomplete. Worktree: `D:\Library\Development\Veiled_City_2\rebuild`; branch `rebuild/veilkeeper2-audience-first`; pinned baseline `1ba6c7e15db1a66ba34b36336f31437beffe44d6` (upstream rechecked unchanged).

- **R0:** Inventory/binding slices complete. All 1,077 legacy modules, 4,224 exports, 219 command routes, 55 effective tables and 456 literal record kinds inventoried. Dynamic contracts and semantic conversion/removal proofs remain open. See [R0 report](R0_BINDING_REPORT.md).
- **R1:** Offline generic preparation kernel, native-record source authority, provider-neutral scoped gateway and no-send publication queue implemented. Real transport/provider adapters and dependency checks remain. See [initial kernel report](R1_REPORT.md) and [current context/integration report](R2_CONTEXT_REPORT.md).
- **R2:** Metadata-first audience/source closure, body hash/revision validation, actor-known intersection, grant revalidation and scoped one-call rehearsal implemented. Dedicated SQLite knowledge history, evidence-bound acceptance, separate model proposals, correction/retraction and human canon-review guards now implemented; see [knowledge report](R2_KNOWLEDGE_REPORT.md). Production evidence adapters, weighted recall, generic scoped retrieval and import/export qualification remain.
- **R3–R8:** Required and not implemented. No game rule handler/effect is installed. Consequential prose review, autonomous world behavior, complete Discord migration, durability, semantic data migration, release qualification and independent human review remain.

Completed coverage: initial audit 5/5, bindings/schema 8/8, kernel 9/9, current source/context/integration 18/18. All final batches have zero failures/skips. The initial context tests were rerun only after the content-hash guard changed their tested module; unchanged source tests were not rerun. Evidence and exact hashes are linked from phase reports. These are offline scoped checks, not live provider/Discord/gameplay or release proof.

Knowledge slice: kernel 9/9 and knowledge 8/8 pass. Initial knowledge teardown failures and their resolution are retained in its report. Older hash manifests describe their original commits. Use R2_KNOWLEDGE_HASHES.json for this slice and report-specific manifests for unchanged earlier slices.

Production entrypoint/configuration, legacy source/schema/content and all legacy tests remain intact. No production DB, live model, Discord send, deployment or push was used. The opt-in rehearsal remains no-send with in-memory turn/publication state; the new knowledge repository supports a separate SQLite file. No production migration needs rollback.

**Next exact work:** R2 generic scoped context/knowledge integration, weighted recall and import/export qualification; then R3 authoritative rules. Finish remaining R1 adapters and carry R0 dynamic-contract holds into each port. Never delete or convert an unresolved legacy path; preserve the full R0–R8 objective and separate deployment approval.
