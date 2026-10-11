# Veiled City — Typed-Intent v9.2 Resume / PvP Authorship Safety Addendum

Prepared 2026-10-11 for `KeshireTheChaotic/Veiled_City`, branch `codex/typed-intent-refinement`.

**Latest remotely reviewed HEAD:** `55b006ece3ab3cf4508c1531fee0e153cf0519eb`. This is a **work-in-progress checkpoint**, NOT a passing V9-PVP-B phase commit. Completed phase baselines: V9-00 `c4e08d78f347ffafc8c7e64cff825fdce868bc29`, V9-01 `697f088fe3c6c576472718c5ec34f903ccb1e2bd`, V9-PVP-A `2b8d807d11cfe15e47b8eeed2d17ac912203091f`, V9-02 `1149dc908636d78177e3e38a3e850c2de0215500`. `docs/TYPED_INTENT_PROGRESS.md` records reported full offline status **104 passed, 1 failing suite** (`v9-pvp-rounds-test`, PVP30). These historical suite reports were read, not rerun for this package. D08 remains BLOCKED.

## Policy decision

**Separately source-verified per-player clauses are required for authoritative and party-facing PvP narration.** Ambiguous or unverifiable text goes to a nonauthoritative pending-review state. A human GM may ask for clarification or review permitted environmental phrasing, but cannot impersonate an affected player, approve their reaction, or expand locked stakes. Affected owners must independently author or ratify their own character's material clause. Merely labeling a sentence as the winner's statement or obtaining bilateral permission to *publish* it is not sufficient.

## Files

- `V9_2_IMPLEMENTATION_PLAN.md` — phase reconciliation, V9-PVP-B repair sequence and remaining V9-03–V9-08 scope.
- `V9_2_PVP_AUTHORSHIP_CONTRACT.md` — exact source/effect/audience model and fail-closed text treatment.
- `V9_2_SOURCE_AUDIT.md` — pinned GitHub source findings, tested vs untested boundaries.
- `V9_2_REGRESSION_MATRIX.csv` — inherited v9.1 scenario inventory plus 20 new authorship/boundary cases.
- `V9_2_CODEX_RESUME.md` — targeted resume instructions, preserve checkpoint and commit only after all gates green.
- `V9_1_NARRATIVE_PVP_CONTRACT_REFERENCE.md` — prior unchanged gameplay contract for full context.

**Audit only:** no source modifications, tests, production DB access, bot startup, command registration or paid model calls are claimed by this planning package. The developer's *local* uncommitted work is not visible through GitHub; reconcile working tree before touching files.
