# V9.5 — audited source map and live-play gaps

**Repo:** https://github.com/KeshireTheChaotic/Veiled_City/tree/codex/typed-intent-refinement
**Inspected HEAD:** `e88a4414401b719bf17826b568fcfefac5eeabd4` (2026-10-12). This document is a source inspection, **not** a runtime repro. Local Codex uncommitted changes (if any) must be compared afresh.

## Baseline

- `docs/V9_4_RELEASE_QUALIFICATION.md` and `docs/TYPED_INTENT_PROGRESS.md` record V9-PVP-B and V9-03–08 committed. V9-08 reports 126 mandatory suites and 473 focused cases passed, zero skipped focused cases, network-denied and no paid calls. `v9-release-qualification-test.mjs` runs four-player **adapter** fixtures, not real players or unrestricted live-model narration.
- GitHub Actions `offline-validation` passed for HEAD: https://github.com/KeshireTheChaotic/Veiled_City/actions/runs/38261448805. The run installs dependencies and executes `npm run validate`, not a production/staging Discord+OpenAI session.
- `bot/scripts/validate-offline.mjs` registers 126 mandatory suites (count should be rechecked on local source). Security categories include real native PVP30/FH40/OBS/D08, attack/reaction/Armor/death, group, publication, private UI, and mixed replay fixtures.
- The owner-approved v9.4 rulings presently accept **only** `lethality: lethal` / `owner_selected_srd_death_move` for damage-enabled v3 PvP. `nonlethal_no_incapacitation` and `nonlethal_incapacitation` are not available. Native narrative v2 Duel/Three Strikes remains harmless. PvP action-Critical Stress clearance is disabled. Full v9.4 positive native tests should remain unchanged except if an independently approved new rule explicitly supersedes them.

## Gap N1 — scope is wider than necessary for creative prose

**Relevant code:**

