# RF06-F04 R42 — Original Director status display

Move only Director status display to Discord via two original reads getDirectorState/isDirectorPaused. Existing root GM guard and active-session lookup remain, same session passed to handler; original read order preserved. No pause/resume/manual-run mutation or new policy. Preserve exact paused/name/cadence/pending/counts/empty defaults, unbounded original single private response and errors; no new truncation imposed. No SQL/schema/class/native/transaction/index change.

Request commands/Discord/Persistence/pair publics+BRIDGE slots after R41. Fresh synthetic/exact display and disposable SQLite historical state/scoping/no-write checks; whole body AST proof/syntax/architecture/exact INDEX. One frozen new suite; no live/provider/production state. Correlated storage remains held.
