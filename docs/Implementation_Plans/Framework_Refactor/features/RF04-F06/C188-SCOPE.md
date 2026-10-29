# C188 scope — retire the assembly state root

**Status: COMPLETE for this slice.** Fresh C88 passes8/8; selected syntax17/17 and RF04 ratchet pass. RF05 retains43groups/errors. See C188-RUN.md for hashes, outcomes and untested fingerprint/resume branches. No live transport or release qualification.

## Boundary

Relocate the Session-owned assembly state implementation from `bot/src/assembly-state.js` to `bot/src/frameworks/session/assembly-state.js`. Preserve the six exports and their signatures, hashing, audience, staleness, legacy delivery status, and orientation behavior. Keep the existing five-function `sessionAssemblyStateSource` binding and add `assemblyOrientation` to that same source port.

`assemblyPartsFor` and `deliverAssemblyParts` remain Application-owned and move together to `bot/src/application/workflows/assembly-delivery.js`; their implementations are unchanged. Export them from Application workflows public. Session reads `assemblyPartsFor` through the fixed `sessionAssemblyDeliveryParts` function port. Bind the original function from Application composition before Session assembly reads can run; binding itself must not call it. The Session implementation forwards to that port only when legacy delivery state is read.

Route Narrative's `narrative-authority-context.js` and `scene-fiction-context.js` through `narrativeBridgeSessionSources.assemblyOrientation`. Route Publication's `pvp-output.js` through `publicationSessionEvidence.assemblyOrientation`. Each composition binding supplies Session's original function and callers forward arguments and results unchanged.

The relocated module uses same-owner Session imports for scene reads, principal reads, assembly context, and opening state. Export its six functions and the delivery-parts port from Session public so importing the supported Session surface retains the state-source module-load binding. Application bootstrap binds the delivery-parts callback before runtime services and database construction. Repoint the one legacy H05 script import to the moved Application workflow module without changing its assertions or execution.

## Transition records

Reconcile only these six records against the final source before retirement:

- Root module location: `523c3a685261c52bce4b0dc71b1a4b773001fbf8ed32e9a4183238a4bfaf736f`.
- Session to Application `assemblyPartsFor` dependency: `064aedfa6b9b9dd7c1b944923077be363619ef9e3ecf34685bbca8eca4ce3e46`.
- Narrative imports: `bc56398d49942e72ef22c9c491dfaad48f1618543214c2119bd210b1d45f3b5b` and `3b79833f201a8394a57a6a87a20b2d184179a8ed41bb7d3733e0591774932def`.
- Publication import: `7686b0d3ab28e4b7be3bfcdb18f8c120e24f2d096548e00ad1c8065b010663f1`.
- Application assembly-delivery module location: `af265ceba3c90cc686b04c6424d657642701183eb9799b04fb288ca88bda154a`.

The six original transition records are archived in C188-RETIRED.json. RF04 remains incomplete. Next exact slice is C189 World constraint compatibility retirement, after its current-source intake review.
