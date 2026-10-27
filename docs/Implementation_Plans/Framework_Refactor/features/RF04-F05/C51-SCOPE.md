# RF04-F05 C51 — Native rules World event port

Base 5d5dd1b5. The 47 Daggerheart legacy modules that imported World's event index, audit and key/object validators directly from `bot/src/city-calendar.js` now reach the same original World functions through a Daggerheart-owned port (`nativeWorldEvents`, `frameworks/daggerheart/contracts/world-events.js`). The existing Daggerheart–World adapter binds it (`connectNativeWorldEvents`), and `index.js` calls `initializeNativeWorldEvents()` before runtime services.

In scope: the port, adapter connector, bootstrap, the one-line import rewrite in each of the 47 modules (local names kept as hoisted delegating functions), the bridge-contract consumer registration, retirement of the 47 exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records (RF04-F01 deadline), one new test, and composition lines in the four existing tests whose real flows now need the port.

Out of scope: any change to World validation, event indexing, audit, visibility or native mechanics; Session, Knowledge, Character and other `city-calendar` consumers; the nine test failures that were already present (listed in C51-RUN.json).

Rollback: revert only the C51 commit — restores the 47 direct imports and the 47 transition records (preserved in C51-RETIRED.json). No data migration. RELEASE NOT AUTHORIZED.
