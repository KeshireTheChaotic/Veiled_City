# Veiled City — v9.1 Narrative PvP Contract (Proposed House Rules)

**Status:** Proposed design, not yet implemented. Authoritative branch and source inspection remain pinned in `V9_SOURCE_AUDIT.md`. This is a *deliberate house-rule procedure* for PC-versus-PC conflict, not a representation of Daggerheart's standard attack-versus-adversary resolution.

## 1. Scope and overriding rule

A direct conflict between two or more separately controlled **player characters (PCs)** must use a purpose-built, consent-locked narrative PvP service. It must **not** fall through to `roll-requests.js`'s normal `kind="attack"`, `finishDamage()`, combatant HP thresholds, `resource_delta` for hostile PC harm, ordinary encounter damage, or inferred NPC/GM authority. Standard adversary combat, NPC action, environment, and non-PvP native rolls remain unaffected unless independently authorized by existing rules.

The attacker may **declare an attempt** in ordinary prose. That declaration establishes no hit, forced defense, surprise condition, displacement, item loss, damage, stress, HP/armor change, or compelled reaction. An independent permissible approach or speech act can resolve separately; the hostile action is held `awaiting_stakes` or `awaiting_consent`.

Consent **to participate** is not consent **to lose**, to narrate a character's reaction, to incur physical/mechanical effects, to expose private information, or to accept any outcome outside the agreed terms. Nobody can consent for another player's separately controlled character. An explicit refusal or withdrawal before lock ends the contest attempt without imposing consequences; a withdrawal after lock invokes the agreed stop procedure, not retroactive narration or unilateral punishment.

## 2. Agreements: propose, negotiate, approve, lock

The conflict initiator makes a bounded proposal with a *current authenticated source* containing:

- All intended participants and the exact opponent character IDs; the character's controlling principal and active scene/session are rechecked at every transition
- Specific contested objective and **best and worst case** for **each** participant (what a win, loss and tie mean), with explicit symmetry/asymmetry acknowledged by both
- **Hard boundaries**, including default `no_death`, `no_permanent_maiming`, `no_involuntary_item_loss`, `no_HP_armor_stress_damage`, `no_forced_player_dialogue`, `no_private_information_disclosure`, and no forced control of another PC
- Resolution mode: `single_roll_duel` or `three_strikes`; agreed traits/allowable alternate traits and optional modifiers; whether Hope/Fear metacurrency is applied and how
- Winner's narrative scope (describe *how their own success occurs* within the agreed stakes), loser's exclusive right to describe their character's response, and GM environmental narration scope
- Audience/disclosure agreement (private negotiation and private rolls by default; either player's narration goes to party only after each affected author's explicit source-bound approval)
- How ties, abandoned rolls, stalled participants, edited terms, voluntary withdrawal and GM arbitration are handled; an explicit non-punitive stop procedure

Store a closed, versioned `pvp_proposal` and immutable `pvp_terms_revision` snapshot whose digest covers *all* substantive fields. Propose/counteroffer creates a new terms revision, resets previous approvals, and generates a new bounded review prompt. Present full, human-readable terms **privately** to each owner before any roll. Each must affirmatively accept the same revision using current authenticated Discord button/slash/freeform-current-intent binding; model-proposed text, polite agreement, silence, chat reactions, old approval records and GM role alone cannot approve on a player's behalf. GM may facilitate but may not modify locked stakes after dice.

Define a distinct `pvp_agreement`/`pvp_consent` receipt tied to (guild, session, scene, all involved characters and owners, current principal revisions, accepted intent/source ancestry, exact objective/participants/terms digest, audience, expiry and revocation). Revalidation occurs at use time; stale/retracted/unrelated consent (including the existing known-red D08 tea-sharing fixture) must fail closed. Consent for general cooperation may use the generalized consent service but **must not accidentally qualify** for PvP.

