# RF04-F05 C82 — Native roll declaration World source

Replace the Daggerheart roll-declaration review's direct World reader import with the existing C81 `nativeWorldSource` consumer. The already-adopted Daggerheart–World pair binds the original source function in `initializeNativeWorldEvents`, called before services by `index.js`. This is a human-reviewed mutation path, not a saved-receipt reader. Its first guard still rejects automated reviewers before consulting World state.

Coordinate retirement of exact record `078c8d48d85128ccca498950725fe0c2d0880d968a771b26f3c5990de2a7e4bd` and inspect cycle changes. Restore the original source import and exact transition together to roll back. No persisted format changes.
