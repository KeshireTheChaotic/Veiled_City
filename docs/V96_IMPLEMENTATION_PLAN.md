# Veiled City v9.6 — post-V95-06 autonomy, semantic intent, and token-efficiency plan

> **Owner amendment (2026-10-12): V95-06 is BYPASSED. V96 is not contingent on live-play testing or a V95-06 completion commit.** This replaces that prerequisite everywhere in the supplied plan and crosswalk (including BASE01). Use the actual local V95-05 checkpoint and record the bypass honestly; retain every V96 offline authority/privacy/mechanics/quality gate and independent local phase commit. The original package text below is preserved as historical planning provenance. The owner subsequently authorized “Begin V96”; execution status and actual gates are in `V96_PROGRESS.md`. Live testing remains optional and separately authorized.

**Status:** Proposed / not implemented. **Execution starts after V95-06's completion commit and offline qualification.** Explicit interpretation: the user's “after v9-06” means **after V95-06** of the current v9.5 sequence, not a retroactive change to historical V9-06. Do not reopen/overwrite V95-00–06. Optional paid live pilot/staging remains a separately authorized activity; offline qualification is not live validation.

**Source provenance:** GitHub `KeshireTheChaotic/Veiled_City`, `codex/typed-intent-refinement`, latest publicly verified HEAD `194a64a6405a0068eb1c0a13d7ff0e38b18d1b11` (V95-04). V95-05/06 have *not* been represented as complete. Codex must re-audit its **local post-V95-06 HEAD** before changing code; line numbers and source targets below are from the verified V95-04 snapshot and are hints, not authoritative future diffs.

## 0. Non-negotiable goals and invariant boundaries

1. **Autonomous fiction-first GM:** recognize and respectfully answer any sensible player-authored action, including ones not anticipated by a command/keyword handler. Rulings can use established Daggerheart universal mechanics; do not introduce a dedicated hardcoded rule for each creative action.
2. **Player agency:** the authenticated owner declares intent and optional spends; model interpretation never assigns another PC's actions/feelings, assumes assent, invents PC abilities, or rewrites native character sheets. NPC proxies are human-owned to the extent their native policy says.
3. **Daggerheart SRD 2.0 + Veiled City v10:** preserve saved campaign rulings, overrides, official SRD, house/homebrew applicability and consent hierarchy. Rolls are native Duality Dice, Difficulty + trait + eligible modifier sources + stakes declared **before** rolling. Use the existing critical, Hope/Fear, Stress, resources, Armor, HP, death, attacks and audience constraints. NPC incoming attacks retain the native d20/Evasion and affected-owner defense/Armor flow. PvP Hope remains zero, each qualifying PvP action Fear is immediately resolved, and a defender's reaction Fear does not cause an extra GM move.
4. **Native receipts own outcomes:** all material world/PC changes require authenticated source + current scene/principal + verified native capability + source-referenced effect/roll receipt and replay/retraction protection. No narrative or model JSON may mint a rules source, GM principal, player choice, capability, modifier, condition or cost.
5. **Privacy:** preserve player-private character sheets, roll menus, journals, character-controlled dialogue, memory/knowledge and party/public output separation. Never put private content in metrics, cache keys, logs or error reports.
6. **Reliability and quality take priority to cost savings:** no automatic downgrade to weaker narrative models, no indiscriminate removal of nuanced history, no dropping source authority, no cold-start narrative degradation to reduce tokens, no replacement with rigid prose scripts.
7. **Operational boundaries:** no automatic DB migrations, production access, secret files, Discord registration, push, merge, deployment or billable provider tests. Commit from **local Codex only** after each phase qualification; no commits from this chat. Existing V95-05 compact machine-readable report, if installed, must remain default-validated.

## 1. Baseline and existing source behavior (V95-04 remote verification)

