# P06-F52 — ledger

Status: IMPLEMENTED; CUMULATIVE MAPPED TESTS PASS.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `ae8f89b5d2061e1b570aa017836fa3d1df1f0f16`.
- Occurrence: [`adversary:choir-relay:route-around`](../P06-F01/occurrences/adversary--choir-relay--route-around/SCOPE.md).
- Source/template hashes: in [scope](SCOPE.md).
- Planned modules: native definition/catalog, exact cue projector, adversary context, fresh F52 test and catalog counts.
- Commit: `7bbf88de04398ab7233c8ad8151b0f790f8b939e`.
- Tests: final shared-code mapped run `p06-f53-20261022-a` covered F52; all four Route Around cases passed, 188/189 total with one F01 stale drift-count failure. The test-only F01 repair passed 3/3; unique mapped cases are 189/189 cumulatively, with no aggregate rerun after that test-only repair. An earlier cwd mistake was unqualified.
- Syntax: changed JS/MJS 5/5; changed JSON 2/2.
- Catalog at F52: 64 supported / 89 review-only / 0 needs-authoring; 63 handler keys / 52 P06 handler families. Current after F53: 65 / 88 / 0.
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Owner questions/restrictions: none; no NPC autonomy restriction proposed.
- Local holds: qualifying last-HP event, allied Signal relationship, NPC Stress choice, powered device/Close range, relocation, 1-HP final state and replay.
- Critical blocker: none. Release authorization: false.
