# RF04-F05 C52 — Session modules reach World through existing Session ports

Base b05a4848. The seven Session legacy modules that imported World's event index, validators and audit directly from `bot/src/city-calendar.js` now use Session's existing ports: `sessionWorldEvents` (event issuance) and `sessionSceneWorldSources` (validators, visibility, audit). The latter gains World's original `cityInteger`, needed by `negotiations.js`; the Session–World adapter passes it.

In scope: the port key addition, adapter binding, import rewrite in the seven modules (local names kept as hoisted delegating functions), retirement of the seven exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records (RF04-F04 deadline), one new test, and the key list in rf04-f05-c10 (which binds the widened port).

Out of scope: World behavior; the `city-core.js` and other non-calendar imports in these modules; Knowledge and Character calendar consumers; pre-existing failures listed in C52-RUN.json.

Rollback: revert only the C52 commit — restores the seven direct imports, the six-key port and the seven records (C52-RETIRED.json). RELEASE NOT AUTHORIZED.
