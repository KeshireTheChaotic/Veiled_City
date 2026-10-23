# RF00 — verified inventory and dependency design

Owner handoff: `docs/Implementation_Plans/phases/RF00/Veiled_City_RF00_Framework_Isolation_Sol_6_1_Medium_Handoff.md`.
Actual base: `codex/clean-ai-gm-2026-10`, `f43d002693cb4ee38038b5dbb2c1049de95b3ffd`.
Scope: RF00-F01 → F06 serially. No runtime relocation, schema change or gameplay behavior change.

1. F01 captures actual checkout/runtime/schema/dirty edits and source authority.
2. F02 assigns every tracked application path and each active source module exactly one accountable owner; records rationale/exports/resources/risk.
3. F03 maps imports, reverse dependents, cycles, imported calls, module state and observed pairs without executing application modules.
4. F04 traces declaration/proposal/native commitment/scoped narrative/outbox/ACK and independent NPC/world paths.
5. F05 defines architecture rules, function-level mixed ownership and ordered migration/rollback gates.
6. F06 freezes new offline audit code and tests, runs one blocking targeted batch and records terminal counts/hashes and honest readiness.

Deliverables: repository/application inventory, ownership decisions/CSV, relocation crosswalk, dependency graph/report/individual edge obligations, proposed integration registry, authority/function trace, migration dependencies, test evidence and these independent feature/phase ledgers.

Hard boundaries: full owner behavior and ENGINE mechanics/agency/privacy retained; no new narrative restriction; no production database, model, Discord, CI, deployment/restart, push or merge. Historical test/scripts remain untouched; only newly authored RF audit tests may execute. No-poll protocol is mandatory.

RF00 exit requires complete classification and an internally consistent migration design, not zero current graph violations. RF07 retains the zero-illegal-import/cycle/exception gate. Local semantic/callgraph limits and unqualified live behavior remain explicit. RELEASE NOT AUTHORIZED.
