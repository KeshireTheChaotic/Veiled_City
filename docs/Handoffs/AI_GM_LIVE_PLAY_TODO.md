# AI GM live-play to-do (handoff to Codex)

Source: live Discord play on the dev database (`bot/data/veiled_city.sqlite`, ChatGPT sign-in mode), 2026-10-28/29, plus a read-only review of the code and database. Branch `codex/clean-ai-gm-2026-10`. Line numbers were checked at HEAD `4a9482f6` plus the uncommitted working tree.

Ground rules from `AGENTS.md`: keep each fix small (YAGNI), commit unrelated fixes separately, add a test for each, and run `npm run -s architecture:check`. New tests under `bot/tests/ai-gm-2026-10/` are gitignored, so commit them with `git add -f`.

## 0. Unblock and land the pending work

- [ ] **Restore a loadable tree.** `bot/tests/ai-gm-2026-10/compose-startup.mjs` imports `src/session-opening-runner.js`, which is missing in the current working tree (the RF04 C178/C179 work in progress also deletes `src/session-opening.js` and `src/city-civic.js`). Until that's restored, every test that loads `compose-startup.mjs` fails with `ERR_MODULE_NOT_FOUND`.
- [ ] **Commit the held-move fix (written, untested, uncommitted).** A move that is not `auto` used to get an `arrival` task, so the writer narrated arriving somewhere the character never went.
  - Live case: the bus trip to The Municipal Archive was resolved `blocked`, yet the published narration had Tyrell arriving there. His saved location stayed `location-morrow-steps-market`.
  - Changed files (only these hunks are Claude's):
    - `bot/src/narrative-tasks.js:28` adds the `held_move` kind.
    - `bot/src/narrative-tasks.js:46` gives it the disposition `move_held`.
    - `bot/src/narrative-tasks.js:70` counts that disposition as covered.
    - `bot/src/narrative-completeness.js:27` adds `move_held` to the settled dispositions.
    - `bot/src/narrative-delegation.js:42` adds a writer constraint: no departure, journey or arrival, and every act stays at the current location.
  - Test: `bot/tests/ai-gm-2026-10/held-move-narration.test.mjs` (new, untracked).
  - Run it together with `pending-roll-narration.test.mjs` and `unestablished-travel.test.mjs`.
  - Note: `bot/src/pvp-output.js` also has uncommitted changes, but those are Codex's, not part of this fix.

## 1. The AI GM records no lore of its own (highest impact)

Evidence: across about 30 played turns there are 0 rows in `facts`, `clocks`, `handouts` and `canon_events`. All 21 audited GM turns (`audit_log` action `turn`) had empty `events`, and their state review said `no_change` throughout. Clues from play exist only as published prose and player memory. Trace them with `node clue-trace.mjs <db> carter "please don" branching "copper basin"`: they appear only in `narrative_unit`, `memory_revision` and output records.

- [ ] **1a. Let the current writer produce leads and clues.**
  - Current writer acts only ever map to `npc_speech` or `scene` units (`bot/src/narrative-writer-v9.js:12`).
  - The engine already supports `lead` and `established_observation` units, but the current writer can't produce them. Consequences:
    - Narrative memory never files anything as a clue. Only `lead` units become clues (`bot/src/frameworks/knowledge/narrative-memory.js:15`).
    - Investigation tasks can only be answered by `lead`, `established_observation` or `native_outcome_render` units (`bot/src/narrative-tasks.js:59`), so every investigation stays unanswered.
  - Fix: add a lead act kind to the writer schema and map it to the `lead` unit kind.
- [ ] **1b. Record clues after the writer runs.**
  - The main GM turn is the only place that can record facts, clues, threads and clocks (`bot/src/gm.js:682`), but it runs before the writer invents the details.
  - Fix: turn published `lead` units into clue records with `observation` epistemic, plus a thread so the case board updates.
  - The case board publishes only from `thread` events (`bot/src/publishing.js:123`). The known-locations and NPC listings come from `location_update` and `npc_update` events, which are also never emitted.
- [ ] **1c. Save NPCs' own claims to their knowledge.**
  - Live case: after Nessa told Tyrell about the carter and the east-road bathhouse, `npc_knowledge` holds nothing about it. Only Tyrell's statements to her were saved, in `npc_memories`.
  - `recordNpcTestimony` (`bot/src/state.js:87`) only fires for the GM's `narrative_claims` disclosures that fail with `fact_missing`, never for the writer's NPC speech.
  - Fix: save an NPC's established speech as testimony in that NPC's knowledge.

## 2. Players can't travel to places the GM narrated

- [ ] **2a. Make new places persist natively, not just by instruction.**
  - A move needs a known location key. Without one it waits for the player to name a target (`bot/src/typed-intents.js:251`).
  - Place lookup is exact name or alias only (`bot/src/frameworks/world/location-language.js:8`).
  - Only the writer's `fiction_delta` can create a location. The main GM turn's `world_additions` can only reuse existing ones (`bot/src/autonomous-world.js:187`).
  - Prompt wording didn't help: commits `d8b9316a` and `8de8007a` added it, and the writer still returned `fiction_delta: []` on two live retries (draft `narrative-draft:b30dc467…`).
  - Contributing rule: "Never create a missing identity merely because the owner names or claims it" (`bot/src/frameworks/narrative/narrative-authority-contract.js:6`).
  - Live symptom: "Which specific target did you mean by "the open narrow doorway beside the boarded-up bathhouse"?" (`semantic_intent_proposal` `proposal:5fe7343d60bd4acc521b9f54c0bc8c61`).
  - Suggested fix: when a move is waiting on an unknown place phrase, put an explicit "establish this place" item in the writer's request and accept the resulting location as the move's target.
  - Native requirement: an entity is only established if one of the writer's acts is placed at it (`bot/src/narrative-authority.js:212-215`).
- [ ] **2b. The GM blocks ordinary travel to places that already exist.**
  - Live case: the GM ruled the bus to The Municipal Archive `blocked` because "cross-town travel… requires native or human review" (typed intent `accepted:proposal:8455a1cb01038740716f4266b7d07ed7`).
  - The prompt already says unobstructed movement is `auto` (`bot/src/typed-intents.js:69`). Clarify that travel to another established place is ordinary unless an established obstacle applies, and that elapsed time is not an obstacle.

## 3. Lore the writer creates gets rejected, and the reason is lost

- [ ] **3a. Save the real rejection reason.** `bot/src/narrative-authority.js:228` stores only `error.diagnostic?.category`, so a plain error message ends up recorded as the generic `native_identity_validation`. Live case: The Folding Yard (`location-folding-yard`) and Nera Voss (`npc-nera-voss`) in the session opening were rejected for an unknown reason.
- [ ] **3b. One rejected place or person shouldn't discard everything set there.** The Folding Yard rejection held all four opening acts as `held_scope`: a scene description, an NPC description, an NPC offer and a sign.
- [ ] **3c. NPCs can't be created at a place the scene isn't at** (`bot/src/frameworks/world/identity-rules.js:50-53`). The Archive clerk `npc-archive-clerk-oren` was rejected because the move was held. This is expected once item 0's held-move fix lands; just confirm the writer no longer places NPCs off-scene.

## 4. A single problem throws away a whole reply

- [ ] **4a. Retry or repair held acts instead of dropping them.**
  - Any act whose text names a player character is held (`bot/src/narrative-authority.js:103`).
  - Two of Nessa's replies were dropped whole for naming Tyrell (drafts `narrative-draft:f787bbee…` and `narrative-draft:5fd453b1…`). The instruction fix is in `76a956c4`.
  - There's no writer retry when acts are held.
- [ ] **4b. The fallback notice is misleading.**
  - When every act is held, the player sees "The surroundings could not be safely described from the current viewpoint…" (`bot/src/pvp-output.js:135`, added at `:524`), even when the dropped text was dialogue.
  - Make it neutral, for example "That response is held for GM review."

## 5. The narrative health check is unreliable

- [ ] **5a.** 7 of 15 `narrative_health` records are `task_response_missing` even though the player got a good answer.
  - Looking at narrated scenery creates an observation that waits for the player to name a target (3 observe proposals are `awaiting_referent`). The observation is never accepted, so its task shows `needs_clarification`.
  - NPC replies are sometimes counted `not_attempted` when the act's `task_id` doesn't match.
  - Fix the matching, so this check can signal real problems.
- [ ] **5b.** 2 investigation tasks are `needs_clarification`, and one turn is `investigation_response_missing`. Item 1a fixes the answer side.

## Already fixed and committed (for context)

- `e9cff3f1`: the public roll result shows both Hope and Fear dice, the verdict, Hope/Stress changes and the GM's Fear gain.
- `475562c5`: `normalizeDirectorConfidence` (`bot/src/director.js:69`) now keeps the director's result object, so its arbitration origin survives. Fixes `native_service_origin_required`; confirmed live in director round 16.
- `76a956c4`: writer instructions now forbid player character names in act text.
- `d8b9316a` and `8de8007a`: writer instructions now ask it to persist new places. Not effective live; see 2a.

## Diagnostic scripts used

These are in Claude's session scratchpad, not the repo; they're easy to recreate. Each is a read-only `node:sqlite` query against `bot/data/veiled_city.sqlite`:
- `turn-records.mjs`: records for a player message, found by a phrase from its text.
- `draft-units.mjs`: a narrative draft's acts and `fiction_delta`.
- `narrative-audit.mjs` and `narrative-audit2.mjs`: tallies of unit fates, health, coverage and holds.
- `lore-counts.mjs` and `clue-trace.mjs`: lore table counts, and where a phrase from play is stored.
- `failed-turns.mjs`: failed turn attempts in time order.
