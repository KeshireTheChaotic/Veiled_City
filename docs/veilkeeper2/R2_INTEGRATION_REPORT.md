# R2 — generic scoped retrieval and knowledge composition

Completed implementation slice; full R2 remains open.

`kernel.js` now delegates optional `context_read({topic:'knowledge',focus:recordReference})` to the native context authority. The reference only selects a candidate: metadata/source closure and the authenticated current audience govern whether its body can be read. Missing and unauthorized references both return empty records. Unknown cursors are rejected. Conversation reads retain their existing current-utterance behavior. No principal, campaign, recipient set or actor entitlement is model-selectable.

`context-authority.js` adds the scoped read adapter through its existing issue/inspect checks. `rehearsal.js` composes this reader and optional native knowledge authority into the existing four generic capabilities. A dedicated knowledge store can supply both persisted context and isolated proposals. Accepted records still require the separate native authority. The model proposal cannot call acceptance or become context merely by being saved.

Fresh tests in `r1-rehearsal.test.mjs` exercise optional lookup against guessed private/missing references, invalid scope/cursor arguments, revoked audiences, real SQLite-backed context, proposal isolation, correction invalidation of queued drafts and retracted-record exclusion. Existing tests for changed kernel/context/rehearsal modules were rerun once: **23/23 passed**, zero failures/skips, 76.7439 ms. See R2_INTEGRATION_TEST_OUTPUT.txt, R2_INTEGRATION_TEST_EVIDENCE.json and R2_INTEGRATION_HASHES.json. Unchanged knowledge/source-authority suites were not rerun.

This is offline composition evidence with injected provider and native readers. Provider-side tool invocation, actor-bound conversational orchestration, cursor paging and query-based recall selection remain pending. Retrieval returns an immediate scoped snapshot; a future provider tool loop must retain/revalidate every extra context grant at publication, rather than treating a past lookup as a lasting disclosure grant. No such provider loop is installed or claimed here. Ordinary rehearsal still makes one provider invocation without mandatory tools; all output remains unsent and awaiting review.

No legacy source/schema/content, production data, deployment or remote branch changed. No migration or retirement occurred. Rollback is to keep the additive opt-in runtime unused. Complete migration/restore/reconciliation evidence remains an R7/R8 gate. The modified production files are the three v2 modules named above; only the rehearsal test and phase documentation changed otherwise.

**Next exact work:** R2 source-deduplicated weighted recall and imported private-hook/player-export boundaries, followed by remaining native/provider adapters and R3 deterministic rules. R0 dynamic contracts and R1 live adapters remain holds; R3–R8 are outstanding. Neither this checkpoint nor its tests prove live Discord quality or whole-phase acceptance.
