# C164 dependency review before implementation

Reviewed against `8de8007a` on 2026-10-29. Planning evidence only; this document does not qualify C164 or authorize a boundary exception.

The publication plan's proposed move of `assembly-state.js` into Session has an additional dependency: `legacyAssemblyState` calls `assemblyPartsFor` from application-owned `assembly-delivery.js`. `assemblyDeliverySummary` calls `legacyAssemblyState`, so this is a live saved-delivery compatibility reader, not an unused import. Moving the module unchanged would introduce a Session dependency on application implementation.

Before moving this reader, resolve the responsibility of legacy delivery-part reconstruction. Preserve its exact part keys, text splitting, audience filtering and saved receipt matching. Either keep the compatibility reconstruction in application and supply its result through a narrow reviewed contract, or extract the publication part construction into its accountable owner and compose a Session consumer. Do not silently remove the reader, copy its algorithm, or add a private cross-owner import.

Existing `sessionAssemblyStateSource` exposes only `assemblyDeliverySummary` and `assemblyPlanHash`; exporting additional names is not enough to resolve this dependency. C163 can proceed independently because its publication egress forwarding does not move assembly state.
