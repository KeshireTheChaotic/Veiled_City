# C188 proposal — retire the assembly state root

Design only; no source change or qualification.

`bot/src/assembly-state.js` belongs to Session. Its six exports cover hashes, assembly slots, legacy delivery status, delivery summaries and authenticated orientation. The existing Session source port binds five exports at module evaluation; the missing sixth is `assemblyOrientation`. Three direct consumers remain: Narrative's `narrative-authority-context.js` and `scene-fiction-context.js`, and Publication's `pvp-output.js`.

Keep all state, audience, stale-input, historical delivery and hash rules unchanged. Narrative can request orientation through its existing Session bridge source port; Publication can request it through its existing Session evidence port because the function is an assembly projection. Bind each to Session's original function, retaining lazy forwarding at callers.

The source imports Application-owned `assemblyPartsFor` from `assembly-delivery.js` only for legacy delivery status. Resolve this dependency before relocating. Prefer an explicit fixed formatting callback supplied by Application composition if legacy status remains Session-owned. Alternatively, review an ownership split of the formatting/status projection into Application; do not silently reassign the state policy merely to remove an import. Keep persisted delivery keys and uncertain/partial statuses byte-compatible. Existing standalone import-time source binding must remain available to supported Session consumers, and any new callback must be bound before those reads. Test these construction paths rather than assuming bootstrap alone proves them.

The inspected active records are the root location `523c3a685261c52bce4b0dc71b1a4b773001fbf8ed32e9a4183238a4bfaf736f`, dependency `064aedfa6b9b9dd7c1b944923077be363619ef9e3ecf34685bbca8eca4ce3e46`, Narrative imports `bc56398d49942e72ef22c9c491dfaad48f1618543214c2119bd210b1d45f3b5b` and `3b79833f201a8394a57a6a87a20b2d184179a8ed41bb7d3733e0591774932def`, and Publication import `7686b0d3ab28e4b7be3bfcdb18f8c120e24f2d096548e00ad1c8065b010663f1`. Recheck these five records against current source before retirement. Retain the separate assembly-delivery module record unless that module is independently migrated and tested.

Next exact action: review the dependency and standalone construction route, then author the bounded C188 scope and new changed-code tests. This proposal grants no completion or phase-exit claim.
