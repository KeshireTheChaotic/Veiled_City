# RF04-F05 C54 — Character observation reaches World through a Character port

Base a5c885d5. `bot/src/character-observation.js` imported World's `indexWorldEvent` directly from `bot/src/city-calendar.js`. It now calls the same original function through a Character-owned port (`characterWorldEvents`, `frameworks/character/contracts/world-events.js`), bound by a new Character–World adapter (`framework-to-framework/character--world/public.js`) from a thin bootstrap that `index.js` calls before runtime services. The character--world bridge contract moves from PROPOSED_NO_API to ADOPTED for this one direction, and the adapter is registered in PACKAGES.json.

In scope: port, adapter, bootstrap, the one import rewrite, the bridge and package registration, retirement of the one exact `DIRECT_CROSS_FRAMEWORK_IMPORT` record (RF04-F05 deadline), one new test.

Out of scope: World event validation and audience rules; other Character/World dependencies (the bridge entry keeps them as accountable obligations).

Rollback: revert only the C54 commit — restores the direct import and the record (C54-RETIRED.json), removes the port/adapter/bootstrap/package entry, and returns the bridge entry to PROPOSED_NO_API. RELEASE NOT AUTHORIZED.