- [`pvp-output.js` protected scope](https://github.com/KeshireTheChaotic/Veiled_City/blob/e88a4414401b719bf17826b568fcfefac5eeabd4/bot/src/pvp-output.js#L24-L38) gathers both `pvp_proposal` and `pvp_encounter_contract` in the current scene if roster/recipient selection matches, **with no explicit terminal-status exclusion**. This is important: historical PC-authority hazards remain real but should not globally suppress world/NPC dialogue.
- [`prepareAuthorizedTurnOutput`](https://github.com/KeshireTheChaotic/Veiled_City/blob/e88a4414401b719bf17826b568fcfefac5eeabd4/bot/src/pvp-output.js#L140-L209) replaces `narration`, `public_narration`, `player_summary` and private generated messages in protected context with verified parts; if none is eligible it uses a neutral sentence. It quarantines raw output and drops proposed model memory/cognition/handout drafts. This prevents invented Choso reactions, but gives no general trusted path for spontaneous NPC conversation as conversation.
- `world-observation.js` `establishWorldDescription` and `renderWorldObservation` support GM-selected, visible facts such as an NPC's coat; `character-observation.js` handles source-bounded PC observation. A known-description renderer is not the same as a native new-NPC utterance/action pathway.
- `narrative-integrity.js` model-generated `narrative_claims` is non-authoritative. The fix must be an independently verified **closed** output projection, not moving unknown prose past the gate or trusting absent claims.

**Actual live risk:** normal NPC questions during or after a duel could yield neutral/no-response prose. Source strongly supports the mechanism; rate/frequency and natural-language impact remain **unmeasured** until staging. Require explicit real turn adapter regression.

## Gap F1 — human GM and preestablished native effects are normal path

- [`pvp-fear-moves.js` `establishFearContext`](https://github.com/KeshireTheChaotic/Veiled_City/blob/e88a4414401b719bf17826b568fcfefac5eeabd4/bot/src/pvp-fear-moves.js#L62-L91) enforces `gmOnly`, preexisting source-grounded target, and only `clock_advance`, `access_obstacle`, `npc_prepare`, `npc_attack`.
- `selectFearMove`, `applyFearMove` and `reconcileFearMove` also require authenticated GM and exact trigger/context/target revision. This is a good authority boundary. It also means there is no proven automatically generated *new* native Fear situation when a scene lacks an eligible clock, obstacle, NPC preparation or incoming attack.
- The gate in `pvp-fear-gate.js`, `pvp-terminal.js` and `pvp-damage.js` correctly prevents dependent continuation while Fear is due. This is right for integrity but not automatically playable without native GM-move auto-adjudication.
- Model suggestions cannot be treated as an authenticated human GM. Build a server-internal limited delegate capability and native adaptation, not a model-authored `{gm:true}` bypass. Keep supported human recovery.

**Actual live risk:** stalled exchange pending manual review / limited consequence variety. Not a proven frequency; test with a no-prepared-context scene and two Fear triggers.

## Gap U1 — PvP controls are technically complete but high-friction

- [`commands.js` PvP dispatch](https://github.com/KeshireTheChaotic/Veiled_City/blob/e88a4414401b719bf17826b568fcfefac5eeabd4/bot/src/commands.js#L465-L576) parses JSON for damage offer/review/respond, source GM attack preparation, attack authorizations, damage dice, Armor, reactions, Fear and narrative author/disclose flows. UI is mostly `JSON.stringify` and ephemeral chunk text.
- `command-definitions.js` exposes `/vc-roll pvp json`; the regular `roll-menu.js` and `roll-operation-publications.js` are more ergonomic for ordinary rolls, but this does not constitute a native guided PvP controller.
- The current docs `PRIVATE_ROLL_GUIDE.md` instruct technically complex workflows with exact key/revision JSON; accessibility, number of clicks, missing DM and error recovery need live player measurement.

## Gap M1 — observability is offline aggregate, not live-quality evidence

- `operational-metrics.js` records counts, durations, input/output tokens, retries without prompts/narration/IDs and bounded samples (`sampleLimit=500`); keep this privacy design. It does not yet report consent→round→Fear terminal wait chains or suppressed-world-narration rate by scene; neither should public/private sensitive content be dumped as a debug convenience.
- `gm.js` `requestStructured` uses OpenAI `responses.create`, can retry incomplete JSON; natural-language validity and live latency/cost were not measured in current v9.4 qualification. A live-model run through the bot **does** incur API billing; mock/chat tests do not bill the user's API account.
- `index.js` routes player posts through `shouldRespond` then `runTurn`, commit, outbox, and optional voice; real Discord permissions, network failures, model correction paths and concurrency need authorized staging.

## Deprecation evidence (initial candidates, not approved removals)

- Two **tracked timestamp backups** exist in `bot/src`: `gm.js.20261009-144611.bak`, `narrative-integrity.js.20261009-144611.bak`. They are not `.js` runtime import targets and should be checked for scripts/docs/deployment references and retired from the source tree after proof. Git history and document SHA should preserve audit trace.
- `bot/scripts/v7-delta-baseline-test.mjs` explicitly asserts old missing functionality and reports `V7_DELTA_RED`, rather than a current behavioral acceptance. It is **not registered** in current `validate-offline.mjs`. Candidate for removal after reachability check.
- `bot/scripts/v9-pvp-contract-test.mjs` is a 32-case module-availability inventory that explicitly says `NOT scenario qualification`, and is **not registered** in current default offline validator. Candidate to replace with test-coverage inventory rather than retain as a misleading green signal.
- A large set of older `implementation-phase-*`, `systems-to-players-*`, `end-to-end-*`, `i-heard-you-*`, `d0*` and v9.* suites **are registered**. Do NOT label these irrelevant without assertion-by-assertion source-to-test mapping and positive+negative parity. Many verify non-PvP mechanics or historical boundaries not covered by new PvP examples.
- `legacy-authority.js`, legacy migrations/records, old v1/v2 consent readers and historical schema transformations are potential **compatibility dependencies**, not dead code. No DB purge or automatic version conversion in v9.5.

## Source review boundary and next proof

I reviewed core modules and release docs using the connected GitHub file contents, not a local clone or the real bot. No Node validation, coverage profiler, live Discord test, API call or safe deletion was performed for this v9.5 plan. Codex must run `git grep`/module graph, full actual offline baseline, red-first tests and behavior trace, then refine these candidates before implementation. GitHub HEAD and local worktree may differ at implementation time. See the implementation plan and proposed regression inventory for acceptance criteria.
