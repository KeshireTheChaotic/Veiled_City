# v9.4 live source audit — `codex/typed-intent-refinement`

**Observed 2026-10-11:** GitHub HEAD `0d3d9090bd7b520744ae4dead7eb23e156bd731d`. The commit title and progress describe a known-red V9-PVP-B development checkpoint. Local Codex uncommitted edits remain unknown to this review. No live command/test executed in this chat. Do not confuse historical passing focused tests with this repo's full release gate.

## Actual currently observed status

Progress `docs/TYPED_INTENT_PROGRESS.md:695–720`:
- Before FH40 additions: 109 registered offline suites passed, but these runs are obsolete for current qualification.
- Final recorded tree: `npm run check` PASS (261 modules/scripts, 24 root commands); `npm run validate` FAIL (105 pass, 1 fail, 2 FH40 P0 test cases), `git diff --check` PASS; network denied, 0 live requests/billable tokens.
- FH40 manual World Director `resource_delta hp +1` changes Choso's marked HP from 0 to 1, without native attack/damage receipt; FH40 private Choso `I wait` also changes marked HP 0 -> 1. The source-root test contract says both forbidden. Neither should be downgraded or skipped.
- `V9-PVP-B` BLOCKED; `V9-03–08` not started; D08 BLOCKED. Previously completed V9-00, V9-01, V9-PVP-A, V9-02 remain untouched.

## Latest source-level inspection

- `bot/src/state.js:119–151`: `applyGMEvents` directly mutates character resources after a scope-sensitive but insufficient guard. Positive amount on `hp` marks damage in current schema. Scope `actorUserId=null` and private self-target are bypass candidates. A negative generated HP event should not become benign merely because the returned prose is safely quarantined.
- `bot/src/pvp-output.js:35`: `assertProtectedModelEvents` handles fact-like outputs but not `resource_delta`; source-verified narrative parts are not an authorization for a mechanic. Read-side NPC/scene support progressed since OBS21; preserve OBS21 test.
- `bot/src/narrative-pvp.js:13–16,28–56,193–200`: two participants and mandatory non-damage; v2 now fixes PvP Hope and Fear. New damage-enabled v3 **must be separate**, not an implicit relaxation of the v2 declaration.
- `bot/src/pvp-rounds.js:98–141`: two-party, totals compared and saved, no HP attack; each roll captures Fear; continuation checks gate. Do not alter these comparisons to solve damage-enabled.
- `bot/src/pvp-fear-gate.js`: exact roll-linked triggers and pair gates, no campaign Fear. `bot/src/pvp-fear-moves.js` has decision/effect/recovery services; at source snapshot these moves are bounded GM contexts, not a general Daggerheart NPC→PC damage service.
- `bot/src/roll-requests.js:63–77`: attack source requires native adjudication, weapon and encounter adversary `listCombatants`, target `difficulty`; asserts non-PC combatants. No PC attack vs Evasion here.
- `bot/src/roll-collaboration.js:92–143`: ordinary attack success uses fixed target Difficulty and critical; damage uses `finishDamage()` to mutate enemy `encounter_combatants`, not owned PC resources. `applyRollOutcome` protects native narrative PvP from ordinary Hope/Critical/Fear awards; reaction path returns before generating Hope/Fear. Preserve these behaviors for non-PvP.
- `bot/src/combat.js:18–23`: `hpMarksForDamage` currently targets combatant shape; not a complete character resource/Armor/threshold/last-HP service.
- `bot/src/db.js:1696–1716`: `changeFear` persists campaign GM Fear capped at 12; `recordSpotlight` records an encounter PC action count, not team fairness or an attack turn order. Direct PC resources live in character data (`resources.hp.current` as **marked** HP).
- `bot/src/simulation.js:274–314`: autonomous NPC target_type character is explicitly prohibited. The simulation attack path is a different d20-like system and must **not** become a fake PC-hit/HP authority.
- `bot/src/pvp-terminal.js`: defers terminal resolution while pending Fear exists; retain independent consequence vs result statuses.
- `bot/src/scene-action-window.js`, `bot/src/action-dependency.js`, `bot/src/window-coordinator.js`: generic simultaneous/consent lifecycle exists; does not imply 3+ target-specific combat CAS or damage.
- `bot/src/commands.js` `/vc-roll pvp`, `bot/src/command-definitions.js`: authenticated private command integration exists for narrative terms, dice, Fear and scope review; no damage-enabled consent UI or PC defender action controls.
- `bot/scripts/v9-pvp-authorship-test.mjs`: two FH40 negative cases; `bot/scripts/v9-pvp-hope-fear-test.mjs`: action Fear and zero-Hope behavioral tests; `bot/scripts/validate-offline.mjs`: mandatory suite registration. New tests must run actual command/adjudication/publication paths.

## Security/release implication

The code currently has a **real general PC resource authority problem** and **no authenticated PC attack-versus-Evasion/damage implementation**. Enabling damage PvP before FH40 and new target-specific effect service would create a broader exploit. All new profiles must default to closed/nonexecuting until separate consent and native receipts exist. Freeze full-release claims at BLOCKED.
