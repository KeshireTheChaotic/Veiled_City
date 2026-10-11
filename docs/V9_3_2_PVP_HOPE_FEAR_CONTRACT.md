# Veiled City v9.3.2 — Narrative PvP Hope/Fear and immediate GM-move contract

**Status:** PLANNED ONLY. This binding amendment supersedes earlier narrative-PvP `hope_policy` and `fear_policy` wherever inconsistent, without loosening PVP30, PVP30q, OBS01–OBS22, consent, player agency, or privacy. It does **not** change ordinary Daggerheart mechanics for non-PvP actions. Source reviewed: `codex/typed-intent-refinement` at `355269d28e6e6aa370c0e5ab0b159adef5db3e45` (2026-10-11). Local unpublished working-tree changes were not inspectable.

## House rule versus core Daggerheart

Standard Daggerheart action rolls ordinarily generate Hope on Hope/Critical and GM Fear on Fear, with GM moves/spendable Fear governed by the official SRD. **Our consented PvP is a custom opposed contest**, not standard attack-vs-Difficulty combat. In **PvP only**:

- **Never generate Hope** from a PvP roll, including a natural matching-d12 Critical, either character, duel or three-strikes. A Critical affects the roll's label/narrative flavor but never overrides a higher opposed total and grants no Stress clearance. `dualityRoll` supplies dice only; roll-derived resource mutation must be explicitly disabled on *all* relevant adapters. Previously owned Hope may only change through a separate, independently native-authorized **non-PvP** effect or through a separately authorized cost; current `base_trait_only` PvP charges no Hope.
- **One immediate complication obligation per Fear-duality PvP roll.** It is not campaign Fear currency; it does not call `db.changeFear(guild,+1)`, alter `campaigns.fear`, mint a reserve, nor queue a future enemy spotlight or Fear-feature spend. Every obligation must settle in the **same exchange**, before another round starts or any scene continuation dependent on the exchange/scene consequence executes. The winning/losing/tied opposed comparison is unchanged.
- **Complication is a real GM move**, not only scenery or a specific `lights_flicker` enum. Candidate moves may introduce or act with an NPC/adversary, alter access, escalate a threat, advance a countdown, disclose an unwelcome but evidence-backed truth, interfere with unfinished third-party activity, open a bounded supernatural obstacle, or apply a real native cost/condition **only with the required separate authorization and original PvP hard boundaries**. Do not automatically inflict PvP damage or force a PC reaction.

Official reference: https://daggerheartsrd.com/rules/making-moves-and-taking-action/ and https://daggerheartsrd.com/rules/core-gm-mechanics/ . These do **not** define this game's PvP house rule.

## Native contract and invariant

Distinct authoritative records, with stable kind names proposed for implementation:

