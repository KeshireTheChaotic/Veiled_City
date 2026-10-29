# world framework ownership

World/civic state and autonomous environment/event identity; native mechanical authorization remains Daggerheart-owned.

Observed source candidates at the initial audit: `autonomous-world.js`, `city-calendar.js`, `city-civic.js`, `city-consequences.js`, `city-constraints.js`, `city-core.js`. The `city-constraints.js` compatibility export was retired in RF04-F06 C189; its World implementations remain in their owning World modules, with cross-framework callers routed through the registered pair APIs. Complete accountable assignments and remaining mixed-responsibility obligations are in the RF ownership manifest.

This framework may use its own modules and neutral kernel primitives. Other capabilities arrive through consumer-owned contracts; it must not import another framework or a pair integration. Pair adapters alone map exactly two public framework APIs; application composition wires them.

No public JavaScript API is fabricated here. Introduce a public entrypoint only with an actual migration/contract and fresh tests.

Preserve the owner AI GM specification, player control, native mechanics, private audiences, source/receipt identity and autonomous fiction. Do not embed production clients, database connections or provider instances at module load. The RF01 checker enforces imports/public paths; gameplay equivalence requires its own future changed-code tests.
