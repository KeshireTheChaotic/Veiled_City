# RF04-F05 C53 — Knowledge modules reach World through existing Knowledge ports

Base 10e11e20. The five Knowledge legacy modules that imported World's event index, validators and audit directly from `bot/src/city-calendar.js` now use Knowledge's existing ports: `knowledgeWorldEvents` (event issuance and audit) and `knowledgeWorldMemory` (validators and audit). The memory port gains World's original `cityInteger`, needed by `personal-continuity.js`; the Knowledge–World adapter passes it.

In scope: the port key addition, adapter binding, import rewrite in the five modules (local names kept as hoisted delegating functions), retirement of the five exact `DIRECT_CROSS_FRAMEWORK_IMPORT` records (RF04-F03 deadline), one new test, the rf04-f05-c22 bind object (widened port), and the Knowledge World bootstrap call in five existing tests whose real flows now need it.

Out of scope: World and Knowledge behavior; non-calendar imports in these modules; the Character calendar consumer; pre-existing failures listed in C53-RUN.json.

Rollback: revert only the C53 commit — restores the five direct imports, the four-key memory port and the five records (C53-RETIRED.json). RELEASE NOT AUTHORIZED.
