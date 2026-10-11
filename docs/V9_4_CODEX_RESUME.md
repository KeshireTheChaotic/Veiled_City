# Codex execution instructions — Veiled City v9.4 P0 plus damage-enabled/multiplayer PvP

**THIS CHAT REVIEW DID NOT COMMIT OR PUSH.** Execution is for local Codex under normal future user authorization. Repository: `D:\Library\Development\Veiled_City`; branch `codex/typed-intent-refinement`; last observed origin `0d3d9090bd7b520744ae4dead7eb23e156bd731d` on 2026-10-11. It is a **known-red WIP checkpoint**. No V9-PVP-B completion commit; V9-03..08 and D08 BLOCKED.

Read in order: this `V9_4_IMPLEMENTATION_PLAN.md`, `V9_4_PVP_PROFILE_AND_RECEIPT_CONTRACT.md`, `V9_4_SOURCE_AUDIT.md`, `V9_4_RULES_AND_COMMUNITY_RESEARCH.md`, `V9_4_REGRESSION_MATRIX.csv`; then all bundled old contracts; `docs/TYPED_INTENT_PROGRESS.md:695–720`; production code/test adapters named by the audit. Do not treat a source contract or plan as an implementation. Before changes run `git status --short`, fetch origin, compare actual HEAD/diffs and preserve uncommitted user work, campaign files and checkpoint.

**Immediate P0:** reproduce two original FH40 cases unchanged (actual manual World Director and private `I wait.` HP mutation). Verify no valid damage/npc effect receipt. Implement source-verified universal PC resource eligibility at `state.js:applyGMEvents`, plus the supported native PC-target incoming NPC mechanics, without global freeze. Do not allow model to mint its own receipt. Preserve legitimate native healing, damage, costs and ordinary parallel NPC/scenery output. Register both negative and positive native-path tests; full offline suite must pass BEFORE B.1 commit.

**Profile expansion after security is green:** create distinct `narrative_only` vs `damage_enabled` consent. All affected owners sign lethal/nonlethal risk, target-specific scope, rules, stop/withdrawal and disclosure; at no time may narrative Duel/Three Strikes itself apply HP. Native attack vs actual target Evasion, per-target current defensive Armor and authorised reaction choices, real damage/proficiency/threshold/last-HP/death receipts, Fear per attacker action (never reaction), Hope zero from all PvP. Add 3+ FFA/team brawls with fair opportunities, target locks and independent nonparticipants. No silent homebrew evasion, automatic defender extra rolls, or forced PC responses.

**Required commits, by Codex only, in exactly the ordered phases and only once respective tests pass:**

- `fix(v9-pvp): require native receipts for all PC resource effects`
- `fix(v9-pvp): complete observation and output authority qualification`
- `feat(v9-pvp): add versioned damage and multi-PC consent profiles`
- `feat(v9-pvp): adjudicate PC attacks against Evasion`
- `feat(v9-pvp): resolve consented PC damage and death boundaries`
- `feat(v9-pvp): orchestrate multiplayer spotlights and target locks`
- `test(v9-pvp): qualify damage profiles and cross-actor outputs`
- `feat(v9-pvp): complete verified narrative and damage PvP`
- Then separately the existing `V9-03` through `V9-08` phase commits listed in the inherited plan.

For each: run focused red-first tests, sync release manifest, syntax/schema checks, full network-denied offline validator and `git diff --check`, document actual command exit codes and SHA in progress, then commit only files that belong to phase. Push **only a passing phase** via normal fast-forward to `origin/codex/typed-intent-refinement`, if that is still authorized; no force push, WIP masking, unrequested production pull, live bot launch, Discord registration, SQLite/WAL/SHM, `.env` or paid API access. If P0/red, STOP and report precisely, preserving source and tests.

Final V9-08 replay must include 2-PC narrative modes, 2-PC nonlethal/lethal Evasion/HP scenarios, 3+ FFA and 2v2, NPC→PC Fear attack, both-Fear narrative exchange, two FH40 negatives, cross-actor Choso apology, OBS21 Station Attendant, unknown PC appearance, owner disclosures, private journals/voice, reruns/withdrawal, and negative legacy v1 history. D08 remains BLOCKED until all mandatory gates are green on identical sources, no skipped tests.