- `bot/src/typed-intents.js` describes a freeform `player_intents` schema, supports `other` and `resolution` values `auto`, `roll_required`, `blocked`, `needs_clarification`, `conversational`; precise authenticated source span checks prevent invented intent. `validateIntentResolutions()` rejects unexplained unhandled physical actions. Preserve this as the canonical intake.
- `bot/src/rules-arbitration.js` can resolve a grounded no-roll action or create an existing native roll; `selectRuleBasis()` returns **provisional** when no valid reference exists, and risky `adjudicateAcceptedIntent()` currently throws rather than issue a roll in that case. This is the main creative-action arbitration gap.
- `bot/src/roll-requests.js` authenticates source, current owner, roll kind, all applicable modifier sources and rule/trait eligibility; it is the only supported new action-roll path. Optional Experience, alternative trait, help, Tag Team and feature modifiers use private native choice/confirmation and human-reviewed applicability where required. Preserve these boundaries.
- `bot/src/gm.js` normally produces narration, semantic player intents, world proposals, state-review and claims together in one structured GM provider call; `GMService.shouldRespond()` is an **optional separate** structured router. `bot/src/index.js` routes some read-only recall phrases before the GM via `message-span-ledger.js`.
- `bot/src/player-language.js`, `personal-continuity.js`, `continuity-routing.js`, `message-span-ledger.js`, `gm.js`, `narrative-integrity.js` and `consequence-reconciliation.js` retain lexical decisions with varying degrees of authority. **Classify each actual reachable call site** before modifying it; don't delete security source-span or exact native-command parsing.
- `bot/src/context-planner.js` already ranks authorized retrieval and has a budget. `bot/src/prompt-budget.js` has mandatory/optional record-aware compaction. `bot/src/operational-metrics.js` (V95-04) has bounded guild-only provider usage, retries, p50/p95/p99, cost estimates and pipeline instrumentation. These should be re-used instead of adding new raw-content telemetry.
- V95-04 default validator had **130/130** mandatory offline suites. V95-05/06 may legitimately change that number after evidence-based deduplication. Do not hardcode 130 as a future acceptance threshold.

## 2. Sequence, gates, proposed Codex commits

| Phase | Dependency | Scope | Suggested independent local commit |
|---|---|---|---|
| **V96-00** | V95-06 offline completion and clean local tree | Baseline, scenarios, authority contract, benchmark/quality measurements and explicit gap map | `docs(v9.6): baseline general GM arbitration and semantic routing` |
| **V96-01** | V96-00 | Generic action classification, GM-discretion rule basis, supported no-roll/roll/hold dispositions | `feat(v9.6-arbitration): ground ordinary creative actions in SRD GM discretion` |
| **V96-02** | V96-01 | Native roll/private option execution and material-effects boundary; prevent capability, cost, damage and success laundering | `feat(v9.6-actions): execute grounded freeform checks through native receipts` |
| **V96-03** | V96-02 | Unsupported special mechanics, source-grounded review/recovery and compound/multiplayer continuation | `feat(v9.6-recovery): preserve unresolved actions without blocking independent play` |
| **V96-04** | V96-03 | Remove keyword-based **input and response-routing authority** | `refactor(v9.6-intent): route gameplay from authenticated semantic intents` |
| **V96-05** | V96-04 | Structured commitments, canon, discovery, narrative-claim verification; remove proven obsolete adapters | `refactor(v9.6-semantic): retire lexical gameplay decisions safely` |
| **V96-06** | V96-05 | Token, latency, reliability baseline and token-safe context/prefix/retrieval optimizations | `perf(v9.6-context): reduce redundant context with continuity safeguards` |
| **V96-07** | V96-06 | Optional-router, retry and Director scheduling optimizations with strict quality gates | `perf(v9.6-routing): minimize redundant model calls without lost turns` |
| **V96-08** | V96-07 | Full compatibility/quality/cost offline qualification; separately authorized live pilot plan | `test(v9.6): qualify creative arbitration and efficient semantic GM flow` |

**Stop conditions:** a lost player-authored action, unauthorized PC effect, unsupported new ability treated as native, missing source/rule, incorrect Daggerheart roll, leakage, model-only effect, duplicate/replayed mechanics, removed protected P0 guard, regression in common-play GM response, or unbounded token/latency retry. Fix/revert only the affected phase before proceeding.

