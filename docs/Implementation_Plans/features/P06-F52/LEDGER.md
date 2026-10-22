# P06-F52 — ledger

Status: IMPLEMENTED; AGGREGATE QUALIFICATION INCOMPLETE.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `ae8f89b5d2061e1b570aa017836fa3d1df1f0f16`.
- Occurrence: [`adversary:choir-relay:route-around`](../P06-F01/occurrences/adversary--choir-relay--route-around/SCOPE.md).
- Source/template hashes: in [scope](SCOPE.md).
- Planned modules: native definition/catalog, exact cue projector, adversary context, fresh F52 test and catalog counts.
- Commit: `7bbf88de04398ab7233c8ad8151b0f790f8b939e`.
- Tests: valid frozen run `p06-f52-repair-20261022-a`, 185 total / 183 pass / 2 fail. Both failures were F01 catalog-count expectations; all four Route Around cases passed. After the unrelated Terms First descriptor was restored and the count corrected to final 64/62, `node --test tests/ai-gm-2026-10/p06-f01.test.mjs` passed 3/3, exit 0. A later cwd mistake did not construct the mapped paths; no result was collected and it is unqualified. Do not count it as a pass.
- Syntax: changed JS/MJS 5/5; changed JSON 2/2.
- Catalog: 64 supported / 89 review-only / 0 needs-authoring; 63 handler keys / 52 P06 handler families.
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Owner questions/restrictions: none; no NPC autonomy restriction proposed.
- Local holds: qualifying last-HP event, allied Signal relationship, NPC Stress choice, powered device/Close range, relocation, 1-HP final state and replay.
- Critical blocker: none. Release authorization: false.
