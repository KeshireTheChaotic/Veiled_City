# RF04-F04 S05 — Session native action-consent source

The Session action-window calls the original native action-consent singleton through a Session-owned fail-closed port and existing Daggerheart–Session pair. The original native service registers its two functions when loaded; application native-principals composition binds the pair before services. No consent interpretation or grant moves to Session. The existing accepted-action, owner, source and receipt rules stay in native Daggerheart.

Rollback as a unit: restore action-window's root consent import; remove both ports, native provider registration, pair binding and bootstrap call; restore any exactly retired transition records. Do not alter native rules or saved state.
