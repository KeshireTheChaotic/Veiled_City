# Veiled City — v9.3.1 pre-implementation amendment

**Revises v9.3 BEFORE implementation starts.** Source checkpoint retained: `codex/typed-intent-refinement` GitHub `bf6b592d2ea1e44c9c666770b533e0800176c102` (2026-10-11). Completed V9-00, V9-01, V9-PVP-A and V9-02 remain untouched. **V9-PVP-B and D08 remain BLOCKED; V9-03–V9-08 remain unstarted.** Recorded baseline, not freshly tested: `npm run check` PASS; `npm run validate` 105 passing suites / 1 failing (two cross-actor assertions). Local dirty state must be checked by Codex.

## What changed

The prior cross-actor PvP publication fix still applies. **New binding requirement:** Players may ask questions about another PC's appearance, current visible condition, witnessed actions/dialogue, whereabouts or background without obtaining new consent merely to ask. The GM may answer from actual observer-visible, owner-authored or native-established evidence. **Missing or partial appearance is an ordinary information gap, never a turn-failing security error**. Give a truthful partial/unknown answer; optionally ask the character's owner privately to describe themselves, without requiring a reply or revealing secrets. No free pass for inventing speech, emotional reactions, permanent physical traits, injuries or private activities.

The output-authority composer gains a trusted `observation_answer` pathway and optional owner-private description invitation. This prevents a broad PvP guard from freezing ordinary roleplay. Preserves PVP30 and both Billy/PVP30q blockers unchanged. The new `OBS01–OBS22` test set makes this behavior mandatory.

## Package contents and use

1. **`V9_3_IMPLEMENTATION_PLAN.md`** — amended B.1–B.6, later carry-forward phases and acceptance.
2. **`V9_3_OUTPUT_AUTHORITY_CONTRACT.md`** — amended publication policy with observation compatibility.
3. **`V9_3_1_OBSERVATION_CONTRACT.md`** — normative evidence, perception, unknown-answer and owner invitation requirements.
4. **`V9_3_REGRESSION_MATRIX.csv`** — original 115 tests + 22 new tests = **137 cases**, all IDs unique.
5. **`V9_3_CODEX_RESUME.md`** — updated copy/paste continuation from current P0 stop, including observation cases.
6. **`V9_3_SOURCE_AUDIT.md`** — carried-forward source audit with clearly labeled *new requirement*, not fabricated finding.
7. **`REFERENCE_V9_2_AUTHORSHIP_CONTRACT.md`** — unchanged prior normative source reference.

No repository edits, local Codex test execution, bot startup, production DB access, or paid APIs were performed. This ZIP only revises the source audit and implementation instructions.
