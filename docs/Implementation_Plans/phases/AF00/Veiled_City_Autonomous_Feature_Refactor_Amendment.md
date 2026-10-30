# Veiled City — AI-First Feature Architecture: Purge and Autonomous Execution Amendment

**Status:** PROPOSED / NOT IMPLEMENTED  
**Branch audited:** `codex/clean-ai-gm-2026-10`  
**Pinned source commit:** `4ca9680104033c148f91b080dddbfa53349dda05` (2026-10-30)  
**Purpose:** Replace feature-by-feature executable/context scaffolding with a source-driven GM and reusable, enforceable mechanical operations, while enabling autonomous GM-owned abilities without runtime human-GM approval.

## Decision

The **authored content remains authoritative about what each specific adversary/environment feature does**. The **AI GM decides when, why, and how a GM-controlled feature is invoked**. The **native engine alone validates and commits costs, dice, resources, conditions, equipment, movement, player choices, scene changes with durable effects, and audience/private publication**.

**Do not interpret "without human supervision" as "without player agency."** There should be no routine moderator prompt or human-GM approval for a legal NPC/environment feature. Players still roll their own dice, make PC decisions and voluntary commitments, and approve player-owned expenditures; the engine holds those decisions pending when necessary.

## Verified inventory and classification

- Catalog: **153** exact feature occurrences (105 adversary, 48 environment).
- Current `supported`: **78**. Current `review_only`: **75**. Supported is **not** equivalent to full effect execution.
- Of the 78 supported, **49** are specifically `_context` adapters; **29** have other handlers.
- Proposed treatment, mutually exclusive across all 153 occurrences:

| Audit disposition | Count | Action |
|---|---:|---|
| `RETIRE_CONTEXT` | 49 | Replace individually authored source-context adapter with one scoped current-template retrieval path, then remove redundant wrappers, specialized context entrypoints and hard-coded duplicates. |
| `GENERALIZE_EXISTING` | 20 | Preserve proven existing effect; port it onto reusable operation(s), retire the per-occurrence handler only after receipts and actual outcome parity. |
| `RETAIN_PROOF_GATE` | 9 | Keep specialized source/consent/transaction evidence contract for now; shared mechanics may be used underneath, but do not remove unique proof gates just for code-count reduction. |
| `GM_JUDGMENT_NATIVE_COSTS` | 5 | GM interprets these prose-led abilities; validate any mandatory NPC costs, limitations, factual predicates, or physical/world changes through ordinary native operations. |
| `ADD_SHARED_OPS` | 42 | The current content feature has no supported executor. Express it through reusable typed trigger, cost, reaction, modifier, action, condition, movement, token, or scene-event operations. |
| `ADD_DOMAIN_PROOF` | 28 | Requires additional generic evidence and/or an exceptional narrow proof adapter (e.g. forecast die replacement, network nodes, known debts, secret GM fact, witness-memory alteration); never approximate silently. |
| **Total** | **153** | **Retain 100% of authored features as content.** |

The classification is an **architectural recommendation based on source descriptions and current catalog contracts**, not a fresh execution test. Before deleting code, require a dependency/callsite inventory and behavioral equivalence proof. In particular, a context-only feature may still affect subsequent ordinary Difficulty or source evaluation: preserve that behavior using the shared rule context and generic adjudicator.

### Existing native proof gates to preserve during migration (9)

- `adversary:aster-vale-contractor:flashbang`
- `adversary:pale-regent:command-the-blood`
- `adversary:ritual-enforcement-team:coordinated-volley`
- `adversary:static-wraith:feedback`
- `adversary:traffic-saint:all-lanes-stop`
- `adversary:wraith-pack:many-deaths`
- `environment:after-hours-emergency-department:something-in-imaging`
- `environment:aster-vale-predictive-lab:everything-logs`
- `environment:haunted-nightclub:everybody-saw-something-different`

These contain specialized requirements such as exact owner response, simultaneous multiplayer reaction, eligible Fear opportunity, authenticated optional Hope payment, audience-scoped evidence, or distinct witness provenance. Eventually a shared primitive may absorb the repeated logic; **the requirement for that proof does not disappear**.

### Current generic mechanical consolidation candidates (20)

- `adversary:aster-vale-catastrophe-analyst:contingency-stack`
- `adversary:choir-relay:local-mesh`
- `adversary:green-root-host:horde-3d8-8`
- `adversary:memory-leech:taste-the-fear`
- `adversary:pale-court-executioner:sentence-carried-out`
- `adversary:pale-court-knight:blood-rush`
- `adversary:pale-court-thrall:pack-pressure`
- `adversary:ritual-enforcement-team:stack-formation`
- `adversary:veil-anchor-sentinel:plausible-denial`
- `adversary:veil-engine-custodian:consensus-pressure`
- `environment:after-hours-emergency-department:code-blue`
- `environment:apartment-veil-breach:door-chain`
- `environment:apartment-veil-breach:upload-in-progress`
- `environment:district-blackout:emergency-cascade`
- `environment:haunted-nightclub:too-loud-to-think`
- `environment:haunted-nightclub:vip-threshold`
- `environment:occult-crime-scene:sirens-outside`
- `environment:storm-drain-shrine:local-memory`
- `environment:veil-anchor-chamber:automatic-correction`
- `environment:veil-anchor-chamber:maintenance-memory`

