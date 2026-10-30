# operations framework ownership

Diagnostics, observability and offline qualification support; reporting must retain private-data redaction.

Observed current source candidates: `ai-gm-test-selection.js`, `ai-review.js`, `diagnostics/session5-reader.js`, `evaluation-harness.js`, `failure-trace.js`, `logger.js`. Complete accountable assignments and mixed-responsibility obligations are in the RF ownership manifest. None of those existing files moved in RF01.

This framework may use its own modules and neutral kernel primitives. Other capabilities arrive through consumer-owned contracts; it must not import another framework or a pair integration. Pair adapters alone map exactly two public framework APIs; application composition wires them.

No public JavaScript API is fabricated here. Introduce a public entrypoint only with an actual migration/contract and fresh tests.

Preserve the owner AI GM specification, player control, native mechanics, private audiences, source/receipt identity and autonomous fiction. Do not embed production clients, database connections or provider instances at module load. The RF01 checker enforces imports/public paths; gameplay equivalence requires its own future changed-code tests.

## RF02 current implementation

RF02: logger.js and opening-diagnostics.js moved unchanged and are consumed via public.js. error-policy.js owns application legacy-message classification separated from kernel error classes. Shared metrics/AsyncLocalStorage/latency and mixed diagnostics remain explicit local holds; no duplicate singleton exists.

RF06-F03 R07: read-only campaign diagnostics now lives in diagnostics.js with own routing/metrics imports and a fixed Discord diagnostic consumer. discord--operations binds the original channel fetch/privacy functions at application startup; the diagnostic report does not mutate permissions, send messages or open a database.