## 3. V96-00 — acceptance contracts and realistic baseline

### Deliverables

1. Revalidate local HEAD, `git status`, manifest/suite registry, V95-06 coverage, v10 house rulings/SRD catalog and V95-04 ops metrics. Inventory all model requests per turn type: native-only, GM-only, router+GM, multi-clause, optional World Director, retry/repair, private DM, PvP, rules desk and generated NPCs. Distinguish observed counts from estimated counts.
2. Build **small reusable fixture corpus** for semantic/action quality, not dozens of heavyweight new suites. Include easy ordinary task; unconventional legitimate tactic; narrated claim of success; attempted new supernatural ability; unsupported feature cost; alternative trait; multiple actions; borrowed NPC lore; PvP target; quoted/conditional desire; rules-only lookup; in-character reflection; mixed recall+action; cross-owner same-scene actions. Reuse v9.5 four-owner fixtures.
3. Define assessment rubric by case: `intended_actor`, `authored_source`, `semantic_intent`, `capability_evidence`, `applicable_rule`, `authority_scope`, `roll_proposed`, `costs_before_roll`, `native_receipt`, `public_projection`, `private_projection`, `preserved_independent_actions`.
4. Pin **quality floors to baseline**, not arbitrary percentage improvements: core intended actions captured, no worsening of known false negative/positive cases, no fabricated native states, no increased blocked/neutral-fallback rates, equal or better ability to respond to open-ended scene actions, no degradation in story continuity / NPC consistency. Establish baseline p50/p95 turn latency, provider-call distribution, input/output and cached tokens from permitted aggregates; when none, mark **unknown** and use injected offline provider measurements rather than guessing cost.
5. Document native-review policy and feature flags: new GM-discretion actions default opt-in until tested; safe ordinary nonmechanical fiction remains available under existing autonomy policy. Preserve manual GM control where explicitly configured.

### Acceptance

Every case has explicit behavior expectation and native authority boundary. No billable traffic. No regression tests removed. One compact document with decision log, current scope and pin to actual local HEAD.

## 4. V96-01 — standard Daggerheart GM rulings for unanticipated actions

### Design: one open action, three legal dispositions

Extend the **existing** accepted semantic-intent → `adjudicateAcceptedIntent` service, not a second generic dice engine. Add a versioned `gm_action_ruling_proposal` (or equivalent) with:

- Exact accepted intent/occurrence, authenticated actor, scene/turn, principal revision, target/reference, stated aim and fictional capability/limits.
- Disposition: **`narrative_no_roll`**, **`standard_action_roll`**, or **`needs_review`**. Preserve `blocked` or `needs_clarification` for genuinely impossible/ambiguous attempts, with useful player-facing explanation.
- Provenance: source-grounded scene pressure, obstacle or relevant adversary difficulty; verified local SRD **generic action-roll** authority plus active v10/saved ruling precedence, never a fabricated `srd:` string. `gm_discretion` should be a *bounded application of an existing SRD generic action procedure*, not a new unsupported rule category capable of overriding special feature requirements.
- If rolling: allowed trait and reason, specific Difficulty and derivation, consequences/stakes, advantage/disadvantage candidates and existing Experience/trait feature options for owner review. Require pre-roll disclosure; don't prespend or silently apply options.
- Exact effect class: narrative/observation; native local scene/world effect; resource/damage/custody/special effect **requires dedicated existing adapter or review**. No new stats, class feature or supernatural reach from a generic roll.
- Versioned idempotency/source CAS and outcome lifecycle: `proposed → validated → awaiting_owner_options/roll → resolved` or `needs_review`, `clarification`, `cancelled`; safe retraction/restart.

### Examples

**Allowed GM discretion:** Elias tries to improvise a diversion by knocking over a file cart: existing mundane surroundings, uncertain guard reaction, reasonably sourced trait and Difficulty, native action roll; rolling does not create an unowned NPC reaction or unlimited area control. A consequence, if material, needs a native scene/world receipt.