These should become **declarative feature specifications plus reusable native event / effect implementations**, preserving the original source trigger, exact conditions, scaling, source receipts and recovery paths. `door-chain`, `code-blue`, and `emergency-cascade` are especially good candidates for **AI-authored scene actions with generic source/scene event commitment**, rather than dedicated per-location JavaScript.

### Source-led and exceptional previously held features

Only five of the 75 review-only occurrences are primarily **GM judgment/content-driven** in this triage. That does *not* exempt their passive prerequisites, costs or resulting material effects from ordinary guards:

- `adversary:glass-market-debt-reaper:paid-in-full`
- `adversary:hunger-behind-glass:perfect-offer`
- `adversary:old-green-warden:older-than-the-street`
- `adversary:pale-regent:terms-of-surrender`
- `adversary:skin-thief:perfect-surface`

The remaining 70 review-only abilities require actual executable shared operations (42) or additional domain-evidence contracts (28). The complete exact-key inventory appears in **Appendix A** below. Source key suffixes are identifiers, not independent authority to rewrite the printed rule.

## Required additions: native primitives, not feature-by-feature engines

Create a small, bounded operation vocabulary and keep every operation closed, typed and validated. The model may **select** these operations, but can never supply arbitrary program code, invent a source receipt, or directly write character/world state.

| Primitive family | Reusable validated operation | Examples of source features |
|---|---|---|
| **Event/trigger** | Source-qualified: scene start, spotlight, before/after roll, success-with-Fear, damage window, condition change, character action, device use, node transition. Once-per-scene/rest/actor/campaign scopes. | `expected-value`, `bad-branch`, `no-appeal`, `arc-through`, `model-collapse` |
| **NPC/GM costs** | Exact Fear spend, adversary Stress, token ledger, token caps, resource prerequisites and idempotent accounting. | `sever-the-working`, `spend-forecast`, `call-the-household`, `foreclose` |
| **Roll/reaction** | Authorized PC roll request, Difficulty, precise trait, Hope/Fear faces, private result, retained pending player response, success/failure branch. NPC rolls stay native. | `null-foam`, `wear-the-doubt`, `flash-flood`, `all-systems-speak` |
| **Numeric modifiers** | Scoped Advantage/Disadvantage, Difficulty/attack/damage deltas, nonstacking aura, threshold/zone conditional, duration and expiration. | `digest-the-contract`, `ownership-has-weight`, `countermeasure-suite`, `last-train-rules` |
| **State effects** | Damage, HP/Stress/Hope changes, Vulnerable/Restrained, effect suppression/expiry, disabled equipment, recovery. | `ownership-bites`, `take-the-pavement`, `cut-the-connection`, `replay-the-moment` |
| **Movement/scene/world** | Actor-only movement, forced movement adjudication, terrain/hazard, countdown, bounded NPC arrival, source-backed environmental changes with privacy and collision checks. | `clean-exit`, `take-back-the-block`, `city-vs-river`, `closing-time-moves` |
| **Facts, NPC knowledge, obligations** | Witness/evidence provenance, faction/property/debt proof, established physical nodes, NPC-only memory, offers/pacts and explicit voluntary PC choices; no player thought inference. | `eat-the-introduction`, `standing-debt`, `second-face`, `paid-in-full`, `failover` |
| **Multi-party windows** | Independent per-PC defense/reaction, exact recipient isolation, all player choices pending until authorized; shared GM cost once. | `coordinated-volley`, `all-lanes-stop`, `break-the-line` |
| **Exceptional proof** | Narrow reviewed semantics for a genuinely unique transformation; wrap shared primitives rather than implement another self-contained engine. | `spend-forecast` die replacement, `break-the-pattern`, `viral-door` |

**Important existing gap:** `bot/src/frameworks/daggerheart/gm-mechanical-proposal-rules.js` currently rejects non-standard-attack GM proposals on its generic v9 projection path. Other native pathways exist for named features, but that generic route alone is **not** an autonomous all-feature executor. Extend the existing typed coordination boundary in a source-qualified way, instead of layering another parallel engine.

## Proposed closed GM feature decision contract

Illustrative **new contract**, not an existing schema:

```json
{
  "version": 1,
  "kind": "gm_feature_intent",
  "feature_id": "adversary:ritual-enforcement-team:null-foam",
  "source_version": "<verified content source identity>",
  "actor_ref": "<current bound GM-owned actor>",
  "scene_ref": "<current established scene>",
  "trigger_ref": "<actual native trigger or scene opportunity>",
  "target_refs": ["<current target identities>"],
  "declared_gm_intent": "Suppress the doorway with null foam",
  "chosen_options": {},
  "required_operations": ["npc_stress_cost", "reaction_request", "condition_on_failure"]
}
```

