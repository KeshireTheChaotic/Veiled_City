# RF06-F02 R85 — Publication diagnostic read repository

Move only the original `heldNativeNotices` and `listPendingPublications` SELECT bodies from `VeiledDB` into a Persistence-owned repository. Both continue to receive the existing SQLite connection, inputs, projections, ordering, filters and limits. Preserve the class methods and public callers. No outbox writer, delivery claim, retry, reservation or transaction boundary moves.

The new repository has no database construction or application imports. Focused tests use disposable SQLite state and driver fakes; the affected R84 command cases confirm the GM guard, query/format ordering, private reply behavior and saved rows remain unchanged. This slice does not qualify the complete Persistence boundary or RF06 phase.