**Capability-bound:** Elias attempts to send his shadow through a locked door and remotely see the next room. If current sheet/domain/feature does not grant independent shadow scouting, no generic roll can grant it. Offer a legitimate alternative attempt (e.g. listening at the door, looking for an opening) without changing Elias's declared goal, or leave `needs_review` for new capability approval. The Shadow Tell remains character expression, not a new power.

**Simple action:** Bubba examines an accessible accession label with time and relevant knowledge: no roll where failure is uninteresting, narrate already established observable details. Hidden provenance or evidence that is not already accessible cannot be manufactured by a no-roll result.

### Compatibility and safety

No changes to official Duality Dice arithmetic, GM dice, PvP consent, third-party reactions, owner roll control, Experience costs, feature action economy, Armor/damage/death, eligibility or secrets. A provisional *rule-reference ambiguity* must remain reviewed. A supported generic standard roll must use an actual local SRD action-roll reference and scene-grounded stakes; lack of a bespoke verb/feature handler is not by itself a blocker.

### Acceptance

- At least one verified mundane creative standard action generates a native actionable request from sourced rule/scene without a bespoke keyword handler.
- A costless uncontested narrative act can resolve truthfully with a native zero-cost/no-roll receipt where existing rules and world state permit it.
- Missing magical ability or unsupported special feature does not become accessible by choosing a trait or achieving high dice.
- No success, effects, resource costs or Hope/Fear before native dice. Provisional and unsupported rules produce review, not a fake Difficulty.

## 5. V96-02 — execute native checks, not model-authored mechanics

1. Adapt the established `prepareRollRequest`, `rollTraitBreakdown`, private roll menu and option registry to accept the versioned validated GM-discretion ruling. Preserve exact current owner, accepted attempt, scene, source/rule/target revisions, Difficulty proof and native consent checks.
2. **Pre-roll:** privately show acting player declared aim, suggested trait, Difficulty if policy permits disclosure, what success/failure means, relevant feature/Experience costs, and alternatives; player may suggest another plausible trait or Experience subject to native verification. Do not silently select optimal trait, spend Hope or reveal a private feature to other players.
3. **Native outcome:** the actual saved Duality roll and modifiers settle success/Failure+Hope/Fear, Critical, legal effects; GM narrative describes implications of the receipt. Additional effects use native scene/evidence/clock/handout/etc. adapters where supported. Invented ability, item ownership, significant new NPC mechanical power, PC damage or campaign canon remains review. Avoid second model call merely to reclassify the action.
4. As action rolls may generate Fear, keep native ordinary GM rules; **PvP** retains special no-Hope / immediate-Fear treatment. Defender reaction rolls retain their official distinct Hope/Fear behavior.
5. Add counterfactual negative cases: unsupported action with natural 12+12; high total cannot grant new magic; positive roll cannot override closed door/native access, ownership, actual target range, privacy, NPC cognition or explicit optional spend.

**Acceptance:** mechanically legitimate nonstandard tactic completes with pre-roll approval and one saved native result; exact replay does not reroll; missing native adapter is quarantined without fake outcome.

## 6. V96-03 — unsupported action continuation/recovery

- Use existing continuation/dependency and GM-private review services to persist a **reviewable non-actionable** `unsupported_action` receipt containing the verified intent source, rejected capability/effect category, missing fact/rule/adapter, audience, state revision, and *safe* alternatives. Do not include GM secrets in public notices.
- Separate **world epistemic uncertainty** (can GM freely invent ordinary fiction?) from **rules ambiguity** (can Daggerheart standard roll apply?) from **feature permission** (does PC have the magical/feature capability?) from **native adapter absence** (mechanic is valid but not implemented?). Do not escalate all ordinary uncertainty to a human.
- A human GM override/ruling, if needed, must be saved using existing authenticated campaign/ruling services with scope/version; replay via same original accepted intent, never treat AI private note as approval. Unsupported domain cards and new optional costs are held, not retroactively applied.
- Player can freely clarify, revise or withdraw their action. Preserve their original source/goal, and allow an explicit, distinct alternate tactic; don't swap it without permission.
- A pending action holds **only its dependent effects**: another player's conversation, investigations and independent narration continue. Handle multiple simultaneous intents with source-bound dependency ordering and no shared lock of unrelated work.
- Restart, source revocation and obsolete scene invalidate execution permission but retain audit/history and already committed separate effects; no duplicate rolls, deliveries or spends.

