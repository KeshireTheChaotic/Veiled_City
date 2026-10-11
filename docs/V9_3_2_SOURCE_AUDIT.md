# Source audit — v9.3.2 plan-only amendment

**Source:** https://github.com/KeshireTheChaotic/Veiled_City/tree/codex/typed-intent-refinement at `355269d28e6e6aa370c0e5ab0b159adef5db3e45` (2026-10-11); compared against previous `bf6b592d2ea1e44c9c666770b533e0800176c102`. GitHub reports one new commit: an owner-authorized **known-red WIP checkpoint**, not a V9-PVP-B phase-completion commit. The progress file records the next stop at lines 627–640, logged full check 105 suites PASS / 1 FAIL. Local uncommitted working-tree changes cannot be verified by the GitHub connector. This review retrieved source; it **did not execute Node tests or alter the repo**.

## Direct confirmations

| Source | Factual evidence | Risk / disposition |
|---|---|---|
| `docs/TYPED_INTENT_PROGRESS.md:582–657` | OBS21 red (31/32 authorship tests); PC observation compatibility 14/14; cross-actor protected output 4/4; check 256 modules/24 commands green; `npm run validate` 105/1. | V9-PVP-B and D08 remain blocked; no V9-03–08 started. |
| `bot/src/pvp-output.js:90–130` | `prepareAuthorizedTurnOutput` invokes `observationQueries`, renders `observation_answer`, arrival, owner PvP projection and neutral fallback. | NPC evidence-backed answer missing; OBS21 swallowed. |
| `bot/src/character-observation.js:120–135` | `observationQueries` filters targets using `db.getCharacter(i.target_key)`; only native PCs qualify. | Add distinct GM NPC/scene description authority, not bypass. |
| `bot/scripts/v9-pvp-authorship-test.mjs:~280` | OBS21 establishes GM `station-attendant` NPC with `publicIdentity:"The station attendant wears a blue coat."`; real `commitGmTurn` must describe blue coat, not generic fallback. | Preserve blue coat positive plus injected PC reaction negative. |
| `bot/src/narrative-pvp.js:27–56` | v1 closed terms require `hope_policy`; allowed `roller`, `opponent`, `flavor_only`. `fear_policy` allowed `environment_only`, `flavor_only`. | Old signed contracts contradict final fixed policies. Version/reoffer; do not mutate old digest. |
| `bot/src/pvp-rounds.js:75–86, 122–143` | `award()` updates character Hope for PvP `duality === Hope` and writes `pvp_resource_receipt`; `rollPvp()` invokes `award()` after saved `narrative_pvp` native roll. | **Confirmed active Hope-generation violation.** Remove only PvP award path; don't alter ordinary duality logic. |
| `bot/src/pvp-rounds.js:100–120,145–163` | `compare()` persists saved paired score and calls `settlePvpWindow()` when done; `continuePvp()` uses two continuation approvals with no Fear status gate. | Add immediate Fear trigger and exchange-specific hold; don't undo winner/strike. |
| `bot/src/pvp-rounds.js:176–185` | `pvpComplication()` only permits GM `lights_flicker` with `fear_policy === environment_only`; returns cosmetic text and no world effect receipt. | **Confirmed insufficient GM-move implementation.** Replace with broad native move routing and durable effect receipt. |
| `bot/src/db.js:1696–1701` and `bot/src/commands.js:1856–1862` | `changeFear()` mutates persisted `campaigns.fear` capped at 12; `/vc-gm fear` manually changes it. | Never invoke for PvP Fear; preserve normal non-PvP pool mechanics. |
| `bot/src/db.js:1703–1718`, `encounter.js`, `commands.js` | Encounter tracks spotlight counts and adversaries; native encounter/combatant routes exist. | Current GM-move adversary spotlight must be native and immediate; **not** stored future spotlight credit. Existing code is not proof all GM moves are already supported. |
| `bot/src/action-dependency.js:~69–80` and `bot/src/pvp-terminal.js:~6–26` | Compound actions have terminal native receipt requirements; current PvP result closes window and can settle compound node directly. | Separate mechanical result from scene consequence completion. Apply targeted holds with receipts and later V9-03 continuation revalidation. |
| `bot/src/publication-outbox.js`, `bot/src/pvp-output.js:~137–172`, `bot/src/voice.js`, `bot/src/index.js` | Save/revalidate output parts and delivery; voice and director protected in WIP draft. | Fear move projection must be revalidated and audience scoped before enqueue, delivery, voice/repeat and journal. Finish unqualified sinks. |
| `bot/scripts/v9-pvp-rounds-test.mjs:~46–53,125–131` | Old tests explicitly assert cosmetic `lights_flicker` and positive Hope award policies. | Rewrite expectations to **zero** PvP Hope and native real complications. Do not waive historical consent or Critical/total comparison tests. |
| `bot/scripts/v9-fixtures.mjs:37–45` | Terms fixture defaults to `hope_policy:"roller"`, `fear_policy:"environment_only"`. | v2 fixed new terms, separate legacy migration negatives. |

