# V96 current-source authority and acceptance audit

Audited local starting SHA: `25f6d8013d0a6b07fca1e023d32d16de3e1eea25`. Source, not the older public V95-04 package snapshot, is the baseline. Completed V95-00–05 remain intact; V95-06 is owner-BYPASSED. See `V96_RULE_DISCRETION_CONTRACT.md` for authority and `V96_TOKEN_PERFORMANCE_REPORT.md` for measurement limits.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Reachable production decisions

| Path | Actual role and baseline finding | Disposition / owning phase |
|---|---|---|
| `authored-turn-envelope` → `typed-intents.proposeIntents/acceptIntentForAdjudication` | Exact raw hash/span/occurrence, owner/control/scene/target/framing; immediate only. Acceptance is not success. | Keep deterministic authority checks; V96-01–05 consume, never replace |
| `state.applyAuthoritativeMutation` → action plan → `rules-arbitration` | Native pending requests for `roll_required`, except PvP/coordinated/suspended actions. Generic valid RAW already works. Missing/invalid basis throws; no durable unsupported-action route here. | Reuse engine; V96-01 bounded proposals, V96-03 scoped holds |
| `rules-arbitration` → `roll-requests` → `roll-collaboration` / `typed-mechanics` | Native source/Difficulty/trait/options/costs and actual dice. Current no-roll receipt has zero state mutations. Model success remains unverified. | V96-02 integration, not new mechanics |
| `gm.shouldRespond` / `player-language.responseObligation` | Lexical invitation/attempt/reflection hints can force response; optional router handles remainder. `index` router error fallback only mention or recognized invitation. | V96-04 / V96-07: semantic responsiveness without universal banter calls |
| `index` → `message-span-ledger.routeMessageSpans` → `continuity-routing` | Native handlers consume segmented clauses before combined GM. Recall lexical recognition can overlap mixed input; exact source ledger remains authority. | V96-04 compound contrast; keep exact commands/offsets |
| `personal-continuity.captureArcCandidate` | Regex vow/want can create a private, explicitly unconfirmed candidate even inside quotation/conditional. Not canon or consent. | V96-05 typed nonbinding candidate, no broad history rewrite |
| `gm.runTurn` private canon branch | Explicit lexical canon cue can require proposal; ordinary mention must not force approval. | V96-05 source-backed explicit proposal |
| `narrative-integrity` / `consequence-reconciliation` | Exact source/output claims and native receipt checks plus uncertainty/paraphrase tripwires. | Keep receipt authority and defensive holds; V96-05 idiom positives, no weaker PC guard |
| `npc-cognition` seed/profile inference | `contractAware`/`veilAware` use court/ghost/veil terms and can seed awareness/lens defaults. Retrieval overlap/identity normalization have different nonauthorizing roles. | V96-05 explicit attributes/conservative defaults; preserve published history |
| `scene-entry` / `autonomous-world` / native PC resource guards | Native travel/access/identity/presence/effect requirements. Free contextual inference does not waive them. | Keep; generic roll cannot bypass |
| `pvp-output` / outbox / publishing / voice | Shared scene/affected PC/actual audience proof, owner-authored clauses, current sources; unknown delivery held. | Keep all sinks; no empty claim-list bypass |
| `context-planner` / `prompt-budget` / cognition | Scoped retrieval, mandatory record-aware budget, optional ranking. Cognition recall may update bookkeeping. | V96-06 evidence-first dedup/retrieval; no blanket read-only claim |
| `director.queueDirectorAfterPartyTurn` / `index.runPendingDirectorPass` | Durable scene/round cadence, all eligible actors; NPC simulation and director can be extra genuine work. | V96-07 measure actual path; no per-NPC fan-out inference |
| `operational-metrics` | Bounded process-lifetime guild aggregates, missing usage distinct, GM read-only reports. Cached tokens affect estimates but not separately exposed aggregate counts. | Reuse; V96-06 fill measurement gap, no raw-content telemetry |

This is a scope inventory, not proof that every suspected lexical path fails in a live model. Only the behavioral evidence below is claimed executed. No dead code or security assertion is removed in this phase.

## Compact source / tests crosswalk

| Cases | Production adapter / existing protection | New work / qualification status |
|---|---|---|
| BASE01–02 | `v96-baseline-test`, `v96-corpus`; native four-owner fixture, actual `GMService.runTurn`, arbitration/metrics | V96-00 actual results in progress; 15 corpus scenarios, 12-field rubric |
| RULE01–04 | `rules-adjudication-test`, `rule-reference-catalog`, accepted-intent arbitration | Generic RAW/no-roll exist; bounded creative proposal/eligibility not implemented |
| ROLL01–04 | `d02-roll-options`, `d04-trait-sharing`, `v9-roll-ux`, `v9-roll-truth`, v94 damage/death/Fear | Existing guards retained; new ruling integration V96-02 unqualified |
| HOLD01–03 | `v9-continuation`, compound/action dependency, ai-review, outbox | Existing continuation not proof of unsupported-action integration; V96-03 unstarted |
| SEM01–03 | `typed-routing-authority`, context conversation, span ledger/recall | Semantic routing/compound behavior V96-04 unstarted |
| SEM04–07 | Personal continuity, canon, NPC cognition, FH40/PVP30q/OBS21, reconciliation | Candidate/claim/lexical change V96-05 unstarted |
| TOK01–04 | Context planner, prompt budget, scoped memory, operational metrics | Current baseline only; V96-06 optimization unstarted |
| TOK05–07 | GM service, index turn orchestration, director cadence, recovery | One injected combined call observed; other count predictions labeled; V96-07 unstarted |
| QUAL01–03 | Full default validator incl. D08, native attacks/death, privacy, publication, four-owner replay | Later V96-08 must add mixed creative replay and compare quality/performance; live optional NOT RUN |

## Corpus quality floors

`bot/scripts/v96-corpus.mjs` supplies 15 hand-authored scenarios using the existing four-owner fixture: ordinary, improvised, claimed success, missing power, unsupported cost, alternate trait, compound, borrowed lore, PC conflict, quoted/conditional goal, rules-only, reflective need, mixed recall/action, concurrent owner. Each carries all 12 prescribed rubric fields and an explicit projection/authority boundary. It is reused evidence input, not 15 claims of working semantic inference.

Baseline tests verify source retention for all 12 immediate scenarios, rejection of three non-immediate scenarios, unchanged resources/no rolls from mere acceptance, a single native pending generic request and replay, and one actual combined injected GM turn. Source/agency/privacy/effect floors are zero fabricated or cross-owner effects. Future semantic quality comparisons must preserve these and explicitly measure action/recall capture and blocked/quarantine rates using the same corpus. No real-model false-positive/false-negative rate, NPC prose quality or latency is established by a canned provider response.
