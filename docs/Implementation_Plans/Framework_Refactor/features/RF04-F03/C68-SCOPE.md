# RF04-F03 C68 — Evidence custody World source adoption

Replace the Knowledge-owned `evidence-custody.js` import of `requireCitySource` from the World root compatibility reader with the already-composed `knowledgeWorldMemory` consumer. The existing Knowledge–World adapter binds the same World function; preserve source checks, native custody behavior and startup composition. The exact direct import transition is `656fd12fc27e540bfa08154792d6bcdc798b50bf54fce4a2915146f9e1951c8a`. Review any further cycle transitions against the current graph before retirement.

Rollback: restore the original import and its retired transition record; no persisted state changes.
