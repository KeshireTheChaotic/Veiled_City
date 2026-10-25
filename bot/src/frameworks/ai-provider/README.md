# ai-provider framework ownership

Request budgeting and provider generation feedback; domain context selection must be extracted from transport policies.

The public API currently exposes provider generation feedback, raw model request transport, and whole-turn prompt budgeting. Their implementations live in `generation-feedback.js`, `model-transport.js`, and `prompt-budget.js`; request dispatch/retry consumes an injected client and application observability callbacks. OpenAI client construction remains in application `gm.js` under its RF05-F04 transition. Recipient visibility for exact fact-detail references is supplied only through the `ai-provider--knowledge` pair adapter.

This framework may use its own modules and neutral kernel primitives. Other capabilities arrive through consumer-owned contracts; it must not import another framework or a pair integration. Pair adapters alone map exactly two public framework APIs; application composition wires them.

No public JavaScript API is fabricated here. Introduce a public entrypoint only with an actual migration/contract and fresh tests.

Preserve the owner AI GM specification, player control, native mechanics, private audiences, source/receipt identity and autonomous fiction. Do not embed production clients, database connections or provider instances at module load. The RF01 checker enforces imports/public paths; gameplay equivalence requires its own future changed-code tests.
