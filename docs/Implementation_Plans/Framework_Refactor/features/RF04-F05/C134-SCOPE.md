# RF04-F05 C134 — Remove 22 unused native environment root shims

Base 745a19b4. The 22 root native-environment-<name>.js files were single-line re-exports of their Daggerheart framework modules with no production importer (Daggerheart's native-environment-scene.js already imports the framework files). They are deleted; the local fresh tests (p06-f16..f36, f38, rf03-f04-c03) were repointed to frameworks/daggerheart/native-environment-<name>.js. No behavior change; startup reachability unchanged.

Rollback: Revert only the C134 commit: restore the 22 root native-environment-*.js re-export shims, repoint the local fresh tests back, and restore the exact transitions from C134-RETIRED.json.