Consent and lock states: `proposed -> negotiating -> awaiting_mutual_consent -> locked`. Terminal alternatives: `declined`, `withdrawn`, `cancelled`, `stale`, `needs_review`. Rolling is impossible prior to `locked`. A change to scope, stakes, mode, participants, boundaries or permitted costs invalidates the lock and requires **fresh agreement from everyone**; no dice from a prior revision can be applied to the new terms.

## 3. Mode A — Single Roll Duel

1. Each player authors a response and explicitly selects a narratively relevant *owned, current* trait. The default is *not* the highest trait; the GM may request another choice if unsupported. Optional Experience/feature bonuses need exact existing native proofs, owner authorization and any pre-agreed cost; by default only base trait applies and **no resource is spent**.
2. Once both choices are submitted, create two **separate native Duality Dice** rolls using saved Hope/Fear d12 faces and recorded modifiers; preserve same-face Critical identification. Avoid displaying the other player's sealed choice or total before both rolls have committed.
3. **Higher final total wins** the agreed narrative objective. A natural double is labeled `Critical` and may change only permitted flavor; it **does not override a higher opponent total** in this bespoke PvP comparison. No attack Difficulty is required. A tie is an unresolved dramatic stalemate, **no winner**: narrate only a mutually acceptable neutral beat and reroll both once the participants affirm continuation, with no implicit costs. If the players instead agreed to stop on a tie, close as `stalemate` with neither claiming victory. Never break a tie by timestamp, model preference, actor order, or automatic dice fabrication.
4. Persist `pvp_round_receipt` for each roll and one `pvp_resolution_receipt` identifying the exact sealed rolls, totals, dualities, agreed terms digest, winner or stalemate and allowed narrative stake. No HP/Armor/Stress/damage or loss of equipment is applied.

## 4. Mode B — Three Strikes Challenge

1. Both players alternate **authored descriptions of their attempted actions** each exchange. When both have declared a response, each chooses a relevant trait and makes one native Duality Dice roll. No AI speaks or rolls for a missing participant.
2. The **higher final total in an exchange earns exactly one success/strike** for that player. Lower earns none. Tied totals award **no strike** and leave both players free to describe a stalemate; proceed only according to agreed continuation terms. Natural doubles are critical narrative flavor, not automatic strikes or default damage.
3. Persist a monotonic score, one verified pair of roll receipts per exchange, immutable per-round declarations/traits/modifiers, and an exactly-once `pvp_strike_receipt`. The **first to three verified strikes** wins the locked narrative stake. A single exchange is atomic: neither player can see or change the second roll based on the first player's hidden result; the same native roll cannot score twice.
4. GM may keep the tempo moving by inviting a new exchange, but cannot make up a response or forfeit a silent participant solely because wall-clock time elapsed. Explicit owner withdrawal or pre-agreed GM-facilitated closure is required.

## 5. Hope, Fear and permissible complications

- Preserve native Hope/Fear faces, duality, and matching-die Critical. In PvP, they affect the **tone** of each roll; the bespoke opposed comparison always uses the final total.
- **Hope** may support a mutual-respect moment. In the **default PvP house rule**, a Hope result permits at most **one** Hope award per such roll, to the roller by default, respecting normal resource caps. Reassignment of that single award to the opponent requires an explicitly locked bilateral terms option and deterministic receipt; it is **not** a spend of existing Hope and cannot duplicate an award already granted by the lower-level dice operation. Alternatively, the table may negotiate `flavor_only` and no resource change. All awards require a native resource receipt.
- **Fear** authorizes the GM to propose a *narrative environmental complication* (e.g., nearby witnesses notice, a light goes out) **within locked boundaries**; it never modifies a die already rolled or automatically inflicts HP/Stress/Armor loss, death, maiming, forced control, item theft or a secret reveal. If ordinary native Fear-meter behavior is retained by an explicitly approved campaign rule, reconcile it exactly once rather than adding a second award.
- An environmental hazard that changes game mechanics, location/custody or either PC's state must be separately authorized through normal native authority and the locked boundaries; the PvP outcome cannot be used as a permission shortcut.
- Additional optional Experiences, aid, Tag Team or domain abilities are **off by default for PvP** and require both a pre-agreed allowed-effects policy and each actual spender's native authorization. A rule objection or unverified option pauses for GM review without rolling.

