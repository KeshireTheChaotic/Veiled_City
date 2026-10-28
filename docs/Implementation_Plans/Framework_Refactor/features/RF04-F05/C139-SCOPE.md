# RF04-F05 C139 — Application archive command adopts Knowledge public API

Switch the application archive-history command's three imports from the Knowledge root compatibility reader to the existing Knowledge public API. Both paths export the same original archive functions; retain the root for the Persistence facade and any historical callers. Do not alter archive signing, privacy, storage, CLI, or human authorization. This is an independently authorized consumer adoption for the RF06-F04 private-import obligation; it does not qualify RF06 or close RF04.

Coordinate retirement of exact record `55d71ea9a1bb29efeedb73008518de803f8a3fc72544dc7d3e2e3d0602198490` and inspect resulting graph changes. Restore the old import and original transition together to roll back. No persisted format changes.
