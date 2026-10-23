# Framework ownership and dependency rules

These are software dependency rules. They add no gameplay or creative restriction. A proposed owner is accountable for resolving mixed responsibilities; classification itself does not authorize moving those responsibilities wholesale.

| Source owner | Allowed dependencies after migration |
|---|---|
| A framework | Its own code, approved external packages, genuinely neutral kernel primitives; other framework capabilities arrive through locally owned ports |
| A pair integration | Its own code, neutral kernel, public APIs/contracts of exactly its two alphabetically named frameworks |
| Application composition/workflow | Framework public APIs/ports and pair public APIs; orchestration only, no embedded mechanical/narrative domain logic |
| Bootstrap | Stable configuration/entrypoint wiring into composition; no eager campaign mutation on import |
| Kernel | Neutral primitives only; no campaign rules, player policy, source/audience meaning, database schema or model/Discord singleton |
| Offline tooling | Explicitly classified source/data readers and public APIs for supported CLI operations; no execution/import of historical tests or runtime startup |

All two-framework mapping, validation/translation and bidirectional interactions live exclusively in `bot/src/framework-to-framework/<a>--<b>/`. A pair's third-owner dependency is a decomposition obligation, never a license to expand that pair. Three-plus-framework use cases live as small application workflows composing established pairs. Do not introduce omnibus helpers, deep import escapes, application imports from frameworks, loader tricks, duplicated policy, hidden global service locators or global allowlists.

Framework ports belong to the consuming framework and contain no imports from the provider framework. Public APIs must be introduced from observed functions and callsites; a speculative interface name in documentation is not an implementation. RF01-F02/F05 owns interface definitions and exact lifecycle/validation/consumer tests.

## Atomic authority and persistence

SQL, serialization mappers, connections and synchronous transaction/savepoint handling belong to persistence. Domain rules in `VeiledDB` must be extracted to domain owners or corresponding persistence pairs before the repository facade is relocated. A single authoritative commit uses one shared synchronous unit of work; repository extraction must not introduce independent commits or await inside that transaction. Existing nested savepoints, rollback behavior, schema version, row keys and serialized historical versions are compatibility contracts.

Keep proposal validation, native effects/roll receipts, audience-qualified narration, outbox commitment and transport acknowledgment separate. Transport cannot bless a generated outcome. The publication/Discord pair consumes an authorized envelope and returns the exact acknowledgment; it cannot turn an absent acknowledgment into no-send proof. `delivering` and `uncertain` never authorize an automatic duplicate send.

## Migration enforcement

`PROJECTED_IMPORT_OBLIGATIONS.csv` records each currently observed source edge under the target ownership rules. It is a work queue, not an allowlist. RF01-F04 must implement permitted-public-path checks, exact pair membership, dynamic-import review and cycle enforcement, with fresh negative tests. RF00's lexical scanner is an inventory, not that complete enforcement gate. Every transitional exception needs an exact path/edge, owner, feature to remove it and expiry at or before RF07-F03. None has been granted by RF00.

At each move, validate ESM paths/extensions, JSON treatment, `import.meta.url`, content-root paths, CLI wrappers, package script strings and Docker working directory. Stable `src/index.js` and `src/register-commands.js` remain executable wrappers. Run only fresh tests for changed RF production code and changed-file syntax checks. Final RF07 success requires zero illegal imports, zero unowned source paths, zero expired shims and fresh contract evidence; unmeasured runtime behavior stays unqualified.