## Important scope distinctions

- The official Daggerheart SRD ordinarily awards Hope for Hope/Critical action rolls, banks GM Fear from Fear rolls and allows the GM to select moves; Veiled City's PvP house rule **deliberately overrides Hope/Fear resource generation only for native `narrative_pvp`**. An immediate GM move after PvP Fear is the house rule, not a claim that the official game defines this PvP system. Sources: https://daggerheartsrd.com/rules/making-moves-and-taking-action/ and https://daggerheartsrd.com/rules/core-gm-mechanics/ .
- `db.changeFear()` being present does not mean all ordinary Fear generation uses this function, so Codex must audit any generic roll-result and AI event/resource mutation path for accidental PvP award. Conversely do not broadly disable `changeFear()` because normal game and GM tooling need it.
- An NPC acting now is a GM/encounter effect, not a saved right to force a future player turn or spend a future Fear point. When an NPC move would affect PCs, normal action/attack/condition/consent and privacy rules still apply. An AI GM candidate is **not** itself a receipt of execution.
- A complication can halt Billy's *pending* investigation if an evidence-backed world event changes the situation, but cannot invent Billy's choice or erase already completed actions. An unresolved complication does not erase valid duel scores.
- OBS21 is a **positive playability regression**. Rejecting all NPC descriptions while protecting Choso from fabricated agency is not acceptable; copying arbitrary `public_identity` blindly is also not acceptable.
- The user-supplied report that the latest work is uncommitted can coexist with the GitHub WIP checkpoint: only the checkpoint is remotely visible; any subsequent local changes require Codex inspection. No production truth is assumed from this source audit.

## Mandatory open questions delegated to implementer *without weakening requirements*

1. Which existing native GM move routes can be reused for adversary actions, threat clocks, access and ongoing investigation interruptions? For unsupported routes, design minimal audited native effect service and block further exchange until it exists. Do not fake success.
2. How will `pvp_exchange_gate` protect same-pair lock/CAS while `pvp-terminal` currently closes the scene window at mechanical victory? Make result terminal and consequence terminal distinct, with exact receipts; no repurposing winner outcome for scene completion.
3. What is the source of evidence-backed NPC clothing at OBS21? An arbitrary profile paragraph is unsafe; add selected native NPC appearance fields or a separately approved GM profile fact and let OBS21 still verify the established blue coat.
4. How will active old v1 campaigns be grandfathered without silently altering a signed agreement? Require explicit new bilateral terms before *new* PvP dice; retain old rolled receipt history and audit any repair.

**Release statement:** this is a planning audit, not a new validation. V9-PVP-B / D08 BLOCKED. No repository modifications, paid calls, SQLite access, bot start or deployment.
