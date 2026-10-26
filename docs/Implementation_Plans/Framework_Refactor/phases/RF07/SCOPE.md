# RF07 — Final architecture enforcement and qualification

## Phase objective

Close the framework refactor only when all preceding changed slices are independently tested and the executable architecture ratchet reports zero unauthorized cross-framework imports, zero unowned source modules, zero expired or unconsumed transitions, zero unauthorized framework cycles, and verified public-pair boundaries. Preserve the supported tooling wrappers and current documentation.

## Entry gate

The phase roadmap requires all earlier phases and their changed slices to be independently tested. Current evidence does not satisfy that prerequisite: RF04 remains incomplete, RF05's checkpoint gate failed, and RF06 is held before runtime changes because the RF03–RF05 interfaces and exact commit contract are not yet qualified. RF07 is therefore limited to read-only final-gate assessment and documentation until RF06 completes.

## Feature scope

The original owner handoff explicitly defines all six features; the earlier missing-definition hold is superseded by the 2026-10-26 source audit:

1. RF07-F01: supported tooling ownership and thin CLI wrappers, with historical suites left inert.
2. RF07-F02: current README, architecture/module/setup maps and crosswalk links; preserve historical evidence.
3. RF07-F03: zero transitional exceptions, expired shims, unowned sources, illegal deep/pair imports or cycles.
4. RF07-F04: one frozen permitted fresh changed-code RF union and changed-file syntax/import checks.
5. RF07-F05: stable startup, commands, content paths, schema checksum/version, native catalog, visibility/recovery and measured offline performance comparison.
6. RF07-F06: final source crosswalk, ownership/integration graph, actual violation count, diff, phase/feature ledgers, outcomes, holds and exact SHA.

Create feature scopes/ledgers as each becomes active. Current-document reconciliation may proceed independently, while final enforcement and qualification still require the preceding implementations. None is marked complete by this scope correction.

## Verification and release

Use only the repository's executable architecture checker and fresh changed-code tests when a feature changes production code. Never execute inherited suites, broad validation, CI, production data/services, live providers, or polling workflows. A passing static ratchet alone does not certify gameplay behavior or authorize release.
