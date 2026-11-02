# R1/R2 — durable native source records

Completed native scene repository slice; full source/transport acceptance remains open.

`bot/src/v2/scene-store.js` persists closed message, channel, scene, session and actor-control records in a dedicated SQLite database. Atomic native snapshots carry source/principal provenance, compare expected revisions and preserve immutable history plus replay receipts. The store assigns revisions; callers cannot inject revisions or gameplay fields such as HP. Source records are separate from mechanical state. Multi-record failures and final native-authorization failure roll back the entire snapshot.

The store supplies concrete readers directly compatible with the existing source authority and rehearsal. Message deletion, ownership/control changes, attendance changes, channel permission changes and ended sessions invalidate previous source proofs through current records. Identical replay cannot overwrite later state; changed replay and stale updates fail. No write method is exposed through the four generic AI capabilities.

## Evidence

Six fresh scene-store tests: **6/6 passed**, zero failures/skips, 104.1291 ms. Real disposable SQLite tests cover reopening, late arrivals, reader composition, source/publication invalidation, revision history, exact replay, atomic rollback, cross-campaign/schema rejection and no extra AI mutations. Existing source/kernel/rehearsal suites were not rerun because their code did not change.

Artifacts: R1_SCENE_TEST_OUTPUT.txt, R1_SCENE_TEST_EVIDENCE.json and R1_SCENE_HASHES.json. The native authorization callback and provider are test doubles. Persisting a `permissionsVerified` field is not proof of actual Discord permissions: the forthcoming authenticated transport/admin adapter must derive and revalidate the originating snapshots. Full production source migration remains unverified.

## Holds, rollback and next work

Native ingestion/authentication, session/late-arrival commands, live Discord permission refresh, proxy ownership provisioning, full campaign migration and transactional integration with gameplay remain pending. Current source IDs deliberately reject edited identities already issued by one authority; replay/reconciliation and edited-message processing need R7 qualification. This is not a generic game-state patch store or a replacement for native action rules.

No production database, legacy runtime source/schema/content, deployment or push changed. No migration occurred. Rollback is to leave the additive opt-in repository unused. The unrelated README edit remains untouched. Major-phase publication waits for the full gates and targets the rebuild branch only.

**Next exact work:** native transport ingestion and recall/context adapters, then R3 deterministic rules. R0–R2 still have open gates; R3–R8 are outstanding.
