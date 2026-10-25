# RF06 — Persistence, publication, command, and bootstrap boundaries

## Phase objective

Isolate persistence, outbox/publication and Discord transport, command workflows, and application bootstrap while preserving SQL/schema compatibility, synchronous transaction/savepoint behavior, source and audience qualification, exact delivery acknowledgments, saved readers, controller checks, and campaign isolation.

## Entry gate

The roadmap requires domain interfaces and the exact commit contract from RF03–RF05. The current checkout does not meet that gate: RF04 remains incomplete and RF05's current qualification checkpoint records a failed architecture ratchet plus 289 RF05-F03 holds, 58 RF05-F04 assignments, and 442 RF05-F05 assignments. In particular, `state.js` and `turn-orchestration.js` still contain unresolved native commit orchestration. Until those interfaces are qualified, RF06 runtime migrations are held. Read-only source inventory and plan reconciliation may continue.

## Known ownership assignments

- `db.js` connection, schema migration, and synchronous transaction functions: persistence; split repository access from domain calls before relocation.
- `pvp-output.js` acceptance and saved output readers: narrative/native/publication responsibilities.
- `publishing.js` transport sends and private messages: Discord/publication pair; preserve acknowledgment versus uncertain outcomes.
- `commands.js` and command-family handlers: application workflows with controller/privacy checks intact.
- `index.js` bootstrap and `voice.js`: bootstrap/application composition; no eager DB connection or login on import.
- RF06-F06 and RF06-F07 do not have distinct objectives recorded in the currently inspected roadmap or ownership crosswalk; define them from authoritative source assignments before entering either feature.

## Execution order

Do not begin RF06 source changes until the entry gate is met. For each feature that becomes active, create its own scope and ledger immediately before work. Keep file relocation separate from behavioral decomposition; do not move mixed modules as a shortcut to ownership.

## Verification and release

Use only new changed-code tests under `bot/tests/ai-gm-2026-10/`, disposable local data, and mocked boundaries. Never execute inherited tests, broad validation, CI, production services/data, paid providers, or polling workflows. Release and deployment remain separately unauthorized.