**Acceptance:** one blocked feature can coexist with two completed independent in-scene actions; player sees an accurate status/next option, GM sees an auditable reason, no phantom effect or forced PC choice.

## 7. V96-04 — eliminate lexical authority in player intake and response routing

**Audit each current reachable branch first.** Candidate paths from V95-04:

| Source | Current risk | Replacement | Keep deterministic? |
|---|---|---|---|
| `gm.js` `shouldRespond`, `responseObligation`, `hasCharacterInvitation` | Lexical pre-judgment/response veto, extra provider call and possible retries | Authenticated in-world envelope + scoped semantic `respond`/intent + cheap context evidence; treat lexical cues as *optional* diagnostics only | Explicit `OOC` and mention syntax may remain routing controls |
| `index.js` + `message-span-ledger.js` | Pre-GM regex segmentation can swallow mixed recall+action | Parse full authenticated message in existing structured GM turn; source-occurrence map persists independent clauses, read-only recall becomes a typed proposal or explicit `/vc-intel` command | Source exact spans, fixed native commands, preserved multi-action ledger |
| `player-language.js` | English verbs trigger coarse action classes / force response | `player_intents`, verified source, `framing`, `depends_on`, accepted native routes | Only formatting/exact native opt-in after reachability proof |
| `personal-continuity.js captureArcCandidate` | `I want/vow` regex creates unwanted candidates for quotations/conditionals | Accepted owned `speak`/`other` / typed `personal_arc_candidate` semantic class and exact source, nonbinding until owner confirmation | Exact owner confirmation |
| `continuity-routing.js` | Phrase list intercepts recall and may suppress ordinary GM turn | Typed `recall`/`discovery` with read-only source-scoped retrieval, mixed action preserved; explicit command adapter optional | Read-only lexical retrieval ranking after query typed |
| `gm.js` canon proposal keyword detector | Canon words can force proposal/validation retry | Typed current-owner `request_canon_proposal` and authenticated private source; conflict review still required | Exact `proposal_id`/revision checks |
| `index.js` rules question heuristic | Keyword gate can misroute/miss real rules questions | Channel-scoped semantic read-only rules intent or explicit native rules command; measure router/token cost | Rules-channel authorization, literal explicit commands |

**Do not** implement an extra paid intent-classification call per message or clause. Preserve the existing combined `runTurn` extraction and narration pass where appropriate. Lexical fallback under router/provider errors may supply a conservative engagement decision, but never fabricate meaning/outcomes; do not silently drop authenticated PC actions.

### Acceptance

Contrast fixtures: `I make for the exit`, `I search for a way out` without search verb, quoted `I promise`, conditional `If I...`, player-to-player jokes, `I need work`, rule question in scene, same message with recall and attack, three concurrent PC messages. All actionable in-world declarations reach semantic adjudication; routine table chatter is not universally sent to a paid GM model; no new owner/spend/canon authority.

## 8. V96-05 — semantic narrative, canon, continuity and adapter retirement

- Replace the **decision role**, not the safety coverage, of `consequence-reconciliation.js uncertain()` and `narrative-integrity.js` English paraphrase regex. Structured output claim-to-exact saved receipt + actor/owner/source/audience association is the authority. Continue cheap regex **tripwires** as defense-in-depth if they catch suspicious unannotated material; tripwire may hold/review, not invent effects. Require source-backed output for consequential claims including indirect paraphrases and player-owned feelings/agreements.
- Introduce explicit typed `personal_commitment_candidate`, `proposal_campaign_canon`, `recall_request` as optional semantic subtypes or operations; do not explode player `type` enumeration merely to encode each verb. Compatibility mapping for old stored record shapes is read-only and inert for new writes.
- NPC portrayal/dossier inference based on `court`, `veil`, `ghost`, etc. in `npc-cognition.js` must not upgrade rule-like traits/knowledge on word collision. Prefer explicit structured dossier attributes or conservative base defaults; historical published NPC profiles must not be rewritten automatically. Seed draft portrayal word cues may remain reviewed hints if demonstrably harmless.
- Inventory all `*-language.js`, `scene-entry.js`, `dialogue-continuity.js` and old fixture consumers. Delete only proven dead execution paths after import/scope and assertion-level crosswalk, protect current native receipts/compatibility readers. Respect V95-05's deprecation work: do not recreate removed adapters.

