# discord framework ownership

Command/interaction/transport representation; domain policy in command definitions or menus must be extracted before isolation.

Observed current source candidates: `command-definitions.js`, `command-schema.js`, `discord/chunking.js`, `discord/delivery.js`, `discord/interaction-lifecycle.js`, `discord/privacy.js`. Complete accountable assignments and mixed-responsibility obligations are in the RF ownership manifest. None of those existing files moved in RF01.

This framework may use its own modules and neutral kernel primitives. Other capabilities arrive through consumer-owned contracts; it must not import another framework or a pair integration. Pair adapters alone map exactly two public framework APIs; application composition wires them.

RF01 exposes only the real injected capability constructors listed in RF01/PACKAGES.json. They are contract-only and not yet wired into existing gameplay.

Preserve the owner AI GM specification, player control, native mechanics, private audiences, source/receipt identity and autonomous fiction. Do not embed production clients, database connections or provider instances at module load. The RF01 checker enforces imports/public paths; gameplay equivalence requires its own future changed-code tests.
