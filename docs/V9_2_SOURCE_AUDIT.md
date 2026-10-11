# v9.2 source audit — live GitHub snapshot

Repository: `https://github.com/KeshireTheChaotic/Veiled_City`
Branch: `codex/typed-intent-refinement`
Latest verified remote commit: [`55b006ece3ab`](https://github.com/KeshireTheChaotic/Veiled_City/commit/55b006ece3ab3cf4508c1531fee0e153cf0519eb). Original v9.1 reviewed HEAD: `26e4d6e8f0c3335a250e81952ac9c092c38450b2` (**5 commits behind**).

## Phase reconciliation

| Phase | Commit | Remote status | Verified from |
|---|---|---|---|
| V9-00 | `c4e08d78f347ffafc8c7e64cff825fdce868bc29` | complete | `docs/TYPED_INTENT_PROGRESS.md`, source changes |
| V9-01 | `697f088fe3c6c576472718c5ec34f903ccb1e2bd` | complete; original D08 consent fixture mandatory and passing per progress | `action-consent.js`, `scene-action-window.js` |
| V9-PVP-A | `2b8d807d11cfe15e47b8eeed2d17ac912203091f` | complete; bilateral stakes/authority gating | `narrative-pvp.js`, `pvp-authority.js`, `state.js` |
| V9-02 | `1149dc908636d78177e3e38a3e850c2de0215500` | complete; real coordinator and native window terminal paths | `window-coordinator.js`, `action-dependency.js`, `commands.js` |
| V9-PVP-B | **no completion commit**; WIP checkpoint HEAD `55b006ece3ab` | **BLOCKED** by PVP30. Reported 104 passing suites + 1 failing; focused PvP suite 15/16 tests passed | `pvp-rounds.js`, `v9-pvp-rounds-test.mjs`, progress ledger |
| V9-03 – V9-08 | — | not begun according to progress | ledger and prior plan |
| D08 | — | **BLOCKED** | ledger |

## Root cause: semantic authority laundering in PvP prose

1. `bot/src/pvp-rounds.js:175–192`, `authorPvpNarrative()` checks authenticated owner, current proposal/receipt, `subject_character === who.character`, winner role, and text bounds; **no claim-level ownership, stake scope, or per-clause source authorization**. Winner-supplied `text: "Choso apologizes for losing."` is accepted even though subject field names the winner. This is the **PVP30 demonstrated failure**.
2. `bot/src/pvp-rounds.js:194–221`, `sharePvpNarrative()` obtains per-character disclosure reviews, but approves entire raw winner-authored text and writes it to `pvp_public_projection`. A *right to distribute an attributed account* is not a right to establish an unapproved other-character reaction. If raw text were sent as an attributed quote or prefaced "only stake is authoritative," it could still create a misleading public narrative.
3. `bot/src/pvp-rounds.js:223–241`, `reviewPvpNarrative()` records `text_hash`, `terms_hash` and reviewer; it lacks review of each independently owned material claim or a reviewer-authored reaction source. No narrator/GM should infer that a reviewed hash means the reacting PC apologized.
4. `bot/src/narrative-integrity.js` validates material claim/output spans and some mutations, but is **not** a complete semantic detector for *all* PvP speech, gestures, emotion, voluntary movement and commitments. Simply passing its generic claim validator does not close PVP30.
5. `bot/src/pvp-terminal.js:6–27` already creates truthful non-damaging PvP terminal projections, and the duel/strike primitives are reported passing 15/16 focused tests; **reuse** rather than reimplement native rounds and window settlement.
6. `bot/src/commands.js:394–423` already routes private PvP choose/roll/continue/progress/narrate/review/share through real command adapters. Hardening must also close those actual surfaces; unit-only safeguards are insufficient.
7. Current progress shows `bot/scripts/v9-pvp-rounds-test.mjs` is registered in `validate-offline.mjs` and intentionally red, correctly preventing a misleading green release. **Keep it mandatory.**

## Current-state qualifications

- Older v9 source audit reported gaps G03–G14. New branch code supersedes at least G01/G02/G08; do not rerun already completed phases or reassert old vulnerabilities as still present.
- `V9-04` request correlation, `V9-03` post-roll compound execution, `V9-05` delivery idempotence, `V9-06` menu parity, `V9-07` bounded Discord sinks, `V9-08` final qualification remain planned, not audited complete.
- The existing WIP GitHub checkpoint may include committed draft changes; **do not call it an uncommitted local change**. Conversely a production/local working tree could contain additional uncommitted edits invisible in this review. No production changes are authorized by this audit.
- Historical reports of 104/105 are sourced to the progress ledger and user stop report; **this package did not rerun Node tests**, inspect live DB, start Discord or call a paid model.
