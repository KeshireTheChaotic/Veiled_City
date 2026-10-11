# Veiled City — Typed Intent v9.1 Gap Closure + Narrative PvP

Updated 2026-10-10 (America/Chicago). **Implementation planning only** — no source changes, deployments, API calls or live tests were performed by creating this package.

- Repository: `KeshireTheChaotic/Veiled_City` / branch `codex/typed-intent-refinement`
- Source reviewed in predecessor v9 audit: `26e4d6e8f0c3335a250e81952ac9c092c38450b2`
- Existing D08: **BLOCKED** on unsafe consent and uncompleted scene-window coordination. The reported 99/99 suites exclude the known-red D08 security test; that test must become mandatory and green.
- **New user decision:** PC versus PC uses **bilaterally consented, narrative-only PvP**, with pre-agreed best/worst stakes and hard limits; no standard PC HP/Armor/Stress damage. Two supported modes: single higher-total opposed Duality roll, or first to three higher-total paired exchanges. Winner and loser each own their character's narration. Native Hope/Fear faces and criticals are preserved as defined in the attached contract.
- **Delta from original v9:** two new independently committed phases `V9-PVP-A` (agreement) and `V9-PVP-B` (resolution) inserted without renumbering existing repair phases. Total **11** phase commits expected if all pass. Original v9 defect repairs remain intact.
- Regression matrix: **76 scenarios** (44 original + 32 new PvP cases).

Read in order:

1. `V9_NARRATIVE_PVP_CONTRACT.md` — complete agreed house-rule algorithm, consent, security, publicity, recovery and story authority.
2. `V9_SOURCE_AUDIT.md` — original source evidence plus new PvP integration hazards.
3. `V9_IMPLEMENTATION_PLAN.md` — 11 phase work packages with commits and acceptance.
4. `V9_REGRESSION_MATRIX.csv` — tests for existing gaps and 32 PvP cases.
5. `V9_CODEX_KICKOFF.md` — ready-to-copy autonomous Codex kickoff prompt.

The prior v8 phases should not be blindly repeated. Codex must reconcile against its actual **latest** checked-out HEAD and reproduce confirmed failures with red-first tests. User-approved new PvP mechanics are **house rules**, not claims of official Daggerheart PvP mechanics or already-running functionality.