The server resolves the *actual* source text and authoritative rule definition from the pinned content, verifies each operation, derives all allowed amounts/traits/ranges and checks actor control/scene/source. Arbitrary numeric values, trust assertions, subjective player feelings, arbitrary targets or model-invented "authorized" fields are **never** trusted. The proposal shape above is deliberately illustrative; use the repository's current arbitration, source, projection, transaction and outbox interfaces rather than introducing a second mutable truth store.

## Autonomous feature-use policy

1. **Autonomous GM mode**: When the campaign's existing `gm_discretion` gate is enabled and `gm_authority_mode` is `autonomous`, Veilkeeper may choose and invoke any qualified, currently legal GM-owned adversary or environment ability without approval from a human moderator. Keep `manual` mode working; do not silently migrate other campaigns' settings.
2. **Automatic opportunity discovery**: The engine publishes bounded source-verified eligible triggers/capabilities to Veilkeeper for the current actor and scene. It does **not** send the entire 153-feature catalog every turn.
3. **GM makes the decisions**: Veilkeeper independently selects target, timing, suitable NPC tactics, Fear/Stress tradeoffs, story stakes and narrative framing within the content rules. No artificial mandatory action, no compulsory feature quota, no fixed-turn initiative.
4. **Native adjudicates**: Validate character identity, actor ownership, target, presence, line-of-sight/range where relevant, known facts, selected feature, costs, existing conditions, roll windows, consent and exact operation prerequisites. Produce atomic receipts.
5. **Player-owned windows remain interactive**: Players make their own rolls, reactions, resource expenditures, choices and commitments. The AI GM does **not** choose failure penalties for a PC where the content grants that choice to the PC.
6. **Fear transparency**: Publish required pre-roll Fear notices before the corresponding roll and declare GM Fear expenditure at the correct timing. The engine commits Fear only once, with replay idempotence.
7. **No referee bottleneck**: A failed/held *feature proposal* should not stall unrelated narrative. Veilkeeper receives a typed rejection, may select another legal ability or ordinary GM action, and tells the story truthfully; it must not narrate a nonexistent mechanical effect or quietly rewrite a rule.
8. **Unexpected adjudications**: Ordinary source-authorized GM judgment uses the existing GM ruling route, with its normal mechanics/limits. An *unresolved missing rule* does not become arbitrary mechanical authority. Prefer automatic local hold and an alternate legal action, not human approval per play.
9. **Continuity**: NPCs remember what abilities they used and why when that matters; faction goals, scene facts, hidden information and weighted salience remain independent of the choice of mechanic.
10. **Performance**: Reuse the current scoped retrieval/Director context. Batch eligible options per actor/spotlight; avoid per-feature provider calls and expensive whole-compendium prompts.

### Explicit player/GM authority examples

- **Null Foam**: Veilkeeper can decide the team spends its own Stress and targets a real Close-range point. The engine validates that cost and presents each affected PC with their own Agility Reaction Roll (14). The engine—not the AI—applies Restrained and disadvantage only on the qualifying failures.
- **Pale Regent: Command the Blood**: Veilkeeper selects the NPC's attempt, but a failed PC reaction does not entitle the AI to choose the PC's Hope/Stress consequence or voluntary compliance. The reviewed source/house-rule contract governs those.
- **Morrowline: Spend Forecast**: The NPC may select the eligible spend autonomously, but must not secretly reroll a player's die or overwrite an already committed roll. This occurrence needs a narrow two-stage roll-window contract or remains held.
- **Perfect Offer**: The AI may propose a seductive, genuinely payable offer in character. It cannot assert the PC accepts, agrees, desires it as objective fact, or has transferred collateral.
- **Three Vectors**: The AI can freely author distinct plausible investigative leads. The PC, not the AI, chooses which lead to pursue; any resulting event follows native source/roll rules.

## Refactor execution phases (amendment; no release permission implied)

### AF00 — Baseline and deletion dependency audit
- Freeze actual HEAD, branch and worktree; pin catalog definitions, original JSON/Markdown and effective house-rule versions, including legacy readers.
- Build a runtime call graph for the `_context` bridge and 29 other handlers. Identify cross-module consumers, source/receipt semantics, alias shims, event payloads and live authoring paths. Existing RF05/RF06 work may have moved paths: reconcile at actual execution HEAD.
- Produce 153-entry checked migration ledger and the exact source of truth for each mechanic.
- **Exit:** No feature unclassified, no undocumented owner-authority decision, all compatibility consumers identified.

### AF01 — Shared context retrieval, BEFORE deletion
- Replace the 49 bespoke `_context` wrappers/branches with a single current-template, source-hash checked, audience-qualified GM-private rule-context producer.
- Send only scene-relevant exact printed rules plus authoritative rule/errata precedence and current actor bindings to Veilkeeper.
- The returned context provides **information**, not executable authority.
- **Exit:** Each of 49 contexts is semantically identical or more complete under the shared provider, with no private data leak or material loss of supported scene logic.

### AF02 — Native general-operation layer
- Implement bounded typed trigger, NPC-cost, roll-window, modifier, effect, token, movement/scene and choice operations by **extending existing native workflows**.
- Provide preflight, prepare, commit, observe and replay/idempotent paths with one synchronous authoritative transaction.
- Explicitly distinguish **GM may choose**, **player must decide**, **GM may describe**, and **engine may mutate**.
- **Exit:** Generalized operations cannot forge player consent/rolls, bypass source checks, cause double spend, or write unintended persistent world facts.

