# RF01-F04 ledger

Status: ACTIVE. Base/head `0abf4be1d45e87abb2df4416f0e0f546b90cce72`.
Owner: offline tooling. New AST parser and boundary/transition validator, fresh tests and CLI. Reuses the existing production SCC algorithm, not RF00 tests/fixtures or its approximate import lexer. Pinned dev-only acorn 8.15.0; install scripts/audit disabled. No actual domain module moves/adoption. Raw versus accepted debt and actual test/CLI evidence will be recorded without pretending ratchet success removes legacy coupling. Provider/model cost $0; parser/tooling performance measured only offline. RELEASE NOT AUTHORIZED.

## Terminal closeout

Status: **COMPLETE — EXECUTABLE RATCHET, STRICT DEBT RETAINED**. Intake/base SHA `0abf4be1d45e87abb2df4416f0e0f546b90cce72`; implementation SHA recorded in the commit closeout below.

Changed modules: tooling/architecture/{ast-imports,boundary-checker,read-project,check-boundaries}.mjs; Acorn dev dependency; exact TRANSITIONS/TRANSITION_BASELINE/BASELINE_EVIDENCE configs. Reuses production SCC algorithm, never old tests.

Framework ownership: Offline tooling; no inspected source is evaluated. Parser enforces actual imports and individual cycle edges, not component-wide exemptions.

Fresh affected-code evidence: First fresh batch: exit 1 fixture syntax error, preserved F04_ATTEMPT_1.json. Repaired batch: exit 0, 23 pass, 97.7086 ms (F04_TERMINAL.json). Later checker/source-type and reader/registry changes justify final affected-code rerun: current 24 F04 tests pass within F06 frozen 34/34 batch (1338.5653 ms total).

Imports: final source scan 377 modules / zero unowned; zero active unauthorized violation groups or transition errors. Raw legacy debt 2,861 counted occurrences / 2,839 exact transition records; 211-module cycle remains with 1,120 cyclic import occurrences. RF01 does not claim removal. Final source/test SHA-256 values and exact terminal timestamps/commands are in [FINAL_EVIDENCE](../../RF01/FINAL_EVIDENCE.json), referenced terminal files and [acceptance matrix](../../RF01/ACCEPTANCE_MATRIX.md).

Rollback: Reverse CLI/package commands/registry integration and new checker/config/dev dependency together. Do not delete old runtime code or expand baseline.

No critical blocker or new creative-output restriction. No owner question pending. Provider calls/tokens/spend 0/0/$0; Codex tokens/cost and runtime performance UNMEASURED. No provider cache use; no global runtime cache introduced. No old suite/fixture execution, production DB, live provider/Discord, CI, push, merge, deployment or restart. RELEASE NOT AUTHORIZED.
