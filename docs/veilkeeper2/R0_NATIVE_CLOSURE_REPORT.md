# R0 current native dependency inventory — analysis slice complete

Generated with node bot/tooling/veilkeeper2/native-closure.mjs at source HEAD 43bc692c. The pinned legacy inventory remains separate and unchanged. This current-tree AST map records native module/source hashes, exports, imports, SQL statement counts, static reachability and remaining legacy bridge dependencies.

Observed: 90 native runtime modules; 67 reachable from native-start.js and register-commands.js; 23 outside that entry closure; seven legacy modules in the literal import closure; zero missing/dynamically unresolved import edges in parsed modules. The exported AI tool names match the four tool contracts exactly. Generation exited 0; no behavioral suite was rerun for this read-only analysis. This is static import evidence, not dynamic call binding, phase certification, rules parity or proof of no other runtime dependencies.

The seven legacy imports are the existing AI-provider public/client/transport/budget/feedback and Discord command definitions/schema. Presence in the closure is not permission to retire or alter them. The native uncomposed list includes character packages/hooks/relationships, cost decisions, roll preparation/lifecycle/store, Fear coordination and independent helpers. Some are alternate facades; static unreachability alone does not prove a missing feature or justify deletion. It does identify code whose focused tests must not be presented as composed-runtime acceptance.

Files: native-closure.mjs, NATIVE_DEPENDENCY_MAP.json, this report, current handoff, and condensed R0_DYNAMIC_TRIAGE_REPORT.md. The latter now reports the current verified 51 fully resolved / 34 partial writer files without contradictory intermediate progress. The 34 partial files and typed migration proofs remain holds. No source facts, disposition approvals or removal gates were invented.

Rollback: documentation/tooling only; no schema, data, runtime or production change. Existing baseline audit artifacts are not regenerated or overwritten. Remote baseline was freshly verified at 1ba6c7e15db1a66ba34b36336f31437beffe44d6; origin rebuild still fda77bd84b216e0e883c8b1348b12e7611787388. No major-phase push.

Next exact work: compose the unconnected native cost/consent and roll workflow modules through generic dispatch with actual authority-bound prompts/evidence; trace remaining R0 partial writer contracts and preserve old paths until migration/replacement coverage. Full R0–R8 gates remain incomplete.
