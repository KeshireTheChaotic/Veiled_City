# Veilkeeper 2.0 — current state

The full **R0–R8 goal remains active and incomplete**. Working tree: `D:\Library\Development\Veiled_City_2\rebuild`, branch `rebuild/veilkeeper2-audience-first`. Frozen baseline: `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. Do not use the deprecated directory.

## Usage stop instruction

The user explicitly requests: **at 2% usage remaining, pause and create a thorough handoff of the current state and next steps**. Check the live `get_usage_limits` tool at each implementation checkpoint; use the first applicable limit to reach 98% used. Last observed: five-hour 15% used, weekly 50% used on 2026-11-02. At the threshold, finish the state/handoff record, call `update_goal` with `paused`, and stop work until the user resumes. Do not use resets without explicit authorization. The handoff must include exact branch/commit/dirty paths, governing files, implemented versus uncompleted gates, current test/hash evidence, unresolved risks, migration/rollback state and ordered executable next steps.

## Phase status

**Publication instruction:** after each major phase passes its acceptance gates, integrate into the rebuild branch and push it to `origin`. The user explicitly excludes `codex/clean-ai-gm-2026-10` as a merge target. This worktree is already on `rebuild/veilkeeper2-audience-first`; do not manufacture a self-merge. Git publication is authorized at phase completion, not production deployment. R0–R2 currently have open gates.

- **R0 partial:** 1,077 modules, 4,224 exports, 219 command routes, 55 effective tables and 456 literal record kinds inventoried. Dynamic contracts and semantic migration/removal proofs remain open. [Inventory report](R0_BINDING_REPORT.md).
- **R1 partial:** offline four-capability kernel, source authority, scoped provider gateway and no-send queue implemented. Real provider/transport adapters and full dependency qualification remain. [Kernel](R1_REPORT.md), [context](R2_CONTEXT_REPORT.md).
- **R2 partial:** audience/source closure, actor-known intersection, hashed/versioned context, durable knowledge proposals/history, weighted recall policy, separate JSON packages, durable private-hook imports, independent human canon review and isolated private planning implemented. Real native adapters, imported relationships, full import/export formats, source-bound relevance/pins, reviewed-canon-to-knowledge integration and provider tool loops remain open.
- **R3–R8 outstanding:** no game rule handler/effect installed. Full Daggerheart/house-rule parity, prose review, autonomy, Discord command migration, complete durability/reconciliation, semantic migration, cutover and independent human qualification remain required.

## Current implementation evidence

Completed scoped checks are recorded in their reports; no offline result establishes live Discord quality or whole-phase acceptance. Do not rerun passing suites unless their tested code changes.

| Slice | Latest applicable evidence |
| --- | --- |
| Source/context boundary | [Context report](R2_CONTEXT_REPORT.md) |
| Knowledge persistence and generic lookup | [Knowledge](R2_KNOWLEDGE_REPORT.md), [integration](R2_INTEGRATION_REPORT.md) |
| Weighted recall | [Recall report](R2_RECALL_REPORT.md), 20/20 at its checkpoint |
| JSON package boundaries | [Package report](R2_PACKAGES_REPORT.md) |
| Private imports, canon review and imported relationships | [Relationship report](R2_RELATIONSHIP_REPORT.md), 25/25; R2_RELATIONSHIP_HASHES.json |
| Private planning and current rehearsal | [Planning report](R2_PLANNING_REPORT.md), 15/15; R2_PLANNING_HASHES.json |

Hash manifests are checkpoint-specific. Newer manifests supersede hashes of changed files; older evidence remains historical. Initial failures and their fixes remain in the relevant reports.

## Isolation and next work

Production entrypoint/configuration and legacy runtime source/schema/content remain unchanged. No production database, live model, Discord send, deployment or push has been used. Dedicated v2 databases and in-memory rehearsal remain opt-in; no production migration needs rollback. The user separately authorized and committed documentation cleanup in `3ca9db9d`; governing specs now reside under `docs/`, with removed source documentation recoverable from the pinned Git revision. Documentation deletion does not satisfy runtime retirement gates.

Imported directional GM-private relationship storage is implemented; production target resolution and full relationship dimensions remain open. **Next exact work:** native private-planning/recall adapters, remaining provider integration, then R3 deterministic rules behind the generic dispatcher. Preserve all R0–R8 requirements and separate deployment approval. Never retire unresolved legacy runtime paths.