**Acceptance:** no lexical story outcome authority; no weaker protections for FH40/PVP30q/OBS21/D08; ability to narrate idioms/metaphors without false mechanical state or costly regeneration; all prior native receipts remain readable.

## 9. V96-06 — first token-efficiency pass: measure and reduce context cost

### Required baseline and telemetry

Use existing `/vc-admin ops` guild-scoped aggregate, configured estimate rates, provider-reported usage and model-stage p50/p95/p99. Never copy player messages/secret documents into telemetry. Distinguish missing usage (`unknown`) from zero and estimate from billed cost. For each representative turn category record calls, input/output/cached tokens, retry count, narrative quarantine/fallback, full-turn latency and context omissions. No per-user content log.

### Conservative changes, in order

1. **Deduplicate same-source context**: remove repeated authority paragraphs, identical NPC/fact/reference records and repeated history across `gm.js` sections, `ContextPlanner`, NPC cognition and memory/handoff. Deduplicate by stable native source identity **and audience**. Keep essential conflicting facts/contradictions; don't dedupe simply because prose looks similar.
2. **Retrieve before ranking/truncating**: deterministic source-authorized query fan-out, prioritizing current scene, unresolved threads, relevant nearby NPCs/actual encounters, recent owner statements and pending roll/consent/Fear. Never demote security policy, character sheet mechanical values, native state, source provenance or disclosed-but-relevant facts to skippable context. Keep an on-demand expansion path if the model marks uncertainty about omitted evidence.
3. **Tiered budget**: Tier 0 immutable core authority and current native rules/receipts; Tier 1 active scene/owner/essential continuity; Tier 2 recalled supporting lore, NPC motivations, important unresolved arcs; Tier 3 optional ambient recaps. Only complete Tier 3 records may be trimmed opportunistically; tier 2 can be retrieved dynamically but not silently omitted when action-relevant. Current `prompt-budget.js` compaction already preserves mandatory sections; improve record-level relevance with measured omission failures, not blind lowering `maxChars`.
4. **Stable-prefix caching**: place genuinely stable SRD/house rule/authority instructions first, then per-campaign stable metadata, then volatile scene/turn context. Enable/measure provider caching if supported by the configured model; cache never crosses guild/player/private audiences, never stores private plaintext in shared identifiers. Treat prompt caching as a billing optimization, **not** evidence context was available when omitted.
5. **Reduce output waste**: remove redundant model-written structured explanations already derivable from native post-turn review or receipts **only after** verifying all validations and evidence; keep complete mandatory structured fields and rich narration. Right-size `max_output_tokens` based on response schema and sampled truncation data, preserving headroom for multi-intent turns.

### Acceptance/quality gates

Compare paired baseline vs proposed offline fixtures at identical source/schema/stage, instrument actual provider-reported counts where available, deterministic estimated prompt length otherwise, keeping those metrics labeled separately. Do not assert a token saving based solely on prompt characters. Main quality must stay at baseline or better: intended action capture, response duty, continuity recall, independent multi-PC actions, secrecy and native-rule outcomes. If a specific lore/motive becomes inaccessible due to context trimming, restore retrieval even if token costs rise.

## 10. V96-07 — second efficiency pass: routing, retries and Director cadence