1. **`pvp_round_receipt` (existing)** — the current owner-authorized saved dice. Preserve Hope/Fear faces, total, `duality` and critical; no resource change. Each accepted roll authorizes **at most one** trigger when `duality === "Fear"`.
2. **`pvp_fear_trigger` (new)** — `version`, `trigger_id`, `guild`, `session`, `scene`, `proposal`, `terms_hash`, `round`, `round_receipt`, `roll_id`, `roller_character`, `roller_principal_revision`, `source_event`, `duality:"Fear"`, `paired_comparison_ref` (nullable until pair), `trigger_ordinal`, `status:[awaiting_pair|awaiting_move|move_selected|executing|resolved|needs_review]`, `created_at`, `revision`. The dedupe key is a digest of (`guild`, `proposal`, `terms_hash`, `round`, `round_receipt`), **not Discord interaction id**, and cannot be inserted for Hope/Critical/unrolled offers. Proof is rechecked before selection and application.
3. **`pvp_fear_move_proposal` / `pvp_fear_move_decision`** — `trigger_ref`, `move_kind`, `target_refs`, `current_scene_evidence_refs`, `gm_selection_source`, `selector_principal`, `bounded_severity`, `precondition_refs`, `affected_actions`, `required_native_route`, `expected_versions`, `visibility`, `status`. An AI may suggest, **but only actual GM authority plus native source evidence** can select a move. Do not allow arbitrary free-text candidates to become effects. The selector can be automated only for narrowly proven deterministic context moves with native GM authority; otherwise show a bounded authenticated GM choice. Human GM selection cannot fabricate another PC's choice.
4. **`pvp_fear_effect_receipt` (new)** — `trigger_ref`, `move_decision_ref`, `native_mutation_ref(s)`, `affected_action_hold_refs`, `before_after_refs`, `applied_at`, `status:[resolved|needs_review|blocked]`, `effect_digest`, `visibility`, `idempotency_key`. A trigger is **resolved only when the effect is genuinely applied** (not just narrated). Do not overwrite or infer an external damage/movement/condition receipt. `pvp_fear_trigger` and terminal receipt must be distinct from `pvp_resolution_receipt` and `pvp_narrative_clause`.
5. **`pvp_exchange_gate` (new or window lifecycle extension)** — `pair_ref`, `expected_fear_trigger_ids`, `resolved_effect_ids`, `status:[awaiting_pair|pending_fear|ready|terminal]`, `revision`. An exchange with two Fear results carries two trigger refs; publish one combined scene paragraph if desired but save **two independent native obligations and effect receipts**. Never merge two triggers into one receipt or apply one effect twice.
6. **`pvp_fear_publication_part`** — closed, audience-specific rendering from `effect_receipt` and exact world/cause refs, with original player-owned narrative claims **excluded unless separately ratified**. Tie it to the existing v9.3 output-part/voice/outbox verification; delivery is not execution.

Normal campaign Fear records (`campaigns.fear`, `db.changeFear()`) remain separate. A `pvp_fear_trigger` is a pending **immediate scene-resolution obligation**, **not** an available currency balance. Neither a trigger nor a pending obligation can be spent for a future spotlight/Fear Feature. If a GM move legitimately entails spotlighting an NPC **now**, adjudicate that current NPC action with the native encounter/spotlight route; any separate Fear feature that itself requires banked Fear must use explicitly existing non-PvP campaign Fear under ordinary rules, or must be disallowed. Never convert the PvP trigger into that cost.

## Timing / state machine

```
locked bilateral terms -> both sealed declarations -> each independently authorized roll
      |          each committed Fear roll => idempotent trigger(awaiting_pair)
      v
both native rolls saved -> compare totals / save score and story-stake receipt
      |          pair receipt binds zero, one or two Fear triggers
      +-- zero Fear --> exchange ready / terminal as ordinary narrative PvP
      +-- Fear --> exchange pending_fear (do not start next exchange/continue dependent scene)
                       -> GM chooses contextual supported move(s)
                       -> native preconditions/agency/boundaries validated
                       -> apply native world/encounter/hold effects exactly once
                       -> receipt for EACH trigger -> gate ready
                       -> claim-verified scene publication and authorized continuation
```

**Nuance:** Register the Fear trigger **synchronously with each individual roll commit**. Wait until the paired result for any move that could reveal a sealed opposing result or bias comparison. Once the pair exists, settle Fear **within that exchange**, not a future round. Do not delay the pair score or revoke a lawful winner because Fear needs review. If only one Fear roll exists and the other party withdraws, the real trigger remains due during neutral closure: resolve a valid immediate scene GM move before advancing dependents, with no synthetic opponent roll, score, or forfeit. If an authenticated roll source is challenged/retracted, quarantine the trigger for adjudication; do not silently erase a previously committed, real result or apply an effect from an invalidated source.

**Two Fear results:** stable ascending order by the locked participant order (and native `round_receipt` as tie-break), **one trigger -> one verified consequential move/effect**. The second move is selected against the state after the first effect. It must be re-grounded; if no valid second move exists, leave the *same exchange* pending GM review. An external event may logically serve both only if separately saved native effect/obligation proofs establish two different authorized consequences; easiest safe implementation is two independently applied moves with one combined public narration. Do not generate a random extra event because both rolled Fear.