### AF03 — Migrate 20 existing handlers and protect 9 exceptional proof gates
- Port and parity-test one trigger family at a time. Retain the old handler behind a capability gate until there is an end-to-end identical native effect and receipt.
- The nine proof-sensitive cases remain native, even if the mechanical executor beneath them becomes generic.
- Any historical house-rule ambiguity stays pinned to the applicable version; never quietly reinterpret existing saved state.
- **Exit:** 20 feature instances are expressed through primitives with no behavioral regression; 9 proof-sensitive native paths remain valid.

### AF04 — Activate the 75 currently held features
- **5 `GM_JUDGMENT_NATIVE_COSTS`**: eligible for unrestricted *fictional interpretation*, with ordinary cost/evidence enforcement and no invented outcomes.
- **42 `ADD_SHARED_OPS`**: author data-driven mechanical descriptors backed by reusable validated primitive operators.
- **28 `ADD_DOMAIN_PROOF`**: build only the missing specific proof contracts; do not create 28 bespoke self-contained feature engines.
- If an original printed rule is ambiguous or contradicts Daggerheart/house-rule semantics, record a **design-time owner ruling** rather than letting an AI silently substitute a mechanic during play.
- **Exit:** Every occurrence has a clearly indicated runtime capability: fully executable, fiction-only with no durable side effect, or held with a specific unresolved source/legal constraint. No catalog-wide blanket enablement.

### AF05 — Autonomous NPC/environment orchestration
- Make the default automated GM execution path consume source-backed eligible abilities, propose and commit them without a human moderator queue.
- Cover independent NPC initiative, environmental complications, Fear usage, timing windows, PC interruption, multiplayer responses and re-selection after rejected proposals.
- Do not turn the AI into a fixed-turn tactical script. Native scheduling offers valid opportunities; Veilkeeper chooses based on motives, threat and dramatic pacing.
- **Exit:** AI independently initiates and finishes legal NPC/environment features in a running scene; only player-owned responses await player input.

### AF06 — Remove obsolete feature-specific code
- Delete the old 49 context wrappers and literal duplicated rule strings after AF01 and relevant AF05 evidence.
- Delete retired handlers for 20 generalized effects once all downstream imports and saved receipt readers have a valid replacement.
- Preserve exact historical receipt decoding, source identity, tests covering the changed code, and authored content.
- Update architecture ownership manifests, feature catalog, importer, GM context and documentation to reflect **capabilities**, not parallel one-feature executors.
- **Exit:** Zero dangling imports, duplicated feature policy, unowned compatibility facades or silent fallback to old per-feature behavior.

### AF07 — Qualification and release gate
- Run newly authored, changed-code-focused and source-qualified tests following the repository's current test policy; do not use legacy suites as proof or trigger CI without authorization.
- Source fixtures must cover **all 153 occurrences**. For each mechanically executable feature test legal use, illegal use, source/version change, correct costs/rolls/conditions, audience isolation, replay and transition timing as applicable.
- Add scenario tests for simultaneous PC reactions, scene transitions, restart recovery, Fear interrupts, missing/expired NPCs, player control/PvP, inventory limits, private clues and weighted memory continuity.
- Add a human-GM-free simulated scene with a real model and real eligible feature choices as separate authorized staging validation; offline fake-model tests cannot prove AI decision quality.
- **Exit:** No unsupported feature is misrepresented as executed; no ordinary eligible GM-owned feature demands a moderator; meaningful roleplay remains possible if one feature is held. **Release/deployment remains separately authorized.**

## Evidence / kill criteria

- **Do not delete** a code path because the catalog says `supported`, because a context cue exists, or because mock tests passed. Verify real effect receipts and current consumers.
- **Do not automate** player speech, intentions, voluntary movements, resource choices or dice. A human-GM-free game is not a player-free game.
- **Do not downgrade** to generic narration for a feature with promised mechanical consequences while reporting that feature as mechanically supported.
- **Do not permit** a natural-language source snippet, synthetic citation, model-supplied source hash, or in-scene NPC assertion to become authority for an arbitrary mutation.
- **Do not introduce** a second generic mechanics engine, full-turn human review queue, arbitrary JSON patch ability or new universal approval gate.
- **Do not erase** established hooks, canon, historical receipts, source revisions or audience boundaries when migrating.

## Source references