1. **Per-flow provider-call budget:** native roll/consent/review operations = no new model call; direct authenticated GM-turn = **one** combined semantic+narration call when warranted; assisted unowned/table messages may use lightweight routing where it measurably saves calls/cost without suppressing in-character needs. Router+GM is normally **two** calls; never add a third intent-extraction call. World Director/aftermath/NPC generation may be additional *genuine* work, not silently folded into one-call claims.
2. **Measure router economics:** classify false-positive/false-negative GM-turn routing from the existing scenario corpus; remove redundant router invocation where authentication and current explicit in-world request already justify the main GM pass, but keep it if essential to avoiding wasteful response to banter. A rule-of-thumb zero/one call fast path may not sacrifice player acknowledgement. Failure fallback should favor safe engagement over silent drop, without inferring mechanical success.
3. **Retries:** keep provider transient retry and structured JSON repair bounded, use targeted native validation diagnostics rather than full-repeat generation where recoverable; preserve per-turn deadlines and no hidden SDK retries. Separate retry metrics from new turns, prevent post-commit model replay. Never paste full private failed JSON in logs.
4. **World Director:** do not run a paid pass merely because a player wrote a sentence or per NPC; use existing durable scene/round cadence and material event triggers; batch nearby compatible director updates when authoritatively safe. Keep story reactivity, NPC agendas, background consequences and the no-Fear-banking special PvP rules. Cold NPCs don't get independently billed routine calls.
5. **Optional model configuration:** don't automatically switch GM/down-time story turns to a cheaper/weaker model. Only propose a model change after comparable quality/latency studies and user sign-off; cheaper summaries/rules lookup can be considered separately where fidelity is proven.
6. **Cache invalidation:** if native source/ruling/owner/scene/audience/prompt-schema changes, invalidate associated prompt/result cache. No cache of dice, consent, accepted outcomes or uncertain deliveries as generative substitutes.

### Acceptance

Before/after report per turn type: median/p95 latency, calls, reported usage, cache hits, cost estimate, retry rates and narrative/quarantine/intent-quality guardrails. Target is an evidence-supported reduction, **not a fabricated percent**. Preserve or improve p95 interactivity and the same native results. Roll back individual optimizations if they lose nuanced RP, relevant lore or rules reliability.

## 11. V96-08 — release qualification, rollback, pilot

- One representative **multi-player mixed-intent** turn includes unsupported supernatural request, supported improvised roll, read-only recall, NPC reply, independent second-PC action, hostile third PC with consent boundary, private options, a consequential Fear move and authorized world detail. Prove every native receipt/audience; no PC actions invented. A second set uses altered phrasing/idioms to check intent robustness. Combine tests where possible; preserve exact individual assertions.
- Run default full **network-denied** offline validation, required D08, FH40, PVP30q, OBS21, Hope/Fear, death, native attack/Armor, turn outbox replay and v9.6-specific gates. `npm run validate` already includes overlapping static/D08 suites—do not run them several times without a distinct need. Manifest integrity/`git diff --check` after results-only documentation. Source tree and actual pass counts recorded; no skipped mandatory suite.
- Use V95-05's compact machine-readable report `.reports/offline-validation.json` if present; on failure inspect only failed cases and bounded stderr, not the whole 130+ suite log. Do not delete old P0 coverage without assertion-level equivalence and demonstrated mutation detection. CI default remains full.
- Deliver **offline qualification** first. Separately owner-authorized staged Discord/real-model pilot with a spending cap and explicit isolation tests is the gate for actual player-live quality/cost/latency claims. No live call made by default.
- Rollback by phase commit and feature flags; preserve durable records/receipts, avoid SQL destructive migration, never blindly resend uncertain Discord messages or reroll. Document changed schema version readers and downgrade compatibility.

## 12. Lean testing / Codex budget contract (all phases)

| Tier | Trigger | Work |
|---|---|---|
| T0 | Small code change | 1–3 affected tests + changed-file syntax check as needed; one red-first reproduction per independent new defect |
| T1 | Feature integration or native security boundary | 3–8 actually impacted suites, include relevant P0 negatives / real Discord adapter as needed; one meaningful checkpoint, not every edit |
| T2 | Each phase commit | **One** full `npm run validate` after executable/tests/config/substantive docs are frozen, plus manifest/syntax/static checks only when not already included/explicitly required; `git diff --check`. Repeat T2 only if executable/test inputs changed or a failed qualification requires it |
| T3 | v9.6 release | One final entire offline release qualification; separate explicitly authorized live pilot |