## 6. Winner/loser/GM narrative authority and publication

After a winner is determined, issue an owner-scoped invitation: the winner may **author** a description of their success **only within the approved winning stake**. The loser separately owns the description of their PC's response or can deliberately decline to elaborate. The model may offer neutral scene framing but must not invent either PC's dialogue or emotional reaction, physical injury, death, equipment loss, move, apology or consent. The final narration contains exact source references and the `pvp_resolution_receipt`; model output cannot expand it beyond allowed terms.

If one participant declines party disclosure, keep the relevant sensitive details on their private surfaces; publish only an agreed minimal neutral status (or nothing) without leaking their private descriptions, rolls, traits, metacurrency or choices. The winner cannot force a losing character to say, feel, believe or reveal anything. The GM can describe the environment within bounds and deliver a Fear complication only as authorized. A completed mechanical comparison and pending player-written reaction are **separate statuses** so nonresponse never causes fabricated dialogue.

## 7. Engine integration and threat model

- Add `pvp-intents` classification based on actual target **owned PC identity and effect**, not exclusively an optional model `coordination.reason` field. A model omission, mislabeled `interact`, generic `resource_delta`, or pre-coordination `roll_required` must not bypass the PvP gate.
- In `bot/src/state.js`, check for PC-versus-PC hostile targeting **before** `nativeAdjudications`/`adjudicateAcceptedIntent()` and scene/world resource effects. Route to `pvp_proposal` and `pvp_window`, not `roll_request(kind=attack)` or `finishDamage()`.
- Reuse scoped action-window coordination, CAS revisions, committed source events and outbox publication, but add explicit services for proposal, mutual terms approval, sealed paired rolls, strike counting, owner-authored narration and dispute/recovery. `lockActionWindow` and `resolveActionWindow` must be connected to live consumers. PvP outcomes are narrative receipts; general scarce-resource competition still follows its existing native custody and rule-consistent path.
- Prevent direct PC harm through fallback `applyGMEvents(resource_delta)` and NPC/adversary attack routing when the provenance is a player-originated PvP action. Existing legitimately sourced environmental/NPC damage must keep working; classify by **authority provenance**, not simply by target being a PC. Material claim reconciliation must require a real PvP resolution receipt for any PvP success narration, without inventing HP/Stress events.
- Roll operations bind source, character owner, opponent, agreement revision, sealed round, trait, roll modifiers, nonce/idempotency key; replays do not reroll or respend; a restart reconstructs everything from committed records. GM-only manual override requires a separately audited correction that does not overwrite player-authored terms or consent.
- A player switching PCs, a scene/session change, a revoked source, an unapproved terms revision, a withdrawn participant, an unrelated consent, or missing opponent remains blocked/needs_review. Pause rather than force resolution.
- Keep the existing security tests, including `d08-window-security-test.mjs`, mandatory and red-first. Add the dedicated test matrix cases to the default offline validator at qualification. No live Discord, real database, or paid API operations during implementation tests.

## 8. Worked example (Jaxon and Choso)

- Jaxon writes: `I approach Choso and try to kick him in the shin.` The permissible approach can independently happen; the kick is **attempt only**.
- The GM proposes stakes: Jaxon's win lets him land a harmless tap that breaks the tension; Choso's win lets him evade and make Jaxon overextend. Boundaries: no HP, Stress, equipment loss, lasting injury or forced speech; party disclosure only if both approve. Both players may counteroffer, decline or accept exactly these terms.
- If both lock `single_roll_duel`, Jaxon and Choso each privately select a narratively appropriate trait and roll their native Duality Dice. The **higher total** determines which agreed stake is available. Fear may add a scene complication, such as an onlooker turning to watch, not an unagreed injury.
- The winner authors how their victory looks, the loser authors their own reaction, and the GM stitches only approved material into the scene. If either declines participation, there is **no hit, damage, forced dodge, involuntary reaction or narrated victory**.