- [Current native feature definitions](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/native-feature-definitions.json)
- [Native feature catalog](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/feature-catalog.js)
- [Native house errata](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/native-house-errata.json)
- [Existing GM proposal projection](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/gm-mechanical-proposal-rules.js)
- [Native feature execution windows](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/feature-window-rules.js)
- [GM execution rules](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/bot/src/frameworks/daggerheart/gm-execution-rules.js)
- [P09 AI-first interpretation phase](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/docs/Implementation_Plans/phases/P09/SCOPE.md)
- [Owner AI GM behavior specification](https://github.com/KeshireTheChaotic/Veiled_City/blob/codex/clean-ai-gm-2026-10/docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md)

## Appendix A — Complete 153-feature disposition manifest

The keys are source occurrences in `native-feature-definitions.json` at the pinned SHA. `CURRENT` is catalog status; `PROPOSED` is an architectural disposition (not a claim of passing functionality). No source feature is deleted from the content package.

| # | Source feature key | Current | Proposed |
|---:|---|---|---|
| 1 | `adversary:pale-court-thrall:pack-pressure` | `supported` | `GENERALIZE_EXISTING` |
| 2 | `adversary:pale-court-thrall:break-the-hold` | `supported` | `RETIRE_CONTEXT` |
| 3 | `adversary:aster-vale-contractor:professional-entry` | `supported` | `RETIRE_CONTEXT` |
| 4 | `adversary:aster-vale-contractor:flashbang` | `supported` | `RETAIN_PROOF_GATE` |
| 5 | `adversary:aster-vale-occult-analyst:mark-the-variable` | `supported` | `RETIRE_CONTEXT` |
| 6 | `adversary:aster-vale-occult-analyst:readout` | `supported` | `RETIRE_CONTEXT` |
| 7 | `adversary:static-wraith:ride-the-current` | `supported` | `RETIRE_CONTEXT` |
| 8 | `adversary:static-wraith:feedback` | `supported` | `RETAIN_PROOF_GATE` |
| 9 | `adversary:veil-burned-stalker:peripheral` | `supported` | `RETIRE_CONTEXT` |
| 10 | `adversary:veil-burned-stalker:steal-the-focus` | `supported` | `RETIRE_CONTEXT` |
| 11 | `adversary:hexbound-familiar:sympathetic-relay` | `supported` | `RETIRE_CONTEXT` |
| 12 | `adversary:hexbound-familiar:snatch-a-link` | `supported` | `RETIRE_CONTEXT` |
| 13 | `adversary:river-hound:flow-around-it` | `supported` | `RETIRE_CONTEXT` |
| 14 | `adversary:river-hound:drag-down` | `supported` | `RETIRE_CONTEXT` |
| 15 | `adversary:memory-leech:blank-spot` | `supported` | `RETIRE_CONTEXT` |
| 16 | `adversary:memory-leech:taste-the-fear` | `supported` | `GENERALIZE_EXISTING` |
| 17 | `adversary:choir-relay:local-mesh` | `supported` | `GENERALIZE_EXISTING` |
| 18 | `adversary:choir-relay:route-around` | `supported` | `RETIRE_CONTEXT` |
| 19 | `adversary:glass-market-knife:terms-first` | `supported` | `RETIRE_CONTEXT` |
| 20 | `adversary:glass-market-knife:pin-to-the-deal` | `supported` | `RETIRE_CONTEXT` |
| 21 | `adversary:morrowline-echo:i-saw-that` | `supported` | `RETIRE_CONTEXT` |
| 22 | `adversary:morrowline-echo:self-fulfilling-event` | `supported` | `RETIRE_CONTEXT` |
| 23 | `adversary:morrowline-echo:bad-future` | `supported` | `RETIRE_CONTEXT` |
| 24 | `adversary:cicada-runner:always-a-price` | `supported` | `RETIRE_CONTEXT` |
| 25 | `adversary:cicada-runner:exit-clause` | `supported` | `RETIRE_CONTEXT` |
| 26 | `adversary:pale-court-knight:predatory-grace` | `supported` | `RETIRE_CONTEXT` |
| 27 | `adversary:pale-court-knight:blood-rush` | `supported` | `GENERALIZE_EXISTING` |
| 28 | `adversary:pale-court-fixer:reputation-attack` | `supported` | `RETIRE_CONTEXT` |
| 29 | `adversary:pale-court-fixer:call-security` | `supported` | `RETIRE_CONTEXT` |
| 30 | `adversary:thorn-hound-of-the-green:urban-cover` | `supported` | `RETIRE_CONTEXT` |
| 31 | `adversary:thorn-hound-of-the-green:root-snare` | `supported` | `RETIRE_CONTEXT` |
| 32 | `adversary:clause-eater:loophole` | `supported` | `RETIRE_CONTEXT` |
| 33 | `adversary:clause-eater:conflicting-duty` | `supported` | `RETIRE_CONTEXT` |
| 34 | `adversary:clause-eater:digest-the-contract` | `review_only` | `ADD_SHARED_OPS` |
| 35 | `adversary:ritual-enforcement-team:stack-formation` | `supported` | `GENERALIZE_EXISTING` |
| 36 | `adversary:ritual-enforcement-team:null-foam` | `review_only` | `ADD_SHARED_OPS` |
| 37 | `adversary:ritual-enforcement-team:coordinated-volley` | `supported` | `RETAIN_PROOF_GATE` |
| 38 | `adversary:traffic-saint:right-of-way` | `review_only` | `ADD_SHARED_OPS` |
| 39 | `adversary:traffic-saint:all-lanes-stop` | `supported` | `RETAIN_PROOF_GATE` |
| 40 | `adversary:skin-thief:perfect-surface` | `review_only` | `GM_JUDGMENT_NATIVE_COSTS` |
| 41 | `adversary:skin-thief:borrow-a-memory` | `review_only` | `ADD_SHARED_OPS` |
| 42 | `adversary:skin-thief:wear-the-doubt` | `review_only` | `ADD_SHARED_OPS` |
| 43 | `adversary:aster-vale-forecast-engine:expected-value` | `review_only` | `ADD_SHARED_OPS` |
| 44 | `adversary:aster-vale-forecast-engine:spend-forecast` | `review_only` | `ADD_DOMAIN_PROOF` |
| 45 | `adversary:aster-vale-forecast-engine:model-collapse` | `review_only` | `ADD_SHARED_OPS` |
| 46 | `adversary:wraith-pack:many-deaths` | `supported` | `RETAIN_PROOF_GATE` |
| 47 | `adversary:wraith-pack:replay-the-moment` | `review_only` | `ADD_SHARED_OPS` |
| 48 | `adversary:pale-court-elder:ownership-has-weight` | `review_only` | `ADD_SHARED_OPS` |
| 49 | `adversary:pale-court-elder:call-the-household` | `review_only` | `ADD_SHARED_OPS` |
| 50 | `adversary:pale-court-elder:invitation-revoked` | `review_only` | `ADD_SHARED_OPS` |
| 51 | `adversary:blacksite-null-team:countermeasure-suite` | `review_only` | `ADD_SHARED_OPS` |
| 52 | `adversary:blacksite-null-team:sever-the-working` | `review_only` | `ADD_SHARED_OPS` |
| 53 | `adversary:choir-junction-intelligence:distributed` | `review_only` | `ADD_DOMAIN_PROOF` |
| 54 | `adversary:choir-junction-intelligence:all-systems-speak` | `review_only` | `ADD_SHARED_OPS` |
| 55 | `adversary:choir-junction-intelligence:reroute` | `review_only` | `ADD_DOMAIN_PROOF` |
| 56 | `adversary:old-green-warden:older-than-the-street` | `review_only` | `GM_JUDGMENT_NATIVE_COSTS` |
| 57 | `adversary:old-green-warden:take-back-the-block` | `review_only` | `ADD_SHARED_OPS` |
| 58 | `adversary:name-eater:hard-to-describe` | `review_only` | `ADD_SHARED_OPS` |
| 59 | `adversary:name-eater:eat-the-introduction` | `review_only` | `ADD_DOMAIN_PROOF` |
| 60 | `adversary:name-eater:no-one-called-that` | `review_only` | `ADD_SHARED_OPS` |
| 61 | `adversary:veil-anchor-sentinel:plausible-denial` | `supported` | `GENERALIZE_EXISTING` |
| 62 | `adversary:veil-anchor-sentinel:edit-the-scene` | `review_only` | `ADD_DOMAIN_PROOF` |
| 63 | `adversary:morrowline-matured:three-moves-ahead` | `review_only` | `ADD_DOMAIN_PROOF` |
| 64 | `adversary:morrowline-matured:spend-forecast` | `review_only` | `ADD_DOMAIN_PROOF` |
| 65 | `adversary:morrowline-matured:branch-pruning` | `review_only` | `ADD_SHARED_OPS` |
| 66 | `adversary:morrowline-matured:unknown-variable` | `review_only` | `ADD_DOMAIN_PROOF` |
| 67 | `adversary:glass-market-debt-reaper:standing-debt` | `review_only` | `ADD_SHARED_OPS` |
| 68 | `adversary:glass-market-debt-reaper:seize-collateral` | `review_only` | `ADD_DOMAIN_PROOF` |
| 69 | `adversary:glass-market-debt-reaper:paid-in-full` | `review_only` | `GM_JUDGMENT_NATIVE_COSTS` |
| 70 | `adversary:catastrophic-echo:pattern-hunger` | `review_only` | `ADD_SHARED_OPS` |
| 71 | `adversary:catastrophic-echo:break-the-pattern` | `review_only` | `ADD_DOMAIN_PROOF` |
| 72 | `adversary:pale-regent:the-house-is-me` | `review_only` | `ADD_DOMAIN_PROOF` |
| 73 | `adversary:pale-regent:command-the-blood` | `supported` | `RETAIN_PROOF_GATE` |
| 74 | `adversary:pale-regent:second-face` | `review_only` | `ADD_DOMAIN_PROOF` |
| 75 | `adversary:pale-regent:terms-of-surrender` | `review_only` | `GM_JUDGMENT_NATIVE_COSTS` |
| 76 | `adversary:citywide-choir:no-single-body` | `review_only` | `ADD_DOMAIN_PROOF` |
| 77 | `adversary:citywide-choir:every-screen` | `review_only` | `ADD_SHARED_OPS` |
| 78 | `adversary:citywide-choir:failover` | `review_only` | `ADD_DOMAIN_PROOF` |
| 79 | `adversary:veil-engine-custodian:consensus-pressure` | `supported` | `GENERALIZE_EXISTING` |
| 80 | `adversary:veil-engine-custodian:rewrite-witnesses` | `review_only` | `ADD_DOMAIN_PROOF` |
| 81 | `adversary:veil-engine-custodian:quarantine-reality` | `review_only` | `ADD_SHARED_OPS` |
| 82 | `adversary:hunger-behind-glass:perfect-offer` | `review_only` | `GM_JUDGMENT_NATIVE_COSTS` |
| 83 | `adversary:hunger-behind-glass:compound-interest` | `review_only` | `ADD_DOMAIN_PROOF` |
| 84 | `adversary:hunger-behind-glass:foreclose` | `review_only` | `ADD_DOMAIN_PROOF` |
| 85 | `adversary:sovereign-of-the-green:territory-incarnate` | `review_only` | `ADD_DOMAIN_PROOF` |
| 86 | `adversary:sovereign-of-the-green:season-out-of-place` | `review_only` | `ADD_SHARED_OPS` |
| 87 | `adversary:sovereign-of-the-green:old-bargain` | `review_only` | `ADD_DOMAIN_PROOF` |
| 88 | `adversary:pale-court-executioner:sentence-carried-out` | `supported` | `GENERALIZE_EXISTING` |
| 89 | `adversary:pale-court-executioner:break-the-line` | `review_only` | `ADD_SHARED_OPS` |
| 90 | `adversary:pale-court-executioner:no-appeal` | `review_only` | `ADD_SHARED_OPS` |
| 91 | `adversary:choir-storm-node:network-sight` | `review_only` | `ADD_DOMAIN_PROOF` |
| 92 | `adversary:choir-storm-node:brownout` | `review_only` | `ADD_SHARED_OPS` |
| 93 | `adversary:choir-storm-node:arc-through` | `review_only` | `ADD_DOMAIN_PROOF` |
| 94 | `adversary:green-root-host:horde-3d8-8` | `supported` | `GENERALIZE_EXISTING` |
| 95 | `adversary:green-root-host:take-the-pavement` | `review_only` | `ADD_SHARED_OPS` |
| 96 | `adversary:green-root-host:regrow-through-concrete` | `review_only` | `ADD_DOMAIN_PROOF` |
| 97 | `adversary:civic-null-operative:countermeasure-suite` | `review_only` | `ADD_SHARED_OPS` |
| 98 | `adversary:civic-null-operative:containment-foam` | `review_only` | `ADD_SHARED_OPS` |
| 99 | `adversary:civic-null-operative:clean-exit` | `review_only` | `ADD_SHARED_OPS` |
| 100 | `adversary:aster-vale-catastrophe-analyst:forecast-window` | `review_only` | `ADD_SHARED_OPS` |
| 101 | `adversary:aster-vale-catastrophe-analyst:bad-branch` | `review_only` | `ADD_SHARED_OPS` |
| 102 | `adversary:aster-vale-catastrophe-analyst:contingency-stack` | `supported` | `GENERALIZE_EXISTING` |
| 103 | `adversary:veil-engine-knifewalker:outside-the-frame` | `review_only` | `ADD_DOMAIN_PROOF` |
| 104 | `adversary:veil-engine-knifewalker:cut-the-connection` | `review_only` | `ADD_DOMAIN_PROOF` |
| 105 | `adversary:veil-engine-knifewalker:never-where-recorded` | `review_only` | `ADD_SHARED_OPS` |
| 106 | `environment:occult-crime-scene:contaminated-scene` | `supported` | `RETIRE_CONTEXT` |
| 107 | `environment:occult-crime-scene:three-vectors` | `supported` | `RETIRE_CONTEXT` |
| 108 | `environment:occult-crime-scene:sirens-outside` | `supported` | `GENERALIZE_EXISTING` |
| 109 | `environment:after-hours-emergency-department:hipaa-and-procedure` | `supported` | `RETIRE_CONTEXT` |
| 110 | `environment:after-hours-emergency-department:code-blue` | `supported` | `GENERALIZE_EXISTING` |
| 111 | `environment:after-hours-emergency-department:something-in-imaging` | `supported` | `RETAIN_PROOF_GATE` |
| 112 | `environment:abandoned-mall-glass-market:no-violence-in-the-aisles` | `supported` | `RETIRE_CONTEXT` |
| 113 | `environment:abandoned-mall-glass-market:everything-has-a-price` | `supported` | `RETIRE_CONTEXT` |
| 114 | `environment:abandoned-mall-glass-market:closing-time-moves` | `review_only` | `ADD_SHARED_OPS` |
| 115 | `environment:storm-drain-shrine:local-memory` | `supported` | `GENERALIZE_EXISTING` |
| 116 | `environment:storm-drain-shrine:flash-flood` | `review_only` | `ADD_SHARED_OPS` |
| 117 | `environment:storm-drain-shrine:wrong-offering` | `supported` | `RETIRE_CONTEXT` |
| 118 | `environment:apartment-veil-breach:thin-walls` | `supported` | `RETIRE_CONTEXT` |
| 119 | `environment:apartment-veil-breach:door-chain` | `supported` | `GENERALIZE_EXISTING` |
| 120 | `environment:apartment-veil-breach:upload-in-progress` | `supported` | `GENERALIZE_EXISTING` |
| 121 | `environment:dead-platform:last-train-rules` | `supported` | `RETIRE_CONTEXT` |
| 122 | `environment:dead-platform:express-through-memory` | `supported` | `RETIRE_CONTEXT` |
| 123 | `environment:dead-platform:third-rail-spirit` | `supported` | `RETIRE_CONTEXT` |
| 124 | `environment:aster-vale-predictive-lab:everything-logs` | `supported` | `RETAIN_PROOF_GATE` |
| 125 | `environment:aster-vale-predictive-lab:model-room` | `supported` | `RETIRE_CONTEXT` |
| 126 | `environment:aster-vale-predictive-lab:containment-shutters` | `supported` | `RETIRE_CONTEXT` |
| 127 | `environment:haunted-nightclub:too-loud-to-think` | `supported` | `GENERALIZE_EXISTING` |
| 128 | `environment:haunted-nightclub:vip-threshold` | `supported` | `GENERALIZE_EXISTING` |
| 129 | `environment:haunted-nightclub:everybody-saw-something-different` | `supported` | `RETAIN_PROOF_GATE` |
| 130 | `environment:pale-court-townhouse:guest-right` | `supported` | `RETIRE_CONTEXT` |
| 131 | `environment:pale-court-townhouse:private-room` | `supported` | `RETIRE_CONTEXT` |
| 132 | `environment:pale-court-townhouse:ownership-bites` | `review_only` | `ADD_SHARED_OPS` |
| 133 | `environment:flooded-river-threshold:current-with-intent` | `review_only` | `ADD_SHARED_OPS` |
| 134 | `environment:flooded-river-threshold:old-marker-stone` | `review_only` | `ADD_SHARED_OPS` |
| 135 | `environment:flooded-river-threshold:city-vs-river` | `review_only` | `ADD_SHARED_OPS` |
| 136 | `environment:glass-market-grand-concourse:neutrality-has-teeth` | `review_only` | `ADD_DOMAIN_PROOF` |
| 137 | `environment:glass-market-grand-concourse:auction-of-consequences` | `supported` | `RETIRE_CONTEXT` |
| 138 | `environment:glass-market-grand-concourse:everyone-is-watching` | `supported` | `RETIRE_CONTEXT` |
| 139 | `environment:archive-beneath-the-courthouse:chain-of-title` | `supported` | `RETIRE_CONTEXT` |
| 140 | `environment:archive-beneath-the-courthouse:sealed-docket` | `supported` | `RETIRE_CONTEXT` |
| 141 | `environment:archive-beneath-the-courthouse:records-reject-you` | `review_only` | `ADD_SHARED_OPS` |
| 142 | `environment:district-blackout:no-ordinary-signal` | `supported` | `RETIRE_CONTEXT` |
| 143 | `environment:district-blackout:emergency-cascade` | `supported` | `GENERALIZE_EXISTING` |
| 144 | `environment:district-blackout:choir-volume` | `review_only` | `ADD_SHARED_OPS` |
| 145 | `environment:veil-anchor-chamber:consensus-engine` | `supported` | `RETIRE_CONTEXT` |
| 146 | `environment:veil-anchor-chamber:maintenance-memory` | `supported` | `GENERALIZE_EXISTING` |
| 147 | `environment:veil-anchor-chamber:automatic-correction` | `supported` | `GENERALIZE_EXISTING` |
| 148 | `environment:rupture-district:no-consensus` | `supported` | `RETIRE_CONTEXT` |
| 149 | `environment:rupture-district:reality-collision` | `review_only` | `ADD_SHARED_OPS` |
| 150 | `environment:rupture-district:mass-witness` | `review_only` | `ADD_DOMAIN_PROOF` |
| 151 | `environment:networked-dream:metaphor-is-physics` | `supported` | `RETIRE_CONTEXT` |
| 152 | `environment:networked-dream:algorithmic-undertow` | `review_only` | `ADD_DOMAIN_PROOF` |
| 153 | `environment:networked-dream:viral-door` | `review_only` | `ADD_DOMAIN_PROOF` |

## Appendix B — How to read these dispositions

- `RETIRE_CONTEXT`: retire **the bespoke JavaScript context handler**, not the feature text or its ability to affect an adjudicated Difficulty.
- `GENERALIZE_EXISTING`: no premature removal; existing native outcome stays active until equivalent shared operation plus replay/receipt proof exists.
- `RETAIN_PROOF_GATE`: needed source/evidence/choice integrity; retain narrow guard while simplifying underlying mechanical operations.
- `GM_JUDGMENT_NATIVE_COSTS`: no special feature engine needed merely to decide fictional behavior. Generic costs, true prerequisites, world effects and player choice remain enforced.
- `ADD_SHARED_OPS`: currently review-only, mechanically actionable if its exact source requirements can be expressed in approved shared operation vocabulary.
- `ADD_DOMAIN_PROOF`: currently review-only, requires a specific new authoritative evidence check or pending-owner workflow before full execution.
- The first pass labels are engineering triage. Reconcile exact printed rule, effective house errata, native state writers and source/receipt contracts **before implementation**; a semantic conflict produces an explicit localized hold rather than guessed behavior.

**End state:** More autonomous creative NPCs and environments; fewer unique mechanics modules; complete source-driven feature coverage; hard separation between GM choice and authoritative PC/rules/state boundaries.