- Shell output: compact machine-readable suite result with `id`, `status`, `duration_ms`, `exit_code`, bounded `failure`, plus summary. Only print failing tests, and no raw secret-bearing content. Keep full local logs outside the repository if needed.
- Check local source and diff-limited file regions, not entire historical ledger each run. Reuse existing fixture builders, fake providers, deterministic dice and no-network guard. Do not write dozens of synonym tests: high-value semantic contrasts and authority negatives suffice.
- Default mandatory registry and CI always include all required protection. Developer-only filtered testing must opt in, reject unknown selectors and never masquerade as full qualification.
- When comparing token efficiency, **separate offline test CPU/Codex context savings from paid model token savings**. Neither measure substitutes for the other.

## 13. Compatibility interface sketch (conceptual, not literal implementation)

```text
Authenticated Discord message (full original message + owner/scene/audience)
    ├── exact explicit native commands / private owner choices (no model required)
    └── existing combined semantic GM turn (no per-clause model call)
        ├── typed intent proposals / source spans / dependencies / framing
        ├── narrative/world proposals and read-only discovery intentions
        └── GM ruling candidates (only bounded ordinary Daggerheart discretion)
              ↓ native verify source, PC ownership, scene, capability, rules, consent
         ┌───────────────┬──────────────────────┬─────────────────────────┐
         │ no-roll       │ standard action roll │ needs review/clarify    │
         │ native receipt│ private pre-roll menu│ durable pending + reason│
         │               │ saved Duality outcome │                         │
         └───────────────┴──────────────────────┴─────────────────────────┘
              ↓ source/claim/receipts verify → scoped narration/outbox → recovery
              ↓ optional durable world-director beat, only on actual cadence
```

The bounded GM discretion route must **never** become `model says it happened → update DB`. The AI chooses narrative interpretation and proposes a roll; the same existing native rules/services perform all effective actions.

## 14. Code touchpoints / documentation handoff

Suggested first audit targets: `bot/src/rules-arbitration.js`, `rule-reference-catalog.js`, `typed-intents.js`, `typed-mechanics.js`, `roll-requests.js`, `roll-options.js`, `gm.js`, `state.js`, `turn-orchestration.js`, `action-continuation.js`, `action-dependency.js`, `narrative-integrity.js`, `consequence-reconciliation.js`, `pvp-authority.js`, `pvp-fear-moves.js`, `pc-incoming.js`, `index.js`, `message-span-ledger.js`, `continuity-routing.js`, `personal-continuity.js`, `player-language.js`, `scene-entry.js`, `autonomous-world.js`, `context-planner.js`, `prompt-budget.js`, `operational-metrics.js`, `director.js`, `npc-cognition.js` and default offline suite registry. Inspect current source; names may change during V95-05/06.

Add `docs/V96_PROGRESS.md` (short incremental ledger), `docs/V96_RULE_DISCRETION_CONTRACT.md`, `docs/V96_INTENT_AUTHORITY_AUDIT.md`, `docs/V96_TOKEN_PERFORMANCE_REPORT.md`, and concise source+tests crosswalk. Link to V95-06 qualification; don't paste full historical progress into every Codex context.

## 15. External rule reference

Official Daggerheart SRD v2.0: https://www.daggerheart.com/srd/ ; SRD `Making Moves and Taking Action`: https://daggerheartsrd.com/rules/making-moves-and-taking-action/ ; SRD `Core GM Mechanics`: https://daggerheartsrd.com/rules/core-gm-mechanics/ . These support fiction-first GM discretion, no-roll ordinary moves where appropriate, choosing trait/Difficulty/stakes before native dice, and ruling creatively. **The project's versioned local SRD catalog and saved v10 house rules remain the runtime implementation authority**, not an unverified live web text snippet.
