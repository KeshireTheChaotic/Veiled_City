# P07-F08 — Ledger

**Status:** COMPLETE — 4 fresh tests passed; source/test syntax passed, including the final mandatory/causal non-interference guard.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`. |
| Changed code | `bot/src/narrative-opportunity-policy.js`; fresh feature test and coverage mapping. |
| Test | `p07-f08-20261022-final`: changed-module syntax checks and `node --test tests/ai-gm-2026-10/p07-f02.test.mjs tests/ai-gm-2026-10/p07-f06.test.mjs tests/ai-gm-2026-10/p07-f08.test.mjs`; exit 0; 12 passed, 0 failed/cancelled/skipped/todo; 352.2544 ms. Follow-up F03/F09 tests passed 6/6 after the policy change. |
| SHA-256 | Final policy `751887C9E810C5F691FEA93D853F5564081FA967DC8E7AC6F518B93AFB23508B`; test `1C49320F6A519F77A927471E789D13DD3AE813B75BA35D8E4CDB7188F06CFAC4`; coverage `14C55AC3D5142E9D7B34118126E420BA5843680E5C7369656139C7C0A1D0AA2E`. |
| Cost/cache | No provider/network calls; no cache change. |
| Holds | None. |
| Rollback | Revert the F08 comparator and feature-specific test/docs commit. |
| Initial feature commit | `037113edca6c948b4549080510a7ec708f360c2e`. |
| Final hardening | Corrective closeout commit `07d090322ef155368c3b1dad877fc019d1ba6946` limits overlap to optional classifications. The mandatory/causal non-interference regression passed; final source SHA is recorded above. |