**Severity:** proportionate to the scene, existing danger, type of action, and signed hard boundaries; choose the smallest meaningful move that advances the fiction. The model's confidence does not authorize a mutation. Avoid arbitrary catastrophe. Treat environment/world state as possible GM material; no player gives the GM carte blanche over PC response.

## Native effect routing, actor boundaries and interruption

- NPC/adversary: validated real NPC/proxy state, position/range/capabilities, encounter presence and native action/attack rules. Human-controlled NPC proxies require their actual controller for voluntary moves. GM gets **an immediate opportunity**, not a preloaded right to bypass attack/reaction/damage or select a later turn.
- Investigations, scenes and third-player activity: a real world event may place `compound_action` or long-project nodes in a scoped **interrupted/pending** state with a saved hold + predecessor receipt. Never fabricate that third PC's speech/decision, mark a completed step failed, erase progress, or spend resources automatically. Resume/revalidate under V9-03 before dependent continuation; unrelated siblings proceed.
- Conditions, damage/Stress, relocation, locks/access and theft: use their own existing exact native action/outcome routes and current affected-PC consent/rights. A direct injury or involuntary action to a duel participant barred by the signed PvP terms remains barred even when suggested as a Fear move. A truly independent NPC/world attack may only resolve under normal non-PvP procedures and can never be camouflage for resolving PvP damage.
- Factual reveals: cite actual existing scene/canon/evidence refs; audience-check before rendering, especially private/GM-only clues and NPC secrets. Never invent evidence or reveal a secret merely because Fear triggered.
- Fictional progression: a countdown/threat/door/access mutation must reference a live native target and before/after revision; never use GM prose to mutate a world state.
- Source and ownership: do not let the winner narrate the loser choosing an action, even as a consequence; GM's authored move may impose an external obstacle but the character still owns their response.

## Failures, retries, cancellation and archival

- Atomic creation with native roll and keyed Fear trigger. Atomic compare + expected-trigger set. Atomic GM move apply + exact effect receipt. Crash before apply => pending; crash after apply before Discord => receipt exists and publish only. Delivery retries **revalidate** sources/audience and cannot re-execute effects.
- A conditional/P0 error suspends **affected dependents only** with `needs_review`; no blanket party freeze. Record private GM recovery item and, where permitted, a safe neutral player status. No silent elapsed-time forfeits.
- Newer scene, actor/owner change, lost visibility, withdrawal, retracted source, or changed world targets require a reviewed, receipt-backed repair or new legal GM move; cannot silently mark a genuine Fear trigger consumed. Terms cannot be changed retroactively after rolls.
- Old v1 `hope_policy:"roller"/"opponent"` or `fear_policy:"flavor_only"/"environment_only"` are **superseded**. Require new signed **v2 terms** with fixed `hope_generation:"none"`, `fear_resolution:"immediate_gm_move"` (field names can vary) before new rolls. Re-offer and separately reapprove already-locked *unrolled* old offers. Already-rolled historical v1 rounds and resource receipts stay append-only; **do not claw back Hope or rewrite scores automatically**. Disallow continuation of a historical legacy multi-round contest until explicit GM migration/disposition with player approvals; do not silently apply new mechanics to previously rolled terms. Audit any correction.
- No unauthorized network/model calls, no production campaign schema changes during offline implementation. Prefer additive city records; any migration must be explicit and reviewed.

## Approval gates

No V9-PVP-B completion until OBS21 NPC/scenery compatibility, both earlier PVP30q cross-actor gates, all OBS01–OBS22 privacy/observation obligations, the revised Hope/Fear test matrix, NPC action and affected third-player interruption integrations, and exact-tree full offline validation pass. V9-03–08 remain unstarted until V9-PVP-B completion; D08 release remains BLOCKED until full four-player orchestrated replay in V9-08. No push/deployment/bot launch implied.
