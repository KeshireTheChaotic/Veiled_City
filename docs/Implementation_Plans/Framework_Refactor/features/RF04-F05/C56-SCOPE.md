# RF04-F05 C56 — Native rules read Session principals through own port

Base 5b6275d8. 18 Daggerheart legacy modules imported Session's `conversationPrincipal` (and four of them `historicalOwnerPrincipal`) from the root re-export `bot/src/conversation-principal.js`. They now call the same original Session readers through a Daggerheart-owned port (`nativePrincipals`, `frameworks/daggerheart/contracts/principals.js`), bound by the existing Daggerheart–Session adapter (`connectNativePrincipals`) from a bootstrap that `index.js` calls before runtime services. Module list fixed in C56-CONSUMERS.json.

In scope: port, connector, bootstrap, bridge consumer registration, the import rewrite in the 18 modules, retirement of their 18 exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records, one new test, and the bootstrap call in three existing tests whose real flows now need it.

Out of scope: Session identity rules; World, Knowledge and Character principal consumers.

Rollback: revert only the C56 commit — restores the 18 direct imports and records (C56-RETIRED.json), removes the port, connector, bootstrap and bridge consumer entry. RELEASE NOT AUTHORIZED.
